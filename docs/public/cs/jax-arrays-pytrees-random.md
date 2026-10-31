# JAX 数组、PyTree 与随机状态

JAX 用接近 NumPy 的数组表达计算，并通过函数变换完成编译、自动微分或批处理。阅读 DiffusionGemma 官方实现时，先需要理解数组形状、参数与状态的组织，以及随机数怎样沿循环传递。

本文从可独立运行的小例子开始；编译行为见 [JIT 与 tracing](jax-jit-compilation.md)，多轮去噪见 [JAX 控制流与 DiffusionGemma](jax-control-flow-diffusion.md)。

## 数组的形状与类型

JAX 数组的常见操作与 NumPy 相近，但设备放置、执行时机和默认精度需要单独确认。设 batch 为 $B$、canvas 长度为 $C$、词表大小为 $V$、hidden 维度为 $D$：

| 对象 | 形状 | 常见操作 |
| --- | --- | --- |
| token 编号 | $[B,C]$ | embedding lookup、采样、位置更新 |
| logits / 概率 | $[B,C,V]$ | 词表维度上的 softmax、argmax、熵 |
| soft embedding | $[B,C,D]$ | 概率与 embedding 矩阵相乘 |
| 每样本完成标志 | $[B]$ | 归约为整体停止条件，或广播到 token 维 |

下面沿词表维度归一化并选择概率最大的 token 编号，再用每个样本的完成标志选择是否保留旧 canvas：

```python title="数组与广播：可独立运行"
import jax
import jax.numpy as jnp

logits = jnp.arange(24, dtype=jnp.float32).reshape(2, 3, 4)
probabilities = jax.nn.softmax(logits, axis=-1)
token_ids = jnp.argmax(probabilities, axis=-1)
done = jnp.array([True, False])
previous_canvas = jnp.zeros((2, 3), dtype=jnp.int32)
canvas = jnp.where(done[:, None], previous_canvas, token_ids)

assert probabilities.shape == (2, 3, 4)
assert canvas.shape == (2, 3)
assert bool(jnp.allclose(probabilities.sum(axis=-1), 1.0))
```

`done[:, None]` 的形状是 $[B,1]$，沿 canvas 维广播。`where` 选择旧值并不证明新预测的计算被省略；这会直接影响提前停止的性能分析。

JAX 默认通常关闭 64 位类型支持；例如默认浮点数组常为 FP32，与 NumPy 常用的 FP64 不同。比较精度时显式记录 dtype、`jax_enable_x64`、后端与矩阵乘精度配置，不能只对照 API 名称。相关格式见 [精度编码](precision-encoding.md)。

## 函数式更新与 buffer

普通 JAX 数组不支持 `array[index] = value` 这种原地赋值语义。使用 `.at[index].set(value)` 得到更新后的数组：

```python title="索引更新：可独立运行"
import jax.numpy as jnp

original = jnp.array([10, 20, 30], dtype=jnp.int32)
updated = original.at[1].set(99)

assert original.tolist() == [10, 20, 30]
assert updated.tolist() == [10, 99, 30]
```

这是程序的值语义。实际编译器可以在满足条件时复用存储，不能从这段写法推断每次必然复制整个数组。buffer donation 是另一个显式协议：调用者允许编译器复用某些输入存储后，就不能继续依赖被捐赠的旧 buffer；它也不保证所有输入都能被复用。

与之相关的纯函数习惯是：把参数和状态作为输入，把输出和新状态作为返回值。依赖全局变量或 Python 对象的隐式修改，可能在 tracing 时执行一次，并在后续编译调用中不再发生。

## PyTree：结构与数组叶子

PyTree 是嵌套容器的一套组织规则。字典、列表和元组可以组合成树；数组通常位于叶子。函数变换根据树结构处理叶子，不需要把模型全部参数拼成一个大数组。

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 210" role="img" aria-label="循环状态PyTree由结构和数组叶子组成，函数显式返回新状态" style="display:block;width:100%;height:auto;background:#fff;border-radius:12px;margin:1rem 0" font-family="system-ui,sans-serif">
  <defs><marker id="jax-state-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="#9ca3af"/></marker></defs>
  <rect x="16" y="35" width="250" height="140" rx="10" fill="#fafafa" stroke="#e5e7eb"/>
  <rect x="336" y="65" width="224" height="80" rx="10" fill="#f0eef8" stroke="#d8d2e2"/>
  <rect x="630" y="35" width="250" height="140" rx="10" fill="#fafafa" stroke="#e5e7eb"/>
  <g fill="#374151" font-size="16" text-anchor="middle"><text x="141" y="64">输入 carry</text><text x="448" y="100" fill="#62578a">step(params, carry)</text><text x="755" y="64">返回新 carry</text></g>
  <g fill="#6b7280" font-size="13" text-anchor="middle"><text x="141" y="96">canvas · self-conditioning</text><text x="141" y="122">step · done · rng</text><text x="141" y="151">PyTree 结构 + 数组叶子</text><text x="448" y="124">显式计算与状态转换</text><text x="755" y="96">新的预测与软信号</text><text x="755" y="122">新计数 · 完成标志 · key</text><text x="755" y="151">循环结构、shape、dtype 稳定</text></g>
  <g stroke="#9ca3af" stroke-width="1.5" marker-end="url(#jax-state-arrow)"><path d="M266 105H330"/><path d="M560 105H624"/></g>
</svg>

```python title="拆分并重建 PyTree：可独立运行"
import jax
import jax.numpy as jnp

state = {
    "canvas": jnp.zeros((1, 3), dtype=jnp.int32),
    "sc": jnp.zeros((1, 3, 2), dtype=jnp.float32),
    "step": jnp.array(0, dtype=jnp.int32),
}
leaves, structure = jax.tree.flatten(state)
restored = jax.tree.unflatten(structure, leaves)
description = jax.tree.map(lambda leaf: (leaf.shape, str(leaf.dtype)), state)

assert len(leaves) == 3
assert restored["canvas"].shape == (1, 3)
print(description)
```

`structure` 记录容器关系；叶子保存具体值。重建树不意味着深复制底层设备数组。一般 dataclass 需要注册，或借助支持 PyTree 的框架类型；不能因为字段都是数组，就假设任意类能直接传入 `jit`。

模型配置、字符串和数组叶子的角色也不同。将某些字段作为静态元数据，是编译协议的一部分；它们需要满足相应的不可变性与比较要求，详见 [静态参数与编译缓存](jax-jit-compilation.md)。

## 随机 key 也是输入

JAX 随机 API 显式接收 key。对同一个 key 使用相同随机操作和参数，在相同实现与后端条件下会得到相同结果；调用不会隐式推进该 key。调用者应拆分 key，为不同随机用途和后续轮次提供新 key。

```python title="拆分采样与后续状态：可独立运行"
import jax
import jax.numpy as jnp

initial_key = jax.random.key(7)
next_key, sample_key = jax.random.split(initial_key)
sample = jax.random.uniform(sample_key, shape=(4,))
repeated = jax.random.uniform(sample_key, shape=(4,))
following_key, following_sample_key = jax.random.split(next_key)
following = jax.random.uniform(following_sample_key, shape=(4,))

assert bool(jnp.array_equal(sample, repeated))
print(sample, following)
```

拆分出的 key 不应在不相关的随机操作中反复使用。不同 key 允许新的随机抽样，但不保证两次抽样结果必定不同；离散 token 相同也不能反过来证明 key 被复用。

`jax.random.key` 返回带随机实现类型的 key 数组。旧接口 `PRNGKey` 返回普通整数数组表示，两者不应仅凭打印形状混用。不要将跨后端、跨版本、向量化前后完全相同的随机轨迹视为默认保证。

<iframe src="../assets/jax/random-state.html" title="JAX 随机 key 与循环状态交互" loading="lazy" style="display:block;width:100%;height:600px;border:0;border-radius:16px;margin:1rem 0;"></iframe>

[单独打开随机状态演示](assets/jax/random-state.html)

动画用符号标识 key 与采样调用，演示把新 key 写回 carry 和误用旧 key 的区别。它不运行 JAX，也不生成真实随机样本。

## 官方 sampler 中的对应位置

以下固定到 Gemma commit [`9e1f7413`](https://github.com/google-deepmind/gemma/tree/9e1f74131ba9d45e5fe6ae7bb3941d9f2abb39c3)。

| 源码位置 | 数据关系 | 阅读重点 |
| --- | --- | --- |
| [`_sampler.py` 的熵预算与 scatter](https://github.com/google-deepmind/gemma/blob/9e1f74131ba9d45e5fe6ae7bb3941d9f2abb39c3/gemma/diffusion/_sampler.py#L145-L184) | 熵排序 → 累计预算 → `.at[…].set()` 回原位置 | 位置排序后的 mask 要恢复 canvas 顺序；这里选择的是 token 位置 |
| [`SampleStepOutput` 与 `_WhileLoopCarry`](https://github.com/google-deepmind/gemma/blob/9e1f74131ba9d45e5fe6ae7bb3941d9f2abb39c3/gemma/diffusion/_sampler.py#L189-L216) | `flax.struct.dataclass` 注册状态结构 | 循环显式携带 canvas、自条件、step、done、rng |
| [`body_fn` 中的 key 拆分](https://github.com/google-deepmind/gemma/blob/9e1f74131ba9d45e5fe6ae7bb3941d9f2abb39c3/gemma/diffusion/_sampler.py#L441-L485) | 当前 key → 本轮 sample key + 下一轮 key | 返回 carry 必须使用 `next_rng` |
| [`sample_step` 的 `model.apply`](https://github.com/google-deepmind/gemma/blob/9e1f74131ba9d45e5fe6ae7bb3941d9f2abb39c3/gemma/diffusion/_sampler.py#L577-L607) | `{'params': params}` + 输入状态 → 模型输出 | 参数通过 Flax variables 传入，自条件编码是另一处方法调用 |

`model.apply` 中的参数集合与模型实例配置是两类对象。不能把训练中更新的模型权重藏进静态配置，也不能把“状态不可变”的编程语义理解成权重或缓存永远不能更新。

源码还用 `vmap` 对 batch 的 noise schedule 做向量化。`vmap` 表达批处理变换，不直接安排多个 GPU；设备分片与 collective 属于后续的分布式执行问题。

## 学习与验证边界

本文四段独立示例已在 JAX / jaxlib `0.12.0.1` 的 CPU 后端执行验证。先用小数组验证 shape、更新、树结构和随机 key 协议，再进入 [编译](jax-jit-compilation.md) 与 [循环](jax-control-flow-diffusion.md)。CPU 可以验证这些语义；GPU 延迟、融合与内存行为需在目标平台观察，方法见 [JAX 性能分析](jax-profiling-xla-fusion.md)。

## 来源

- [JAX PyTrees](https://docs.jax.dev/en/latest/pytrees.html)
- [JAX Random numbers](https://docs.jax.dev/en/latest/random-numbers.html)
- [JAX Common Gotchas](https://docs.jax.dev/en/latest/notebooks/Common_Gotchas_in_JAX.html)
- [Flax struct](https://flax.readthedocs.io/en/latest/api_reference/flax.struct.html)
- [Gemma diffusion sampler 固定版本](https://github.com/google-deepmind/gemma/blob/9e1f74131ba9d45e5fe6ae7bb3941d9f2abb39c3/gemma/diffusion/_sampler.py)
