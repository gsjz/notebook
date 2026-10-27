# 凸优化

## 竞赛题的凸优化结构

竞赛里的凸优化题通常不要求实现通用优化器，而是要把几何关系化成少数乘子或一个单调参数。常见外形包括投影到球与盒、带总量约束的资源分配、水位线、非负最小二乘。

二次距离

$$
f(y)=\frac12\lVert y-x\rVert_2^2
$$

严格凸；线性约束、球、盒、单纯形及其交集保持凸性。因而在这些问题中，KKT 不只生成候选解：满足 KKT 的可行点就是全局最优；若目标严格凸，最优点唯一。遇到非凸问题时，KKT 通常只给局部候选，不能据此宣称全局最优。

## 拉格朗日乘子与 KKT 条件

考虑可微凸函数构成的目标与不等式约束，以及仿射等式约束：

$$
\min_y f(y)\quad\text{s.t.}\quad g_j(y)\le0,\quad Ay=b.
$$

拉格朗日函数为

$$
L(y,\lambda,\nu)=f(y)+\sum_j\lambda_jg_j(y)+\nu^{\mathsf T}(Ay-b).
$$

KKT 条件同时要求：

| 条件 | 表达式 |
| --- | --- |
| 原始可行性 | $g_j(y^*)\le0,\ Ay^*=b$ |
| 对偶可行性 | $\lambda_j\ge0$ |
| 驻点条件 | $\nabla f(y^*)+\sum_j\lambda_j\nabla g_j(y^*)+A^{\mathsf T}\nu=0$ |
| 互补松弛 | $\lambda_jg_j(y^*)=0$ |

对凸问题，满足 KKT 条件就足以保证全局最优。反过来，最优点是否一定有 KKT 乘子需要约束资格；竞赛中常见的保证是 Slater 条件，即存在满足等式且让所有不等式严格成立的点。本页球、盒和单纯形例题都可以直接验证它。

驻点的几何意义是：在最优点，$-\nabla f$ 落在可行集的法向锥中。等式约束法向 $A^{\mathsf T}\nu$ 的系数可正可负；不等式法向 $\nabla g_i$ 只能以非负系数叠加，故 $\lambda_i\ge0$。互补松弛则区分边界是否施力：$g_i(y^*)<0$ 时必须有 $\lambda_i=0$；若 $\lambda_i>0$，约束必在边界。约束取等号时乘子也可能恰好为零。

这使乘子不只是待求常数：固定乘子后，目标常能按坐标分开；由边界约束再求乘子。高维优化于是可能化成一个单调标量方程。

## KKT 解题流程

1. 把最大化/最小化和约束统一成 $\min f$、$g_i\le0$、$Ay=b$，固定符号约定。
2. 先求无约束解或只处理简单约束的解；若它已可行，对应约束乘子为零。
3. 猜或枚举活跃约束，把驻点条件按变量拆开。
4. 固定乘子求坐标形式，常见结果是 `clamp`、`max` 或水位线。
5. 用活跃约束/总量等式确定乘子，判断能否排序、二分或双指针。
6. 回代检查原始可行性、乘子非负和互补松弛；活跃集不一致就调整。

!!! warning "先固定不等式符号"
    本页统一用 $g_i\le0$ 和 $\lambda_i\ge0$。把约束乘以 $-1$ 时，梯度方向也变了。若求得负乘子，先检查约束方向和拉格朗日函数，不要直接对乘子取绝对值。

## 例题：Simplex Projection

!!! question "例题：单纯形投影"
    给定 $x\in\mathbb R^n$，求

    $$
    \min_y \frac12\lVert y-x\rVert_2^2
    \quad\text{s.t.}\quad y_i\ge0,\quad \sum_i y_i=1.
    $$

    说明 KKT 如何导出水位线，并给出 $O(n\log n)$ 算法。

    ??? success "参考答案"
        把非负约束写成 $-y_i\le0$，总量约束写成 $\sum_i y_i-1=0$。相应乘子为 $\lambda_i\ge0$ 与 $\tau$：

        $$
        L=\frac12\sum_i(y_i-x_i)^2-\sum_i\lambda_i y_i
        +\tau\left(\sum_i y_i-1\right).
        $$

        驻点条件为 $y_i-x_i-\lambda_i+\tau=0$。若 $y_i>0$，互补松弛给出 $\lambda_i=0$，于是 $y_i=x_i-\tau$；若 $y_i=0$，则 $\lambda_i=\tau-x_i\ge0$，于是 $x_i\le\tau$。合并得到

        $$
        y_i=\max(x_i-\tau,0),\qquad
        \sum_i\max(x_i-\tau,0)=1.
        $$

        右侧关于 $\tau$ 连续单调下降，可以二分。更快的竞赛做法是将 $x$ 降序排序为 $x_{(1)}\ge\cdots\ge x_{(n)}$，枚举正坐标数 $k$，计算

        $$
        \tau_k=\frac{\sum_{i=1}^k x_{(i)}-1}{k}.
        $$

        找到满足 $x_{(k)}>\tau_k\ge x_{(k+1)}$ 的 $k$，前缀和求出阈值后回代，复杂度 $O(n\log n)$。边界相等时活跃集的记法可以不同，但输出相同。

非负约束产生 `max`，上界约束产生 `min`，总量等式确定水位线。这种“截断坐标 + 求乘子”的结构会在资源分配与投影题中反复出现。

## 例题：Projection

!!! question "题意：Projection"
    来源：[QOJ 14725 — Projection](https://qoj.ac/contest/2609/problem/14725)。

    给定 $n$ 维球与轴对齐超矩形

    $$
    B=\left\{y\in\mathbb R^n\middle|\sum_{i=1}^n y_i^2\le a\right\},
    \qquad
    C=\left\{y\in\mathbb R^n\middle| |y_i|\le l_i,\ i\in[1,n]\right\},
    $$

    输入中的 $a=R^2$ 是半径的平方。对点 $x=(x_1,\ldots,x_n)$，求交集 $S=B\cap C$ 中距离 $x$ 最近的点 $y$，即最小化 $\sum_i(y_i-x_i)^2$。这里球包含内部及边界。

    共有 $T$ 组数据，$1\le T\le3\times10^4$。每组给出 $n,a$，随后两行分别为 $x_i$ 和 $l_i$，满足

    $$
    2\le n\le10^5,\quad 1\le a\le10^9,\quad
    |x_i|\le10^9,\quad 1\le l_i\le100.
    $$

    所有测试的 $\sum n\le10^5$。输出每个坐标，要求相对真实答案 $y_i^*$ 满足

    $$
    \frac{|y_i-y_i^*|}{\max(1,|y_i^*|)}\le10^{-6}.
    $$

    ??? success "解法提要"
        先检查超矩形上的投影是否落在球内；若不满足球约束，用拉格朗日乘子得到 $y_i=\operatorname{sgn}(x_i)\min(t|x_i|,l_i)$，再二分 $t\in[0,1]$ 使 $\sum_i y_i^2=a$。

### 超矩形上的投影

忽略球约束时，$x$ 到超矩形 $C$ 的投影逐坐标独立：

$$
z_i=\operatorname{clamp}(x_i,-l_i,l_i)
 =\operatorname{sgn}(x_i)\min(|x_i|,l_i).
$$

如果

$$
\sum_i z_i^2\le a,
$$

则 $z$ 已经属于 $B\cap C$，答案就是 $z$。原因是 $z$ 是 $x$ 在凸集 $C$ 上的投影；对任意 $y\in C$，投影的一阶条件给出

$$
\langle x-z,y-z\rangle\le0.
$$

因此

$$
\|x-y\|^2
=\|x-z\|^2+\|y-z\|^2-2\langle x-z,y-z\rangle
\ge \|x-z\|^2.
$$

若 $z$ 还在球内，它自然也是交集上的最近点。

### 球约束活跃时的形式

下面假设 $\sum_i z_i^2>a$。最优点必须落在球面上，否则球约束不活跃，问题会退化为超矩形投影并得到 $z$，与假设矛盾。

考虑凸优化问题

$$
\min_y \frac12\sum_i(y_i-x_i)^2
\quad\text{s.t.}\quad
\sum_i y_i^2\le a,\quad -l_i\le y_i\le l_i.
$$

原点严格满足全部约束，因此满足 Slater 条件，KKT 条件对这个凸问题既必要又充分。设球约束的 KKT 乘子为 $\lambda>0$。固定 $\lambda$ 后，每个坐标独立地最小化

$$
\frac12(y_i-x_i)^2+\frac\lambda2y_i^2
\quad\text{over }[-l_i,l_i].
$$

不考虑区间端点时，极值点为 $x_i/(1+\lambda)$；加回超矩形约束后得到

$$
y_i=\operatorname{clamp}\left(\frac{x_i}{1+\lambda},-l_i,l_i\right).
$$

令

$$
t=\frac1{1+\lambda}\in(0,1),
$$

则答案具有统一形式

$$
y_i=\operatorname{sgn}(x_i)\min(t|x_i|,l_i).
$$

参数 $t$ 由球面条件唯一确定：

$$
f(t)=\sum_i\min(t|x_i|,l_i)^2=a.
$$

函数 $f$ 连续且单调不减，$f(0)=0$，而当前情形有 $f(1)>a$。根所在位置至少有一个坐标尚未达到上界，因此根附近严格递增。对 $[0,1]$ 二分即可。

### 最优性的直接验证

若盒投影 $z$ 满足 $\|z\|^2\le a$，上面的投影不等式说明任意交集点到 $x$ 的距离都不小于 $z$，所以算法返回最优点。

对球约束活跃的情形，还可以直接验证上述构造。设二分得到 $t$，令 $\lambda=1/t-1>0$，并定义

$$
F(v)=\frac12\|v-x\|^2,\qquad
\mathcal L(v)=F(v)+\frac\lambda2(\|v\|^2-a).
$$

逐坐标最小化说明 $y$ 在整个盒内最小化 $\mathcal L$。又因为 $\|y\|^2=a$，对任意可行点 $v$ 都有

$$
F(y)=\mathcal L(y)\le\mathcal L(v)\le F(v).
$$

所以 $y$ 是最优点。目标严格凸，约束集凸且非空，故最优点唯一。

### 缩放原坐标与样例

缩放的对象必须是原坐标 $x_i$。先把所有坐标裁剪到盒内、再整体投影到球上，通常会丢失原坐标的比例。

例如 $x=(3,1)$、$l=(1,1)$、$a=1$。先裁剪得到 $(1,1)$，再缩放到单位球得到 $(1/\sqrt2,1/\sqrt2)$；真正的答案为 $(3/\sqrt{10},1/\sqrt{10})$，它已经满足盒约束，且到给定点 $x$ 更近。

| 题面样例 | 盒投影 $z$ | 球约束 | 答案 |
| --- | --- | --- | --- |
| $x=(1,10),\,l=(4,4),\,a=25$ | $(1,4)$ | $17\le25$，不活跃 | $(1,4)$ |
| $x=(10,1),\,l=(4,4),\,a=25$ | $(4,1)$ | $17\le25$，不活跃 | $(4,1)$ |
| $x=(3,3,3),\,l=(2,2,2),\,a=6$ | $(2,2,2)$ | $12>6$，活跃 | $(\sqrt2,\sqrt2,\sqrt2)$ |

球和盒还可能同时约束答案。例如 $x=(10,2)$、$l=(1,2)$、$a=2$ 时，二分得到 $t=1/2$，第一个坐标被裁剪为 $1$，第二个坐标缩放为 $1$，答案为 $(1,1)$。

### 复杂度

固定二分次数 $K=120$。每次计算 $f(t)$ 需要 $O(n)$，所以单个测试为 $O(Kn)$ 时间、$O(n)$ 空间。所有测试的总时间为 $O(K\sum n)$。

实现使用 `long double`，输出小数点后 $12$ 位。固定 $120$ 次二分足以达到浮点数的可分辨精度；这不代表拥有 $120$ 位有效精度。每次都先裁剪再平方，平方和至多为 $n\cdot100^2\le10^9$。零坐标始终为零，负坐标保留原符号。

### C++17 实现

```cpp title="projection.cpp"
#include <bits/stdc++.h>
using namespace std;

using ld = long double;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int T;
    cin >> T;
    cout << fixed << setprecision(12);

    while (T--) {
        int n;
        long long a;
        cin >> n >> a;

        vector<ld> x(n), limit(n);
        for (ld& value : x) {
            long long input;
            cin >> input;
            value = input;
        }
        for (ld& value : limit) {
            long long input;
            cin >> input;
            value = input;
        }

        auto norm2 = [&](ld t) {
            ld result = 0;
            for (int i = 0; i < n; ++i) {
                ld value = fabsl(x[i]) * t;
                value = min(value, limit[i]);
                result += value * value;
            }
            return result;
        };

        ld t = 1;
        if (norm2(1) > static_cast<ld>(a)) {
            ld low = 0, high = 1;
            for (int iteration = 0; iteration < 120; ++iteration) {
                ld middle = (low + high) / 2;
                if (norm2(middle) > static_cast<ld>(a))
                    high = middle;
                else
                    low = middle;
            }
            t = (low + high) / 2;
        }

        for (int i = 0; i < n; ++i) {
            ld value = min(fabsl(x[i]) * t, limit[i]);
            if (x[i] < 0) value = -value;
            if (i) cout << ' ';
            cout << value;
        }
        cout << '\n';
    }
}
```
