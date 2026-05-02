+++
title = "DASCTF 2024金秋十月"
slug = "dasctf-2024-golden-autumn-october"
description = ""
date = "2024-10-19T21:33:07"
lastmod = "2024-10-19T21:33:07"
image = ""
license = ""
categories = ["赛题"]
tags = ["flask"]
+++

# 0x01 前言

之前学到flask计算pin值的时候就知道一个`1`可以代替`self`，来进行文件读取，不过基本没用过，最近有个CTF，我不知道叫什么，**cxcx**师傅来和我交流说pin值说好了，如何进`console`，此时是400错误，我左思右想，想不到这啥情况，难不成不打`pin`值？结果最后就是读取了环境变量

# 0x02 question

## linux中/proc

官方文档是英文就不放了，简单的来说就是`proc`是一个伪文件系统，它提供了内核数据结构的接口。它通常挂载在 /proc 目录下。一般是由系统自动挂载的，不过也可以通过 mount 命令进行手动挂载。proc 文件系统只包含系统运行时的信息（如系统内存、mount 设备信息等），它只存在于内存中而不占用外存空间。它以文件系统的形式，为访问内核数据的操作提供接口。

但是其中的文件大部分为只读，只有少部分文件可写，我们可以通过可写文件来修改内核的部分配置

## 文件

> /proc/buddyinfo 每个内存区中的每个order有多少块可用，和内存碎片问题有关
>
> /proc/cmdline 启动时传递给kernel的参数信息
>
> /proc/cpuinfo cpu的信息
>
> /proc/crypto 内核使用的所有已安装的加密密码及细节
>
> /proc/devices 已经加载的设备并分类
>
> /proc/dma 已注册使用的ISA DMA频道列表
>
> /proc/execdomains Linux内核当前支持的execution domains
>
> /proc/fb 帧缓冲设备列表，包括数量和控制它的驱动
>
> /proc/filesystems 内核当前支持的文件系统类型
>
> /proc/interrupts x86架构中的每个IRQ中断数
>
> /proc/iomem 每个物理设备当前在系统内存中的映射
>
> /proc/ioports 一个设备的输入输出所使用的注册端口范围
>
> /proc/kcore 代表系统的物理内存，存储为核心文件格式，里边显示的是字节数，等于RAM大小加上4kb
>
> /proc/kmsg 记录内核生成的信息，可以通过/sbin/klogd或/bin/dmesg来处理
>
> /proc/loadavg 根据过去一段时间内CPU和IO的状态得出的负载状态，与uptime命令有关
>
> /proc/locks 内核锁住的文件列表
>
> /proc/mdstat 多硬盘，RAID配置信息(md=multiple disks)
>
> /proc/meminfo RAM使用的相关信息
>
> /proc/misc 其他的主要设备(设备号为10)上注册的驱动
>
> /proc/modules 所有加载到内核的模块列表
>
> /proc/mounts 系统中使用的所有挂载
>
> /proc/mtrr 系统使用的Memory Type Range Registers (MTRRs)
>
> /proc/partitions 分区中的块分配信息
>
> /proc/pci 系统中的PCI设备列表
>
> /proc/slabinfo 系统中所有活动的 slab 缓存信息
>
> /proc/stat 所有的CPU活动信息
>
> /proc/sysrq-trigger 使用echo命令来写这个文件的时候，远程root用户可以执行大多数的系统请求关键命令，就好像在本地终端执行一样。要写入这个文件，需要把/proc/sys/kernel/sysrq不能设置为0。这个文件对root也是不可读的
>
> /proc/uptime 系统已经运行了多久
>
> /proc/swaps 交换空间的使用情况
>
> /proc/version Linux内核版本和gcc版本
>
> /proc/bus 系统总线(Bus)信息，例如pci/usb等
>
> /proc/driver 驱动信息
>
> /proc/fs 文件系统信息
>
> /proc/ide ide设备信息
>
> /proc/irq 中断请求设备信息
>
> /proc/net 网卡设备信息
>
> /proc/scsi scsi设备信息
>
> /proc/tty tty设备信息
>
> /proc/net/dev 显示网络适配器及统计信息
>
> /proc/vmstat 虚拟内存统计信息
>
> /proc/vmcore 内核panic时的内存映像
>
> /proc/diskstats 取得磁盘信息
>
> /proc/schedstat kernel调度器的统计信息
>
> /proc/zoneinfo 显示内存空间的统计信息，对分析虚拟内存行为很有用
>
> 以下是/proc目录中进程N的信息
>
> /proc/N pid为N的进程信息
>
> /proc/N/cmdline 进程启动命令
>
> /proc/N/cwd 链接到进程当前工作目录
>
> /proc/N/environ 进程环境变量列表
>
> /proc/N/exe 链接到进程的执行命令文件
>
> /proc/N/fd 包含进程相关的所有的文件描述符
>
> /proc/N/maps 与进程相关的内存映射信息
>
> /proc/N/mem 指代进程持有的内存，不可读
>
> /proc/N/root 链接到进程的根目录
>
> /proc/N/stat 进程的状态
>
> /proc/N/statm 进程使用的内存的状态
>
> /proc/N/status 进程状态信息，比stat/statm更具可读性
>
> /proc/self 链接到当前正在运行的进程

我们经常用到的也就是一个进程，这里进程的self可以用1来代替，如果环境变量中有`flag`就可以直接进行读取了，不过这里其实是有权限的验证的

## flow

一进来就是个文件读取，这里直接读取我们的环境变量就可以了

```
http://node5.buuoj.cn:29505/file?f=/proc/1/environ
```

# 0x03 end

就是一个了解记录吧，一个小东西
