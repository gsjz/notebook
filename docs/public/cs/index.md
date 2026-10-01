# Computer Science

这些笔记围绕计算机组成、操作系统、网络和数据结构展开。基础部分侧重定义、模型条件与可推演的计算过程；工程部分讨论真实系统的实现差异，以及能够验证判断的实验和诊断方法。

## 复习与实践路径

| 主题 | 学习顺序 | 应能独立完成的任务 |
| --- | --- | --- |
| 指令执行 | 汇编语言 → CPU 数据通路 → 总线与 DMA | 写出有效地址和微操作，区分有符号/无符号条件，计算传输时间 |
| 存储系统 | 存储层次 → 主存 → 外部存储 | 分解地址，计算命中代价、芯片扩展、交叉访问和磁盘时延 |
| 操作系统 | 进程与同步 → 内存 → 文件与 I/O | 分清状态变化与上下文切换，分析缺页、共享和持久化条件 |
| 网络 | 分层与数据单位 → 地址与转发 → 协议算法 | 逐跳追踪首部，完成 CIDR、分片、窗口、吞吐量与路由计算 |
| 数据结构 | MST 与贪心证明 → 多路搜索树 → 树状数组扩展 | 说明不变量与适用条件，独立验算算法和复杂度 |

做题时先确定教材模型和题目假设，再计算单位、边界和数量级；阅读现代实现时，则关注哪些假设已改变。实践类工具页按配置、验证和排障组织，不要求将所有工具细节纳入考试记忆。

各页的例题用于检验关键关系，参考答案默认折叠。工程扩展附公开资料入口，涉及具体产品的结论限定到相应实现或版本。

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

## 数据结构

- [树状数组](/public/cs/fenwick-tree/)
- [最小生成树](/public/cs/minimum-spanning-tree/)
- [B 树与 B+ 树](/public/cs/b-tree-b-plus-tree/)

## 容器与虚拟化技术

- [Docker 与 Docker Compose 基础](/public/cs/docker-compose-basics/)

## 高性能计算

下列主题保留为后续专题规划，当前的相关概念分散在 DMA、存储、操作系统和网络笔记中。

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

- CUDA 编程模型与 Kernel 执行
- GPU 内存层次与主机设备数据传输
- CPU-GPU 协同与性能分析

### NUMA 与内存亲和性

- NUMA 架构与跨节点内存访问
- CPU、线程与内存绑定
- NUMA 感知的数据布局与性能测试

### 高性能存储

- NVMe 与 SSD I/O 路径
- io_uring 与异步 I/O
- 页缓存、直接 I/O 与存储性能测试

## 实用技能

### 文本处理

- [正则表达式基础](/public/cs/regular-expression-basics/)
- [小狼毫配置](/public/cs/rime-weasel-config/)
