# CS & AI

这些笔记围绕计算机系统、算法、模型与推理展开。基础部分侧重定义、模型条件与可推演的计算过程；工程部分讨论真实系统的实现差异，以及能够验证判断的实验和诊断方法。

## 组成原理

### 存储系统

- [存储器概述](/public/cs/memory-system-overview/)
- [主存储器](/public/cs/main-memory/)
- [外部存储器](/public/cs/external-storage/)
- [DMA：直接存储器访问](/public/cs/dma/)

### 总线

- [总线](/public/cs/bus/)

### 指令与 CPU

- [汇编语言基础](/public/cs/assembly-basics/)
- [CPU 内部主要元件](/public/cs/cpu-components-overview/)

## 操作系统

- [操作系统主题总览](/public/cs/os-linux-overview/)

## 网络

### 网络基础

- [Web 请求与网络基础](/public/cs/web-network-basics/)
- [网络分层模型](/public/cs/network-layer-models/)
- [网络数据单位与封装开销](/public/cs/network-data-units/)
- [IP 地址](/public/cs/ip-addressing/)
- [网络基础、防火墙与 CIDR](/public/cs/network-firewall-cidr/)
- [计算机网络常见算法与计算过程](/public/cs/network-algorithms/)

### 应用与服务

- [电子邮件](/public/cs/network-email/)
- [SSH、HTTPS 与加密连接](/public/cs/ssh-overview/)
- [Nginx 基础](/public/cs/nginx-basics/)
- [自建 LLM API 个人聚合站](/public/cs/llm-api-gateway/)

## 数据结构

- [树状数组](/public/cs/fenwick-tree/)
- [最小生成树](/public/cs/minimum-spanning-tree/)
- [B 树与 B+ 树](/public/cs/b-tree-b-plus-tree/)

## 算法

- [组合博弈](/public/cs/combinatorial-game-theory/)
- [凸优化](/public/cs/convex-optimization/)

## 编码与信息表示

- [精度编码基础](/public/cs/precision-encoding/)
- [QR Code：二维码原理与浏览器生成](/public/cs/qr-code/)

## 模型与推理 { #model-inference }

- [Transformer 笔记](/public/cs/transformer/)
- [RoPE 旋转位置编码笔记](/public/cs/rope/)
- [KV Cache 笔记](/public/cs/kv-cache/)

### JAX 执行与编译

围绕官方 DiffusionGemma 实现，先理解数组与状态，再读编译、去噪循环和性能证据。四篇均配有小型代码与机制交互，可在 CPU 学习语义；GPU 性能结论需要目标设备上的验证。

| 顺序 | 笔记 | 对应能力 |
| --- | --- | --- |
| 1 | [JAX 数组、PyTree 与随机状态](jax-arrays-pytrees-random.md) | 追踪参数、canvas、自条件与随机 key |
| 2 | [JAX JIT、tracing 与编译缓存](jax-jit-compilation.md) | 区分首次编译、缓存复用与设备执行 |
| 3 | [JAX 控制流与 DiffusionGemma 去噪](jax-control-flow-diffusion.md) | 读懂循环 carry、提前停止与 batch 冻结 |
| 4 | [JAX 性能测量与 XLA 融合分析](jax-profiling-xla-fusion.md) | 正确计时，核对编译结果与实际 kernel |

继续做算子优化时，将这组笔记与下面的在线 softmax、CUDA Graph、GPU 性能测量配合阅读。XLA 控制流、编译器融合和手写 CUDA kernel 分别解决不同层面的执行问题。

### GPU 低延迟推理

从生成状态、硬件约束到算子和运行时，依次阅读下列专题。交互使用教学数据，实际性能结论需要对应设备上的测量。

| 层次 | 笔记 | 主要问题 |
| --- | --- | --- |
| 模型与状态 | [扩散语言模型的块式推理与停止语义](diffusion-language-model-inference.md) | 哪些状态能复用；每轮与每块何时结束 |
| 硬件与成本 | [GPU 内存层次、统一内存与 Roofline](gpu-memory-roofline.md) | GB10 上容量、带宽、算力和 launch 怎样约束性能 |
| 矩阵与布局 | [GPU 分块矩阵乘与 CuTe DSL](gpu-tiled-gemm-cute.md) | token 与专家矩阵如何映射到 tile、线程和资源 |
| 融合与归约 | [在线 softmax 与自条件投影融合](online-softmax-fusion.md) | 如何减少大词表概率物化，保持稳定归约 |
| 稀疏执行 | [MoE 分发与 grouped GEMM](moe-dispatch-grouped-gemm.md) | 分配、置换、offset、padding 与负载怎样影响执行 |
| 运行时 | [CUDA Graph：从异步提交到设备侧循环](cuda-graphs-device-loop.md) | 怎样减少逐轮主机提交，同时保留停止语义 |
| 验证与归因 | [GPU 推理性能测量与瓶颈归因](gpu-inference-profiling.md) | 如何分别验证 kernel、请求延迟、能耗与质量 |

阅读矩阵和融合两篇前，可先复习 [精度编码](precision-encoding.md) 中的存储位宽、scale 与累加精度；运行时与测量可并行阅读。一次优化从时间线定位开始，用依赖和数值分析约束实现，最后回到端到端测量。

## 部署与运行环境

- [Docker 与 Docker Compose 基础](/public/cs/docker-compose-basics/)
- [NVIDIA DGX Spark 使用报告](/public/cs/nvidia-dgx-spark-usage-report/)

## 高性能计算

已展开的 GPU 专题链接如下，其余条目保留为后续规划；存储、DMA、操作系统和网络笔记提供相邻基础。

### RDMA

- RDMA 数据路径与零拷贝
- Queue Pair、Completion Queue 与 Memory Region
- RDMA verbs 与基本通信流程

### InfiniBand 与 RoCE

- InfiniBand 网络拓扑与核心组件
- RoCEv2 网络配置与 PFC、ECN
- InfiniBand 与 RoCE 的适用场景

### 高性能网络通信

- 延迟、带宽与吞吐量测试
- 零拷贝与内核旁路技术
- 高性能 TCP/UDP 通信模型

### 并行计算模型

- 共享内存与分布式内存模型
- OpenMP 线程并行
- MPI 进程间通信

### GPU 加速计算

- [内存层次、统一内存与 Roofline](gpu-memory-roofline.md)
- [GEMM 分块与 CuTe](gpu-tiled-gemm-cute.md)
- [推理性能剖析](gpu-inference-profiling.md)

### NUMA 与内存亲和性

- NUMA 架构与跨节点内存访问
- CPU、线程与内存绑定
- NUMA 感知的数据布局与性能测试

### 高性能存储

- NVMe 与 SSD I/O 路径
- io_uring 与异步 I/O
- 页缓存、直接 I/O 与存储性能测试

### 计算图优化

- [在线 softmax 与加权投影融合](online-softmax-fusion.md)
- [CUDA Graph 与设备侧循环](cuda-graphs-device-loop.md)
- layout transform
- graph partition

### ARM 矢量算子优化

- NEON
- SVE / SME
- 低精度 kernel
- cache blocking

### 多架构后端适配

- TensorRT
- QNN
- OpenVINO
- ONNX Runtime Execution Provider

## 实用技能

### 文本处理

- [正则表达式基础](/public/cs/regular-expression-basics/)
- [小狼毫配置](/public/cs/rime-weasel-config/)
