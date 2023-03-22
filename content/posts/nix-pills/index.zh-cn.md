---
title: Nix药丸(x
date: 2022-09-15 11:32:01
tags: NixOS
summary: 自己阅读 [Nix in Pills](https://nixos.org/guides/nix-pills/why-you-should-give-it-a-try.html) 的一些笔记。主要是关于 NixOS 的包管理器、Nix 语言入门、打包相关概念的教程。强烈推荐阅读原文。
---

用来记录自己读 [Nix in Pills](https://nixos.org/guides/nix-pills/why-you-should-give-it-a-try.html) 的一些笔记。主要是关于 NixOS 的包管理器、Nix 语言入门到打包的教程。强烈推荐阅读原文。

- nix 官方文档： https://nixos.org/manual/nix/

## 安装软件包

- 使用 nix-env 会将软件包安装到当前用户的环境中，用户之间的环境是隔离的。不同用户可以安装不同的软件包。
- nix-env 用来管理用户环境、配置文件
- hello 被安装到了 HOME 目录下面，但其实是一个指向 `/nix/store` 的一个链接，软件包其实存到了 `/nix-store` 那里

```bash
# nix-env -i hello
# hello
世界你好！
# which hello
/home/luo/.nix-profile/bin/hello
# ls -l ~/.nix-profile/bin/hello 
/home/luo/.nix-profile/bin/hello -> /nix/store/zdlqwiz6zc3jhgpns893d1igb99q7xin-hello-2.12/bin/hello
```

列出已经安装的软件包：

```bash
# nix-env -q
baobab-42.0
d-feet-0.3.16
gnome-menus-3.36.0
```

## 回滚环境

使用 `-i` 安装软件包会生成新的用户环境。查看生成的用户环境：

```
$ nix-env --list-generations 
  30   2022-09-15 11:20:13   
  31   2022-09-15 11:47:32   (current)
```

滚回旧环境：

```
$ nix-env --rollback
switching profile from version 31 to 30
```

切换到新环境：

```
$ nix-env -G 32
switching profile from version 30 to 32
```

## 查看依赖

查看软件包的所有依赖的文件：

```
nix-store -qR `which man`
/nix/store/gfqwbax0x58mjnh89ca6milx41bw49lr-libunistring-1.0
/nix/store/9jqiw71lq60sdpiniywq3msknf3wmd9c-libidn2-2.3.2
/nix/store/lxpdbaazqd2s79jx6lngr8nak2rjdaq1-glibc-2.34-210
/nix/store/pnqyyr621w93zqb550q5889b1ri1qah5-gcc-11.3.0-lib
...
```

可以用来导出一个软件包，将列出的文件复制到其他机器上，就相当与给它安装配置了 man 命令。

查看树状图：

```
$ nix-store -q --tree `which man`
```

查看用户环境的所有依赖：

```
$nix-store -qR ~/.nix-profile
```

## 重置用户环境

卸载所有在当前环境安装的软件包：

```
$ nix-env -e '*'
uninstalling 'hello-2.10'
uninstalling 'nix-2.1.3'
[...]
```

回滚：`nix-env --rollback`

## Channels

感觉像是 Arch 上的软件源，可以使用 nix-channel 查看，内容存在 `~/.nix-channels` 这个文件里: `nix-channel --list`

## Nix 语言

进入交互环境：`nix repl`

当然也可以直接上 Nix Manual: https://nixos.org/manual/nix/stable/language/index.html

### 运算符

加减乘法和其他语言一样：

```nix
nix-repl> 1 + 1
2
nix-repl> 1 - 1
0
nix-repl> 1 * 1
1
```

除法需要强制在运算符旁边加空格：

```nix
nix-repl> 3.0 / 2.0
1.5
```

不加被解析成路径，nix 里路径作为一种类型：

```nix
nix-repl> 3.0/2.0   
/home/luo/3.0/2.0
```

### 标识符

`-` 可以用作标识符，`a-b` 这种变量名是完全 ok 的

```nix
nix-repl> a-b = 123
nix-repl> a-b
123
```

### 字符串

可以用 `"` 和 `''` 定义：

```nix
nix-repl> "foo"
"foo"
nix-repl> ''bar''
"bar"
```

字符串模板，在 `${}`里可以放任何 nix 表达式，用来生成字符串：

```nix
nix-repl> "${toString (2 + 3)}" 
"5"
nix-repl> foo="Hello"  
nix-repl> "${foo}"
"Hello"
```

Bash Shell 选手表示很赞

在 `"` 定义的字符串里，用 `\${}` 来避免表达式被替换：

```nix
nix-repl> "2 + 3 = \${toString (2 + 3)}"     
"2 + 3 = ${toString (2 + 3)}"
nix-repl> "2 + 3 = ${toString (2 + 3)}"  
"2 + 3 = 5"
```

在 `''` 定义的字符串里，用 `''${}` 来避免表达式被替换（只能说是很怪的语法）：

```nix
nix-repl> ''2 + 3 = ''${toString (2 + 3)}''     
"2 + 3 = ${toString (2 + 3)}"
nix-repl> "2 + 3 = ${toString (2 + 3)}"  
"2 + 3 = 5"
```

### 列表

不可变，增加或删除元素返回的新创建的列表

```nix
nix-repl> [ 2 "foo" true (2+3) ]
[ 2 "foo" true 5 ]
```

### 属性集

类似于 js 的对象：

```nix
nix-repl> s = {  foo = "bar"; a-b = "baz"; "123" = "num"; }
nix-repl> s
{ "123" = "num"; a-b = "baz"; foo = "bar"; }
```

访问属性：

```nix
nix-repl> s.a-b
"baz"
nix-repl> s."123" 
"num"
```

属性里**引用**其他属性的值，需要使用递归属性集：

```nix
nix-repl> { a = 3; b = a+4; }
error: undefined variable 'a'

       at «string»:1:14:

            1| { a = 3; b = a+4; }
nix-repl> rec { a = 3; b = a+4; }
{ a = 3; b = 7; }
```

### If 表达式

必须有 else 分支，表达式需要返回值：

```nix
nix-repl> a = 3
nix-repl> b = 4
nix-repl> if a > b then "yes" else "no"
"no"
```

### Let 表达式

用来给 in 之后的表达式定义局部变量：

```nix
nix-repl> let a = "Hello"; b = "World"; in "${a}, ${b}"     
"Hello, World"

```

let 表达式可以相互嵌套：

```nix
nix-repl> let a=3; in let b=4; in a + b
7
```

可以在定义变量时引用其他变量

```nix
nix-repl> let a = 3; b = a + 4; in b
7
```

### With 表达式

主要用来将导出属性集里的属性：

```nix
nix-repl> longName = { a = 3; b = 4; }
nix-repl> with longName; a + b
7
```

可以和 let 表达式一起使用:

```nix
nix-repl> longName = { a = 3; b = 4; }
with longName; let b = 4; in a + b
```

如果属性集导出的属性和外部变量冲突了，相同的值不会被覆盖：

```nix
nix-repl> longName = { a = 3; } 
nix-repl> let a = 4; in with longName; a
4
```

但依然可以通过 longName.a 来访问属性：

```nix
nix-repl> longName = { a = 3; } 
nix-repl> let a = 4; in with longName; longName.a
3
```

### 惰性求值

nix 只会在需要的时候对表达式进行求值：

```nix
# a 没有被用到 --> 不会被求值 --> 没有发生除 0 错误
nix-repl> let a = builtins.div 4 0; b = 6; in b  
6
```

### 函数

- 匿名（lambdas）
- 只接收一个参数

语法：`参数名: 函数体`，冒号旁边的空格不能省略

```nix
nix-repl> x: x * 2
«lambda @ (string):1:1»
```

给 lambdas 表达式赋个值，就能调用了：

```nix
nix-repl> double = x: x * 2
nix-repl> double
«lambda @ (string):1:2»
nix-repl> double 4
8
nix-repl> double 12
24
```

当然也可以像 js 那样用立即调用函数表达式（IIFE）：

```nix
nix-repl> (x: x * 2) 121   
242
```


把上面的过程想象成 JS 大概是这样的：

```js
> const double = function (x) { return x * 2 }
undefined
> double
[Function: double]
> double(4)
8
> double(12)
24
```

要让函数接收多个参数，就只能嵌套 lambda 表达式：

```nix
nix-repl> mul = a: (b: a*b)
nix-repl> mul
«lambda @ (string):1:2»
nix-repl> mul 3
«lambda @ (string):1:6»
nix-repl> (mul 3) 4  
12
```

对应的 js 大概长这样：

```js
> const mul = function (a) {
    return function (b) { return a * b }
}
undefined
> mul
[Function: mul]
> mul(3)
[Function (anonymous)]
> mul(3)(4)
12
```

其实就是定义了函数的函数，调用过程大概长这样：

```
(mul 3) 4 => (b: 3 * b) 4
          => 3 * 4
          => 12
```

Nix 在解析代码时会自己判断合理的优先级，因此括号可以省略：

```nix
nix-repl> mul = a: b: a*b
nix-repl> mul
«lambda @ (string):1:2»
nix-repl> mul 3
«lambda @ (string):1:6»
nix-repl> mul 3 4  
12
nix-repl> mul (3+4) (5+6)
77
```

也可以先将函数参数打包成属性集再传进去：

```nix
nix-repl> mul = s: s.a*s.b
nix-repl> mul { a = 3; b = 4; }
12
nix-repl> mul = { a, b }: a*b
nix-repl> mul { a = 3; b = 4; }
12
```

`mul = { a, b }: a*b` 这种写法传进去的属性集只能有两个属性：`a` 和 `b`，不能多也不能少。

默认参数：

```nix
nix-repl> mul = { a, b ? 2 }: a*b
nix-repl> mul { a = 3; }
6
nix-repl> mul { a = 3; b = 4; }
12
```

接收额外属性：

```nix
nix-repl> mul = { a, b, ... }: a*b
nix-repl> mul { a = 3; b = 4; c = 2; }
```

使用 `@` 给传进去的属性集设置别名：

```nix
nix-repl> mul = s@{ a, b, ... }: a*b*s.c
nix-repl> mul { a = 3; b = 4; c = 2; }
24
```

既然可以传属性集，当然也能传一个列表进去（虽然没多大用就是了）：

```nix
nix-repl> mul = args:                                               
          builtins.elemAt args 0 * builtins.elemAt args 1
nix-repl> mul [ 11 22 ]
242
```

### 导入文件

import 是 nix 内置的函数，用来解析并执行文件内的表达式：

```nix
$ echo '3' > a.nix
$ echo '4' > b.nix
$ echo 'a: b: a * b' > mul.nix
$ nix repl
Welcome to Nix 2.8.1. Type :? for help.
nix-repl> a = import ./a.nix
nix-repl> b = import ./b.nix
nix-repl> mul = import ./mul.nix
nix-repl> mul a b
12
```

nix 文件不会主动继承外部变量：

test.nix:

```nix
x
```

```nix
nix-repl> let x = 5; in import ./test.nix
error: undefined variable 'x'

       at /tmp/a/test.nix:1:1:

            1| x
             | ^
```

向 nix 文件导入变量的方法是：使用函数

test.nix

```nix
{ a, b ? 3, trueMsg ? "yes", falseMsg ? "no" }:
if a > b
  then builtins.trace trueMsg true
  else builtins.trace falseMsg false
```

```nix
nix-repl> import ./test.nix { a = 5; trueMsg = "ok"; }
trace: ok
true
```

## 打包

### derivation 函数

[derivation](https://nixos.org/manual/nix/stable/language/derivations.html) 是 nix 内置的函数，用来定义软件包，接收一个属性集，其中 `system`、`name`、`builder` 这三个属性是必须的：

- `system`：系统类型，如 `x86_64-darwin`、`i686-linux`，一般可以用 `builtins.currentSystem` 代替
- `name`：软件包名
- `builder`：构建软件包执行的二进制文件

`derivation` 执行后会在 `/nix/store` 下生成一个 `.drv` 文件，包含了软件包的元信息：

```nix
nix-repl> d = derivation { name = "mypackage"; builder = "mybuilder"; system = "mysystem"; } 
nix-repl> d
«derivation /nix/store/nvvkzyjj661xjfhr64gxp920dpa3vabq-mypackage.drv»
```

查看 .drv 文件的信息：

```bash
$ nix show-derivation //nix/store/nvvkzyjj661xjfhr64gxp920dpa3vabq-mypackage.drv
{
  "/nix/store/nvvkzyjj661xjfhr64gxp920dpa3vabq-mypackage.drv": {
    "outputs": {
      "out": {
        "path": "/nix/store/p458kqdn6gzjrd2cqgghxym6939j798f-mypackage"
      }
    },
    "inputSrcs": [],
    "inputDrvs": {},
    "system": "mysystem",
    "builder": "mybuilder",
    "args": [],
    "env": {
      "builder": "mybuilder",
      "name": "mypackage",
      "out": "/nix/store/p458kqdn6gzjrd2cqgghxym6939j798f-mypackage",
      "system": "mysystem"
    }
  }
}
```

当构建软件包时，整个构建过程在一个隔离的环境中进行，不会从当前 shell 继承环境变量，只有 .drv 文件里 `env` 那部分环境变量才能被 builder 所使用。

在 nix repl 里构建软件包：`:b` 命令

```nix
nix-repl> d = derivation { name = "mypackage"; builder = "mybuilder"; system = "mysystem"; } 
nix-repl> :b d
error: a 'mysystem' with features {} is required to build '/nix/store/nvvkzyjj661xjfhr64gxp920dpa3vabq-mypackage.drv', but I am a 'x86_64-linux' with features {benchmark, big-parallel, kvm, nixos-test}
[0.0 MiB DL]
```

在 nix repl 外构建软件包：`nix-store -r <drv 文件路径>`

```bash
$ nix-store -r /nix/store/3ln5l2s4jsi9b4fdgrqrs1vpfrng577d-myname.drv
this derivation will be built:
  /nix/store/3ln5l2s4jsi9b4fdgrqrs1vpfrng577d-myname.drv
building '/nix/store/3ln5l2s4jsi9b4fdgrqrs1vpfrng577d-myname.drv'...
error: builder for '/nix/store/3ln5l2s4jsi9b4fdgrqrs1vpfrng577d-myname.drv' failed to produce output path for output 'out' at '/nix/store/3ln5l2s4jsi9b4fdgrqrs1vpfrng577d-myname.drv.chroot/nix/store/5xk3bxckdamy8mjav6pb2m6nbsv6v5a1-myname'
```

### 使用 bash 脚本作为 builder

#### 导入 nixpkgs

nixpkgs 包含了 nix 所有软件包的元数据，在 repl 中，可以使用 `:l <nixpkgs>` 导入 nixpkgs 的所有属性，之后就可以查询软件包的路径了：

```nix
nix-repl> :l <nixpkgs> 
Added 16535 variables.
nix-repl> "${rustc}"
"/nix/store/l4hnh2x7nr6jmzypg1p0wv90yascvqnn-rustc-1.60.0"
nix-repl> "${bash}"  
"/nix/store/xbdqbi2mscmhl5wcpbgpjdwxbsrvpkil-bash-5.1-p16"
nix-repl> "${gcc}"  
"/nix/store/yzs8390walgk2rwl6i5li2g672hdn0kv-gcc-wrapper-11.3.0"
```

之后编写打包时要执行的脚本：`builder.sh`，这里的 out 则是在 .drv 中生成的环境变量：

```bash
set -x
echo foo > $out
```

在 repl里定义元件包，将 bash shell 的路径作为 builder，system 则沿用当前的系统：

```nix
nix-repl> :l <nixpkgs>
Added 16535 variables.
nix-repl> "${bash}"
"/nix/store/xbdqbi2mscmhl5wcpbgpjdwxbsrvpkil-bash-5.1-p16"
nix-repl> d = derivation {                 
          name = "bashbuilderpkg";         
          builder = "${bash}/bin/bash";    
          system = builtins.currentSystem;
          args = [ ./builder.sh ];         
          }
nix-repl> :b d
[0/1 built] querying bashbuilderpkg on https://mirrors.tuna.tsinghua.edu.c

This derivation produced the following outputs:
  out -> /nix/store/qkwa2c986xval09amhb541205lccb3g8-bashbuilderpkg
[1 built, 0.0 MiB DL]
```

这里将 bash shell 的文件路径作为 `builder`，而多了一个 `args` 的属性，这个属性将被作为 `builder` 的命令参数。这里就相当于在构建的时候执行 `bash ./builder.sh`，当然 `builder.sh` 在构建时已经被复制到 `/nix/store`了，执行的是 `/nix/store` 里的 `builder.sh`。

输出结果就是将 `foo` 写入 `/nix/store/qkwa2c986xval09amhb541205lccb3g8-bashbuilderpkg`，也就是 `$out` 环境变量中。

注意的是 `args` 里面的数据类型是**路径**。

```bash
$ cat /nix/store/qkwa2c986xval09amhb541205lccb3g8-bashbuilderpkg
foo
$ 
```

当然也可以查看 .drv 文件的内容：

```bash
$ nix show-derivation /nix/store/nx8gr08m20ix951sn92pswmmag7bylqx-bashbuilderpkg.drv
{
  "/nix/store/nx8gr08m20ix951sn92pswmmag7bylqx-bashbuilderpkg.drv": {
    "outputs": {
      "out": {
        "path": "/nix/store/qkwa2c986xval09amhb541205lccb3g8-bashbuilderpkg"
      }
    },
    "inputSrcs": [
      "/nix/store/2cdc3wsrmynhbzzzbs9n95cv4xm39ixc-builder.sh"
    ],
    "inputDrvs": {
      "/nix/store/9rd3h7acgcirfvgvxvq7h58s45af4agn-bash-5.1-p16.drv": [
        "out"
      ]
    },
    "system": "x86_64-linux",
    "builder": "/nix/store/xbdqbi2mscmhl5wcpbgpjdwxbsrvpkil-bash-5.1-p16/bin/bash",
    "args": [
      "/nix/store/2cdc3wsrmynhbzzzbs9n95cv4xm39ixc-builder.sh"
    ],
    "env": {
      "builder": "/nix/store/xbdqbi2mscmhl5wcpbgpjdwxbsrvpkil-bash-5.1-p16/bin/bash",
      "name": "bashbuilderpkg",
      "out": "/nix/store/qkwa2c986xval09amhb541205lccb3g8-bashbuilderpkg",
      "system": "x86_64-linux"
    }
  }
}
```

可以看到 `args` 那里的 `builder.sh` 已经被复制到 `/nix/store` 里了，`bash` 的路径也被填充到实际存储的位置。

### 编译 C 程序

simple.c:

```c
void main() {
    puts("Simple!");
}
```

builder.sh:

```bash
set -ex

export PATH=$PATH:$coreutils/bin:$gcc/bin
mkdir -p $out
gcc -o $out/simple $src
```

在 repl 中导入 nixpkgs，生成 .drv 文件：

```nix
$ nix repl
Welcome to Nix 2.8.1. Type :? for help.

nix-repl> :l <nixpkgs>
Added 16535 variables.
nix-repl> d = derivation {
    name = "simple_c";
    system = builtins.currentSystem;
    builder = "${bash}/bin/bash";
    args = [ ./builder.sh ];
    gcc = gcc;
    coreutils = coreutils;
    src = ./simple.c;
}
nix-repl> :b d
This derivation produced the following outputs:
  out -> /nix/store/cwxmpg1gwfa1i4kzfcxn8mhpjfw206k5-simple_c
[1 built, 0.0 MiB DL]
nix-repl> :q
$ /nix/store/cwxmpg1gwfa1i4kzfcxn8mhpjfw206k5-simple_c/simple 
Simple!
```

这里在传递给 `derivation` 属性集里添加了几个自定义的属性：`gcc`、`coreutils`、`src`，这些属性将会导出成 `builder` 编译时需要的环境变量。

可以将 `derivation` 函数里的内容写到一个 `simple.nix` 文件里：

```nix
with (import <nixpkgs> {}); derivation {
    name = "simple_c";
    system = builtins.currentSystem;
    builder = "${bash}/bin/bash";
    args = [ ./builder.sh ];
    inherit gcc coreutils;
    src = ./simple.c;
}
```

- `import <nixpkgs> {}` 相当与 repl 里的 `:l <nixpkgs>`
- `inherit gcc coreutils` 给属性集添加了两个属性，其值继承自 nixpkgs 的值

构建：

```bash
$ nix-build ./simple.nix
/nix/store/cwxmpg1gwfa1i4kzfcxn8mhpjfw206k5-simple_c
```