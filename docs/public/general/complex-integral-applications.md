# 复变函数在积分计算中的应用

!!! abstract "学习目标"
    这篇笔记整理复变函数在高数积分计算中的常见用途：留数定理、半圆围道、钥匙孔围道和参数求导。重点是把复变方法转化成可直接套用的积分计算流程。

!!! tip "常用套路"
    遇到有理函数无穷积分，先看能否闭合半圆并用留数定理；遇到 $\cos ax$、$\sin ax$，先合成 $\mathrm e^{\mathrm i ax}$；遇到 $x^\alpha$、$\log x$，通常需要选分支并使用钥匙孔围道；遇到平方分母，优先考虑对参数求导。

## 1. 留数法的基本流程

对实轴上的无穷积分

$$
\int_{-\infty}^{+\infty}R(x)\,\mathrm dx
$$

若 $R(z)$ 是有理函数，且在实轴上没有极点，常用上半圆或下半圆闭合围道。大圆弧积分能消失时，有

$$
\int_{-\infty}^{+\infty}R(x)\,\mathrm dx
=
2\pi\mathrm i
\sum_{\operatorname{Im}z_k>0}
\operatorname{Res}(R,z_k).
$$

!!! warning "先检查实轴极点"
    如果被积函数在实轴上有极点，普通积分可能不存在，需要改成主值积分并额外处理绕开小半圆的贡献。

常用留数公式：

$$
\operatorname{Res}\left(\frac{P(z)}{Q(z)},z_0\right)
=
\frac{P(z_0)}{Q'(z_0)},
$$

其中 $Q(z_0)=0$、$Q'(z_0)\ne0$，且 $P(z_0)\ne0$。

对 $m$ 阶极点：

$$
\operatorname{Res}(f,z_0)
=
\frac{1}{(m-1)!}
\lim_{z\to z_0}
\frac{\mathrm d^{m-1}}{\mathrm dz^{m-1}}
\left[(z-z_0)^m f(z)\right].
$$

!!! question "例题 1：有理函数无穷积分"
    计算

    $$
    I=\int_{-\infty}^{+\infty}\frac{\mathrm dx}{x^4+1}.
    $$

    ??? success "参考答案"
        取上半圆围道。被积函数

        $$
        f(z)=\frac{1}{z^4+1}
        $$

        在上半平面的极点为

        $$
        z_1=\mathrm e^{\mathrm i\pi/4},
        \qquad
        z_2=\mathrm e^{3\mathrm i\pi/4}.
        $$

        它们都是简单极点，所以

        $$
        \operatorname{Res}(f,z_k)
        =
        \frac{1}{4z_k^3}.
        $$

        因此

        $$
        \sum_{\operatorname{Im}z_k>0}\operatorname{Res}(f,z_k)
        =
        \frac14
        \left(
        \mathrm e^{-3\mathrm i\pi/4}
        +
        \mathrm e^{-9\mathrm i\pi/4}
        \right)
        =
        -\frac{\mathrm i}{2\sqrt2}.
        $$

        由留数定理，

        $$
        I
        =
        2\pi\mathrm i
        \left(
        -\frac{\mathrm i}{2\sqrt2}
        \right)
        =
        \boxed{\frac{\pi}{\sqrt2}}.
        $$

## 2. 傅里叶型积分

含三角函数的无穷积分常先合成复指数：

$$
\cos ax=\operatorname{Re}\mathrm e^{\mathrm i ax},
\qquad
\sin ax=\operatorname{Im}\mathrm e^{\mathrm i ax}.
$$

当 $a>0$ 时，

$$
|\mathrm e^{\mathrm i az}|
=
\mathrm e^{-a\operatorname{Im}z},
$$

所以应在上半平面闭合；当 $a<0$ 时，应在下半平面闭合。

!!! question "例题 2：余弦积分"
    设 $a>0,b>0$，计算

    $$
    \int_{-\infty}^{\infty}\frac{\cos ax}{x^2+b^2}\,\mathrm{d}x.
    $$

    ??? success "参考答案"
        先计算

        $$
        \int_{-\infty}^{\infty}\frac{\mathrm{e}^{\mathrm{i}ax}}{x^2+b^2}\,\mathrm{d}x.
        $$

        取上半平面，唯一极点为 $z=\mathrm{i}b$。留数为

        $$
        \operatorname{Res}\left(\frac{\mathrm{e}^{\mathrm{i}az}}{z^2+b^2},\mathrm{i}b\right)
        =
        \frac{\mathrm{e}^{-ab}}{2\mathrm{i}b}.
        $$

        大半圆积分趋于 $0$，因此

        $$
        \int_{-\infty}^{\infty}\frac{\mathrm{e}^{\mathrm{i}ax}}{x^2+b^2}\,\mathrm{d}x
        =
        \frac{\pi}{b}\mathrm{e}^{-ab}.
        $$

        取实部得

        $$
        \boxed{
        \int_{-\infty}^{\infty}\frac{\cos ax}{x^2+b^2}\,\mathrm{d}x
        =
        \frac{\pi}{b}\mathrm{e}^{-ab}
        }.
        $$

!!! question "例题 3：奇函数乘正弦并不为零"
    设 $a>0,b>0$，计算

    $$
    \int_{-\infty}^{\infty}\frac{x\sin ax}{x^2+b^2}\,\mathrm{d}x.
    $$

    ??? success "参考答案"
        考虑

        $$
        \int_{-\infty}^{\infty}\frac{x\mathrm{e}^{\mathrm{i}ax}}{x^2+b^2}\,\mathrm{d}x.
        $$

        取上半平面。极点 $z=\mathrm{i}b$ 处的留数为

        $$
        \operatorname{Res}\left(\frac{z\mathrm{e}^{\mathrm{i}az}}{z^2+b^2},\mathrm{i}b\right)
        =
        \frac12\mathrm{e}^{-ab}.
        $$

        所以

        $$
        \int_{-\infty}^{\infty}\frac{x\mathrm{e}^{\mathrm{i}ax}}{x^2+b^2}\,\mathrm{d}x
        =
        \pi\mathrm{i}\mathrm{e}^{-ab}.
        $$

        取虚部得到

        $$
        \boxed{
        \int_{-\infty}^{\infty}\frac{x\sin ax}{x^2+b^2}\,\mathrm{d}x
        =
        \pi\mathrm{e}^{-ab}
        }.
        $$

## 3. 参数求导

当分母出现平方、三次方，或者被积函数中有额外的 $x$、三角函数参数时，可以先求一个较简单的参数积分，再对参数求导。

!!! question "例题 4：配方平移与参数求导"
    计算

    $$
    I=\int_{-\infty}^{+\infty}
    \frac{\cos x}{(x^2+4x+5)^2}\,\mathrm{d}x.
    $$


    ??? tip "提示"
        一般地，

        $$
        \int_{-\infty}^{+\infty}
        \frac{\cos(\lambda u)}{u^2+a^2}\,\mathrm{d}u
        =
        \frac{\pi}{a}\mathrm{e}^{-a|\lambda|},
        \qquad a>0.
        $$

        ??? info "背景：和傅里叶变换的关系"
            若采用约定

            $$
            \widehat f(\lambda)
            =
            \int_{-\infty}^{+\infty}
            f(x)\mathrm{e}^{\mathrm{i}\lambda x}\,\mathrm{d}x,
            $$

            那么对 $f(x)=\frac{1}{x^2+a^2}$，就有

            $$
            \widehat f(\lambda)
            =
            \int_{-\infty}^{+\infty}
            \frac{\mathrm{e}^{\mathrm{i}\lambda x}}{x^2+a^2}\,\mathrm{d}x.
            $$

            又因为 $\mathrm{e}^{\mathrm{i}\lambda x}=\cos(\lambda x)+\mathrm{i}\sin(\lambda x)$，且 $\frac{\sin(\lambda x)}{x^2+a^2}$ 是奇函数，所以虚部积分为 $0$。因此这个余弦积分就是 $\frac{1}{x^2+a^2}$ 在频率 $\lambda$ 处的傅里叶变换值。

        当 $\lambda>0$ 时，考虑

        $$
        \int_{-\infty}^{+\infty}
        \frac{\mathrm{e}^{\mathrm{i}\lambda z}}{z^2+a^2}\,\mathrm{d}z.
        $$

        在上半平面闭合围道，只有二阶因式中的简单极点 $z=\mathrm{i}a$ 被围住。留数为

        ??? info "半圆弧上的积分为什么可以不留下"
            闭合围道确实还包含上半圆弧 $\Gamma_R$，留数定理先给出

            $$
            \int_{-R}^{R}
            \frac{\mathrm{e}^{\mathrm{i}\lambda x}}{x^2+a^2}\,\mathrm{d}x
            +
            \int_{\Gamma_R}
            \frac{\mathrm{e}^{\mathrm{i}\lambda z}}{z^2+a^2}\,\mathrm{d}z
            =
            2\pi\mathrm{i}\operatorname{Res}_{z=\mathrm{i}a}
            \frac{\mathrm{e}^{\mathrm{i}\lambda z}}{z^2+a^2}.
            $$

            当 $z=x+\mathrm{i}y$ 且 $\lambda>0$ 时，
            $|\mathrm{e}^{\mathrm{i}\lambda z}|=\mathrm{e}^{-\lambda y}\le 1$。在半圆弧 $|z|=R$ 上，分母量级是 $R^2$，弧长量级是 $\pi R$，所以弧积分量级至多约为 $\frac{\pi R}{R^2}\to 0$。

            因此令 $R\to\infty$ 后，半圆弧上的积分消失，只剩实轴积分。

        $$
        \operatorname{Res}_{z=\mathrm{i}a}
        \frac{\mathrm{e}^{\mathrm{i}\lambda z}}{z^2+a^2}
        =
        \frac{\mathrm{e}^{-a\lambda}}{2\mathrm{i}a}.
        $$

        ??? tip "简单极点的留数速算"
            这个留数可用简单极点公式快速算出。对
            $\frac{h(z)}{g(z)}$ 来说，若
            $g(z_0)=0$、$g'(z_0)\neq 0$，且 $h(z_0)\neq 0$，则 $z=z_0$ 是简单极点。也就是说，分母在这里是一阶为 $0$，分子又没有把这个零点抵消掉。

            $$
            \operatorname{Res}_{z=z_0}\frac{h(z)}{g(z)}
            =
            \frac{h(z_0)}{g'(z_0)}.
            $$

            这里 $h(z)=\mathrm{e}^{\mathrm{i}\lambda z}$，$g(z)=z^2+a^2$，$g'(\mathrm{i}a)=2\mathrm{i}a$，因此

            $$
            \frac{h(\mathrm{i}a)}{g'(\mathrm{i}a)}
            =
            \frac{\mathrm{e}^{\mathrm{i}\lambda(\mathrm{i}a)}}{2\mathrm{i}a}
            =
            \frac{\mathrm{e}^{-a\lambda}}{2\mathrm{i}a}.
            $$

        因此复积分为

        $$
        2\pi\mathrm{i}\cdot
        \frac{\mathrm{e}^{-a\lambda}}{2\mathrm{i}a}
        =
        \frac{\pi}{a}\mathrm{e}^{-a\lambda}.
        $$

        取实部就得到余弦积分。$\lambda<0$ 时改在下半平面闭合，结果统一写成 $\mathrm{e}^{-a|\lambda|}$。

    ??? success "参考答案"

        令 $u=x+2$ 将分母化为 $(u^2+1)^2$ 后，用 $\cos(u-2)=\cos u\cos2+\sin u\sin2$ 拆开，其中正弦项为奇函数，在 $(-\infty,+\infty)$ 上积分为 $0$，所以

        $$
        I=
        \cos2\int_{-\infty}^{+\infty}
        \frac{\cos u}{(u^2+1)^2}\,\mathrm{d}u.
        $$

        记

        $$
        J(a)=
        \int_{-\infty}^{+\infty}
        \frac{\cos u}{u^2+a^2}\,\mathrm{d}u,
        \qquad a>0.
        $$

        常用傅里叶变换公式给出

        $$
        J(a)=\frac{\pi}{a}\mathrm{e}^{-a}.
        $$

        现在目标分母是平方。对参数 $a$ 求导：

        $$
        J'(a)
        =
        \int_{-\infty}^{+\infty}
        \frac{\partial}{\partial a}
        \left(
        \frac{\cos u}{u^2+a^2}
        \right)\,\mathrm{d}u
        =
        \int_{-\infty}^{+\infty}
        \frac{-2a\cos u}{(u^2+a^2)^2}\,\mathrm{d}u.
        $$

        由 $J(a)=\frac{\pi}{a}\mathrm{e}^{-a}$ 得 $J'(a)=-\pi\mathrm{e}^{-a}\left(\frac{1}{a}+\frac{1}{a^2}\right)$，所以

        $$
        \int_{-\infty}^{+\infty}\frac{\cos u}{(u^2+a^2)^2}\,\mathrm{d}u
        =-\frac{J'(a)}{2a}
        =\frac{\pi\mathrm{e}^{-a}(a+1)}{2a^3},
        \qquad
        \boxed{I=\frac{\pi\cos2}{\mathrm{e}}}.
        $$


!!! question "例题 5：三角积分的参数求导"
    计算

    $$
    K=
    \int_0^{2\pi}
    \frac{\mathrm{d}\theta}{(2+\cos\theta)^2}.
    $$


    ??? success "参考答案"
        这类题可以先算更一般的

        $$
        H(a)=
        \int_0^{2\pi}
        \frac{\mathrm{d}\theta}{a+\cos\theta},
        \qquad a>1.
        $$

        然后对参数 $a$ 求导。

        使用万能代换

        $$
        t=\tan\frac{\theta}{2},
        \qquad
        \cos\theta=\frac{1-t^2}{1+t^2},
        \qquad
        \mathrm{d}\theta=\frac{2}{1+t^2}\,\mathrm{d}t.
        $$

        当 $\theta$ 从 $0$ 到 $2\pi$ 走完一圈时，$t$ 合起来覆盖整个实轴。因此

        $$
        \begin{aligned}
        H(a)
        &=
        \int_{-\infty}^{+\infty}
        \frac{2}{(a+1)+(a-1)t^2}\,\mathrm{d}t \\
        &=
        \frac{2}{a-1}
        \int_{-\infty}^{+\infty}
        \frac{\mathrm{d}t}{t^2+\frac{a+1}{a-1}}.
        \end{aligned}
        $$

        利用

        $$
        \int_{-\infty}^{+\infty}
        \frac{\mathrm{d}t}{t^2+b^2}
        =
        \frac{\pi}{b},
        \qquad b>0,
        $$

        其中 $b^2=\frac{a+1}{a-1}$，故 $H(a)=\frac{2}{a-1}\cdot\frac{\pi}{\sqrt{\frac{a+1}{a-1}}}=\frac{2\pi}{\sqrt{a^2-1}}$。
        由于 $H'(a)=-\int_0^{2\pi}\frac{\mathrm{d}\theta}{(a+\cos\theta)^2}=-\frac{2\pi a}{(a^2-1)^{3/2}}$，所以 $K=-H'(2)=\boxed{\frac{4\pi}{3\sqrt3}}$。

## 4. 带分支的积分

含 $x^\alpha$、$\log x$ 的实积分，通常要把它们看成复平面上的分支函数，再用钥匙孔围道或割线围道。割线两侧虽然投影到同一条实轴，但函数值不同，这正是积分能算出来的原因。

!!! warning "割线两侧不能合并"
    在钥匙孔围道中，上下两侧的路径方向相反，函数值也可能相差因子 $\mathrm e^{2\pi\mathrm i\alpha}$。漏掉任意一个符号，结果通常会差一个负号或相位因子。

!!! question "例题 6：Beta 型积分"
    证明当 $0<\alpha<1$ 时，

    $$
    \int_0^\infty\frac{x^{\alpha-1}}{1+x}\,\mathrm{d}x
    =
    \frac{\pi}{\sin\pi\alpha}.
    $$

    ??? success "参考答案"
        取分支

        $$
        z^{\alpha-1}=\exp((\alpha-1)\Log z),
        \qquad 0<\arg z<2\pi,
        $$

        割线放在正实轴。考虑

        $$
        f(z)=\frac{z^{\alpha-1}}{1+z}.
        $$

        钥匙孔围道内部只有极点 $z=-1$，此处 $\arg(-1)=\pi$，所以

        $$
        \operatorname{Res}(f,-1)
        =
        \mathrm e^{(\alpha-1)\pi\mathrm i}.
        $$

        上侧正实轴贡献为

        $$
        I=\int_0^\infty\frac{x^{\alpha-1}}{1+x}\,\mathrm{d}x.
        $$

        下侧正实轴方向相反，且 $\arg z=2\pi$，贡献为

        $$
        -\mathrm e^{2\pi\mathrm i\alpha}I.
        $$

        小圆和大圆贡献趋于 $0$。由留数定理，

        $$
        (1-\mathrm e^{2\pi\mathrm i\alpha})I
        =
        2\pi\mathrm i\,\mathrm e^{(\alpha-1)\pi\mathrm i}.
        $$

        化简得

        $$
        \boxed{
        I=\frac{\pi}{\sin\pi\alpha}
        }.
        $$

!!! question "例题 7：快速套用分支积分结论"
    计算

    $$
    \int_0^\infty\frac{\sqrt{x}}{1+x^2}\,\mathrm{d}x.
    $$

    ??? success "参考答案"
        更一般地，对 $0<a<b$ 有

        $$
        \int_0^\infty\frac{x^{a-1}}{1+x^b}\,\mathrm{d}x
        =
        \frac{\pi}{b}\csc\frac{a\pi}{b}.
        $$

        这里

        $$
        \sqrt{x}=x^{1/2}=x^{3/2-1},
        $$

        所以 $a=3/2$，$b=2$。因此

        $$
        \boxed{
        \int_0^\infty\frac{\sqrt{x}}{1+x^2}\,\mathrm{d}x
        =
        \frac{\pi}{2}\csc\frac{3\pi}{4}
        =
        \frac{\pi}{\sqrt2}
        }.
        $$
