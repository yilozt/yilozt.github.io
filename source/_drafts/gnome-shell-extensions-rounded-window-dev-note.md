---
title: gnome-shell-extensions-rounded-window 笔记
tags:
---

不知道能不能做出来，毕竟这是自己第一次尝试写 gnome 拓展。

计划将 mutter-rounded 重写成一个 gnome 拓展，目前并没有继续给 mutter-rounded 添加功能的计划。打算使用 ts 重写，@gi.ts 提供代码补全。

带有圆角的模糊效果大概只能用 C 语言写了，目前 gjs 里还没有暴露好相关的接口，gnome-shell 里能用的 Cogl 库已经和 mutter / gnome-shell 里的源码用的 API 已经脱节了。

项目参考：[oae/gnome-shell-extensions-sync](https://github.com/oae/gnome-shell-extensions-sync)，这是一个将gnome配置同步到github/gitlab的拓展，repo 用了一些有趣的东西：

- ts
- 使用 vagrant 来自动配置开发用的虚拟机，这样就可以在不影响自己日用系统的情况下调试拓展
- 使用 rollup 来将 ts 编译成的 js 文件组成 gnome-shell 拓展，有点像 makefile
- 用 eslint 进行语法规范检查
- husky: 配置 git hooks

打算试一试这套工具。

对应工具的文档，当遇到问题的时候，可以翻一翻：

- Vagrant:
  - 教程：https://learn.hashicorp.com/collections/vagrant/getting-started
  - Vagrantfile：https://www.vagrantup.com/docs/vagrantfile
- rollup:
  - 配置文件：https://rollupjs.org/guide/en/#configuration-files
- husky:
  - 文档：https://typicode.github.io/husky/#/
- eslint:
  - typescript-eslint:
    - 配置文件: https://typescript-eslint.io/docs/linting/
    - 检查规则：https://typescript-eslint.io/rules/
  - eslint:
    - 配置文件：https://eslint.org/docs/user-guide/configuring/configuration-files#configuration-file-formats

gjs, gnome-shell 拓展相关：

- API文档：https://gjs-docs.gnome.org
- GJS 教程，官网：https://gjs.guide/
- gnome-shell 拓展：https://gjs.guide/extensions/
- gnome-shell 源码：https://gitlab.gnome.org/GNOME/gnome-shell
- 对应的，gnome-shell 相关模块解释：http://mathematicalcoffee.blogspot.com/2012/09/gnome-shell-javascript-source.html

## 配置 Vagrant

添加插件，emo 在他的 repo 里用了两个插件：
- [vagrant-vbguest](https://github.com/dotless-de/vagrant-vbguest)：给虚拟机安装 VirtualBox Guest Additions
- [vagrant-reload](https://github.com/aidanns/vagrant-reload)：在虚拟机配置完成后重启虚拟机



ssh 连接：
```
vagrant ssh
journalctl -f -o cat /usr/bin/gnome-shell
```


