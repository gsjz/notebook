# JAX 控制流与扩散采样状态

扩散推理需要重复执行前向、采样和停止判断。JAX 的关键问题是：哪些决定在 Python tracing 时完成，哪些决定由运行时数组控制，以及每轮状态能否保持编译要求的结构。

前置内容：[数组、PyTree 与随机数](jax-arrays-pytrees-random.md)、[JIT 编译边界](jax-jit-compilation.md)。模型背景见 [扩散语言模型的推理执行](diffusion-language-model-inference.md)。

## Python 分支与数组谓词

`jax.jit` tracing 时，数组参数通常以 tracer 表示。它记录 shape、dtype 和计算关系，Python 此时拿不到运行时布尔值。

```python
@jax.jit
def invalid_branch(value):
    if value > 0:
        return value + 1
    return value - 1
```

对动态标量调用这个函数，Python `if` 尝试把 tracer 转成 `bool`，产生 `TracerBoolConversionError`。类似地，Python `and`、`or`、`not` 也会要求 Python 真值。数组逻辑使用 `jnp.logical_and`、`jnp.logical_or` 或带正确括号的数组运算符。

| 写法 | 决策发生在哪里 | 是否表达跳过一段计算 |
| --- | --- | --- |
| Python `if` + 静态配置 | tracing 时 | 只追踪所选路径；配置变化可能重编译 |
| `lax.cond(pred, true_fn, false_fn, operand)` | 运行时标量谓词 | 通常只执行所选分支，但两支都会被追踪 |
| `jnp.where(mask, candidate, previous)` | 数组逐元素选择 | 选择已表达的两个结果，不保证省掉其生产计算 |

`lax.cond` 两支输出必须具有一致的 PyTree 结构、shape 和 dtype。`vmap` 作用于批次谓词时，`cond` 会转为 select 形式；不能把它理解成每个样本独立省下一次完整前向。编译器可能改写表达式，最终执行路径还要检查 HLO 与性能轨迹。

## 循环 carry 的约束

`lax.while_loop(condition, body, initial)` 将循环表达为 JAX 控制流 primitive。条件返回一个标量布尔值；`body` 接收上一轮 carry，返回下一轮 carry。

循环每一轮必须保留相同的 PyTree 结构，且对应 leaf 的 shape 与 dtype 不变。Python 列表不断追加 token、随活跃样本数量缩小 batch、把布尔数组改成 `None`，都不符合这个接口。可预分配固定容量数组，再用计数与掩码表示有效部分。

<svg viewBox="0 0 880 270" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="固定结构的 carry 穿过每轮前向，prefix KV cache 保持只读，循环根据整批完成状态与步数预算退出" style="display:block;width:100%;height:auto;margin:1rem 0;background:#fff;border-radius:12px" font-family="system-ui,sans-serif">
  <defs><marker id="jax-carry-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7" fill="#8b849b"/></marker></defs>
  <rect x="22" y="26" width="210" height="176" rx="12" fill="#fafafa" stroke="#e5e7eb"/>
  <text x="40" y="57" fill="#374151" font-size="17" font-weight="600">carry：固定结构</text>
  <g fill="#6b7280" font-size="14"><text x="40" y="88">step · canvas · done</text><text x="40" y="115">self-conditioning · RNG</text><text x="40" y="165">每轮只更新数组的值</text><text x="40" y="186">shape / dtype 保持一致</text></g>
  <rect x="282" y="26" width="310" height="48" rx="10" fill="#fafafa" stroke="#e5e7eb"/><text x="437" y="56" fill="#6b7280" font-size="15" text-anchor="middle">prefix KV cache：循环内只读</text>
  <rect x="282" y="108" width="310" height="94" rx="12" fill="#f0eef8" stroke="#d8d2e2"/><text x="437" y="139" fill="#62578a" font-size="17" text-anchor="middle" font-weight="600">整批 Attention → FFN → 采样</text><text x="437" y="171" fill="#62578a" font-size="14" text-anchor="middle">停止判断 · 冻结旧 done 项的 canvas</text>
  <rect x="642" y="108" width="216" height="94" rx="12" fill="#fafafa" stroke="#e5e7eb"/><text x="750" y="139" fill="#374151" font-size="16" text-anchor="middle">下一轮 carry</text><text x="750" y="169" fill="#6b7280" font-size="14" text-anchor="middle">计数、SC、RNG 继续更新</text>
  <g fill="none" stroke="#8b849b" stroke-width="1.5" marker-end="url(#jax-carry-arrow)"><path d="M232 151 H278"/><path d="M437 74 V104"/><path d="M592 151 H638"/><path d="M750 202 V239 H125 V206"/></g>
  <rect x="237" y="223" width="408" height="31" rx="8" fill="#fff"/><text x="441" y="244" fill="#6b7280" font-size="14" text-anchor="middle">未全部完成，并且仍有步数预算 → 继续</text>
</svg>

`while_loop` 通常避免 Python 循环被大规模展开；它并不承诺整个 body 被融合成一个 kernel。JAX/XLA 控制流也不等同于手写 CUDA conditional WHILE Graph，后者有独立的图构建 API、状态协议与设备约束，见 [CUDA Graph 与设备侧循环](cuda-graphs-device-loop.md)。

## DiffusionGemma 的代码路径

以下基于公开仓库固定提交 [`9e1f741`](https://github.com/google-deepmind/gemma/blob/9e1f74131ba9d45e5fe6ae7bb3941d9f2abb39c3/gemma/diffusion/_sampler.py)。名称相近的两个函数处于不同层级：

| 代码位置 | 作用 |
| --- | --- |
| [`_WhileLoopCarry`，208 行](https://github.com/google-deepmind/gemma/blob/9e1f74131ba9d45e5fe6ae7bb3941d9f2abb39c3/gemma/diffusion/_sampler.py#L208) | 保存 `step`、`canvas`、`sc_embeddings`、`rng`、`done` |
| [`sample_next_canvas` 内部，435 行](https://github.com/google-deepmind/gemma/blob/9e1f74131ba9d45e5fe6ae7bb3941d9f2abb39c3/gemma/diffusion/_sampler.py#L435) | 用 `lax.while_loop` 完成一个 canvas 的多轮去噪 |
| [`sample_step`，558 行](https://github.com/google-deepmind/gemma/blob/9e1f74131ba9d45e5fe6ae7bb3941d9f2abb39c3/gemma/diffusion/_sampler.py#L558) | 一轮去噪：模型前向、采样、生成下一轮自条件 |
| [`_sample_step`，504 行](https://github.com/google-deepmind/gemma/blob/9e1f74131ba9d45e5fe6ae7bb3941d9f2abb39c3/gemma/diffusion/_sampler.py#L504) | 完成整个 canvas，处理停止 token，追加 KV cache，并更新输出状态 |

`_sample_step` 由 `jax.jit(static_argnames=('self',))` 包装。`sample_step` 内部的 `model.apply` 是 Flax 的函数式模型调用接口；它不是名为 apply 的 JAX 控制流 primitive。

### 整批退出与已完成项

循环条件是 `(~jnp.all(carry.done)) & (carry.step < max_denoising_steps)`。`done` 是每个样本的标志，退出条件却是整个 batch 共用的标量；只要有未完成项且预算未耗尽，就继续执行 body。

body 先对整批调用 `sample_step`，再计算 `new_done`。冻结 canvas 的关键表达式是：

```python
canvas = jnp.where(carry.done[:, None], carry.canvas, out.sampled_tokens)
```

这里读取**旧的 `carry.done`**。某个样本在本轮首次满足停止条件时，仍应接收本轮生成的 canvas；下一轮才冻结它。若换成 `new_done`，该样本会错误地保留上一轮画布。

冻结是输出状态的选择，不是移除 batch 行。该源码的前向已经在 `jnp.where` 之前发生；已完成项在后续轮仍经过 Attention、FFN 和采样。自条件也继续更新，源码不冻结 `sc_embeddings`，因为这些项之后产生的新 canvas 会被丢弃。要真正跳过完成项，需要另行设计压缩、分桶或支持掩码的执行路径，并验证重排成本与 shape 管理。

### RNG、精度与 prefix

每轮执行 `next_rng, sample_rng = jax.random.split(carry.rng)`：本轮消费 `sample_rng`，carry 保存 `next_rng`。随机 key 属于显式状态；重复使用同一个 key 会复用随机序列。

初始自条件使用 BF16。返回 carry 时执行 `out.sc_embeddings.astype(carry.sc_embeddings.dtype)`，保证 leaf 的 dtype 不因内部计算精度变化而改变。这个 cast 保护循环接口，并不意味着模型的所有中间结果都使用 BF16。

prefix cache 由外层闭包传给每轮 `sample_step`，去噪期间只读。`_sample_step` 在整个 canvas 完成后才调用 `append_tokens_to_cache`。本页讨论的内层 `carry.done` 也应与外层遇到终止 token 的 `state.done` 区分。

## CPU 上运行一个最小循环

下例只依赖 JAX，已在 JAX / jaxlib `0.12.0.1` 的 CPU 后端验证。两个样本分别在第 $2$、$4$ 轮完成；每轮把画布加一，用随机数更新教学自条件。它模拟状态协议，不模拟模型概率、真实停止判据或 Attention / FFN。

```python
from typing import NamedTuple

import jax
import jax.numpy as jnp


class Carry(NamedTuple):
    step: jax.Array
    canvas: jax.Array
    sc: jax.Array
    rng: jax.Array
    done: jax.Array
    evaluated_rows: jax.Array


@jax.jit
def run_loop(max_steps):
    finish_rounds = jnp.array([2, 4], dtype=jnp.int32)
    initial = Carry(
        jnp.int32(0),
        jnp.zeros((2, 3), dtype=jnp.int32),
        jnp.zeros((2, 3, 1), dtype=jnp.bfloat16),
        jax.random.key(7),
        jnp.zeros((2,), dtype=jnp.bool_),
        jnp.zeros((2,), dtype=jnp.int32),
    )

    def condition(carry):
        return (~jnp.all(carry.done)) & (carry.step < max_steps)

    def advance(carry):
        next_rng, sample_rng = jax.random.split(carry.rng)
        candidate = carry.canvas + jnp.int32(1)
        noise = jax.random.uniform(sample_rng, carry.sc.shape)
        next_sc = carry.sc.astype(jnp.float32) + noise + 1.0
        next_step = carry.step + jnp.int32(1)
        next_done = carry.done | (next_step >= finish_rounds)
        return Carry(
            next_step,
            jnp.where(carry.done[:, None], carry.canvas, candidate),
            next_sc.astype(carry.sc.dtype),
            next_rng,
            next_done,
            carry.evaluated_rows + jnp.int32(1),
        )

    return jax.lax.while_loop(condition, advance, initial)


result = jax.device_get(run_loop(jnp.int32(6)))
print(int(result.step))
print(result.canvas.tolist())
print(result.done.tolist())
print(result.evaluated_rows.tolist())
```

预期输出为 `4`、`[[2, 2, 2], [4, 4, 4]]`、`[True, True]`、`[4, 4]`。第一个样本的画布停在 $2$，但两个样本都参与了四轮教学更新；真实执行成本需另行测量。将上限改成 `3`，最终 `done` 为 `[True, False]`，说明预算耗尽也能结束循环。

<iframe src="../assets/jax/denoising-carry.html" title="整批循环中的 canvas 冻结与 carry 更新" loading="lazy" style="display:block;width:100%;height:580px;border:0;border-radius:16px;margin:1rem 0;"></iframe>

[单独打开状态演示](assets/jax/denoising-carry.html)

## 从控制流到性能分析

先明确实际执行轮数与 batch 有效项，再判断耗时来源。上述例子完整执行四轮；把第一行 canvas 冻结不等于把它的两轮前向省掉。实际 batch 内完成时间差越大，越需要检查尾部阶段的无效计算与设备利用率。

固定预算的实验可以考虑 `lax.scan`，它适合已知迭代长度并可收集逐轮输出；若每轮只用 `where` 屏蔽完成项，仍不自动减少计算。它属于另一个实现选择，官方这份 sampler 使用的是 `while_loop`，没有使用 `scan` 或 `lax.cond`，也未在此文件配置 sharding。

`jax.make_jaxpr` 可以检查是否保留了循环 primitive；HLO 与实际 profiler 轨迹才能继续回答循环体是否融合、如何调度、有无同步等待。测量时在需要读取结果的边界等待设备完成，见 [JAX profiling 与 XLA fusion](jax-profiling-xla-fusion.md)。

## 资料

- [JAX：Control flow and logical operators](https://docs.jax.dev/en/latest/control-flow.html)
- [JAX：lax.while_loop](https://docs.jax.dev/en/latest/_autosummary/jax.lax.while_loop.html)
- [JAX：lax.cond](https://docs.jax.dev/en/latest/_autosummary/jax.lax.cond.html)
- [JAX：jnp.where](https://docs.jax.dev/en/latest/_autosummary/jax.numpy.where.html)
- [Gemma：Diffusion sampler 固定源码](https://github.com/google-deepmind/gemma/blob/9e1f74131ba9d45e5fe6ae7bb3941d9f2abb39c3/gemma/diffusion/_sampler.py)
