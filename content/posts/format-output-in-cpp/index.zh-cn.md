---
title: 'Cpp: 格式化输出'
date: 2022-10-23 13:55:19
tags: C++
summary: 一些用来控制 `cout` / `cin` 的函数，比如十六进制输入输出等
---

## 十进制、八进制、十六进制输出

```cpp
cout << "hex:" << hex << 11 << " " << 12 << " " << 13 << endl
     << "oct:" << oct << 11 << " " << 12 << " " << 13 << endl
     << "dec:" << dec << 11 << " " << 12 << " " << 13 << endl;
```

hex 以 16 进制输出流后面的整数，oct 以 8 进制输出流后面的整数，dec 恢复回十进制。
hex、oct 这种改变流的行为的关键字被称为**操纵符**。

hex、oct 这种一旦改变输出格式、后面的数字将一直以这种进制输出（持久）：

```cpp
cout << hex << 10 << endl;  // 输出 a
cout << 10 << endl;         // 还是输出 a
```

showbase 显示进制前缀，输出十六进制数时添加前缀 0x，输出八进制数时添加前缀 0：

```cpp
cout << showbase << hex << 11 << endl; // 0xb
cout << oct << 11 << endl; // 013
```

unshowbase 取消前缀：

```c++
cout << showbase << hex;
cout << 11 << endl; // 0xb
cout << unshowbase;
cout << 11;         // b
```

## 十进制、八进制、十六进制输入

hex oct dec 也可以用在 cin 上：

```cpp
int a, b, c;
cin >> a >> hex >> b >> oct >> c;
cout << a << " " << b << " " << c;
```

输入和输出：

```
输入: 10 0xa 012
输出: 10 10 10
输入: 10 a 12
输出: 10 10 10
```

## 浮点数输出

三种输出格式：
- defaultfloat：最多输出6位数字，太大的数字会以科学技术法的形式输出
- fixed：显示小数点后六位
- scientific：科学技术法

```cpp
double num = 1234567890.123456789;
cout << num << "\n"                // defaultfloat: 1.23457e+09
     << fixed << num << "\n"       // fixed:        1234567890.123457
     << scientific << num << "\n"; // scientific:   1.234568e+09
```

显示小数点后 n 位：fixed + setprecision()，需要引入 iomanip 库

```cpp
#include <iomanip>
double num = 1234567890.123456789;
cout << setprecision(12) << num << "\n" // 1234567890.12
     << fixed << num << "\n"            // 1234567890.123456716537
     << scientific << num << "\n";      // 1.234567890123e+09
```

## 设置输出宽度

set()，非持久，只对下一次的输出有效：

```cpp
const int w = 16;
cout << "|" << setw(w) << "Hello" << "|\n"; // |           Hello|
cout << "|" << setw(w) << "123"   << "|\n"; // |             123|
cout << "|" << setw(w) << "abc"   << "|\n"; // |             abc|
```

## 字符串流

需要引入头文件:

```cpp
#include <sstream>
```

字符串转数字：

```cpp
istringstream is { s };
double d;
is >> d;
if (!is) throw runtime_error("double format error: " + s);
```

数字转字符串：

```cpp
ostringstream os;
int x = 12, y = 34;
os << "Point { " << x << ", " << y << " }";
string s = os.str();
```

## 按行输入

使用 getline() 函数，返回的字符串不包含回车符号。

```cpp
string l;
getline(cin, l);
```