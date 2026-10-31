# GPU 分块矩阵乘与 CuTe DSL

Transformer 的线性层、自条件 soft embedding 投影和 MoE 专家 FFN 都可归约为矩阵乘。理解一个 kernel，需要同时确定逻辑形状、数据布局、线程分工和片上资源；只知道它调用了 Tensor Core，无法解释小批次延迟。

前置概念可对照[存储器概述](memory-system-overview.md)、[DMA](dma.md)和[精度编码](precision-encoding.md)。模型中的调用位置见 [扩散语言模型推理](diffusion-language-model-inference.md)。

## 矩阵形状与并行粒度

设

$$
C=AB,\qquad A\in\mathbb{R}^{M\times K},\quad B\in\mathbb{R}^{K\times N}.
$$

每个输出元素是长度为 $K$ 的点积，总算术量约为 $2MNK$ FLOPs，乘加计两次操作。在线性层中，$M$ 通常是展平后的 token 数，$K$ 是输入维度，$N$ 是输出维度；MoE 中每个专家的 $M$ 由实际路由给它的 token 数决定。

| 层级 | 负责的工作 | 需要区分的概念 |
| --- | --- | --- |
| Grid | 覆盖整个输出矩阵 | 输出 tile 数与可用 SM 数 |
| CTA / thread block | 计算一块 $B_M\times B_N$ 输出 | block 是调度和共享内存协作单位 |
| Warp | 32 个线程协作执行 | warp 的线程布局与指令布局 |
| MMA atom | 一条或一组矩阵乘累加操作 | 输入格式、指令形状、累加格式 |
| Thread | 持有部分输入与累加值 | 寄存器数、load/store 地址 |

传统 CUDA CTA 中共享内存和 `__syncthreads()` 的作用域是 block；跨 CTA 合作需要额外机制。新架构的 cluster、异步 MMA 与 Tensor Memory 有各自约束，不能把所有 GPU 的执行层级画成同一条固定路径。

## 沿归约维度累加

一个 CTA 固定输出的行列范围，沿 $K$ 维分块：

$$
C_{\mathrm{tile}}\mathrel{+}=
A_{m:m+B_M,\,k:k+B_K}
B_{k:k+B_K,\,n:n+B_N}.
$$

下图只表示数据依赖。各 CTA 通常独立计算不同输出 tile，执行顺序由 GPU 调度。

<svg viewBox="0 0 900 170" role="img" aria-label="A与B分块经共享内存和寄存器进入矩阵乘累加，再写回输出" style="display:block;width:100%;height:auto;margin:1rem 0;background:#fff;border-radius:12px" xmlns="http://www.w3.org/2000/svg">
  <defs><marker id="gemm-flow-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7" fill="#6b7280"/></marker></defs>
  <g font-family="system-ui,sans-serif" text-anchor="middle" font-size="15" fill="#374151">
    <rect x="16" y="37" width="170" height="86" rx="9" fill="#fafafa" stroke="#e5e7eb"/><text x="101" y="70">A / B 的 K 分块</text><text x="101" y="98" font-size="13" fill="#6b7280">global memory</text>
    <rect x="239" y="37" width="170" height="86" rx="9" fill="#f0eef8" stroke="#d8d2e2"/><text x="324" y="70">共享内存缓冲</text><text x="324" y="98" font-size="13" fill="#6b7280">可用多级流水</text>
    <rect x="462" y="37" width="190" height="86" rx="9" fill="#f0eef8" stroke="#d8d2e2"/><text x="557" y="70">MMA + 累加器</text><text x="557" y="98" font-size="13" fill="#6b7280">跨 K 分块保留部分和</text>
    <rect x="705" y="37" width="178" height="86" rx="9" fill="#fafafa" stroke="#e5e7eb"/><text x="794" y="70">输出 C tile</text><text x="794" y="98" font-size="13" fill="#6b7280">epilogue + store</text>
    <text x="450" y="152" font-size="12" fill="#6b7280">SM120 示例将 MMA 输入和累加器放在寄存器；其他架构可采用不同路径。</text>
  </g>
  <g fill="none" stroke="#9ca3af" stroke-width="1.5" marker-end="url(#gemm-flow-arrow)"><path d="M186 80H236"/><path d="M409 80H459"/><path d="M652 80H702"/></g>
</svg>

下面用小矩阵观察一个 CTA 的 $K$ 循环。切换 tile 大小会改变输出 tile 数、每步输入量和累加器大小；界面中的数值都是计数示意。

<iframe src="../assets/inference/gemm-tiles.html" title="GEMM 分块与 K 维累加动画" loading="lazy" style="display:block;width:100%;height:620px;border:0;border-radius:16px;margin:1rem 0;"></iframe>

[单独打开分块动画](assets/inference/gemm-tiles.html)

### 数据复用与算术强度

忽略缓存、多阶段重叠和输出写回，一个 $K$ 分块读取 $B_MB_K+B_KB_N$ 个输入元素，完成约 $2B_MB_NB_K$ FLOPs。若每元素 $q$ 字节，则局部算术强度近似为

$$
I_{\mathrm{tile}}\approx\frac{2B_MB_N}{q(B_M+B_N)}.
$$

同一块 $A$ 被多个输出列复用，同一块 $B$ 被多个输出行复用。增大 $B_M,B_N$ 能提高这种复用，但资源占用也会上升；$B_K$ 增大主要改变每级缓冲、循环次数和流水粒度，不会在这个简化公式里直接提高强度。

一个 GEMM 的理想输入下界与各 CTA 实际发出的 load 总量不同。相邻 CTA 可能重复读取同一数据，是否由 L2 缓存吸收要靠测量；不能把局部算术强度当作整卡 DRAM 流量的精确公式。

### 小矩阵与尾块

输出 tile 数近似为

$$
N_{\mathrm{CTA}}=
\left\lceil\frac{M}{B_M}\right\rceil
\left\lceil\frac{N}{B_N}\right\rceil.
$$

若 $M$ 很小，过大的 $B_M$ 会留下大量无效行，也可能产生不足以铺满 GPU 的 CTA。将多个专家矩阵交给 grouped GEMM 调度，能增加可调度工作，但各专家的尾块和不规则行数仍然存在。

边界 load 必须使用有效性判断，归约中的越界值通常填零，输出 store 也要屏蔽。不同后端可能采用 padding、predication 或专门的 residue 路径；“有掩码”不代表所有被屏蔽 lane 都完全没有成本。

## Layout：坐标怎样变成地址

对二维张量，可用 stride 表示逻辑坐标到线性偏移的映射：

$$
\operatorname{offset}(i,j)=i\,s_i+j\,s_j.
$$

行主序的 $M\times K$ 矩阵通常有 stride $(K,1)$。矩阵转置可以先改变逻辑视图，不一定立即复制数据；消费指令仍然必须支持对应的访问方式。

CuTe 的 layout 还描述层级形状与 thread–value 分工。三个对象需要分别读：

- 张量 layout：逻辑元素存在哪个地址。
- copy layout：哪个线程复制哪些元素。
- MMA layout：哪个线程持有哪些 operand fragment 和 accumulator。

global memory 的合并访问取决于同一 warp 的实际地址、对齐和访问宽度；shared memory 的 bank conflict 又是另一组地址映射问题。盲目把两种 layout 设成一样，可能损失向量化、制造 bank conflict，或不符合 MMA fragment 的要求。

## CuTe DSL 代码阅读

以下固定到 NVIDIA CUTLASS commit [`e13f5cd`](https://github.com/NVIDIA/cutlass/tree/e13f5cd4142c43efc37c2f6339923eb4a57afb99)。代码阅读采用两条路径：Ampere SGEMM 用于理解 layout 与线程分工；SM120 dense GEMM 用于对照适用于 Blackwell GeForce 类设备的 MMA 路径。前者使用 FP32 FPU，不能把它的性能当作 Tensor Core 性能。

### 从输出 tile 到线程 fragment

[`ampere/kernel/dense_gemm/sgemm.py`](https://github.com/NVIDIA/cutlass/blob/e13f5cd4142c43efc37c2f6339923eb4a57afb99/examples/python/CuTeDSL/cute/ampere/kernel/dense_gemm/sgemm.py) 的 `SGemm.kernel` 按 block 坐标取局部张量，再按线程划分。下面是保留操作关系的教学改写，省略 pipeline 和边界处理：

```python
# 教学伪码；对应 SGemm.kernel 的视图与分工
block_coord = (block_m, block_n, None)
gA = cute.local_tile(A, cta_tile, block_coord, proj=(1, None, 1))
gB = cute.local_tile(B_nk, cta_tile, block_coord, proj=(None, 1, 1))
gC = cute.local_tile(C, cta_tile, block_coord, proj=(1, 1, None))
thread_mma = tiled_mma.get_slice(thread_id)
tA = thread_mma.partition_A(shared_A)
tB = thread_mma.partition_B(shared_B)
tC = thread_mma.partition_C(gC)
accumulator = tiled_mma.make_fragment_C(tC)
```

`local_tile` 构造 CTA 视图，通常不在这里复制元素；`partition_A/B/C` 根据 MMA layout 分配 thread fragment，也不等于“把完整 tile 拷给每个线程”。示例将 $B$ 以 $N\times K$ 的 operand 视图表示，逻辑计算仍是前文的 $AB$。

继续沿下面的对象追踪一次数据流：

| 源码对象 | 含义 | 检查点 |
| --- | --- | --- |
| `sA_layout`、`sB_layout` | 含 pipeline stage 的共享内存 layout | padding、stride、stage 数 |
| `tiled_copy_A/B` | global 到 shared 的线程/元素分工 | 对齐能否启用向量化 copy |
| `thr_copy.partition_S/D` | 每线程的源/目标 slice | 同一元素的生产者和消费者 |
| `cp_async_commit_group` / `wait_group` | 异步 copy 的提交和等待 | 等待完成后再使用缓冲 |
| `tCrC` | 跨 $K$ 分块的累加 fragment | 初始化、类型与最终写回 |

示例还为部分 layout 加 padding 来减轻 shared memory bank conflict，并区分 global→shared 与 shared→register 两级流水。修改 stage 数时，要同步检查缓冲复用和 barrier；只加大数组不能自动获得正确重叠。

### SM120 的矩阵指令与资源配置

[`blackwell_geforce/kernel/dense_gemm/dense_gemm.py`](https://github.com/NVIDIA/cutlass/blob/e13f5cd4142c43efc37c2f6339923eb4a57afb99/examples/python/CuTeDSL/cute/blackwell_geforce/kernel/dense_gemm/dense_gemm.py) 的 `Sm120GemmKernel._setup_attributes` 使用 `cute.nvgpu.warp.MmaF16BF16Op`，示例的指令形状为 $(16,8,16)$，并通过 `make_tiled_mma` 组合成更大的分工。

这说明 CTA tile、warp 的 atom layout、单条 MMA 形状是不同层次。示例还分别设置 load 与 MMA 的寄存器需求，通过 `_compute_stages` 根据 tile、数据类型、epilogue 和共享内存容量计算缓冲级数。源码中的配置是该示例的选择，不是 GB10 上所有算子的最佳配置。

同为 Blackwell，SM100、SM103、SM120 的专用指令与可用内核并不完全相同。读取目录名、编译目标、支持的数据类型与运行约束，比根据品牌名选择一个高性能示例更可靠。具体设备参数应通过公开规格与实际设备查询核对。

## 寄存器、共享内存与 occupancy

在每 CTA 使用 $T$ 个线程、每线程约 $r$ 个寄存器时，寄存器需求可粗略写为 $Tr$；若每级输入缓冲共需 $S$ 字节、保留 $p$ 级，主要共享内存需求约为 $pS$，还需加入 barrier、padding 和 epilogue 空间。

每个 SM 可同时驻留的 CTA 数受到多项约束：

$$
N_{\mathrm{resident}}\leq
\min\left(
N_{\mathrm{block\ limit}},
\left\lfloor\frac{R_{\mathrm{SM}}}{R_{\mathrm{CTA}}}\right\rfloor,
\left\lfloor\frac{S_{\mathrm{SM}}}{S_{\mathrm{CTA}}}\right\rfloor,
\left\lfloor\frac{T_{\mathrm{SM}}}{T}\right\rfloor
\right).
$$

实际分配有粒度和架构限制，应以编译报告及 Nsight Compute 的限制项为准。occupancy 是可驻留活跃 warp 比例，并不直接等于 Tensor Core 利用率或性能。资源用得更多，可能提高单 CTA 数据复用，却降低并发；资源太少，也可能没有足够流水隐藏延迟。

| 调整 | 可能收益 | 可能代价 |
| --- | --- | --- |
| 增大输出 tile | 更多输入复用 | 更多 accumulator、尾块、较少 CTA |
| 增加 pipeline stage | 隐藏读取延迟 | 更多共享内存、更复杂同步 |
| 增加 warp | 更大并行分工 | 寄存器/同步成本、单 warp 工作变薄 |
| 融合 epilogue | 减少中间写回和 launch | live range 增长、寄存器压力 |

对小批次推理，应同时保留每个专家的矩阵形状分布、kernel 时间和端到端延迟。一次大 GEMM 的最佳 tile，通常不能直接用于一组行数差异很大的专家 GEMM。

## 验证边界

阅读示例可以建立调优假设；它不会证明某个 tile 已经在特定设备上更快。移植实现时至少检查：非整倍数形状、非连续 stride、目标精度、越界读写、同步、累计误差，以及后端的编译和硬件约束。

将编译、warm-up 与正式计时分开；用 GPU 时间观察 kernel，用端到端时间观察调度与同步。若融合改变了累加顺序或计算格式，还需按[在线 softmax 与自条件投影融合](online-softmax-fusion.md)检查数值和生成语义。

## 来源

- [CUDA Programming Guide](https://docs.nvidia.com/cuda/cuda-programming-guide/)：线程层级、内存模型与同步。
- [CUTLASS CuTe DSL 文档](https://docs.nvidia.com/cutlass/media/docs/pythonDSL/overview.html)：layout、copy、MMA 与 kernel 编程。
- [CUTLASS 固定版本示例](https://github.com/NVIDIA/cutlass/tree/e13f5cd4142c43efc37c2f6339923eb4a57afb99/examples/python/CuTeDSL/cute)：架构分目录的可核对实现。
- [CUDA Occupancy API](https://docs.nvidia.com/cuda/cuda-runtime-api/group__CUDART__OCCUPANCY.html)：资源限制与占用估计。
