# RoPE 旋转位置编码笔记

RoPE 是 Rotary Position Embedding 的缩写，最早由 RoFormer 论文系统提出。它的核心做法不是给 token embedding 加一个位置向量，而是在 self-attention 里按位置旋转 `Query` 和 `Key`。这样一来，每个位置仍然带有绝对位置信息，而两个位置之间的注意力分数又会自然变成相对位置的函数。

纯 self-attention 本身不关心 token 顺序。若输入 token 被同样地重排，attention 只看到一组向量之间的相似度，不会自动知道哪个 token 在前、哪个 token 在后。Transformer 原论文因此在输入表示中加入正弦 / 余弦位置编码：

$$
\mathrm{PE}_{(\mathrm{pos}, 2i)} = \sin\left(\frac{\mathrm{pos}}{10000^{2i / d_{\mathrm{model}}}}\right)
$$

$$
\mathrm{PE}_{(\mathrm{pos}, 2i + 1)} = \cos\left(\frac{\mathrm{pos}}{10000^{2i / d_{\mathrm{model}}}}\right)
$$

RoPE 沿用了“不同维度使用不同频率”的思路，但改变了位置进入模型的地方：

- 绝对位置编码通常把位置向量加到 hidden states 上。
- 相对位置偏置通常改 attention score。
- RoPE 在得到 `Query` / `Key` 后，根据 token 位置旋转它们。

LLaMA 论文里也采用了这一设计：移除 absolute positional embeddings，在每一层加入 rotary positional embeddings。

## 数学核心

先看二维情形。为了和 Transformer 论文里的 $QK^\top$ 记号对齐，下面把每个位置的向量都写成行向量，旋转也写成右乘形式。给定一个二维向量 $x = (x_1, x_2)$，第 $m$ 个位置使用角度 $m\theta$ 做旋转：

$$
R_{\theta, m} =
\begin{bmatrix}
	\cos(m\theta) & \sin(m\theta) \\
	-\sin(m\theta) & \cos(m\theta)
\end{bmatrix}
$$

如果 $q_m$ 是第 $m$ 个位置的 `Query`，$k_n$ 是第 $n$ 个位置的 `Key`，RoPE 对它们做：

$$
\tilde{q}_m = q_m R_{\theta, m}
$$

$$
\tilde{k}_n = k_n R_{\theta, n}
$$

attention score 里真正用到的是点积：

这里也可以顺手对齐一下 Transformer 原论文里的记号。原论文常写成

$$
\mathrm{Attention}(Q, K, V) = \mathrm{softmax}\left(\frac{QK^\top}{\sqrt{d_k}}\right)V
$$

在这套写法里，$Q$ 和 $K$ 通常是把每个位置的向量按 **行** 叠起来的矩阵，$Q, K \in \mathbb{R}^{T \times d}$。因此：

$$
(QK^\top)_{mn} = q_m k_n^\top
$$

也就是第 $m$ 个 query 和第 $n$ 个 key 的内积。把这个记号和上面的单个位置写法放在一起看，就会更清楚：RoPE 只是先把每一行向量旋转成 $\tilde q_m$、$\tilde k_n$，再去算注意力分数。

$$
\tilde{q}_m \tilde{k}_n^\top
=
(q_m R_{\theta, m})(k_n R_{\theta, n})^\top
=
q_m R_{\theta, m} R_{\theta, n}^\top k_n^\top
=
q_m R_{\theta, m - n} k_n^\top
$$

关键在最后一步：右乘写法下，$R_{\theta, m} R_{\theta, n}^\top = R_{\theta, m - n}$。也就是说，点积里的位置项只依赖相对距离 $m - n$。不同论文或代码可能因为旋转方向约定写成 $n - m$，但要点相同：两个位置的 attention score 会自然带上相对位移。

更高维时，把 head dimension 切成二维小块，对每一对维度使用不同频率：

$$
\theta_i = \mathrm{base}^{-2i / d}
$$

其中 $d$ 是每个 attention head 的维度，$i = 0, 1, \dots, d / 2 - 1$，常见 $\mathrm{base} = 10000$。于是 RoPE 的高维形式可以写成分块旋转：

$$
\tilde{x}_m =
x_m R_{\Theta, m}^{d}
$$

这里 $R_{\Theta, m}^{d}$ 是由多个二维旋转矩阵组成的 block diagonal matrix。低频维度变化慢，能覆盖较长距离；高频维度变化快，能分辨较近位置。

!!! note "为什么说它同时有绝对和相对信息"
    每个向量先按自己的绝对位置 $m$ 或 $n$ 旋转，所以单个向量确实被注入了绝对位置。

    但 attention score 是旋转后的 `Query` 和 `Key` 的点积，两个旋转矩阵相乘后只留下相对位移 $n - m$。这就是 RoPE 在 self-attention 里表现出相对位置结构的原因。

## 工程实现

实际实现通常不会显式构造大矩阵 $R_{\Theta, m}^{d}$，而是预先计算每个位置、每个频率的 $\cos$ 和 $\sin$，再用逐元素操作完成旋转。

下面是一个便于理解的 interleaved layout 版本，即第 $0, 1$ 维一组，第 $2, 3$ 维一组：

```python
import torch


def build_rope_cache(seq_len: int, head_dim: int, device, base: float = 10000.0):
    pos = torch.arange(seq_len, device=device, dtype=torch.float32)
    dim = torch.arange(0, head_dim, 2, device=device, dtype=torch.float32)
    inv_freq = 1.0 / (base ** (dim / head_dim))

    angles = torch.outer(pos, inv_freq)
    cos = torch.repeat_interleave(angles.cos(), repeats=2, dim=-1)
    sin = torch.repeat_interleave(angles.sin(), repeats=2, dim=-1)
    return cos, sin


def rotate_half_interleaved(x: torch.Tensor):
    x_even = x[..., 0::2]
    x_odd = x[..., 1::2]
    return torch.stack((-x_odd, x_even), dim=-1).flatten(-2)


def apply_rope(x: torch.Tensor, cos: torch.Tensor, sin: torch.Tensor):
    return x * cos + rotate_half_interleaved(x) * sin
```

生产代码里还要处理 batch、head、sequence 维度的 broadcast。常见输入形状可能是 $[\mathrm{batch}, \mathrm{heads}, \mathrm{seq}, \mathrm{head\_dim}]$，这时 $\cos$ 和 $\sin$ 往往会整理成 $[1, 1, \mathrm{seq}, \mathrm{head\_dim}]$。

!!! warning "layout 必须匹配权重和代码"
    RoPE 有 interleaved layout，也有 split-half layout。两种写法只要从训练到推理保持一致，都可以表达旋转；但不能随便把一个模型的权重拿到另一套 layout 里直接用。否则每一对被旋转的维度会错位，输出会变坏。

## 和 KV Cache 的关系

RoPE 会影响 KV Cache，因为缓存里的 `Key` 通常已经是旋转之后的 $K$。在 decoder-only 推理中：

- prefill 阶段会为 prompt 中每个位置计算 $K$、$V$。
- RoPE 应用于 $Q$ 和 $K$，通常不应用于 $V$。
- decode 阶段新增 token 时，只计算新位置的 $q_t$、$k_t$、$v_t$，再把旋转后的 $k_t$ 追加进 cache。

这意味着 cache 和 position id 绑定得很紧。如果后续 decode 使用的位置编号错了，或者中途换了 RoPE scaling 方案，旧 cache 里的 $K$ 和新 token 的 $Q$ 就不在同一套坐标系里。这个时候不能安全混用旧 cache。

在普通左到右生成里，RoPE 和 [KV Cache](/public/ai/kv-cache/) 是相容的；RoPE 只改变 $QK^\top$ 的几何结构，不改变“历史 $K$、$V$ 可复用”的基本前提。

## 长上下文扩展

RoPE 的一个实践问题是：模型在训练时只见过有限上下文长度，直接推到更长位置时，角度 $m\theta_i$ 会进入训练外区域，attention score 可能不稳定。长上下文模型常见的 RoPE 改造，基本都围绕“如何让更长的位置落回模型较熟悉的频率范围”展开。

### Linear scaling / Position Interpolation

Position Interpolation 的想法是把新上下文里的位置线性压缩回原训练长度范围。假设原始训练长度是 $L$，现在希望支持 $L'$，可以把位置 $m$ 映射成：

$$
m' = m \cdot \frac{L}{L'}
$$

然后用 $m'$ 参与 RoPE 角度计算。论文指出，相比直接 extrapolate 到训练长度之外，插值能显著降低不稳定的 attention score 风险，并且保留原有模型结构。

### NTK-aware / dynamic scaling

NTK-aware scaling 这类方法会调整 RoPE 的频率基底 $\mathrm{base}$，让低频维度覆盖更长范围。直观上，它不是简单压缩所有位置，而是改频率分布，让同一组维度在更长上下文里有更合适的周期。

Hugging Face Transformers 里把这类能力整理成 `rope_scaling` 相关配置，支持 `linear`、`dynamic`、`yarn`、`longrope`、`llama3` 等变体。具体模型能不能这样改，仍要看训练方式、上下文目标和实现是否匹配。

### YaRN 和 LongRoPE

YaRN 继续沿着 RoPE scaling 的方向优化长上下文扩展，目标是在更少训练 token 和更少 fine-tuning steps 下扩展上下文窗口。

LongRoPE 则引入非均匀 positional interpolation 和渐进式扩展策略，论文报告可把 RoPE 模型上下文扩展到百万 token 级别，同时尽量恢复短上下文性能。

这些方法的共同点是：它们通常不重写 Transformer 主体结构，而是调整 RoPE 的位置到角度映射。工程上这很有吸引力，因为 attention kernel、KV Cache 和大部分推理基础设施仍然能复用。

## 常见误区

- RoPE 不是一个加到输入 embedding 上的可学习位置向量。
- RoPE 主要作用在 `Query` 和 `Key` 上，通常不旋转 `Value`。
- RoPE 不是把相对距离显式存进 cache，而是通过旋转后的点积让相对距离进入 attention score。
- $\mathrm{base}$、position id、scaling 方案和 layout 都是模型定义的一部分，推理时不能随意替换。
- 长上下文 RoPE scaling 不是免费午餐。上下文能拉多长，还取决于模型是否见过相应训练、attention 实现是否支持、KV Cache 显存是否够，以及长距离任务本身是否被学到。

## 参考资料

- [RoFormer: Enhanced Transformer with Rotary Position Embedding](https://arxiv.org/abs/2104.09864)
- [Attention Is All You Need](https://arxiv.org/abs/1706.03762)
- [LLaMA: Open and Efficient Foundation Language Models](https://arxiv.org/abs/2302.13971)
- [Hugging Face Transformers: RoFormer](https://huggingface.co/docs/transformers/en/model_doc/roformer)
- [Hugging Face Transformers: Utilities for Rotary Embedding](https://huggingface.co/docs/transformers/en/internal/rope_utils)
- [Extending Context Window of Large Language Models via Positional Interpolation](https://arxiv.org/abs/2306.15595)
- [YaRN: Efficient Context Window Extension of Large Language Models](https://arxiv.org/abs/2309.00071)
- [LongRoPE: Extending LLM Context Window Beyond 2 Million Tokens](https://arxiv.org/abs/2402.13753)
