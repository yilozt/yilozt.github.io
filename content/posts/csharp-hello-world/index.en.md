---
title: C# Hello World (NixOS)
date: 2022-11-11 09:28:43
tags: C#
summary: A notes about setting up a suitable learning environment for C# on NixOS.
---

# Install Mono And .Net SDK

C# requires `.Net` as runtime to execute, so we need install `.Net SDK` first:

```bash
nix-shell -p dotnetCorePackages.sdk_6_0 mono
```

# Hello World

The structure of C# source looks like this, it uses `.cs` as file extensions.

```csharp
// hello_world.cs
using System;

namespace com.example {
    class HelloWorld {
        static void Main(string[] args) {
            Console.WriteLine("Hello World");
        }
    }
}
```

The writing style is similar to `Java` and `C++`:

- The `using` is used for import a namespace
- The entry function is `Main`, with similar writing style in Java.
- The `Console.WriteLine` method just likes the `printf` function in `C`. This
  method is import from `System` namespace. 

# Compile and Execute

Using `csc` to compile source code after installed `mono` packages:

```
csc hello_world.cs
```

After compile done, it will generate `hello_world.exe` in current directory: 

```
$ file hello_world.exe 
hello_world.exe: PE32 executable (console) Intel 80386 Mono/.Net assembly, for MS Windows
```

Run Hello World:

```
$ mono hello_world.exe
Hello World
```

# VSCode Extensions

We need to install two extensions:

- C#
- Mono Debug

The debug functionality in `C#` extensions only available in Windows, In Linux we
need to install `Mono Debug` extensions for Debug. The flowing Nix expression describe
how to install those extensions to system:

```nix
environment.systemPackages = with pkgs; [
  (vscode-with-extensions.override {
    vscode = vscodium;
    vscodeExtensions = with vscode-extensions; [
      vscode-extensions.ms-dotnettools.csharp
    ] ++ pkgs.vscode-utils.extensionsFromVscodeMarketplace [
      {
        name = "mono-debug";
        publisher = "ms-vscode";
        version = "0.16.3";
        sha256 = "sha256-6IU8aP4FQVbEMZAgssGiyqM+PAbwipxou5Wk3Q2mjZg=";
      }
    ];
  })
];
```

# Debug

Mainly refer to this posts in CSDN: https://blog.csdn.net/qinyuanpei/article/details/57419539

**`.vscode/tasks.json`**: Create a task to compile `c#` source with
`-debug` mode:

```json
{
    // See https://go.microsoft.com/fwlink/?LinkId=733558
    // for the documentation about the tasks.json format
    "version": "2.0.0",
    "tasks": [
        {
            "label": "build", // A label to identify task
            "command": "csc", // Run `csc -debug ${file}`
            "type": "shell",
            "args": [
                "-debug",
                "${file}"     // ${file} will be replaced to the file to compile
            ],
        }
    ]
}
```

**`.vscode/launch.json`**: Execute program and start debugger by `Mono Debug`
extensions:

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "mono",
            "name": "Launch",
            "request": "launch",
            "program": "${fileDirname}/${fileBasenameNoExtension}.exe", 
            "cwd": "${workspaceFolder}",
            "preLaunchTask": "build",
            "runtimeExecutable": "mono",
            "console": "integratedTerminal",
        }
    ]
}
```

If Vscode failed and tips with can't found `Mono Runtime`, just set up the
`runtimeExecutable` field to absolute path of `mono` in previous configuration.

Now we can add breakpoint and press `F5` to debugging:

![](./debug-in-vscode.png)