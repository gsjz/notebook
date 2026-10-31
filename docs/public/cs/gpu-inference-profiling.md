# GPU 推理性能测量与瓶颈归因

低延迟优化需要回答三个相连的问题：请求在等待什么，目标算子受什么资源约束，局部加速能否改变用户可见的时间。kernel 快了一倍、GPU 利用率提高、tokens/s 上升，分别描述不同变化，不能彼此替代。

前置内容见 [GPU 执行、内存与 Roofline](gpu-memory-roofline.md)、[扩散语言模型的推理执行](diffusion-language-model-inference.md)；具体优化机制可结合 [分块 GEMM 与 CuTe](gpu-tiled-gemm-cute.md)、[在线 Softmax 与算子融合](online-softmax-fusion.md) 和 [CUDA Graph 设备循环](cuda-graphs-device-loop.md)。

## 时间边界与服务指标

| 测量量 | 起止边界 | 回答的问题 |
| --- | --- | --- |
| 单 kernel 设备时间 | 对应 GPU 操作开始到结束 | 算子实现本身是否变快 |
| 一轮去噪时间 | 前向、采样、停止判断等该轮全部工作 | 完整一轮是否受益 |
| 第一可用 canvas 延迟 | 请求进入既定边界到第一块干净输出可消费 | 首个完整输出块等待多久 |
| 请求完成时间 | 请求开始到最终输出就绪 | 单请求服务时间 |
| 端到端延迟 | 客户端发送到接收，包含约定的传输与排队 | 使用者实际等待多久 |
| 稳态吞吐 | 同一测量窗口完成的有效输出量 / 时间 | 持续负载下完成工作多快 |

扩散语言模型在块内进行多轮预测，内部 token 改写通常不会逐个对外提交。需明确统计块间隔、输出可见时间还是内部迭代时间；直接用 AR inter-token latency 描述，可能隐藏等待整个 canvas 完成的成本。

p50、p95、p99 应从足够多的请求样本计算，并记录并发、到达分布与异常处理。每次只报告平均值，会掩盖少数慢请求；只报告最快值，则容易把偶然缓存和调度状态当作稳定效果。吞吐量按有效输出 token 计，不应把 padding 位置或内部去噪预测累计为对外输出。

## CUDA 异步执行与正确计时

```python
# 教学骨架：同一 stream 内测一段 GPU 工作。
start = torch.cuda.Event(enable_timing=True)
end = torch.cuda.Event(enable_timing=True)
start.record()
output = measured_gpu_work(inputs)
end.record()
end.synchronize()
elapsed_ms = start.elapsed_time(end)
```

[PyTorch `torch/cuda/streams.py`（v2.9.0）](https://github.com/pytorch/pytorch/blob/v2.9.0/torch/cuda/streams.py) 的 `Event.record` 将事件记录到 stream，`elapsed_time` 获取事件间的设备时间。事件必须覆盖目标工作依赖；若工作发往其他 stream，应显式汇合事件。单 stream 两个事件不会自动包含任意后台 stream 的全部执行。

```python
# 隔离运行下的服务完成时间：包含本次 host 工作与设备等待。
torch.cuda.synchronize()
t0 = time.perf_counter()
output = generate(inputs)
torch.cuda.synchronize()
service_seconds = time.perf_counter() - t0
```

未传入 `device` 时，`torch.cuda.synchronize()` 等待当前 CUDA 设备上的工作；多 GPU 测量需覆盖所有参与设备，或等待能表达完整依赖的完成事件。这种同步适合隔离基准的清晰边界。在真实并发服务中，它可能等待其他请求并改变调度，不能原封不动地作为每请求测量。服务系统需用请求完成事件或自身的完成通知定义时间。

只在 Python 调用外使用 `perf_counter()`、却不等待 GPU 完成，测到的往往主要是提交时间。反过来，每个 kernel 后都同步，会把流水重叠和图执行收益破坏掉。诊断同步的实验与正式计时应分开。

## Warm-up 与可比较的基线

首次运行可能包含模型加载、JIT 编译、库算法选择、分配和页映射。应将冷启动单独记录，并在目标 shape、精度和执行路径完成 warm-up 后测稳态。

同一基线至少固定：模型 checkpoint、推理后端、编译选项、量化格式、batch、canvas 长度、prefix 长度分布、最大预算和实际去噪步数。还需记录时钟、电源和温度状态，以及是否存在其他进程负载；这些是实验条件，不应由未测量的峰值规格替代。

动态早停尤其需要两组实验：一组固定前向次数，比较每轮系统成本；另一组保持真实停止规则，比较输出行为和请求成本。随机采样可固定种子进行配对，但相同种子不保证不同 kernel 数值路径产生完全相同序列。

## Nsight Systems：先看时间线

[Nsight Systems](https://docs.nvidia.com/nsight-systems/UserGuide/index.html) 用于观察 CPU 线程、CUDA API、GPU kernels、memcpy 与同步的时序关系。先判断关键路径，再挑选 kernel 深入分析。

```bash
# 示例命令；app.py 是待分析程序，不是依赖此笔记的实际脚本。
nsys profile --trace=cuda,nvtx,osrt --sample=none \
  --output=trace python app.py
```

可用 NVTX 给阶段建立标记，让时间线对应到模型语义：

```python
with torch.cuda.nvtx.range("denoise/forward"):
    logits = decoder(canvas, kv_cache, sc)
with torch.cuda.nvtx.range("denoise/sample-stop"):
    canvas, done = sample_and_stop(logits)
```

这些 host range 表达代码范围，不能单独当作 GPU 完成时间。异步工作可能在 range 关闭后继续执行，应结合相关 CUDA API 与 device activity 判断。

<svg viewBox="0 0 900 210" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="CPU 提交、GPU kernel 与同步间隙的时间线" style="display:block;width:100%;height:auto;margin:1rem 0;background:#fff;border-radius:12px" font-family="system-ui,sans-serif">
  <text x="20" y="42" font-size="16" fill="#374151">CPU</text><text x="20" y="112" font-size="16" fill="#374151">GPU</text>
  <path d="M100 61 H865 M100 133 H865" stroke="#e5e7eb"/>
  <g fill="#fafafa" stroke="#e5e7eb"><rect x="110" y="18" width="85" height="39" rx="6"/><rect x="220" y="18" width="100" height="39" rx="6"/><rect x="470" y="18" width="130" height="39" rx="6"/><rect x="735" y="18" width="120" height="39" rx="6"/></g>
  <g fill="#6b7280" font-size="13" text-anchor="middle"><text x="152" y="43">提交 A</text><text x="270" y="43">提交 B</text><text x="535" y="43">读取停止标志</text><text x="795" y="43">下一轮</text></g>
  <g fill="#f0eef8" stroke="#d8d2e2"><rect x="160" y="88" width="180" height="41" rx="6"/><rect x="350" y="88" width="230" height="41" rx="6"/><rect x="775" y="88" width="80" height="41" rx="6"/></g>
  <g fill="#62578a" font-size="14" text-anchor="middle"><text x="250" y="114">kernel A</text><text x="465" y="114">kernel B</text><text x="815" y="114">下一轮</text></g>
  <path d="M580 149 H775" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="4 4"/><text x="678" y="177" text-anchor="middle" font-size="13" fill="#6b7280">完成后仍有轮间空隙</text>
</svg>

GPU 时间线中的空白可能来自 host 分支、前序同步、依赖其他 stream、调度或尚未提交工作。CPU 中长时间的 CUDA API 也可能在等待之前的 GPU 工作，不能仅凭函数名把它归为 API 本身昂贵。先关联前后依赖，再做减少同步或 graph replay 的对照。

## Nsight Compute：定位 kernel 的资源约束

[Nsight Compute Profiling Guide](https://docs.nvidia.com/nsight-compute/ProfilingGuide/index.html) 用于检查某个 kernel 的资源、吞吐和停顿。可先限定目标 kernel 与少量指标，避免对完整生成的每次调用收集所有指标。

| 观察方向 | 典型证据 | 仍需核对的条件 |
| --- | --- | --- |
| 内存访问受限 | DRAM 流量、吞吐、访存效率与算术强度 | 不是所有低 SM 利用率都来自带宽 |
| 计算受限 | Tensor Core / 指令吞吐与计算管线利用 | 格式、shape 与峰值参考是否匹配 |
| 延迟隐藏不足 | eligible warps、stall、寄存器和 shared memory 限制 | 高 occupancy 本身不保证更快 |
| 小矩阵与尾块 | tile 数、有效数据比例、局部批量 | grouped kernel 的调度与 padding 策略 |
| 融合资源溢出 | register 增长、spill、occupancy 变化 | 少一次中间写回能否抵消新增资源成本 |

性能计数器经常需要多轮 replay。Nsight Compute 可能保存/恢复内存、串行化工作或调整 cache 行为；采集过程中的 wall time 不能替代无 profiler 的正式延迟。涉及 host 交互、图或并发依赖时，应按官方支持范围选择 kernel replay、application replay 或 range replay。

GB10 与其他 Blackwell 产品的资源、可用指标和 kernel 支持不应混用。工具版本、权限及设备支持决定能收集哪些计数器；遇到不可用指标应报告缺失，不能用另一个架构的数值补齐。

## Roofline 与局部加速上限

对某段 GPU 工作，若算术量为 $F$、实际层级的数据流量为 $Q$，算术强度为 $I=F/Q$。以匹配数据类型与硬件的计算吞吐 $P$ 和带宽 $B$ 作参考，简化下界为

$$
T_{\mathrm{kernel}}\gtrsim\max\left(\frac{F}{P},\frac{Q}{B}\right).
$$

该式忽略启动、依赖、并行不足与容量问题。峰值只提供理想下界，不是实际延迟预测。融合减少了 $Q$，但若寄存器压力使有效 $P$ 降低，净收益仍需测量。

设基线中目标算子占总服务时间比例 $f$，它单独获得 $s$ 倍加速，其他部分不变，则

$$
S_{\mathrm{total}}=\frac{1}{(1-f)+f/s}.
$$

例如目标部分占 $20\%$，即使完全消除，也最多使整体加速到 $1.25\times$。若端到端收益超过这个对照，应检查是否同时减少了 host gap、前向次数、输出长度或其他阶段。

<iframe src="../assets/inference/profiling-timeline.html" title="局部算子加速与请求总时间交互时间线" loading="lazy" style="display:block;width:100%;height:520px;border:0;border-radius:16px;margin:1rem 0;"></iframe>

[单独打开时间线](assets/inference/profiling-timeline.html)

## 能耗与设备时间

设备组的服务窗口能耗可定义为

$$
\mathcal E=\int_{t_0}^{t_1}\sum_{r=1}^{P}P_r(t)\,dt.
$$

需说明测量边界是 GPU、SoC、整机还是包含网络。专家并行中，等待卡也有静态和通信功耗；单卡数据不能代表全部设备成本。若按空闲基线扣除，应同时保留原始总焦耳与基线定义。

[NVML Device Queries](https://docs.nvidia.com/deploy/nvml-api/api/group__nvmlDeviceQueries.html) 中，`nvmlDeviceGetPowerUsage` 返回毫瓦，`nvmlDeviceGetTotalEnergyConsumption` 返回驱动重新加载以来的累计毫焦耳。接口是否可用，取决于设备与驱动；累计能量应对窗口起止读数做差，检查返回状态和测量边界。部分功率接口反映特定时间窗口的平均值，不能把一次查询值乘单个微秒级 kernel 时间当作准确能量。平台不暴露所需传感器时，可用明确边界的整机仪表，或清楚报告无法测量的部分。

短任务应聚合为足够长的重复窗口，按完成请求数或有效输出 token 归一化，同时排除 warm-up 和采样进程干扰。共享服务的整卡功率很难精确归给某个请求，应先建立隔离基线，再研究共置。

延迟下降可能伴随功率升高；延迟升高也可能伴随设备等待、平均功率下降。最终同时报告时间、平均功率和积分能量，避免用其中一个替代另一个。

## 分项消融与正确性

| 对照实验 | 固定项 | 排除的混淆 |
| --- | --- | --- |
| 基础 kernel 与融合 kernel | 输入、格式、数学语义 | 相同工作下的算子收益 |
| host loop 与 graph loop | 前向次数、算子实现 | 调度与同步收益 |
| 自然早停与固定预算 | 模型、任务和输出约束 | 步数变化与单步成本 |
| 多种 batch / canvas | 测量边界与有效输出定义 | 并行粒度和 padding |
| 多种专家分布 | token–expert 总分配、专家尺寸 | 路由形状与均衡效应 |

融合 softmax、自条件投影或更改归约顺序后，应先对比张量误差，再检查概率、停止标志、实际步数与任务质量。浮点误差可能在阈值附近改变早停，即使最终 token 差异不大。每项优化只改一个机制，组合优化再测交互作用。

记录结果时，将未实现方案、教学模型、microbenchmark 和真实端到端测量分开。本文交互图中的时间是合成参数，仅用于解释分项归因，不能代表 DGX Spark 或 DiffusionGemma 的性能。

## 资料

- [Nsight Systems User Guide](https://docs.nvidia.com/nsight-systems/UserGuide/index.html)
- [Nsight Compute Profiling Guide](https://docs.nvidia.com/nsight-compute/ProfilingGuide/index.html)
- [CUDA Event API](https://docs.nvidia.com/cuda/cuda-runtime-api/group__CUDART__EVENT.html)
- [PyTorch CUDA Event](https://docs.pytorch.org/docs/stable/generated/torch.cuda.Event.html)
- [NVML API Reference](https://docs.nvidia.com/deploy/nvml-api/)
