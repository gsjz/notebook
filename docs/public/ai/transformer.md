# Transformer 笔记

## 记号

| 记号 | 含义 |
| --- | --- |
| $B$ | batch size |
| $T$ | 序列长度 |
| $d_{\mathrm{model}}$ | 每个 token 的 hidden dimension |
| $H$ | attention head 数 |
| $d_h$ | 每个 head 的维度，常见设定是 $d_{\mathrm{model}} = H d_h$ |
| $L$ | Transformer block 层数 |
| $V$ | 词表大小 |

输入 token id 的形状通常是：

$$
X_{\mathrm{id}} \in \mathbb{N}^{B \times T}
$$

经过 token embedding 后：

$$
X \in \mathbb{R}^{B \times T \times d_{\mathrm{model}}}
$$

Transformer block 接收和输出的主张量形状通常保持不变：

$$
\mathbb{R}^{B \times T \times d_{\mathrm{model}}}
\rightarrow
\mathbb{R}^{B \times T \times d_{\mathrm{model}}}
$$

这样多个 block 才能堆叠。

## Attention

self-attention 的输入是一串 token 表示 $X$。对每个 token，模型通过线性变换产生：

$$
Q = XW_Q,\quad K = XW_K,\quad V = XW_V
$$

其中：

$$
Q,K,V \in \mathbb{R}^{B \times T \times d_{\mathrm{model}}}
$$

如果先只看单个 batch、单个 head，则有：

$$
Q,K,V \in \mathbb{R}^{T \times d_h}
$$

attention scores 是：

$$
S = \frac{QK^\top}{\sqrt{d_h}}
$$

!!! note "为什么要除以 $\sqrt{d_h}$"
    $Q$ 和 $K$ 的每个向量都有 $d_h$ 个分量。维度越大，点积 $q_i k_j^\top$ 的数值通常越容易变大，softmax 也就越容易变得很尖，梯度不太好传。

    除以 $\sqrt{d_h}$ 相当于把分数拉回一个更稳定的尺度。直观上，如果每个分量的量级差不多，这个缩放能让 attention score 的大小不要随着 head 维度一起膨胀。

形状是：

$$
S \in \mathbb{R}^{T \times T}
$$

$S_{ij}$ 表示第 $i$ 个位置的 query 和第 $j$ 个位置的 key 的匹配程度。这个分数还不是最终输出。

经过 softmax 得到 attention weights：

$$
A = \mathrm{softmax}(S)
$$

最后用权重对 value 做加权求和：

$$
O = AV
$$

形状是：

$$
O \in \mathbb{R}^{T \times d_h}
$$

所以 attention 最终返回的是每个位置的新表示向量，不是一个分数。

## Causal Mask

decoder-only 语言模型生成时不能看未来 token。对第 $i$ 个位置，只允许看 $j \le i$ 的位置。

这通过 causal mask 加到 attention scores 上：

$$
S_{ij} =
\begin{cases}
\frac{q_i k_j^\top}{\sqrt{d_h}}, & j \le i \\
-\infty, & j > i
\end{cases}
$$

softmax 后，未来位置的权重会变成 0。

因此 decoder-only 模型训练时可以并行计算整段序列，但每个位置的信息流仍然满足左到右约束。

## Multi-Head Attention

单个 head 只能在一个子空间里做匹配。multi-head attention 把 hidden dimension 切成多个 head，每个 head 独立做 attention：

$$
O^{(h)} = \mathrm{Attention}(Q^{(h)}, K^{(h)}, V^{(h)})
$$

其中：

$$
O^{(h)} \in \mathbb{R}^{B \times T \times d_h}
$$

把所有 head 的输出拼接：

$$
\mathrm{Concat}(O^{(1)},\ldots,O^{(H)})
\in \mathbb{R}^{B \times T \times d_{\mathrm{model}}}
$$

再经过输出投影：

$$
\mathrm{MHA}(X)
= \mathrm{Concat}(O^{(1)},\ldots,O^{(H)})W_O
$$

输出形状仍然是：

$$
\mathbb{R}^{B \times T \times d_{\mathrm{model}}}
$$

## FFN

attention 负责在 token 之间交换信息。FFN 负责对每个 token 的表示做逐位置变换。

常见 FFN 可以写成：

$$
\mathrm{FFN}(x) = W_2 \sigma(W_1 x + b_1) + b_2
$$

如果 $x \in \mathbb{R}^{d_{\mathrm{model}}}$，通常先升维到 $d_{\mathrm{ff}}$，再降回 $d_{\mathrm{model}}$：

$$
d_{\mathrm{model}}
\rightarrow
d_{\mathrm{ff}}
\rightarrow
d_{\mathrm{model}}
$$

对整段序列来说：

$$
\mathrm{FFN}:
\mathbb{R}^{B \times T \times d_{\mathrm{model}}}
\rightarrow
\mathbb{R}^{B \times T \times d_{\mathrm{model}}}
$$

它不会混合不同 token 的位置，位置之间的信息混合主要发生在 attention 里。

## Transformer Block

一个常见的 decoder-only block 使用 pre-norm 结构：

$$
X' = X + \mathrm{MHA}(\mathrm{LN}(X))
$$

$$
Y = X' + \mathrm{FFN}(\mathrm{LN}(X'))
$$

这里有三类关键结构：

- `LayerNorm`：稳定每层输入分布
- residual connection：让每层学习增量，而不是完全重写表示
- `MHA` / `FFN`：分别负责跨位置交互和逐位置非线性变换

整个 block 的输入输出形状都是：

$$
B \times T \times d_{\mathrm{model}}
$$

## Decoder-Only 语言模型

decoder-only 语言模型通常由这些部分组成：

1. token embedding
2. positional encoding 或 RoPE
3. $L$ 层 Transformer block
4. final LayerNorm
5. language modeling head

最后一步把 hidden state 映射到词表维度：

$$
\mathrm{logits} = HW_{\mathrm{vocab}}
$$

其中：

$$
H \in \mathbb{R}^{B \times T \times d_{\mathrm{model}}}
$$

$$
\mathrm{logits} \in \mathbb{R}^{B \times T \times |V|}
$$

对自回归生成来说，通常只取最后一个位置的 logits：

$$
\mathrm{logits}_{:, -1, :}
\in \mathbb{R}^{B \times |V|}
$$

然后通过采样或贪心选择得到下一个 token。

## 和 KV Cache 的关系

在 decoder-only 生成里，第 $t$ 个位置的输出需要访问历史位置的 $K_{\le t}$ 和 $V_{\le t}$：

$$
\mathrm{Attn}(q_t, K_{\le t}, V_{\le t})
= \mathrm{softmax}\left(\frac{q_tK_{\le t}^{\top}}{\sqrt{d_h}}\right)V_{\le t}
$$

如果没有 KV Cache，每生成一个新 token，都要重新计算历史 token 在每一层的 $K,V$。

KV Cache 保存的是每层、每个 KV head、每个历史位置的 $K,V$：

$$
K_{\mathrm{cache}}^{(\ell)}, V_{\mathrm{cache}}^{(\ell)}
\in
\mathbb{R}^{B \times H_{kv} \times T_{\mathrm{cache}} \times d_h}
$$

这样 decode 阶段只需要计算新 token 的 $q_t,k_t,v_t$，再把 $k_t,v_t$ 追加到 cache。

KV Cache 没有改变 Transformer 的数学定义，它只是避免重复计算已经固定的历史 $K,V$。

## 需要分清的几组概念

- attention scores：$QK^\top / \sqrt{d_h}$，是匹配分数
- attention weights：softmax 后的权重分布
- attention output：对 $V$ 加权求和后的向量
- hidden state：每层每个 token 的表示
- logits：最后映射到词表维度后的预测分数
- KV Cache：推理时缓存的历史 $K,V$，不是 hidden state，也不是 logits

## 参考

### 核心论文

- [Attention Is All You Need](https://arxiv.org/abs/1706.03762)：Transformer 原论文。
- [Layer Normalization](https://arxiv.org/abs/1607.06450)：`LayerNorm` 的原始论文。
- [On Layer Normalization in the Transformer Architecture](https://arxiv.org/abs/2002.04745)：解释 Pre-LN / Post-LN 差异，和现代 decoder-only block 的 pre-norm 写法关系很近。
- [Root Mean Square Layer Normalization](https://arxiv.org/abs/1910.07467)：`RMSNorm`，很多现代 LLM 用它替代 `LayerNorm`。
- [RoFormer: Enhanced Transformer with Rotary Position Embedding](https://arxiv.org/abs/2104.09864)：RoPE 的系统论文。
- [GLU Variants Improve Transformer](https://arxiv.org/abs/2002.05202)：FFN 里 `SwiGLU` / `GEGLU` 这类门控变体的来源。
- [Fast Transformer Decoding: One Write-Head is All You Need](https://arxiv.org/abs/1911.02150)：multi-query attention，主要改进自回归推理时的 KV 读取开销。
- [GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints](https://arxiv.org/abs/2305.13245)：grouped-query attention，在 MHA 和 MQA 之间折中质量与推理效率。
- [FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness](https://arxiv.org/abs/2205.14135)：不改 attention 数学定义，主要改进 GPU 内存访问和长序列训练 / 推理效率。
- [LLaMA: Open and Efficient Foundation Language Models](https://arxiv.org/abs/2302.13971)：现代 decoder-only LLM 结构配方的代表，组合了 pre-norm、RMSNorm、SwiGLU、RoPE 等实践。

### 辅助阅读与站内笔记

- [The Illustrated Transformer](https://jalammar.github.io/illustrated-transformer/)
- [KV Cache 笔记](/public/ai/kv-cache/)
- [RoPE 旋转位置编码笔记](/public/ai/rope/)
