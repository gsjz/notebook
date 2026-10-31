# 扩散语言模型的块式推理与停止语义

[DiffusionGemma](https://arxiv.org/abs/2608.00146) 把 Gemma 4 的稀疏 Transformer 用于块内双向去噪。理解它的低延迟实现，需要分清三种状态：已经完成的 prefix、仍可改写的 canvas、上一轮产生的 self-conditioning 信号。三者的生命周期决定哪些计算能复用、哪些张量必须重算。

注意力与缓存的前置概念见 [Transformer](transformer.md)、[KV Cache](kv-cache.md)。GPU 执行成本见 [内存层次与 Roofline](gpu-memory-roofline.md)。

阅读官方 JAX 路径前，可先补 [数组、PyTree 与随机状态](jax-arrays-pytrees-random.md)；`sample_next_canvas` 的具体 carry 与退出条件见 [JAX 控制流](jax-control-flow-diffusion.md)。

## 块间因果与块内双向

自回归生成逐 token 提交；块式扩散生成逐 canvas 提交。设当前 prefix 长度为 $T$，canvas 长度为 $C$：

- encoder 对新增的干净上下文作因果编码，维护 prefix 的 $K,V$。
- decoder 同时处理 $C$ 个 noisy token，块内位置彼此可见，同时读取 prefix 缓存。
- 当前 canvas 经多轮去噪后提交，再作为干净上下文进入 encoder，为后续块追加缓存。

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 205" role="img" aria-label="prefix缓存与canvas去噪的数据路径" style="display:block;width:100%;height:auto;margin:1rem 0;background:#fff;border-radius:12px" font-family="system-ui,sans-serif">
  <defs><marker id="dli-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7Z" fill="#6b7280"/></marker></defs>
  <g fill="none" stroke="#9ca3af" stroke-width="1.5" marker-end="url(#dli-arrow)"><path d="M200 65H260"/><path d="M460 65H520"/><path d="M200 155H260"/><path d="M460 155H520"/><path d="M620 102V118H360V126"/><path d="M720 155H775"/></g>
  <g fill="#fafafa" stroke="#e5e7eb"><rect x="15" y="25" width="185" height="78" rx="9"/><rect x="260" y="25" width="200" height="78" rx="9"/><rect x="520" y="25" width="200" height="78" rx="9"/><rect x="15" y="126" width="185" height="62" rx="9"/><rect x="520" y="126" width="200" height="62" rx="9"/></g>
  <rect x="260" y="126" width="200" height="62" rx="9" fill="#f0eef8" stroke="#d8d2e2"/>
  <g fill="#374151" text-anchor="middle" font-size="16"><text x="107" y="56">prefix</text><text x="360" y="56">causal encoder</text><text x="620" y="56">KV cache</text><text x="107" y="152">noisy canvas</text><text x="360" y="152" fill="#62578a">decoder 去噪</text><text x="620" y="152">采样与停止判断</text><text x="825" y="151">提交</text></g>
  <g fill="#6b7280" text-anchor="middle" font-size="12"><text x="107" y="80">prompt + 历史干净块</text><text x="360" y="80">只编码新增部分</text><text x="620" y="80">去噪期间只读</text><text x="107" y="174">下一轮可以继续改写</text><text x="360" y="174">双向 canvas + prefix</text><text x="620" y="174">未完成则进入下一轮</text></g>
</svg>

这里缓存的是干净 prefix 的 attention 状态。noisy canvas 的 token 会变化，其 $K,V$、hidden states 和 FFN 输出通常每轮重算；已有 prefix cache 不会免除 canvas 的 MoE 计算。

## 一次去噪前向的张量

以单请求为例，模型配置使用 $C=256$、词表 $V=262144$、hidden 维度 $d=2304$。具体部署须从所用 checkpoint 的配置读取，不应只依赖论文名称。

| 状态 | 逻辑形状 | 生产者与消费者 |
| --- | --- | --- |
| 当前 token 编号 | $[C]$ | sampler → decoder embedding |
| decoder hidden states | $[C,d]$ | attention / FFN / residual |
| logits | $[C,V]$ | 词表投影 → sampler、停止与下一轮自条件 |
| soft embedding | $[C,d]$ | 上轮分布乘 embedding → self-conditioning MLP |
| prefix cache | 每层 $[H_{kv},T,d_h]$ | encoder 写，decoder 读 |

self-conditioning 让本轮输入同时包含当前离散 token 和上轮软分布的信息：

$$
p^{(s-1)}=\operatorname{softmax}(L^{(s-1)}),\qquad
z^{(s-1)}=\gamma\,p^{(s-1)}W_{\mathrm{emb}},
$$

$$
h_{\mathrm{in}}^{(s)}=\operatorname{SC}\bigl(\operatorname{Embed}(x^{(s)}),z^{(s-1)}\bigr).
$$

其中 $\gamma$ 为 embedding scale；公式省略类型转换与可选样本 mask。这里的 $L$ 必须对应实现真正保存的 logits。HF 路径保存温度处理后的 `processed_logits`；改变温度应用的位置会改变下轮输入。完整的大词表概率张量是否物化，是 [在线 softmax 融合](online-softmax-fusion.md) 的主要切入点。

## 固定网格与动态停止

默认设置最多 $N=48$ 个去噪步，基础网格 $\Delta t=1/N$，温度日程的上下端点为 $0.8$ 和 $0.4$。EntropyBounded sampler 按预测熵从低到高接受本轮预测位置，低置信位置重新加噪；这些位置在后续轮仍可改写，每次 decoder 仍处理整个 canvas。整块提交发生在去噪循环结束后。

默认提前停止组合置信度与稳定性：平均 token 熵低于阈值，并且确定性预测相对历史稳定。HF 的 `StableAndConfidentStoppingCriteria` 维护 argmax 历史；不能将任意两版采样器的“稳定”视为完全相同。

**固定时间网格与输入相关的实际步数可以同时存在。** 减少主机循环开销、减少每轮张量读写、降低实际去噪步数，是三个不同的加速来源。

<iframe src="../assets/inference/denoising-state.html" title="块式扩散推理状态动画" loading="lazy" style="display:block;width:100%;height:660px;border:0;margin:1rem 0;border-radius:16px;"></iframe>

[单独打开状态动画](assets/inference/denoising-state.html)

动画只显示四个代表位置，提交轮数由教学脚本给定。播放中固定的 prefix 缓存与持续变化的 canvas/self-conditioning 应分别观察。

## 代码阅读：外循环与内循环

以下固定到 Transformers commit [`66f51e76`](https://github.com/huggingface/transformers/tree/66f51e76efd8542232b8bdd40ade7d1edbaac46f/src/transformers/models/diffusion_gemma)，避免把未来代码变化混进同一结论。

[`generate`](https://github.com/huggingface/transformers/blob/66f51e76efd8542232b8bdd40ade7d1edbaac46f/src/transformers/models/diffusion_gemma/generation_diffusion_gemma.py#L549-L830) 的外层管理 canvas，内层管理去噪步。下面省略 batch、多模态和 cache 长度管理，只保留控制依赖：

```python title="教学控制流，不是可直接运行的 generate"
cache = encode_prefix(prompt)
for block in output_blocks:
    canvas, sc_logits = initialize_canvas()
    for step in range(max_steps):
        canvas, prediction, sc_logits, done = denoising_step(
            canvas, sc_logits, cache, step
        )
        if done:
            break
    output = commit(prediction)
    cache = encode_new_clean_tokens(output, cache)
```

HF 内循环中的 `cur_step` 是剩余步数，按 $N,\ldots,1$ 递减。[温度处理器](https://github.com/huggingface/transformers/blob/66f51e76efd8542232b8bdd40ade7d1edbaac46f/src/transformers/models/diffusion_gemma/generation_diffusion_gemma.py#L278-L316) 使用 $\tau=0.4+0.4\,\mathrm{cur\_step}/N$；因此默认末轮约为 $0.4083$，不会执行剩余步数为零的一轮。移植时应同时核对公式和循环端点。

实际 `_denoising_step` 在 [`L1003–1076`](https://github.com/huggingface/transformers/blob/66f51e76efd8542232b8bdd40ade7d1edbaac46f/src/transformers/models/diffusion_gemma/generation_diffusion_gemma.py#L1003-L1076) 的顺序是：

```python title="保留依赖关系的代码摘写"
raw_logits = decoder_forward(
    decoder_input_ids=current_canvas,
    self_conditioning_logits=self_conditioning_logits,
    past_key_values=cache,
).logits
processed_logits = logits_processor(input_ids, raw_logits, cur_step=step)
probs = torch.softmax(processed_logits, dim=-1, dtype=torch.float32)
sample = torch.multinomial(probs.view(-1, vocab_size), 1)
argmax_canvas = torch.argmax(processed_logits, dim=-1)
# accept_canvas → renoise_canvas → stopping criteria
self_conditioning_logits = processed_logits.to(embeddings_dtype)
```

代码中的采样、接受、重新加噪、停止和自条件有不同消费者。消除其中一个中间量之前，需要列出全部读者。例如熵和 self-conditioning 都依赖概率，但它们需要的归约结果不同。

[`DiffusionGemmaSelfConditioning`](https://github.com/huggingface/transformers/blob/66f51e76efd8542232b8bdd40ade7d1edbaac46f/src/transformers/models/diffusion_gemma/modular_diffusion_gemma.py#L630-L663) 对 soft embedding 执行 pre-norm 与 gated MLP，再与 token embedding 相加，最后执行 post-norm。soft embedding 投影与后续 MLP 是两段计算，优化时应分别计时。

## 提前停止与末轮无效工作

末轮仍需产生本轮输出、执行所需的停止判断。能消除的是“只被下一轮消费、且下一轮确定不会执行”的工作。检查位置至少包括：

| 操作 | 结束时能否跳过 | 依赖条件 |
| --- | --- | --- |
| 当前 logits / argmax | 通常不能 | 当前最终结果依赖它 |
| 本轮熵与稳定性 | 判断是否提前停止时不能 | 停止判据依赖它 |
| 下一轮 soft embedding / SC MLP | 可在确认无下一轮后剪除 | 没有其他消费者 |
| 随机采样或加噪 | 取决于返回值与 RNG 协议 | 后续请求或 batch 项的随机状态可能受影响 |
| 干净 canvas 的 encoder 更新 | 取决于是否还生成后续块 | 后续块需要 cache |

在动态 batch 中，一个样本完成不等于整个 GPU batch 已完成；冻结已完成样本的返回值，也不等于后端已经跳过其所有算子。设备侧循环应明确单样本、batch 和整图退出条件，见 [CUDA Graph 与设备侧循环](cuda-graphs-device-loop.md)。

## 从语义到性能实验

单次前向处理 $C$ 个位置，不能把 $C$ 当作本轮新生成并提交的 token 数。一次请求还包括多个 canvas 和输入相关的去噪步数：

$$
T=T_{\mathrm{prefix}}+\sum_b\sum_{s=1}^{N_b}T_{b,s}+T_{\mathrm{commit}}.
$$

比较融合前后时，先匹配模型权重、精度、canvas、batch、停止规则和输入；分别记录固定步数的单轮代价与自然停止的请求代价。原始层输出接近并不保证采样轨迹相同，熵阈值附近的小数值变化也可能改变退出轮次。

与之相邻的执行问题分别见 [MoE 分发与 grouped GEMM](moe-dispatch-grouped-gemm.md)、[GEMM 分块与 CuTe](gpu-tiled-gemm-cute.md)、[推理剖析与测量](gpu-inference-profiling.md)。

## 来源

- [DiffusionGemma Technical Report](https://arxiv.org/abs/2608.00146)
- [官方模型与配置](https://huggingface.co/google/diffusiongemma-26B-A4B-it)
- [Google DeepMind Gemma diffusion 代码](https://github.com/google-deepmind/gemma/tree/9e1f74131ba9d45e5fe6ae7bb3941d9f2abb39c3/gemma/diffusion)
- [Transformers 固定版本实现](https://github.com/huggingface/transformers/tree/66f51e76efd8542232b8bdd40ade7d1edbaac46f/src/transformers/models/diffusion_gemma)
