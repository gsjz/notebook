# KV Cache 笔记

KV Cache 是大模型推理里最常见、也最容易被误解的加速手段之一。它缓存的是每一层 self-attention 的 `Key` 和 `Value`，不是整段 hidden states，也不是 `Query`。

## 它在做什么

在 causal self-attention 里，第 $t$ 个位置的输出可以写成：

$$
\mathrm{Attn}(q_t, K_{\le t}, V_{\le t})
= \mathrm{softmax}\left(\frac{q_t K_{\le t}^\top}{\sqrt{d_k}}\right)V_{\le t}
$$

如果没有 cache，每生成一个新 token，就要把前面的 token 重新跑一遍，历史部分会被反复计算。KV Cache 的做法是：

- 第一次处理 prompt 时，把每层的 $K_{1:n}$ 和 $V_{1:n}$ 存下来。
- 后续每生成一个新 token，只计算这个新 token 的 $q_t, k_t, v_t$。
- 注意力直接拿新 token 的 $q_t$ 去和历史缓存的 $K$、$V$ 交互。

```python
past = None

# prefill
out = model(prompt_ids, use_cache=True, past_key_values=past)
past = out.past_key_values

# decode
for _ in range(max_new_tokens):
    out = model(next_token_ids, use_cache=True, past_key_values=past)
    past = out.past_key_values
    next_token_ids = sample(out.logits[:, -1])
```

## 为什么它快

没有 cache 时，生成第 $t$ 个 token 要重复处理整个前缀。用 cache 后，前缀只在 prefill 阶段算一次，decode 阶段只增量更新。于是：

- prompt 很长时，首轮 prefill 仍然贵。
- 但逐 token 解码的重复计算大幅减少。
- 整体上，推理从“每步重算整段上下文”变成“每步只算一个新位置”。

## 代价是什么

KV Cache 用时间换显存。它的显存占用大致随下面几个量线性增长：

$$
2 \times \text{layers} \times \text{batch} \times \text{seq\_len} \times \text{num\_kv\_heads} \times \text{head\_dim}
$$

其中前面的 `2` 表示 `K` 和 `V` 两份缓存。模型越深、上下文越长、并发越高，cache 越大。

!!! warning "它不是万能加速器"
    KV Cache 只对“前文固定、后文递增”的生成特别有效。

    如果你会改写旧 token、回填中间位置，或者生成过程本身是双向反复修正的，那么旧缓存很容易失效。这个时候就不能把 KV Cache 当成天然可复用的答案。

## 常见误区

- KV Cache 不是 FlashAttention。前者减少重复计算，后者主要优化 attention kernel 的内存访问和吞吐。
- KV Cache 不缓存 `Query`。因为历史 token 不会再作为“当前要预测的位置”重新计算。
- KV Cache 不等于“把整个上下文压成一个向量”。它保留的是逐层、逐头、逐位置的细粒度状态。
- KV Cache 不会消除 prompt 的首轮计算，只会让后续 decode 更便宜。

## 常见优化

- `prefix cache`：多轮对话里，历史前缀不变时直接复用旧 cache。
- `sliding window`：只保留最近一段上下文，控制显存。
- `paged attention`：把 cache 分页管理，减少碎片。
- `quantized cache`：把 cache 压成更低精度，换取显存。
- `offload`：把部分 cache 挪到 CPU 或更慢的存储层。

## 和模型类型的关系

KV Cache 最自然地服务于 decoder-only 模型，因为它的生成顺序是固定的左到右。encoder-decoder 模型在 decoder 侧也能用 cache，但 encoder 侧通常是一次性编码，不是逐步生成。

对 diffusion LM 或 dLLM 来说，KV Cache 的复用会更麻烦，因为生成过程中可能会重新遮盖、改写或者重排旧位置。换句话说，KV Cache 的前提是“过去不会变”；一旦过去也要改，它的收益就会明显下降。

## 一句话判断

KV Cache 本质上是一个很朴素的工程事实：如果前缀不变，就别重复算前缀。
