# 树状数组

普通树状数组最常见的用法是维护前缀和，但它并不只能维护一个数。只要一段区间的信息可以由左右两个相邻区间合并得到，就可以把结点值换成结构体。

本文重点记录一种常见扩展：用树状数组维护区间总和与最大前缀和。

## 维护更复杂的信息

例如下面这个结构维护一段区间的：

- `sum`：区间总和；
- `pre`：区间最大前缀和。

```cpp
struct Node {
    long long sum, pre;
};

Node mergeNode(Node a, Node b) {
    return {
        a.sum + b.sum,
        max(a.pre, a.sum + b.pre)
    };
}
```

如果区间 `a` 在左边，区间 `b` 在右边，那么合并后的最大前缀有两种来源：

- 完全落在左区间，贡献是 `a.pre`；
- 覆盖整个左区间，再取右区间的一个前缀，贡献是 `a.sum + b.pre`。

所以：

$$
\operatorname{pre}(a+b)=\max(\operatorname{pre}(a),\operatorname{sum}(a)+\operatorname{pre}(b))
$$

## 查询时的循环体

树状数组查询前缀 `[1,r]` 时，访问结点的顺序是从右往左的。例如可能依次拿到：

$$
[13,13]\rightarrow[9,12]\rightarrow[1,8]
$$

但最大前缀和要求区间按真实顺序从左到右合并，所以循环里要把新取到的块放到当前答案前面：

```cpp
long long query(int r) {
    Node res = {0, -INF};
    for (int x = r; x > 0; x -= lowbit(x)) {
        res = mergeNode(t[x], res);
    }
    return res.pre;
}
```

这里不是写成 `mergeNode(res, t[x])`，因为 `t[x]` 对应的区间在当前 `res` 的左边。

## 修改时的循环体

普通求和树状数组可以直接写：

```cpp
t[x] += v;
```

但最大前缀和这类信息没有简单的逆运算。单点修改后，需要重新计算每个受影响结点 `t[x]`。

```cpp
void add(int pos, long long v) {
    a[pos] += v;
    for (int x = pos; x <= n; x += lowbit(x)) {
        Node cur = {a[x], a[x]};
        for (int len = 1; len < lowbit(x); len <<= 1) {
            cur = mergeNode(t[x - len], cur);
        }
        t[x] = cur;
    }
}
```


!!! question "例题：POI 2015 R1 Movie-goer"
    共有 $m$ 部电影，编号为 $1,2,\ldots,m$，第 $i$ 部电影的好看值为 $w_i$。

    在 $n$ 天之中，每天会放映一部电影，第 $i$ 天放映的是第 $f_i$ 部。你可以选择一个区间 $[l,r]$，观看这段时间内所有电影。如果同一部电影观看多于一次，则无法获得这部电影的好看值。求仅观看过一次的电影好看值总和的最大值。

    固定右端点 $i$，把每个左端点 $l$ 的当前答案看作一个数组。右端点加入新电影后，这个数组会发生分段加减；用差分数组承接这些区间修改，再用树状数组维护差分前缀的最大值。

    ??? success "参考代码"
        ```cpp title="poi2015_movie_goer.cpp"
        #include <bits/stdc++.h>

        using namespace std;

        using ll = long long;

        const ll INF = 1e18;
        const int N = 1e6 + 5;

        struct Node {
            ll sum, pre;
        };

        Node mergeNode(Node a, Node b) {
            return {a.sum + b.sum, max(a.pre, a.sum + b.pre)};
        }

        struct BIT {
            int n;
            vector<Node> t;
            vector<ll> a;

            BIT(int n) : n(n), t(n + 1, {0, 0}), a(n + 1, 0) {}

            int lowbit(int x) {
                return x & -x;
            }

            void add(int pos, ll v) {
                if (pos <= 0 || pos > n) return;
                a[pos] += v;
                for (int x = pos; x <= n; x += lowbit(x)) {
                    Node cur = {a[x], a[x]};
                    for (int len = 1; len < lowbit(x); len <<= 1) {
                        cur = mergeNode(t[x - len], cur);
                    }
                    t[x] = cur;
                }
            }

            ll query(int r) {
                Node res = {0, -INF};
                for (int x = r; x > 0; x -= lowbit(x)) {
                    res = mergeNode(t[x], res);
                }
                return res.pre;
            }
        };

        int n, m;
        int f[N], w[N], last[N], pre[N];

        void solve() {
            cin >> n >> m;
            for (int i = 1; i <= n; i++) cin >> f[i];
            for (int i = 1; i <= m; i++) cin >> w[i];

            BIT bit(n + 1);
            ll ans = 0;

            for (int i = 1; i <= n; i++) {
                int x = f[i];
                ll v = w[x];

                int p = last[x];
                int q = pre[x];

                if (p == 0) {
                    bit.add(1, v);
                } else {
                    bit.add(q + 1, -v);
                    bit.add(p + 1, 2 * v);
                }
                bit.add(i + 1, -v);

                ans = max(ans, bit.query(i));

                pre[x] = p;
                last[x] = i;
            }

            cout << ans << "\n";
        }

        int main() {
            ios::sync_with_stdio(false);
            cin.tie(nullptr);

            solve();
            return 0;
        }
        ```
