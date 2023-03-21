---
title: Setup a MySQL learning environment in NixOS
date: 2022-10-31 22:18:51
tags: MySQL
summary: My experience of setting up a MySQL learning environment on NixOS. 
---

I'm sharing my experience of setting up a MySQL learning environment on NixOS. Since I've switched to NixOS, I don't want to mess up my current environment while learning SQL.

For my personal setup, I'm planning to keep all database files in a directory called `sql-exercises` under my home directory.

1 Setting up MySQL
==================

~~~bash
cd ~/sql-exercises
nix-shell -p mariadb
mariadb-install-db
~~~

After running this command, a `data` directory will be created under `sql-exercises`. The output of the initialization command will also provide some useful information:


~~~
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
~~~

This indicates that two MySQL database users have been created, one with the username `root` and the other with the same name as your system username. The output also provides the command to start the MySQL daemon.

2 Starting the MySQL daemon
===========================

Let's try running the command suggested above. We can use `$(pwd)` to expand the `sql-exercises` directory path and get the absolute path of `sql-exercises/data`:

```ini
[nix-shell:~/code/sql-exercises]$ mysqld_safe --datadir="$(pwd)/data"
221031 22:33:49 mysqld_safe Logging to './data/luo.err'.
mkdir: cannot create directory ‘/run/mysqld’: Permission denied
221031 22:33:49 mysqld_safe Fatal error Can't create database directory ''
```

We can see from the error message that the MySQL daemon needs the /run/mysqld directory to run, and the error also gives us the path to the error log file. We could simply create the /run/mysqld directory and grant it the appropriate permissions, but that might be messy. It would be better to use a directory under `sql-exercises` instead.

To see if this is possible, we can use the `--help` flag to check for options:

```
mysqld_safe --help
... 
All other options are passed to the mysqld program.
```

We can see that `mysqld_safe` is actually a wrapper for `mysqld`:

```
[nix-shell:~/code/sql-exercises]$ mysqld --help
mysqld  Ver 10.6.10-MariaDB for Linux on x86_64 (MariaDB Server)
Copyright (c) 2000, 2018, Oracle, MariaDB Corporation Ab and others.

Starts the MariaDB database server.

Usage: mysqld [OPTIONS]

For more help options (several pages), use mysqld --verbose --help.
```

Let's try running `mysqld --verbose --help | grep /run/mysqld/mysqld.sock` to 
To get the location of the socket, then use the `--socket` option to specify the new location.

```ini
[$] mysqld --verbose --help|grep /run/mysqld/mysqld.sock

...
socket  /run/mysqld/mysqld.sock
```

Start the service with the new socket location:

```
mysqld_safe --datadir="$(pwd)/data" --socket="$(pwd)/run/mysqld/mysqld.sock"
```

If there are no errors, the service should now be running.

3 Connect to DateBase
=======================

To connect to the database, don't forget to use the `--socket` option to specify the path to the new socket location:

```
[nix-shell:~/code/sql-exercises]$  mariadb --socket="$(pwd)/run/mysqld/mysqld.sock"
Welcome to the MariaDB monitor.  Commands end with ; or \g.
Your MariaDB connection id is 3
Server version: 10.6.10-MariaDB MariaDB Server

Copyright (c) 2000, 2018, Oracle, MariaDB Corporation Ab and others.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.
```

4 Write the shell.nix file
==========================

To create the shell.nix file, we can use the mkShell function from Nixpkgs. This function takes a set of dependencies and generates a Nix shell environment containing those dependencies.

There is a template of `shell.nix`: https://nixos.org/manual/nixpkgs/unstable/#sec-pkgs-mkShell

To start, let's create a new file named `shell.nix` in the root of the `sql-exercises` directory. Then, we can use the following code as a template:

```bash
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

In this `shell.nix`, we define several useful functions to interact with the MySQL server, including `start-db` to start the server, `connect_db` to connect to the database, and `runsql` to execute SQL statements from a file.

Now, we can run `nix-shell` in the `sql-exercises directory`, and it will launch
a new shell.