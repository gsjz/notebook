# JAX JIT、Tracing 与编译缓存

`jax.jit` 为给定输入约束生成可复用的可执行程序。推理中“第一次慢、后续快”的差别，需要拆成 Python tracing、后端编译和设备执行；输入值变化与输入结构变化也不能混为一谈。

前置概念见 [JAX 数组、PyTree 与随机数](jax-arrays-pytrees-random.md)。本文的小例子只依赖 CPU，用于观察语义，不代表 GPU 推理性能。

## 从 Python 到设备程序

| 阶段 | 发生什么 | 观察对象 |
| --- | --- | --- |
| Tracing | 以 tracer 执行 Python，记录受支持的数组操作和数据依赖 | `jaxpr`，抽象输入的 shape、dtype 等 |
| Lowering | 将中间表示转换到编译器接受的形式 | StableHLO / MLIR |
| Compilation | 后端优化、选择布局与算法，生成目标设备可执行程序 | XLA 优化结果、可执行对象 |
| Execution | 给可执行程序传入本次数据并调度运行 | 设备结果、时间线 |

普通 JIT tracing 通常知道数组的 shape 和 dtype，尚不知道动态数组的具体元素。Python 里的 `print` 在 tracing 时发生；编译后的每次执行不会重新运行这条 Python 语句。需要观察运行时值时，可使用 `jax.debug.print`，但它也会影响执行与测量。

<svg viewBox="0 0 900 154" role="img" aria-label="Python函数经tracing成为jaxpr，再lower到StableHLO，由XLA编译为设备可执行程序后执行" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:auto;margin:1rem 0;background:#fff;border-radius:12px">
  <defs><marker id="jax-jit-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7" fill="#6b7280"/></marker></defs>
  <g font-family="system-ui,sans-serif" text-anchor="middle" fill="#374151" font-size="14">
    <rect x="12" y="38" width="144" height="70" rx="9" fill="#fafafa" stroke="#e5e7eb"/><text x="84" y="67">Python 函数</text><text x="84" y="90" font-size="12" fill="#6b7280">抽象输入 + 静态值</text>
    <rect x="195" y="38" width="144" height="70" rx="9" fill="#f0eef8" stroke="#d8d2e2"/><text x="267" y="67">jaxpr</text><text x="267" y="90" font-size="12" fill="#6b7280">操作与依赖</text>
    <rect x="378" y="38" width="144" height="70" rx="9" fill="#f0eef8" stroke="#d8d2e2"/><text x="450" y="67">StableHLO</text><text x="450" y="90" font-size="12" fill="#6b7280">尚非最终 kernel</text>
    <rect x="561" y="38" width="144" height="70" rx="9" fill="#f0eef8" stroke="#d8d2e2"/><text x="633" y="67">可执行程序</text><text x="633" y="90" font-size="12" fill="#6b7280">目标设备与布局</text>
    <rect x="744" y="38" width="144" height="70" rx="9" fill="#fafafa" stroke="#e5e7eb"/><text x="816" y="67">设备执行</text><text x="816" y="90" font-size="12" fill="#6b7280">CPU / GPU 等</text>
    <text x="175" y="25" font-size="11" fill="#6b7280">trace</text><text x="358" y="25" font-size="11" fill="#6b7280">lower</text><text x="541" y="25" font-size="11" fill="#6b7280">XLA compile</text><text x="724" y="25" font-size="11" fill="#6b7280">execute</text>
    <text x="450" y="138" font-size="12" fill="#6b7280">已命中兼容的可执行程序时，新数据可直接进入执行阶段。</text>
  </g>
  <g fill="none" stroke="#9ca3af" stroke-width="1.5" marker-end="url(#jax-jit-arrow)"><path d="M156 73H192"/><path d="M339 73H375"/><path d="M522 73H558"/><path d="M705 73H741"/></g>
</svg>

StableHLO 描述程序语义，不是一份已确定的 CUDA kernel 清单。XLA 后续可能融合逐元素计算、调用库、安排拷贝或保留多个 kernel；一段 `jit` 不保证全部融合，也不等于 CUDA Graph 捕获。

## 哪些变化需要新的特化

以下讨论常规、固定 shape 的 `jit`。shape polymorphism 等机制有额外规则，不据此推断普通数组参数可任意改变形状。

| 调用变化 | 常见影响 | 推理例子 |
| --- | --- | --- |
| shape、dtype 不变，只改动态数组值 | 可复用兼容程序 | 新 token、更新后的 KV 内容、另一组同规格权重 |
| shape 或 dtype 改变 | 可能需要新的 tracing 与编译版本 | batch、cache 容量或精度改变 |
| `static_argnames` 指定的值改变 | 为新静态配置特化；已有兼容版本可复用 | `mode="sum"` 改为 `"mean"` |
| PyTree 结构或静态元数据改变 | 输入契约改变 | 字典增减字段、`None` 改为数组 |
| 重新创建函数对象 | 可能失去原函数的缓存复用 | 循环内反复构造 lambda 或包装器 |

这张表不是完整 cache key。weak type、sharding、设备后端、编译选项与 JAX 配置等也可能影响复用。JAX 有多个缓存层；一次重新 tracing 不必等价于重新完成所有后端编译，进程内缓存和持久化编译缓存也有不同生命周期。

闭包与全局变量尤其需要谨慎：tracing 可以读取它们，后续修改不保证触发失效检查，可能继续使用旧值。变化的数据应作为显式动态参数；配置应不可变。避免靠更改外部状态来控制已经编译的函数。

## CPU 实验：同形状不同值

下面是可独立运行的脚本。`mode` 决定 Python 分支，因此显式标为 static；数组元素作为动态数据传入。

```python
from functools import partial

import jax
import jax.numpy as jnp

jax.config.update("jax_platforms", "cpu")


@partial(jax.jit, static_argnames=("mode",))
def aggregate(values, mode):
    print("trace", values.shape, values.dtype, mode)
    if mode == "sum":
        return jnp.sum(values)
    return jnp.mean(values)


small = jnp.arange(4, dtype=jnp.float32)
large = jnp.arange(8, dtype=jnp.float32)
calls = [
    (small, "sum"),
    (small + 10, "sum"),
    (large, "sum"),
    (large, "mean"),
    (small, "sum"),
]
for values, mode in calls:
    result = aggregate(values, mode=mode)
    print("result", float(result.block_until_ready()))
```

在新进程、无其他配置变化的这个例子中，五次结果应为 `6.0`、`46.0`、`28.0`、`3.5`、`6.0`，目标函数通常打印三次 `trace`。第二次只换值，第五次回到已有特化；二者仍会执行计算。`print` 只是教学观察点，不能据它统计真实 kernel 数或完整编译次数。

去掉 `static_argnames` 后，字符串 `mode` 不再是默认可接受的动态数组参数。若条件来自运行时数组值，也不能用普通 Python `if` 读取 tracer 的真假；应按语义使用 [JAX 控制流](jax-control-flow-diffusion.md)中的 `lax.cond` 等操作。

下面只模拟三种签名，便于观察命中与未命中的路径。初始缓存为空；选择同一场景再次执行可以复用刚建立的模拟版本。

<iframe src="../assets/jax/jit-cache.html" title="JAX JIT 特化与缓存教学动画" loading="lazy" style="display:block;width:100%;height:540px;border:0;border-radius:16px;margin:1rem 0;"></iframe>

[单独打开缓存动画](assets/jax/jit-cache.html)

## 显式观察编译阶段

将下面代码接在实验脚本后。`ShapeDtypeStruct` 描述抽象输入，无须为了 lowering 分配同样大小的真实数组。

```python
abstract_input = jax.ShapeDtypeStruct((4,), jnp.float32)
print(jax.make_jaxpr(aggregate, static_argnums=(1,))(abstract_input, "sum"))
lowered = aggregate.lower(abstract_input, mode="sum")
print(lowered.compiler_ir(dialect="stablehlo"))
compiled = lowered.compile()
print(float(compiled(small).block_until_ready()))
```

`make_jaxpr` 观察 JAX 中间表示，`lower` 暴露 lowering 结果，`compile` 返回目标可执行对象。这里编译时已经固定 `mode="sum"`，调用 `compiled` 只传动态数组；不能再向它传入另一种 mode 或任意 shape。IR 文本、优化决策和分析接口的输出会随版本与后端变化。

两段示例已在 JAX / jaxlib `0.12.0.1` 的 CPU 后端验证。合并保存为脚本后，可用 `uv run --with jax==0.12.0.1 python example.py` 运行；这些输出只验证语义与编译阶段，不代表 GPU 性能。

## DiffusionGemma 的 JIT 边界

代码固定到 Google DeepMind Gemma commit [`9e1f741`](https://github.com/google-deepmind/gemma/tree/9e1f74131ba9d45e5fe6ae7bb3941d9f2abb39c3)。[`DiffusionSampler`](https://github.com/google-deepmind/gemma/blob/9e1f74131ba9d45e5fe6ae7bb3941d9f2abb39c3/gemma/diffusion/_sampler.py#L321-L347) 是 `frozen=True` 的 dataclass，保存 canvas 长度、最大去噪步数和采样策略等配置。

其 [`_sample_step`](https://github.com/google-deepmind/gemma/blob/9e1f74131ba9d45e5fe6ae7bb3941d9f2abb39c3/gemma/diffusion/_sampler.py#L502-L557) 具有以下 JIT 装饰器，省略了源码的类型检查装饰器与返回类型：

```python
@functools.partial(jax.jit, static_argnames=("self",))
def _sample_step(self, state, *, params):
    ...
```

| 源码对象 | 在这个边界上的角色 | 阅读含义 |
| --- | --- | --- |
| `self` | 静态采样器配置 | tracing 可以读取 canvas 长度、最大步数与策略 |
| `state` | 含数组的运行时状态 | cache、RNG、done、位置等内容随请求更新 |
| `params` | 模型参数 PyTree | 数组叶子可以动态传入；结构和叶子规格仍影响特化 |
| `sample_next_canvas` | 内部完成一块 canvas 的去噪 | `_sample_step` 不是单次 denoiser forward |
| `append_tokens_to_cache` | 接在 canvas 完成之后 | 更新后续块所需的 prefix cache |

静态参数必须具有稳定的 hash / equality，且语义上不可变。`frozen=True` 不会递归冻结所有内部对象；也不能把含可变数组、以对象身份散列的任意 `self` 直接照搬成静态参数。可变张量应通过 PyTree 动态叶子传入，少量不可变配置才适合作静态元数据。

[`sample_next_canvas`](https://github.com/google-deepmind/gemma/blob/9e1f74131ba9d45e5fe6ae7bb3941d9f2abb39c3/gemma/diffusion/_sampler.py#L430-L500) 内部使用 `lax.while_loop`。请求因 early stopping 执行不同轮数，可以运行同一份程序；轮数变化本身不等于重编译。若改变的是采样器静态配置、batch 或 cache shape，则需重新检查兼容性。

普通 Python 方法即使没有单独的 `jit` 装饰器，也可以在外层 JIT tracing 时被调用，其数组操作进入外层程序。阅读源码时应沿调用边界追踪，不能只数 `@jax.jit` 的个数。

## 对延迟测量的影响

冷启动需要分别记录 tracing / 编译和首次执行，稳定请求延迟则应在对应 shape、dtype、静态配置都预热后测量。持续出现新特化会影响尾延迟，不能只预热一个 batch 后把其他规格的冷编译混入吞吐统计。

计时前后还需考虑 JAX 的异步派发；本例显式等待结果，只验证数值。用 `jax.log_compiles` 可辅助定位编译活动，但日志可能同时包含数组构造等其他操作，不能把每条日志都当成模型重新编译。进一步分析见 [JAX 性能测量、XLA 与融合](jax-profiling-xla-fusion.md)。

## 来源

- [JAX JIT compilation](https://docs.jax.dev/en/latest/jit-compilation.html)：tracing、静态参数与函数缓存。
- [jax.jit API](https://docs.jax.dev/en/latest/_autosummary/jax.jit.html)：静态参数的 hash / equality、输入与 sharding 约束。
- [Ahead-of-time lowering and compilation](https://docs.jax.dev/en/latest/aot.html)：显式分离 tracing、lowering、编译和执行。
- [JAX FAQ](https://docs.jax.dev/en/latest/faq.html)：方法、状态与 JIT 行为。
