# Computer Science

主要包括 408 内容。

## 组成原理

### 数据的表示和运算

- [【动画】补码：模环、取反加一与真值](/public/cs/animations/twos-complement.html)
- [【动画】补码加减法器与标志位](/public/cs/animations/adder-flags.html)
- [【动画】迭代乘除：部分积、试商与恢复](/public/cs/animations/iterative-mul-div.html)
- [【动画】IEEE 754 单精度编码](/public/cs/animations/ieee754-encoding.html)
- [【动画】浮点加减：对阶、规格化与舍入](/public/cs/animations/float-addition.html)
- [【动画】大小端存储与边界对齐](/public/cs/animations/endian-alignment.html)

### 存储系统

- [存储器概述](/public/cs/memory-system-overview/)
- [主存储器](/public/cs/main-memory/)
- [外部存储器](/public/cs/external-storage/)
- [【动画】DRAM 行列寻址、行缓冲与刷新](/public/cs/animations/dram-row-refresh.html)
- [【动画】低位交叉存储与轮流启动](/public/cs/animations/interleaved-memory.html)
- [【动画】磁盘访问时间：寻道、旋转等待与传输](/public/cs/animations/disk-access-time.html)
- [【动画】Cache 映射与命中判断](/public/cs/animations/cache-mapping-lookup.html)
- [【动画】Cache LRU 替换与写策略](/public/cs/animations/cache-lru-write.html)
- [【动画】TLB、页表与 Cache 访问链路](/public/cs/animations/tlb-cache-page-walk.html)

### 指令系统

- [汇编语言基础](/public/cs/assembly-basics/)
- [【动画】扩展操作码：地址字段让位给操作码](/public/cs/animations/extended-opcode.html)
- [【动画】寻址方式：形式地址到有效地址](/public/cs/animations/addressing-modes-ea.html)
- [【动画】条件转移与循环的机器级执行](/public/cs/animations/branch-loop-machine-code.html)
- [【动画】过程调用：call、栈帧与 ret](/public/cs/animations/procedure-call-stack.html)
- [【动画】CISC 与 RISC 执行路径对比](/public/cs/animations/cisc-risc-execution.html)

### 中央处理器

- [CPU 内部主要元件](/public/cs/cpu-components-overview/)
- [【动画】指令周期与处理器执行模型](/public/cs/animations/instruction-cycle-models.html)
- [【动画】单总线数据通路微操作](/public/cs/animations/single-bus-datapath.html)
- [【动画】单周期数据通路：控制信号选择数据流](/public/cs/animations/single-cycle-datapath-mux.html)
- [【动画】微程序控制器：机器指令到微指令序列](/public/cs/animations/microprogram-controller.html)
- [【动画】五段流水线与冒险处理](/public/cs/animations/pipeline-hazards.html)
- [【动画】CPU 异常与中断响应过程](/public/cs/animations/exception-interrupt-cpu.html)

### 总线

- [【动画】总线结构演进](/public/cs/animations/bus-structure-evolution.html)
- [【动画】总线仲裁与读事务](/public/cs/animations/bus-arbitration-transaction.html)
- [【动画】非突发与突发传输](/public/cs/animations/burst-transfer.html)
- [【动画】总线带宽与平均传输率](/public/cs/animations/bus-bandwidth-rate.html)
- [【动画】异步总线握手](/public/cs/animations/async-handshake.html)
- [【动画】总线定时方式对比](/public/cs/animations/bus-timing-modes.html)

### 输入/输出系统

- [充电协议总览](/public/cs/charging-protocols/)
- [【动画】I/O 接口端口与编址方式](/public/cs/animations/io-interface-ports-addressing.html)
- [【动画】I/O 程序查询循环](/public/cs/animations/io-polling-loop.html)
- [【动画】程序中断响应与向量定位](/public/cs/animations/io-interrupt-vector.html)
- [【动画】中断屏蔽字与多重中断](/public/cs/animations/interrupt-mask-nesting.html)
- [【动画】DMA 传送过程与总线共享](/public/cs/animations/dma-transfer-cycle.html)

### 其它

- [GPU 编程入门](/public/cs/gpu-programming-basics/)
- [【动画】存储程序、系统元件与指令执行循环](/public/cs/animations/stored-program.html)
- [【动画】源程序到可执行文件](/public/cs/animations/source-to-executable.html)
- [【动画】计算机系统层次与 ISA 边界](/public/cs/animations/system-layers-isa.html)
- [【动画】CPU 性能指标联动](/public/cs/animations/performance-metrics.html)

## 操作系统

- [操作系统主题总览](/public/cs/os-linux-overview/)
- [Linux 常用命令](/public/cs/linux-common-commands/)
- [Linux 服务器网络排障：DNS、代理、Tailscale 与 Nginx](/public/cs/linux-server-network-troubleshooting/)

## 网络

### 物理层

- [全双工与半双工](/public/cs/network-duplex-modes/)
- [【动画】信道容量：奈氏准则与香农定理](/public/cs/animations/cn-channel-capacity.html)
- [【动画】数字数据编码为数字信号](/public/cs/animations/cn-line-encoding.html)

### 数据链路层

- [数据链路层功能与服务题目整理](/public/cs/network-data-link-layer-functions-services/)
- [透明与透明传输](/public/cs/network-transparent-transmission/)
- [【动画】零比特填充与帧定界](/public/cs/animations/cn-bit-stuffing.html)
- [【动画】滑动窗口：停止等待、GBN 与 SR](/public/cs/animations/cn-sliding-window-arq.html)

### 网络层

- [虚电路与数据报](/public/cs/network-virtual-circuit-datagram/)
- [IP 地址](/public/cs/ip-addressing/)
- [网络基础、防火墙与 CIDR](/public/cs/network-firewall-cidr/)
- [【动画】IPv4 分片：MTU、MF 与片偏移](/public/cs/animations/cn-ip-fragmentation.html)
- [【动画】最长前缀匹配与路由转发](/public/cs/animations/cn-longest-prefix-routing.html)

### 传输层

- [【动画】TCP 三次握手与四次挥手](/public/cs/animations/cn-tcp-handshake-close.html)
- [【动画】TCP 拥塞控制：慢开始、拥塞避免与快恢复](/public/cs/animations/cn-tcp-congestion-control.html)

### 应用层

- [电子邮件](/public/cs/network-email/)
- [SSH、HTTPS 与加密连接](/public/cs/ssh-overview/)
- [Nginx 基础](/public/cs/nginx-basics/)
- [【动画】DNS 递归与迭代解析](/public/cs/animations/cn-dns-resolution.html)
- [【动画】HTTP 页面加载：非持续、持续与流水线](/public/cs/animations/cn-http-page-load.html)

### 其它

- [从建立网站理解网络基础](/public/cs/web-network-basics/)
- [网络分层模型](/public/cs/network-layer-models/)
- [各层典型数据单位](/public/cs/network-data-units/)
- [计算机网络常见算法与计算过程](/public/cs/network-algorithms/)
- [【动画】交换方式：电路、报文与分组](/public/cs/animations/cn-switching-modes.html)
- [【动画】协议栈封装与解封装](/public/cs/animations/cn-encapsulation-stack.html)

## 数据结构

- [AVL 树](/public/cs/avl-tree/)
- [红黑树](/public/cs/red-black-tree/)
- [B 树与 B+ 树](/public/cs/b-tree-b-plus-tree/)

### 动画

- [AVL 树操作过程](/public/cs/animations/avl-tree-operations.html)
- [红黑树各操作过程](/public/cs/animations/red-black-tree-operations.html)
- [B 树与 B+ 树操作过程](/public/cs/animations/b-tree-bplus-operations.html)
