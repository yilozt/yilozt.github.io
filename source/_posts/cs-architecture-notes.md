---
title: cs_architecture_notes
date: 2022-04-01 23:33:48
tags:
---

## 第一章

### CPU 时间（性能计算公式）

- 时钟周期：CPU运行一个时钟周期所需要的时间

$$
\begin{eqnarray}
CPU_{time} & = & 一段程序执行花费的 CPU 时间 \\\\
           & = & 总时钟周期 \times 每一周期花费的时间（周期长度）\\\\
           & = & 总时钟周期 \div 时钟频率 \\\\
\end{eqnarray}
$$

- IC：一段程序的总指令数
- CPI：指令时钟数：一个指令需要的时钟周期数
  $CPI = 总时钟周期数 \div IC$

因此
$$
\begin{eqnarray}
CPU_{time} & = & CPI \times IC \times 周期长度 \\\\
           & = & CPI \times IC \div 时钟频率
\end{eqnarray}
$$
计算机系统有 $n$ 种指令，第 $i$ 种指令的指令数目为 $IC_i$，执行一条指令需要 $CPI_i$个时钟周期，总 CPU 执行时间：
$$
CPU_{time} = \sum{
	(IC_i \times CPI_i)
} \div 时钟频率
$$
执行每条指令的平均周期长度：
$$
CPI = \sum(IC_i \times CPI_i) \div IC
$$
