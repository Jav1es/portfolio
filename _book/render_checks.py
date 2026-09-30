# -*- coding: utf-8 -*-
"""栅格化成品 PDF 关键页做目检。"""
import sys
from pathlib import Path

import pymupdf

FINAL = Path(r"D:\Jav1e Flies\portfolio-publish\_book\黄家辉_AI数字化落地作品集.pdf")
OUT = FINAL.parent

doc = pymupdf.open(FINAL)
targets = [1, 2, 3, 8, 16, 42]  # 1-based：封面/目录/第一章/第五章总览/模块04/末章
for p in targets:
    if p > doc.page_count:
        continue
    page = doc[p - 1]
    pix = page.get_pixmap(dpi=110)
    dst = OUT / f"_chk_p{p:02d}.png"
    pix.save(dst)
    print(f"saved {dst.name} {pix.width}x{pix.height}")
doc.close()
