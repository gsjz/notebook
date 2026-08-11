# FP4 / FP8 低精度编码笔记

!!! note "先分清三层"
    1. `dtype` 只决定 bit 怎么摆。
    2. `scale` 决定原始浮点怎么映射到窄格式。
    3. 真正跑模型时，通常是“窄格式 + scale + 高精度累加”一起用。

## FP8 是什么

FP8 不是一个单一格式，常见的是 `E4M3` 和 `E5M2`。

- `E4M3`：1 个符号位，4 个指数位，3 个尾数位，偏精度
- `E5M2`：1 个符号位，5 个指数位，2 个尾数位，偏范围

在 PyTorch 里，常见对应 dtype 是 `torch.float8_e4m3fn` 和 `torch.float8_e5m2`。这两个 dtype 本身不携带 scale，scale 需要在更高层的量化代码里单独维护。

$$
x \approx s \cdot q_{\mathrm{fp8}}
$$

一个最直接的做法是先按 amax 算 scale，再 cast：

```python
import torch


def fp8_quantize(x: torch.Tensor, dtype: torch.dtype):
    fp_max = torch.finfo(dtype).max
    scale = x.abs().amax().clamp_min(1e-8) / fp_max
    q = (x / scale).to(dtype)
    return q, scale


def fp8_dequantize(q: torch.Tensor, scale: torch.Tensor):
    return q.to(torch.float32) * scale


x = torch.randn(4, 8, device="cuda", dtype=torch.bfloat16)
x_q, x_s = fp8_quantize(x, torch.float8_e4m3fn)
x_hat = fp8_dequantize(x_q, x_s)
```

!!! tip "什么时候选哪种 FP8"
    - 激活和权重：通常先看 `E4M3`
    - 梯度：通常先看 `E5M2`
    - 张量离群值很多时，先调 `scale`，别先怪 bit 不够

### FP8 矩阵乘里的参考写法

真实内核不会先把低精度 tensor 完整反量化出来再乘。为了看清楚数据流，可以先写一个 reference 版本：

```python
def scaled_mm_reference(a: torch.Tensor, b: torch.Tensor, dtype: torch.dtype):
    a_q, a_s = fp8_quantize(a, dtype)
    b_q, b_s = fp8_quantize(b, dtype)

    a_hat = fp8_dequantize(a_q, a_s).to(torch.bfloat16)
    b_hat = fp8_dequantize(b_q, b_s).to(torch.bfloat16)
    return a_hat @ b_hat


a = torch.randn(128, 256, device="cuda", dtype=torch.bfloat16)
b = torch.randn(256, 512, device="cuda", dtype=torch.bfloat16)
y = scaled_mm_reference(a, b, torch.float8_e4m3fn)
```

这类流程的关键点不是“把 tensor 直接变成 float8”，而是“把 scale 和数据分开管理”。生产实现会把反量化、scale 应用和矩阵乘融合在同一个 kernel 里，避免中间的 `a_hat`、`b_hat` 真正落地。

!!! info "不要把 FP8 当成纯 dtype"
    `torch.float8_e4m3fn` 和 `torch.float8_e5m2` 更像是底层数据容器。真正决定模型能不能稳住的，往往是 scale 粒度、scale 更新策略、以及 matmul 是否用高精度累加。

## FP4 不是裸 4 bit

以 NVIDIA 的 `NVFP4` 为例，核心数据位宽是 `E2M1`：

- 1 个符号位
- 2 个指数位
- 1 个尾数位

它能表示的幅度大约到 `+-6`。但更重要的是它不是单独一个 4-bit 值，而是分层缩放：

$$
x = x_{\mathrm{e2m1}} \cdot s_{\mathrm{block}} \cdot s_{\mathrm{global}}
$$

其中：

- `x_e2m1` 是 4-bit 数据
- `s_block` 是 16 个连续元素共享的局部 scale
- `s_global` 是整张 tensor 共享的全局 scale

官方文档里，`s_block` 用 FP8 `E4M3` 表示，`s_global` 是 FP32。对应的量化公式可以直接写成：

```python
import torch
import torch.nn.functional as F


def nvfp4_scales(x: torch.Tensor):
    fp8_max = torch.finfo(torch.float8_e4m3fn).max  # 448.0
    fp4_max = 6.0

    global_amax = x.abs().amax().clamp_min(1e-8)
    s_global = global_amax / (fp8_max * fp4_max)

    flat = x.flatten()
    pad = (-flat.numel()) % 16
    if pad:
        flat = F.pad(flat, (0, pad))

    blocks = flat.view(-1, 16)
    block_amax = blocks.abs().amax(dim=1, keepdim=True).clamp_min(1e-8)
    s_block = (block_amax / fp4_max) / s_global
    return s_block, s_global
```

### 4 bit 的存储方式

PyTorch 里已经有 `torch.float4_e2m1fn_x2`，它表示两个 4-bit 值打包进一个字节。也就是说，4 bit 的“物理存储”和 `E2M1` 的“数值语义”是两回事。

```python
def pack_u4(codes: torch.Tensor) -> torch.Tensor:
    codes = codes.to(torch.uint8).flatten()
    if codes.numel() % 2:
        codes = F.pad(codes, (0, 1))

    lo = codes[0::2] & 0x0F
    hi = (codes[1::2] & 0x0F) << 4
    return lo | hi
```

这类打包只解决“怎么存”，不解决“怎么量化得准”。如果没有把 scale 一起保存，4-bit 数据基本没法还原出原始张量。

!!! warning "转置不是免费操作"
    对 block scaling 来说，先量化再转置，和先转置再量化，结果通常不同。
    训练里常见做法是从原始高精度张量同时生成正向和转置版本，避免重复量化误差。

## 线性层怎么接起来

一个线性层在低精度里通常长这样：

```python
def low_precision_linear_reference(x, w, x_dtype, w_dtype):
    x_q, x_s = fp8_quantize(x, x_dtype)
    w_q, w_s = fp8_quantize(w, w_dtype)

    x_hat = fp8_dequantize(x_q, x_s).to(torch.bfloat16)
    w_hat = fp8_dequantize(w_q, w_s).to(torch.bfloat16)
    return x_hat @ w_hat.T
```

如果是 NVFP4，数据会更窄，scale 会更多一层，但整体思路一样：数据、局部 scale、全局 scale 分开存，算子再把它们合回去。

## torchao 里的 recipe 视角

torchao 把这些格式包成了更高层的 recipe。下面这段代码说明同一个量化工作流如何切到 FP8 或 FP4：

```python
import torch
import torch.nn as nn

from torchao.prototype.mx_formats.inference_workflow import (
    MXDynamicActivationMXWeightConfig,
)
from torchao.quantization import quantize_
from torchao.quantization.quantize_.common import KernelPreference


# FP8 recipe
fp8_model = nn.Linear(32, 128, bias=False, dtype=torch.bfloat16, device="cuda")
fp8_config = MXDynamicActivationMXWeightConfig(
    activation_dtype=torch.float8_e4m3fn,
    weight_dtype=torch.float8_e4m3fn,
    kernel_preference=KernelPreference.AUTO,
)
quantize_(fp8_model, config=fp8_config)
fp8_model = torch.compile(fp8_model, fullgraph=True)

# FP4 recipe
fp4_model = nn.Linear(32, 128, bias=False, dtype=torch.bfloat16, device="cuda")
fp4_config = MXDynamicActivationMXWeightConfig(
    activation_dtype=torch.float4_e2m1fn_x2,
    weight_dtype=torch.float4_e2m1fn_x2,
    kernel_preference=KernelPreference.AUTO,
)
quantize_(fp4_model, config=fp4_config)
fp4_model = torch.compile(fp4_model, fullgraph=True)
```

!!! info "这个例子的边界"
    `MXDynamicActivationMXWeightConfig` 是 torchao 的 MX inference 入口，实际执行需要对应硬件和 PyTorch / torchao 版本支持。训练场景里也常见 Transformer Engine 的 `DelayedScaling`、`MXFP8BlockScaling`、`NVFP4BlockScaling` 这类 recipe。

!!! tip "判断一个方案是否完整"
    只看到 `FP8` 或 `FP4` 还不够。
    你还要问：`scale` 粒度多大，`scale` 存什么 dtype，累加用什么精度，转置要不要重新量化。

## 一句话落点

FP8 更像“8-bit 数据 + scale 的训练/推理格式”，FP4 更像“4-bit 数据 + 分层 scale 的压缩格式”。真正的模型编码，不是把 dtype 设窄，而是把数据、scale、算子和累加路径一起设计好。

## 参考

- [PyTorch Tensor Attributes](https://docs.pytorch.org/docs/stable/tensor_attributes.html)
- [Float8 in PyTorch](https://dev-discuss.pytorch.org/t/float8-in-pytorch-1-x/1815)
- [FP8 blog](https://developer.nvidia.com/blog/floating-point-8-an-introduction-to-efficient-lower-precision-ai-training/)
- [Transformer Engine FP8 primer](https://docs.nvidia.com/deeplearning/transformer-engine/user-guide/examples/fp8_primer.html)
- [NVFP4 docs](https://docs.nvidia.com/deeplearning/transformer-engine/user-guide/features/low_precision_training/nvfp4/nvfp4.html)
- [torchao quantization overview](https://docs.pytorch.org/ao/stable/contributing/quantization_overview.html)
