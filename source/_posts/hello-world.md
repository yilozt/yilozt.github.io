---
title: 使用 git 在 vps 上部署 hexo 博客
date: 2021-10-17 10:51:42
---

## 在 VPS 上创建 git 仓库

1. 安装 git：
   
   ```bash
   sudo apt install git
   ```

2. 为 git 创建用户，并为其设置密码：

   ```bash
   sudo useradd git
   sudo passwd git      # 为 git 用户创建密码，之后上传博客时使用
   ```

   安全起见，需要禁止git 用户的登陆权限:

   ```bash
   sudo chsh git -s /usr/bin/git-shell
   ```

   这样 git 用户就能通过 ssh 使用 git，但不能通过 ssh 登陆服务器。

3. 为博客创建一个 git 仓库，假设 git 仓库位于 /home 目录，并将仓库的 owner 设置为 git：

   ```bash
   cd /home
   # 在 /home 目录下创建名为 `site.git` 的仓库 
   sudo git init --bare site.git
   sudo chown -R git ./site.git
   ```

   这里 git 命令在 /home 文件夹下创建了一个裸仓库 site.git，裸仓库没有工作区，放在服务器纯粹是拿来上传博客内容。
   
4. cd 进博客仓库，可以看到 site.git 文件夹的目录结构：

   ```bash
   cd /home/site.git
   ls
   #  branches  config  description  HEAD  hooks  info  objects  refs
   ```

   因为是裸仓库，里面的文件普通仓库下 `.git` 文件夹是一样的，只是用来存储仓库的历史记录。这里需要给仓库创建一个 `hook`， 在 `hooks` 文件夹下创建 `post-receive`文件：

   ```bash
   cd /home/site.git
   sudo touch hooks/post-receive    # 创建一个 hook
   sudo nano hooks/post-receive     # 编辑这个文件
   ```

   将 `hooks/post-receive` 文件修改为下面内容：

   ```bash
   git --work-tree=/var/www/html --git-dir=/home/site.git checkout -f main
   ```

   这里 `--work-tree` 为 html 服务器部署的目录， `git-dir` 为 git 仓库的位置。这里每当通过 git 上传博客内容时，git 会自动检出仓库 `/home/site.git` 的内容，将其部署到 `/var/www/html`。

   不要忘了给 `hook` 添加执行权限：

   ```bash
   sudo chmod +x hooks/post-receive
   ```

   这样子 git 服务器就算配置完成了。

5. 为了确保 git 能够将文件部署到 html 服务器，需要保证 git 用户可以读写 `/var/www/html` 这个文件夹，可以将 `/var/www/html` 的 owner 修改为 git

   ```bash
   sudo chmod -R git /var/www/html
   ```

## 将博客内容上传到服务器

1. cd 到博客所在的位置，使用 git 命令将服务器上的 git 仓库 clone 到本地。clone 的时候 git 命令会提示你输入服务器上 git 用户的密码：

   ```bash
   # cd 到 hexo 博客的位置
   git clone git@xxx.xxx.xxx.xxx:/home/site.git public
   ```

   这里需要将 `xxx.xxx.xxx.xxx` 替换成你 vps 仓库的 ip。这样子 vps 服务器上的仓库就被 clone 到博客文件夹下的 public 目录了。

2. 接下来只需要生成静态内容，上传到 vps 上的 git 服务器了：
   
   ```bash
   hexo generate             # 生成静态内容
   cd public
   git add *
   git commit -m '第一次提交'  # 提交更改
   git push                  # 上传
   ```

   在 git push 之后，之前 vps 上设置的 hook 会被调用，git 会自动将博客更新到 vps 上的 `/var/www/html` 下。

   以后更新博客时，只需要用 `hexo generate` 命令生成静态内容，之后再通过 git 上传到 vps 就行了。
