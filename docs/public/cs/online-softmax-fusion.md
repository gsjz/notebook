# 在线 softmax 与自条件投影融合

DiffusionGemma 将上一轮预测分布转换为 soft embedding，作为下一轮的 self-conditioning 信号。它包含一个沿大词表维度归约的模式：`softmax(logits) @ embedding`。这个模式适合讨论算子融合，也能说明稳定归约、片上状态和数值等价之间的边界。

矩阵分块和线程分工见 [GPU 分块矩阵乘与 CuTe DSL](gpu-tiled-gemm-cute.md)；模型外循环见 [扩散语言模型推理](diffusion-language-model-inference.md)。

在 JAX 后端优化前，先用 [编译产物与性能分析](jax-profiling-xla-fusion.md) 确认 XLA 已有的融合边界，避免把 Python 层中间变量直接视为 GPU 上的独立读写。

## 数据流与中间张量

把 batch 和 canvas 位置展平成 $T$ 行，词表大小为 $V$，embedding 维度为 $D$。令 logits 为 $L\in\mathbb{R}^{T\times V}$，embedding 矩阵为 $W\in\mathbb{R}^{V\times D}$，则对每行

$$
p_v=\frac{\exp(L_v-m)}{\sum_j\exp(L_j-m)},\qquad
m=\max_jL_j,\qquad
Y_d=\sum_{v=1}^{V}p_vW_{vd}.
$$

基线通常先计算并存储概率矩阵 $P$，再执行 GEMM：$Y=PW$。例如 $T=256,V=262144$ 时，$P$ 有 $67{,}108{,}864$ 个元素：仅 FP32 存储就是 256 MiB，若另物化 BF16 版本再增加 128 MiB。这里是张量容量，不是承诺可节省的实际 DRAM 流量；缓存、编译器融合与张量生存期会改变实际分配和访问。

<svg viewBox="0 0 920 220" role="img" aria-label="基线物化完整概率矩阵，融合路径只保留归约状态并输出soft embedding" style="display:block;width:100%;height:auto;margin:1rem 0;background:#fff;border-radius:12px" xmlns="http://www.w3.org/2000/svg">
  <defs><marker id="softmax-flow-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7" fill="#6b7280"/></marker></defs>
  <g font-family="system-ui,sans-serif" font-size="15" fill="#374151" text-anchor="middle">
    <text x="74" y="54">基线</text><text x="74" y="160">分块融合</text>
    <rect x="145" y="19" width="166" height="65" rx="8" fill="#fafafa" stroke="#e5e7eb"/><text x="228" y="48">logits L</text><text x="228" y="70" font-size="12" fill="#6b7280">T × V</text>
    <rect x="365" y="19" width="245" height="65" rx="8" fill="#f0eef8" stroke="#d8d2e2"/><text x="488" y="48">概率 P：写回再读取</text><text x="488" y="70" font-size="12" fill="#6b7280">T × V</text>
    <rect x="665" y="19" width="228" height="65" rx="8" fill="#fafafa" stroke="#e5e7eb"/><text x="779" y="48">P @ W → Y</text><text x="779" y="70" font-size="12" fill="#6b7280">T × D</text>
    <rect x="145" y="125" width="166" height="65" rx="8" fill="#fafafa" stroke="#e5e7eb"/><text x="228" y="154">L / W 分块</text><text x="228" y="176" font-size="12" fill="#6b7280">逐词表 tile 读取</text>
    <rect x="365" y="125" width="245" height="65" rx="8" fill="#f0eef8" stroke="#d8d2e2"/><text x="488" y="154">稳定状态：m, ℓ, a</text><text x="488" y="176" font-size="12" fill="#6b7280">归一化分母 + 加权分子</text>
    <rect x="665" y="125" width="228" height="65" rx="8" fill="#fafafa" stroke="#e5e7eb"/><text x="779" y="154">Y = a / ℓ</text><text x="779" y="176" font-size="12" fill="#6b7280">只写最终结果或分块 workspace</text>
  </g>
  <g fill="none" stroke="#9ca3af" stroke-width="1.5" marker-end="url(#softmax-flow-arrow)"><path d="M311 52H362"/><path d="M610 52H662"/><path d="M311 158H362"/><path d="M610 158H662"/></g>
</svg>

融合目标是让概率 tile 在消费后消失，减少完整 $P$ 的物化。输出仍然需要读 embedding 权重、完成约 $2TVD$ FLOPs；大矩阵乘本身的工作量没有因此消失。

## 稳定在线归约

对某一行，维护已处理词表集合 $S$ 的状态：

$$
m_S=\max_{v\in S}L_v,\qquad
\ell_S=\sum_{v\in S}e^{L_v-m_S},\qquad
\mathbf a_S=\sum_{v\in S}e^{L_v-m_S}\mathbf W_v.
$$

最终结果为 $\mathbf Y=\mathbf a_S/\ell_S$。$m$ 是标量，$\ell$ 是标量，$\mathbf a$ 是 $D$ 维向量；它比只计算 softmax 分母的 online normalizer 多保留了加权分子。

### 合并两个词表分块

对不相交分块 $A,B$，令

$$
m=\max(m_A,m_B),\quad
\alpha=e^{m_A-m},\quad\beta=e^{m_B-m}.
$$

则

$$
\ell=\alpha\ell_A+\beta\ell_B,\qquad
\mathbf a=\alpha\mathbf a_A+\beta\mathbf a_B.
$$

当新 tile 出现更大的 logit 时，旧状态需要整体重新缩放。直接把两个分块各自归一化后的 embedding 相加会丢失它们的概率质量比例，即使各分块内部的 softmax 都计算正确。

下面用 8 个词表项、2 维 embedding 演示。改变 tile 大小后，计算轨迹会变化，最终结果应与完整 softmax 的参考值一致；示例计算使用浏览器双精度，不代表 GPU 混合精度误差。

<iframe src="../assets/inference/softmax-tiles.html" title="在线 softmax 加权归约动画" loading="lazy" style="display:block;width:100%;height:620px;border:0;border-radius:16px;margin:1rem 0;"></iframe>

[单独打开在线归约动画](assets/inference/softmax-tiles.html)

### 递推与初始化

以下教学代码只表达算法，不包含线程协作、内存布局和异常值策略：

```python
# 教学伪码：有限 logits、至少一个有效词表项
m, denominator = -inf, 0.0
numerator = zeros(D, dtype=float32)
for logits_tile, embedding_tile in vocabulary_tiles:
    tile_max = max(logits_tile)
    next_max = max(m, tile_max)
    old_scale = exp(m - next_max)
    unnormalized = exp(logits_tile - next_max)
    numerator = old_scale * numerator + unnormalized @ embedding_tile
    denominator = old_scale * denominator + sum(unnormalized)
    m = next_max
output = numerator / denominator
```

空分块应采用单位状态，不应盲目计算 $e^{-\infty-(-\infty)}$。全掩码行、NaN、正无穷或负无穷需要独立约定，并与参考实现一致。对于正常 softmax，减去最大值使指数输入不大于零，避免直接计算 $e^{1000}$ 一类溢出。

## self-conditioning 的实际代码

固定 Hugging Face Transformers commit [`66f51e7`](https://github.com/huggingface/transformers/tree/66f51e76efd8542232b8bdd40ade7d1edbaac46f)。[`DiffusionGemmaDecoderModel.forward`](https://github.com/huggingface/transformers/blob/66f51e76efd8542232b8bdd40ade7d1edbaac46f/src/transformers/models/diffusion_gemma/modular_diffusion_gemma.py#L1074-L1087) 的步骤是：

1. 对 `self_conditioning_logits` 的词表维度求 FP32 softmax。
2. 将概率转换为 embedding 权重的数据类型，再与 `embed_tokens.weight` 相乘。
3. 乘 `embed_scale`，若提供 self-conditioning mask，再按样本置零。
4. 将 soft embedding 和当前 canvas embedding 传给 `self_conditioning` 模块。

[`DiffusionGemmaSelfConditioning`](https://github.com/huggingface/transformers/blob/66f51e76efd8542232b8bdd40ade7d1edbaac46f/src/transformers/models/diffusion_gemma/modular_diffusion_gemma.py#L630-L663) 继续执行 pre-norm、gated MLP、与当前 token embedding 相加以及 post-norm。因此，融合 `softmax @ W` 只优化 self-conditioning 数据流中的一个部分，不能直接声称已融合整个模块。

JAX 的 [`sample_step`](https://github.com/google-deepmind/gemma/blob/9e1f74131ba9d45e5fe6ae7bb3941d9f2abb39c3/gemma/diffusion/_sampler.py#L559-L612) 在得到 `shaped_prediction` 后调用 `embedder.encode_logits`，生成下一轮的 `sc_embeddings`；HF 则把前轮 logits 交给 decoder 转成 soft embedding。比较后端时需追踪输入到底是原始 logits、温度处理后 logits 还是已投影的 embedding，避免额外做一次温度缩放。

### 中间概率的其他消费者

采样、熵预算和停止判断也会使用 logits 或分布，但它们未必消费同一份概率：温度、logits processor、精度或有效位置都可能不同。只有确认数值定义和生存期一致，才可共享归约结果或融合消费者。不能因为两个算子都叫 softmax，就删除其中一个。

同理，KV cache 保存 prefix 的 attention K/V，与这里的 soft embedding 不同。当前 canvas 进入新一轮后，预测分布和自条件投影通常都要重新计算。

## 词表分块与跨 CTA 合并

单 CTA 保存完整 $D$ 维分子，可能占用过多寄存器；同时把 $T$ 行、词表 tile 和 $D$ 列都放大，还会增加共享内存和累加器压力。实际设计通常还需要沿行和输出维度分块，选择并行归约方式。

| 方案 | 状态与数据流 | 主要权衡 |
| --- | --- | --- |
| 每 CTA 独立处理完整词表 | 局部保留 $m,\ell,\mathbf a$ | 无跨 CTA 合并；小 $T$ 时并行度不足 |
| 多 CTA 分割词表 | 各自产生局部状态，下一 kernel 合并 | 更多并行；增加 workspace、launch 与归约 |
| 先求全局 normalizer，再融合投影 | 第一阶段求 $m,\ell$，第二阶段重读 logits 计算概率 tile 与 GEMM | 减少向量状态合并，代价是重读与阶段间同步 |
| 沿输出 $D$ 分割 | 不同 CTA 负责分子不同列 | normalizer 可复用，也可能重复读取 logits |

多 CTA 的局部结果必须包含兼容的最大值、分母和分子；仅把局部分子做 atomic add 会漏掉最大值变更后的重新缩放。一般 kernel launch 不能依靠 block 调度顺序完成全局 barrier，需要分阶段执行，或使用满足约束的 cooperative / cluster 机制。

设每行分为 $J$ 个词表分区，一个直接实现需要存储约 $TJ(D+2)$ 个局部状态元素；其中 $m,\ell$ 常用 FP32，分子格式另定。这个 workspace 可能远小于 $TV$，也可能因 $J,D$ 较大抵消收益。应把 workspace 读写和 merge kernel 纳入测量。

## 数值等价与误差

在线合并在实数算术下等价于完整 softmax 加权和；有限精度下，分块、归约树和类型转换都会改变舍入。

HF 基线在 softmax 后先将 $p_v$ 转换为 embedding dtype。若 fused 实现直接用 FP32 未归一化权重累加，再最后除以分母，它没有复现逐个概率的 BF16/FP16 舍入，通常不会 bitwise 相等。提高累加精度也不能替代对基线数值路径的说明。

验证应分三层：

- 张量层：相对/绝对误差、最大误差、RMSE，并检查小概率、极端 logits、非整倍数词表、掩码行。
- 采样层：相同种子下 token 或停止轮次是否变化；随机采样可能放大微小分布差异。
- 任务层：质量指标、生成长度、有效去噪步数的分布是否保持。

分块算法改变浮点结合顺序，不能仅用“数学式相同”宣称不影响采样。若允许误差范围，也应把精度作为实验条件，与纯调度优化分开报告。

## 末轮计算的生存期

如果本轮采样和停止判断已确定不会再进入 decoder，那么只供下一轮使用的 self-conditioning 投影可能成为死计算。跳过它的前提是结果没有其他消费者、没有需要保留的副作用，并且判断时刻早于执行该计算。

JAX `sample_step` 在返回前生成 `new_sc_embeddings`；外层随后使用早停结果更新状态。把投影后移可能省掉末轮工作，也可能引入一次 host/device 同步或改变图执行。应让依赖图和设备侧控制流共同决定是否值得跳过，不能每轮把判断搬回 CPU。

已有输入 self-conditioning 仍参与本轮模型预测；可省的是“产生下一轮信号”的后续工作。不能用“本轮将停止”反向跳过已经影响当前 logits 的输入分支。

## 融合的收益范围

融合减少概率张量物化与 launch 的机会，同时增加单 kernel 的 live state 和调度复杂度。若寄存器溢出到 local memory、occupancy 下降或 embedding 读取成为主瓶颈，端到端结果可能不升反降。

实验应分别比较基线、编译器自动融合、手写 fused kernel，并记录完整形状、dtype、layout、tile、workspace、编译版本及实际设备。对照相同采样和停止协议，分别报告该算子、单轮 decoder 和请求服务时间；本文只给出可验证的实现路径，没有给出硬件加速测量结果。

## 来源

- [Online normalizer calculation for softmax](https://arxiv.org/abs/1805.02867)：稳定 online normalizer。
- [FlashAttention](https://arxiv.org/abs/2205.14135)：通过分块和重计算减少中间矩阵物化；这里的 logits 来自词表预测，不能直接等同 attention kernel。
- [Transformers DiffusionGemma 固定实现](https://github.com/huggingface/transformers/tree/66f51e76efd8542232b8bdd40ade7d1edbaac46f/src/transformers/models/diffusion_gemma)：soft embedding、self-conditioning 与生成状态。
- [Gemma JAX diffusion 固定实现](https://github.com/google-deepmind/gemma/tree/9e1f74131ba9d45e5fe6ae7bb3941d9f2abb39c3/gemma/diffusion)：sampler 及前后轮自条件信号。
