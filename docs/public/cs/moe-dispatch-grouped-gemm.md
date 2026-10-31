# MoE 分发、Grouped GEMM 与元数据复用

MoE 路由器为每个 token 选择少量专家，GPU 后端还要把这些选择转成可执行的矩阵批次。分发的核心工作是建立“原 token 与槽位 → 专家内行号 → 原输出位置”的映射；每层每轮都要正确维护这条对应关系。

矩阵分块基础见 [GPU 分块矩阵乘与 CuTe DSL](gpu-tiled-gemm-cute.md)，去噪循环见 [扩散语言模型推理](diffusion-language-model-inference.md)。本文以公开 Transformers 实现为代码依据，讨论可验证的优化边界，不报告硬件加速结果。

## 从逐 token 选择到分配总数

令当前层实际参与计算的 token 数为 $T$，专家总数为 $E$，每 token 选择 $k$ 个不同专家。路由结果通常包含形状均为 $[T,k]$ 的 `top_k_index` 和 `top_k_weights`。

对专家 $e$，其收到的 token 行数为

$$
n_e=\sum_{i=0}^{T-1}\sum_{s=0}^{k-1}\mathbf{1}[\operatorname{index}_{i,s}=e],\qquad
R=\sum_e n_e=Tk,\qquad U=|\{e:n_e>0\}|.
$$

DiffusionGemma 单请求完整 canvas 取 $T=256,k=8,E=128$，每层共有 $R=2048$ 份 token–expert 分配。$U$ 统计唯一专家数；即使覆盖全部 128 个专家，每个 token 仍只经过自己的 8 个 routed experts，另有所有 token 都经过的共享 FFN。

这里的 $T$ 是实际送入专家的行数。服务合批会增加它，未跳过的 padding 行也可能参与计算；不能拿最终有效输出长度替代 kernel 输入行数。

## 分发流水线

<svg viewBox="0 0 920 176" role="img" aria-label="逐token top-k，经展平排序与计数偏移，进入专家矩阵计算，再返回token并加权求和" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:auto;margin:1rem 0;background:#fff;border-radius:12px">
  <defs><marker id="moe-dispatch-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7" fill="#6b7280"/></marker></defs>
  <g font-family="system-ui,sans-serif" text-anchor="middle" fill="#374151" font-size="14">
    <rect x="12" y="35" width="148" height="84" rx="8" fill="#fafafa" stroke="#e5e7eb"/><text x="86" y="65">逐 token top-k</text><text x="86" y="93" fill="#6b7280" font-size="12">index + weight</text>
    <rect x="198" y="35" width="148" height="84" rx="8" fill="#f0eef8" stroke="#d8d2e2"/><text x="272" y="65">展平 · 按专家分组</text><text x="272" y="93" fill="#6b7280" font-size="12">permutation</text>
    <rect x="384" y="35" width="148" height="84" rx="8" fill="#f0eef8" stroke="#d8d2e2"/><text x="458" y="65">计数 · 偏移 · gather</text><text x="458" y="93" fill="#6b7280" font-size="12">每专家连续 token 行</text>
    <rect x="570" y="35" width="148" height="84" rx="8" fill="#f0eef8" stroke="#d8d2e2"/><text x="644" y="65">Grouped FFN</text><text x="644" y="93" fill="#6b7280" font-size="12">FC1 → 激活 → FC2</text>
    <rect x="756" y="35" width="152" height="84" rx="8" fill="#fafafa" stroke="#e5e7eb"/><text x="832" y="65">回排 · 加权求和</text><text x="832" y="93" fill="#6b7280" font-size="12">恢复每个 token 输出</text>
    <text x="460" y="151" fill="#6b7280" font-size="12">框表示逻辑依赖，实际后端可以融合多个步骤，也可以采用不同的分组算法。</text>
  </g>
  <g fill="none" stroke="#9ca3af" stroke-width="1.5" marker-end="url(#moe-dispatch-arrow)"><path d="M160 77H195"/><path d="M346 77H381"/><path d="M532 77H567"/><path d="M718 77H753"/></g>
</svg>

把二维位置 $(i,s)$ 展平成 $p=ik+s$ 后，一次分配有三个关联量：原 token 行号 $i$、目标专家 $e$、当前权重 $w_{i,s}$。排序只能一起搬动这些关联信息，不能独立排序 expert id 后丢掉原位置。

若 `perm` 表示按专家排序后的原始分配位置，则 `perm // k` 找到输入 hidden state 行号，`perm % k` 找到其 top-k 槽位。输入 activation 按这个映射 gather 后，同一专家的所有行连续排列；专家结果仍需逆变换，才能加回正确 token。

下面用 4 个 token、每个选 2 个专家演示。切换“同计数·换路由”时，各专家计数保持相同，但分组里的 token 发生变化。

<iframe src="../assets/inference/moe-dispatch.html" title="MoE token 分组与元数据复用动画" loading="lazy" style="display:block;width:100%;height:620px;border:0;border-radius:16px;margin:1rem 0;"></iframe>

[单独打开分发动画](assets/inference/moe-dispatch.html)

### 计数与偏移

若 $n=(2,2,2,2)$，使用长度为 $E+1$ 的边界数组时，offset 为 $(0,2,4,6,8)$，专家 $e$ 对应半开区间 $[o_e,o_{e+1})$。另一些 API 只接收长度为 $E$ 的累计终点 $(2,4,6,8)$；这两种表示不能混用。

零 token 专家的相邻边界相同。后端可以跳过空组，但仍需保留与专家权重编号一致的布局，不能随意删除空专家后沿用旧权重索引。

### Grouped GEMM 的含义

对专家 $e$，输入是 $X_e\in\mathbb{R}^{n_e\times D}$。以 gated FFN 为例，主要计算为

$$
G_e=X_eW_{g,e},\qquad H_e=X_eW_{u,e},\qquad
Z_e=\phi(G_e)\odot H_e,\qquad F_e=Z_eW_{d,e}.
$$

FC1 可以把 gate/up 权重打包，一次 GEMM 得到两部分；FC2 把中间维度投回 $D$。grouped GEMM 将多组形状相近、行数不同的矩阵乘交给统一调度，避免每个专家都走一次独立的 Python 调用和 kernel launch。

“Grouped”不保证整个 FFN 只有一个 kernel，也不保证所有专家在同一时刻执行。分组调度、激活融合、量化 scale 和 scratch buffer 都由后端决定。最后按 token 聚合：$Y_i=\sum_{s=0}^{k-1}w_{i,s}F_{e(i,s)}(X_i)$，共享 FFN 在另一分支参与层输出。

## Transformers 代码对照

以下固定到 commit [`66f51e7`](https://github.com/huggingface/transformers/tree/66f51e76efd8542232b8bdd40ade7d1edbaac46f)。

### Router 与专家选择

[`Gemma4TextRouter`](https://github.com/huggingface/transformers/blob/66f51e76efd8542232b8bdd40ade7d1edbaac46f/src/transformers/models/gemma4/modeling_gemma4.py#L1307-L1341) 在每个 token 行的专家维度执行 softmax 和 `torch.topk`。它先归一化 top-k 权重，再乘 `per_expert_scale`；因此最终 top-k 权重之和不必为 1。这个缩放发生在选择后，不是依据当前队列长度重新均衡专家的机制。

[`DiffusionGemmaTextRouter`](https://github.com/huggingface/transformers/blob/66f51e76efd8542232b8bdd40ade7d1edbaac46f/src/transformers/models/diffusion_gemma/modular_diffusion_gemma.py#L455-L460) 继承这个路由器。公开的这段 forward 没有跨 token 再投票，也没有把全 canvas 的专家并集限制成固定 8 个。

### 排序、分组和恢复顺序

[`grouped_mm_experts_forward`](https://github.com/huggingface/transformers/blob/66f51e76efd8542232b8bdd40ade7d1edbaac46f/src/transformers/integrations/moe.py#L392-L505) 的核心关系可简写为以下教学伪码：

```python
expert_ids = top_k_index.reshape(-1)
expert_ids_grouped, perm = sort(expert_ids)
grouped_inputs = hidden_states[perm // top_k]
grouped_weights = top_k_weights.reshape(-1)[perm]
counts = histogram(expert_ids_grouped, num_experts)
end_offsets = cumsum(counts)
grouped_outputs = grouped_ffn(grouped_inputs, expert_weights, end_offsets)
weighted_outputs = grouped_outputs * grouped_weights[:, None]
inverse_perm[perm] = arange(len(perm))
outputs = weighted_outputs[inverse_perm].reshape(num_tokens, top_k, hidden_dim)
result = outputs.sum(axis=1)
```

源码用 `torch.histc` 统计 `tokens_per_expert`，再 `cumsum` 得到 grouped MM 所需的累计终点。权重张量仍包含所有专家，offset 指定有效计算范围；这避免为了压缩活跃专家列表再引入数据相关形状。

EP 下非本地专家可能被标成 sentinel。该实现排序后把 sentinel 留在尾部，计数时排除，并对相应未初始化结果做掩码。sentinel 表示本 rank 不负责该分配，不等于模型因为专家拥塞而丢弃 token；其他持有者仍应完成它。

源码使用逆排列和 `reshape + sum` 恢复 token 输出，而 eager 路径使用按 token 的 `index_add_`。这些归约路径的顺序与精度可能不同，切换实现时还需验证数值一致性。

## 覆盖、负载与小矩阵

固定 $T=256,k=8,E=128$，有以下两个极端：所有 token 共选同 8 个专家时，8 组 GEMM 各有 256 行；全覆盖且均衡时，128 组各有 16 行。分配总数都是 2048，专家尺寸相同时理论主要 FFN FLOPs 接近，权重工作集、矩阵形状与调度开销却不同。

若 tile 的行粒度为 $b$，可用 $\sum_{e:n_e>0}b\lceil n_e/b\rceil$ 估计对齐后的行数；具体 kernel 可以用掩码或块稀疏策略改变成本，不能将这个值直接当作硬件时间。

在 EP 中还应计算 $L_r=\sum_{e:\pi(e)=r}n_e$，其中 $\pi(e)$ 是专家所在 rank。专家集中可能改善单卡权重复用，也可能让某张卡承担大部分计算；全专家覆盖同样可能存在热点。只记录 $U$ 无法区分这些情形。

### 两种 EP 数据路径

| 路径 | 实际操作 | 热点可能影响什么 |
| --- | --- | --- |
| 复制输入、本地专家、all-reduce | rank 持有同一批 hidden states，计算自己的部分输出后相加 | 本地计算关键路径；通信张量大小可以保持固定 |
| token dispatch、all-to-all | 将分配发送到专家持有者，计算后返回原 token 所在 rank | 发送/接收偏斜、链路竞争和慢 rank |

该版本 DiffusionGemma 的 [`base_model_ep_plan`](https://github.com/huggingface/transformers/blob/66f51e76efd8542232b8bdd40ade7d1edbaac46f/src/transformers/models/diffusion_gemma/configuration_diffusion_gemma.py#L63-L72) 声明 `ep_router + grouped_gemm + moe_tp_experts`。[`EpRouterParallel`](https://github.com/huggingface/transformers/blob/66f51e76efd8542232b8bdd40ade7d1edbaac46f/src/transformers/distributed/expert_parallel.py#L116-L185) 屏蔽非本地 slots，下游合并部分输出。

另一个 [`EpDispatchExpertsParallel`](https://github.com/huggingface/transformers/blob/66f51e76efd8542232b8bdd40ade7d1edbaac46f/src/transformers/distributed/expert_parallel.py#L230-L298) 先交换 counts，再发送 token，最后反向交换并按原 top-k 权重求和。实际并行初始化可能改写配置；分析时应确认最终安装的模块和 collective，不能仅凭“EP”断定 all-to-all。

## Dispatch 元数据的复用边界

一次 dispatch 的元数据包括排序 permutation、inverse permutation、专家 counts/offsets、padding 映射和可能的通信 split sizes。它们描述“哪些行去哪里”，不包含可跨轮直接沿用的模型输出。

相邻去噪轮即使专家集合相同，也不保证路由映射相同。例如 4 个 token 分别选择 $(E_0,E_1),(E_1,E_2),(E_2,E_3),(E_3,E_0)$；换成 $(E_2,E_3),(E_3,E_0),(E_0,E_1),(E_1,E_2)$ 后，每专家仍收到 2 行，但各专家处理的 token 已改变。

| 检查对象 | 单独满足时能证明什么 | 不能证明什么 |
| --- | --- | --- |
| 相同 $U$ | 活跃专家个数相同 | 专家身份、负载和 token 对应 |
| 相同 counts/offsets | 分组大小相同 | gather / scatter 的映射相同 |
| 相同有序 `top_k_index` | 相同 token/slot 对应相同专家 | shape、layout、放置与容量策略兼容 |
| 元数据全部兼容 | 可以考虑沿用相应映射 | hidden states、路由权重或专家输出可沿用 |

复用完整映射需要核对有序的 token/slot→expert 关系、有效 token 与 batch 身份、张量 shape/stride、专家编号与 EP placement、capacity/drop/padding 策略，以及 kernel 接受的布局。token 次序或 top-k 槽位改变时，旧 permutation 即使仍是合法数组，也可能把正确数据送错专家。

当前 hidden states 和路由权重每轮都要更新，专家 FFN 也要重新执行。计数相同可以复用某些 buffer 容量，不能直接复用旧 gather 结果。基于哈希的检查还需处理冲突，不能把概率性相等当成无条件正确。

收益条件可写成 $T_{\mathrm{check}}+T_{\mathrm{maintain}}<T_{\mathrm{rebuild}}$。如果精确比较整张映射后还要同步 CPU，检查成本可能超过一次 GPU 排序/计数。动态 batch、跨轮变化率、图捕获限制与命中率都应进入评估。

## 语义与性能验证

先验证每个 token 输出确实来自它本轮选中的专家，再测元数据优化。需要覆盖：空专家、重复热点、槽位交换、counts 相同但映射改变、batch 重排、padding、EP placement 改变，以及一次请求结束后下一次请求的状态重置。

性能测量分开报告 router、排序/计数、gather、FC1/激活/FC2、回排和通信；用相同形状、精度与路由比较完整重建、精确检查后复用和增量维护。最终还需看单轮与请求级收益，避免仅加速占比很小的元数据步骤。

图执行的固定地址不等于内容不变。可在 [CUDA Graph 与设备侧循环](cuda-graphs-device-loop.md) 中进一步检查预分配 workspace、重放前重置与动态图路由的关系。

## 来源

- [Transformers MoE integrations](https://github.com/huggingface/transformers/blob/66f51e76efd8542232b8bdd40ade7d1edbaac46f/src/transformers/integrations/moe.py)：分发、grouped MM、权重和输出恢复。
- [Transformers expert parallel](https://github.com/huggingface/transformers/blob/66f51e76efd8542232b8bdd40ade7d1edbaac46f/src/transformers/distributed/expert_parallel.py)：复制路由与 token dispatch 的不同实现。
- [MegaBlocks](https://arxiv.org/abs/2211.15841)：动态专家负载、token dropping/padding 与块稀疏计算。
