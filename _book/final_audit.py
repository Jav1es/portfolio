# -*- coding: utf-8 -*-
"""成品 PDF 终检：书签 + 口径扫描 + 乱码探测。"""
import re
import sys
from pathlib import Path

import pymupdf

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

FINAL = Path(r"D:\Jav1e Flies\portfolio-publish\_book\黄家辉_AI数字化落地作品集.pdf")
doc = pymupdf.open(FINAL)

print("== 页数 ==", doc.page_count)

print("\n== 书签 ==")
for lvl, title, pg in doc.get_toc():
    print(f"  L{lvl} p{pg:>2} {title}")

print("\n== 口径扫描 ==")
full = "\n".join(p.get_text("text") for p in doc)
flat = full.replace("\n", "").replace(" ", "")

# 禁止出现的写法
forbidden = {
    "95+": "服务企业禁写 95+",
    "40%+": "提效禁写 40%+（应为 约 40%）",
    "6年": "工作年限禁写 6 年",
    "13-17K": "薪资禁写区间",
}
viol = False
for pat, why in forbidden.items():
    hits = [m.start() for m in re.finditer(re.escape(pat), flat)]
    if hits:
        viol = True
        for h in hits[:5]:
            print(f"  ❌ [{pat}] {why}  上下文: …{flat[max(0,h-25):h+30]}…")
if not viol:
    print("  ✅ 无禁用写法")

# 必须出现的口径
required = ["5 年+", "300+", "100+", "24 家（含复审）", "约 40%", "200+"]
for r in required:
    print(f"  {'✅' if r.replace(' ','') in flat else '❌'} 必含: {r}")

# 乱码探测（ tofu / 字体缺失方块一般显示为 U+FFFD 或 .notdef 不可提取，检查替换符）
bad = full.count("\ufffd")
print(f"\n== 乱码(U+FFFD) ==", bad)

doc.close()
