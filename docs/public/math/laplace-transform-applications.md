# 拉普拉斯变换在微分方程中的应用

!!! abstract "学习目标"
    这篇笔记整理拉普拉斯变换在高数和常微分方程中的常用用途：把初值问题、卷积积分和分段外力转化为代数式。重点放在解题流程、常用公式和易错点。

## 1. 定义与收敛域

本文采用单边拉普拉斯变换：

$$
F(s)
=
\mathcal L\{f(t)\}
=
\int_{0}^{+\infty}
f(t)\mathrm e^{-st}\,\mathrm dt,
\qquad
s=\sigma+\mathrm i\omega.
$$

若积分在某个复数 $s$ 处收敛，就称 $F(s)$ 在该点存在。所有使积分收敛的 $s$ 组成收敛域，常记为 ROC。

!!! note "常用存在定理"
    若 $f(t)$ 在任意有限区间上分段连续，并且存在常数 $M,c$ 使得

    $$
    |f(t)|\le M\mathrm e^{ct},
    \qquad t\ge0,
    $$

    则 $\mathcal L\{f(t)\}$ 至少在半平面 $\operatorname{Re}s>c$ 内存在。

!!! warning "不要忽略收敛域"
    例如

    $$
    \mathcal L\{\mathrm e^{at}\}
    =
    \frac{1}{s-a}
    $$

    还要配上 $\operatorname{Re}s>a$。同一个代数式在双边拉普拉斯变换中可能对应不同函数，收敛域能区分这些情况。

## 2. 常用变换对

下面默认 $n$ 是非负整数，且写出的收敛域为常用单边情形。

$$
\begin{aligned}
\mathcal L\{1\}
&=
\frac{1}{s},
&&\operatorname{Re}s>0,\\
\mathcal L\{t^n\}
&=
\frac{n!}{s^{n+1}},
&&\operatorname{Re}s>0,\\
\mathcal L\{\mathrm e^{at}\}
&=
\frac{1}{s-a},
&&\operatorname{Re}s>a,\\
\mathcal L\{\cos bt\}
&=
\frac{s}{s^2+b^2},
&&\operatorname{Re}s>0,\\
\mathcal L\{\sin bt\}
&=
\frac{b}{s^2+b^2},
&&\operatorname{Re}s>0,\\
\mathcal L\{\mathrm e^{at}\cos bt\}
&=
\frac{s-a}{(s-a)^2+b^2},
&&\operatorname{Re}s>a,\\
\mathcal L\{\mathrm e^{at}\sin bt\}
&=
\frac{b}{(s-a)^2+b^2},
&&\operatorname{Re}s>a.
\end{aligned}
$$

重复极点对应指数乘多项式：

$$
\mathcal L^{-1}
\left\{
\frac{1}{(s-a)^k}
\right\}
=
\frac{t^{k-1}}{(k-1)!}\mathrm e^{at},
\qquad k=1,2,\cdots.
$$

## 3. 常用性质

设

$$
f(t)\leftrightarrow F(s),
\qquad
g(t)\leftrightarrow G(s).
$$

线性：

$$
af(t)+bg(t)
\leftrightarrow
aF(s)+bG(s).
$$

$s$ 域平移：

$$
\mathrm e^{at}f(t)
\leftrightarrow
F(s-a).
$$

时间延迟：

$$
u(t-a)f(t-a)
\leftrightarrow
\mathrm e^{-as}F(s),
\qquad a>0.
$$

微分性质：

$$
\mathcal L\{f'(t)\}
=
sF(s)-f(0+),
$$

$$
\mathcal L\{f''(t)\}
=
s^2F(s)-sf(0+)-f'(0+).
$$

一般地，$n$ 阶导数会带出 $f(0+),f'(0+),\cdots,f^{(n-1)}(0+)$。这正是拉普拉斯变换适合初值问题的原因。

乘以 $t$：

$$
\mathcal L\{tf(t)\}
=
-F'(s).
$$

积分性质：

$$
\mathcal L
\left\{
\int_0^t f(\tau)\,\mathrm d\tau
\right\}
=
\frac{F(s)}{s}.
$$

卷积：

$$
(f*g)(t)
=
\int_0^t f(\tau)g(t-\tau)\,\mathrm d\tau
\leftrightarrow
F(s)G(s).
$$

!!! tip "解题顺序"
    看到微分方程，先把导数变成 $sF(s)$ 加初值项；看到卷积积分，先把卷积变成乘积；看到 $\mathrm e^{at}$，优先考虑 $s$ 域平移。

## 4. 逆变换方法

基础题最常用的逆变换方法有三类：

1. 查常用变换对。
2. 部分分式分解。
3. 用卷积定理或平移性质化简。

从复变函数角度，反演公式可以写成 Bromwich 积分：

$$
f(t)
=
\frac{1}{2\pi\mathrm i}
\int_{\gamma-\mathrm i\infty}^{\gamma+\mathrm i\infty}
F(s)\mathrm e^{st}\,\mathrm ds,
$$

其中直线 $\operatorname{Re}s=\gamma$ 位于所有相关奇点右侧。对于常见有理函数，逆变换本质上就是计算 $F(s)\mathrm e^{st}$ 的留数。

!!! question "例题 1：部分分式求逆变换"
    求

    $$
    \mathcal L^{-1}
    \left\{
    \frac{2s+3}{(s+1)(s+2)}
    \right\}.
    $$

    ??? success "参考答案"
        分解为

        $$
        \frac{2s+3}{(s+1)(s+2)}
        =
        \frac{1}{s+1}
        +
        \frac{1}{s+2}.
        $$

        所以

        $$
        \boxed{
        \mathcal L^{-1}
        \left\{
        \frac{2s+3}{(s+1)(s+2)}
        \right\}
        =
        \mathrm e^{-t}+\mathrm e^{-2t}
        }.
        $$

!!! question "例题 2：配方后求逆变换"
    求

    $$
    \mathcal L^{-1}
    \left\{
    \frac{s+1}{(s^2+2s+2)^2}
    \right\}.
    $$

    ??? success "参考答案"
        先配方：

        $$
        s^2+2s+2
        =
        (s+1)^2+1.
        $$

        因此

        $$
        \frac{s+1}{(s^2+2s+2)^2}
        =
        \frac{s+1}{\left[(s+1)^2+1\right]^2}.
        $$

        由

        $$
        \mathcal L\{t\sin t\}
        =
        \frac{2s}{(s^2+1)^2}
        $$

        可知

        $$
        \mathcal L^{-1}
        \left\{
        \frac{s}{(s^2+1)^2}
        \right\}
        =
        \frac{1}{2}t\sin t.
        $$

        现在把 $s$ 换成 $s+1$，对应时域乘上 $\mathrm e^{-t}$。所以

        $$
        \boxed{
        \mathcal L^{-1}
        \left\{
        \frac{s+1}{(s^2+2s+2)^2}
        \right\}
        =
        \frac{1}{2}t\mathrm e^{-t}\sin t
        }.
        $$

        !!! tip "这类题的关键"
            看到 $(s^2+2s+2)$ 这类二次式，先配成 $(s+a)^2+b^2$。若分子也正好是 $s+a$，通常可以联系 $\cos bt$ 或 $t\sin bt$ 的变换对。

## 5. 初值问题

拉普拉斯变换解常系数线性微分方程的基本流程：

1. 设未知函数的变换为 $Y(s)$。
2. 对方程两边取拉普拉斯变换。
3. 把初值代入导数公式，得到关于 $Y(s)$ 的代数方程。
4. 解出 $Y(s)$，再做逆变换。

!!! question "例题 3：解一阶初值问题"
    解

    $$
    y'(t)+2y(t)=\mathrm e^{-t},
    \qquad y(0)=3.
    $$

    ??? success "参考答案"
        设 $Y(s)=\mathcal L\{y(t)\}$。两边取拉普拉斯变换：

        $$
        sY(s)-3+2Y(s)=\frac{1}{s+1}.
        $$

        因此

        $$
        Y(s)
        =
        \frac{3}{s+2}
        +
        \frac{1}{(s+1)(s+2)}
        =
        \frac{1}{s+1}
        +
        \frac{2}{s+2}.
        $$

        反变换得到

        $$
        \boxed{
        y(t)=\mathrm e^{-t}+2\mathrm e^{-2t}
        }.
        $$

!!! question "例题 4：含单位阶跃函数的初值问题"
    解

    $$
    y''+3y'+2y=u(t-1),
    \qquad
    y(0)=0,\qquad
    y'(0)=1.
    $$

    ??? success "参考答案"
        设

        $$
        Y(s)=\mathcal L\{y(t)\}.
        $$

        对方程两边取拉普拉斯变换。因为

        $$
        \mathcal L\{y''\}
        =
        s^2Y(s)-sy(0)-y'(0)
        =
        s^2Y(s)-1,
        $$

        $$
        \mathcal L\{y'\}
        =
        sY(s)-y(0)
        =
        sY(s),
        $$

        且

        $$
        \mathcal L\{u(t-1)\}
        =
        \frac{\mathrm e^{-s}}{s},
        $$

        所以

        $$
        (s^2Y-1)+3sY+2Y
        =
        \frac{\mathrm e^{-s}}{s}.
        $$

        整理得到

        $$
        Y(s)
        =
        \frac{1}{(s+1)(s+2)}
        +
        \mathrm e^{-s}
        \frac{1}{s(s+1)(s+2)}.
        $$

        第一项对应

        $$
        \mathrm e^{-t}-\mathrm e^{-2t}.
        $$

        第二项中

        $$
        \frac{1}{s(s+1)(s+2)}
        =
        \frac{1}{2s}
        -
        \frac{1}{s+1}
        +
        \frac{1}{2(s+2)}.
        $$

        记

        $$
        g(t)
        =
        \frac{1}{2}
        -
        \mathrm e^{-t}
        +
        \frac{1}{2}\mathrm e^{-2t}.
        $$

        由第二平移定理，

        $$
        \mathcal L^{-1}\{\mathrm e^{-s}G(s)\}
        =
        u(t-1)g(t-1).
        $$

        所以原初值问题的解为

        $$
        \boxed{
        y(t)
        =
        \mathrm e^{-t}-\mathrm e^{-2t}
        +
        u(t-1)
        \left[
        \frac{1}{2}
        -
        \mathrm e^{-(t-1)}
        +
        \frac{1}{2}\mathrm e^{-2(t-1)}
        \right]
        }.
        $$

        !!! warning "初值项不要漏"
            这里 $\mathcal L\{y''\}=s^2Y-sy(0)-y'(0)$，由于 $y'(0)=1$，所以会多出 $-1$。

## 6. 卷积积分与积分方程

若题目出现

$$
\int_0^t f(\tau)g(t-\tau)\,\mathrm d\tau,
$$

它就是卷积。拉普拉斯变换会把卷积变成乘积，常用于计算卷积积分和求解 Volterra 型积分方程。

!!! question "例题 5：计算卷积积分"
    计算

    $$
    I(t)=\int_0^t \sin \tau\,\mathrm e^{-(t-\tau)}\,\mathrm d\tau.
    $$

    ??? success "参考答案"
        这是

        $$
        I(t)=(\sin t)*(\mathrm e^{-t}).
        $$

        取拉普拉斯变换：

        $$
        \mathcal L\{I(t)\}
        =
        \frac{1}{s^2+1}\cdot\frac{1}{s+1}
        =
        \frac{1}{(s+1)(s^2+1)}.
        $$

        部分分式分解：

        $$
        \frac{1}{(s+1)(s^2+1)}
        =
        \frac{1}{2}\frac{1}{s+1}
        -
        \frac{1}{2}\frac{s}{s^2+1}
        +
        \frac{1}{2}\frac{1}{s^2+1}.
        $$

        因此

        $$
        \boxed{
        I(t)
        =
        \frac{1}{2}\mathrm e^{-t}
        -
        \frac{1}{2}\cos t
        +
        \frac{1}{2}\sin t
        }.
        $$

## 7. 初值定理与终值定理

在条件满足时，

$$
f(0+)
=
\lim_{s\to+\infty}sF(s).
$$

终值定理为

$$
\lim_{t\to+\infty}f(t)
=
\lim_{s\to0}sF(s).
$$

!!! warning "终值定理有稳定性条件"
    终值定理不能机械使用。通常要求 $sF(s)$ 的极点都在左半平面，最多允许原点处有一个简单极点。若存在右半平面极点或虚轴上的非零极点，函数可能发散或持续振荡，终值定理不适用。

## 8. 常见易错点

!!! warning "导数公式里的初值"
    最常见错误是把

    $$
    \mathcal L\{f'(t)\}=sF(s)-f(0+)
    $$

    误写成单纯的 $sF(s)$。只有在零初值条件下，初值项才会消失。

!!! warning "两种平移不要混用"
    $\mathrm e^{at}f(t)$ 对应 $F(s-a)$，而时间延迟 $u(t-a)f(t-a)$ 对应 $\mathrm e^{-as}F(s)$。一个是在 $s$ 里平移，一个是在变换式前乘指数因子。

!!! tip "重根分解"
    若部分分式中出现

    $$
    \frac{A_1}{s-a}
    +
    \frac{A_2}{(s-a)^2}
    +\cdots+
    \frac{A_k}{(s-a)^k},
    $$

    反变换时分别对应

    $$
    A_1\mathrm e^{at}
    +
    A_2t\mathrm e^{at}
    +\cdots+
    A_k\frac{t^{k-1}}{(k-1)!}\mathrm e^{at}.
    $$
