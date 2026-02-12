import re
import argparse
from pathlib import Path

def find_max_used_index(text, folder, ext):
    no_prefix = folder.strip() in (".", "./")
    if no_prefix:
        pat = re.compile(r"!\[[^\]]*\]\((?:\./)?([0-9]+)\." + re.escape(ext) + r"\)")
    else:
        pat = re.compile(r"!\[[^\]]*\]\(" + re.escape(folder.rstrip('/')) + r"/([0-9]+)\." + re.escape(ext) + r"\)")
    max_idx = -1
    for m in pat.finditer(text):
        i = int(m.group(1))
        if i > max_idx:
            max_idx = i
    return max_idx

def replace_feishu_images(text, folder, start, end, alt, ext):
    remote_img_pat = re.compile(r"!\[[^\]]*\]\((https://[^)]*)\)")
    idx = start
    limit = end if end is not None else None
    no_prefix = folder.strip() in (".", "./")

    def repl(_):
        nonlocal idx
        if limit is not None and idx > limit:
            return _.group(0)
        if no_prefix:
            s = f"![{alt}]({idx}.{ext})"
        else:
            s = f"![{alt}]({folder.rstrip('/')}/{idx}.{ext})"
        idx += 1
        return s

    return remote_img_pat.sub(repl, text)

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--md', required=True)
    p.add_argument('--folder', required=True)
    p.add_argument('--start', type=int)
    p.add_argument('--end', type=int)
    p.add_argument('--alt', default='img')
    p.add_argument('--ext', default='png')
    p.add_argument('--dry', action='store_true')
    args = p.parse_args()

    md_path = Path(args.md)
    text = md_path.read_text(encoding='utf-8')

    start = args.start
    if start is None:
        max_used = find_max_used_index(text, args.folder, args.ext)
        start = max_used + 1 if max_used >= 0 else 0

    new_text = replace_feishu_images(text, args.folder, start, args.end, args.alt, args.ext)

    if args.dry:
        print(new_text)
    else:
        md_path.write_text(new_text, encoding='utf-8')

if __name__ == '__main__':
    main()
    
    
# python exp.py --md index.md --folder . --start 1 --end 3 --ext png