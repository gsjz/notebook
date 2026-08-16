# KV Cache 笔记

KV Cache 主要服务自回归生成里的两段式推理流程。

prefill 阶段一次性接收整段 prompt，做整段序列上的全局 attention，可以看成批处理式的离线计算。decode 阶段则是逐个 token 往后生成，每一步都只能基于当前已有上下文推进，可以看成强制在线的计算。

KV Cache 的作用，就是让 decode 阶段复用前面已经算过的 $K,V$，避免每来一个新 token 就把整段前缀重新跑一遍。更直白地说：如果生成长度为 $n$，朴素做法会在第 $t$ 步重算长度约为 $t$ 的前缀，累计下来就会把整段生成推到 $O(n^3 d)$ 量级；而使用 KV Cache 后，decode 只需增量读取历史 cache，整段生成的主开销就回到 $O(n^2 d)$ 量级。

## 记号

见 [Transformer 笔记的 attention 小节](/public/ai/transformer/#attention)。

## 工作方式

逻辑上，每一层都会缓存两份张量：

$$
K_{\mathrm{cache}}^{(\ell)}, V_{\mathrm{cache}}^{(\ell)}
\in \mathbb{R}^{B \times H_{kv} \times T_{\mathrm{cache}} \times d_h}
$$

其中 $H_{kv}$ 是 key / value head 数，$T_{\mathrm{cache}}$ 是当前缓存长度。

prefill 时，模型会一次性算出整段 prompt 的 $K,V$ 并写入 cache。decode 时，每步只新增一个 token，对应的新 $k_{\mathrm{new}}, v_{\mathrm{new}}$ 追加到 cache 末尾；旧的 $K,V$ 保持不变，新 token 直接读取历史 cache 做 attention。

## 加速来源

没有 cache 时，生成第 $t$ 个 token 要反复处理整个前缀。用 cache 后，前缀只在 prefill 阶段算一次，decode 阶段只做增量更新。

所以：

- prefill 仍然要做完整的前缀计算
- decode 不再重复生成历史 token 的 $K,V$
- attention 仍然要读历史 $K,V$，所以开销不会变成常数

## 代价

KV Cache 用时间换显存。按逻辑形状估算，元素数量大致是：

$$
2 \times L \times B \times T_{\mathrm{cache}} \times H_{kv} \times d_h
$$

前面的 $2$ 表示 $K$ 和 $V$ 两份缓存。模型越深、上下文越长、并发越高，cache 越大。

## 核心条件

只要前缀不变，历史位置的 $K,V$ 就可以复用。只要旧 token 会被改写，cache 就需要局部更新、失效或重新计算。
