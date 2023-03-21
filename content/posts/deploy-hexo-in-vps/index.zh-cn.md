---
title: 使用 Git 在 VPS 上部署 Hexo 博客
date: 2021-10-17 10:51:42
summary: 这里记录了自己在 VPS 上部署 Hexo 博客的过程：如何在 VPS 上
         创建 Git 仓库，如何设置 Hexo 博客 的 git `hooks` 钩子函数来自动构建和
         部署博客。
tags: Git
---


1 为啥要使用 Git
================

主要的原因是感觉使用其他方案还是有点麻烦、比如使用 scp 的话就无法处理好删除文章的活，使用 SFTP 吧，虽然是可以在文件管理器里直接将生成好的网站拖到服务器上，但是自己并不想把服务器的文件系统暴露出去。

所以打算在服务器上整个 Git 仓库，本地编辑好之后直接 `git push`，构建网页、部署到 HTTP 服务器的活就可以交给远程的机器去做。

当然首先是要在服务器上安装好软包，我自己用的 Ubuntu，所以安装过程是这样的：

~~~bash
sudo apt install git yarnpkg
~~~

这里安装了 Node.js 的包管理 yarn<del>（好用der!）</del>，毕竟并不是所有的 Linux 发行版都会给 Hexo 打个包。

2 配置远程 Git 仓库
===================

后面就是登录到服务器，找块合适的地方来放置 Git 仓库。这里打算将博客仓库的 Git 仓库放到 `/blog` 文件夹里。

~~~bash
mkdir /blog
cd /blog
git init --bare
~~~

这里的话在 `/blog` 目录下创建了一个 **裸仓库**，它的功能是作为一个 Git 服务器来使用。和一般的仓库不同，裸仓库比较特殊，它只存储文件的编辑历史和数据。简单来说裸仓库就是一般仓库的 `.git` 文件夹。

有关裸仓库的内容可以参考有关 Git 的第一手资料 [《Pro Git》][1]，这本书几乎覆盖了有关 Git 的所有内容。

为了验证咱们的仓库是没问题的，可以先在本地把仓库拉下来：

~~~
git clone ssh://user@ip:port/blog
~~~

这里 `user` 就是 SSH 连接服务器的用户名、`ip` 是服务器的 IP 地址、port 是开放的 SSH 端口，后面的 `/blog` 就是 Git 仓库在服务器上的绝对路径。

如果想给 Git 服务单独开一个账户的话，同样可以参考 [《Pro Git》][2]。

3 设置 Git 钩子
===============

简单来说 *[Git 钩子][3]* 就是仓库在特定事件（`push`、`commit`、`pull`）发生时运行的脚本。这里放一个解释放在这：

> 钩子（Hooks）是在 Git 执行特定阶段时可以触发操作的程序。如果钩子没有设置可执行权限，则会被忽略。
> 
> 默认情况下，钩子目录是 `$GIT_DIR/hooks`，但可以通过 `core.hooksPath` 配置变量进行更改（参见 git-config\[1\]）。
> 
> 在 Git 调用钩子之前，它会将其工作目录更改为裸仓库中的 `$GIT_DIR`，或者非裸仓库中工作树的根目录。唯一的例外是在推送期间触发的钩子（`pre-receive`、`update`、`post-receive`、`post-update`、`push-to-checkout`），它们始终在 $GIT_DIR 中执行。

如果查看 `/blog` 目录的结构，会发现下面有个 `hooks` 子目录，这里就是用来存储 Git 钩子的地方：

~~~bash
$ ls /blog
branches  config  description  HEAD  hooks  info  objects  refs
~~~

接下来需要设置好 `post-receive` 钩子，要做的事情很简单，在 `hooks` 目录下创建一个 `post-receive` 文件，内容可以是这样子：

~~~bash
#!/bin/sh
echo "[1/3] Checkout contain of repository"
blog="${GIT_DIR}/checkout"
git --work-tree=${blog} -f

echo "[2/3] Install dependence of blog"
cd ${blog}
yarn install

echo "[3/3] Build and deploy blog"
yarn hexo generate
rsync -av --delete ${blog}/public/ /var/www/html/
~~~

当然别忘了给钩子添加可执行权限：

~~~bash
chmod +x hooks/post-receive
~~~

这个脚本首先是从裸仓库中检出工作区，放到 `/blog/checkout` 目录下，然后进到这个目录安装 Hexo 以及其他博客的依赖文件，最后构建完成后用 `rsync` 将构建好的网页移动到 HTTP 服务器的目录下。**当然每个人使用的 Hexo 主题和配置不同，上面的脚本仅仅只能作为一个参考。**

这里简单解释下 `-av --delete`：

* `-a`：`archive mode`，会保留文件信息、比如所有者、权限、时间戳等
* `-v`：`verbose mode`，在终端中显示信息
* `--delete`：在传输前先情况目标目录下的所有文件

3 上传本地博客
==============

现在以及设置好了远程的 Git 仓库，将远程仓库添加本地的 Git 仓库中：

~~~
git remote add my-server ssh://user@ip:port/blo
~~~

添加好之后就可以将博客推送到服务器了：

```
git add .
git commit -m '[add/update/delete] <简单描述修改的内容>'
git push
```

一旦远程的服务器接收到我们推送的数据，就会触发 `post-receive` 钩子，后面远程服务器就会自己构建好博客，然后复制到 HTTP 服务器上。

[1]: https://www.git-scm.com/book/en/v2/Git-on-the-Server-Getting-Git-on-a-Server#_getting_git_on_a_server
[2]: https://www.git-scm.com/book/en/v2/Git-on-the-Server-Setting-Up-the-Server
[3]: https://www.git-scm.com/docs/githooks
