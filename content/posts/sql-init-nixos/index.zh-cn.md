---
title: NixOS 下搭建 MySQL 环境学习
date: 2022-10-31 22:18:51
tags: MySQL
summary: 主要是关于在 NixOS 上如何编写 shell.nix 来搭建一个易用的 MySQL 学习环境
---

这里记录了自己在 NixOS 搭建 MySQL 学习环境的过程，毕竟已经换上了 NixOS，因此希望在学习 SQL 时最好不要污染当前的环境。

我自己的话打算将所有数据库文件都放在 home 目录下的某个文件夹里，这里暂且称这个文件夹为 `sql-exercises`

## 进入 mysql 环境

```
cd sql-exercises
nix-shell -p mariadb
```

## 初始化数据库文件

```
mariadb-install-db
```

在这个执行完毕后，会发现 sql-exercises 下多了一个 data 的文件夹，之前初始化命令的输出也给出了提示：

```
Two all-privilege accounts were created.
One is root@localhost, it has no password, but you need to
be system 'root' user to connect. Use, for example, sudo mysql
The second is luo@localhost, it has no password either, but
you need to be the system 'luo' user to connect.
After connecting you can set the password, if you would need to be
able to connect as any of these users with a password and without sudo

...

You can start the MariaDB daemon with:
cd '/nix/store/18qzgvfd4bc3lq2nizhb9l0yhj1np0gj-mariadb-server-10.6.10' ; /nix/store/18qzgvfd4bc3lq2nizhb9l0yhj1np0gj-mariadb-server-10.6.10/bin/mysqld_safe --datadir='./data'
```

大概意思就是为我们创建了两个 mysql 数据库用户，一个是 root，另一个与自己的用户名相同。同时也给出了启动服务的命令。

## 启动数据库

试着执行下上面提示的命令，这里使用 $(pwd) 展开 sql-exercises 的路径，这样子就可以拿到 sql-exercises/data 这个文件夹的绝对路径了：

```
[nix-shell:~/code/sql-exercises]$ mysqld_safe --datadir="$(pwd)/data"
221031 22:33:49 mysqld_safe Logging to './data/luo.err'.
mkdir: cannot create directory ‘/run/mysqld’: Permission denied
221031 22:33:49 mysqld_safe Fatal error Can't create database directory ''
```

这里可以看出启动数据库需要 /run/mysqld 这个文件夹，也给出了查看错误日志的路径。可以直接创建 /run/mysqld 这个文件夹然后赋予正确的权限，但感觉还是有一点丑陋。最好是能使用 sql-exercises 下的一个目录。

很自然就能想到 -h 查看帮助了，最后给了一个提示：

```
mysqld_safe --help
... 
All other options are passed to the mysqld program.
```

可以看到 mysqld_safe 其实是对 mysqld 的一个包装：

```
[nix-shell:~/code/sql-exercises]$ mysqld --help
mysqld  Ver 10.6.10-MariaDB for Linux on x86_64 (MariaDB Server)
Copyright (c) 2000, 2018, Oracle, MariaDB Corporation Ab and others.

Starts the MariaDB database server.

Usage: mysqld [OPTIONS]

For more help options (several pages), use mysqld --verbose --help.
```

试试 `mysqld --verbose --help| /run/mysqld/mysqld.sock`，发现可以通过 --socket 选项来修改套接字的位置：

```ini
[$] mysqld --verbose --help|grep /run/mysqld/mysqld.sock
...
socket  /run/mysqld/mysqld.sock
```

启动服务：

```
mysqld_safe --datadir="$(pwd)/data" --socket="$(pwd)/run/mysqld/mysqld.sock"
```

没有报错，说明服务已经在运行了。

### 连接数据库

当然别忘了使用 `--socket` 指定套接字的路径：

```
[nix-shell:~/code/sql-exercises]$  mariadb --socket="$(pwd)/run/mysqld/mysqld.sock"
Welcome to the MariaDB monitor.  Commands end with ; or \g.
Your MariaDB connection id is 3
Server version: 10.6.10-MariaDB MariaDB Server

Copyright (c) 2000, 2018, Oracle, MariaDB Corporation Ab and others.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.
```

### 编写 shell.nix

模板：https://nixos.org/manual/nixpkgs/unstable/#sec-pkgs-mkShell

将上面的步骤写进 shell.nix：

```
{ pkgs ? import <nixpkgs> { } }:

let 
  rootDir = builtins.toString ./.;
  dataDir = builtins.toString ./data;
  socketPath = builtins.toString ./run/mysqld/mysqld.sock;
in

pkgs.mkShell {
  packages = with pkgs; [ mariadb ];

  shellHook = ''
    [[ -d data ]] || mariadb-install-db
    
    function start_db() {
      mysqld_safe --datadir="${dataDir}" --socket="${socketPath}"
    }

    function connect_db() {
      mariadb --socket="${socketPath}" -t
    }

    function runsql() {
      connect_db < "$@"
    }
  '';
}
```

以后只需要在 sql-exercises 文件夹下使用 `nix-shell` 就可以进入 MySQL 环境了。这里简单地定义了几个函数，start_db 用来启动数据库，connect_db 用来连接数据库，最后的 runsql 可以从文件执行 SQL 语句。
