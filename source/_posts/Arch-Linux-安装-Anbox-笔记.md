---
title: Arch Linux 安装 Anbox 笔记
tags: Arch
date: 2021-10-18 08:51:42
---

> 根据 arch wiki 整理的 Anbox 安装笔记：
> wiki 地址：[https://wiki.archlinux.org/title/Anbox](https://wiki.archlinux.org/title/Anbox)

## 安装内核模块

需要将内核更换为 `linux-tls`：

```bash
sudo pacman -S linux-lts linux-lts-headers
sudo grub-mkconfig -o /boot/grub/grub.cfg
```

安装内核模块：

```bash
yay -S anbox-modules-dkms
```

加载内核模块：

```bash
sudo modprobe binder_linux devices=binder,hwbinder,vndbinder,anbox-binder,anbox-hwbinder,anbox-vndbinder
sudo modprobe ashmem_linux
sudo mkdir -p /dev/binderfs
sudo mount -t binder binder /dev/binderfs
```

编辑 `/etc/modules-load.d/anbox.conf`，以便开机时启用内核模块：

```bash
ashmem_linux
binder_linux
```

编辑`/etc/tmpfiles.d/anbox.conf`，下面的文件，以便开机时挂载 `binderfs`：

```bash
# /etc/tmpfiles.d/anbox.conf
d! /dev/binderfs 0755 root root
```

在 `/etc/fstab` 末尾添加：

```bash
none                         /dev/binderfs binder   nofail  0      0
```

## 安装 anbox

使用 `Archlinuxcn` 源安装：

```bash
sudo pacman -S anbox-git anbox-image
```

设置网络。我电脑上使用 `NetworkManager` 作为网络管理，因此只需要这样就完成 Anbox 的网络配置了：

```bash
nmcli con add type bridge ifname anbox0 -- connection.id anbox-net ipv4.method shared ipv4.addresses 192.168.250.1/24
```

这里只需要执行一次，以后开机时，NetworkManger 会自动配置网络。 其他配置网络的方法自行参考 Arch Wiki。

启用服务：

```bash
sudo systemctl start anbox-container-manager.service  # 启动
sudo systemctl enable anbox-container-manager.service # 设置开机启动
```

检查 Anbox 状态，如果显示为 running，那应该没什么太大的问题了：

```
sudo systemctl status anbox-container-manager.service
```

这时候从桌面的 Anbox 图标点进去就能看到 Anbox 的界面了。


## 安装应用

需要确保 `adb` 命令存在：

```
sudo pacman -S android-tools
```

之后使用 `adb install` 就可以安装 app 了：

```
adb install /path/to/app.apk
```

## ARM 支持

目前没看出来有多大用，一些 ARM 构架的 apk 是能安装，但启动不了。

### 安装前准备

先安装一些依赖：

```bash
sudo pacman -S squashfs-tools tar unzip curl wget lzip 
```

> 接下来的内容在将来可能会过时，建议参考原项目的地址：[https://github.com/geeks-r-us/anbox-playstore-installer](https://github.com/geeks-r-us/anbox-playstore-installer)

ARM 的安装脚本在 Arch 上并不能直接使用，在此之前需要进行手动干预。需要手动修改 `/usr/lib/systemd/system/anbox-container-manager.service` 文件，在 `ExecStart` 这一行的末尾加上 ` --use-rootfs-overlay`，修改后的文件大概长这样：

```conf
[Unit]
Description=Anbox Container Manager

[Service]
ExecStart=/usr/bin/anbox container-manager --daemon --privileged --data-path=/var/lib/anbox --use-rootfs-overlay

[Install]
WantedBy=multi-user.target
```

然后重启 Anbox 服务：

```bash
systemctl daemon-reload
systemctl restart anbox-container-manager.service
```

### 安装

接下来只需要下载脚本，运行就行，这个过程需要下载一些文件，可能需要翻越 GFW：

```bash
mkdir a
cd a
wget https://raw.githubusercontent.com/geeks-r-us/anbox-playstore-installer/master/install-playstore.sh
chmod +x install-playstore.sh
./install-playstore.sh
```

没问题的话，打开 Anbox 应该就能发现多了一个 Google 引用市场，arm 构架的 apk 也能成功安装。

![arm-res](./arm-res.png)


## 代理设置

### 设置代理

主机使用的是 Qv2ray进行代理，它默认监听 127.0.0.1 ，此时 anbox 是不能访问电脑上的代理服务器的。解决办法也很简单，在主界面点击`首选项`，将`入站设置`里的`监听地址`改成 0.0.0.0 就行了：

![qv2ray-setting.png](./qv2ray-setting.png)

现在通过 adb 设置代理应该就没有问题了：

```bash
adb shell settings put global http_proxy <ip>:<port>
```
![result.png](./result.png)

### 取消代理

```bash
adb shell settings put global http_proxy :0
```