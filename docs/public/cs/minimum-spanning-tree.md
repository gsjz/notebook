# 最小生成树

## Kruskal

Kruskal 按边权从小到大尝试加边，若当前边连接了两个不同连通块，就加入答案。它通常配合并查集使用。

```cpp title="kruskal.cpp"
struct DSU {
    vector<int> fa, sz;

    DSU(int n) : fa(n + 1), sz(n + 1, 1) {
        iota(fa.begin(), fa.end(), 0);
    }

    int find(int x) {
        return fa[x] == x ? x : fa[x] = find(fa[x]);
    }

    bool unite(int a, int b) {
        a = find(a), b = find(b);
        if (a == b) return false;
        if (sz[a] < sz[b]) swap(a, b);
        fa[b] = a;
        sz[a] += sz[b];
        return true;
    }
};

long long kruskal(int n, vector<array<int, 3>> edges) {
    sort(edges.begin(), edges.end(), [](auto &a, auto &b) {
        return a[2] < b[2];
    });

    DSU dsu(n);
    long long ans = 0;
    int cnt = 0;

    for (auto [u, v, w] : edges) {
        if (dsu.unite(u, v)) {
            ans += w;
            cnt++;
        }
    }

    return cnt == n - 1 ? ans : -1;
}
```

!!! tip "适用场景"
    Kruskal 更适合边已经显式给出、或可以按权值批量生成候选边的题目。竞赛中很多“看起来不是图”的题，最后会变成给候选边排序后做并查集。

## Prim

Prim 从一个点开始，每次把离当前生成树最近的点加入。它适合稠密图，或边权可以按点动态计算的场景。

使用优先队列时复杂度通常为 $O(m \log n)$；如果是稠密图且可以 $O(1)$ 取两点边权，也可以写成 $O(n^2)$。

!!! warning "完全图陷阱"
    题目隐含完全图时，不能直接生成 $O(n^2)$ 条边。需要寻找只保留少量候选边的性质，或者改用适合动态计算边权的 Prim。

## 常见转化

### 虚点

如果每个点都可以单独付费建站，同时也可以通过边连接其他点，可以加入一个虚点 $0$，把“单独建站费用”看成 $0 \leftrightarrow i$ 的边权，再对扩展图求 MST。

### 颜色或集合压缩

当题目只关心某些颜色、类别或关键点时，可以先把原图中的信息压缩成关键点之间的代价，再在关键点图上做 MST。

### 按权值分层

Kruskal 的本质是从小权值到大权值合并连通块。因此如果边权范围较小，或边权有特殊语义，可以按权值分组处理，而不一定要把所有候选边显式排序。

## Codeforces 2222F - Building Tree

题目链接：[F. Building Tree](https://codeforces.com/contest/2222/problem/F)

题解省流：从小到大枚举 mex；缺 1 分治优化一下

### 题意抽象

原图中每条边有权值，路径长度定义为路径边权集合的 $\operatorname{mex}$。记 $\mathrm{dis}(u,v)$ 为从 $u$ 到 $v$ 的最小路径长度。

现在有 $q$ 个新点，每个新点带一个原图点编号作为颜色 $c_i$。若在新图中连接两个新点，代价是 $\mathrm{dis}(c_u,c_v)$。目标是用最小代价让新图连通。

如果多个新点颜色相同，它们之间的代价为 $0$，因此可以先把 $c_i$ 排序去重，只保留出现过的原图点。

### 关键等价

设 $G_x$ 表示从原图中删去所有权值为 $x$ 的边之后得到的图。则有：

$$
\mathrm{dis}(u,v)=\min\{x\mid u,v\text{ 在 }G_x\text{ 中连通}\}
$$

证明分两边看：

- 若一条路径的 $\operatorname{mex}$ 为 $x$，它一定不含权值 $x$ 的边，因此这条路径也存在于 $G_x$ 中。
- 若 $u,v$ 在 $G_x$ 中连通，则存在一条不含权值 $x$ 的路径，这条路径的 $\operatorname{mex}$ 不超过 $x$。

!!! note "转化结论"
    题目等价于：对所有查询颜色点构成的隐式完全图求 MST，其中两点边权是“删去哪一种权值后它们首次连通”的最小 $x$。

### Kruskal 思路

如果按 $x=0,1,\dots,m$ 枚举，那么在 $G_x$ 的同一个连通块内，任意两个查询颜色点之间都有一条代价不超过 $x$ 的边。

因此可以做 Kruskal：

- 用一个并查集维护查询颜色点之间已经选入 MST 的连通性。
- 按可能的 $\operatorname{mex}$ 从小到大处理。
- 每当发现两个查询颜色点所在的 MST 连通块不同，就用当前代价把它们合并。

!!! tip "解题切入点"
    不需要显式枚举 $q^2$ 条边。真正要维护的是：对每个可能被避开的权值 $x$，删掉权值 $x$ 后，哪些查询颜色点落在同一个原图连通块里。

### 分治维护删边图

直接为每个 $x$ 重建一次 $G_x$ 会过慢。代码使用分治处理“当前被删除的权值在哪个区间”。

`solve_dc(l, r, mex)` 的核心不变量是：

- 回滚并查集 `p1` 维护原图顶点的连通块。
- 当前 `p1` 中已经加入的边，都是在当前区间 $[l,r]$ 外面的边。
- 因此如果递归到叶子 $x$，`p1` 就正好表示 $G_x$。
- 参数 `mex` 表示当前已加入边权集合里最小的缺失权值；用当前 `p1` 产生的新连接，最多只需要付出 `mex`。

递归转移如下：

- 处理左半区间 $[l,mid]$ 时，删掉的权值只会在左半边，所以右半边 $[mid+1,r]$ 的边都可以加入。
- 处理右半区间 $[mid+1,r]$ 时，先回滚，再加入左半边 $[l,mid]$ 的边。
- 加入某个权值 $i$ 的边之前，如果当前 `mex == i` 且确实存在权值 $i$ 的边，那么加入这些边后，最小缺失权值会向后移动。

!!! warning "为什么 `p1` 不能路径压缩"
    `p1` 是回滚并查集，需要把父亲、秩和代表查询点恢复到进入递归前的状态，所以 `find1` 不能做路径压缩。代码中的 `p2` 是最终 MST 的并查集，不需要回滚，可以路径压缩。

### 代码结构

- `p1`：原图顶点上的回滚并查集，维护当前已加入边形成的连通块。
- `id[root]`：当前原图连通块中任意一个查询颜色点的编号；只需要存一个代表。
- `p2`：查询颜色点上的 Kruskal 并查集，维护答案里的连通性。
- `history_stack`：保存 `p1` 合并前的状态，用于分治回滚。
- `merge(u, v, mex)`：先尝试用代价 `mex` 连接两个查询颜色点代表，再合并原图连通块。

`p2` 和 `ans` 不回滚，因为它们表示已经按非降代价选入 MST 的边。

### 复杂度

每条原图边在分治的每一层最多被加入一次，因此合并次数为 $O(m\log m)$。回滚并查集按秩合并，单次 `find1` 为 $O(\log n)$；`p2` 近似为反阿克曼复杂度。

总复杂度可记为：

$$
O(m\log m\log n+q\log q)
$$

空间复杂度为 $O(n+m+q)

??? example "参考代码（压行版）"
    ```cpp title="cf2222f.cpp"
    #include<bits/stdc++.h>
    using namespace std; using ll=long long; using pii=pair<int,int>;
    const int N=3e5+5;
    int n,m,q,c[N],p1[N],rk_[N],id[N],p2[N]; ll ans;
    vector<pii> adj[N];
    struct Hist{int u,v,old_rk_v,old_id_v;};
    vector<Hist> hist;
    int find1(int x){while(x!=p1[x]) x=p1[x]; return x;}
    int find2(int x){return p2[x]==x?x:p2[x]=find2(p2[x]);}
    void merge(int u,int v,int mex){
        int ru=find1(u),rv=find1(v);
        if(ru==rv){hist.push_back({0,0,0,0}); return;}
        int iu=id[ru],iv=id[rv];
        if(iu&&iv){int a=find2(iu),b=find2(iv); if(a!=b) ans+=mex,p2[a]=b;}
        if(rk_[ru]>rk_[rv]) swap(ru,rv);
        hist.push_back({ru,rv,rk_[rv],id[rv]});
        p1[ru]=rv; rk_[rv]=max(rk_[rv],rk_[ru]+1); id[rv]=max(id[rv],id[ru]);
    }
    void rollback(int s){
        while((int)hist.size()>s){
            auto h=hist.back(); hist.pop_back();
            if(h.u) p1[h.u]=h.u,rk_[h.v]=h.old_rk_v,id[h.v]=h.old_id_v;
        }
    }
    void solve_dc(int l,int r,int mex){
        if(l==r) return;
        int s=hist.size(),mid=(l+r)>>1;
        for(int i=r;i>=mid+1;i--) for(auto e:adj[i]) merge(e.first,e.second,mex);
        solve_dc(l,mid,mex); rollback(s);
        for(int i=l;i<=mid;i++){
            if(!adj[i].empty()&&mex==i) mex++;
            for(auto e:adj[i]) merge(e.first,e.second,mex);
        }
        solve_dc(mid+1,r,mex); rollback(s);
    }
    void solve(){
        cin>>n>>m>>q;
        for(int i=0;i<=m;i++) adj[i].clear();
        for(int i=1,u,v,w;i<=m;i++) cin>>u>>v>>w,adj[w].push_back({u,v});
        for(int i=1;i<=q;i++) cin>>c[i];
        sort(c+1,c+q+1); q=unique(c+1,c+q+1)-c-1;
        ans=0; hist.clear();
        for(int i=1;i<=n;i++) p1[i]=i,rk_[i]=1,id[i]=0;
        for(int i=1;i<=q;i++) id[c[i]]=i,p2[i]=i;
        solve_dc(0,m,0);
        for(int i=1;i<=q;i++) if(find2(i)!=find2(1)){cout<<"-1\n"; return;}
        cout<<ans<<"\n";
    }
    int main(){
        ios::sync_with_stdio(false); cin.tie(nullptr);
        int T; cin>>T; while(T--) solve();
        return 0;
    }
    ```
