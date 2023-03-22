---
title: 'Cpp: Errors and Exceptions'
date: 2022-10-21 21:20:59
tags: C++
summary: 'A notes about exception and errors in Cpp, the most important thing is we can
         detect memory errors by [AddressSanitizer](https://github.com/google/sanitizers/wiki/AddressSanitizer), likes this:

         
         `g++ -fsanitize=address -fno-omit-frame-pointer -g ./a.cpp && ./a.out`
'
---

# The Common types of Errors

* **Compile-time errors**: usually cause by syntax errors or type mismatches in the code.
* **Linker errors**: usually caused by missing or incorrect libraries or functions in the linking process.
* **Runtime errors**: can be caused by various factors, such as operating system issues, library errors, or logical errors in the code.

# Out of Bounds Errors

```c++
vector<int> v(5);
int x = v[5]; // out of bounds
cout << x << endl;
```

Now `x` is out of bounds of array, but there is no tips when building and running.

```bash
g++ ./a.cpp && ./a.out
```

When we compile and run this code with [AddressSanitizer](https://github.com/google/sanitizers/wiki/AddressSanitizer) enabled,
we get the following output:

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
