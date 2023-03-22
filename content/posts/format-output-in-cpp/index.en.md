---
Title: 'Cpp: Formatting Output'
Date: 2022-10-23 13:55:19
Tags: C++
Summary: Some functions used to control `cout`/`cin`, such as hexadecimal input/output, etc.
---

Decimal, Octal, and Hexadecimal Output
======================================

```cpp
cout << "hex:" << hex << 11 << " " << 12 << " " << 13 << endl
     << "oct:" << oct << 11 << " " << 12 << " " << 13 << endl
     << "dec:" << dec << 11 << " " << 12 << " " << 13 << endl;
```

`hex` used for display the hexadecimal numbers in the stream, then `oct`
displays octal numbers, `dec` restores the output to decimal. The keywords that
change the behavior of the stream, such as `hex` and `oct`, are called
**manipulators**.

Once the format of output is changed by manipulators like hex and oct, the
numbers following them will be output in that base (persistent):

```cpp
cout << hex << 10 << endl;  // outputs a
cout << 10 << endl;         // still outputs a
```

`showbase` displays the base prefix. It adds the prefix `0x` when outputting hexadecimal numbers, and the prefix `0` when outputting octal numbers:

```cpp
cout << showbase << hex << 11 << endl; // 0xb
cout << oct << 11 << endl; // 013
```

`unshowbase` cancels the prefix:

```c++
cout << showbase << hex;
cout << 11 << endl; // 0xb
cout << unshowbase;
cout << 11;         // b
```

Decimal, Octal, and Hexadecimal Input
=====================================

`hex`, `oct`, and `dec` can also be used with `cin`:

```cpp
int a, b, c;
cin >> a >> hex >> b >> oct >> c;
cout << a << " " << b << " " << c;
```

Input and output:

```
Input: 10 0xa 012
Output: 10 10 10
Input: 10 a 12
Output: 10 10 10
```

## Floating-Point Output

There are three output formats:

- defaultfloat: Outputs at most six digits; too large numbers are output in scientific notation.
- fixed: Displays six digits after the decimal point.
- scientific: Scientific notation.

```cpp
double num = 1234567890.123456789;
cout << num << "\n"                // defaultfloat: 1.23457e+09
     << fixed << num << "\n"       // fixed:        1234567890.123457
     << scientific << num << "\n"; // scientific:   1.234568e+09
```

Displays n digits after the decimal point: `fixed` + `setprecision()`, which
requires the `iomanip` library:

```cpp
#include <iomanip>
double num = 1234567890.123456789;
cout << setprecision(12) << num << "\n" // 1234567890.12
     << fixed << num << "\n"            // 1234567890.123456716537
     << scientific << num << "\n";      // 1.234567890123e+09
```

## Setting Output Width

The `setw()` function from the `<iomanip>` library can be used to set the width
of the output. It's not persistent, meaning it only affects the next output
statement. Here is an example:

```cpp
const int w = 16;
cout << "|" << setw(w) << "Hello" << "|\n"; // |           Hello|
cout << "|" << setw(w) << "123"   << "|\n"; // |             123|
cout << "|" << setw(w) << "abc"   << "|\n"; // |             abc|
```

## String Streams

The `<sstream>` header file provides the ability to manipulate strings as if
they were input and output streams. This can be useful for converting between
numeric and string representations or for formatting output.

Converting a string to a number can be done using an `istringstream` object, like so:

```cpp
istringstream is { s };
double d;
is >> d;
if (!is) throw runtime_error("double format error: " + s);
```

Converting a number to a string can be done using an `ostringstream` object, like so:

```cpp
ostringstream os;
int x = 12, y = 34;
os << "Point { " << x << ", " << y << " }";
string s = os.str();
```

## Inputting by Line

The `getline()` function can be used to input a line of text from the standard
input stream `cin`. The function returns a string that does not include the newline character.

```cpp
string l;
getline(cin, l);
```
