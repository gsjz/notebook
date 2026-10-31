# JAX 性能验证与 XLA 融合边界

JAX 函数返回数组时，设备计算可能仍在进行。判断优化是否有效，需要把数据传输、编译、提交和执行拆开，再确认计时窗口覆盖所有需要的输出。`jit` 为编译器提供优化空间，实际生成多少 kernel、是否物化中间数组，仍取决于后端与输入配置。

前置内容见 [JAX 数组、PyTree 与随机数](jax-arrays-pytrees-random.md)、[JIT 编译与静态信息](jax-jit-compilation.md) 和 [JAX 控制流与扩散循环](jax-control-flow-diffusion.md)。硬件时间线与测量指标见 [GPU 推理性能测量](gpu-inference-profiling.md)。

## 输入与完成边界

`jax.device_put(host_array, device)` 将数据放到指定设备；它本身也可以异步返回。测纯计算时，应在计时前完成输入传输和等待。测请求服务时间时，则按真实服务路径决定是否包含预处理、传输与输出回传，不能在两个基线之间移动这些边界。

| 操作 | 能说明什么 | 不能据此推断什么 |
| --- | --- | --- |
| JAX 函数返回 `jax.Array` | 已获得结果句柄 | 对应设备工作全部完成 |
| 读取 `shape`、`dtype` | 元数据可用 | 数值已经就绪 |
| `jax.block_until_ready(outputs)` | 等待输出 PyTree 中可等待的叶子 | 任意无关设备工作都已完成 |
| `np.asarray(result)`、打印数组值 | 通常需要 host 可读的数值 | 时间只包含目标 kernel |

若函数返回 `(tokens, cache, stats)`，应等待本次测量需要的完整输出树。仅等待某个较早完成的叶子，可能漏掉其他分支；只等待最后一次调用的某个结果，也不能作为所有独立请求均完成的通用证明。`block_until_ready` 不要求将完整数组复制回 host。

<svg viewBox="0 0 920 210" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="JAX 从 Python 经 Jaxpr 和 StableHLO 编译为设备可执行程序，首次编译与稳态执行分离" style="display:block;width:100%;height:auto;margin:1rem 0;background:#fff;border-radius:12px" font-family="system-ui,sans-serif">
  <defs><marker id="jax-profile-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7" fill="#9ca3af"/></marker></defs>
  <g fill="#fafafa" stroke="#e5e7eb"><rect x="20" y="20" width="150" height="54" rx="9"/><rect x="205" y="20" width="150" height="54" rx="9"/><rect x="390" y="20" width="150" height="54" rx="9"/><rect x="575" y="20" width="150" height="54" rx="9"/><rect x="760" y="20" width="140" height="54" rx="9"/></g>
  <g font-size="15" fill="#374151" text-anchor="middle"><text x="95" y="53">Python 函数</text><text x="280" y="53">trace / Jaxpr</text><text x="465" y="53">StableHLO</text><text x="650" y="53">后端编译</text><text x="830" y="53">可执行程序</text></g>
  <g fill="none" stroke="#9ca3af" stroke-width="1.5" marker-end="url(#jax-profile-arrow)"><path d="M170 47H201"/><path d="M355 47H386"/><path d="M540 47H571"/><path d="M725 47H756"/></g>
  <path d="M205 88V99H900V88" fill="none" stroke="#d1d5db"/><text x="555" y="121" text-anchor="middle" font-size="13" fill="#6b7280">首次调用可能承担编译；缓存命中后复用</text>
  <rect x="205" y="145" width="695" height="44" rx="9" fill="#f0eef8" stroke="#d8d2e2"/><text x="552" y="173" text-anchor="middle" font-size="15" fill="#62578a">稳态：输入已就绪 → dispatch → 设备执行 → 等待所需输出</text>
</svg>

## 可运行的 CPU 基线

下面仅依赖 `jax`、`numpy`，显式使用 CPU。输入为四行 logits、128 项词表和 16 维 embedding，计算稳定 softmax、加权 embedding 与缩放。小尺寸用于验证接口和数学语义；输出的时间不能代表 GPU、DGX Spark 或模型端到端性能。

```python
import time

import jax
import jax.numpy as jnp
import numpy as np


@jax.jit
def soft_embedding(logits, table):
    probabilities = jax.nn.softmax(logits.astype(jnp.float32), axis=-1)
    probabilities = probabilities.astype(logits.dtype)
    embedding = probabilities @ table
    embedding = embedding * jnp.sqrt(table.shape[-1]).astype(embedding.dtype)
    return {"embedding": embedding}


host_logits = np.linspace(-3, 3, 4 * 128, dtype=np.float32).reshape(4, 128)
host_table = np.sin(np.arange(128 * 16, dtype=np.float32)).reshape(128, 16)
cpu = jax.devices("cpu")[0]
inputs = jax.device_put((host_logits, host_table), cpu)
jax.block_until_ready(inputs)

started = time.perf_counter()
first_output = jax.block_until_ready(soft_embedding(*inputs))
first_seconds = time.perf_counter() - started
jax.block_until_ready(soft_embedding(*inputs))

repeats = 20
started = time.perf_counter()
for iteration in range(repeats):
    output = jax.block_until_ready(soft_embedding(*inputs))
latency_seconds = (time.perf_counter() - started) / repeats

started = time.perf_counter()
pending = [soft_embedding(*inputs) for iteration in range(repeats)]
jax.block_until_ready(pending)
window_seconds = time.perf_counter() - started

weights = np.exp(host_logits - host_logits.max(axis=-1, keepdims=True))
weights = weights / weights.sum(axis=-1, keepdims=True)
reference = (weights @ host_table) * np.sqrt(np.float32(16))
np.testing.assert_allclose(np.asarray(output["embedding"]), reference,
                           rtol=1e-5, atol=1e-6)
print("backend:", cpu.platform)
print("first call (s):", first_seconds)
print("synchronized mean (s):", latency_seconds)
print("queued calls / s:", repeats / window_seconds)
```

第一次调用的窗口混合了可能发生的 trace、lowering、编译和执行；若已有持久编译缓存命中，它不再代表一次全新编译。随后额外运行一次作为 warm-up。改变 shape、dtype、静态参数或后端，可能产生新的编译变体，需要重新预热。

每次等待的循环测串行调用完成延迟，包含 Python 提交与同步成本。批量提交后统一等待，测这批独立调用的完成速率，不能把窗口均摊时间当成每个请求的响应延迟。批量保留输出会占用内存；上述小例子限制为 20 次。真实去噪迭代有前后状态依赖，不能用独立投影的排队吞吐代替整条生成链。

<iframe src="../assets/jax/async-timing.html" title="JAX 提交、执行和首次编译的计时边界" loading="lazy" style="display:block;width:100%;height:520px;border:0;border-radius:16px;margin:1rem 0;"></iframe>

[单独打开计时示意](assets/jax/async-timing.html)

## Jaxpr、StableHLO 与后端结果

在上例之后运行：

```python
print(jax.make_jaxpr(soft_embedding)(*inputs))
lowered = soft_embedding.lower(*inputs)
print(lowered.compiler_ir(dialect="stablehlo"))
compiled = lowered.compile()
print(compiled.as_text())
```

| 层级 | 主要观察 | 边界 |
| --- | --- | --- |
| Jaxpr | primitive、数据依赖、dtype 与 shape | 尚未给出最终 kernel 调度 |
| StableHLO | `reduce`、`exponential`、`dot_general` 等低层表达 | 尚未完成目标后端的全部优化 |
| 编译后文本 | 后端可提供的优化结果、fusion 或库调用线索 | 文本格式与可用性依赖版本、后端 |
| 设备 trace | 实际 kernel、传输、时间与依赖 | profiler 本身可能扰动执行 |

一段 Python 表达式可能生成多个 kernel；多个 HLO 操作也可能融合成一个 kernel，矩阵乘还可能交给专用库或其他生成器。HLO op 数量不能直接当作 kernel 数量，CPU 编译结果也不能推断 GPU 的融合选择。检查编译文本有助于形成假设，确认延迟和内存流量仍需运行目标后端并采集证据。

## Softmax 投影的代码与内存

固定 Gemma commit [`9e1f741`](https://github.com/google-deepmind/gemma/tree/9e1f74131ba9d45e5fe6ae7bb3941d9f2abb39c3)。[`sample_step`](https://github.com/google-deepmind/gemma/blob/9e1f74131ba9d45e5fe6ae7bb3941d9f2abb39c3/gemma/diffusion/_sampler.py#L559-L612) 先获得模型 logits，再经 `logit_shaper` 得到 `shaped_prediction`，供采样和下一轮自条件投影使用。投影调用 `embedder.encode_logits`，返回 `new_sc_embeddings`；分析消费者时应从这份处理后的 logits 出发。

[`Embedder.encode_logits`](https://github.com/google-deepmind/gemma/blob/9e1f74131ba9d45e5fe6ae7bb3941d9f2abb39c3/gemma/gm/nn/gemma4/_modules.py#L140-L155) 的核心为：

```python
probs = jax.nn.softmax(x.astype(jnp.float32), axis=-1).astype(x.dtype)
x = jnp.einsum('...v,ve->...e', probs, self.input_embedding_table)
x *= jnp.sqrt(self.embed_dim).astype(x.dtype)
```

这里概率转换回输入 logits 的 dtype；不能直接套用其他后端的类型路径。上面的 CPU 基线使用全 FP32，模拟该数学结构，未复现模型参数、温度处理和完整 self-conditioning 模块。

设 logits 有 $M$ 行、词表大小为 $V$、embedding 维度为 $D$。完整概率张量若物化，需要 $MVb$ 字节，其中 $b$ 是每项字节数；投影还要读取 $V\times D$ 的表。源码写出 `probs` 不证明它一定落到设备显存，`jit` 也不保证它会消失。实际边界由融合、buffer 分配、消费者和后端矩阵乘实现共同决定。

[在线 softmax 与自条件投影融合](online-softmax-fusion.md) 用分块归约避免完整概率写回。但在 FP32 softmax 后逐项转 BF16，与保持 FP32 分块累加、最后再转换，存在不同舍入路径。验证应覆盖张量误差、概率阈值附近的停止判断和实际去噪步数；更少内存流量不自动保证更低总延迟。

## Trace 与可复核结论

以下代码接在 CPU 基线之后，用临时目录保存 trace；先预热，再在采集窗口退出前显式等待输出：

```python
import tempfile

jax.block_until_ready(soft_embedding(*inputs))
trace_dir = tempfile.mkdtemp(prefix="jax-trace-")
with jax.profiler.trace(trace_dir):
    outputs = [soft_embedding(*inputs) for iteration in range(5)]
    jax.block_until_ready(outputs)
print("trace ready:", trace_dir)
```

输出目录保留在系统临时目录中，可按官方 profiling 文档离线查看，分析后再清理。采集工具与后端支持决定具体可见事件，GPU trace 还依赖匹配的 CUDA/CUPTI 环境。正式延迟应在无 profiler 的运行中重新测量。

记录 JAX/jaxlib、后端、设备、shape、精度、编译选项、输入是否常驻及同步边界。针对模型分别比较固定前向次数与自然早停，把每轮算子收益和轮数变化分开。上述教学代码已在 JAX / jaxlib `0.12.0.1` 的 CPU 后端执行，验证数值参考、IR 接口与 trace 采集；未验证 GPU 性能。交互中的时间全部为合成参数。

## 资料

- [JAX：Benchmarking JAX code](https://docs.jax.dev/en/latest/benchmarking.html)
- [JAX：Asynchronous dispatch](https://docs.jax.dev/en/latest/async_dispatch.html)
- [JAX：Ahead-of-time lowering and compilation](https://docs.jax.dev/en/latest/aot.html)
- [JAX：Profiling computation](https://docs.jax.dev/en/latest/profiling.html)
- [JAX：`block_until_ready`](https://docs.jax.dev/en/latest/_autosummary/jax.block_until_ready.html)
