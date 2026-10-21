---
title: UReport2未授权设计器挖掘及利用
slug: ureport2-unauth-designer-rce
description: "公开利用多停在 MySQL 8.0.19，但是这次发现 UReport 里 8.0.20–8.1.0 仍然可以打🙂‍↕️"
date: 2026-10-21T17:28:03+08:00
lastmod: 2026-10-21T17:28:03+08:00
author: baozongwi
categories:
  - Research
tags:
  - UReport2
  - JDBC
  - Java反序列化
  - Fake MySQL Server
  - 文件上传
---

## 0x00 TL;DR

这两天没什么事情，就想到之前在亭子打过一个项目资产非常少，最后到了项目第四天，项目结束倒数第二天通过 UReport 拿到了一些成果，后来在一些 HVV 里面也能遇到有一些资产，想来应该开发找的这个很久没更新（八年之久）的报表二开一下就拿来用了，所以来分析一下，顺便造个轮子用用，[轮子已丢 GitHub](https://github.com/baozongwi/ureport-detect)

UReport2 的设计器默认没有鉴权，`UReportServlet` 按 URI 第一段分发到 `ServletAction`，第二段路径再被反射成方法名。审计了整个产品，找到了四个路由可以命令执行`/ureport/datasource/previewData`、`/ureport/datasource/testConnection`、`/ureport/designer/savePreviewData`、`/ureport/designer/saveReportFile` 都能直接访问到

## 0x01 路由分发逻辑

请求先到 `UReportServlet.service`，去掉 context 和 `/ureport` 之后取第一段，去 `actionMap` 里找对应的 `ServletAction`。没有 Filter，也没有登录判断。

```java
// ureport2-console/src/main/java/com/bstek/ureport/console/UReportServlet.java:62-81
protected void service(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
    String path = req.getContextPath() + URL;
    String uri = req.getRequestURI();
    String targetUrl = uri.substring(path.length());
    if (targetUrl.length() < 1) {
        outContent(resp, "Welcome to use ureport,please specify target url.");
        return;
    }
    int slashPos = targetUrl.indexOf("/", 1);
    if (slashPos > -1) {
        targetUrl = targetUrl.substring(0, slashPos);
    }
    ServletAction targetHandler = actionMap.get(targetUrl);
    if (targetHandler == null) {
        outContent(resp, "Handler [" + targetUrl + "] not exist.");
        return;
    }
    RequestHolder.setRequest(req);
    try {
        targetHandler.execute(req, resp);
    } catch (Exception ex) {
        resp.setCharacterEncoding("UTF-8");
        PrintWriter pw = resp.getWriter();
```

`DatasourceServletAction` 和 `DesignerServletAction` 的 `execute` 都是同一套逻辑，第二段路径交给 `retriveMethod`，再 `invokeMethod` 按方法名反射。`/ureport/datasource/previewData` 因此会进 `previewData`。

```java
// ureport2-console/src/main/java/com/bstek/ureport/console/BaseServletAction.java:85-104
protected void invokeMethod(String methodName, HttpServletRequest req, HttpServletResponse resp) throws ServletException {
    try {
        Method method = this.getClass().getMethod(methodName, new Class<?>[]{HttpServletRequest.class, HttpServletResponse.class});
        method.invoke(this, new Object[]{req, resp});
    } catch (Exception ex) {
        throw new ServletException(ex);
    }
}

protected String retriveMethod(HttpServletRequest req) throws ServletException {
    String path = req.getContextPath() + UReportServlet.URL;
    String uri = req.getRequestURI();
    String targetUrl = uri.substring(path.length());
    int slashPos = targetUrl.indexOf("/", 1);
    if (slashPos > -1) {
        String methodName = targetUrl.substring(slashPos + 1).trim();
        return methodName.length() > 0 ? methodName : null;
    }
    return null;
}
```

后面几条的 source 都从这里进来，差别只在反射到哪个方法，以及这个方法把参数交给谁。

## 0x02 三种驱动

攻击方式就分 JDBC 注入和文件上传，JDBC 占大头，所以这里讲讲这三种驱动在 UReport 中执行方式分别是怎么样

### H2

H2 的连接串支持 `INIT`，建连时会把里面的 Java 源码编译成函数再调用，所以能够直接执行命令。

### MySQL

MySQL 需要自己起一个 Fake MySQL Server，等目标的 Connector/J 连上来后返回反序列化数据，所以也就有一个条件，URL 里有 `autoDeserialize=true`，且版本支持。

公开利用大多停在拦截器路径。5.1 用 statementInterceptors，8.0.19 及以前用 queryInterceptors，都是 ServerStatusDiffInterceptor，通过发 SHOW SESSION STATUS，对第二列调 getObject，只要是 BLOB 且以 AC ED 开头并开启 autoDeserialize，就会进 readObject 进行反序列化。

8.0.20 起拦截器改成直接 getString（Bug#30636056），但驱动里的 getObject sink 还在。那么我们能够找一个理想的方法继续完成高版本 MySQL 的利用吗🤔，而在 UReport 的 previewData 会走 Spring 的 queryForList，最终对结果列调用 ResultSet.getObject，因此 Fake Server 对这条 SELECT 返回 BLOB 序列化数据仍能触发，这条路径可用到 8.1.0。8.2.0 移除 autoDeserialize 后彻底失效。

公开链是拦截器在 `getConnection` 里把 `getObject` 调起来的。8.0.19 把 `SHOW SESSION STATUS` 交给 `ResultSetUtil.resultSetToMap`，将结果转成 Map，对第 2 列调用了 `rs.getObject(2)`，然后序列化数据就在这里被反序列化。

```java
// mysql-connector-java-8.0.19/com/mysql/cj/jdbc/util/ResultSetUtil.java:44-48
public static void resultSetToMap(Map mappedValues, ResultSet rs) throws SQLException {
    while (rs.next()) {
        mappedValues.put(rs.getObject(1), rs.getObject(2));
    }
}
```

8.0.20 起同一处改成了 `rs.getString(1)` 和 `rs.getString(2)`，`testConnection` 就进不了反序列化。

但是驱动里的 sink 没有一起删，`ResultSetImpl.getObject` 对 BLOB 仍是前两字节 `AC ED` 且 `autoDeserialize=true` 就 `readObject`。

```java
// mysql-connector-java-8.0.30/com/mysql/cj/jdbc/result/ResultSetImpl.java:1236-1252
if (this.connection.getPropertySet().getBooleanProperty(PropertyKey.autoDeserialize).getValue()) {
    Object obj = data;
    if ((data != null) && (data.length >= 2)) {
        if ((data[0] == -84) && (data[1] == -19)) {
            try {
                ByteArrayInputStream bytesIn = new ByteArrayInputStream(data);
                ObjectInputStream objIn = new ObjectInputStream(bytesIn);
                obj = objIn.readObject();
                objIn.close();
                bytesIn.close();
            } catch (ClassNotFoundException cnfe) {
                throw SQLError.createSQLException(Messages.getString("ResultSet.Class_not_found___91") + cnfe.toString()
                        + Messages.getString("ResultSet._while_reading_serialized_object_92"), getExceptionInterceptor());
            }
        }
    }
}
```

`previewData` 和报表数据集最后都是 `NamedParameterJdbcTemplate.queryForList`，这个方法直接建一个 `ColumnMapRowMapper`。

```java
// spring-jdbc-4.3.25.RELEASE/org/springframework/jdbc/core/namedparam/NamedParameterJdbcTemplate.java:261-265
public List<Map<String, Object>> queryForList(String sql, SqlParameterSource paramSource)
        throws DataAccessException {
    return query(sql, paramSource, new ColumnMapRowMapper());
}
```

查询结果由 `RowMapperResultSetExtractor` 逐行交给这个 mapper。

```java
// spring-jdbc-4.3.25.RELEASE/org/springframework/jdbc/core/RowMapperResultSetExtractor.java:89-96
public List<T> extractData(ResultSet rs) throws SQLException {
    List<T> results = (this.rowsExpected > 0 ? new ArrayList<T>(this.rowsExpected) : new ArrayList<T>());
    int rowNum = 0;
    while (rs.next()) {
        results.add(this.rowMapper.mapRow(rs, rowNum++));
    }
    return results;
}
```

`mapRow` 按列取值，`getColumnValue` 进 `JdbcUtils.getResultSetValue`，这个方法的第一句就是 `rs.getObject(index)`。

```java
// spring-jdbc-4.3.25.RELEASE/org/springframework/jdbc/core/ColumnMapRowMapper.java:51-59
public Map<String, Object> mapRow(ResultSet rs, int rowNum) throws SQLException {
    ResultSetMetaData rsmd = rs.getMetaData();
    int columnCount = rsmd.getColumnCount();
    Map<String, Object> mapOfColumnValues = createColumnMap(columnCount);
    for (int i = 1; i <= columnCount; i++) {
        String column = JdbcUtils.lookupColumnName(rsmd, i);
        mapOfColumnValues.put(getColumnKey(column), getColumnValue(rs, i));
    }
    return mapOfColumnValues;
}
```

```java
// spring-jdbc-4.3.25.RELEASE/org/springframework/jdbc/core/ColumnMapRowMapper.java:94-96
protected Object getColumnValue(ResultSet rs, int index) throws SQLException {
    return JdbcUtils.getResultSetValue(rs, index);
}
```

```java
// spring-jdbc-4.3.25.RELEASE/org/springframework/jdbc/support/JdbcUtils.java:272-304
public static Object getResultSetValue(ResultSet rs, int index) throws SQLException {
    Object obj = rs.getObject(index);
    String className = null;
    if (obj != null) {
        className = obj.getClass().getName();
    }
    if (obj instanceof Blob) {
        Blob blob = (Blob) obj;
        obj = blob.getBytes(1, (int) blob.length());
    }
    else if (obj instanceof Clob) {
        Clob clob = (Clob) obj;
        obj = clob.getSubString(1, (int) clob.length());
    }
    else if ("oracle.sql.TIMESTAMP".equals(className) || "oracle.sql.TIMESTAMPTZ".equals(className)) {
        obj = rs.getTimestamp(index);
    }
    else if (className != null && className.startsWith("oracle.sql.DATE")) {
        String metaDataClassName = rs.getMetaData().getColumnClassName(index);
        if ("java.sql.Timestamp".equals(metaDataClassName) || "oracle.sql.TIMESTAMP".equals(metaDataClassName)) {
            obj = rs.getTimestamp(index);
        }
        else {
            obj = rs.getDate(index);
        }
    }
    else if (obj instanceof java.sql.Date) {
        if ("java.sql.Timestamp".equals(rs.getMetaData().getColumnClassName(index))) {
            obj = rs.getTimestamp(index);
        }
    }
    return obj;
}
```

### PostgreSQL

PostgreSQL 也是连接串参数。`socketFactory` 指到 Spring 的 `ClassPathXmlApplicationContext`，`socketFactoryArg` 指向可访问的XML，建连时 Spring 会把 XML 拉下来创建 Bean，然后 Bean 里用 `ScriptEngineManager` 拿 Nashorn 去 `eval`。

## 0x03 /datasource/previewData

看 previewData 方法，`sql` 来自请求，连接来自 `buildConnection`，然后 `queryForList`。

```java
// ureport2-console/src/main/java/com/bstek/ureport/console/designer/DatasourceServletAction.java:221-236
public void previewData(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
    String sql = req.getParameter("sql");
    String parameters = req.getParameter("parameters");
    Map<String, Object> map = buildParameters(parameters);
    sql = parseSql(sql, map);
    Connection conn = null;
    try {
        conn = buildConnection(req);
        List<Map<String, Object>> list = null;
        if (ProcedureUtils.isProcedure(sql)) {
            list = ProcedureUtils.procedureQuery(sql, map, conn);
        } else {
            DataSource dataSource = new SingleConnectionDataSource(conn, false);
            NamedParameterJdbcTemplate jdbc = new NamedParameterJdbcTemplate(dataSource);
            list = jdbc.queryForList(sql, map);
        }
```

`type=jdbc` 时驱动、连接串、账号都从参数来，这里就是 sink。

```java
// ureport2-console/src/main/java/com/bstek/ureport/console/designer/DatasourceServletAction.java:376-386
private Connection buildConnection(HttpServletRequest req) throws Exception {
    String type = req.getParameter("type");
    if (type.equals("jdbc")) {
        String username = req.getParameter("username");
        String password = req.getParameter("password");
        String driver = req.getParameter("driver");
        String url = req.getParameter("url");
        Class.forName(driver);
        Connection conn = DriverManager.getConnection(url, username, password);
        return conn;
```

除了常规的三种驱动 JDBC 利用外，MySQL 这条还存在版本差异。网上公开的利用大多停留在 8.0.19 及以前的拦截器路径。UReport 的 previewData 会调用 Spring 的 queryForList，因此 8.0.20 之后拦截器失效时，仍能通过这条查询触发反序列化，一直可用到 8.1.0。

## 0x04 /datasource/testConnection

看 testConnection 方法，没有 SQL，只建连，失败信息写进 JSON。

```java
// ureport2-console/src/main/java/com/bstek/ureport/console/designer/DatasourceServletAction.java:311-334
public void testConnection(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
    String username = req.getParameter("username");
    String password = req.getParameter("password");
    String driver = req.getParameter("driver");
    String url = req.getParameter("url");
    Connection conn = null;
    Map<String, Object> map = new HashMap<String, Object>();
    try {
        Class.forName(driver);
        conn = DriverManager.getConnection(url, username, password);
        map.put("result", true);
    } catch (Exception ex) {
        map.put("error", ex.toString());
        map.put("result", false);
    } finally {
        if (conn != null) {
            try {
                conn.close();
            } catch (SQLException e) {
                e.printStackTrace();
            }
        }
    }
    writeObjectToJson(resp, map);
}
```

参数和 `buildConnection` 是同一组，sink 仍是 `Class.forName` 加 `getConnection`，只是没有后面的查询，所以 MySQL 只能打拦截器还在 `getObject` 的版本。

## 0x05 /designer/savePreviewData

看到 savePreviewData 方法，`content` 整份解析成报表定义，放进 session，key 是 `p`。

```java
// ureport2-console/src/main/java/com/bstek/ureport/console/designer/DesignerServletAction.java:119-127
public void savePreviewData(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
    String content = req.getParameter("content");
    content = decodeContent(content);
    InputStream inputStream = IOUtils.toInputStream(content, "utf-8");
    ReportDefinition reportDef = reportParser.parse(inputStream, "p");
    reportRender.rebuildReportDefinition(reportDef);
    IOUtils.closeQuietly(inputStream);
    TempObjectCache.putObject(PREVIEW_KEY, reportDef);
}
```

解析到 `type="jdbc"` 时，属性原样写进 `JdbcDatasourceDefinition`，`driver` 和 `url` 从这里开始变成对象字段。

```java
// ureport2-core/src/main/java/com/bstek/ureport/parser/impl/DatasourceParser.java:43-52
public DatasourceDefinition parse(Element element) {
    String type = element.attributeValue("type");
    if (type.equals("jdbc")) {
        JdbcDatasourceDefinition ds = new JdbcDatasourceDefinition();
        ds.setName(element.attributeValue("name"));
        ds.setDriver(element.attributeValue("driver"));
        ds.setUrl(element.attributeValue("url"));
        ds.setUsername(element.attributeValue("username"));
        ds.setPassword(element.attributeValue("password"));
        ds.setDatasets(parseDatasets(element));
```

预览 `/ureport/preview` 时 `_u=p`，从 session 取出上面这份定义。`ReportBuilder.buildDatasets` 碰到 JDBC 数据源，调用 `JdbcDatasourceDefinition.buildDatasets`。

```java
// ureport2-core/src/main/java/com/bstek/ureport/build/ReportBuilder.java:126-135
for (DatasourceDefinition dsDef : datasources) {
    if (dsDef instanceof JdbcDatasourceDefinition) {
        String dsName = dsDef.getName();
        Connection conn = null;
        try {
            if (datasourceProviderMap.containsKey(dsName)) {
                conn = datasourceProviderMap.get(dsName).getConnection();
            }
            JdbcDatasourceDefinition ds = (JdbcDatasourceDefinition) dsDef;
            List<Dataset> ls = ds.buildDatasets(conn, parameters);
```

这里的 `conn` 一般是空的，所以会先 `getConnection`，用 XML 里的 `driver` 和 `url` 把连接建出来。

```java
// ureport2-core/src/main/java/com/bstek/ureport/definition/datasource/JdbcDatasourceDefinition.java:42-68
public List<Dataset> buildDatasets(Connection conn, Map<String, Object> parameters) {
    if (datasets == null || datasets.size() == 0) {
        return null;
    }
    if (conn == null) conn = getConnection();
    List<Dataset> list = new ArrayList<Dataset>();
    try {
        for (DatasetDefinition dsDef : datasets) {
            SqlDatasetDefinition sqlDataset = (SqlDatasetDefinition) dsDef;
            Dataset ds = sqlDataset.buildDataset(parameters, conn);
            list.add(ds);
        }
    } finally {
        try {
            conn.close();
        } catch (SQLException e) {
            throw new ReportComputeException(e);
        }
    }
    return list;
}

private Connection getConnection() {
    try {
        Class.forName(driver);
        Connection conn = DriverManager.getConnection(url, username, password);
        return conn;
    } catch (Exception e) {
        throw new ReportComputeException(e);
    }
}
```

`buildDatasets` 里对每个数据集调用 `SqlDatasetDefinition.buildDataset`，`queryForList` 就是在这个方法里调用的。

```java
// ureport2-core/src/main/java/com/bstek/ureport/definition/dataset/SqlDatasetDefinition.java:50-76
public Dataset buildDataset(Map<String, Object> parameterMap, Connection conn) {
    String sqlForUse = sql;
    Context context = new Context(null, parameterMap);
    if (sqlExpression != null) {
        sqlForUse = executeSqlExpr(sqlExpression, context);
    } else {
        Pattern pattern = Pattern.compile("\\$\\{.*?\\}");
        Matcher matcher = pattern.matcher(sqlForUse);
        while (matcher.find()) {
            String substr = matcher.group();
            String sqlExpr = substr.substring(2, substr.length() - 1);
            Expression expr = ExpressionUtils.parseExpression(sqlExpr);
            String result = executeSqlExpr(expr, context);
            sqlForUse = sqlForUse.replace(substr, result);
        }
    }
    Utils.logToConsole("RUNTIME SQL:" + sqlForUse);
    Map<String, Object> pmap = buildParameters(parameterMap);
    if (ProcedureUtils.isProcedure(sqlForUse)) {
        List<Map<String, Object>> result = ProcedureUtils.procedureQuery(sqlForUse, pmap, conn);
        return new Dataset(name, result);
    }
    SingleConnectionDataSource datasource = new SingleConnectionDataSource(conn, false);
    NamedParameterJdbcTemplate jdbcTemplate = new NamedParameterJdbcTemplate(datasource);
    List<Map<String, Object>> list = jdbcTemplate.queryForList(sqlForUse, pmap);
    return new Dataset(name, list);
}
```

所以这个也是能打高版本 MySQL 的。

## 0x06 /designer/saveReportFile

```java
// ureport2-console/src/main/java/com/bstek/ureport/console/designer/DesignerServletAction.java:165-180
public void saveReportFile(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
    String file = req.getParameter("file");
    file = ReportUtils.decodeFileName(file);
    String content = req.getParameter("content");
    content = decodeContent(content);
    ReportProvider targetReportProvider = null;
    for (ReportProvider provider : reportProviders) {
        if (file.startsWith(provider.getPrefix())) {
            targetReportProvider = provider;
            break;
        }
    }
    if (targetReportProvider == null) {
        throw new ReportDesignException("File [" + file + "] not found available report provider.");
    }
    targetReportProvider.saveReport(file, content);
```

文件系统这个实现的前缀是 `file:`，去掉前缀后拼到 `fileStoreDir` 上，默认目录是网站根下的 `/WEB-INF/ureportfiles`，无路径防护。

```java
// ureport2-core/src/main/java/com/bstek/ureport/provider/report/file/FileReportProvider.java:99-107
public void saveReport(String file, String content) {
    if (file.startsWith(prefix)) {
        file = file.substring(prefix.length(), file.length());
    }
    String fullPath = fileStoreDir + "/" + file;
    FileOutputStream outStream = null;
    try {
        outStream = new FileOutputStream(new File(fullPath));
        IOUtils.write(content, outStream, "utf-8");
```

所以`file:../../gz.jsp` 会落到网站根目录，JSP 里再 `defineClass` 把 Filter 注册进当前 Web 应用。
