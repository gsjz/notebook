# 树状数组

树状数组（Fenwick tree）把前缀分解成若干长度为二的幂的连续块。常规实现以 $O(n)$ 空间支持 $O(\log n)$ 的单点增量与前缀和查询，适合动态计数、频率统计、逆序对和离线扫描。它的扩展能力取决于所维护运算的性质；把整数换成结构体后，更新复杂度未必保持不变。

## 区间表示与基本操作

采用从 $1$ 开始的下标。对正整数 $i$，定义

$$
\operatorname{lowbit}(i)=i\mathbin{\&}(-i),\qquad
T_i=\sum_{j=i-\operatorname{lowbit}(i)+1}^{i} A_j.
$$

在常见的补码表示下，`i & -i` 提取最低有效位。查询前缀时不断减去该值，得到不重叠且恰好覆盖前缀的区间；修改时不断加上该值，找到所有包含修改位置的结点。

```cpp title="fenwick_sum.cpp"
struct Fenwick {
    int n;
    std::vector<long long> tree;

    explicit Fenwick(int n) : n(n), tree(n + 1, 0) {}

    void add(int pos, long long delta) {  // 1 <= pos <= n
        for (int i = pos; i <= n; i += i & -i)
            tree[i] += delta;
    }

    long long prefix(int r) const {      // 0 <= r <= n
        long long result = 0;
        for (int i = r; i > 0; i -= i & -i)
            result += tree[i];
        return result;
    }

    long long range(int l, int r) const { // 1 <= l <= r <= n
        return prefix(r) - prefix(l - 1);
    }
};
```

代码需包含 `<vector>`。下标 $0$ 不能传入 `add`，否则步长为零；区间赋值也不能直接当作增量，须保留旧值，计算新旧值之差。总和可能超过单个元素的范围，应按总量选择整数类型。

坐标压缩只保留大小关系。统计“比当前值小的元素个数”时可使用压缩后的排名；若计算区间实际长度或面积，还须保留原坐标差。

## 运算性质与扩展边界

前缀查询只要求区间合并满足结合律，并有可表示的空区间单位元。常规增量更新还要求可以把本次变化正确传播到包含该点的各块；加法和异或都满足这种要求。任意区间由两个前缀相减，则进一步依赖逆运算。

| 信息 | 常规更新 | 查询与限制 |
| --- | --- | --- |
| 和、异或 | 单点增量或异或更新 | 前缀及任意区间均可由两个前缀得到 |
| 前缀最小值 | 仅使值减小的单调更新 | 任意增大可能使旧最小值失效；也不能相减得到区间最小值 |
| 有序字符串拼接、矩阵乘积 | 不能普遍沿用简单增量更新 | 合并顺序不能交换 |
| 总和与最大前缀和 | 本文采用受影响块重建 | 查询 $O(\log n)$，更新 $O(\log^2 n)$ |

各位置的频率（原数组元素）均非负时，可利用树状数组上的二进制跳跃寻找第 $k$ 个元素，时间为 $O(\log n)$，要求 $1\le k\le\sum_i A_i$。若原数组含负数，前缀和可能不再单调，这种搜索的判定条件就失效。

## 总和与最大前缀和

对一个非空区间，保存总和 $s$ 与**非空前缀**的最大和 $p$。左右相邻区间合并时有

$$
(s_L,p_L)\circ(s_R,p_R)
=\left(s_L+s_R,\ \max(p_L,s_L+p_R)\right).
$$

最大前缀要么终止于左区间，要么经过整个左区间并继续进入右区间。这个合并满足结合律，但不满足交换律。例如序列 $[5,-8]$ 的最大前缀为 $5$，$[-8,5]$ 的最大前缀为 $-3$。

```cpp
struct Node {
    long long sum, pre;
};

Node mergeNode(Node left, Node right) {
    return {left.sum + right.sum,
            std::max(left.pre, left.sum + right.pre)};
}
```

查询前缀 $[1,13]$ 时，树状数组依次取出 $[13,13]$、$[9,12]$、$[1,8]$，访问顺序从右到左。因此新块必须放到累积结果左侧，即 `mergeNode(tree[i], result)`。

单点改变后，一个块的总和可以增量更新，但最大前缀可能来自任意位置，原来的最大值可能失效。本文保留每个原始元素，从右端单元素开始，用较小的树状数组块重新拼出受影响块：

```cpp
Node current = {a[x], a[x]};
for (int len = 1; len < (x & -x); len <<= 1)
    current = mergeNode(tree[x - len], current);
tree[x] = current;
```

例如重建 $[1,8]$，先取 $[8,8]$，再依次在左边拼接 $[7,7]$、$[5,6]$、$[1,4]$。更新沿祖先上升，所需的较小块已经更新或不受本次修改影响。祖先数量为 $O(\log n)$，每次重建至多合并 $O(\log n)$ 个块，故最坏更新为 $O(\log^2 n)$。

!!! question "例题：合并方向与全负数组"
    对数组 $[-2,5,-4]$ 查询整个前缀的最大非空前缀和。若把树状数组访问到的块追加到结果右侧，会得到什么结果？

    ??? success "参考答案"
        正确前缀和为 $-2,3,-1$，答案为 $3$。查询依次访问 $[-4]$ 与 $[-2,5]$；若错误地按访问顺序拼接，就会得到序列 $[-4,-2,5]$，其最大前缀和为 $-1$。

        对全负数组，最大非空前缀仍为负数。把查询初值设为允许空前缀的 $(0,0)$ 会改变定义；代码可显式处理“尚无结果”，避免使用有限负无穷并发生溢出。

## 区间计分的差分表示

!!! question "例题：POI 2015 Movie-goer"
    有 $m$ 种电影，第 $x$ 种电影的权值为正整数 $w_x$。连续 $n$ 天播放的电影编号为 $f_1,\ldots,f_n$。选择一个非空连续区间，仅对区间内恰好出现一次的电影计分，求最大总分。

    ??? success "推导与参考实现"
        固定右端点 $i$，令 $S_l$ 表示区间 $[l,i]$ 的得分。加入电影 $x=f_i$ 前，设它最近两次出现的位置为 $p$、$q$，没有出现的位置记作 $0$。

        | 左端点范围 | 加入前后出现次数 | 得分变化 |
        | --- | --- | --- |
        | $1\le l\le q$ | 至少两次，仍至少两次 | $0$ |
        | $q<l\le p$ | 一次变两次 | $-w_x$ |
        | $p<l\le i$ | 零次变一次 | $+w_x$ |

        用差分 $D_l=S_l-S_{l-1}$、$S_0=0$ 表示所有左端点的得分。两段区间增量对应

        $$
        D_{q+1}\mathrel{-}=w_x,\quad
        D_{p+1}\mathrel{+}=2w_x,\quad
        D_{i+1}\mathrel{-}=w_x.
        $$

        当 $p=q=0$ 时，前两项作用于同一位置，合并为 $D_1\mathrel{+}=w_x$，公式仍成立。每个 $S_l$ 都是差分前缀和，故查询 $D$ 在 $[1,i]$ 内的最大前缀即可得到当前最佳左端点。

        ```cpp title="poi2015_movie_goer.cpp"
        #include <algorithm>
        #include <cassert>
        #include <iostream>
        #include <vector>
        using namespace std;
        using ll = long long;

        struct Node { ll sum, pre; };

        Node mergeNode(Node left, Node right) {
            return {left.sum + right.sum,
                    max(left.pre, left.sum + right.pre)};
        }

        class PrefixMaxBIT {
            int n;
            vector<ll> a;
            vector<Node> tree;
        public:
            explicit PrefixMaxBIT(int n)
                : n(n), a(n + 1, 0), tree(n + 1, {0, 0}) {}

            void add(int pos, ll delta) {
                assert(1 <= pos && pos <= n);
                a[pos] += delta;
                for (int x = pos; x <= n; x += x & -x) {
                    Node current = {a[x], a[x]};
                    for (int len = 1; len < (x & -x); len <<= 1)
                        current = mergeNode(tree[x - len], current);
                    tree[x] = current;
                }
            }

            ll query(int r) const {
                assert(1 <= r && r <= n);
                Node result{0, 0};
                bool hasResult = false;
                for (int x = r; x > 0; x -= x & -x) {
                    result = hasResult ? mergeNode(tree[x], result) : tree[x];
                    hasResult = true;
                }
                return result.pre;
            }
        };

        int main() {
            ios::sync_with_stdio(false);
            cin.tie(nullptr);
            int n, m;
            cin >> n >> m;
            vector<int> movie(n + 1), last(m + 1, 0), previous(m + 1, 0);
            vector<ll> weight(m + 1);
            for (int i = 1; i <= n; ++i) cin >> movie[i];
            for (int x = 1; x <= m; ++x) cin >> weight[x];

            PrefixMaxBIT bit(n + 1);
            ll answer = 0;  // 正权值且 n >= 1
            for (int i = 1; i <= n; ++i) {
                int x = movie[i], p = last[x], q = previous[x];
                ll value = weight[x];
                bit.add(q + 1, -value);
                bit.add(p + 1, 2 * value);
                bit.add(i + 1, -value);
                answer = max(answer, bit.query(i));
                previous[x] = p;
                last[x] = i;
            }
            cout << answer << '\n';
        }
        ```

        时间复杂度为 $O(n\log^2 n+m)$，空间为 $O(n+m)$，数值运算要求总权值及中间和在 `long long` 范围内。若规模较大，直接维护 $S_l$ 的“区间加、全局最大值”懒标记线段树可将主循环降为 $O(n\log n)$。

## 实现选择与验证

普通求和树状数组的内存紧凑、循环简单，适合高频点更新；复杂可结合信息采用线段树往往更容易维持不变量。前述重建扩展的价值在于展示块分解，不能据此推断其速度必然优于线段树。大规模数据应比较真实负载中的更新/查询比例、缓存行为与常数成本。

备考中，树状数组通常作为前缀和、位运算和数据结构扩展的综合练习；应先掌握数组、树与复杂度基础，再学习该结构。与其背循环方向，更有用的是能够写出每个结点覆盖的区间，并解释修改后为何仍正确。

验证扩展实现时，使用含正负值的小数组随机修改，将查询与直接枚举前缀比较；电影题可枚举所有区间统计“恰好一次”的权值。应覆盖同种电影连续出现、隔位重复、只有一天及所有电影均不同的情况。

## 参考资料

- [CP-Algorithms：Fenwick Tree](https://cp-algorithms.com/data_structures/fenwick.html)，普通操作、区间扩展及最小值更新的限制
