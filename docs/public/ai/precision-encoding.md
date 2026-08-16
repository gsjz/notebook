# 精度编码基础

其实编码这个本质上和我在 `c++` 里接触到的编码方式没有什么区别，只是在工程上对精度做了更进一步的取舍。比如会假设相近的 `N` 个元素它们的规模相近，我们把它当成一个块，用一个统一的数来表示这个块内的数据规模，然后把这 `N` 个元素压小到这个规模下的一个范围内。我们还可以套娃地再认为相近的 `M` 个小块之间可以被当成一个大块，重复地做这个取舍。

下面具体地介绍它们的定义。

## 浮点格式

浮点数把一个值拆成符号、指数和尾数字段。更一般地，可以把有限非零浮点数写成：

$$
x = (-1)^s \times 2^E \times c
$$

其中 $c$ 是有效数。对 IEEE 754 风格的规格化数，$c = 1 + m$；对非规格化数和零，前导 1 不存在。指数位数主要影响动态范围，尾数字段主要影响同一数量级内的分辨率。`E4M3`、`E5M2` 这类写法就是在说明指数和尾数字段的位数。

### 记号定义

| 记号 | 含义 |
| --- | --- |
| `FP` | `Floating Point`，浮点数。`FP32`、`FP16`、`FP8`、`FP4` 里的数字表示总位宽。 |
| `BF` | `Brain Floating Point`。`BF16` 也写作 `bfloat16`，总位宽是 16 bit。 |
| `E` | `Exponent`，指数位数。 |
| `M` | `Mantissa`，尾数字段位数；在 IEEE 754 语境里也常叫 fraction/significand field。 |
| `E4M3` | 4 个指数位、3 个尾数字段位；再加 1 个符号位，总共 8 bit。 |
| `E5M2` | 5 个指数位、2 个尾数字段位；再加 1 个符号位，总共 8 bit。 |
| `E2M1` | 2 个指数位、1 个尾数字段位；再加 1 个符号位，总共 4 bit。 |

公式里的 $s$ 是符号位，$E$ 是解码后的指数，$c$ 是有效数。若使用指数编码 $e$ 和指数偏置 $\mathrm{bias}$，IEEE 754 风格规格化数通常有：

$$
E = e - \mathrm{bias}, \qquad c = 1 + m
$$

这里的 $m$ 是尾数字段表示出来的小数部分。这个前导 1 不显式存储，所以尾数字段位数和有效精度不是完全同一个概念。

非规格化数没有隐含前导 1，常见形式是：

$$
E = 1 - \mathrm{bias}, \qquad c = m
$$

零、`NaN`、`Inf` 以及一些有限值专用的低比特格式，还要按具体格式的编码表解释，不能只套 $1 + m$。

### FP32：常见 `float` 基准

**标准定义**

- `FP32` 通常指 IEEE 754 `binary32`。
- 位布局是 1 个符号位、8 个指数位、23 个尾数字段位。
- 规格化数还有一个隐含前导 1，所以有效尾数精度通常按 24 bit 理解。
- `C++ float` 在 x86、ARM、CUDA 等常见平台上通常就是 `FP32`；严格说，C++ 标准本身没有强制所有平台都必须使用 IEEE 754 `binary32`。

**设计动机**

- 作为通用浮点格式，`FP32` 在范围、精度和性能之间比较平衡。
- 在 AI 系统里，`FP32` 常被用作数值基准：校验低精度误差、保存部分敏感参数、做高精度累加或统计。

### 16-bit 浮点：FP16 与 BF16

**标准定义**

| 格式 | 常用名称 | 位布局 | 定位 |
| --- | --- | --- | --- |
| `FP16` | `float16` / IEEE 754 `binary16` | 1 符号位 + 5 指数位 + 10 尾数字段位 | 尾数更细，指数范围更窄 |
| `BF16` | `bfloat16` / `Brain Floating Point 16` | 1 符号位 + 8 指数位 + 7 尾数字段位 | 指数范围接近 `FP32`，尾数更粗 |

`BF16` 保留了和 `FP32` 一样宽的指数部分，只减少尾数字段，因此从 `FP32` 转到 `BF16` 时主要损失小数精度，而不是大幅缩小可表示范围。

**设计动机**

- `FP16` 的尾数字段比 `BF16` 长，局部数值分辨率更高；代价是指数位少，更容易遇到溢出或下溢。
- `BF16` 的尾数字段短，但指数范围接近 `FP32`；训练和推理里很多张量更容易先被范围问题影响，所以 `BF16` 常用于更稳的混合精度路径。
- 二者都仍然是浮点格式，不需要像 INT 量化那样引入 `zero point`。

### 8-bit 浮点：FP8

**标准定义**

`FP8` 不是单一格式。AI 系统里常见的是两类：

| 格式 | 位布局 | 侧重点 |
| --- | --- | --- |
| `E4M3` | 1 符号位 + 4 指数位 + 3 尾数字段位 | 精度相对更细 |
| `E5M2` | 1 符号位 + 5 指数位 + 2 尾数字段位 | 范围相对更大 |

在 PyTorch 里，对应常见 dtype 包括 `torch.float8_e4m3fn` 和 `torch.float8_e5m2`。这些 dtype 描述的是单个元素的存储格式，实际训练或推理还要维护 tensor 级或 block 级的缩放信息。

**设计动机**

- 把激活、权重或梯度从 16 bit 降到 8 bit，减少显存占用和内存带宽压力。
- 配合 GPU Tensor Core 或其他矩阵计算单元，提高矩阵乘和 attention 的吞吐。
- 由于 8 bit 浮点的范围和精度都有限，实际系统通常需要 `amax` 统计、scale 更新、敏感层回退和高精度累加。

### 4-bit 浮点：FP4

**标准定义**

`FP4` 也不是单一格式。NVIDIA `NVFP4` 里使用的元素格式是 `E2M1`：

- 1 个符号位
- 2 个指数位
- 1 个尾数字段位

按 `[S][EE][M]` 的 bit 顺序，`E2M1` 里零的编码是 `S 00 0`。也就是 `0000` 表示 `+0`，`1000` 表示 `-0`；数值计算时二者都表示 0。

`E2M1` 能表示的离散值非常少，典型集合可以写成：

$$
\{0, \pm 0.5, \pm 1, \pm 1.5, \pm 2, \pm 3, \pm 4, \pm 6\}
$$

**设计动机**

- 4 bit 能进一步降低模型权重、激活和梯度的搬运成本。
- 单个 `E2M1` 值的动态范围和分辨率都很有限，因此 FP4 通常必须和 block scale、全局 scale、特殊舍入策略一起使用。

## 整数量化格式

### INT8 / INT4

**标准定义**

INT 量化不使用指数和尾数字段，而是把真实值映射到一个整数区间。常见的仿射量化形式是：

$$
x \approx s \cdot (q - z)
$$

其中 $x$ 是原始浮点值，$q$ 是整数编码，$s$ 是缩放因子，$z$ 是零点。对称量化会把 $z$ 固定为 0，此时公式变成：

$$
x \approx s \cdot q
$$

这可以理解为：先选定一组数值规模接近的元素，再用一个固定步长 $s$ 在这段范围里铺开均匀格点。每个原始浮点值 $x$ 会被舍入到最近的格点上，并保存对应的整数编号 $q$。

例如对称 `INT4` 的整数范围可以是 $[-8, 7]$。如果某个 block 里的绝对值最大值接近 7，取 $s = 1$ 时，这个 block 里的值会被压到：

$$
\{-8, -7, \ldots, 0, \ldots, 6, 7\}
$$

如果另一个 block 的值都在 $[-0.7, 0.7]$ 附近，就可以取更小的 $s$，让这些小数值也落到更密的有效格点上。per-block / per-group 量化的意义就在这里：先把规模接近的一组元素放在一起，再为这一组选择自己的 scale。

量化粒度通常还要继续区分：

- per-tensor：整张 tensor 共用一组量化参数
- per-channel：每个通道有自己的 scale
- per-group / per-block：每个小块有自己的 scale

**设计动机**

- 整数编码便于使用整数 dot product、低比特矩阵乘和紧凑打包。
- `INT8` 在端侧推理里很常见，因为硬件、编译器和校准工具链都比较成熟。
- `INT4` 常用于权重量化；激活也压到 4 bit 时，校准、离群值处理和 kernel 支持会变得更关键。

一个最小的对称 `INT8` 例子：

```python
import torch

def int8_quantize(x: torch.Tensor):
    qmin, qmax = -128, 127
    amax = x.abs().amax().clamp_min(1e-8)
    scale = amax / qmax
    q = torch.clamp((x / scale).round(), qmin, qmax).to(torch.int8)
    return q, scale

def int8_dequantize(q: torch.Tensor, scale: torch.Tensor):
    return q.to(torch.float32) * scale
```

这段代码只覆盖对称 per-tensor 量化。真实部署还会涉及校准集、per-channel / per-block scale、算子回退和端侧后端约束。

## 缩放机制

### Scale

**标准定义**

`scale` 用来连接真实数值域和低精度编码域。浮点低精度和整数量化都会用到 scale，但含义略有差异：

- INT 量化里，scale 是整数编码回到真实值的比例系数。
- FP8 / FP4 路径里，scale 常用于把一组浮点值预先缩放到低精度格式可表示的范围内。

**设计动机**

- 模型张量的分布范围不固定。没有 scale 时，低精度格式很容易因为离群值而浪费编码空间，或者因为范围不够而饱和。
- scale 的粒度越细，通常误差越小；元数据和 kernel 复杂度也会增加。

### Zero Point

**标准定义**

`zero point` 主要出现在非对称 INT 量化中。它让真实值 0 可以精确映射到整数编码 $z$。

**设计动机**

- 当张量分布明显偏向正数或负数时，非对称量化可以更充分地利用整数区间。
- `zero point` 会增加反量化和算子融合的复杂度，所以高性能推理里也常见对称量化路径。

### Block Scale

**标准定义**

block scale 是让一小组元素共享一个 scale。常见粒度包括 16、32、64 个元素，或者二维块。

**设计动机**

- 同一张 tensor 内部也可能有局部分布差异。block scale 用更细的局部缩放减少离群值影响。
- block scale 会带来额外元数据和访存模式约束，底层 kernel 需要同时读取低比特数据和 scale。

## NVFP4

NVIDIA `NVFP4` 是带分层缩放的 FP4 方案，核心由三部分组成：

1. 主数据使用 `E2M1` FP4 编码。
2. block scale 使用 `E4M3` FP8 编码；一维路径里通常每 16 个连续元素共享一个 block scale。
3. 还有一个 tensor 级的 `FP32` 全局 scale，用来覆盖更大的动态范围。

可以写成：

$$
x \approx x_{\mathrm{E2M1}} \cdot s_{\mathrm{block,E4M3}} \cdot s_{\mathrm{tensor,FP32}}
$$

Transformer Engine 的 NVFP4 训练 recipe 里，权重还可以使用 $16 \times 16$ 的二维 block scale；激活和梯度通常使用一维 block scale。

**设计动机**

- 裸 `E2M1` 的可表示值太少，单独使用会带来明显饱和和量化误差。
- `E4M3` block scale 比只用 2 的幂缩放更细，可以更贴近局部分布。
- tensor 级 `FP32` scale 负责全局范围，避免 block scale 自身范围不足。
- 训练路径里还会配合随机舍入、敏感层高精度保留、转置副本等策略，减少窄格式带来的系统性误差。

## 执行路径

低精度格式能不能真正加速，最后取决于执行路径。

### 打包存储

低于 8 bit 的格式需要打包。例如两个 4-bit code 可以放进一个字节：

```python
import torch
import torch.nn.functional as F

def pack_u4(codes: torch.Tensor) -> torch.Tensor:
    codes = codes.to(torch.uint8).flatten()
    if codes.numel() % 2:
        codes = F.pad(codes, (0, 1))

    lo = codes[0::2] & 0x0F
    hi = (codes[1::2] & 0x0F) << 4
    return lo | hi
```

打包只解决存储密度。矩阵乘真正执行时，还要处理解包、scale 读取、反量化和累加。

### 累加精度

低精度输入不代表低精度累加。常见路径是：

- `FP16` / `BF16` 输入，`FP32` 或硬件内部更高精度累加
- `INT8` 输入，`INT32` 累加，再反量化
- `FP8` / `FP4` 输入，配合 scale，在 Tensor Core 或专用 kernel 内部完成转换和累加

累加精度会直接影响长向量 dot product、attention score、归一化和残差路径的误差。

### Fused Kernel

类似算子融合的思想，低精度方案通常需要 fused kernel 才能体现性能：

- matmul 里融合反量化
- attention 里融合 scale、mask、softmax 和 value 乘法
- linear 层里融合 bias、activation、requantize
- 转置或 layout transform 时同步处理 scale

如果每一步都落回单独 kernel，低精度节省下来的带宽可能会被额外读写和格式转换抵消。