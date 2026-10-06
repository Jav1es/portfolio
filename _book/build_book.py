# -*- coding: utf-8 -*-
"""书籍 PDF 两遍构建：
Pass1: Edge 渲染 → pymupdf 找章节起始页
Pass2: 把页码写进目录 HTML → 重渲染 → reportlab 叠加页脚页码 + PDF 书签
"""
import io
import json
import re
import subprocess
import sys
from pathlib import Path

import pymupdf
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

# 注册中文字体（微软雅黑）
_YAHEI = r"C:\Windows\Fonts\msyh.ttc"
if Path(_YAHEI).exists():
    pdfmetrics.registerFont(TTFont("YaHei", _YAHEI, subfontIndex=0))
    CJK_FONT = "YaHei"
else:  # 兜底
    CJK_FONT = "Helvetica"

BOOK_DIR = Path(r"D:\Jav1e Flies\00-工作区\portfolio-publish\_book")
HTML = BOOK_DIR / "portfolio-book.html"
TMP_HTML = BOOK_DIR / "portfolio-book.print.html"
PASS1 = BOOK_DIR / "_pass1.pdf"
FINAL = BOOK_DIR / "黄家辉_AI数字化落地作品集.pdf"
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

# 章节锚点 → (书签文本, 目录页元素 id, 页脚显示文本)
CHAPTERS = [
    ("ch1", "第一章 · 关于我", "关于我"),
    ("ch2", "第二章 · 核心亮点", "核心亮点"),
    ("ch3", "第三章 · 目标岗位与能力组合", "目标岗位与能力组合"),
    ("ch4", "第四章 · FDE 前线部署能力", "FDE 前线部署能力"),
    ("ch5", "第五章 · 作品集模块（17 个）", "作品集模块"),
    ("m01", "模块 01 · AI 工具体系 0-1 搭建规划包", "模块 01"),
    ("m02", "模块 02 · AI 工作流落地标杆 A", "模块 02"),
    ("m03", "模块 03 · AI 工作流落地标杆 B", "模块 03"),
    ("m04", "模块 04 · 企业级智能体系统 enterprise-agent", "模块 04"),
    ("m05", "模块 05 · 业务数据库与数据监测报告", "模块 05"),
    ("m06", "模块 06 · RAG 知识库 Demo", "模块 06"),
    ("m07", "模块 07 · AI 评测与可观测性", "模块 07"),
    ("m08", "模块 08 · 办公流程自动化", "模块 08"),
    ("m09", "模块 09 · Prompt 工程与评测体系", "模块 09"),
    ("m10", "模块 10 · 培训 / SOP / 推广运营包", "模块 10"),
    ("m11", "模块 11 · 技术底座与运维证据", "模块 11"),
    ("m12", "模块 12 · 项目复盘与量化数据报告", "模块 12"),
    ("m13", "模块 13 · MCP Server 三件套（开源）", "模块 13"),
    ("m14", "模块 14 · dsh-bridge（开源）", "模块 14"),
    ("m15", "模块 15 · DSH 本机插件三件套（开源）", "模块 15"),
    ("m16", "模块 16 · DSH 运维工具箱（开源）", "模块 16"),
    ("m17", "模块 17 · 知识指南检索规程（开源）", "模块 17"),
    ("m15", "模块 15 · DSH 本机插件三件套（开源）", "模块 15"),
    ("m16", "模块 16 · DSH 运维工具箱（开源）", "模块 16"),
    ("m17", "模块 17 · 知识指南检索规程（开源）", "模块 17"),
    ("m15", "模块 15 · DSH 本机插件三件套（开源）", "模块 15"),
    ("m16", "模块 16 · DSH 运维工具箱（开源）", "模块 16"),
    ("m17", "模块 17 · 知识指南检索规程（开源）", "模块 17"),
    ("m15", "模块 15 · DSH 本机插件三件套（开源）", "模块 15"),
    ("m16", "模块 16 · DSH 运维工具箱（开源）", "模块 16"),
    ("m17", "模块 17 · 知识指南检索规程（开源）", "模块 17"),
    ("m15", "模块 15 · DSH 本机插件三件套（开源）", "模块 15"),
    ("m16", "模块 16 · DSH 运维工具箱（开源）", "模块 16"),
    ("m17", "模块 17 · 知识指南检索规程（开源）", "模块 17"),
    ("ch6", "第六章 · 行业定制规划能力 · 行业定制样本", "行业定制样本"),
    ("ch7", "第七章 · 现场可演示清单", "现场可演示清单"),
    ("ch8", "第八章 · 诚信说明与口径", "诚信说明与口径"),
]

# 目录中 a.t 的文本（与 HTML 里一致）→ 用于定位注入点
TOC_TEXT = {
    "ch1": "第一章 · 关于我",
    "ch2": "第二章 · 核心亮点",
    "ch3": "第三章 · 目标岗位与能力组合",
    "ch4": "第四章 · FDE 前线部署能力",
    "ch5": "第五章 · 作品集模块（17 个）",
    "m01": "AI 工具体系 0-1 搭建规划包",
    "m02": "AI 工作流落地标杆 A：企业智能问答与申报文档 AIGC",
    "m03": "AI 工作流落地标杆 B：财务 / 行政 / 外贸跟单",
    "m04": "企业级智能体系统 enterprise-agent",
    "m05": "业务数据库与数据监测报告（SQL + BI/ChatBI）",
    "m06": "RAG 知识库 Demo（真实带数据演示）",
    "m07": "AI 评测与可观测性（CI 回归 + OTel/Jaeger）",
    "m08": "办公流程自动化（Open Claw + Python）",
    "m09": "Prompt 工程与评测体系",
    "m10": "培训 / SOP / 推广运营包",
    "m11": "技术底座与运维证据",
    "m12": "项目复盘与量化数据报告",
    "m13": "企业级智能体 MCP Server 三件套（开源）",
    "m14": "dsh-bridge：让 Marvis 调用本机 DSH（开源）",
    "m15": "DeepSeek Harness 本机插件三件套（开源）",
    "m16": "DSH 运维工具箱：升级自检 / 插件兼容预检 / 生态全量调研（开源）",
    "m17": "知识指南：把「先检索再作答」写成可复用的规程（开源）",
    "m15": "DeepSeek Harness 本机插件三件套（开源）",
    "m16": "DSH 运维工具箱：升级自检 / 插件兼容预检 / 生态全量调研（开源）",
    "m17": "知识指南：把「先检索再作答」写成可复用的规程（开源）",
    "m15": "DeepSeek Harness 本机插件三件套（开源）",
    "m16": "DSH 运维工具箱：升级自检 / 插件兼容预检 / 生态全量调研（开源）",
    "m17": "知识指南：把「先检索再作答」写成可复用的规程（开源）",
    "m15": "DeepSeek Harness 本机插件三件套（开源）",
    "m16": "DSH 运维工具箱：升级自检 / 插件兼容预检 / 生态全量调研（开源）",
    "m17": "知识指南：把「先检索再作答」写成可复用的规程（开源）",
    "m15": "DeepSeek Harness 本机插件三件套（开源）",
    "m16": "DSH 运维工具箱：升级自检 / 插件兼容预检 / 生态全量调研（开源）",
    "m17": "知识指南：把「先检索再作答」写成可复用的规程（开源）",
    "ch6": "第六章 · 行业定制规划能力 · 行业定制样本",
    "ch7": "第七章 · 现场可演示清单",
    "ch8": "第八章 · 诚信说明与口径",
}


def run_edge(src: Path, dst: Path) -> None:
    uri = "file:///" + str(src).replace("\\", "/")
    if dst.exists():
        dst.unlink()
    # 本机 Edge 有常驻进程，headless 必须用独立 user-data-dir 隔离，
    # 否则报 "Multiple targets are not supported in headless mode" 并挂到超时。
    ud = BOOK_DIR / f"_edge_profile_{src.stem}"
    subprocess.run(
        [EDGE, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
         "--no-margins", f"--user-data-dir={ud}", "--virtual-time-budget=20000",
         "--print-to-pdf=" + str(dst), uri],
        check=True, capture_output=True, timeout=180,
    )
    assert dst.exists(), f"Edge 未产出 {dst}"


def find_chapter_pages(pdf_path: Path) -> dict[str, int]:
    """用 pymupdf 逐页搜章节标题，返回锚点 → 1-based 页码。"""
    doc = pymupdf.open(pdf_path)
    pages: dict[str, int] = {}
    # 每个锚点用一个只在对应章节标题出现的特征串
    probes = {
        "ch1": "软考中级，信息系统项目管理师备考中",
        "ch2": "六维能力，一张表看清",
        "ch3": "针对不同目标岗位",
        "ch4": "深入一线、端到端交付",
        "ch5": "每个模块含：业务痛点",
        "m01": "300+项目可研立项练出来的规划",
        "m02": "效率翻倍、可迁到任意业务",
        "m03": "能把财务和技术口径拉齐",
        "m04": "Docker一键本地起服务",
        "m05": "帮团队砍掉40%以上重复活",
        "m06": "离线可跑、指标可量化",
        "m07": "一次请求一条链、每阶段耗时可见",
        "m08": "稳且可维护",
        "m09": "把抽卡变成可校验、可复现的生产线",
        "m10": "这就是FDE打通最后一公里",
        "m11": "让系统在客户现场也跑得住",
        "m12": "就是这么量化出来的",
        "m13": "我不只会用工具，还会造工具",
        "m14": "零依赖、可复现、CI 全绿",
        "m15": "工具链缺什么就得等官方排期",
        "m16": "一次升级把已装插件静默打废",
        "m17": "最大的坑不是答不好，是凭记忆编",
        "m15": "工具链缺什么就得等官方排期",
        "m16": "一次升级把已装插件静默打废",
        "m17": "最大的坑不是答不好，是凭记忆编",
        "m15": "工具链缺什么就得等官方排期",
        "m16": "一次升级把已装插件静默打废",
        "m17": "最大的坑不是答不好，是凭记忆编",
        "m15": "工具链缺什么就得等官方排期",
        "m16": "一次升级把已装插件静默打废",
        "m17": "最大的坑不是答不好，是凭记忆编",
        "m15": "工具链缺什么就得等官方排期",
        "m16": "一次升级把已装插件静默打废",
        "m17": "最大的坑不是答不好，是凭记忆编",
        "ch6": "体系化思维 + 行业理解 + 信息化蓝图",
        "ch7": "证明「能落地、跑得起来」",
        "ch8": "各模块「证明链接」多为本人制作的实物材料",
    }
    texts = [p.get_text("text") for p in doc]
    for anchor, probe in probes.items():
        for i, t in enumerate(texts):
            if probe in t.replace(" ", "").replace("\n", "") or probe in t:
                pages[anchor] = i + 1  # 1-based
                break
    doc.close()
    return pages


def inject_toc(pages: dict[str, int]) -> None:
    """把页码写进目录 <span class="pg">，并生成本次打印用的临时 HTML。"""
    html = HTML.read_text(encoding="utf-8")
    for anchor, pg in pages.items():
        t = TOC_TEXT[anchor]
        # 定位目录项：<a class="t" href="#chX">文本</a><span class="dots"></span><span class="pg"></span>
        pat = re.compile(
            r'(<a class="t" href="#' + anchor + r'">' + re.escape(t) +
            r'</a><span class="dots"></span><span class="pg">)(</span>)'
        )
        html, n = pat.subn(r"\g<1>" + str(pg) + r"\g<2>", html)
        if n != 1:
            print(f"WARN: TOC 注入 {anchor} 命中 {n} 次", file=sys.stderr)
    TMP_HTML.write_text(html, encoding="utf-8")


def overlay_and_outline(pages: dict[str, int]) -> None:
    """reportlab 生成页脚（页码）+ 章节页眉 + 叠加，再写 PDF 书签。"""
    doc = pymupdf.open(PASS1)
    n = doc.page_count
    doc.close()
    W, H = A4  # 595.27 x 841.89 pt

    # 章节锚点 → 页脚标签
    label_of = {a: lbl for a, _bm, lbl in CHAPTERS}
    starts = sorted(((p, a) for a, p in pages.items()), key=lambda x: x[0])
    footer_skip = {1}          # 封面不加页码
    header_skip = {1, 2}       # 封面/目录不加章节页眉

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    for i in range(1, n + 1):
        if i not in footer_skip:
            c.setFont(CJK_FONT, 8.5)
            c.setFillColorRGB(0.42, 0.47, 0.55)
            c.drawCentredString(W / 2, 24, str(i))
        if i not in header_skip:
            cur = ""
            for p, a in starts:
                if p <= i:
                    cur = a
            label = label_of.get(cur, "")
            if label:
                c.setFont(CJK_FONT, 8.5)
                c.setFillColorRGB(0.42, 0.47, 0.55)
                c.drawCentredString(W / 2, H - 26, label)
        c.showPage()
    c.save()
    buf.seek(0)

    stamp = pymupdf.open(stream=buf.read(), filetype="pdf")
    out = pymupdf.open(PASS1)
    for i in range(out.page_count):
        page = out[i]
        page.show_pdf_page(page.rect, stamp, i, overlay=True)
    # 书签（页码用叠加前的同一映射）
    toc = [[1, "封面", 1], [1, "目录", 2]]
    for anchor, bm, _lbl in CHAPTERS:
        if anchor in pages:
            toc.append([1, bm, pages[anchor]])
    out.set_toc(toc)
    out.save(FINAL, garbage=3, deflate=True)
    out.close()
    stamp.close()


def main() -> None:
    # Pass 1
    run_edge(HTML, PASS1)
    pages = find_chapter_pages(PASS1)
    missing = [a for a, _t, _l in CHAPTERS if a not in pages]
    if missing:
        print(f"FATAL: 未定位到章节 {missing}", file=sys.stderr)
        sys.exit(2)
    print(json.dumps(pages, ensure_ascii=False))
    # TOC 注入 + Pass 2
    inject_toc(pages)
    run_edge(TMP_HTML, PASS1)
    # 页码再次校验（重渲染后页码可能因 TOC 变长漂移——若 TOC 从 1 页变 2 页需迭代）
    pages2 = find_chapter_pages(PASS1)
    if pages2 != pages:
        print("页码漂移，迭代注入…", file=sys.stderr)
        inject_toc(pages2)
        run_edge(TMP_HTML, PASS1)
        pages2 = find_chapter_pages(PASS1)
        if pages2 != pages:
            print("二次迭代仍有漂移，采用 pages2", file=sys.stderr)
    # 叠加页脚/页眉 + 书签
    overlay_and_outline(pages2)
    doc = pymupdf.open(FINAL)
    print(f"FINAL: {FINAL.name} pages={doc.page_count} size={FINAL.stat().st_size/1024:.0f}KB")
    doc.close()


if __name__ == "__main__":
    main()
