import sys,yaml
from pypinyin import lazy_pinyin
p=sys.argv[1]if len(sys.argv)>1 else"_data/links.yml"
d=yaml.safe_load(open(p,encoding="utf-8"))
e=lambda s:(s or"").replace("|",r"\|").strip()
k=lambda n:(1,s)if(s:=''.join(lazy_pinyin((n or"").strip())).lower())[0].isdigit()else(0,s)
print("| Group | Name | Link |\n| --- | --- | --- |")
for b in d or[]:
    g=e(b.get("links_category",""));f=1
    for i in sorted(b.get("list",[]),key=lambda x:k(x.get("name",""))):
        print(f"| {g if f else''} | {e(i.get('name',''))} | {e(i.get('link',''))} |");f=0
