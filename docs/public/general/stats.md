# 概率统计

## 常见分布

### 均匀分布

!!! note "连续型均匀分布"
    若随机变量 $X$ 的密度函数为

    $$
    f(x)=
    \begin{cases}
    \dfrac{1}{b-a}, & a<x<b,\\[6pt]
    0, & \text{其他},
    \end{cases}
    \qquad a<b,
    $$

    则称 $X$ 服从区间 $(a,b)$ 上的均匀分布，记作

    $$
    X\sim U(a,b).
    $$

其期望与方差为：

$$
E(X)=\frac{a+b}{2},\qquad D(X)=\frac{(b-a)^2}{12}.
$$

!!! note "概率积分变换"
    若 $X$ 是连续型随机变量，分布函数为 $F(x)$，则

    $$
    F(X)\sim U(0,1).
    $$

    先看 $F$ 连续且严格递增的情形。令 $U=F(X)$，则对 $0<u<1$，

    $$
    \begin{aligned}
    P(U\le u)
    &=
    P(F(X)\le u)\\
    &=
    P(X\le F^{-1}(u))\\
    &=
    F(F^{-1}(u))\\
    &=
    u.
    \end{aligned}
    $$

    因此 $U$ 的分布函数为

    $$
    F_U(u)=u,\qquad 0<u<1,
    $$

    这正是 $U(0,1)$ 的分布函数。直观上，$F(X)$ 表示随机落点左侧已经累计的概率；改用“累计概率”这把尺子后，取值自然变成均匀分布。

### 二项分布

!!! note "二项分布"
    若一次试验成功概率为 $p$，独立重复进行 $n$ 次，成功次数 $X$ 服从二项分布：

    $$
    X \sim B(n,p)
    $$

    其概率质量函数为：

    $$
    P(X=k)=\binom{n}{k}p^k(1-p)^{n-k},\qquad k=0,1,\dots,n
    $$

<div class="distribution-explorer" data-distribution-explorer data-initial-distribution="binomial"></div>

其期望与方差为：

$$
E(X)=np,\qquad D(X)=np(1-p)
$$

### 几何分布

!!! note "几何分布"
    若独立重复进行伯努利试验，每次成功概率为 $p$，直到第一次成功为止，所需试验次数为 $X$，则 $X$ 服从参数为 $p$ 的几何分布。

    其概率质量函数为：

    $$
    P(X=k)=(1-p)^{k-1}p,\qquad k=1,2,\dots
    $$

    ??? note "名称来源"
        这个名称来自它的概率项构成几何数列。由公式可知，各个取值对应的概率依次为：

        $$
        p,\ (1-p)p,\ (1-p)^2p,\ (1-p)^3p,\ \dots
        $$

        相邻两项的比值恒为：

        $$
        \frac{P(X=k+1)}{P(X=k)}=1-p.
        $$

        所以这些概率项按固定公比排列，形成几何级数：

        $$
        \sum_{k=1}^{\infty}p(1-p)^{k-1}
        =
        p\sum_{k=0}^{\infty}(1-p)^k
        =
        1.
        $$

<div class="distribution-explorer" data-distribution-explorer data-initial-distribution="geometric"></div>

其期望与方差为：

$$
E(X)=\frac{1}{p},\qquad D(X)=\frac{1-p}{p^2}
$$

??? note "无记忆性"
    几何分布具有无记忆性：

    $$
    P(X>s+t \mid X>s)=P(X>t),\qquad s,t\in \mathbb{N}^+
    $$

    它可以看作指数分布在离散情形下的对应版本。

### 超几何分布

!!! note "超几何分布"
    设一批总体中共有 $N$ 个元素，其中有 $M$ 个属于某一类。现从中不放回地抽取 $n$ 个，记抽到该类元素的个数为 $X$，则 $X$ 服从超几何分布。

    其概率质量函数为：

    $$
    P(X=k)=\frac{\dbinom{M}{k}\dbinom{N-M}{n-k}}{\dbinom{N}{n}}
    $$

    其中

    $$
    \max\{0,n-(N-M)\}\le k\le \min\{n,M\}
    $$

    ??? note "名称来源"
        这里的“超几何”来自超几何级数（hypergeometric series）。

        几何级数的特点是相邻两项比值固定：

        $$
        1+z+z^2+z^3+\cdots,\qquad \frac{a_{r+1}}{a_r}=z.
        $$

        超几何级数把这个条件推广：相邻两项的比值可以是关于项数 $r$ 的有理函数，例如

        $$
        \frac{a_{r+1}}{a_r}
        =
        \frac{(r+a)(r+b)}{(r+c)(r+1)}z.
        $$

        对超几何分布，概率项也有类似结构：

        $$
        \frac{P(X=k+1)}{P(X=k)}
        =
        \frac{(M-k)(n-k)}{(k+1)(N-M-n+k+1)}.
        $$

        因此这个名称重点在概率项背后的级数结构：它属于超几何型项。

<div class="distribution-explorer" data-distribution-explorer data-initial-distribution="hypergeometric"></div>

其期望与方差为：

$$
E(X)=n\frac{M}{N},\qquad D(X)=n\frac{M}{N}\left(1-\frac{M}{N}\right)\frac{N-n}{N-1}
$$

### 泊松分布


!!! note "泊松过程"
    泊松过程是理解泊松分布与指数分布来源的前置知识。

    设 $N(t)$ 表示从时间 $0$ 到 $t$ 内发生的事件总数。若一个计数过程满足下列条件，则称为泊松过程：

    - 独立增量：不重叠时间段内的事件次数相互独立。
    - 平稳增量：长度相同的时间段内，事件次数分布相同，只与时间段长度有关。
    - 普通性：在极短时间 $\Delta t$ 内，发生 $2$ 次及以上事件的概率是高阶无穷小。

??? note "直观推导"
    设单位时间内平均发生 $\lambda$ 次事件，考察长度为 $t$ 的时间区间。先把这段时间等分为 $N$ 个很短的小区间，每个小区间长度为：

    $$
    \Delta t=\frac{t}{N}
    $$

    当 $N$ 足够大时，$\Delta t$ 很小。根据泊松过程的普通性，在一个极短时间 $\Delta t$ 内：

    - 发生 $1$ 次事件的概率约为 $\lambda \Delta t$
    - 发生 $2$ 次及以上事件的概率可以忽略

    因此，每个小区间内“是否发生一次事件”可以近似看作一次伯努利试验，其成功概率为：

    $$
    p=\lambda \Delta t=\frac{\lambda t}{N}
    $$

    由于泊松过程满足独立增量，这 $N$ 个小区间对应的试验彼此独立，所以在时间 $t$ 内发生的总次数近似服从二项分布：

    $$
    P(X=n)=\binom{N}{n}p^n(1-p)^{N-n}
    $$

    代入 $p=\dfrac{\lambda t}{N}$，得到：

    $$
    P(X=n)=\binom{N}{n}\left(\frac{\lambda t}{N}\right)^n\left(1-\frac{\lambda t}{N}\right)^{N-n}
    $$

    令 $N\to\infty$，则二项分布的极限为：

    $$
    P(X=n)=\lim_{N\to\infty}\binom{N}{n}\left(\frac{\lambda t}{N}\right)^n\left(1-\frac{\lambda t}{N}\right)^{N-n}
    =\frac{(\lambda t)^n e^{-\lambda t}}{n!}
    $$

    这正是泊松分布的公式。

??? note "递推证明"
    设 $P_n(t)$ 表示长度为 $t$ 的时间区间内恰好发生 $n$ 次事件的概率。

    当 $n=0$ 时，在 $t+\Delta t$ 内发生 $0$ 次，等价于前 $t$ 内发生 $0$ 次，且后面的 $\Delta t$ 内也发生 $0$ 次，因此：

    $$
    P_0(t+\Delta t)=P_0(t)\bigl(1-\lambda \Delta t\bigr)+o(\Delta t)
    $$

    移项并令 $\Delta t\to 0$，得到微分方程：

    $$
    P_0'(t)=-\lambda P_0(t)
    $$

    结合初始条件 $P_0(0)=1$，解得：

    $$
    P_0(t)=e^{-\lambda t}
    $$

    当 $n\ge 1$ 时，在 $t+\Delta t$ 内恰好发生 $n$ 次，主要来自两种互斥情况：

    - 前 $t$ 内发生 $n$ 次，$\Delta t$ 内发生 $0$ 次
    - 前 $t$ 内发生 $n-1$ 次，$\Delta t$ 内发生 $1$ 次

    因此有递推关系：

    $$
    P_n(t+\Delta t)=P_n(t)\bigl(1-\lambda \Delta t\bigr)+P_{n-1}(t)\lambda \Delta t+o(\Delta t)
    $$

    移项并令 $\Delta t\to 0$，得到：

    $$
    P_n'(t)=-\lambda P_n(t)+\lambda P_{n-1}(t),\qquad n\ge 1
    $$

    再结合初始条件 $P_n(0)=0$，用数学归纳法配合积分因子法可得：

    $$
    \frac{d}{dt}\bigl(e^{\lambda t}P_n(t)\bigr)=\lambda e^{\lambda t}P_{n-1}(t)
    $$

    若已知

    $$
    P_{n-1}(t)=\frac{(\lambda t)^{n-1}e^{-\lambda t}}{(n-1)!}
    $$

    则

    $$
    \frac{d}{dt}\bigl(e^{\lambda t}P_n(t)\bigr)=\frac{\lambda^n t^{n-1}}{(n-1)!}
    $$

    两边从 $0$ 积分到 $t$，并利用 $P_n(0)=0$，得到：

    $$
    e^{\lambda t}P_n(t)=\int_0^t \frac{\lambda^n s^{n-1}}{(n-1)!}\,ds
    =\frac{\lambda^n t^n}{n!}
    $$

    因此：

    $$
    P_n(t)=\frac{(\lambda t)^n e^{-\lambda t}}{n!}
    $$

!!! note "泊松分布"
    若随机变量 $X$ 的分布为：

    $$
    P(X=k)=\frac{\lambda^k e^{-\lambda}}{k!},\qquad k=0,1,2,\dots,\ \lambda>0
    $$

    则称

    $$
    X \sim P(\lambda)
    $$

<div class="distribution-explorer" data-distribution-explorer data-initial-distribution="poisson"></div>

它常用于描述单位时间或单位区域内稀有事件的发生次数，其期望与方差为：

$$
E(X)=\lambda,\qquad D(X)=\lambda
$$

!!! note "可加性"
    若

    $$
    X\sim P(\lambda_1),\qquad Y\sim P(\lambda_2),
    $$

    且 $X,Y$ 相互独立，则

    $$
    X+Y\sim P(\lambda_1+\lambda_2).
    $$

    更一般地，若 $X_1,X_2,\cdots,X_n$ 相互独立，且

    $$
    X_i\sim P(\lambda_i),
    $$

    则

    $$
    \sum_{i=1}^n X_i\sim P\left(\sum_{i=1}^n\lambda_i\right).
    $$

??? note "可加性的卷积证明"
    对 $k=0,1,2,\cdots$，有

    $$
    \begin{aligned}
    P(X+Y=k)
    &=
    \sum_{i=0}^k P(X=i)P(Y=k-i)\\
    &=
    \sum_{i=0}^k
    \frac{\lambda_1^i e^{-\lambda_1}}{i!}
    \frac{\lambda_2^{k-i} e^{-\lambda_2}}{(k-i)!}\\
    &=
    e^{-(\lambda_1+\lambda_2)}
    \frac{1}{k!}
    \sum_{i=0}^k
    \binom{k}{i}\lambda_1^i\lambda_2^{k-i}\\
    &=
    e^{-(\lambda_1+\lambda_2)}
    \frac{(\lambda_1+\lambda_2)^k}{k!}.
    \end{aligned}
    $$

    因此

    $$
    X+Y\sim P(\lambda_1+\lambda_2).
    $$

!!! warning "独立条件不能省略"
    泊松分布的可加性要求随机变量相互独立。只知道边缘分布分别是 $P(\lambda_1)$ 和 $P(\lambda_2)$，不能直接推出和仍然服从泊松分布。

当 $n$ 很大、$p$ 很小，且 $\lambda=np$ 适中时，

$$
B(n,p) \approx P(\lambda)
$$


### 指数分布

!!! note "指数分布"
    若

    $$
    f(x)=
    \begin{cases}
    \lambda e^{-\lambda x}, & x>0 \\
    0, & x\le 0
    \end{cases}
    \qquad \lambda>0
    $$

    则称 $X$ 服从参数为 $\lambda$ 的指数分布，记作

    $$
    X\sim E(\lambda).
    $$

<div class="distribution-explorer" data-distribution-explorer data-initial-distribution="exponential"></div>

其期望与方差为：

$$
E(X)=\frac{1}{\lambda},\qquad D(X)=\frac{1}{\lambda^2}
$$

??? tip "用 Gamma 积分计算二阶矩"
    对非负整数 $n$，有

    $$
    \int_0^\infty x^n e^{-x}\,dx=n!.
    $$

    计算指数分布的二阶矩时，令 $u=\lambda x$，则

    $$
    E(X^2)=\int_0^\infty x^2\lambda e^{-\lambda x}\,dx
    =\frac{1}{\lambda^2}\int_0^\infty u^2e^{-u}\,du
    =\frac{2!}{\lambda^2}
    =\frac{2}{\lambda^2}.
    $$

    因此

    $$
    D(X)=E(X^2)-[E(X)]^2
    =\frac{2}{\lambda^2}-\frac{1}{\lambda^2}
    =\frac{1}{\lambda^2}.
    $$

??? note "从泊松分布推出指数分布"
    若事件按速率 $\lambda$ 的泊松过程发生，设 $T$ 表示等待第一次事件发生的时间。事件 $T>t$ 等价于在时间区间 $(0,t]$ 内一次事件都没有发生，即 $N(t)=0$。

    因为

    $$
    N(t)\sim P(\lambda t),
    $$

    所以

    $$
    P(T>t)=P(N(t)=0)
    =\frac{(\lambda t)^0e^{-\lambda t}}{0!}
    =e^{-\lambda t}.
    $$

    于是

    $$
    F_T(t)=P(T\le t)=1-e^{-\lambda t},\qquad t\ge0,
    $$

    对分布函数求导，就得到指数分布密度

    $$
    f_T(t)=\lambda e^{-\lambda t},\qquad t>0.
    $$

??? note "无记忆性"
    指数分布最重要的性质是无记忆性：

    $$
    P(X>s+t \mid X>s)=P(X>t)
    $$

    它与泊松过程中的“等待下一次事件的时间”直接对应。

    对两个独立同分布的指数变量

    $$
    X,Y\overset{i.i.d.}{\sim}E(\lambda),
    $$

    令

    $$
    U=\min\{X,Y\},\qquad V=\max\{X,Y\}.
    $$

    则

    $$
    V-U\sim E(\lambda).
    $$

    这就是无记忆性的另一种写法：第一个事件发生后，另一个尚未发生的事件还要继续等待的时间，仍然服从原来的指数分布。


若

$$
X\sim E(\lambda_1),\qquad Y\sim E(\lambda_2),
$$

且 $X,Y$ 相互独立，则

$$
\min\{X,Y\}\sim E(\lambda_1+\lambda_2).
$$

特别地，若

$$
X,Y\overset{i.i.d.}{\sim}E(\lambda),
$$

则

$$
\min\{X,Y\}\sim E(2\lambda).
$$

这是因为

$$
P(\min\{X,Y\}>t)
=
P(X>t,Y>t)
=
e^{-\lambda_1t}e^{-\lambda_2t}
=
e^{-(\lambda_1+\lambda_2)t}.
$$


!!! question "例题"
    设 $X,Y$ 独立同分布于参数为 $\lambda$ 的指数分布，令

    $$
    Z=\max\{X,Y\}.
    $$

    判断下列哪个随机变量与 $Z$ 同分布：

    $$
    \text{(A) }\frac{X+Y}{2},
    \qquad
    \text{(B) }\frac{2X+Y}{2},
    \qquad
    \text{(C) }\frac{2X+Y}{3},
    \qquad
    \text{(D) }Y.
    $$

    ??? tip "快速判断"
        先算期望筛选。因为

        $$
        E(\max\{X,Y\})
        =
        E(X)+E(Y)-E(\min\{X,Y\})
        =
        \frac{2}{\lambda}-\frac{1}{2\lambda}
        =
        \frac{3}{2\lambda}.
        $$

        四个选项中只有

        $$
        E\left(\frac{2X+Y}{2}\right)
        =
        \frac{3}{2\lambda}
        $$

        与它一致，因此优先锁定 (B)。再用指数分布缩放规则确认：

        $$
        \frac{2X+Y}{2}=X+\frac Y2
        \sim E(\lambda)+E(2\lambda),
        $$

        正好对应 $\max\{X,Y\}$ 的次序统计量结构。

    ??? success "参考答案"
        先用指数分布的缩放规则：

        $$
        X\sim E(\lambda),\ a>0
        \quad\Longrightarrow\quad
        aX\sim E\left(\frac{\lambda}{a}\right).
        $$

        再用两个独立指数变量的次序统计量性质：

        $$
        \min\{X,Y\}\sim E(2\lambda),
        $$

        且

        $$
        \max\{X,Y\}-\min\{X,Y\}\sim E(\lambda).
        $$

        因此

        $$
        \max\{X,Y\}
        \overset{d}{=}
        E(2\lambda)+E(\lambda),
        $$

        其中右边表示两个独立指数分布变量之和。

        逐项看：

        $$
        \text{(A) }\frac{X+Y}{2}
        =
        \frac X2+\frac Y2
        \sim E(2\lambda)+E(2\lambda),
        $$

        $$
        \text{(B) }\frac{2X+Y}{2}
        =
        X+\frac Y2
        \sim E(\lambda)+E(2\lambda),
        $$

        $$
        \text{(C) }\frac{2X+Y}{3}
        =
        \frac{2X}{3}+\frac Y3
        \sim E\left(\frac{3\lambda}{2}\right)+E(3\lambda),
        $$

        $$
        \text{(D) }Y\sim E(\lambda).
        $$

        只有 (B) 的结构与 $Z$ 匹配，所以答案为

        $$
        \boxed{\text{B}}.
        $$

!!! question "例题"
    设随机变量 $X,Y$ 独立同分布于 $E(\lambda)$，其中 $\lambda>0$，$F(x)$ 为 $X$ 的分布函数。判断下列哪个随机变量与 $F(X)$ 同分布：

    $$
    \text{(A) }\frac{2X}{X+Y},
    \qquad
    \text{(B) }\frac{X}{Y},
    \qquad
    \text{(C) }\frac{X+Y}{2X},
    \qquad
    \text{(D) }\frac{Y}{X+Y}.
    $$

    ??? tip "快速判断"
        由概率积分变换，

        $$
        F(X)\sim U(0,1).
        $$

        因此只需要找哪个选项也服从 $U(0,1)$。先看取值范围：

        $$
        \frac{2X}{X+Y}\in(0,2),\qquad
        \frac{X}{Y}\in(0,+\infty),
        $$

        $$
        \frac{X+Y}{2X}
        =
        \frac12+\frac{Y}{2X}
        \in\left(\frac12,+\infty\right).
        $$

        这三个都不可能服从 $U(0,1)$。只剩

        $$
        \frac{Y}{X+Y}\in(0,1).
        $$

    ??? success "参考答案一：分布函数法"
        令

        $$
        T=\frac{Y}{X+Y}.
        $$

        对 $0<t<1$，

        $$
        \begin{aligned}
        P(T\le t)
        &=
        P\left(\frac{Y}{X+Y}\le t\right)\\
        &=
        P\left(Y\le \frac{t}{1-t}X\right).
        \end{aligned}
        $$

        对 $X$ 条件化：

        $$
        \begin{aligned}
        P(T\le t)
        &=
        \int_0^\infty
        P\left(Y\le \frac{t}{1-t}x\right)
        \lambda e^{-\lambda x}\,\mathrm dx\\
        &=
        \int_0^\infty
        \left(1-e^{-\lambda\frac{t}{1-t}x}\right)
        \lambda e^{-\lambda x}\,\mathrm dx\\
        &=
        1-
        \int_0^\infty
        \lambda e^{-\lambda x\left(1+\frac{t}{1-t}\right)}\,\mathrm dx\\
        &=
        1-\frac{1}{1+\frac{t}{1-t}}\\
        &=
        t.
        \end{aligned}
        $$

        所以

        $$
        T=\frac{Y}{X+Y}\sim U(0,1).
        $$

        又因为

        $$
        F(X)\sim U(0,1),
        $$

        所以答案为

        $$
        \boxed{\text{D}}.
        $$

    ??? success "参考答案二：换元法"
        令

        $$
        S=X+Y,\qquad T=\frac{Y}{X+Y}.
        $$

        反解得到

        $$
        X=S(1-T),\qquad Y=ST.
        $$

        因为 $X>0,Y>0$，所以

        $$
        S>0,\qquad 0<T<1.
        $$

        计算 Jacobian：

        $$
        \left|
        \frac{\partial(x,y)}{\partial(s,t)}
        \right|
        =
        \left|
        \begin{vmatrix}
        1-t & -s\\
        t & s
        \end{vmatrix}
        \right|
        =s.
        $$

        又因为

        $$
        f_{X,Y}(x,y)=\lambda^2e^{-\lambda(x+y)},
        \qquad x>0,\ y>0,
        $$

        所以

        $$
        \begin{aligned}
        f_{S,T}(s,t)
        &=
        f_{X,Y}(s(1-t),st)
        \left|
        \frac{\partial(x,y)}{\partial(s,t)}
        \right|\\
        &=
        \lambda^2e^{-\lambda s}s,
        \qquad s>0,\ 0<t<1.
        \end{aligned}
        $$

        对 $s$ 积分得到 $T$ 的边缘密度：

        $$
        f_T(t)
        =
        \int_0^\infty \lambda^2s e^{-\lambda s}\,\mathrm ds
        =
        1,
        \qquad 0<t<1.
        $$

        因此

        $$
        T=\frac{Y}{X+Y}\sim U(0,1).
        $$

        又因为

        $$
        F(X)\sim U(0,1),
        $$

        所以答案为

        $$
        \boxed{\text{D}}.
        $$


### 正态分布

!!! note "正态分布"
    若随机变量 $X$ 的密度函数为：

    $$
    f(x)=\frac{1}{\sqrt{2\pi}\sigma}\exp\left(-\frac{(x-\mu)^2}{2\sigma^2}\right),\qquad -\infty<x<+\infty
    $$

    其中 $\mu \in \mathbb{R}$，$\sigma>0$，则记作：

    $$
    X \sim N(\mu,\sigma^2)
    $$

<div class="distribution-explorer" data-distribution-explorer data-initial-distribution="normal"></div>

这是最重要的连续型分布之一，很多自然现象和误差模型都与它有关。

??? note "正态分布的归一化验证"
    先验证标准正态分布的核心积分。令

    $$
    I=\int_{-\infty}^{+\infty} e^{-x^2/2}\,dx
    $$

    直接对 $I$ 积分并不方便，可以先平方：

    $$
    I^2=\left(\int_{-\infty}^{+\infty} e^{-x^2/2}\,dx\right)
    \left(\int_{-\infty}^{+\infty} e^{-y^2/2}\,dy\right)
    $$

    于是

    $$
    I^2=\iint_{\mathbb{R}^2} e^{-(x^2+y^2)/2}\,dx\,dy
    $$

    改用极坐标 $x=r\cos\theta,\ y=r\sin\theta$，且面积微元满足 $dx\,dy=r\,dr\,d\theta$，得到：

    $$
    I^2=\int_0^{2\pi}\int_0^{+\infty} e^{-r^2/2}r\,dr\,d\theta
    $$

    内层积分令 $u=r^2/2$，则 $du=r\,dr$：

    $$
    \int_0^{+\infty} e^{-r^2/2}r\,dr=\int_0^{+\infty} e^{-u}\,du=1
    $$

    因此

    $$
    I^2=2\pi,\qquad I=\sqrt{2\pi}
    $$

    所以标准正态密度

    $$
    \varphi(x)=\frac{1}{\sqrt{2\pi}}e^{-x^2/2}
    $$

    满足

    $$
    \int_{-\infty}^{+\infty}\varphi(x)\,dx=1
    $$

    对于一般正态分布，令

    $$
    z=\frac{x-\mu}{\sigma},\qquad dx=\sigma\,dz
    $$

    则

    $$
    \begin{aligned}
    \int_{-\infty}^{+\infty}
    \frac{1}{\sqrt{2\pi}\sigma}
    \exp\left(-\frac{(x-\mu)^2}{2\sigma^2}\right)\,dx
    &=
    \int_{-\infty}^{+\infty}
    \frac{1}{\sqrt{2\pi}\sigma}e^{-z^2/2}\sigma\,dz \\
    &=
    \int_{-\infty}^{+\infty}\frac{1}{\sqrt{2\pi}}e^{-z^2/2}\,dz \\
    &=1
    \end{aligned}
    $$

??? note "标准正态均值验证"
    对 $Z\sim N(0,1)$，均值为

    $$
    E(Z)=\frac{1}{\sqrt{2\pi}}\int_{-\infty}^{+\infty}x e^{-x^2/2}\,dx.
    $$

    其原函数为 $-e^{-x^2/2}$，所以

    $$
    E(Z)=\frac{1}{\sqrt{2\pi}}\left[-e^{-x^2/2}\right]_{-\infty}^{+\infty}=0.
    $$

    因此任意区间上的这类积分也可以直接算：

    $$
    \int_a^b x e^{-x^2/2}\,dx
    =
    e^{-a^2/2}-e^{-b^2/2}.
    $$

!!! note "标准正态分布"
    当 $\mu=0,\sigma=1$ 时，称为标准正态分布，记作：

    $$
    X \sim N(0,1)
    $$

它的分布函数通常记为 $\Phi(x)$：

$$
\Phi(x)=\int_{-\infty}^{x}\frac{1}{\sqrt{2\pi}}e^{-t^2/2}\,dt.
$$

由于 $e^{-t^2/2}$ 没有初等原函数，$\Phi(x)$ 一般不能写成初等函数表达式，实际计算通常查表或用软件数值计算。

若

$$
X \sim N(\mu,\sigma^2)
$$

则可通过变换

$$
Z=\frac{X-\mu}{\sigma}
$$

化为标准正态分布：

$$
Z \sim N(0,1)
$$

### 柯西分布

!!! note "标准柯西分布"
    若随机变量 $X$ 的密度函数为

    $$
    f(x)=\frac{1}{\pi(1+x^2)},\qquad -\infty<x<+\infty,
    $$

    则称 $X$ 服从标准柯西分布，记作

    $$
    X\sim C(0,1).
    $$

柯西分布关于 $0$ 对称，形状像正态分布一样中间高、两边低，但尾部明显更厚。它的尾部衰减速度约为 $1/x^2$，这会导致一阶矩积分不收敛。

!!! warning "均值和方差不存在"
    标准柯西分布没有期望，也没有方差。虽然它关于 $0$ 对称，但不能因此说 $E(X)=0$，因为定义期望所需的积分并不收敛。

一般位置尺度形式为

$$
f(x)=\frac{1}{\pi\gamma\left[1+\left(\dfrac{x-x_0}{\gamma}\right)^2\right]},
\qquad -\infty<x<+\infty,\ \gamma>0,
$$

记作

$$
X\sim C(x_0,\gamma).
$$

其中 $x_0$ 是位置参数，$\gamma$ 是尺度参数。

??? note "和正态分布、$t$ 分布的关系"
    若

    $$
    X\sim N(0,1),\qquad Y\sim N(0,1),
    $$

    且 $X,Y$ 相互独立，则

    $$
    \frac{X}{Y}\sim C(0,1).
    $$

    另外，$t(1)$ 也是标准柯西分布。因为若

    $$
    T=\frac{Z}{\sqrt{U/1}},
    \qquad Z\sim N(0,1),\quad U\sim\chi^2(1),
    $$

    且 $Z,U$ 独立，而 $U$ 可以看作另一个独立标准正态变量的平方，所以 $T$ 本质上是两个独立标准正态变量之比。



## 统计三大分布

### 正态总体

!!! note "正态总体"
    设总体服从正态分布：

    $$
    X\sim N(\mu,\sigma^2)
    $$

    从中抽取容量为 $n$ 的简单随机样本：

    $$
    X_1,X_2,\cdots,X_n
    $$

!!! note "独立同分布"
    统计里常写

    $$
    X_1,X_2,\cdots,X_n \overset{i.i.d.}{\sim} N(\mu,\sigma^2)
    $$

    其中 `i.i.d.` 是 independent and identically distributed 的缩写，意思是**独立同分布**：这些随机变量彼此独立，并且都服从同一个分布。简单随机样本通常默认满足这一条件。

!!! note "样本均值"
    $$
    \overline X=\frac{1}{n}\sum_{i=1}^n X_i
    $$

!!! note "样本方差"
    $$
    S^2=\frac{1}{n-1}\sum_{i=1}^n 
    (X_i-\overline X)^2
    $$

    !!! note "为什么自由度是 $n-1$"
        样本方差中使用的是 $X_i-\overline X$，这些偏差满足

        $$
        \sum_{i=1}^n (X_i-\overline X)=0
        $$

        因此 $n$ 个偏差只有 $n-1$ 个可以自由变化。这个 $n-1$ 就是样本方差相关统计量的自由度来源。

正态总体核心结论：

$$
\overline X\sim N\left(\mu,\frac{\sigma^2}{n}\right)
$$

并且 $\overline X$ 与 $S^2$ 相互独立。

### $\chi^2$ 分布

!!! note "$\chi^2$ 分布"
    若 $Z_1,Z_2,\cdots,Z_n$ 相互独立，且都服从标准正态分布 $N(0,1)$，则

    $$
    X=Z_1^2+Z_2^2+\cdots+Z_n^2
    $$

    服从自由度为 $n$ 的卡方分布，记作：

    $$
    X\sim \chi^2(n)
    $$

    $\chi^2$ 分布本质上是若干个独立标准正态变量平方和的分布。它只能取非负值，曲线通常右偏；自由度越大，形状越接近正态。

<div class="distribution-explorer" data-distribution-explorer data-initial-distribution="chi2"></div>

若

$$
X\sim \chi^2(n)
$$

则

$$
E(X)=n,\qquad D(X)=2n
$$

若 $X\sim \chi^2(n_1)$，$Y\sim \chi^2(n_2)$，且 $X,Y$ 独立，则

$$
X+Y\sim \chi^2(n_1+n_2)
$$

### $t$ 分布

!!! note "$t$ 分布"
    若

    $$
    Z\sim N(0,1),\qquad Y\sim \chi^2(n)
    $$

    且 $Z,Y$ 相互独立，则

    $$
    T=\frac{Z}{\sqrt{Y/n}}
    $$

    服从自由度为 $n$ 的 $t$ 分布，记作：

    $$
    T\sim t(n)
    $$

<div class="distribution-explorer" data-distribution-explorer data-initial-distribution="t"></div>

$t$ 分布关于 $0$ 对称，形状类似标准正态分布，但尾部更厚。自由度越大，$t(n)$ 越接近 $N(0,1)$。

常用近似记忆：

$$
n\to\infty,\qquad t(n)\Rightarrow N(0,1)
$$

若 $T\sim t(n)$，则均值和方差为：

$$
E(T)=0,\qquad n>1
$$

$$
D(T)=\frac{n}{n-2},\qquad n>2
$$

!!! warning "存在条件"
    $t$ 分布的均值要求 $n>1$，方差要求 $n>2$。这些限制来自尾部积分是否收敛：自由度较小时尾部太厚，对应矩不存在。

    - $t(1)$ 是柯西分布，均值不存在，方差也不存在。
    - $t(2)$ 的均值存在且为 $0$，但方差不存在。
    - 当 $n>2$ 时，方差才等于 $\dfrac{n}{n-2}$，并且随着 $n$ 增大趋近于 $1$。

### $F$ 分布

!!! note "$F$ 分布"
    若

    $$
    X\sim \chi^2(m),\qquad Y\sim \chi^2(n)
    $$

    且 $X,Y$ 相互独立，则

    $$
    F=\frac{X/m}{Y/n}
    $$

    服从第一自由度为 $m$、第二自由度为 $n$ 的 $F$ 分布，记作：

    $$
    F\sim F(m,n)
    $$

    $F$ 分布本质上是两个独立卡方变量分别除以自由度后的比值。它只能取正值，常用于比较两个总体方差。

<div class="distribution-explorer" data-distribution-explorer data-initial-distribution="f"></div>

若

$$
F\sim F(m,n)
$$

则

$$
\frac{1}{F}\sim F(n,m)
$$

这个性质常用来查表或处理右尾概率。

若 $F\sim F(m,n)$，则均值和方差为：

$$
E(F)=\frac{n}{n-2},\qquad n>2
$$

$$
D(F)=\frac{2n^2(m+n-2)}{m(n-2)^2(n-4)},\qquad n>4
$$

!!! warning "存在条件"
    $F(m,n)$ 的均值和方差主要受第二自由度 $n$ 限制，因为分母中的卡方变量可能太接近 $0$，导致右尾太厚，对应积分不收敛。

    - 当 $n\le 2$ 时，均值不存在。
    - 当 $2<n\le 4$ 时，均值存在，方差不存在。
    - 当 $n>4$ 时，方差才等于上面的公式。实际记忆时，均值公式比方差公式更常用。

### 正态总体样本统计量与三大分布

设

$$
X_1,\cdots,X_n\sim N(\mu,\sigma^2)
$$

!!! note "$\chi^2$：正态总体样本方差"
    单个正态总体的样本方差满足

    $$
    \frac{(n-1)S^2}{\sigma^2}\sim \chi^2(n-1)
    $$

    这说明样本方差经过标准化后服从 $\chi^2$ 分布，自由度来自样本方差中的 $n-1$。

!!! note "$t$：样本均值与样本方差"
    正态总体下，样本均值标准化后满足

    $$
    \frac{\overline X-\mu}{\sigma/\sqrt n}\sim N(0,1)
    $$

    同时有

    $$
    \frac{(n-1)S^2}{\sigma^2}\sim \chi^2(n-1)
    $$

    并且 $\overline X$ 与 $S^2$ 相互独立。因此当 $\sigma^2$ 未知、用样本标准差 $S$ 替代 $\sigma$ 时，

    $$
    \frac{\overline X-\mu}{S/\sqrt n}\sim t(n-1)
    $$

!!! note "$F$：两个正态总体样本方差"
    设两个正态总体相互独立：

    $$
    X_1,\cdots,X_{n_1}\sim N(\mu_1,\sigma_1^2)
    $$

    $$
    Y_1,\cdots,Y_{n_2}\sim N(\mu_2,\sigma_2^2)
    $$

    对应样本方差为 $S_1^2,S_2^2$，则

    $$
    \frac{S_1^2/\sigma_1^2}{S_2^2/\sigma_2^2}\sim F(n_1-1,n_2-1)
    $$

    特别地，若检验

    $$
    \sigma_1^2=\sigma_2^2
    $$

    则

    $$
    \frac{S_1^2}{S_2^2}\sim F(n_1-1,n_2-1)
    $$

## 数字特征与不等式

### 切比雪夫不等式

!!! note "切比雪夫不等式"
    若随机变量 $X$ 的期望为 $\mu$，方差为 $\sigma^2$，则对任意 $k>0$，

    $$
    P(|X-\mu|\ge k\sigma)\le \frac{1}{k^2}
    $$

    等价地，

    $$
    P(|X-\mu|<k\sigma)\ge 1-\frac{1}{k^2}
    $$

它说明：只要方差有限，随机变量偏离均值很多倍标准差的概率就不会太大。

常见结论：

- $P(|X-\mu|<2\sigma)\ge \frac{3}{4}$
- $P(|X-\mu|<3\sigma)\ge \frac{8}{9}$

!!! warning "注意"
    切比雪夫不等式不要求随机变量服从正态分布，因此适用范围很广，但给出的估计通常比较保守。

### 协方差与相关系数

!!! note "协方差"
    协方差为：

    $$
    \operatorname{Cov}(X,Y)=E[(X-E(X))(Y-E(Y))]
    $$

    它也可以写成：

    $$
    \operatorname{Cov}(X,Y)=E(XY)-E(X)E(Y)
    $$

!!! note "相关系数"
    相关系数为：

    $$
    \rho_{XY}=\frac{\operatorname{Cov}(X,Y)}{\sqrt{D(X)}\sqrt{D(Y)}}
    $$

并满足

$$
-1 \le \rho_{XY} \le 1
$$

!!! warning "易错点"
    若 $X,Y$ 独立，则一定有

    $$
    \operatorname{Cov}(X,Y)=0
    $$

    但“协方差为 $0$”一般不能反推 $X,Y$ 独立。

## 大数定律与中心极限定理

### 大数定律

!!! note "大数定律"
    大数定律说明：样本均值在样本量足够大时会接近期望。

    若 $X_1,X_2,\dots,X_n$ 独立同分布，且

    $$
    E(X_i)=\mu
    $$

    则

    $$
    \overline{X}=\frac{1}{n}\sum_{i=1}^n X_i
    $$

    会随着 $n$ 的增大趋近于 $\mu$。

### 中心极限定理

!!! note "中心极限定理"
    若 $X_1,\dots,X_n$ 独立同分布，且

    $$
    E(X_i)=\mu,\qquad D(X_i)=\sigma^2
    $$

    则当 $n$ 足够大时，

    $$
    \frac{\overline{X}-\mu}{\sigma/\sqrt{n}} \approx N(0,1)
    $$

## 随机变量函数的分布

### 通用方法

处理 $Y=g(X)$ 时，核心是把关于 $Y$ 的事件转回关于 $X$ 的事件。离散型直接合并同一个函数值对应的概率；连续型尤其遇到非单调变换时，优先从分布函数入手。

#### 离散型

!!! note "离散型函数分布"
    若 $X$ 是离散型，取值为 $x_1,x_2,\cdots$，概率为

    $$
    P(X=x_i)=p_i,
    $$

    令 $Y=g(X)$。则

    $$
    P(Y=y)=\sum_{i:g(x_i)=y}P(X=x_i).
    $$

#### 连续型

!!! note "连续型函数分布"
    对连续型随机变量来说，$Y=g(X)$ 的密度往往不容易直接看出来。可以先求分布函数，把问题转回我们更熟悉的概率事件：

    $$
    F_Y(y)=P(Y\le y)=P(g(X)\le y).
    $$

    把事件 $g(X)\le y$ 转换成关于 $X$ 的取值范围，再用 $X$ 的分布计算这个概率。最后如果需要密度，再对 $F_Y(y)$ 求导。

!!! question "例题：均匀分布的平方"
    设 $X\sim U(-1,2)$，令

    $$
    Y=X^2.
    $$

    求 $Y$ 的分布函数与密度。

    ??? success "参考答案"
        $X$ 的密度为

        $$
        f_X(x)=\frac13,\qquad -1<x<2.
        $$

        因为 $X\in(-1,2)$，所以

        $$
        Y\in[0,4).
        $$

        对 $y<0$，

        $$
        F_Y(y)=0.
        $$

        对 $0\le y<1$，

        $$
        Y\le y
        \Longleftrightarrow
        -\sqrt y\le X\le \sqrt y.
        $$

        这段区间完全落在 $(-1,2)$ 内，所以

        $$
        F_Y(y)=\int_{-\sqrt y}^{\sqrt y}\frac13\,\mathrm dx
        =
        \frac{2\sqrt y}{3}.
        $$

        对 $1\le y<4$，

        $-\sqrt y<-1$，左端已经超过 $X$ 的支撑范围，只能取

        $$
        -1<X\le \sqrt y.
        $$

        因此

        $$
        F_Y(y)=\int_{-1}^{\sqrt y}\frac13\,\mathrm dx
        =
        \frac{1+\sqrt y}{3}.
        $$

        对 $y\ge4$，

        $$
        F_Y(y)=1.
        $$

        综上，

        $$
        F_Y(y)=
        \begin{cases}
        0, & y<0,\\[4pt]
        \dfrac{2\sqrt y}{3}, & 0\le y<1,\\[8pt]
        \dfrac{1+\sqrt y}{3}, & 1\le y<4,\\[8pt]
        1, & y\ge4.
        \end{cases}
        $$

        对连续部分求导得

        $$
        f_Y(y)=
        \begin{cases}
        \dfrac{1}{3\sqrt y}, & 0<y<1,\\[8pt]
        \dfrac{1}{6\sqrt y}, & 1<y<4,\\[8pt]
        0, & \text{其他}.
        \end{cases}
        $$

        $y=1$ 处密度可以任意定义，不影响分布。

#### 混合型

有些 $g(X)$ 会产生“连续部分加点概率”的混合分布。例如

$$
Y=\max(X,0).
$$

若 $X$ 是连续型，虽然 $X$ 本身没有点概率，但 $Y$ 可能在 $0$ 处有点概率：

$$
P(Y=0)=P(X\le0).
$$

!!! warning "连续变量变换后不一定仍然纯连续"
    若 $g$ 把一段区间压成一个点，例如 $\max(X,0)$ 把 $(-\infty,0]$ 都压成 $0$，那么 $Y$ 会在这个点产生概率质量。

!!! question "例题：截断函数"
    设 $X\sim U(-1,1)$，令

    $$
    Y=\max(X,0).
    $$

    求 $Y$ 的分布。

    ??? success "参考答案"
        当 $X\le0$ 时，$Y=0$。所以

        $$
        P(Y=0)=P(X\le0)=\frac12.
        $$

        当 $0<y<1$ 时，$Y=X$，密度继承自 $X$：

        $$
        f_Y(y)=\frac12,\qquad 0<y<1.
        $$

        因此 $Y$ 不是纯连续型，而是由一个点概率和一段连续密度组成：

        $$
        P(Y=0)=\frac12,\qquad
        f_Y(y)=\frac12,\ 0<y<1.
        $$

        检查总概率：

        $$
        \frac12+\int_0^1\frac12\,\mathrm dy=1.
        $$

### 反函数法

!!! note "反函数法"
    设 $X$ 有密度 $f_X(x)$，$Y=g(X)$。若 $g$ 在区间 $I$ 上严格单调可导，且 $X$ 的取值都落在 $I$ 内，则可以令

    $$
    x=h(y)=g^{-1}(y).
    $$

    此时 $Y$ 的密度为

    $$
    f_Y(y)=f_X(h(y))\left|h'(y)\right|,
    \qquad y\in g(I).
    $$

    在 $g(I)$ 外，

    $$
    f_Y(y)=0.
    $$

??? note "导数因子的来源"
    密度表示“单位长度上的概率”。变量从 $x$ 变为 $y$ 后，长度尺度发生改变，所以要乘上 $\left|\dfrac{\mathrm dx}{\mathrm dy}\right|$。这个因子常被漏掉。

    从小区间看，变量变换保持的是对应区间里的概率。若 $x$ 附近的小区间对应到 $y=g(x)$ 附近的小区间，则近似有

    $$
    P(x<X<x+\mathrm dx)
    \approx
    P(y<Y<y+\mathrm dy),
    $$

    也就是

    $$
    f_X(x)\,|\mathrm dx|
    \approx
    f_Y(y)\,|\mathrm dy|.
    $$

    因此

    $$
    f_Y(y)
    =
    f_X(x)\left|\frac{\mathrm dx}{\mathrm dy}\right|.
    $$

    也可以从分布函数直接看出来。先设 $g$ 严格递增，反函数为 $h=g^{-1}$，则

    $$
    F_Y(y)=P(Y\le y)=P(g(X)\le y)=P(X\le h(y))=F_X(h(y)).
    $$

    两边对 $y$ 求导：

    $$
    f_Y(y)=f_X(h(y))h'(y).
    $$

    若 $g$ 严格递减，则

    $$
    F_Y(y)=P(g(X)\le y)=P(X\ge h(y))=1-F_X(h(y)),
    $$

    因而

    $$
    f_Y(y)=-f_X(h(y))h'(y).
    $$

    递减时 $h'(y)<0$，所以 $-h'(y)=\lvert h'(y)\rvert$。两种情况合在一起就是

    $$
    f_Y(y)=f_X(h(y))|h'(y)|.
    $$

!!! question "例题：指数变换"
    设 $X\sim U(0,1)$，令

    $$
    Y=\mathrm e^X.
    $$

    求 $Y$ 的密度。

    ??? success "参考答案"
        因为 $X\in(0,1)$，所以

        $$
        Y\in(1,\mathrm e).
        $$

        由 $y=\mathrm e^x$ 得

        $$
        x=\ln y,\qquad \frac{\mathrm dx}{\mathrm dy}=\frac1y.
        $$

        又 $f_X(x)=1,\ 0<x<1$，所以

        $$
        f_Y(y)=f_X(\ln y)\frac1y=\frac1y,\qquad 1<y<\mathrm e.
        $$

        即

        $$
        f_Y(y)=
        \begin{cases}
        \dfrac1y, & 1<y<\mathrm e,\\
        0, & \text{其他}.
        \end{cases}
        $$

### 多分支密度公式

!!! note "多分支密度公式"
    若 $g$ 在支撑区间内可以分成若干个单调分支，并且对给定 $y$，方程

    $$
    g(x)=y
    $$

    有有限多个根

    $$
    x_1(y),x_2(y),\cdots,x_m(y),
    $$

    则在正则点上有

    $$
    f_Y(y)=
    \sum_{k=1}^m
    f_X(x_k(y))
    \left|
    \frac{\mathrm d x_k(y)}{\mathrm d y}
    \right|.
    $$

    等价地，如果 $g'(x_k(y))\ne0$，也可以写成

    $$
    f_Y(y)=
    \sum_{k=1}^m
    \frac{f_X(x_k(y))}{|g'(x_k(y))|}.
    $$

!!! warning "分支必须落在支撑内"
    方程 $g(x)=y$ 解出来的根不一定都能用。只有满足 $x_k(y)$ 落在 $X$ 的支撑范围内的分支，才会贡献密度。

!!! question "例题：标准正态平方"
    设 $X\sim N(0,1)$，令

    $$
    Y=X^2.
    $$

    求 $Y$ 的密度。

    ??? success "参考答案"
        当 $y>0$ 时，方程 $x^2=y$ 有两个根：

        $$
        x_1=\sqrt y,\qquad x_2=-\sqrt y.
        $$

        对应反函数导数为

        $$
        \left|\frac{\mathrm d}{\mathrm dy}\sqrt y\right|
        =
        \left|\frac{\mathrm d}{\mathrm dy}(-\sqrt y)\right|
        =
        \frac{1}{2\sqrt y}.
        $$

        标准正态密度为

        $$
        \varphi(x)=\frac{1}{\sqrt{2\pi}}\mathrm e^{-x^2/2}.
        $$

        所以

        $$
        \begin{aligned}
        f_Y(y)
        &=
        \varphi(\sqrt y)\frac{1}{2\sqrt y}
        +
        \varphi(-\sqrt y)\frac{1}{2\sqrt y}\\
        &=
        \frac{1}{\sqrt{2\pi y}}\mathrm e^{-y/2},
        \qquad y>0.
        \end{aligned}
        $$

        即

        $$
        f_Y(y)=
        \begin{cases}
        \dfrac{1}{\sqrt{2\pi y}}\mathrm e^{-y/2}, & y>0,\\[8pt]
        0, & y\le0.
        \end{cases}
        $$

        这正是自由度为 $1$ 的 $\chi^2$ 分布。

!!! question "例题：绝对值变换"
    令 $Y=\lvert X\rvert$。先写出一般密度公式，再求 $X\sim N(0,\sigma^2)$ 时 $Y$ 的密度。

    ??? success "参考答案"
        绝对值题本质上也是多分支题。当 $y>0$ 时，$\lvert x\rvert=y$ 有两个原像：

        $$
        x=y,\qquad x=-y.
        $$

        因此

        $$
        f_Y(y)=f_X(y)+f_X(-y),\qquad y>0.
        $$

        若 $X$ 在 $0$ 处有点概率，还要单独处理

        $$
        P(Y=0)=P(X=0).
        $$

        当 $X\sim N(0,\sigma^2)$ 时，$X$ 的密度为

        $$
        f_X(x)=\frac{1}{\sqrt{2\pi}\sigma}
        \exp\left(-\frac{x^2}{2\sigma^2}\right).
        $$

        对 $y>0$，

        $$
        f_Y(y)=f_X(y)+f_X(-y).
        $$

        由于正态密度关于 $0$ 对称，

        $$
        f_X(y)=f_X(-y).
        $$

        所以

        $$
        f_Y(y)=
        \frac{2}{\sqrt{2\pi}\sigma}
        \exp\left(-\frac{y^2}{2\sigma^2}\right),
        \qquad y>0.
        $$

        即

        $$
        f_Y(y)=
        \begin{cases}
        \dfrac{2}{\sqrt{2\pi}\sigma}
        \exp\left(-\dfrac{y^2}{2\sigma^2}\right), & y>0,\\[8pt]
        0, & y\le0.
        \end{cases}
        $$

## 二维随机变量

### 联合分布、边缘分布与条件分布

!!! note "离散型二维随机变量"
    离散型二维随机变量用联合分布律 $P(X=x_i,Y=y_j)$ 描述。边缘分布通过对另一变量求和得到：

    $$
    P(X=x_i)=\sum_j P(X=x_i,Y=y_j),
    \qquad
    P(Y=y_j)=\sum_i P(X=x_i,Y=y_j).
    $$

    条件分布为

    $$
    P(Y=y_j\mid X=x_i)
    =
    \frac{P(X=x_i,Y=y_j)}{P(X=x_i)},
    \qquad P(X=x_i)>0.
    $$

    若对所有 $i,j$ 都有

    $$
    P(X=x_i,Y=y_j)=P(X=x_i)P(Y=y_j),
    $$

    则 $X,Y$ 独立。

### 联合密度与积分区域

!!! note "连续型二维随机变量"
    连续型二维随机变量用联合密度 $f(x,y)$ 描述。边缘密度为

    $$
    f_X(x)=\int_{-\infty}^{+\infty} f(x,y)\,\mathrm dy,
    \qquad
    f_Y(y)=\int_{-\infty}^{+\infty} f(x,y)\,\mathrm dx.
    $$

    条件密度为

    $$
    f_{Y\mid X}(y\mid x)=\frac{f(x,y)}{f_X(x)},
    \qquad f_X(x)>0.
    $$

    二维分布函数为

    $$
    F(x,y)=P(X\le x,Y\le y)
    =
    \int_{-\infty}^{x}\int_{-\infty}^{y} f(u,v)\,\mathrm dv\,\mathrm du.
    $$

### 二维变量变换法

!!! note "变换公式"
    设连续型二维随机变量 $(X_1,X_2)$ 的联合密度为 $f_{X_1,X_2}(x_1,x_2)$。若引入新变量

    $$
    Y_1=g_1(X_1,X_2),\qquad Y_2=g_2(X_1,X_2),
    $$

    并且可以反解为

    $$
    X_1=x_1(y_1,y_2),\qquad X_2=x_2(y_1,y_2),
    $$

    则

    $$
    f_{Y_1,Y_2}(y_1,y_2)
    =
    f_{X_1,X_2}\bigl(x_1(y_1,y_2),x_2(y_1,y_2)\bigr)
    \left|
    \frac{\partial(x_1,x_2)}{\partial(y_1,y_2)}
    \right|.
    $$

    这里的

    $$
    \left|
    \frac{\partial(x_1,x_2)}{\partial(y_1,y_2)}
    \right|
    $$

    是变换的 Jacobian 绝对值。

    对二维情形，Jacobian 行列式可以显式写成

    $$
    \frac{\partial(x_1,x_2)}{\partial(y_1,y_2)}
    =
    \begin{vmatrix}
    \dfrac{\partial x_1}{\partial y_1} &
    \dfrac{\partial x_1}{\partial y_2}\\[8pt]
    \dfrac{\partial x_2}{\partial y_1} &
    \dfrac{\partial x_2}{\partial y_2}
    \end{vmatrix}
    =
    \frac{\partial x_1}{\partial y_1}
    \frac{\partial x_2}{\partial y_2}
    -
    \frac{\partial x_1}{\partial y_2}
    \frac{\partial x_2}{\partial y_1}.
    $$

    代入密度公式时取它的绝对值。

!!! note "小面积概率的直觉"
    二维变量变换和一维反函数法的思想相同：对应区域里的概率不变。一维中是小区间概率对应，

    $$
    f_X(x)\,|\mathrm dx|
    \approx
    f_Y(y)\,|\mathrm dy|;
    $$

    二维中则是小面积概率对应，

    $$
    f_{X_1,X_2}(x_1,x_2)\,|\mathrm dx_1\mathrm dx_2|
    \approx
    f_{Y_1,Y_2}(y_1,y_2)\,|\mathrm dy_1\mathrm dy_2|.
    $$

    Jacobian 绝对值就是两个小面积之间的尺度修正因子。

如果只关心其中一个变量，例如只要求 $Y_1$ 的密度，就先求出 $(Y_1,Y_2)$ 的联合密度，再对辅助变量 $Y_2$ 积分：

$$
f_{Y_1}(y_1)=\int_{-\infty}^{+\infty}f_{Y_1,Y_2}(y_1,y_2)\,\mathrm dy_2.
$$

!!! question "例题：两个独立标准正态变量之比"
    设

    $$
    X_1\sim N(0,1),\qquad X_2\sim N(0,1),
    $$

    且 $X_1,X_2$ 相互独立。令

    $$
    Y=\frac{X_1}{X_2}.
    $$

    求 $Y$ 的密度。

    ??? success "参考答案"
        先保留一个辅助变量。令

        $$
        Z=X_2.
        $$

        于是

        $$
        Y=\frac{X_1}{X_2},\qquad Z=X_2.
        $$

        反解得到

        $$
        X_1=YZ,\qquad X_2=Z.
        $$

        也就是

        $$
        x_1=yz,\qquad x_2=z.
        $$

        Jacobian 为

        $$
        \left|
        \frac{\partial(x_1,x_2)}{\partial(y,z)}
        \right|
        =
        \left|
        \begin{vmatrix}
        z & y\\
        0 & 1
        \end{vmatrix}
        \right|
        =|z|.
        $$

        因为 $X_1,X_2$ 独立，所以联合密度为

        $$
        f_{X_1,X_2}(x_1,x_2)
        =
        \frac{1}{2\pi}e^{-\frac{x_1^2+x_2^2}{2}}.
        $$

        代入 $x_1=yz,x_2=z$，并乘上 Jacobian：

        $$
        f_{Y,Z}(y,z)
        =
        \frac{1}{2\pi}
        e^{-\frac{(yz)^2+z^2}{2}}|z|
        =
        \frac{1}{2\pi}
        e^{-\frac{(1+y^2)z^2}{2}}|z|.
        $$

        对 $z$ 积分：

        $$
        f_Y(y)
        =
        \int_{-\infty}^{+\infty}
        \frac{1}{2\pi}
        e^{-\frac{(1+y^2)z^2}{2}}|z|\,\mathrm dz.
        $$

        被积函数关于 $z$ 是偶函数，所以

        $$
        f_Y(y)
        =
        \frac{1}{\pi}
        \int_0^{+\infty}
        z e^{-\frac{(1+y^2)z^2}{2}}\,\mathrm dz.
        $$

        令

        $$
        u=\frac{(1+y^2)z^2}{2},
        $$

        则

        $$
        \mathrm du=(1+y^2)z\,\mathrm dz.
        $$

        因此

        $$
        \int_0^{+\infty}
        z e^{-\frac{(1+y^2)z^2}{2}}\,\mathrm dz
        =
        \frac{1}{1+y^2}\int_0^{+\infty}e^{-u}\,\mathrm du
        =
        \frac{1}{1+y^2}.
        $$

        最终

        $$
        f_Y(y)=\frac{1}{\pi(1+y^2)},\qquad -\infty<y<+\infty.
        $$

        所以

        $$
        \frac{X_1}{X_2}\sim C(0,1).
        $$

### 协方差与相关系数

!!! note "协方差与相关系数"
    协方差可由

    $$
    \operatorname{Cov}(X,Y)=E(XY)-E(X)E(Y)
    $$

    计算。相关系数为

    $$
    \rho_{XY}=
    \frac{\operatorname{Cov}(X,Y)}
    {\sqrt{D(X)}\sqrt{D(Y)}}.
    $$

!!! warning "独立与不相关"
    若 $X,Y$ 独立，则 $\operatorname{Cov}(X,Y)=0$。反过来一般不成立，只有在联合正态等特殊条件下，不相关才推出独立。

!!! question "例题：二维正态样本均值差的二阶矩"
    设总体 $(X,Y)$ 服从

    $$
    N(0,0;1,2;1),
    $$

    $(X_1,Y_1),(X_2,Y_2)$ 是来自总体 $(X,Y)$ 的简单随机样本，

    $$
    \overline X=\frac{X_1+X_2}{2},
    \qquad
    \overline Y=\frac{Y_1+Y_2}{2}.
    $$

    求

    $$
    E\left[(\overline X-\overline Y)^2\right].
    $$

    ??? success "参考答案"
        这题主要考从二维正态记号中读出方差、相关系数和协方差，再计算线性组合的二阶矩。

        由

        $$
        (X,Y)\sim N(0,0;1,2;1)
        $$

        可得

        $$
        E(X)=E(Y)=0,\qquad D(X)=1,\qquad D(Y)=2,\qquad \rho=1.
        $$

        因此

        $$
        \operatorname{Cov}(X,Y)=\rho\sqrt{D(X)}\sqrt{D(Y)}
        =1\cdot 1\cdot \sqrt2
        =\sqrt2.
        $$

        先算一个样本对内部的差：

        $$
        D(X-Y)=D(X)+D(Y)-2\operatorname{Cov}(X,Y)
        =1+2-2\sqrt2
        =3-2\sqrt2.
        $$

        又

        $$
        \overline X-\overline Y
        =
        \frac{(X_1-Y_1)+(X_2-Y_2)}{2}.
        $$

        因为简单随机样本中不同样本对相互独立，所以 $X_1-Y_1$ 与 $X_2-Y_2$ 相互独立，于是

        $$
        \begin{aligned}
        D(\overline X-\overline Y)
        &=
        \frac{1}{4}\left[D(X_1-Y_1)+D(X_2-Y_2)\right] \\
        &=
        \frac{1}{4}\cdot 2(3-2\sqrt2) \\
        &=
        \frac{3}{2}-\sqrt2.
        \end{aligned}
        $$

        由于

        $$
        E(\overline X-\overline Y)=0,
        $$

        所以

        $$
        E\left[(\overline X-\overline Y)^2\right]
        =
        D(\overline X-\overline Y)
        =
        \frac{3}{2}-\sqrt2.
        $$

        本题对应选项为 $\frac{3}{2}-\sqrt2$。

## 参数估计与置信区间

### 无偏性、偏差与有效性

!!! note "偏差"
    估计量 $\hat\theta$ 的偏差为

    $$
    \operatorname{Bias}(\hat\theta)=E(\hat\theta)-\theta.
    $$

!!! note "无偏估计量"
    若 $E(\hat\theta)=\theta$，则称 $\hat\theta$ 是无偏估计量。对于两个无偏估计量，方差更小者通常更有效。

### 矩估计

!!! note "矩估计"
    矩估计的做法是用样本矩替换总体矩。若参数 $\theta$ 可以由

    $$
    E(X)=m(\theta)
    $$

    表示，则令

    $$
    \overline X=m(\theta)
    $$

    并解出 $\theta$。

### 最大似然估计

!!! note "最大似然估计"
    设样本联合密度或联合概率为

    $$
    L(\theta)=\prod_{i=1}^n f(X_i;\theta).
    $$

    最大似然估计就是使 $L(\theta)$ 最大的参数值。通常取对数：

    $$
    \ell(\theta)=\ln L(\theta).
    $$

    然后解

    $$
    \ell'(\theta)=0.
    $$

### 正态总体均值的置信区间

!!! note "正态总体均值的置信区间"
    若总体为 $N(\mu,\sigma^2)$，且 $\sigma^2$ 已知，则

    $$
    \frac{\overline X-\mu}{\sigma/\sqrt n}\sim N(0,1),
    $$

    所以 $1-\alpha$ 置信区间为

    $$
    \overline x\pm z_{\alpha/2}\frac{\sigma}{\sqrt n}.
    $$

    若 $\sigma^2$ 未知，用样本标准差 $S$ 替代，则

    $$
    \frac{\overline X-\mu}{S/\sqrt n}\sim t(n-1),
    $$

    对应置信区间为

    $$
    \overline x\pm t_{\alpha/2}(n-1)\frac{s}{\sqrt n}.
    $$

## 假设检验


### 原假设与备择假设

!!! note "原假设与备择假设"
    假设检验通常先给出两个假设：

    $$
    H_0:\text{原假设或零假设},
    \qquad
    H_1:\text{备择假设}.
    $$

    $H_0$ 通常表示默认模型、基准结论或待检验的等号条件；$H_1$ 表示样本一旦明显偏离 $H_0$，更倾向接受的方向。

    常见参数检验会写成：

    $$
    H_0:\theta=\theta_0.
    $$

    备择假设根据问题方向分为：

    $$
    H_1:\theta>\theta_0,\qquad
    H_1:\theta<\theta_0,\qquad
    H_1:\theta\ne\theta_0.
    $$

!!! tip "原假设通常包含等号"
    常规参数检验中，$H_0$ 一般写成包含等号的形式。若备择假设有方向，常见对应关系为：

    | 备择假设 | 常见原假设 | 检验方向 |
    | --- | --- | --- |
    | $H_1:\theta>\theta_0$ | $H_0:\theta\le \theta_0$ | 右侧检验 |
    | $H_1:\theta<\theta_0$ | $H_0:\theta\ge \theta_0$ | 左侧检验 |
    | $H_1:\theta\ne\theta_0$ | $H_0:\theta=\theta_0$ | 双侧检验 |

    这样写是为了在 $H_0$ 成立时控制第一类错误概率。边界点 $\theta=\theta_0$ 通常最接近备择方向，也是确定临界值时最关键的位置。严格地说，“包含等号”是常规检验里的建模习惯，不是原假设的逻辑定义。


$H_1$ 是否等于 $H_0$ 的补集，要看题目给定的模型空间。如果题目只在 $\theta=\theta_0$ 与 $\theta\ne\theta_0$ 之间讨论，那么 $H_1$ 是参数空间内的补集。如果题目指定两个具体分布 $f_0(x)$ 与 $f_1(x)$，那就是在两个候选模型之间判断，不能把 $H_1$ 扩大成“所有不是 $f_0(x)$ 的分布”。

$H_0$ 与 $H_1$ 应当互斥：同一个真实参数值或同一个真实分布，不能同时满足二者。但它们不一定穷尽所有可能情况。题目可以只指定两个候选模型来比较，此时还有很多模型既不属于 $H_0$，也不属于 $H_1$，只是当前检验没有讨论它们。

### 简单假设与复合假设

!!! note "简单假设"
    在参数模型或分布族已经给定时，如果一个假设能把总体分布唯一确定下来，这个假设称为简单假设。

    换成参数语言：若参数空间为 $\Theta$，假设只包含一个参数点

    $$
    H:\theta=\theta_0,
    $$

    并且 $\theta_0$ 一旦确定，总体分布 $P_{\theta_0}$ 也随之唯一确定，那么 $H$ 就是简单假设。

!!! note "复合假设"
    如果一个假设对应多个可能的总体分布，则称为复合假设。它通常表现为参数没有被完全指定，或者假设本身包含多个参数值，例如：

    $$
    H:\theta>\theta_0,\qquad H:\theta\ne\theta_0.
    $$

设样本来自正态总体 $N(\mu,\sigma^2)$。如果方差已知，例如 $\sigma^2=4$，那么

$$
H_0:\mu=10
$$

会把总体分布唯一确定为

$$
N(10,4),
$$

所以这是简单假设。

如果只知道总体服从 $N(\mu,\sigma^2)$，但 $\sigma^2$ 未知，那么 $H_0:\mu=10$ 下面仍可能是

$$
N(10,1),\quad N(10,4),\quad N(10,9),\quad \dots
$$

它没有唯一确定总体分布，因此是复合假设。

### 检验统计量与拒绝域

!!! note "检验统计量与拒绝域"
    做检验时，需要构造一个统计量：

    $$
    T=T(X_1,\cdots,X_n).
    $$

    统计量的关键要求是：当 $H_0$ 成立时，$T$ 的分布应当已知或可近似确定。

    设拒绝域为 $W$。若样本算出的统计量落入 $W$，就拒绝 $H_0$；否则不拒绝 $H_0$。

    $$
    T\in W\Rightarrow \text{拒绝 }H_0,
    \qquad
    T\notin W\Rightarrow \text{不拒绝 }H_0.
    $$


### 两类错误

!!! note "两类错误"
    假设检验可能犯两类错误：

    | 真实情况 | 检验结论 | 错误类型 | 概率 |
    | --- | --- | --- | --- |
    | $H_0$ 真 | 拒绝 $H_0$ | 第一类错误 | $\alpha$ |
    | $H_1$ 真 | 不拒绝 $H_0$ | 第二类错误 | $\beta$ |

    第一类错误概率为：

    $$
    \alpha=P_{H_0}(\text{拒绝 }H_0).
    $$

    第二类错误概率为：

    $$
    \beta=P_{H_1}(\text{不拒绝 }H_0).
    $$

    检验功效为：

    $$
    1-\beta=P_{H_1}(\text{拒绝 }H_0).
    $$


### 显著性水平与临界值

!!! note "显著性水平与临界值"
    显著性水平 $\alpha$ 是事先控制的第一类错误概率上限。常见取值有：

    $$
    0.10,\qquad 0.05,\qquad 0.01.
    $$

    例如 $Z\sim N(0,1)$，若用右尾概率记号 $z_\alpha$ 表示：

    $$
    P(Z>z_\alpha)=\alpha,
    $$

    则右侧检验常用拒绝域：

    $$
    Z>z_\alpha.
    $$

    单个均值的标准正态检验中，三种备择假设对应的拒绝域如下：

    | 备择假设 | 检验类型 | 拒绝域 |
    | --- | --- | --- |
    | $H_1:\mu>\mu_0$ | 右侧检验 | $Z>z_\alpha$ |
    | $H_1:\mu<\mu_0$ | 左侧检验 | $Z<-z_\alpha$ |
    | $H_1:\mu\ne\mu_0$ | 双侧检验 | $\lvert Z\rvert>z_{\alpha/2}$ |

### $p$ 值

!!! note "$p$ 值"
    $p$ 值是在 $H_0$ 成立的前提下，观察到当前样本结果或更极端结果的概率。

    若 $p$ 值很小，说明当前样本在 $H_0$ 下很少见，于是拒绝 $H_0$。判断规则为：

    $$
    p\le \alpha\Rightarrow \text{拒绝 }H_0,
    \qquad
    p>\alpha\Rightarrow \text{不拒绝 }H_0.
    $$

    以标准正态统计量的观测值 $z_{\text{obs}}$ 为例：

    | 检验类型 | $p$ 值 |
    | --- | --- |
    | 右侧检验 | $P(Z\ge z_{\text{obs}})$ |
    | 左侧检验 | $P(Z\le z_{\text{obs}})$ |
    | 双侧检验 | $2P(Z\ge \lvert z_{\text{obs}}\rvert)$ |






<script src="../assets/distribution-explorer/shared.js"></script>
<script src="../assets/distribution-explorer/binomial.js"></script>
<script src="../assets/distribution-explorer/geometric.js"></script>
<script src="../assets/distribution-explorer/hypergeometric.js"></script>
<script src="../assets/distribution-explorer/poisson.js"></script>
<script src="../assets/distribution-explorer/exponential.js"></script>
<script src="../assets/distribution-explorer/normal.js"></script>
<script src="../assets/distribution-explorer/chi-square.js"></script>
<script src="../assets/distribution-explorer/t.js"></script>
<script src="../assets/distribution-explorer/f.js"></script>
<script src="../assets/distribution-explorer/core.js"></script>
