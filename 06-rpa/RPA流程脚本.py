# -*- coding: utf-8 -*-
"""
RPA 自动化项目 · 典型流程示例脚本
====================================
演示链路：触发（定时/事件）→ RPA 机器人跨系统操作 → 数据汇总 → 异常告警 → 人工复核
覆盖场景：订单同步 / 库存对账 / 数据采集（含元素定位容错与失败重试）
说明：本脚本为可独立运行的示例骨架，真实环境由影刀 / 实在智能 / UiBot / 钉钉 RPA
      录制编排界面操作，Python 负责数据处理、规则校验与告警联动。
"""
import datetime
import json
import logging
import os
import random
import time

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("rpa_demo")

# ========== 配置区 ==========
CONFIG = {
    "source_dirs": {
        "order": "./data/orders",
        "inventory": "./data/inventory",
        "platform": "./data/platform",
    },
    "out_dir": "./output",
    "dingtalk_webhook": "https://oapi.dingtalk.com/robot/send?access_token=REPLACE_ME",
    "wecom_webhook": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=REPLACE_ME",
    "mail": {"smtp": "smtp.example.com", "to": ["ops@example.com"]},
    "max_retry": 3,
    "retry_interval": 5,  # 秒
}


# ========== 异常分类 ==========
class RPAException(Exception):
    """RPA 异常基类。"""

    LEVEL = "UNKNOWN"


class ElementNotFound(RPAException):
    """元素定位失败：界面变动、加载超时。"""

    LEVEL = "WARN"


class SystemUnavailable(RPAException):
    """目标系统不可用：网络中断、系统维护。"""

    LEVEL = "ERROR"


class DataInconsistent(RPAException):
    """数据不一致：对账差异、字段缺失。"""

    LEVEL = "ERROR"


# ========== 通用工具 ==========
def send_alert(channel, title, content):
    """异常告警：钉钉 / 企微 / 邮件，通道配置在 CONFIG。"""
    payload = {
        "channel": channel,
        "title": title,
        "content": content,
        "ts": datetime.datetime.now().isoformat(),
    }
    # 真实环境在此调用 webhook / SMTP 发送
    log.warning("[ALERT][%s] %s: %s", channel, title, content)
    return payload


def with_retry(func, max_retry=None, retry_interval=None):
    """失败重试：瞬态异常指数退避重试，达到上限后升级人工。"""
    max_retry = max_retry or CONFIG["max_retry"]
    retry_interval = retry_interval or CONFIG["retry_interval"]
    for attempt in range(1, max_retry + 1):
        try:
            return func()
        except SystemUnavailable as e:
            wait = retry_interval * (2 ** (attempt - 1))
            log.info("第 %s 次重试（等待 %ss）：%s", attempt, wait, e)
            if attempt < max_retry:
                time.sleep(wait)
            else:
                send_alert("dingtalk", "RPA 流程失败（已达重试上限）", str(e))
                raise
        except RPAException:
            raise


def find_element(driver, locator, timeout=10):
    """元素定位容错：先按首选策略定位，失败后切换备用策略。"""
    strategies = [
        {"by": "xpath", "value": locator.get("xpath")},
        {"by": "id", "value": locator.get("id")},
        {"by": "text", "value": locator.get("text")},
    ]
    last_err = None
    for s in strategies:
        if not s["value"]:
            continue
        try:
            # 真实环境为影刀 / UiBot 的 find 接口
            el = driver.find(s["by"], s["value"], timeout)
            log.info("元素定位成功：%s=%s", s["by"], s["value"])
            return el
        except Exception as e:  # noqa: BLE001
            last_err = e
            log.warning("元素定位失败 %s=%s：%s，切换备用策略", s["by"], s["value"], e)
    raise ElementNotFound(f"元素定位全部策略失败：{locator}（{last_err}）")


# ========== 流程 1：订单同步（定时触发） ==========
def sync_orders():
    """订单同步：拉取订单 → 清洗 → 写入汇总 → 告警异常订单。"""
    def _run():
        driver = MockDriver()
        find_element(driver, {"xpath": "//order/query", "id": "order_query"})
        raw = driver.query_orders(date=datetime.date.today())
        cleaned, abnormal = clean_orders(raw)
        save_json("dws_order_daily.json", cleaned)
        if abnormal:
            send_alert("wecom", "订单异常", f"共 {len(abnormal)} 条异常订单待人工复核")
        log.info("订单同步完成：正常 %s 条，异常 %s 条", len(cleaned), len(abnormal))
        return {"ok": len(cleaned), "abnormal": len(abnormal)}

    return with_retry(_run)


def clean_orders(rows):
    """数据清洗：必填校验、金额非负、去重。"""
    cleaned, abnormal = [], []
    seen = set()
    for r in rows:
        oid = r.get("order_id")
        if not oid or oid in seen or float(r.get("amount", 0)) < 0:
            abnormal.append(r)
            continue
        seen.add(oid)
        r["amount"] = round(float(r["amount"]), 2)
        cleaned.append(r)
    return cleaned, abnormal


# ========== 流程 2：库存对账（事件触发） ==========
def reconcile_inventory():
    """库存对账：平台库存 vs 仓库库存，差异写入异常表并告警。"""

    def _run():
        platform = load_json("platform_inventory.json")
        warehouse = load_json("warehouse_inventory.json")
        diffs = []
        for sku, p_qty in platform.items():
            w_qty = warehouse.get(sku, 0)
            if abs(p_qty - w_qty) > CONFIG.get("tolerance", 5):
                diffs.append({"sku": sku, "platform": p_qty, "warehouse": w_qty})
        save_json("inventory_diff.json", diffs)
        if diffs:
            send_alert("mail", "库存对账差异", f"发现 {len(diffs)} 个 SKU 差异，详见异常表")
        return {"diff_count": len(diffs)}

    return with_retry(_run)


# ========== 流程 3：多平台数据采集（定时触发） ==========
def collect_platform_data():
    """数据采集：多平台原始数据汇总入库。"""

    def _run():
        summary = {}
        for name, path in CONFIG["source_dirs"].items():
            if not os.path.isdir(path):
                raise SystemUnavailable(f"数据源目录不存在：{path}")
            files = [f for f in os.listdir(path) if f.endswith(".json")]
            summary[name] = {"files": len(files)}
        save_json("collect_summary.json", summary)
        return summary

    return with_retry(_run)


# ========== Mock 与工具 ==========
class MockDriver:
    """演示用驱动，真实环境替换为影刀 / 实在智能 / UiBot 控制器。"""

    def find(self, by, value, timeout=10):
        return {"by": by, "value": value}

    def query_orders(self, date):
        return [
            {"order_id": f"O{date:%Y%m%d}{i:04d}", "amount": random.randint(50, 2000)}
            for i in range(20)
        ]


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_json(name, data):
    os.makedirs(CONFIG["out_dir"], exist_ok=True)
    path = os.path.join(CONFIG["out_dir"], name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    log.info("已写入 %s", path)


# ========== 主调度（触发器） ==========
TRIGGER_RULES = {
    "sync_orders": "cron 每 30 分钟",
    "reconcile_inventory": "事件（库存变更推送）",
    "collect_platform_data": "cron 每日 03:00",
}


def main():
    """演示调度：真实环境由 RPA 控制台/定时任务触发。"""
    results = {}
    for name, trigger in TRIGGER_RULES.items():
        log.info("触发 %s（%s）", name, trigger)
        try:
            results[name] = globals()[name]()
        except RPAException as e:
            results[name] = {"error": str(e), "level": e.LEVEL}
            send_alert("dingtalk", f"RPA 流程失败：{name}", str(e))
    # 汇总报告（供人工复核台）
    save_json("rpa_run_report.json", {
        "ts": datetime.datetime.now().isoformat(),
        "trigger": TRIGGER_RULES,
        "results": results,
    })
    log.info("RPA 调度完成，汇总报告已生成")


# ==================== 以下为扩充部分：审批流程自动化 + 通用工具 ====================

# 6. 审批流程自动化（钉钉审批 + 数据回写）
# 场景：费用申请、用章申请、请假审批等跨系统操作
# 实现：监听钉钉审批事件 -> 提取审批要素 -> 校验 -> 回写业务系统 -> 归档


def process_approval_event(event: dict) -> dict:
    """处理单条审批事件：提取要素、校验、回写、归档。

    Args:
        event: 钉钉审批事件字典，需含 instance_id / form 字段
    Returns:
        处理结果字典
    """
    instance_id = event.get("instance_id", "")
    form = event.get("form", {})
    result = {
        "instance_id": instance_id,
        "status": "pending",
        "checks": [],
        "writeback": None,
        "error": None,
    }
    # 1) 提取关键要素
    amount = form.get("amount")
    dept = form.get("dept")
    biz_type = form.get("biz_type")
    if not amount or not dept or not biz_type:
        result["status"] = "blocked"
        result["error"] = "审批要素缺失"
        return result

    # 2) 规则校验（与财务规则库联动）
    checks = []
    if safe_float(amount) > 5000:
        checks.append({"rule": "LIMIT", "pass": False, "msg": "金额超 5000 需额外审批"})
    else:
        checks.append({"rule": "LIMIT", "pass": True, "msg": "金额在范围内"})
    if biz_type not in ("费用", "用章", "请假", "采购"):
        checks.append({"rule": "TYPE", "pass": False, "msg": f"未知业务类型 {biz_type}"})
    else:
        checks.append({"rule": "TYPE", "pass": True, "msg": "业务类型合法"})
    result["checks"] = checks
    blocked = [c for c in checks if not c["pass"]]

    if blocked:
        result["status"] = "blocked"
        result["error"] = ";".join(c["msg"] for c in blocked)
        return result

    # 3) 回写业务系统（示例：调用 ERP 接口）
    # result["writeback"] = erp_api.create_voucher(instance_id, amount, dept)
    result["writeback"] = {"voucher_no": f"VCH-{instance_id}", "status": "created"}
    result["status"] = "done"
    return result


# 7. 通用工具函数
def safe_float(value, default=0.0):
    """安全转浮点，兼容 None / 空串 / 千分位。"""
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).replace(",", "").replace("¥", "").replace("￥", "").strip()
    try:
        return float(text)
    except ValueError:
        return default


def make_idempotent_key(biz, biz_id, date_str):
    """生成幂等键，防止 RPA 重复执行导致重复写入。"""
    return f"{biz}:{biz_id}:{date_str}"


def write_log(level: str, task: str, message: str):
    """统一日志格式，生产环境可接 Loki / 云日志。"""
    import datetime
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}][{level}][{task}] {message}")


# 8. 运行统计（每日汇总）
def daily_statistics(task_name: str, records: list) -> dict:
    """汇总当日任务处理统计：成功/失败/耗时/错误类型分布。"""
    total = len(records)
    ok = sum(1 for r in records if r.get("status") == "done")
    blocked = sum(1 for r in records if r.get("status") == "blocked")
    failed = total - ok - blocked
    errors = {}
    for r in records:
        e = r.get("error")
        if e:
            errors[e] = errors.get(e, 0) + 1
    stat = {
        "task": task_name,
        "total": total,
        "success": ok,
        "blocked": blocked,
        "failed": failed,
        "success_rate": round(ok / total, 4) if total else 0.0,
        "top_errors": sorted(errors.items(), key=lambda x: -x[1])[:5],
    }
    return stat


# 9. 审批流程演示
def approval_demo():
    demo_events = [
        {"instance_id": "A001", "form": {"amount": 1200, "dept": "市场部", "biz_type": "费用"}},
        {"instance_id": "A002", "form": {"amount": 8000, "dept": "采购部", "biz_type": "采购"}},
        {"instance_id": "A003", "form": {"amount": 300, "dept": "行政部", "biz_type": "用章"}},
    ]
    results = [process_approval_event(e) for e in demo_events]
    stat = daily_statistics("approval_flow", results)
    print(stat)


# 唯一主入口：先跑主调度，再跑审批演示
if __name__ == "__main__":
    main()
    approval_demo()
