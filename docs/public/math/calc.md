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
