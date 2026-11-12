# 最小生成树

给定无向带权图 $G=(V,E)$，最小生成树（MST）在连通所有顶点的生成树中，使边权总和最小。设顶点数为 $n$、边数为 $m$；连通图的生成树恰有 $n-1$ 条边。负边权不妨碍 MST 算法，重边可以参与比较，自环不可能进入生成树。原图不连通时，只能得到最小生成森林。

MST 最小化整棵树的总成本，单源最短路径树最小化从指定源到各点的距离。例如三角形的边权分别为 $w(AB)=2$、$w(AC)=2$、$w(BC)=1$：以 $A$ 为源的最短路径树总权为 $4$，MST 总权为 $3$。网络层链路状态路由所用的 Dijkstra 属于前一类距离问题，不能用 MST 替代。

## 割、环与安全边

将顶点分成两个非空集合构成一个割，端点分属两边的边称为跨割边。若当前已经选择的边集可扩展成某棵 MST，且没有已选边跨越该割，则一条最轻跨割边可以安全加入。

证明采用交换论证：取一棵包含已选边的 MST。如果它不含候选边，加入候选边会形成环；环上必有另一条跨割边，其权值不小于候选边。替换后仍为生成树且权重不增加，原先已选的边也未被删除。

由此得到两个常用判断：

- 某割上**唯一最轻**的边属于所有 MST；若有并列最轻边，只能保证某条指定的最轻边属于至少一棵 MST。
- 某环上**唯一最重**的边不属于任何 MST；存在并列最大值时，不能仅凭“最大”判定某条边必然排除。

所有边权互异足以保证 MST 唯一，但不是必要条件。例如图本身就是一棵树，即使边权相同，生成树仍唯一。

## Kruskal 与 Prim

### Kruskal 的连通块合并

Kruskal 按边权非降序处理边，只接受连接两个不同连通块的边。并查集维护连通性；每次接受边都使连通块数减少一，接受 $n-1$ 条后即可结束。

```cpp title="kruskal.cpp"
#include <algorithm>
#include <numeric>
#include <optional>
#include <vector>
using namespace std;

struct DSU {
    vector<int> parent, size;
    explicit DSU(int n) : parent(n + 1), size(n + 1, 1) {
        iota(parent.begin(), parent.end(), 0);
    }
    int find(int x) {
        return parent[x] == x ? x : parent[x] = find(parent[x]);
    }
    bool unite(int a, int b) {
        a = find(a); b = find(b);
        if (a == b) return false;
        if (size[a] < size[b]) swap(a, b);
        parent[b] = a;
        size[a] += size[b];
        return true;
    }
};

struct Edge { int u, v; long long weight; };

optional<long long> kruskal(int n, vector<Edge> edges) {
    sort(edges.begin(), edges.end(), [](const Edge& a, const Edge& b) {
        return a.weight < b.weight;
    });
    DSU dsu(n);
    long long total = 0;
    int selected = 0;
    for (const auto& edge : edges) {
        if (!dsu.unite(edge.u, edge.v)) continue;
        total += edge.weight;
        if (++selected == n - 1) break;
    }
    if (selected != n - 1) return nullopt;
    return total;
}
```

代码使用 C++17，要求 $n\ge1$、顶点编号合法且权重总和不溢出。返回 `nullopt` 表示不连通；不能在允许负权的通用函数里把 $-1$ 同时用作失败标记和合法总权值。

排序耗时 $O(m\log m)$，按大小合并与路径压缩的并查集总开销为 $O(m\alpha(n))$，初始化为 $O(n)$。通常排序主导；边数组与并查集占用 $O(m+n)$ 空间。

### Prim 的割边选择

Prim 保持一棵连通的局部树。对每个未加入顶点 $v$，维护它与当前树之间的最小边权；每步取这些候选值中的最小者。这里比较的是单条跨割边权，Dijkstra 比较的则是源点到候选顶点的累计路径长度。

| 实现 | 时间 | 适用条件 |
| --- | --- | --- |
| 矩阵或即时计算边权的 Prim | $O(n^2)$ | 图稠密，或可用常数时间计算任意两点边权 |
| 邻接表与支持减小键的二叉堆 | $O((n+m)\log n)$ | 稀疏图，维护每个顶点的当前最优键 |
| 邻接表与懒删除优先队列 | $O(n+m\log m)$ | 实现简单，允许多份过期候选项 |
| Kruskal | $O(n+m\log m)$ | 边显式给出或可批量生成 |

隐式完全图不必先存下全部 $O(n^2)$ 条边：朴素 Prim 可以即时计算边权，以 $O(n)$ 额外空间完成。能否进一步稀疏化，需要证明删去的边不会改变某棵最优解。

!!! question "例题：选边次序与唯一性"
    无向图的边为 $AB=1$、$AC=1$、$BC=1$、$CD=2$、$BD=4$。求 MST 权重，判断哪些边必选，以及 MST 是否唯一。

    ??? success "参考答案"
        在三角形 $ABC$ 中任选两条边即可连通三个点，再取 $CD$ 连到 $D$，总权为 $1+1+2=4$。

        割 $\{D\}$ 的跨割边是 $CD$ 与 $BD$，其中 $CD$ 唯一最轻，因此必选。三角形内的三条边均可分别被排除，所以 MST 不唯一。相同边权下，Kruskal 的具体输出可随排序中的并列顺序变化。

## 建模与验证

若每个顶点既可以独立付费建站，也可以通过边接入其他站点，可加入虚点 $0$，令边 $(0,i)$ 的权重等于顶点 $i$ 的建站费用，再对扩展图求 MST。该转化要求目标是“每个点最终能连到某个站点”，并且费用可按这些边相加；容量限制、方向限制或可靠性冗余会改变问题。

若只关心部分颜色或关键点，可先定义关键点间的连接成本，再证明候选边足以保持 MST。不能只因两点属于同一类就免费合并。按权值分组处理时，并列权边的选择顺序会影响输出的具体树；判断某条边是否出现在所有 MST 时，须保留同权组内部的替代关系。

对候选生成树还可使用路径判据：任意非树边 $(u,v)$ 的权重都不应小于树上 $u$ 到 $v$ 路径的最大边权，否则替换该最大边就能改进总权重。倍增或树链剖分可加速这类验证，也为次小生成树问题提供基础。

## 路径 mex 与隐式完全图

题目来源为 [Codeforces 2222F — Building Tree](https://codeforces.com/contest/2222/problem/F)。模型中的 $\operatorname{mex}$ 是集合未出现的最小非负整数，路径代价由出现过的权值集合决定。

!!! question "例题：关键点间的最小 mex 连接"
    原无向图有 $n$ 个顶点、$m$ 条边，边权为非负整数。路径代价定义为路径边权集合的 $\operatorname{mex}$，令 $d(u,v)$ 为两点间所有路径的最小代价；无路可达时不能连接。给定 $q$ 个原图顶点编号作为新图顶点的颜色，新图两点的连接代价为对应原图顶点间的 $d$。求新图 MST。

    ??? success "转化依据"
        设 $G_x$ 为删去所有权值为 $x$ 的边后得到的图，则

        $$d(u,v)=\min\{x\ge0\mid u,v\text{ 在 }G_x\text{ 中连通}\}.$$

        代价为 $x$ 的路径必定不使用权值 $x$，所以存在于 $G_x$；反过来，$G_x$ 中的路径缺少 $x$，其 mex 至多为 $x$。对两边分别取最小值即可得到等式。同色新顶点间可用空路径，代价为 $0$，所以颜色可排序去重。

        每条简单路径最多有 $m$ 条边，mex 不超过 $m$。只需枚举 $x=0,\ldots,m$；若所有这些删边图都不能连接某对关键点，它们在原图中也不连通。

### 分治维护删边后的连通性

直接为每个 $x$ 重建 $G_x$ 代价较高。对待删除权值区间 $[l,r]$ 做分治：当前回滚并查集已经加入所有权值在区间外的边；向左递归前加入右半区间的边，向右递归前加入左半区间的边。到叶子 $x$ 时，恰好得到 $G_x$。

在每个原图连通块中只保留一个关键点代表。连通块合并时，若两边都有代表，就产生一条候选边；一个连通块内的关键点用链或树连接即可表达其连通关系，无须生成完全图。

下面实现进一步在递归内部提前接受候选连接。参数 `mex` 表示当前已加入边权集合的 mex，因此当前连通块中任意两点间都存在一条代价不超过它的路径。递归先访问左区间，再访问右区间：左区间之外加入的高权边不填补当前缺失的小权值；转入右区间时，按递增权值补上左半边，使这一段重建过程的 `mex` 单调增大。

回滚后重建可能再次产生较低成本的候选，但这些连接已经被先前处理的连通关系覆盖，不会再次收费。真正被 MST 并查集接受的连接按非降成本出现：处理到成本 $x$ 时，所有更低成本能形成的关键点连通关系已经合并；若新候选的真实最小代价小于 $x$，它的两端此前就应已连通。因此只对尚未连通的代表收取 $x$，与 Kruskal 的选择一致。

回滚并查集使用按大小合并，不做路径压缩，以便只记录每次合并的常数个修改；查找最坏为 $O(\log n)$。最终 MST 的并查集无需回滚，可以同时使用按大小合并和路径压缩。一次递归回滚只恢复原图连通状态，保留已选 MST 边。

### 参考实现

代码将大于 $m$ 的权值统一截断为 $m$。它们不影响 mex 小于 $m$ 的路径；而一条路径若含全部 $0,\ldots,m-1$，至少已占用 $m$ 条边，不可能再含一条大权边，因此截断也不改变 mex 是否为 $m$。

```cpp title="mex_mst.cpp"
#include <algorithm>
#include <iostream>
#include <numeric>
#include <utility>
#include <vector>
using namespace std;

struct DSU {
    vector<int> parent, size;
    explicit DSU(int n) : parent(n + 1), size(n + 1, 1) {
        iota(parent.begin(), parent.end(), 0);
    }
    int find(int x) {
        return parent[x] == x ? x : parent[x] = find(parent[x]);
    }
    bool unite(int a, int b) {
        a = find(a); b = find(b);
        if (a == b) return false;
        if (size[a] < size[b]) swap(a, b);
        parent[b] = a; size[a] += size[b];
        return true;
    }
};

struct Change {
    int child, root, oldSize, oldRepresentative;
};

class Solver {
    int n, m;
    vector<vector<pair<int, int>>> edges;
    vector<int> parent, size, representative;
    vector<Change> history;
    DSU mst;
    long long answer = 0;

    int find(int x) const {
        while (parent[x] != x) x = parent[x];
        return x;
    }
    void addEdge(int u, int v, int cost) {
        u = find(u); v = find(v);
        if (u == v) return;
        int a = representative[u], b = representative[v];
        if (a && b && mst.unite(a, b)) answer += cost;
        if (size[u] > size[v]) swap(u, v);
        history.push_back({u, v, size[v], representative[v]});
        parent[u] = v;
        size[v] += size[u];
        if (!representative[v]) representative[v] = representative[u];
    }
    void rollback(size_t checkpoint) {
        while (history.size() > checkpoint) {
            auto change = history.back(); history.pop_back();
            parent[change.child] = change.child;
            size[change.root] = change.oldSize;
            representative[change.root] = change.oldRepresentative;
        }
    }
    void divide(int l, int r, int mex) {
        if (l == r) return;
        int mid = l + (r - l) / 2;
        size_t checkpoint = history.size();
        for (int w = mid + 1; w <= r; ++w)
            for (auto [u, v] : edges[w]) addEdge(u, v, mex);
        divide(l, mid, mex);
        rollback(checkpoint);
        for (int w = l; w <= mid; ++w) {
            if (mex == w && !edges[w].empty()) ++mex;
            for (auto [u, v] : edges[w]) addEdge(u, v, mex);
        }
        divide(mid + 1, r, mex);
        rollback(checkpoint);
    }
public:
    Solver(int n, int m)
        : n(n), m(m), edges(m + 1), parent(n + 1),
          size(n + 1, 1), representative(n + 1, 0), mst(n) {
        iota(parent.begin(), parent.end(), 0);
    }
    void readEdges() {
        for (int i = 0; i < m; ++i) {
            int u, v; long long w;
            cin >> u >> v >> w;
            edges[static_cast<int>(min<long long>(w, m))].push_back({u, v});
        }
    }
    long long run(vector<int> colors) {
        sort(colors.begin(), colors.end());
        colors.erase(unique(colors.begin(), colors.end()), colors.end());
        if (colors.size() <= 1) return 0;
        for (int vertex : colors) representative[vertex] = vertex;
        divide(0, m, 0);
        for (int vertex : colors)
            if (mst.find(vertex) != mst.find(colors[0])) return -1;
        return answer;
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int tests; cin >> tests;
    while (tests--) {
        int n, m, q; cin >> n >> m >> q;
        Solver solver(n, m);
        solver.readEdges();
        vector<int> colors(q);
        for (int& vertex : colors) cin >> vertex;
        cout << solver.run(colors) << '\n';
    }
}
```

每条边在每层分治至多加入一次，分治深度为 $O(\log(m+1))$，总时间可写为 $O(n+m\log(m+1)\log(n+1)+q\log(q+1))$，空间为 $O(n+m+q)$。这里的 $-1$ 可用作不连通标记，因为 mex 权重非负。验证时可在小图上枚举所有删边图，建立关键点间的显式边权，再与普通 Kruskal 的结果比较。

## 工程中的适用范围

MST 适合静态、无向、可加成本的连通设计。真实网络往往还要求冗余、带宽、方向和故障恢复，一棵树中的任意边失效都可能断开网络，所以最低布线成本不能直接等同于生产网络的最佳拓扑。以太网生成树协议也不等同于在任意全局边权模型上执行上述 Kruskal。

数据规模扩大后，显式存储和排序全部边可能比并查集更昂贵。常见方向包括外部排序、按几何性质稀疏化候选边，以及 Borůvka 按连通块选最轻出边的批处理方式；其中并行实现仍需处理同权边、重复候选和并发合并，不能只把串行循环分配给多个线程。

## 参考资料

- [Princeton Algorithms：Minimum Spanning Trees](https://algs4.cs.princeton.edu/43mst/)，割性质、基础算法与复杂度
- [CP-Algorithms：Disjoint Set Union](https://cp-algorithms.com/data_structures/disjoint_set_union.html)，按大小合并与路径压缩
- [CP-Algorithms：Deleting from a data structure in logarithmic time](https://cp-algorithms.com/data_structures/deleting_in_log_n.html)，离线分治与回滚思路
