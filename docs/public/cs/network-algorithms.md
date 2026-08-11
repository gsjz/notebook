# 计算机网络常见算法与计算过程

!!! abstract "本文要点"
    本文整理计算机网络中容易以“算法步骤”和“计算题”出现的内容：

    - 链路层：CRC、滑动窗口 ARQ、CSMA/CD 退避与最短帧长。
    - 网络层：最长前缀匹配、距离向量、链路状态和 BGP 路由选择。
    - 传输层：TCP 拥塞窗口的慢开始、拥塞避免、快重传和快恢复。
    - 408 做题时如何把协议描述转成表格、窗口、路径或曲线。

## 先建立算法地图

计算机网络里的“算法”不只指出现在算法课里的图算法。很多协议的关键动作，本质上也是一套可重复执行的计算规则。

| 层次 | 常见算法 / 过程 | 主要解决的问题 |
| --- | --- | --- |
| 数据链路层 | CRC | 检测帧中比特是否出错 |
| 数据链路层 | 停止-等待、GBN、SR | 在不可靠链路上实现确认、重传和流量控制 |
| 数据链路层 | CSMA/CD 退避 | 多站点共享信道时，冲突后何时重传 |
| 网络层 | 最长前缀匹配 | 路由器收到 IP 分组后选择哪条转发表项 |
| 网络层 | 距离向量、链路状态 | 路由器如何生成和更新路由表 |
| 传输层 | TCP 拥塞控制 | 发送方如何根据网络反馈调节发送速率 |

!!! tip "学习顺序"
    先学“单个报文如何被检查和转发”，也就是 CRC 与最长前缀匹配；再学“多个报文如何连续发送”，也就是滑动窗口；最后学“网络中多个节点如何协同”，也就是路由算法与拥塞控制。

## 缩写速查

| 缩写 | 英文全称 | 中文含义 |
| --- | --- | --- |
| CRC | Cyclic Redundancy Check | 循环冗余校验 |
| FCS | Frame Check Sequence | 帧检验序列 |
| ACK | Acknowledgment | 确认 |
| ARQ | Automatic Repeat reQuest | 自动重传请求 |
| GBN | Go-Back-N | 后退 N 帧 |
| SR | Selective Repeat | 选择重传 |
| CSMA/CD | Carrier Sense Multiple Access with Collision Detection | 载波监听多路访问 / 冲突检测 |
| CIDR | Classless Inter-Domain Routing | 无类别域间路由 |
| RIP | Routing Information Protocol | 路由信息协议 |
| OSPF | Open Shortest Path First | 开放最短路径优先 |
| BGP | Border Gateway Protocol | 边界网关协议 |
| TCP | Transmission Control Protocol | 传输控制协议 |
| UDP | User Datagram Protocol | 用户数据报协议 |
| ARP | Address Resolution Protocol | 地址解析协议 |
| MAC | Media Access Control | 媒体访问控制 |
| IP | Internet Protocol | 网际协议 |
| RTT | Round-Trip Time | 往返时延 |
| rwnd | receive window | 接收窗口 |
| cwnd | congestion window | 拥塞窗口 |
| ssthresh | slow start threshold | 慢开始门限 |
| AS-PATH | Autonomous System Path | 自治系统路径 |
| NEXT-HOP | Next Hop | 下一跳 |

## CRC：把检错变成模 2 除法

!!! note "定义"
    CRC（Cyclic Redundancy Check，循环冗余校验）把待发送比特串看作二进制多项式。发送方用约定的生成多项式做模 2 除法，得到余数并附加到数据后面；接收方再用同一个生成多项式除整个接收串，若余数为 0，则认为未检测到差错。

CRC 的核心目标不是“把余数单独发过去”，而是构造一个新的发送串，使它能被生成多项式整除。这样接收方只要检查收到的整串是否仍能整除，就能判断传输过程中是否出现了可检测的比特差错。

发送方的计算步骤固定：

1. 设生成多项式对应的比特串长度为 $r+1$，则校验位长度为 $r$。
2. 在原数据 $M$ 后补 $r$ 个 0。
3. 用生成多项式比特串对补零后的串做模 2 除法，减法等价于按位异或。
4. 取 $r$ 位余数作为 FCS（Frame Check Sequence，帧检验序列），不足 $r$ 位时左侧补 0。
5. 用 FCS 替换第 2 步补上的 $r$ 个 0，发送串为 `原数据 + FCS`。

!!! warning "CRC 的运算不是普通二进制除法"
    模 2 除法没有借位和进位，关键操作是异或。看到“减去除数”时，不要按十进制或普通二进制减法处理。

模 2 除法手算时，可以按下面的动作重复：

1. 从当前被除串最左侧的 `1` 开始，把生成多项式与它对齐。
2. 对齐范围内逐位异或，`1 xor 1 = 0`，`1 xor 0 = 1`，`0 xor 0 = 0`。
3. 异或后忽略左侧已经变成 0 的部分，继续寻找下一个可对齐的 `1`。
4. 当剩余位数少于生成多项式长度时停止，剩下的 $r$ 位就是余数。

### CRC 伪代码

```cpp title="crc_pseudocode.cpp"
string mod2_divide(string bits, string generator) {
    int n = bits.size();
    int g = generator.size();

    for (int i = 0; i + g <= n; ++i) {
        if (bits[i] == '0') continue;

        for (int j = 0; j < g; ++j) {
            bits[i + j] = (bits[i + j] == generator[j]) ? '0' : '1';
        }
    }

    return bits.substr(n - (g - 1));  // 最后 r 位是余数
}

string make_crc_frame(string data, string generator) {
    int r = generator.size() - 1;
    string padded = data + string(r, '0');
    string fcs = mod2_divide(padded, generator);
    return data + fcs;
}

bool check_crc_frame(string received, string generator) {
    string rem = mod2_divide(received, generator);
    return all_of(rem.begin(), rem.end(), [](char bit) {
        return bit == '0';
    });
}
```

### 例 1：CRC 校验位

设原数据为 `101001`，生成多项式比特串为 `1101`。`1101` 长度为 4，因此 $r=3$。

```text
原数据后补 3 个 0：101001000
用 1101 做模 2 除法：

101001000
011101000   第 1 次异或：从第 1 位的 1 开始，对齐 1101
000111000   第 2 次异或：从第 2 位的 1 开始，对齐 1101
000001100   第 3 次异或：从第 4 位的 1 开始，对齐 1101
000000001   第 4 次异或：从第 6 位的 1 开始，对齐 1101

余数：001
最终发送串：101001001
```

接收方收到帧后，不再补 0，而是直接用同一个生成多项式去除整个接收串：

- 若余数为 `000`，表示 CRC 未检测出差错，接收方可以接受该帧并继续交给上层。
- 若余数不为 `000`，表示检测到差错，接收方通常丢弃该帧；是否重传由具体链路层协议或上层协议决定。

!!! warning "余数为 0 不等于绝对没有出错"
    CRC 的判定语义是“未检测到差错”，不是数学上保证传输完全正确。只是在合理选择生成多项式时，常见差错被漏检的概率很低。

## 滑动窗口：流量控制与连续发送

滑动窗口首先是一种**流量控制**机制：接收方用接收窗口约束发送方，避免发送方把接收端缓存打爆。它同时也把“发一个、等一个”的串行过程改成“窗口内可连续发送”，从而提高链路利用率。

它的本质是一段连续的序号许可区间：落在窗口内的帧才允许发送或接收，落在窗口外的帧暂时不能处理。

发送方维护发送窗口，接收方维护接收窗口：

- **发送窗口** $W_T$：发送方最多允许有多少个已发送但未确认的帧。
- **接收窗口** $W_R$：接收方当前愿意接收哪些序号的帧。

从发送方视角看，序号轴可以分成四段：

```text
已确认 | 已发送但未确认 | 窗口内尚未发送 | 暂不允许发送
       ^              ^                ^
       窗口左边界      下一个待发序号      窗口右边界
```

窗口左边界通常指向“最早还没有被确认的帧”。发送方收到确认后，左边界向前移动，右边界也跟着向前移动，于是新的帧进入发送窗口。

!!! note "窗口滑动依赖 ACK"
    发送方不是“发完就滑动”，而是“收到确认才滑动”。如果窗口内的帧都已经发送但还没有确认，发送方即使还有更多数据，也必须暂停等待 ACK 或等待超时重传。

正常传输时，滑动窗口按下面的节奏运行：

1. 发送方连续发送落在发送窗口内的帧，并保存副本以备重传。
2. 接收方检查帧是否正确、序号是否落在接收窗口内。
3. 接收方对可接受的帧返回 ACK；错误帧、窗口外帧通常丢弃。
4. 发送方收到 ACK 后，把已经被确认的帧移出发送窗口。
5. 新序号进入发送窗口，发送方继续发送后续帧。

### 为什么要滑动窗口

从流量控制角度看，滑动窗口要解决的问题是：发送方不能只按自己的速度连续发送，而要受接收方当前接收能力约束。接收窗口指出“哪些序号现在可以收”；发送窗口据此限制“哪些帧现在可以发”。如果接收方暂时接收不了，数据链路层常见做法是不继续确认可接收的新帧，发送方窗口就无法继续前移。

从传输效率角度看，停止等待的主要问题是信道利用率低。发送方发出 1 个帧后，必须等 ACK（Acknowledgment，确认）回来才能继续发；在传播时延较大、帧发送时延较短的链路上，信道大部分时间都处于空闲状态。

!!! note "滑动窗口的动机"
    滑动窗口有两层动机：第一，做流量控制，让接收方通过接收窗口限制发送方；第二，提高利用率，把“等待 ACK 的时间”也用起来。ACK 还没回来时，只要发送窗口里还有未发送序号，发送方就可以继续发后续帧。窗口大小 $N$ 足够大时，连续 ARQ 可以把链路填满；窗口太小时，发送方仍会停下来等 ACK。

!!! warning "数据链路层和传输层的窗口控制不同"
    数据链路层的滑动窗口通常控制相邻节点之间的帧传输，窗口大小常由协议或题目固定给出；传输层的窗口控制端到端的数据传输，TCP 接收方会在确认报文段中通告接收窗口 `rwnd`，发送方还要同时受拥塞窗口 `cwnd` 限制。

从利用率公式也能看出这个差别。设 $RTT$（Round-Trip Time，往返时延）表示从发送方发出信息到收到对方响应所经历的往返传播时间，停止等待近似为：

$$
U=\frac{T_D}{T_D+RTT+T_A}
$$

连续 ARQ（Automatic Repeat reQuest，自动重传请求）允许一个往返周期内连续发送 $N$ 个帧，理想无差错时：

$$
U=\min\left(1,\frac{NT_D}{T_D+RTT+T_A}\right)
$$

这里的关键信息差是：滑动窗口不是单纯为了“更优雅地处理乱序”，而是先用窗口建立发送许可和接收能力边界，再在这个边界内尽量连续发送。GBN 和 SR 是在“已经决定连续发送”之后，对出错和失序帧采取的两种不同处理策略。

!!! warning "GBN 的底层假设"
    GBN 看起来浪费，是因为它用简单接收端换取较高的正常传输效率。它隐含的典型前提是：相邻链路基本按序传输，误码率不高，乱序多由前面的帧丢失或出错造成；接收方不缓存失序帧，ACK 也主要做累积确认。在这些前提下，GBN 大多数时间可以连续发送，偶尔出错才回退重传。

若链路误码率高、带宽时延积大，或失序帧很多，GBN 的浪费会明显放大。此时 SR 更合适，因为接收端愿意缓存失序帧，发送端只重传真正丢失或出错的帧。

### 停止等待、GBN 与 SR

| 协议 | 发送窗口 | 接收窗口 | 主要好处 | 代价 |
| --- | ---: | ---: | --- | --- |
| 停止-等待 | $1$ | $1$ | 机制最简单 | RTT 内大量等待，利用率低 |
| GBN | $>1$ | $1$ | 连续发送，接收端简单，ACK 开销低 | 前面丢一帧，后面失序帧会被丢弃，可能回退重传 |
| SR | $>1$ | $>1$ | 只重传丢失 / 出错帧，减少带宽浪费 | 接收端要缓存失序帧，发送端确认和计时更复杂 |

停止等待是滑动窗口的特例：发送窗口和接收窗口都只有 1。发送方每发一个帧就停下，等这个帧被确认后才能发下一个帧。

!!! note "停止等待中的 WT 和 WR"
    在协议意义上，停止等待一定是 $W_T=1,\ W_R=1$：发送方最多只能有 1 个已发送但未确认帧，接收方也只期待当前这 1 个序号的帧。这里说的是“滑动窗口协议窗口大小”，不是设备物理缓存容量；接收方机器可以有更大的缓存，但停止等待协议不会用它来缓存多个失序帧。

GBN（Go-Back-N，后退 N 帧）的特点是“发送端可连续，接收端只按序”。接收方只接受当前期望的那个序号，后续帧即使正确到达，只要前面缺了一帧，也会被当作失序帧丢弃。若某帧超时，发送方从这帧开始，把后面已经发送但尚未确认的帧一起重传。

SR（Selective Repeat，选择重传）的特点是“发送端可连续，接收端可缓存”。接收方可以接收并缓存落在接收窗口内的失序帧；等缺失的较小序号帧到达后，再把连续的一段帧按序交给上层。发送方通常为每个未确认帧分别计时，哪个帧超时就重传哪个帧。

!!! tip "怎么判断该用哪种协议"
    停止等待适合先理解可靠传输的最小模型；GBN 适合误码率低、希望接收端简单、ACK 开销小的链路；SR 适合误码率较高或带宽时延积较大、不希望因为一个帧丢失而重传一整段数据的场景。三者不是“谁绝对先进”，而是在利用率、缓存、确认复杂度和重传浪费之间取舍。

!!! note "GBN 与 SR 的根本差别"
    GBN 的接收窗口为 1，所以接收方只接受当前期望序号；SR 的接收窗口大于 1，所以接收方可以先缓存正确但失序的帧。差别不在“谁更可靠”，而在是否允许接收端暂存失序帧。

!!! warning "ACK 的含义要看协议"
    GBN 常用累积确认：`ACK n` 表示 `n` 号及以前的帧都已正确收到，下一步期望 `n+1`。SR 通常逐帧确认：`ACK n` 只确认 `n` 号帧。若题目另行规定 ACK 编号含义，以题干为准。

### 滑动窗口伪代码

下面的伪代码只表达状态变化，省略真实计时器、缓冲区和链路收发细节。

```cpp title="sliding_window_pseudocode.cpp"
struct Sender {
    int base;      // 最早未确认序号
    int nextSeq;   // 下一个待发送序号
    int WT;        // 发送窗口大小
};

bool in_send_window(Sender s, int seq) {
    return s.base <= seq && seq < s.base + s.WT;
}

void send_while_allowed(Sender& s) {
    while (in_send_window(s, s.nextSeq) && has_data_to_send()) {
        send_frame(s.nextSeq);
        save_copy_for_retransmission(s.nextSeq);
        ++s.nextSeq;
    }
}

void on_cumulative_ack_gbn(Sender& s, int ack) {
    // 约定 ACK n 表示 n 之前都已按序收到，下一步期待 n
    if (ack > s.base) {
        remove_confirmed_frames(s.base, ack - 1);
        s.base = ack;
    }
    send_while_allowed(s);
}

void on_timeout_gbn(Sender& s) {
    // 从最早未确认帧开始，重传所有已发送但未确认帧
    for (int seq = s.base; seq < s.nextSeq; ++seq) {
        retransmit_frame(seq);
    }
}

void on_ack_sr(int seq) {
    mark_confirmed(seq);
    while (is_confirmed(sender.base)) {
        remove_copy(sender.base);
        ++sender.base;
    }
    send_while_allowed(sender);
}

void on_timeout_sr(int seq) {
    // 哪个帧超时，只重传哪个帧
    retransmit_frame(seq);
}
```

```cpp title="receiver_pseudocode.cpp"
void receive_gbn(int seq, bool ok) {
    if (ok && seq == expected) {
        deliver_to_upper_layer(seq);
        ++expected;
    }
    send_ack(expected);  // 累积确认：我下一步期待 expected
}

void receive_sr(int seq, bool ok) {
    if (!ok || !in_receive_window(seq)) {
        return;  // 出错或窗口外，丢弃
    }

    buffer[seq] = true;
    send_ack(seq);  // 逐帧确认

    while (buffer[expected]) {
        deliver_to_upper_layer(expected);
        buffer[expected] = false;
        ++expected;
        slide_receive_window();
    }
}
```

### 例 2：窗口如何向前滑动

假设用 3 bit 编号，序号为 `0` 到 `7` 循环使用，发送窗口 $W_T=4$。初始发送窗口为：

```text
{0, 1, 2, 3}
```

发送方先连续发送 `0`、`1`、`2`，此时窗口内 `3` 还可以继续发送。如果发送方收到累积确认 `ACK 1`，表示 `0`、`1` 都已经正确到达，则发送窗口左边界越过 `0`、`1`，新窗口变为：

```text
{2, 3, 4, 5}
```

这时 `2` 仍是最早未确认帧，`3`、`4`、`5` 是当前允许发送的序号。若后来收到 `ACK 2`，窗口继续滑到 `{3, 4, 5, 6}`。

!!! tip "做窗口题先画两条线"
    一条线画发送窗口：标出“已发送未确认”和“还能发送”。另一条线画接收窗口：标出“当前期望序号”和“是否能缓存失序帧”。只要这两条线清楚，GBN 和 SR 的重传范围通常就能直接看出来。

### 序号空间约束

若用 $n$ bit 给帧编号，则可用序号数为 $2^n$。

- 停止-等待：只需区分新帧和重传帧，1 bit 序号即可。
- GBN：$1 < W_T \le 2^n - 1$，且 $W_R=1$。
- SR：通常要求 $W_T+W_R\le 2^n$，并常取 $W_T=W_R=2^{n-1}$。

!!! warning "为什么窗口不能随便放大"
    序号会循环使用。窗口过大时，接收方可能无法判断某个序号代表“新一轮的帧”还是“上一轮的重传帧”。滑动窗口题的本质就是避免这种歧义。

!!! warning "序号空间题只看链路层滑动窗口"
    这里的 $W_T$、$W_R$ 约束是数据链路层滑动窗口的序号空间约束。TCP 的 `rwnd`、`cwnd` 是另一组端到端窗口变量，不用代入 $W_T+W_R\le 2^n$ 这类题型。

### 信道利用率

停止-等待协议中，一个发送周期通常包含数据帧发送时延、往返时延和确认帧发送时延：

$$
U=\frac{T_D}{T_D+RTT+T_A}
$$

连续 ARQ 若发送窗口大小为 $N$，理想无差错时：

$$
U=\min\left(1,\frac{NT_D}{T_D+RTT+T_A}\right)
$$

其中 $T_D$ 是一个数据帧的发送时延，$T_A$ 是一个确认帧的发送时延。若题目说明“忽略确认帧发送时延”，就取 $T_A=0$。

!!! tip "窗口利用率题"
    先算“从开始发送第一个帧到收到它的 ACK”这段时间内，信道最多能发送多少帧。若窗口小于这个数量，发送方会停下来等 ACK；若窗口足够大，信道可以被连续占满。

## CSMA/CD：冲突检测与二进制指数退避

CSMA/CD（Carrier Sense Multiple Access with Collision Detection，载波监听多路访问 / 冲突检测）用于共享介质的有线局域网场景，可概括为：

```text
先听后发，边听边发，冲突停发，随机重发
```

由于信号传播需要时间，一个站点刚开始发送后，最迟要经过端到端往返传播时延 $2\tau$ 才能确认是否发生冲突。因此 $2\tau$ 称为争用期或冲突窗口。

最短帧长由争用期内可发送的数据量决定：

$$
\text{最短帧长}=2\times\text{最大单向传播时延}\times\text{数据传输速率}
$$

!!! warning "最短帧长的意义"
    最短帧长不是为了让帧“更好看”，而是为了保证发送站在发完帧之前仍有机会检测到最远端可能产生的冲突。若帧太短，发送站可能已经发完并认为成功，但冲突其实正在传播回来。

冲突后的截断二进制指数退避规则：

1. 基本退避时间为一个争用期 $2\tau$。
2. 第 $i$ 次重传时，取 $k=\min(i,10)$。
3. 从 $\{0,1,\cdots,2^k-1\}$ 中随机选 $r$。
4. 等待 $r$ 个争用期，即等待 $2r\tau$ 后重试。
5. 若连续重传 16 次仍失败，放弃该帧并向高层报告。

### CSMA/CD 退避伪代码

```cpp title="csma_cd_backoff_pseudocode.cpp"
void send_with_csma_cd(Frame frame) {
    for (int attempt = 0; attempt < 16; ++attempt) {
        while (channel_is_busy()) {
            wait_until_idle();
        }

        start_transmitting(frame);

        if (!collision_detected_during_slot_time()) {
            finish_transmitting(frame);
            return;
        }

        abort_transmission();
        send_jam_signal();

        int k = min(attempt + 1, 10);
        int r = random_int(0, (1 << k) - 1);
        wait(r * slot_time);  // slot_time = 2 * 最大单向传播时延
    }

    report_failure_to_upper_layer(frame);
}
```

### 例 3：退避时间范围

某站点第 3 次重传，争用期为 $51.2\mu s$。此时 $k=3$，可选随机数为：

```text
r in {0, 1, 2, 3, 4, 5, 6, 7}
```

等待时间范围为：

```text
0 到 7 * 51.2us
```

即最大等待 $358.4\mu s$ 后再尝试发送。

## 最长前缀匹配：转发表查找算法

路由器收到 IP（Internet Protocol，网际协议）分组后，只根据目的 IP 地址查转发表。采用 CIDR（Classless Inter-Domain Routing，无类别域间路由）时，同一个目的地址可能匹配多条路由，此时选择前缀最长的一条。

!!! success "一句话"
    前缀越长，地址块越小，路由越具体；最长前缀匹配就是选择最具体的可匹配路由。

查找过程可以写成：

```cpp title="longest_prefix_match_pseudocode.cpp"
struct RouteEntry {
    uint32_t prefix;
    uint32_t mask;
    int prefixLen;
    string nextHop;
};

optional<RouteEntry> longest_prefix_match(uint32_t dst, vector<RouteEntry> table) {
    optional<RouteEntry> best = nullopt;

    for (RouteEntry e : table) {
        bool match = (dst & e.mask) == e.prefix;
        if (!match) continue;

        if (!best.has_value() || e.prefixLen > best->prefixLen) {
            best = e;
        }
    }

    return best;  // 若为空，表示无匹配路由
}

void forward_packet(Packet p, vector<RouteEntry> table) {
    auto route = longest_prefix_match(p.dstIP, table);
    if (!route.has_value()) {
        report_destination_unreachable(p);
        return;
    }
    send_to_next_hop(p, route->nextHop);
}
```

特殊路由也能纳入前缀长度理解：

| 路由类型 | 写法 | 匹配优先级 |
| --- | --- | --- |
| 特定主机路由 | `a.b.c.d/32` | 最高 |
| 普通网络路由 | 如 `192.168.1.0/24` | 按前缀长度比较 |
| 默认路由 | `0.0.0.0/0` | 最低 |

## 路由算法：距离向量与链路状态

路由算法用于生成路由表；转发算法用于对每个到达的分组查表并送往下一跳。二者容易混在一起。

!!! note "路由与转发"
    路由选择是控制平面问题：路由器之间交换信息，计算路由表。转发是数据平面问题：单个路由器根据转发表处理每个分组。

### 距离向量

距离向量算法基于 Bellman-Ford 思想。节点 $x$ 到目的节点 $y$ 的最短距离满足：

$$
d_x(y)=\min_v\{c(x,v)+d_v(y)\}
$$

其中 $v$ 是 $x$ 的邻居，$c(x,v)$ 是 $x$ 到邻居 $v$ 的链路代价，$d_v(y)$ 是邻居 $v$ 到目的 $y$ 的已知距离。

每个节点维护：

- 到各直接邻居的链路费用。
- 自己到各目的网络的距离向量。
- 从邻居收到的距离向量副本。

更新时，节点只和直接邻居交换信息；若根据邻居的新向量算出更短路径，就更新自己的距离向量并继续通告。

```cpp title="distance_vector_pseudocode.cpp"
void update_distance_vector(Node x, vector<Node> neighbors) {
    for (Destination y : all_destinations) {
        int bestCost = INF;
        Node bestNextHop = NONE;

        for (Node v : neighbors) {
            int candidate = cost[x][v] + distance[v][y];
            if (candidate < bestCost) {
                bestCost = candidate;
                bestNextHop = v;
            }
        }

        if (bestCost != distance[x][y]) {
            distance[x][y] = bestCost;
            nextHop[x][y] = bestNextHop;
            mark_changed(x);
        }
    }

    if (changed(x)) {
        send_vector_to_neighbors(x);
    }
}
```

!!! warning "RIP 的度量不是时延"
    RIP 使用跳数作为距离，选择的是跳数最少路径，不一定是传播时延、带宽或排队时延意义上的最快路径。RIP 中距离 16 表示不可达。

### 链路状态

链路状态算法的思路相反：每个路由器把自己的直连链路状态通过洪泛传播给全网，使每个路由器获得一致的拓扑视图，然后各自运行 Dijkstra 算法。

```cpp title="link_state_pseudocode.cpp"
void link_state_routing(Router self) {
    LinkStatePacket lsp = build_lsp_from_local_links(self);
    flood_to_all_routers(lsp);

    Graph graph = collect_link_state_database();
    map<Router, int> dist;
    map<Router, Router> parent;

    dijkstra(graph, self, dist, parent);

    for (Network dst : all_destination_networks) {
        Router next = first_hop_on_shortest_path(self, dst, parent);
        routingTable[dst] = next;
    }
}
```

| 对比项 | 距离向量 | 链路状态 |
| --- | --- | --- |
| 典型协议 | RIP（Routing Information Protocol，路由信息协议） | OSPF（Open Shortest Path First，开放最短路径优先） |
| 信息来源 | 直接邻居的距离向量 | 全网链路状态数据库 |
| 交换范围 | 与邻居交换 | 链路状态信息在区域内洪泛 |
| 计算依据 | 邻居告诉我的距离 | 自己掌握的拓扑图 |
| 常见特点 | 简单，但坏消息收敛慢 | 收敛较快，开销和实现更复杂 |

!!! tip "做路由算法题"
    距离向量题通常填表：先把邻居发来的距离全部加上到该邻居的链路代价，再逐项取最小值。链路状态题通常画图：先确认所有边和代价，再从源点运行最短路径算法。

### BGP 的策略选择

BGP（Border Gateway Protocol，边界网关协议）属于自治系统之间的路由协议，它通常不追求严格意义上的全局最短路径，而是按策略选择一条可达且较好的路由。

常见优先顺序可以概括为：

1. 优先选择本地偏好值更高的路由。
2. 若本地偏好相同，优先选择 AS-PATH 更短的路由。
3. 若仍无法区分，常用热土豆路由思想，让分组尽快离开本自治系统。

```cpp title="bgp_policy_pseudocode.cpp"
Route choose_bgp_route(vector<Route> routes) {
    Route best = routes[0];

    for (Route r : routes) {
        if (r.localPref != best.localPref) {
            if (r.localPref > best.localPref) best = r;
            continue;
        }

        if (r.asPathLength != best.asPathLength) {
            if (r.asPathLength < best.asPathLength) best = r;
            continue;
        }

        // 热土豆：出口越近，越早把分组交给外部 AS
        if (r.igpCostToNextHop < best.igpCostToNextHop) {
            best = r;
        }
    }

    return best;
}
```

!!! warning "BGP 不是 Dijkstra"
    BGP 路由选择会受到商业、策略和自治系统边界影响。看到 AS-PATH（Autonomous System Path，自治系统路径）、NEXT-HOP（Next Hop，下一跳）、本地偏好这类字段时，不要把题目当成普通最短路径题。

## TCP 拥塞控制：画 cwnd 曲线

TCP（Transmission Control Protocol，传输控制协议）发送方同时受接收窗口和拥塞窗口限制：

$$
\text{发送窗口上限}=\min(rwnd,cwnd)
$$

其中 $rwnd$（receive window，接收窗口）由接收方通告，反映接收能力；$cwnd$（congestion window，拥塞窗口）由发送方根据网络拥塞状况维护，反映网络承载能力。

### 慢开始与拥塞避免

慢开始从较小的 $cwnd$ 开始试探网络。常见教材题中，可按每个 RTT 观察：

- 当 $cwnd<ssthresh$（slow start threshold，慢开始门限）时，慢开始，$cwnd$ 近似按 $1,2,4,8,\cdots$ 指数增长。
- 当 $cwnd\ge ssthresh$ 后，进入拥塞避免，$cwnd$ 近似每个 RTT 加 1。

!!! note "慢开始并不慢"
    “慢”指起点小，不是增长慢。慢开始阶段的增长速度是指数级；拥塞避免阶段才是线性增长。

发生超时时，通常按下面规则处理：

```text
ssthresh = max(cwnd / 2, 2)
cwnd = 1
重新进入慢开始
```

### 快重传与快恢复

收到 3 个冗余 ACK 时，发送方通常认为某个报文段丢失，但网络未必严重拥塞，于是：

```text
立即重传丢失报文段
ssthresh = max(cwnd / 2, 2)
cwnd = ssthresh
进入拥塞避免
```

```cpp title="tcp_congestion_pseudocode.cpp"
void on_ack() {
    if (cwnd < ssthresh) {
        // 慢开始：每个 RTT 近似翻倍
        cwnd += 1;
    } else {
        // 拥塞避免：每个 RTT 近似加 1
        cwnd += 1.0 / cwnd;
    }
}

void on_timeout() {
    ssthresh = max(cwnd / 2, 2.0);
    cwnd = 1;
    state = SLOW_START;
}

void on_three_duplicate_ack() {
    ssthresh = max(cwnd / 2, 2.0);
    retransmit_lost_segment();
    cwnd = ssthresh;
    state = CONGESTION_AVOIDANCE;
}

double send_window_limit() {
    return min(rwnd, cwnd);
}
```

!!! warning "超时和 3 个冗余 ACK 不一样"
    超时通常按严重拥塞处理，$cwnd$ 回到 1；3 个冗余 ACK 表明后续报文段仍能到达接收方，所以快恢复通常让 $cwnd$ 减半后继续线性增长。

## 408 / 应试补充

### 常考公式

| 场景 | 公式 / 规则 |
| --- | --- |
| CRC 校验位长度 | 生成多项式位串长度为 $r+1$，FCS 长度为 $r$ |
| 停止-等待利用率 | $U=T_D/(T_D+RTT+T_A)$ |
| 连续 ARQ 利用率 | $U=\min(1,NT_D/(T_D+RTT+T_A))$ |
| GBN 窗口 | $1<W_T\le 2^n-1,\ W_R=1$ |
| SR 窗口 | $W_T+W_R\le 2^n$，常取 $W_T=W_R=2^{n-1}$ |
| CSMA/CD 最短帧长 | $2\times$ 最大单向传播时延 $\times$ 数据传输速率 |
| TCP 发送窗口 | $\min(rwnd,cwnd)$ |

### 易混点速记

- CRC 能检错，不负责纠错；接收方通常是发现出错后丢弃。
- GBN 的 ACK 是累积确认；SR 的 ACK 通常是逐帧确认。
- GBN 出错后“从错处往后重传”；SR 出错后“只重传错的帧”。
- 数据链路层滑动窗口常是相邻节点控制；TCP 滑动窗口是端到端控制。
- 流量控制看接收方是否来得及收；拥塞控制看网络是否承受得住。
- 路由表中存的是下一跳，不是从源到目的的完整路径。
- ARP 解析下一跳的 MAC 地址，不会把下一跳 IP 写进 IP 首部。
- RIP 是应用层协议，使用 UDP；OSPF 直接封装在 IP 中；BGP 基于 TCP。

### 建议做题方法

!!! tip "把文字题转成状态题"
    CRC 题写出补零串和异或余数；窗口题画发送窗口、接收窗口和 ACK；路由题画表或图；TCP 拥塞控制题画 $cwnd$ 随 RTT 变化的折线。网络题的失误，大多来自只读文字、不落状态。

!!! success "最终结论"
    计算机网络算法题的核心不是背协议名，而是抓住“谁维护状态、状态何时变化、变化后如何继续发送或转发”。能把这三件事写清楚，CRC、窗口、路由和拥塞控制就会变成同一类题。
