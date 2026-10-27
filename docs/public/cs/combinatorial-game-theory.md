# 组合博弈

## 正常规则下的无偏博弈

组合博弈研究双方轮流操作离散局面的策略。以下讨论完全信息、没有随机因素的双人游戏，并要求每局在有限步内结束。

- **正常规则**：轮到某位玩家时，如果没有合法操作，该玩家输。
- **无偏游戏**：同一个局面下，双方可采取的合法操作相同；具体由谁行动不影响操作集合。
- **局面图**：用顶点表示局面，用有向边表示一步合法操作。有限无环的局面图保证游戏终止。

DAG 上轮流移动棋子、每次从一堆石子中取走若干颗，都是常见模型。以下结论依赖正常规则和无偏性；修改终局规则或双方的操作权限后，需要重新分析。

## 必胜态与必败态

胜负均相对于**当前行动者**，并假设双方采取最优策略。

| 局面类型 | 判定条件 |
| --- | --- |
| 必败态 | 没有合法操作，或所有合法操作都走向必胜态 |
| 必胜态 | 至少存在一个合法操作走向必败态 |

沿局面图的逆拓扑序即可计算胜负。这个二值信息足以分析单个游戏；多个独立游戏组合时，需要用更细的状态值描述每个子游戏。

## Sprague–Grundy 函数

对局面 $v$ 定义 SG 值（Grundy 值）：

$$
g(v)=\operatorname{mex}\{g(u)\mid v\to u\}.
$$

$\operatorname{mex}$ 是集合中未出现的最小非负整数，例如 $\operatorname{mex}\{0,2,3\}=1$，$\operatorname{mex}\varnothing=0$。因此无合法操作的局面有 $g(v)=0$。

这个定义给出两个性质：

1. 从 $v$ 出发，无法一步走到 SG 值仍为 $g(v)$ 的局面。
2. 对每个 $0\le t<g(v)$，至少存在一个后继 $u$ 满足 $g(u)=t$。

由胜负递推可知，$g(v)=0$ 对应必败态，$g(v)\ne0$ 对应必胜态。有限 DAG 上按逆拓扑序计算 SG 值即可，顶点编号不一定符合拓扑序。

## 独立游戏之和

若各子游戏互不影响，且每轮恰好选择一个子游戏执行一步操作，整体称为这些游戏的**独立和**。设各子游戏当前局面为 $a_1,\ldots,a_k$，Sprague–Grundy 定理给出整体 SG 值：

$$
s=g(a_1)\oplus g(a_2)\oplus\cdots\oplus g(a_k),
$$

其中 $\oplus$ 是按位异或。整体局面必胜当且仅当 $s\ne0$。

- $s=0$ 时，一步操作只改变一个子游戏的 SG 值，且新旧值不同，所以新的总异或必定非零。
- $s\ne0$ 时，取 $s$ 的最高置位，并选择在该位为 $1$ 的某个 SG 值 $g(a_i)$。令 $t=g(a_i)\oplus s$，则 $t<g(a_i)$，mex 的性质保证可以走到 SG 值为 $t$ 的后继，使总异或变为零。

因此多个独立游戏的联合局面可压缩成一个异或值。若题目还包含选择初始局面的过程，就可在这个压缩状态之上继续做博弈动态规划。

## 例题：Clever Game

!!! question "题意：Clever Game"
    来源：[Codeforces Gym 106714 E — Clever Game](https://codeforces.com/gym/106714/problem/E)。

    给定包含 $2^n$ 个顶点、$m$ 条边的有向无环图（DAG），顶点编号为 $0$ 到 $2^n-1$。图上有 $k$ 个棋子，允许多个棋子位于同一个顶点。玩家轮流选择一个棋子，沿一条出边移动一步；无法移动者输。

    初始位置由另一段博弈决定。两人按行优先顺序填写一个 $k\times n$ 的二进制矩阵，每次选择当前格填 $0$ 或 $1$，First 先填。第 $i$ 行给出第 $i$ 个棋子的位置 $a_i$，**第 $1$ 列是最低位**，以后各列依次升位。填完矩阵后，DAG 上的移动仍由 First 先手，与最后一个格由谁填写无关。

    两人在整个过程中都采取最优策略。最终 First 获胜输出 `First`，否则输出 `Second`。

    数据范围为 $1\le n\le14$、$1\le m\le8\times10^4$、$1\le k\le20$。输入只有一组数据：第一行是 $n,m,k$，随后是 $m$ 条边，不会给出初始位置。

    ??? success "解题方向"
        先用 SG 值把多个棋子的局面压缩成一个异或值，再把交替填位写成 OR/AND 递推。利用边数限制 SG 值的范围，并用位集同时处理所有异或状态。

### DAG 游戏的 Grundy 值

棋子之间不互相阻挡，每次移动只改变一个棋子，因此固定初始位置后，移动阶段满足独立和的条件。按逆拓扑序求出各顶点的 $g(v)$，再计算初始总异或 $s$，即可判定 First 在移动阶段能否获胜。

填写矩阵阶段的目标随之确定：First 希望最终 $s\ne0$，Second 希望最终 $s=0$。注意矩阵填完后仍由 First 先移动，所以这一胜负条件与填写阶段的最后行动者无关。

### 异或状态的上界

记顶点数为 $N=2^n$，最大 Grundy 值为 $d$。若存在一个值为 $d$ 的顶点，它必须有出边到 Grundy 值分别为 $0,1,\ldots,d-1$ 的顶点。

这些顶点互不相同；值为 $t$ 的顶点至少有 $t$ 条出边。按不同源点统计边数，得到

$$
m\ge0+1+\cdots+d=\frac{d(d+1)}2.
$$

由 $m\le80000$ 可知 $d\le399$。令 $Q$ 为严格大于 $d$ 的最小二次幂，则 $Q\le512$。所有 Grundy 值以及它们的任意异或都在 $[0,Q)$ 内；实现中根据实际的 $d$ 选择 $Q$，无需固定开到上界。

这使动态规划只需记录最多 $512$ 个异或状态，无需保存每个棋子的具体位置。

### 一行上的交替量词

定义 $H_i[s]$：前 $i$ 行已经填写完，其 Grundy 异或为 $s$，剩余格子由双方最优填写时，First 能否最终获胜。其中 $0\le i\le k$，$0\le s<Q$。

矩阵全部填完时：

$$
H_k[s]=[s\ne0].
$$

倒序计算 $H_i$。正在填写的是下标为 $i$ 的行，即第 $i+1$ 行。如果它最终组成整数 $a$，对应的终端状态为

$$
L_a[s]=H_{i+1}[s\oplus g(a)].
$$

这一行的位按 $0,1,\ldots,n-1$ 的顺序填写。位 $j$ 的全局位置为 $in+j$（从 $0$ 开始），偶数位置由 First 决定，奇数位置由 Second 决定。

| 当前选择者 | 合并两个取值的结果 | 含义 |
| --- | --- | --- |
| First | OR | 存在一个选择能让 First 获胜 |
| Second | AND | 两个选择都让 First 获胜，Second 才无法阻止 |

最后填的最高位是最内层选择，须**从位 $n-1$ 到位 $0$ 倒序合并**。处理位 $j$ 时，对所有 $0\le b<2^j$，把下标 $b$ 与 $b+2^j$ 对应的结果取 OR 或 AND，存回下标 $b$。此前已处理高位的结果都保存在高位为零的下标中。

例如 $n=2$ 且本行由 First 开始，固定一个异或状态后，有

$$
H_i[s]=(L_0[s]\land L_2[s])\lor(L_1[s]\land L_3[s]).
$$

First 决定最低位，Second 决定最高位，所以先配对 $(0,2)$、$(1,3)$，再合并两个结果。按相邻下标先配对 $(0,1)$ 会改变填写顺序。

当 $n$ 为奇数时，相邻两行的开始者交替；当 $n$ 为偶数时，每行都由 First 开始。代码统一通过 $in+j$ 的奇偶判断。

### 位集与异或置换

将 $H_i$ 存成长度为 $Q$ 的位集，一共使用

$$
W=\left\lceil\frac Q{64}\right\rceil\le8
$$

个 64 位机器字。一次按字 OR/AND 可同时处理 $64$ 个异或状态。

每轮预计算所有异或置换：

$$
P_y[s]=H_{i+1}[s\oplus y],\qquad 0\le y<Q.
$$

先令 $P_0=H_{i+1}$。对 $y>0$，取它最低的置位 $b$，并令 $p=y\oplus2^b$。由于 $p<y$，$P_p$ 已经计算好，且

$$
P_y[s]=P_p[s\oplus2^b].
$$

只需把位集下标的第 $b$ 位翻转：

- $b<6$：在每个机器字内部，交换宽度为 $2^b$ 的相邻位块，用固定掩码完成。
- $b\ge6$：字内位号不变，目标机器字 $w$ 来自源机器字 $w\oplus2^{b-6}$。

最后，对每个顶点编号 $a$，把 $P_{g(a)}$ 复制为 $L_a$。**置换量是 $g(a)$，不是顶点编号 $a$。** 随后执行量词树的 OR/AND 归并，下标为零的位集就是 $H_i$。

### 正确性

终止状态 $H_k[s]=[s\ne0]$ 由 Sprague–Grundy 定理成立。

假设 $H_{i+1}$ 已正确计算。当前行填成 $a$ 后，已有异或恰好变为 $s\oplus g(a)$，所以每个叶子 $L_a[s]$ 都正确。对最后一个格，First 控制时取两个结果的 OR，Second 控制时取 AND，恰好表达各自最优策略。依次向前处理其余格，便得到这整行的最优结果 $H_i[s]$。

异或置换的递推精确生成了这些叶子，位并行运算对每个 $s$ 分别执行相同的布尔递推。因此由逆向归纳，所有 $H_i$ 都正确。初始尚未填任何行，已有异或为零，答案为 $H_0[0]$。

### 复杂度

拓扑排序和 Grundy 计算为 $O(N+m)$：mex 的扫描次数不超过出度加一，可用时间戳数组避免每次清空。

每行生成置换需要 $O(QW)$，生成叶子和合并分别需要 $O(NW)$。由于 $Q\le N$，总时间为

$$
O(N+m+kNW),
$$

空间为 $O(N+m+NW)$。最大规模下 $N=16384$、$W=8$，叶子位集共占 $1$ MiB。

### C++17 实现

```cpp title="clever_game.cpp"
#include <bits/stdc++.h>
using namespace std;
using U64 = uint64_t;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m, k;
    cin >> n >> m >> k;
    const int N = 1 << n;

    vector<vector<int>> graph(N);
    vector<int> indegree(N);
    for (int i = 0; i < m; ++i) {
        int u, v;
        cin >> u >> v;
        graph[u].push_back(v);
        ++indegree[v];
    }

    queue<int> pending;
    for (int v = 0; v < N; ++v)
        if (indegree[v] == 0) pending.push(v);

    vector<int> order;
    order.reserve(N);
    while (!pending.empty()) {
        int v = pending.front();
        pending.pop();
        order.push_back(v);
        for (int to : graph[v])
            if (--indegree[to] == 0) pending.push(to);
    }

    vector<int> grundy(N), mark(N + 1);
    int stamp = 0, maxGrundy = 0;
    for (auto it = order.rbegin(); it != order.rend(); ++it) {
        int v = *it;
        ++stamp;
        for (int to : graph[v]) mark[grundy[to]] = stamp;
        while (mark[grundy[v]] == stamp) ++grundy[v];
        maxGrundy = max(maxGrundy, grundy[v]);
    }

    int Q = 1;
    while (Q <= maxGrundy) Q <<= 1;
    const int W = (Q + 63) / 64;

    vector<U64> h(W);
    for (int s = 1; s < Q; ++s)
        h[s >> 6] |= U64{1} << (s & 63);

    const U64 masks[6] = {
        0x5555555555555555ULL, 0x3333333333333333ULL,
        0x0f0f0f0f0f0f0f0fULL, 0x00ff00ff00ff00ffULL,
        0x0000ffff0000ffffULL, 0x00000000ffffffffULL
    };

    vector<U64> shifted(static_cast<size_t>(Q) * W);
    vector<U64> leaves(static_cast<size_t>(N) * W);

    for (int row = k - 1; row >= 0; --row) {
        copy(h.begin(), h.end(), shifted.begin()); // P_0
        for (int y = 1; y < Q; ++y) {
            int b = __builtin_ctz(static_cast<unsigned>(y));
            int previous = y ^ (1 << b);
            U64* dst = shifted.data() + static_cast<size_t>(y) * W;
            const U64* src = shifted.data()
                           + static_cast<size_t>(previous) * W;
            if (b < 6) {
                int width = 1 << b;
                for (int word = 0; word < W; ++word)
                    dst[word] = ((src[word] & masks[b]) << width)
                              | ((src[word] >> width) & masks[b]);
            } else {
                int offset = 1 << (b - 6);
                for (int word = 0; word < W; ++word)
                    dst[word] = src[word ^ offset];
            }
        }

        for (int a = 0; a < N; ++a) {
            const U64* src = shifted.data()
                           + static_cast<size_t>(grundy[a]) * W;
            U64* dst = leaves.data() + static_cast<size_t>(a) * W;
            copy_n(src, W, dst);
        }

        for (int bit = n - 1; bit >= 0; --bit) {
            int half = 1 << bit;
            bool firstChooses = ((row * n + bit) % 2 == 0);
            for (int base = 0; base < half; ++base) {
                U64* left = leaves.data() + static_cast<size_t>(base) * W;
                const U64* right = leaves.data()
                                 + static_cast<size_t>(base + half) * W;
                for (int word = 0; word < W; ++word) {
                    if (firstChooses)
                        left[word] |= right[word];
                    else
                        left[word] &= right[word];
                }
            }
        }
        copy_n(leaves.data(), W, h.data());
    }

    cout << ((h[0] & 1) ? "First\n" : "Second\n");
}
```

当 $Q<64$ 时仍分配一个机器字，高位补零。所有置换量都小于 $Q$，不会把无效位交换进有效状态，因此无需额外处理这些填充位。

### 样例中的控制权

!!! question "样例 1：First 控制影响胜负的位"
    $n=2,k=2$，边为 $1\to0$、$3\to2$，因此 $g(0),g(1),g(2),g(3)$ 分别为 $0,1,0,1$。谁获胜？

    ??? success "参考答案"
        Grundy 值只取决于顶点最低位。每行的最低位都由 First 填写，他可令两个棋子的 Grundy 值分别为 $0$ 和 $1$，保证异或非零，输出 `First`。

!!! question "样例 2：Second 控制影响胜负的位"
    $n=2,k=2$，边为 $3\to1$、$2\to0$，因此四个 Grundy 值分别为 $0,0,1,1$。谁获胜？

    ??? success "参考答案"
        Grundy 值只取决于最高位。两个最高位都由 Second 填写，可以让它们相同，使异或为零，输出 `Second`。
