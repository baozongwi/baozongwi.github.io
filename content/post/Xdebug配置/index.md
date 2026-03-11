+++
title = "Xdebug配置"
slug = "xdebug-configuration"
description = "debug，世界之钥"
date = "2024-12-05T12:18:08"
lastmod = "2024-12-05T12:18:08"
image = ""
license = ""
categories = ["talk"]
tags = ["工具"]
+++

# 0x01 

随着问题逐渐变复杂，发现debug才是世界硬通货，而刚好可以写一个，毕竟折磨了自己很久

# 0x02 

首先这里是VSCODE+小皮+xdebug

## vscode

首先这里先安装小皮一路战到底即可

[小皮](https://www.xp.cn/php-study)进去选择64位的就可以了，看了一下使用说明唯一的就是说不能使用有空格路径或者是中文路径，这里选择一个比较大的盘(不知道自己以后会建多少个站)，然后安转即可，一路站到底除了路径

![1](QQ20241208-145937.jpg)

安装好之后打开nginx，打开浏览器输入127.0.0.1，看看是否会成功

![1](QQ20241208-150444.jpg)

最简单的东西就安装好了，然后随便安装一个php这里选择php7.4.3，把Xdebug调试组件弄上，但是有可能这样子不能保证有`xdebug.dll`，所以我们要去Xdebug官网上面自己安装一下，同时打开`php.ini`

![1](QQ20241208-150750.jpg)

```ini
[Xdebug]
xdebug.remote_autostart=1
zend_extension=D:/PHPstudy/phpstudy_pro/Extensions/php/php7.4.3nts/ext/php_xdebug.dll
xdebug.collect_params=1
xdebug.collect_return=1
xdebug.auto_trace=Off
xdebug.trace_output_dir=D:/PHPstudy/phpstudy_pro/Extensions/php_log/php7.4.3nts.xdebug.trace
xdebug.profiler_enable=Off
xdebug.profiler_output_dir="D:\PHPstudy\phpstudy_pro\Extensions\tmp\xdebug"
xdebug.remote_enable=On
xdebug.remote_host=localhost
xdebug.remote_port=9000
xdebug.remote_handler=dbgp
```

其实复制上去就可以但是要注意这个端口要与刚才在小皮中的一致，并且Xdebug组件存在，如果报错说**不存在**，那么先写一个

```php
<?php phpinfo();
```

然后访问网页

![1](QQ20241208-151049.jpg)

全部复制下来，拿到网站[xdebug](https://xdebug.org/wizard)

放进去然后下载组件即可

![1](QQ20241208-151146.jpg)

下载好之后把这个东西放在我们刚才ini里面的路径

![1](QQ20241208-151322.jpg)

那么现在我们转战VSCODE，下载一个拓展

![1](QQ20241208-151458.jpg)

下载好之后打开设置，搜索php，然后我们再选择**PHP Debug**

进入settings.json增加一项

```json
"php.validate.executablePath": "D:\\PHPstudy\\phpstudy_pro\\Extensions\\php\\php7.4.3nts\\php.exe",
"php.debug.executablePath": "D:\\PHPstudy\\phpstudy_pro\\Extensions\\php\\php7.4.3nts\\php.exe"
```

进入那个虫子一样的按钮选择Xdebug然后打开`launch.json`

```json
{
    // 使用 IntelliSense 了解相关属性。 
    // 悬停以查看现有属性的描述。
    // 欲了解更多信息，请访问: https://go.microsoft.com/fwlink/?linkid=830387
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Launch built-in server and debug",
            "type": "php",
            "request": "launch",
            "runtimeArgs": [
                "-S",
                "localhost:8000",
                "-t",
                "."
            ],
            "port": 9000,
            "serverReadyAction": {
                "action": "openExternally"
            }
        },
        {
            "name": "Debug current script in console",
            "type": "php",
            "request": "launch",
            "program": "${file}",
            "cwd": "${fileDirname}",
            "externalConsole": false,
            "port": 9000
        },
        {
            "name": "Listen for Xdebug",
            "type": "php",
            "request": "launch",
            "port": 9000
        }
    ]
}
```

这里直接就配置好了，为了好玩一点这里放一个我当时经过Debug才做出的题目，

**2024强网杯password game**

```php
<?php
function filter($password){
    $filter_arr = array("admin","2024qwb");
    $filter = '/'.implode("|",$filter_arr).'/i';
    return preg_replace($filter,"nonono",$password);
}
class guest{
    public $username;
    public $value;
    public function __tostring(){
        if($this->username=="guest"){
            $value();
        }
        return $this->username;
    }
    public function __call($key,$value){
        if($this->username==md5($GLOBALS["flag"])){
            echo $GLOBALS["flag"];
        }
    }
}
class root{
    public $username;
    public $value;
    public function __get($key){
        if(strpos($this->username, "admin") == 0 && $this->value == "2024qwb"){
            $this->value = $GLOBALS["flag"];
            echo md5("hello:".$this->value);
        }
    }
}
class user{
    public $username;
    public $password;
    public $value;
    public function __invoke(){
        $this->username=md5($GLOBALS["flag"]);
        return $this->password->guess();
    }
    public function __destruct(){
        if(strpos($this->username, "admin") == 0 ){
            echo "hello".$this->username;
        }
    }
}
$user=unserialize(filter($_POST["password"]));
if(strpos($user->username, "admin") == 0 && $user->password == "2024qwb"){
    echo "hello!";
}
```

那么其实我们用这个东西的话更好的还是为了调试整体框架这里以最优美的CTFshow为例子，先下载一个工具

[composer](https://getcomposer.org/Composer-Setup.exe)  下载好了之后，本地打开终端看看

```shell
composer -v
```

安装好之后再新建一个网站，在其中根目录文件夹里面新建一个composer.json

```json
composer require topthink/thinkphp:3.2.3
```

我们这里再把网站的根目录选择成thinkphp的即可，这里把其中控制器的代码切换为

```php
<?php
namespace Home\Controller;

use Think\Controller;

class IndexController extends Controller {
    public function index($n=''){
        $this->show('<style type="text/css">*{ padding: 0; margin: 0; } div{ padding: 4px 48px;} body{ background: #fff; font-family: "微软雅黑"; color: #333;font-size:24px} h1{ font-size: 100px; font-weight: normal; margin-bottom: 12px; } p{ line-height: 1.8em; font-size: 36px } a,a:hover{color:blue;}</style><div style="padding: 24px 48px;"> <h1>CTFshow</h1><p>thinkphp 专项训练</p><p>hello,'.$n.'黑客建立了控制器后门，你能找到吗</p>','utf-8');
    }

}
```

这里就要做个小科普了，之前我一直以为VSCODE是不能跟进的，其实是我不会用😋

![1](QQ20241208-170310.jpg)

这六个按钮，第一个是逐断点，第二个是逐过程(不跟进)，第三个是单步调试(跟进)，第四个是单步退出，第五个是重新连接，第六个是退出调试

那么接着我们调试这个框架，poc为

```
http://127.0.0.2/index.php/Home/Index/index/?n=<?php system("whoami");?>
```

首先进入到show方法之中然后进入view中的display，由于其中只有一个赋值的函数

![1](QQ20241208-171512.jpg)

所以我们跟进fetch即可，然后继续观察发现这里没有黑名单直接就把变量解析了，那么我们就猜就是这里的问题跟进即可，

![1](QQ20241208-171754.jpg)

我们会进入C方法，然后监视一下会发现是think

![1](QQ20241208-212633.jpg)

那么理论上来说，他就不会进入if而是来到了else，但是Ctfshow的题目是php，就直接RCE了，不过我们本地不是，所以走的else，这里跟进**Hook**::**listen** 到exec

![1](QQ20241208-211558.jpg)exec

![1](QQ20241208-213806.jpg)

那么下面应该是会到run，从run方法到这里面发现通过生成缓存文件名的方式来保存我们的`$content`(恶意代码)

![1](QQ20241208-215505.jpg)

![1](QQ20241208-214028.jpg)

再而会到**Storage**::**load** 通过include来载入缓存文件也就是我们的恶意代码，形成RCE

![1](QQ20241208-172702.jpg)

其中调试的过程中我发现经常进入function C

```php
function C($name = null, $value = null, $default = null)
{
    static $_config = array();
    // 无参数时获取所有
    if (empty($name)) {
        return $_config;
    }
    // 优先执行设置获取或赋值
    if (is_string($name)) {
        if (!strpos($name, '.')) {
            $name = strtoupper($name);
            if (is_null($value)) {
                return isset($_config[$name]) ? $_config[$name] : $default;
            }

            $_config[$name] = $value;
            return null;
        }
        // 二维数组设置和获取支持
        $name    = explode('.', $name);
        $name[0] = strtoupper($name[0]);
        if (is_null($value)) {
            return isset($_config[$name[0]][$name[1]]) ? $_config[$name[0]][$name[1]] : $default;
        }

        $_config[$name[0]][$name[1]] = $value;
        return null;
    }
    // 批量设置
    if (is_array($name)) {
        $_config = array_merge($_config, array_change_key_case($name, CASE_UPPER));
        return null;
    }
    return null; // 避免非法参数
}
```

而且一般都是从这里跳出

![1](QQ20241208-211800.jpg)

其实这个函数看着复杂，就是为了设置一些配置项，比如

```php
C(['DB' => ['HOST' => '127.0.0.1', 'USER' => 'root']]); // 批量设置数据库配置
C('DB.HOST', '127.0.0.1'); // 设置数据库主机为 '127.0.0.1'
$dbHost = C('DB.HOST', null, 'localhost'); // 获取数据库主机，如果不存在则返回 'localhost'
```

而一般`$_config` 是一个静态数组，用于存储配置项。所以一般的跳出都是从这里

## phpstorm

然后这个的话，其实就不用小皮了，相对方便一点，但是等我有空再写

---

OK，今天不想学习，那就来把这个写了，其实很简单后面发现，和之前知道的不同，同样需要进行小皮的配合，不然框架是进不了网页(会很麻烦)，那么就进入设置

![1](QQ20250123-191539.jpg)

设置于`ini`里面一样的端口，并且PHP设置也一定要和配置好Xdebug插件的版本一致，然后设置一个服务器，与phpstudy里面的一致，

![1](QQ20250123-191725.jpg)

端口和IP都要和小皮里面的一样，

![1](QQ20250123-191914.jpg)

添加PHP网页

![1](QQ20250220-115937.jpg)

点击`Validate`就可以验证

![1](QQ20250123-192209.jpg)

就可以成功进行调试了，记得一定要把监听给打开，然后在网页访问即可

![1](QQ20250123-192404.jpg)

## PyCharm

既然说了php的Xdebug，那顺便把python和Java的一起说说哈哈，毕竟动态调试确实是非常实用的

我们就以最为简单的SSTI常用程序，模版渲染来进行跟进吧

```python
from flask import Flask
from flask import request
from flask import render_template_string

app=Flask(__name__)

@app.route('/',methods=['GET','POST'])         
def index():
    template=''' 
    <p>Hello %s </p>'''%(request.args.get('name'))
    return render_template_string(template)      # 渲染为html内容

if __name__ == '__main__':          # 如果作为脚本运行，而不是被当成模块导入
    app.run(host='0.0.0.0',port=5000,debug=True)
```

其实环境都不用配置，不过有个注意点就是不要有中文路径也不要有空格那么开始，我们先不传参的情况下打一遍断点，**右键Debug程序，然后浏览器访问http://127.0.0.1:5000/**此时你的PyCharm就会变的红闪红闪的

我们这里慢慢看，先看request.rgs.get是怎么赋值的再看是怎么进行渲染的，到第二行进行跟进

![1](QQ20241217-200939.jpg)

`args` 是 `werkzeug.datastructures.ImmutableMultiDict` 的一个实例，代表了请求 URL 中的查询参数。所以跟进的预期我们应该是得到GET方法，跟进的结果也确实是这样

```python
    def __get__(self, instance: LocalProxy[t.Any], owner: type | None = None) -> t.Any:
        if instance is None:
            if self.class_value is not None:
                return self.class_value

            return self

        try:
            obj = instance._get_current_object()
        except RuntimeError:
            if self.fallback is None:
                raise

            fallback = self.fallback.__get__(instance, owner)

            if self.is_attr:
                # __class__ and __doc__ are attributes, not methods.
                # Call the fallback to get the value.
                return fallback()

            return fallback

        if self.bind_f is not None:
            return self.bind_f(instance, obj)

        return getattr(obj, self.name)
```

![1](QQ20241217-210336.jpg)

这里会进行一个obj的赋值

![1](QQ20241217-210445.jpg)

然后跳出再到bing_f函数

![1](QQ20241217-213131.jpg)

这个partial函数是一个调用函数的所以跳到`__get__`，然后利用`value = self.fget(obj)`来进行赋值

![1](QQ20241217-213614.jpg)

然后就是把值赋值给键的过程

![1](QQ20241217-214012.jpg)

![1](QQ20241217-213920.jpg)

然后跳出来进行`return rv`也就是我们在url传入的值，我们再看看模版渲染的部分

![1](QQ20241217-214542.jpg)

看到这里让我一下就想到了国城杯，其实

![1](QQ20241217-214644.jpg)

这玩意本质上就是`render_template_string`啊

![1](QQ20241217-214930.jpg)

一样的赋值方法不过这次是从这里进行赋值了，然后就是**返回value**的时候进行了跟进，首先是定义一个全局变量然后选一个cls再在里面进入

![1](QQ20241217-215312.jpg)

通过了_parse变成了下面的一段代码

![1](QQ20241217-220924.jpg)

![1](QQ20241217-220944.jpg)

```python
from jinja2.runtime import LoopContext, Macro, Markup, Namespace, TemplateNotFound, TemplateReference, TemplateRuntimeError, Undefined, escape, identity, internalcode, markup_join, missing, str_join
name = None

def root(context, missing=missing, environment=environment):
    resolve = context.resolve_or_missing
    undefined = environment.undefined
    concat = environment.concat
    cond_expr_undefined = Undefined
    if 0: yield None
    l_0_g = resolve('g')
    pass
    yield ' \n    <p>Hello '
    yield escape(context.call(environment.getattr(context.call(environment.getattr(context.call(environment.getitem(environment.getattr(environment.getattr(environment.getattr((undefined(name='g') if l_0_g is missing else l_0_g), 'pop'), '__globals__'), '__builtins__'), '__import__'), 'os'), 'popen'), 'whoami'), 'read')))
    yield ' </p>'

blocks = {}
debug_info = '2=13'
```

这里也就是在进行html的生成，当有权限时进行了命令执行

## idea

