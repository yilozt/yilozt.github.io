---
title: Reading Notes of Nix in Pills
date: 2022-09-15 11:32:01
tags: NixOS
summary: There are my notes about [Nix in Pills](https://nixos.org/guides/nix-pills/why-you-should-give-it-a-try.html), that is a serial tutorial about packages manager in NixOS, basic of Nix language, and some concepts about packaging.
---

There are my notes when reading [Nix in Pills](https://nixos.org/guides/nix-pills/why-you-should-give-it-a-try.html), that is a serial tutorial about packages manager in NixOS, basic of Nix language, and some concepts about packaging.

Nix is a purely functional package manager, meaning that the same input will
always produce the same output. In other words, if you build the same package with
the same inputs, you will always get the same output. This is achieved by using 
the content-addressable store, which stores all packages based on their 
cryptographic hash.

- Manual of Nix： https://nixos.org/manual/nix/

# Install a Package

-  We can use `nix-env` for installing / uninstalling packages in users' environment, like the packages manager does in other Linux distribution.
- `nix-env` is used for managing packages and profiles for user. and that these
environment is isolate from each other. It means that users in same machine can install different packages for by themself.
- Here is a example to install `hello` packages, hello is installed to `HOME`
directory, But actually it is a soft link point to `/nix/store`, that where used
for software.

```bash
# Install packages named Hello
[luo@luo] nix-env -i hello

# Execute hello program
[luo@luo] hello
世界你好！

# Show location of hello program
[luo@luo] which hello
/home/luo/.nix-profile/bin/hello

# `hello` is actually a symbolic link to `/nix/store`
[luo@luo] ls -l ~/.nix-profile/bin/hello 
/home/luo/.nix-profile/bin/hello -> /nix/store/zdlqwiz6zc3jhgpns893d1igb99q7xin-hello-2.12/bin/hello
```

**-q**: List all installed packages：

```bash
# nix-env -q
baobab-42.0
d-feet-0.3.16
gnome-menus-3.36.0
```

Rollback to Old Environment
===========================

When we install a new package via `nix-env -i`, there will generate a new
environment. You can use `--list-generations` to list generations:

```
$ nix-env --list-generations 
  30   2022-09-15 11:20:13   
  31   2022-09-15 11:47:32   (current)
```

Roll back to last old environment, so that we can revert to a previous package version that if is break currently: 

```
$ nix-env --rollback
switching profile from version 31 to 30
```

Switching to new environment, that `-G` used for switch to special generation:

```
$ nix-env -G 32
switching profile from version 30 to 32
```

Show the Dependents of a Package
===============================

The **`-q`** option of `nix-env` can used to show dependent of packages. *Dependent packages* are packages that require the installed package in order to function properly.

For example, show the all dependent files of a binary, run：

```
nix-store -qR `which man`
/nix/store/gfqwbax0x58mjnh89ca6milx41bw49lr-libunistring-1.0
/nix/store/9jqiw71lq60sdpiniywq3msknf3wmd9c-libidn2-2.3.2
/nix/store/lxpdbaazqd2s79jx6lngr8nak2rjdaq1-glibc-2.34-210
/nix/store/pnqyyr621w93zqb550q5889b1ri1qah5-gcc-11.3.0-lib
...
```

This command can used to copy a packages and its dependencies to other machine.
Simply copy all files listed om `nix-store -qR`.

To show all dependence in tree view, run: 

```
$ nix-store -q --tree `which man`
```

To list all dependence of environment, run: 

```
$nix-store -qR ~/.nix-profile
```

# Reset Environment

To uninstall all packages in current environment, run:

```
$ nix-env -e '*'
uninstalling 'hello-2.10'
uninstalling 'nix-2.1.3'
[...]
```

To roll back to an old version, use `nix-env --rollback`, as shown in the
previous section.

Channels
========

Channels are used to track and manage package sources in Nix package manager, 
similar to software sources in other Linux distributions. Channels tell Nix where 
to download and update packages. You can list the available channels using the 
`nix-channels --list` command, and manage channels using the `nix-channel` command. All channels for each user can be found in the `~/.nix-channels` file.

Basic of Nix Language
=====================

Start an interactive environment for evaluating Nix expressions：`nix repl`

You can learn all grammar of Nix languages in it's manual: https://nixos.org/manual/nix/stable/language/index.html

## Operator

```nix
nix-repl> 1 + 1
2
nix-repl> 1 - 1
0
nix-repl> 1 * 1
1
```

It is especially important to note that need add space in both sides of division
operator, just like this:

```nix
nix-repl> 3.0 / 2.0
1.5
```

Otherwise, it will be explain to a `path`, which is a new data types in Nix language.

```nix
nix-repl> 3.0/2.0   
/home/luo/3.0/2.0
```

The usage of logical operations is just like other programming languages.

```nix
nix-repl> 2 == 2
true
nix-repl> 2 == 3
false
nix-repl> true && false
false
nix-repl> true || false
true
```

Lastly, you can use the ++ operator to concatenate two lists:

```nix
nix-repl> [1, 2, 3] ++ [4, 5, 6]
[ 1 2 3 4 5 6 ]
```

## String

String need be wrapped in `"` or `''`:

```nix
nix-repl> "foo"
"foo"
nix-repl> ''bar''
"bar"
```

We can put any Nix expression in `${}`, Nix will calculate the result and generate
corresponding string as result:

```nix
nix-repl> "2+3 = ${toString (2 + 3)}" 
"2 + 3 = 5"
nix-repl> foo="Hello"  
nix-repl> "${foo}"
"Hello"
```

If you want to display the raw `${}` in Nix language, need to add scape character: 

```nix
nix-repl> "2 + 3 = \${toString (2 + 3)}"     
"2 + 3 = ${toString (2 + 3)}"
nix-repl> "2 + 3 = ${toString (2 + 3)}"  
"2 + 3 = 5"
```

```nix
nix-repl> ''2 + 3 = ''${toString (2 + 3)}''     
"2 + 3 = ${toString (2 + 3)}"
nix-repl> "2 + 3 = ${toString (2 + 3)}"  
"2 + 3 = 5"
```

Two strings can be connect with `+` operator:

```nix
nix-repl> "Hello, " + "World"
"Hello, World"
```

## Lists

It is immutable, edit in add or delete function will generate a new list.

```nix
nix-repl> [ 2 "foo" true (2+3) ]
[ 2 "foo" true 5 ]
```

## Attribute Set

An attribute set is similar to a JavaScript object, which maintains a set of
key-value pairs:

```nix
nix-repl> s = {  foo = "bar"; a-b = "baz"; "123" = "num"; }
nix-repl> s
{ "123" = "num"; a-b = "baz"; foo = "bar"; }
```

In Nix, a key can be any string, but it must be quoted if it does not begin with
a letter or underscore character. To access a value in an attribute set, you
can use the dot notation.

```nix
nix-repl> s.a-b
"baz"
nix-repl> s."123" 
"num"
```

If you need to reference another property in the same attribute set, you need to define it recursively using the rec keyword.

```nix
nix-repl> { a = 3; b = a+4; }
error: undefined variable 'a'

       at «string»:1:14:

            1| { a = 3; b = a+4; }
nix-repl> rec { a = 3; b = a+4; }
{ a = 3; b = 7; }
```

This is because Nix evaluates attribute sets lazily, so it may not yet know about the definition of `a` when it tries to evaluate the expression for `b`.

## `If and Else` Expression

In Nix, `if` expressions must include an `else` branch because every expression must have a certain value.

```nix
nix-repl> a = 3
nix-repl> b = 4
nix-repl> if a > b then "yes" else "no"
"no"
```

## `Let ... in` Expression

We can define variables temporarily and use them in an expression：

```nix
nix-repl> let a = "Hello"; b = "World"; in "${a}, ${b}"     
"Hello, World"

```

Let expression and be nested:

```nix
nix-repl> let a=3; in let b=4; in a + b
7
```

Variables defined later in a let expression can refer to variables defined
earlier in the same expression: 

```nix
nix-repl> let a = 3; b = a + 4; in b
7
```

## `With` Expression 

We can export property in a attribution set for a expression, now we can use `a`
refer to the value of property in attribute set:

```nix
nix-repl> longName = { a = 3; b = 4; }
nix-repl> with longName; a + b
7
```

It can used with `Let ... in ...` expression: 

```nix
nix-repl> longName = { a = 3; b = 4; }
with longName; let b = 4; in a + b
```

Nix attempts to use value in `let` expression when there is conflict symbol:

```nix
nix-repl> longName = { a = 3; } 
nix-repl> let a = 4; in with longName; a
4
nix-repl> with longName; let a = 4; in a
4
```

However, it is still possible to reference value in attribute set: 

```nix
nix-repl> longName = { a = 3; } 
nix-repl> let a = 4; in with longName; longName.a
3
```

## Laziness

One of Nix's defining characteristics is that it only computes the value of an expression when it is used.

```nix
# a is unused --> will not be evaluated --> no division by zero error
nix-repl> let a = builtins.div 4 0; b = 6; in b  
6
```

## Function

- is a `lambdas expression`
- only receive one parameter

To define a function, use the following grammar: `param: body`. The subsequent
space after the colon can't be ignored.

```nix
nix-repl> x: x * 2
«lambda @ (string):1:1»
```

You can give a name for lambda expression, and then call it like a common 
function：

```nix
nix-repl> double = x: x * 2
nix-repl> double
«lambda @ (string):1:2»
nix-repl> double 4
8
nix-repl> double 12
24
```

Also can also use an Immediately Invoke Function Expression(IIFE), just like in
JavaScript:

```nix
nix-repl> (x: x * 2) 121   
242
```

You can image it to following JavaScript expression:

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

To pass multiple parameter，one way is nesting the lambda expression (
function of functions)

```nix
nix-repl> mul = a: (b: a*b)
nix-repl> mul
«lambda @ (string):1:2»
nix-repl> mul 3
«lambda @ (string):1:6»
nix-repl> (mul 3) 4  
12
```

The corresponding JavaScript expression will be:

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

This is the process how it invoked:

```
(mul 3) 4 => (b: 3 * b) 4
          => 3 * 4
          => 12
```

Nix automatically assigns reasonable operator priorities, so we can omit some
unnecessary braces: 

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

Another way to pass multiple parameters is to pack them into a attribute set：

```nix
nix-repl> mul = s: s.a*s.b
nix-repl> mul { a = 3; b = 4; }
12
nix-repl> mul = { a, b }: a*b
nix-repl> mul { a = 3; b = 4; }
12
```

We the attribute set must **only** have two properties: `a` and `b` when using writing style `mul = { a, b }: a*b` 

To set up default parameter:

```nix
nix-repl> mul = { a, b ? 2 }: a*b
nix-repl> mul { a = 3; }
6
nix-repl> mul { a = 3; b = 4; }
12
```

If we want to receive additional parameters in the attribute set, we can use the `...` syntax to capture them:

```nix
nix-repl> mul = { a, b, ... }: a*b
nix-repl> mul { a = 3; b = 4; c = 2; }
```

We can also use the `@` syntax to create an alias for the attribute set:

```nix
nix-repl> mul = s@{ a, b, ... }: a*b*s.c
nix-repl> mul { a = 3; b = 4; c = 2; }
24
```

We can also pack all parameter into a list (through it is not clear than attribute
set):

```nix
nix-repl> mul = args:                                               
          builtins.elemAt args 0 * builtins.elemAt args 1
nix-repl> mul [ 11 22 ]
242
```

# Import the File

`import` is a built-in function that parses and evaluates expressions in a file:

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

A file can receive the value of variable directly from outside, For example we have a file named `test.nix`:

test.nix:

```nix
x
```

Let's try to set the value of `x` to 5:

```nix
nix-repl> let x = 5; in import ./test.nix
error: undefined variable 'x'

       at /tmp/a/test.nix:1:1:

            1| x
             | ^
```

The only way to pass a variable to a Nix file is by using a function, there is
revised version of `test.nix`:

test.nix:

```nix
{ a, b ? 3, trueMsg ? "yes", falseMsg ? "no" }:
if a > b
  then builtins.trace trueMsg true
  else builtins.trace falseMsg false
```

Now we can pass the value by function parameter:

```nix
nix-repl> import ./test.nix { a = 5; trueMsg = "ok"; }
trace: ok
true
```

Packaging
=========

## The `derivation` Function

In Nix, a **"derivation"** is a description of how to build a package. It includes
the inputs (such as source code, dependencies, and build scripts), the build
process (how to compile and install the package), and the resulting outputs (such
as binaries, libraries, or documentation).

The [derivation](https://nixos.org/manual/nix/stable/language/derivations.html) is a built-in function in the Nix language intend to define a package.It receives an attribute set, among which there are three required properties: `system`,
`name`, and `builder`.

- **system**：The type and architecture of the system，such as `x86_64-darwin` or
`i686-linux`，we can usually use `builtins.currentSystem` for this.
- **name**： The name of package.
- **builder**：The program used to build packages, such as `gcc`.

After the `derivation` function is invoked, it generates a `.drv` file in `/nix/store` which contains the meta-information about package.

```nix
nix-repl> d = derivation { name = "mypackage"; builder = "mybuilder"; system = "mysystem"; } 
nix-repl> d
«derivation /nix/store/nvvkzyjj661xjfhr64gxp920dpa3vabq-mypackage.drv»
```

We can check its contents using the `nix show-derivation` command: 

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

During the process of building a package, it is executed in an isolated environment
and does not inherit any environment variables from the current shell. The only
environment variables that the build process will be receive are those that are
explicitly defined in the `env` fields of the `.drv` file.

If we want to build a package in Nix interpreter, we can use the `:b` command:

```nix
nix-repl> d = derivation { name = "mypackage"; builder = "mybuilder"; system = "mysystem"; } 
nix-repl> :b d
error: a 'mysystem' with features {} is required to build '/nix/store/nvvkzyjj661xjfhr64gxp920dpa3vabq-mypackage.drv', but I am a 'x86_64-linux' with features {benchmark, big-parallel, kvm, nixos-test}
[0.0 MiB DL]
```

If we want to build a package outside the Nix interpreter, we can use
`nix-store -r /path/to/drv`:

```bash
$ nix-store -r /nix/store/3ln5l2s4jsi9b4fdgrqrs1vpfrng577d-myname.drv
this derivation will be built:
  /nix/store/3ln5l2s4jsi9b4fdgrqrs1vpfrng577d-myname.drv
building '/nix/store/3ln5l2s4jsi9b4fdgrqrs1vpfrng577d-myname.drv'...
error: builder for '/nix/store/3ln5l2s4jsi9b4fdgrqrs1vpfrng577d-myname.drv' failed to produce output path for output 'out' at '/nix/store/3ln5l2s4jsi9b4fdgrqrs1vpfrng577d-myname.drv.chroot/nix/store/5xk3bxckdamy8mjav6pb2m6nbsv6v5a1-myname'
```

## Use Bash script to a Builder

The `nixpkgs` contain meta data of all packages, in an imperfect analogy, 
`nixpkgs` is the package database in other Linux distribution.
In nix interprete environment, we can use `:l <nixpkgs>` to load all attribute
and meta data of packages, then we can query output path of any packages: 

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

Now we can write a script that will be invoked when building packages, the `$out`
environment is defined in *.drv* file, which used to point out the location that
the packages will be.

```bash
set -x
echo foo > $out
```

Then we can define a meta-data of packages and use the `bash` shell as builder.
Our script will be passed as a command-line option to the shell:

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

Here the builder is bash shell, `builder.sh` will be passed as command option of
builder, when building, the complete command will be invoked is `bash ./builder.sh`. Our `builder.sh` will be copy into `/nix/store`, so a accurate command will
be execute is `/nix/store/<hash value>/bin/bash /nix/store/<hash value>/builder.sh`

Then we can get the output of package in a `/nix/store` path, which is the path
define in `$out` environment variable.

```bash
$ cat /nix/store/qkwa2c986xval09amhb541205lccb3g8-bashbuilderpkg
foo
$ 
```

We can inspect the contents of `.drv` files to check all paramters when building:

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

We can see the `args` field, which inicates that our `./builder.sh` has been
copied into `/nix/store` directory, and the path of `bash` shell has also
been fully completed to the `/nix/store` directory.

## Compile A Simple C Program

Here is a simple C program that prints "Simple!" to console:

```c
void main() {
    puts("Simple!");
}
```

To compile this program with Nix, we can use the following `builder.sh` script:

```bash
set -ex

export PATH=$PATH:$coreutils/bin:$gcc/bin
mkdir -p $out
gcc -o $out/simple $src
```

This script sets the `$PATH` environment variable to include the custom paths for
`coreutils` and `gcc`, and then compiles the `simple.c` program with gcc. The 
custom envrionment variables will pass from property of attribute set
that need by the `derivarion` function.

Let's create a Nix derivation for this packages by running `nix repl`:

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

You can see we passed some custom atrribute (`gcc`, `coreutils`, `src`) in set, that will be expose to environment variables in builder.

We also can write those Nix expressions into a files named `simple.nix`:

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

- `import <nixpkgs> {}`: Just like `:l <nixpkgs>` in interprete environment.
- `inherit gcc coreutils`: inherit `gcc` and `coreutils` from `nixpkgs`, it means
  that `gcc = pkgs.gcc; coreutils = pkgs.coreutils;`

We can build this packages with `nix-build`: 

```bash
$ nix-build ./simple.nix
/nix/store/cwxmpg1gwfa1i4kzfcxn8mhpjfw206k5-simple_c
```

This will create a symlink to the package in the result directory:

```bash
/nix/store/...-simple_c
```

We can run the `simple` executable to see the result:

```bash
$ ./result/simple
Simple!
```

In practical, we usually use `stdenv.mkDerivation` to define a packages instead of
using the `derivation` function directly, which is convenience function provided
by Nixpkgs that simplifies the process of defining a derivation. Using
mkDerivation makes it easier to write Nix expressions that are concise and
easy to read.

And Know about principles we discussed in this post may help us unstead the process
of packaging.
