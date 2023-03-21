---
title: Deploy Hexo Blog in VPS using Git
date: 2021-10-17 10:51:42
summary:
         This post details my step-by-step process for deploying Hexo to my VPS.


         In this post, I share my process for creating a Git repository in my
         VPS and set up Git hooks to automate building blog and deploying it to
         an HTTP server.
tags: Git
---

1 Why using Git?
================

Updating a website on a server can be a tedious and inconvenient process,
especially if I want to delete posts. Additionally,  I don't want to deploy a
SFTP server and expose the file system to the public network, even though I
can update my website by connecting with SFTP in my file explorer. 

To streamline the process, I plan to use a Git workflow to automate the
deployment. Once I add and push my commits to the server, the blog will
automatically build and deploy to an HTTP server without manual intervention.

To get start, let's install Git and Hexo. My serve is Ubuntu, so I install
them with the follow command:

```bash
sudo apt install git yarnpkg
```

In most cases, Linux distributions do not have packages specifically for Hexo. 
Therefore, I have installed [yarn](https://yarnpkg.com), a Node.js package
manager, which we can use to install Hexo later. 

# 2 Create a Git repository on Server for Blog

Logging into server, locate an appropriate directory to store the repository
for our blog. I will be using directory `/blog` in this posts.

~~~bash
mkdir /blog
cd /blog
git init --bare
~~~

Now a **bare repository** is set up in the `/blog` directory. It doesn't
contain a working directory and used to manager the Git history of the files,
just like `.git` directory of normal Git repository created using command `git
init`.

For more information about *bare repository*, refer to book
[Pro Git][1]. I highly recommend reading this book, it contains plenty
of explanation and examples that are crucial for understanding Git.

To verify the repository is accessible, cloning it from a local machine:

~~~bash
git clone ssh://user@ip:port/blog
~~~

Here, I replace `user` with my `username` in server, `ip` with IP of server,
`port` with SSH port number used on the server, the following `/blog` with
the absolute path of repository on the server. 

If you want to create a new user specifically for Git,
refer to the [book][2] for instructions.

3 Set up the Git Hooks
======================

After confirming that the repository is accessible from a local machine, the
next step is to set up a *[hooks][3]* to trigger our programs when certain
events occurs in the repository, such as a commit or a push.
This [document][3] has an accurate explanation of Git hooks:

> Hooks are programs you can place in a hooks directory to trigger actions at
> certain points in git’s execution. Hooks that don’t have the executable bit
> set are ignored.
> 
> By default the hooks directory is `$GIT_DIR/hooks`, but that can be changed
> via the core.hooksPath configuration variable (see git-config\[1\]).
> 
> Before Git invokes a hook, it changes its working directory to either $GIT_DIR
> in a bare repository or the root of the working tree in a non-bare repository.
> An exception are hooks triggered during a push (`pre-receive`, `update`, 
> `post-receive`, `post-update`, `push-to-checkout`) which are always executed
> in `$GIT_DIR`.

If you navigate to the repository directory, you will see a subdirectory called
`hooks`, which is intended for storing git hooks:

~~~command
$ ls /blog
branches  config  description  HEAD  hooks  info  objects  refs
~~~

Next, setup a `post-receive` hooks that will be triggered whenever the blog is
updated on server via `git push`. This hooks executes on the remote repository
once all refs have been updated. To create the hook, navigate to `/blogs/hooks`
directory and create a script named `post-receive` with following content:

~~~bash
#!/bin/sh
echo "[1/3] Checkout contain of repository"
blog="/checkout"
mkdir -p ${blog}
git --work-tree=${blog} checkout -f

echo "[2/3] Install dependence of blog"
cd ${blog}
yarn install

echo "[3/3] Build and deploy blog"
yarn hexo generate
rsync -av --delete ${blog}/public/ /var/www/html/
~~~

Also don't forget add executive access for script :) :

```bash
chmod +x hooks/post-receive
```

This script first checks out the contents of the repository, then install the
blog's dependencies and builds the blog before deploying it to the server using
`rsync`. Make sure make script executable by running `chmod +x post-receive`.
**Make sure to modify this script according to your Hexo blog and HTTP server
configuration**.

This is the explanation for `-avz --delete` parameter of `rsync` command:

* `-a`: archive mode, which preserves permissions, ownership, timestamps,
   and other attributes of the files being synchronized
* `-v`: verbose mode, which shows the progress of the synchronization
  in the terminal
* `-z`: compression mode, which compresses the files during transmission to
   reduce the amount of data that needs to be transferred
* `--delete`: an option that tells rsync to delete any files in the destination
   directory that do not exist in the source directory. This ensures that
   the destination directory is an exact replica of the source directory.

3 Updating the Blog via Git on a Local Machine
==============================================

Now I can add the remote URL to the local Git repository for the blog, you can
replace `my-server` with any name that makes sense to you:

```bash
git remote add my-server ssh://user@ip:port/blog
```

Once the remote URL is added, it is ready to push changes to the server by
running the flowing commands:

```
git add .
git commit -m '[add/update/delete] brief description of changes'
git push
```

This will push the changes to the remote repository. The `post-receive` hook on
the server will be triggered automatically after the push, and it will build and
deploy the updated blog.

[1]: https://www.git-scm.com/book/en/v2/Git-on-the-Server-Getting-Git-on-a-Server#_getting_git_on_a_server
[2]: https://www.git-scm.com/book/en/v2/Git-on-the-Server-Setting-Up-the-Server
[3]: https://www.git-scm.com/docs/githooks