# CUDA Graph：从异步提交到设备侧循环

推理中的某些计算片段由许多短 kernel 组成。重复的 Python 调度、CUDA API 调用和读取停止标志的等待，可能成为端到端关键路径。CUDA Graph 将一组有依赖关系的工作先记录、实例化，再重复提交；条件节点进一步让设备判断是否执行下一轮。

前置内容可结合 [GPU 执行、内存与 Roofline](gpu-memory-roofline.md)、[扩散语言模型的推理执行](diffusion-language-model-inference.md) 和 [GPU 推理性能测量](gpu-inference-profiling.md)。图执行优化需要保持模型计算、采样和停止条件的语义。

## Stream、事件与同步

CUDA stream 是有序工作队列。同一 stream 中的 kernel 按依赖顺序执行；host 发出异步调用后可以继续运行。CPU 端函数返回，并不表示 GPU 已完成工作。

```python
# 结构示例：前向异步入队，item() 为 CPU 获取结果建立等待。
for step_index in range(max_steps):
    logits = model(canvas)
    stop = stopping_criteria(logits)
    if stop.item():
        break
```

若 `stop` 位于 GPU，`.item()` 通常需要等待相关设备计算完成，再将标量交给 CPU。每轮决定下一步的 host 循环会在 GPU 与 CPU 之间形成依赖链。统一内存地址空间也不会消除“设备算出结果后 CPU 才能分支”的时序要求。

事件可以表达 stream 间依赖；`cudaEventRecord` 标记事件，另一个 stream 用 `cudaStreamWaitEvent` 等待它。多个 stream 并不保证并行，依赖、SM 占用和内存带宽都可能限制重叠。跨 stream 的计时与捕获需显式包含这些依赖。

<svg viewBox="0 0 900 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Host 循环每轮读取停止标志，设备循环在 GPU 内更新条件" style="display:block;width:100%;height:auto;margin:1rem 0;background:#fff;border-radius:12px" font-family="system-ui,sans-serif">
  <defs><marker id="graph-arr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7" fill="#6b7280"/></marker></defs>
  <text x="22" y="29" fill="#374151" font-size="17" font-weight="600">Host 决策</text><text x="22" y="123" fill="#62578a" font-size="17" font-weight="600">设备决策</text>
  <g fill="#fafafa" stroke="#e5e7eb"><rect x="150" y="10" width="180" height="55" rx="8"/><rect x="380" y="10" width="180" height="55" rx="8"/><rect x="610" y="10" width="250" height="55" rx="8"/></g>
  <g fill="#374151" font-size="15" text-anchor="middle"><text x="240" y="43">GPU：前向与采样</text><text x="470" y="43">标志回传 / CPU 分支</text><text x="735" y="43">下一轮 host 提交</text></g>
  <g fill="none" stroke="#6b7280" stroke-width="1.5" marker-end="url(#graph-arr)"><path d="M330 38 H376"/><path d="M560 38 H606"/></g>
  <rect x="150" y="104" width="710" height="85" rx="9" fill="#f0eef8" stroke="#d8d2e2"/>
  <g fill="#62578a" font-size="15" text-anchor="middle"><text x="272" y="137">前向 → 采样 → 停止判断</text><text x="663" y="137">更新 condition</text><text x="505" y="174" font-size="13">WHILE body：condition 非零则继续，CPU 等待放到请求边界</text></g>
  <path d="M422 133 H556" stroke="#62578a" stroke-width="1.5" marker-end="url(#graph-arr)"/><path d="M760 146 V202 H265 V191" fill="none" stroke="#9ca3af" stroke-dasharray="4 4"/>
</svg>

## Capture、实例化与 Replay

| 阶段 | 主要工作 | 通常计入哪类成本 |
| --- | --- | --- |
| warm-up | 编译、首次分配、算法选择与缓存建立 | 冷启动或准备时间 |
| capture / 显式建图 | 收集 kernel、memcpy 等节点及依赖 | 准备时间 |
| instantiate | 验证图并生成可执行图 | 准备时间 |
| replay | 提交既定依赖图，使用本次输入 | 稳态服务时间 |

CUDA Graph 重放仍会执行节点中的 GPU 工作。它减少重复 host 提交与依赖设置的开销，不自动融合矩阵乘，也不自动减少算法的 FLOPs。

下面是 PyTorch 普通静态图的教学骨架，假设 `example_canvas` 已在目标 GPU 上，模型已处于推理配置，`step` 使用固定 shape 和图兼容算子：

```python
static_canvas = example_canvas.clone()
graph = torch.cuda.CUDAGraph()

# warmup_step 应在合适的非默认 stream 中完成，并建立同步依赖。
warmup_step(static_canvas)
with torch.cuda.graph(graph):
    static_output = step(static_canvas)

static_canvas.copy_(new_canvas)   # 写入原 buffer，保持地址
# copy 与 replay 需要在同一 stream 或有明确事件依赖。
graph.replay()
# static_output 的内容在下次 replay 时会被覆盖。
```

`static_canvas = new_canvas` 只改变 Python 引用，不会把捕获节点里保存的地址换成新地址。保留输入、输出和 workspace 的生命周期，是图复用的重要约束。变更允许更新的节点参数，可以用 graph update API；拓扑或不兼容参数变化可能需要重新捕获或实例化。

PyTorch [`torch/cuda/graphs.py`（v2.9.0）](https://github.com/pytorch/pytorch/blob/v2.9.0/torch/cuda/graphs.py) 中，`graph` 上下文调用 `capture_begin` / `capture_end`；`CUDAGraph.replay()` 调用底层可执行图。这里的普通 capture 不会自动把 Python `while` 变成 conditional WHILE。

### 可变路由与固定存储

固定地址、shape 与缓冲容量，可以容纳变化的数据。MoE 每轮的 `top_k_index` 可以变化，前提是排序、dispatch、变长专家执行都使用图兼容路径和足够的预分配容量。

需区分两种“静态”：

- 静态缓冲布局：每轮更新计数、offset、token permutation 和有效位置，存储地址不变。
- 静态路由结果：直接重复使用旧映射；仅在新映射与旧映射确实兼容时成立。

形状稳定不证明路由不变。数据相关输出大小、host 读取计数、临时分配或不支持 capture 的库调用，都可能打断图执行。

## Conditional WHILE 的状态协议

条件 WHILE 节点在 condition 非零时执行 body，body 完成后再次检查。condition 的值由关联 handle 表示，可在设备 kernel 中调用 `cudaGraphSetConditional` 更新。

把一个去噪循环放进 WHILE，至少要有三个边界：

1. 请求开始时重置计数、完成标志、canvas、自条件缓冲和有效位置。
2. 每轮完成采样与停止判断后，更新计数和 condition，包含最大步数限制。
3. 图结束后，只在消费输出或提交 canvas 的边界建立必要的 host 等待。

```cuda
// 教学伪码：省略 tensor 参数、归约 kernel 和错误处理。
__global__ void update_condition(State* state, cudaGraphConditionalHandle handle) {
    if (blockIdx.x == 0 && threadIdx.x == 0) {
        state->step += 1;
        bool keep_running = !state->done && state->step < state->max_steps;
        cudaGraphSetConditional(handle, keep_running ? 1 : 0);
    }
}
```

`state->done` 必须由先完成的 GPU 工作写出。多个 CTA 的全局停止归约应通过独立归约阶段或受支持的同步协议完成，不能靠一个 CTA 提前读取其他 CTA 尚未完成的局部结果。counter 达到预算也必须令 condition 为零，避免永不退出。

条件 handle 的 default 与应用数据是两类状态。使用 `cudaGraphCondAssignDefault` 可在每次图启动时初始化 handle；它不会自动清空 `State`、自条件结果或 KV cache 的有效长度。不设置 default 时，程序应在上游节点显式写入本轮 condition，不能依赖上一次执行留下的值。默认 condition 为 1 会至少执行一轮；若预算为零或请求已完成，应在进入 WHILE 前将 condition 设为零。

<iframe src="../assets/inference/graph-loop.html" title="Host 循环与设备条件循环交互示意" loading="lazy" style="display:block;width:100%;height:600px;border:0;border-radius:16px;margin:1rem 0;"></iframe>

[单独打开循环演示](assets/inference/graph-loop.html)

### NVIDIA 示例的代码路径

CUDA samples 的 [`graphConditionalNodes.cu`](https://github.com/NVIDIA/cuda-samples/blob/5443602d89ed99aede2e4b7bf329daddeadb320e/cpp/3_CUDA_Features/graphConditionalNodes/graphConditionalNodes.cu) 提供可核对的顺序：

```cpp
// 摘录 simpleDoWhileGraph，省略声明和错误处理。
cudaGraphConditionalHandleCreate(
    &handle, graph, 1, cudaGraphCondAssignDefault);
cudaGraphNodeParams params = {cudaGraphNodeTypeConditional};
params.conditional.handle = handle;
params.conditional.type = cudaGraphCondTypeWhile;
params.conditional.size = 1;
cudaGraphAddNode(&conditionalNode, graph, nullptr, nullptr, 0, &params);
cudaGraph_t body = params.conditional.phGraph_out[0];
```

随后通过 `cudaStreamBeginCaptureToGraph` 把 body kernel 记录到 `body`；末尾 kernel 递减设备计数，并在零时把 handle 设为零。`capturedWhileGraph` 展示另一种方式：上游 kernel 先写条件，使初始条件为零时 body 一次也不执行。默认 condition 为 1 的示例则至少执行一次 body。

这些示例用于说明 API 与控制流，不包含 Transformer、随机采样、动态专家路由或 batch 早停实现。迁移到模型时应先用固定小输入验证状态与重放，再逐段加入模型算子。

### DiffusionGemma 的语义边界

- prefix KV cache 在去噪轮中只读；当前 noisy canvas 的临时 K/V 与干净块提交后的缓存更新要区分。
- 不同 batch item 可以在不同轮完成。GPU 固定 batch 路径可冻结已完成项，但活跃项继续循环；条件应按实际的整体退出规则归约。
- `self-conditioning` 需要上一轮分布形成的输入。ping-pong buffer 的交换应通过设备状态或固定的奇偶路径表达，不能假设 host 指针交换被自动捕获。
- 最后一轮不再被消费的自条件投影可依据活跃性跳过；仍用于采样、停止、输出或其他 batch item 的计算必须保留。
- 随机数状态是语义的一部分。PyTorch 的图安全 RNG 机制、原生 CUDA 或自定义 kernel 的 RNG 协议应分别核对，避免每次 replay 无意重用同一随机序列。

## 支持范围与降级路径

[CUDA Graph 官方文档](https://docs.nvidia.com/cuda/cuda-programming-guide/04-special-topics/cuda-graphs.html#conditional-graph-nodes) 列出 conditional body 的节点种类与设备要求：body 节点需位于同一设备，支持的 node 类型也有限制，不能将任意 host 回调或跨设备逻辑直接装进 body。

上述 sample 对基础条件节点检查 driver 版本不低于 CUDA 12.3；IF/ELSE、SWITCH 另有更高版本门槛。版本数字只是该示例的入门门槛，不足以证明某个模型拓扑在 GB10、指定 driver、toolkit 和推理框架上完整可用。应检查 API 返回值，运行最小 conditional body，再验证真实 kernel 的捕获与重放；不兼容时保留 host 控制或普通固定图 replay 路径。

conditional WHILE、设备端 `cudaGraphLaunch`、persistent kernel 是不同机制。conditional WHILE 由图条件节点调度 body；设备端 `cudaGraphLaunch` 使用设备图启动 API；persistent kernel 将控制放进长期驻留 kernel。三者的限制、占用与库兼容性不同。

## 优化收益的验证

若一轮 GPU 工作时间为 $t_g$，轮间无法隐藏的 host 等待为 $t_h$，设备条件更新与调度的每轮额外成本为 $t_c$，执行 $N$ 轮，教学近似为

$$
T_{\mathrm{host}}\approx N(t_g+t_h),\qquad
T_{\mathrm{graph}}\approx N(t_g+t_c)+t_{\mathrm{launch}}.
$$

这个估算把每轮成本视为常数，并省略流水重叠、缓存与占用变化。实际收益要在固定去噪步数、精度与采样配置下测量，再放开提前停止比较端到端行为。若图化之后步数或输出质量改变，就不能把总延迟变化全部归因于减少 CPU 调度。

对照至少包括 host 循环、普通 graph replay 和 conditional WHILE 三种运行方式。记录冷启动、稳态 kernel 时间、轮间空隙、实际步数和第一可用 canvas 时间。图执行保持了更多 GPU 工作连续性，也可能改变功率曲线；能耗需单独测量。

## 资料

- [CUDA Programming Guide：CUDA Graphs](https://docs.nvidia.com/cuda/cuda-programming-guide/04-special-topics/cuda-graphs.html)
- [CUDA Samples：Conditional Nodes](https://github.com/NVIDIA/cuda-samples/tree/5443602d89ed99aede2e4b7bf329daddeadb320e/cpp/3_CUDA_Features/graphConditionalNodes)
- [PyTorch：CUDA Graphs](https://docs.pytorch.org/docs/stable/notes/cuda.html#cuda-graphs)
- [GPU 推理性能测量](gpu-inference-profiling.md)
