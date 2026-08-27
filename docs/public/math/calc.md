# 高数基础

### 换元

当区域含圆、圆环、扇形，或被积函数含 $x^2+y^2$ 时，常用极坐标：

$$
x=r\cos\theta,\qquad y=r\sin\theta.
$$

面积微元变为

$$
\mathrm d\sigma=r\,\mathrm dr\,\mathrm d\theta.
$$

因此

$$
\iint_D f(x,y)\,\mathrm d\sigma
=
\iint_{D'}
f(r\cos\theta,r\sin\theta)\,r\,\mathrm dr\,\mathrm d\theta.
$$

!!! question "例题"
    计算

    $$
    I=\iint_{x^2+y^2\le a^2}(x^2+y^2)\,\mathrm d\sigma,\qquad a>0.
    $$

    ??? success "参考答案"
        用极坐标，区域为

        $$
        0\le r\le a,\qquad 0\le\theta\le 2\pi.
        $$

        因为 $x^2+y^2=r^2$，且 $\mathrm d\sigma=r\,\mathrm dr\,\mathrm d\theta$，所以

        $$
        I=
        \int_0^{2\pi}\mathrm d\theta
        \int_0^a r^2\cdot r\,\mathrm dr
        =
        2\pi\cdot\frac{a^4}{4}
        =
        \frac{\pi a^4}{2}.
        $$

一般地，对于二元换元成另外二元的时候，缩放的系数是要 Jacobian 矩阵的行列式的绝对值。这里的 Jacobian 矩阵计算结果恰好为 $|r|$，并且考虑到 $r$ 的取值范围是 $[0,\infty)$，所以绝对值的记号可以省略。这一技巧在概统中的 [二维变量变换法](/public/math/stats/#_30) 里也会用到，其中“变换公式”和“小面积概率的直觉”两段对应这里的 Jacobian 面积缩放思想。

## 渐近记号

设 $r$ 是一个趋于 $0$ 的量，$\phi$ 是同一过程中用来比较大小的参照量。

若

$$
\frac{r}{\phi}\to 0,
$$

则记 $r=o(\phi)$，表示 $r$ 相对于 $\phi$ 更小，或者说它作为小量的阶更高。

若

$$
\left|\frac{r}{\phi}\right|\le C
$$

在极限点附近成立，则记 $r=O(\phi)$，表示 $r$ 至多与 $\phi$ 同阶。

!!! note "常用判断"
    - $r=o(\phi)$ 就是比值趋于 $0$。
    - $r=O(\phi)$ 就是比值有界。
    - $r=o(\phi)$ 一定推出 $r=O(\phi)$，反过来不成立。
    - $o(1)$ 表示趋于 $0$，$O(1)$ 表示有界。

!!! tip "直观理解"
    这里的“高阶”“低阶”是相对于参照量说的，不是绝对排名。若分子和分母都能展开，就先看首个非零项的阶数。

    例如 $x^2=o(x)$，因为

    $$
    \frac{x^2}{x}=x\to 0.
    $$

    这说明分子不是“更低阶”，而是“消失得更快”，所以它相对于 $x$ 是更高阶的小量。

    例如

    $$
    \frac{1-\cos x}{x}
    =
    \frac{x^2/2+o(x^2)}{x}
    \to 0,
    $$

    所以 $1-\cos x=o(x)$。

## 多元函数微分

设二元函数 $z=f(x,y)$。偏导数是把另一个变量固定后，对单个变量求导：

$$
f_x(x_0,y_0)=\lim_{\Delta x\to0}\frac{f(x_0+\Delta x,y_0)-f(x_0,y_0)}{\Delta x},
\qquad
f_y(x_0,y_0)=\lim_{\Delta y\to0}\frac{f(x_0,y_0+\Delta y)-f(x_0,y_0)}{\Delta y}.
$$

全增量记为

$$
\Delta z=f(x+\Delta x,y+\Delta y)-f(x,y).
$$

记

$$
\rho=\sqrt{(\Delta x)^2+(\Delta y)^2}.
$$

!!! note "可微的定义"
    如果在点 $(x,y)$ 处，存在常数 $A,B$ 使得

    $$
    \Delta z=A\Delta x+B\Delta y+o(\rho),
    $$

    就称 $z=f(x,y)$ 在该点可微。

    这里的意思是：函数的增量可以被一个线性函数 $A\Delta x+B\Delta y$ 逼近，而剩下的误差比 $\rho$ 还小。

    等价地，

    $$
    \lim_{\rho\to0}\frac{\Delta z-A\Delta x-B\Delta y}{\rho}=0.
    $$

    这个线性主部就是全微分：

    $$
    \mathrm dz=A\,\mathrm dx+B\,\mathrm dy.
    $$


### 可微的常用结论

- 可微比“偏导数存在”更强，因为它要求增量不仅有线性主部，而且余项还要比 $\rho$ 更小。
- 一元函数中，可微与可导等价。二元函数中，可微 $\Rightarrow$ 连续，且偏导数存在。
- 在可微点上，线性主部的系数就是偏导数，于是

    $$
    \mathrm dz=\frac{\partial z}{\partial x}\,\mathrm dx+\frac{\partial z}{\partial y}\,\mathrm dy.
    $$

-   ??? note "（四种）二阶偏导"

        二阶偏导就是对一阶偏导再求一次偏导：

        $$
        u_{xx}=\frac{\partial}{\partial x}(u_x),\qquad
        u_{xy}=\frac{\partial}{\partial y}(u_x),
        $$

        $$
        u_{yx}=\frac{\partial}{\partial x}(u_y),\qquad
        u_{yy}=\frac{\partial}{\partial y}(u_y).
        $$

    “函数在点附近有连续二阶偏导”，通常是指在某个邻域里这些二阶偏导（四种偏导数）都存在，而且作为二元函数都连续，也常记作 $C^2$。在这个条件下，混合偏导可以交换：

    $$
    u_{xy}=u_{yx}.
    $$

- 偏导数在点附近连续，是可微的常用充分条件。但如果只说偏导数存在，不能保证可微。

    ??? tip "为什么偏导连续就够用"
        如果 $f_x$、$f_y$ 在点附近都连续，那么沿 $x$ 方向和 $y$ 方向拆开增量时，线性部分的变化可以被连续性控制住，最后余项会落到 $o(\rho)$，所以函数可微。

        例如

        $$
        f(x,y)=x^2y+xy^2
        $$

        的偏导数为

        $$
        f_x=2xy+y^2,\qquad f_y=x^2+2xy.
        $$

        它们在整个平面上都连续，所以 $f$ 在整个平面上可微，并且

        $$
        \mathrm df=(2xy+y^2)\,\mathrm dx+(x^2+2xy)\,\mathrm dy.
        $$

- 对一个**已知函数**来说，函数在该点可微，是它存在全微分的前提。有些题目的表述是给你一个函数的全微分，但其实蕴含了这个函数它是可微的。

!!! question "例题"
    已知

    $$
    (axy^3-y^2\cos x)\,\mathrm dx+(1+by\sin x+3x^2y^2)\,\mathrm dy
    $$

    为某函数 $u(x,y)$ 的全微分，求 $(a,b)$。

    ??? success "参考答案"
        记

        $$
        P=axy^3-y^2\cos x,\qquad Q=1+by\sin x+3x^2y^2.
        $$

        题意给出一个已知的函数 $u$ 的全微分，也就是蕴含说 $u$ 可微，且 $P,Q$ 就是它们的两个一阶导数。
        并且这两个一阶导数可以看出来是连续的，还能看出它们再偏导后也是连续的。所以有

        $$
        P_y=Q_x.
        $$

        计算得

        $$
        P_y=3axy^2-2y\cos x,\qquad Q_x=by\cos x+6xy^2.
        $$

        比较系数可得

        $$
        3a=6,\qquad b=-2.
        $$

        因而

        $$
        (a,b)=(2,-2).
        $$


### 复合函数的链式法则

设 $z=f(u,v)$，而 $u=u(x,y)$、$v=v(x,y)$，并且这些函数都可微，则

$$
\mathrm dz=\frac{\partial f}{\partial u}\,\mathrm du+\frac{\partial f}{\partial v}\,\mathrm dv.
$$

把 $\mathrm du,\mathrm dv$ 继续写开，就得到

$$
\frac{\partial z}{\partial x}
=
\frac{\partial f}{\partial u}\frac{\partial u}{\partial x}
+\frac{\partial f}{\partial v}\frac{\partial v}{\partial x},
\qquad
\frac{\partial z}{\partial y}
=
\frac{\partial f}{\partial u}\frac{\partial u}{\partial y}
+\frac{\partial f}{\partial v}\frac{\partial v}{\partial y}.
$$

### 隐函数存在定理

!!! note "隐函数存在定理 1"
    设方程 $F(x,y)=0$ 在点 $(x_0,y_0)$ 附近可微，且

    $$
    F(x_0,y_0)=0,\qquad F_y(x_0,y_0)\neq 0.
    $$

    则在该点附近可把 $y$ 视为 $x$ 的隐函数 $y=y(x)$，并有

    $$
    \frac{\mathrm dy}{\mathrm dx}=-\frac{F_x(x,y)}{F_y(x,y)}.
    $$

??? note "证明思路"
    将 $y=y(x)$ 代入 $F(x,y)=0$，得

    $$
    F(x,y(x))=0.
    $$

    对 $x$ 求导，得

    $$
    F_x(x,y)+F_y(x,y)\frac{\mathrm dy}{\mathrm dx}=0.
    $$

    因为 $F_y(x_0,y_0)\neq0$，所以

    $$
    \frac{\mathrm dy}{\mathrm dx}=-\frac{F_x(x,y)}{F_y(x,y)}.
    $$

!!! note "隐函数存在定理 2"
    设方程 $F(x,y,z)=0$ 在点 $(x_0,y_0,z_0)$ 附近可微，且

    $$
    F(x_0,y_0,z_0)=0,\qquad F_z(x_0,y_0,z_0)\neq 0.
    $$

    则在该点附近可把 $z$ 视为 $x,y$ 的隐函数 $z=z(x,y)$，并有

    $$
    \frac{\partial z}{\partial x}=-\frac{F_x(x,y,z)}{F_z(x,y,z)},\qquad
    \frac{\partial z}{\partial y}=-\frac{F_y(x,y,z)}{F_z(x,y,z)}.
    $$

??? note "证明思路"
    将 $z=z(x,y)$ 代入 $F(x,y,z)=0$，得

    $$
    F(x,y,z(x,y))=0.
    $$

    分别对 $x$、$y$ 求偏导，得

    $$
    F_x+F_z\frac{\partial z}{\partial x}=0,\qquad
    F_y+F_z\frac{\partial z}{\partial y}=0.
    $$

    因为 $F_z(x_0,y_0,z_0)\neq0$，所以得到上面的公式。

!!! tip "变量选择"
    在三元方程 $F(x,y,z)=0$ 中，哪一个偏导不为 $0$，就能把哪一个变量看成另外两个变量的函数。

    $$
    F_x\neq0 \Rightarrow x=x(y,z),\qquad
    F_y\neq0 \Rightarrow y=y(x,z),\qquad
    F_z\neq0 \Rightarrow z=z(x,y).
    $$

!!! question "例题"
    设三元方程

    $$
    xy-z\ln y+e^{xz}=1
    $$

    在 $(0,1,1)$ 的一个邻域内确定的隐函数中，能确定哪两个具有连续偏导数的隐函数。

    ??? success "参考答案"
        记

        $$
        F(x,y,z)=xy-z\ln y+e^{xz}-1.
        $$

        则

        $$
        F_x=y+ze^{xz},\qquad
        F_y=x-\frac{z}{y},\qquad
        F_z=xe^{xz}-\ln y.
        $$

        在 $(0,1,1)$ 处，

        $$
        F_x(0,1,1)=2,\qquad
        F_y(0,1,1)=-1,\qquad
        F_z(0,1,1)=0.
        $$

        因而可以确定 $x=x(y,z)$ 和 $y=y(x,z)$，不能确定 $z=z(x,y)$。


### 二元函数的拉格朗日中值定理

设 $f(x,y)$ 在连通区域 $D$ 上可微，且在 $D$ 内有

$$
\frac{\partial f}{\partial x}=0,\qquad \frac{\partial f}{\partial y}=0.
$$

则 $f(x,y)=C$（常数）。

!!! note "中值定理的推论"
    这条结论可以看成一元拉格朗日中值定理的推论：在连通区域里，任取两点 $X_1,X_2$，总能用折线把它们连起来。把 $f$ 限制在每一段线上，再用一元中值定理，函数增量就会写成偏导数乘以位移。

    因为这里两个偏导都为 $0$，所以每一段上的函数值都不变，最后就得到

    $$
    f(X_1)=f(X_2).
    $$

!!! warning "只知道一个偏导为 0"
    只知道 $f_x=0$，还不能直接写成 $f(x,y)=g(y)$。这类结论还要看区域在 $x$ 方向是否连通。

    例如，在

    $$
    D=\mathbb R^2\setminus\{(0,y)\mid y\ge 0\}
    $$

    上定义

    $$
    f(x,y)=
    \begin{cases}
    y^2,& x>0,\ y\ge 0,\\
    0,& \text{其他}.
    \end{cases}
    $$

    则 $f_x=0$，但 $f(1,1)=1$、$f(-1,1)=0$，所以它仍然与 $x$ 有关。



## 三重积分

三重积分

$$
\iiint_\Omega f(x,y,z)\,\mathrm dv
$$

表示函数在空间区域 $\Omega$ 上的累加。当 $f=1$ 时，它就是区域体积：

$$
V=\iiint_\Omega 1\,\mathrm dv.
$$

### 直角坐标

若空间区域可以写成

$$
\Omega=
\{(x,y,z)\mid (x,y)\in D,\ z_1(x,y)\le z\le z_2(x,y)\},
$$

则

$$
\iiint_\Omega f(x,y,z)\,\mathrm dv
=
\iint_D
\left[
\int_{z_1(x,y)}^{z_2(x,y)}
f(x,y,z)\,\mathrm dz
\right]
\mathrm d\sigma.
$$

### 柱坐标与球坐标

柱坐标适合圆柱、圆锥、绕 $z$ 轴对称的区域：

$$
x=r\cos\theta,\qquad y=r\sin\theta,\qquad z=z,
$$

体积微元为

$$
\mathrm dv=r\,\mathrm dr\,\mathrm d\theta\,\mathrm dz.
$$

球坐标适合球、球冠、圆锥和球面组合的区域：

$$
x=\rho\sin\varphi\cos\theta,\qquad
y=\rho\sin\varphi\sin\theta,\qquad
z=\rho\cos\varphi.
$$

体积微元为

$$
\mathrm dv=\rho^2\sin\varphi\,\mathrm d\rho\,\mathrm d\varphi\,\mathrm d\theta.
$$

!!! tip "坐标选择"
    - 出现 $x^2+y^2$，优先想柱坐标。
    - 出现 $x^2+y^2+z^2$，优先想球坐标。
    - 区域边界是平面，直角坐标可能更直接。


## 对称性与奇偶性

对称性是多元积分中最重要的简化工具之一。

设区域 $D$ 关于 $y$ 轴对称：

- 若 $f(x,y)$ 关于 $x$ 是奇函数，即 $f(-x,y)=-f(x,y)$，则

$$
\iint_D f(x,y)\,\mathrm d\sigma=0.
$$

- 若 $f(x,y)$ 关于 $x$ 是偶函数，即 $f(-x,y)=f(x,y)$，则

$$
\iint_D f(x,y)\,\mathrm d\sigma
=
2\iint_{D_+} f(x,y)\,\mathrm d\sigma,
$$

其中 $D_+$ 是 $D$ 在右半平面的部分。

!!! warning "先看区域，再看函数"
    奇偶性必须和区域对称性配合使用。函数是奇函数但区域不对称时，积分不一定为 $0$。


## 曲线积分

曲线积分分为两类。第一类对弧长积分，第二类对坐标积分。

### 第一类曲线积分

第一类曲线积分形如

$$
\int_L f(x,y)\,\mathrm ds.
$$

若曲线参数方程为

$$
x=x(t),\qquad y=y(t),\qquad \alpha\le t\le\beta,
$$

则

$$
\int_L f(x,y)\,\mathrm ds
=
\int_\alpha^\beta
f(x(t),y(t))
\sqrt{[x'(t)]^2+[y'(t)]^2}\,\mathrm dt.
$$

第一类曲线积分与方向无关。

### 第二类曲线积分

第二类曲线积分形如

$$
\int_L P(x,y)\,\mathrm dx+Q(x,y)\,\mathrm dy.
$$

代入参数方程可得

$$
\int_L P\,\mathrm dx+Q\,\mathrm dy
=
\int_\alpha^\beta
\bigl[
P(x(t),y(t))x'(t)
+Q(x(t),y(t))y'(t)
\bigr]\,\mathrm dt.
$$

第二类曲线积分与方向有关，反向后积分变号。

!!! note "物理直观"
    第一类曲线积分像沿曲线累加密度，第二类曲线积分像力场沿路径做功。


## 曲面积分

曲面积分也分为两类。

第一类曲面积分形如

$$
\iint_\Sigma f(x,y,z)\,\mathrm dS,
$$

它与曲面方向无关。

若曲面写成 $z=z(x,y)$，$(x,y)\in D$，则

$$
\mathrm dS=
\sqrt{1+z_x^2+z_y^2}\,\mathrm dx\,\mathrm dy.
$$

第二类曲面积分形如

$$
\iint_\Sigma P\,\mathrm dy\,\mathrm dz
+Q\,\mathrm dz\,\mathrm dx
+R\,\mathrm dx\,\mathrm dy,
$$

也可以理解为向量场

$$
\mathbf F=(P,Q,R)
$$

穿过有向曲面 $\Sigma$ 的通量：

$$
\iint_\Sigma \mathbf F\cdot \mathbf n\,\mathrm dS.
$$

它与曲面取向有关，反向后积分变号。


## 三个重要公式

### Green 公式

设闭曲线 $L$ 正向围成平面区域 $D$，则

$$
\oint_L P\,\mathrm dx+Q\,\mathrm dy
=
\iint_D
\left(
\frac{\partial Q}{\partial x}
-
\frac{\partial P}{\partial y}
\right)
\mathrm d\sigma.
$$

!!! tip "Green 公式适用场景"
    平面闭曲线上的第二类曲线积分，如果直接参数化很麻烦，优先考虑 Green 公式。

### Gauss 公式

设闭曲面 $\Sigma$ 包围空间区域 $\Omega$，外法向为正向，则

$$
\iint_\Sigma
P\,\mathrm dy\,\mathrm dz
+Q\,\mathrm dz\,\mathrm dx
+R\,\mathrm dx\,\mathrm dy
=
\iiint_\Omega
\left(
\frac{\partial P}{\partial x}
+
\frac{\partial Q}{\partial y}
+
\frac{\partial R}{\partial z}
\right)
\mathrm dv.
$$

!!! tip "Gauss 公式适用场景"
    空间闭曲面的通量积分，直接算每一片曲面很繁，且散度容易计算时，优先考虑 Gauss 公式。

### Stokes 公式

设有向曲面 $\Sigma$ 的边界为 $L$，方向满足右手法则，则

$$
\oint_L P\,\mathrm dx+Q\,\mathrm dy+R\,\mathrm dz
=
\iint_\Sigma
\left|
\begin{matrix}
\mathrm dy\,\mathrm dz & \mathrm dz\,\mathrm dx & \mathrm dx\,\mathrm dy\\
\dfrac{\partial}{\partial x} & \dfrac{\partial}{\partial y} & \dfrac{\partial}{\partial z}\\
P & Q & R
\end{matrix}
\right|.
$$

也可以写成向量形式：

$$
\oint_L \mathbf F\cdot \mathrm d\mathbf r
=
\iint_\Sigma
(\nabla\times \mathbf F)\cdot\mathbf n\,\mathrm dS.
$$

!!! note "三大公式的关系"
    Green 公式处理平面闭曲线，Gauss 公式处理闭曲面通量，Stokes 公式处理空间闭曲线环流。它们都把边界上的积分和区域内部的导数联系起来。
