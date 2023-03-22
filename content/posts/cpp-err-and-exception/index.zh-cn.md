---
title: 'Cpp: 错误与异常'
date: 2022-10-21 21:20:59
tags: C++
summary: 主要是关于异常的笔记，当然最重要的是我们可以使用 [AddressSanitizer](https://github.com/google/sanitizers/wiki/AddressSanitizer) 工具来检测内存错误：


         `
         g++ -fsanitize=address -fno-omit-frame-pointer -g ./a.cpp && ./a.out
         `
---

## 常见的错误分类

- 编译时错误（语法错误）、链接时错误（缺少动态链接库、缺少函数实现）、运行时错误（由操作系统、函数库、或用户代码本身引发）

## 边界错误

```c++
vector<int> v(5);
int x = v[5]; // 发生越界、最后一个元素是 v[4]
cout << x << endl;
```

这里访问 x 的时候越界了，但编译运行的时候没有任何提示：

```bash
g++ ./a.cpp && ./a.out
```

在运行时检测，越界时报错，通过堆栈信息可以找出越界的代码：

```
# g++ -fsanitize=address -fno-omit-frame-pointer -g ./a.cpp && ./a.out 
=================================================================
==557143==ERROR: AddressSanitizer: heap-buffer-overflow on address 0x603000000054 at pc 0x000000401676 bp 0x7ffcec886380 sp 0x7ffcec886378
READ of size 4 at 0x603000000054 thread T0
    #0 0x401675 in main a.cpp:10
    #1 0x7f5629f0824d in __libc_start_call_main (/nix/store/c6f52mvbv0d8rd3rlslsvy7v4g3pmm7p-glibc-2.35-163/lib/libc.so.6+0x2924d)
    #2 0x7f5629f08308 in __libc_start_main_impl (/nix/store/c6f52mvbv0d8rd3rlslsvy7v4g3pmm7p-glibc-2.35-163/lib/libc.so.6+0x29308)
    #3 0x4017d4 in _start (/home/luo/code/cpp-exercise/a.out+0x4017d4)

SUMMARY: AddressSanitizer: heap-buffer-overflow a.cpp:10 in main
```
