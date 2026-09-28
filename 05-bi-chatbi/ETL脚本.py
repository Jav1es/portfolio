# -*- coding: utf-8 -*-
"""
多平台数据 ETL 入仓示例脚本（电商 / ERP / 客服 / 投放）
演示流程：数据抽取(Extract) → 数据清洗(Transform) → 数据入仓(Load) → 数据质量检查(QA)
实际生产可用 Airflow / DolphinScheduler 定时调度，本脚本用示例数据演示完整链路。

【范围说明】本脚本演示 dws_shop_daily 这张核心宽表的完整 ETL 链路（抽取→清洗→关联→质量→入仓）。
指标字典引用的其余表（dws_ad_daily / dws_refund_daily / dws_inventory_daily / dws_service_daily /
dws_finance_monthly / dws_traffic_daily 等）按同一模式各自实现 extract→clean→load，此处不逐一展开。
"""
import pandas as pd
import numpy as np
from datetime import datetime

# ============ 1. 数据抽取 Extract（模拟多平台数据源） ============
def extract_orders() -> pd.DataFrame:
    """电商订单表：从平台 API / 数仓表读取，此处用示例数据模拟"""
    return pd.DataFrame({
        "order_id": ["O1001", "O1002", "O1003", "O1004", "O1005", "O1006"],
        "platform": ["天猫", "京东", "天猫", "拼多多", "京东", "天猫"],
        "shop": ["旗舰店", "旗舰店", "专营店", "旗舰店", "专营店", "旗舰店"],
        "pay_amount": [299.00, 499.00, 129.00, None, 899.00, 199.00],  # None 模拟缺失
        "sku_id": ["S001", "S002", "S001", "S003", "S002", "S004"],
        "order_date": ["2026-09-20", "2026-09-20", "2026-09-21", "2026-09-21", "2026-09-22", "2026-09-22"],
    })


def extract_refunds() -> pd.DataFrame:
    """退款表：ERP/售后系统"""
    return pd.DataFrame({
        "order_id": ["O1002"],
        "refund_amount": [499.00],
        "refund_date": ["2026-09-22"],
    })


def extract_traffic() -> pd.DataFrame:
    """流量表：客服/投放平台"""
    return pd.DataFrame({
        "date": ["2026-09-20", "2026-09-21", "2026-09-22"],
        "uv": [52000, 54800, 56100],
        "pay_user_cnt": [2028, 2140, 2215],   # 支付用户数（去重），与指标字典 KPI_CR 口径一致
        "ad_cost": [120000, 128000, 131000],
        "ad_gmv": [384000, 410000, 431000],
    })


# ============ 2. 数据清洗 Transform ============
def clean_orders(df: pd.DataFrame) -> pd.DataFrame:
    """清洗规则：去重、缺失值处理、类型转换、口径统一"""
    df = df.drop_duplicates(subset=["order_id"])                    # 去重
    df["pay_amount"] = df["pay_amount"].fillna(0.0)                 # 缺失金额补 0 并标记
    df["pay_amount"] = pd.to_numeric(df["pay_amount"], errors="coerce")
    df["order_date"] = pd.to_datetime(df["order_date"])
    df["amount_flag"] = np.where(df["pay_amount"] == 0, "missing", "ok")  # 质量标记
    return df


def merge_metrics(orders, refunds, traffic) -> pd.DataFrame:
    """多表关联生成宽表：订单 + 退款 + 流量，统一到日粒度"""
    orders["refund"] = orders["order_id"].map(refunds.set_index("order_id")["refund_amount"]).fillna(0.0)
    orders["gmv"] = orders["pay_amount"]
    orders["real_gmv"] = orders["pay_amount"] - orders["refund"]
    daily = orders.groupby(["order_date", "platform"]).agg(
        gmv=("gmv", "sum"), real_gmv=("real_gmv", "sum"),
        orders=("order_id", "count"), sku_cnt=("sku_id", "nunique")
    ).reset_index()
    daily["date"] = daily["order_date"].dt.strftime("%Y-%m-%d")
    daily = daily.merge(traffic[["date", "uv", "pay_user_cnt", "ad_cost", "ad_gmv"]], on="date", how="left")
    # 转化率口径与指标字典 KPI_CR 对齐：支付用户数 / 访客数（非订单数/访客数）
    daily["conversion_rate"] = daily["pay_user_cnt"] / daily["uv"].replace(0, np.nan)
    return daily


# ============ 3. 数据质量检查 QA ============
def quality_check(df: pd.DataFrame) -> dict:
    """质量检查：空值率 / 重复率 / 异常值 / 口径校验，输出报告供看板预警"""
    report = {
        "rows": len(df),
        "null_rate": {c: round(float(df[c].isna().mean()), 4) for c in df.columns if df[c].isna().any()},
        "dup_rate": round(float(df.duplicated().sum() / max(len(df), 1)), 4),
        "negative_gmv": int((df["gmv"] < 0).sum()),
        "conversion_out_of_range": int(((df["conversion_rate"] < 0) | (df["conversion_rate"] > 1)).sum()),
    }
    return report


# ============ 4. 数据入仓 Load ============
def load_to_warehouse(df: pd.DataFrame) -> None:
    """入仓：生产环境写入数据中台/数仓（Greenplum / ClickHouse / MySQL 等）"""
    # 生产示例 SQL（示意）：
    # INSERT INTO dw.dws_shop_daily (dt, platform, gmv, real_gmv, orders, uv, conversion_rate)
    # VALUES ...
    df.to_csv("dws_shop_daily.csv", index=False, encoding="utf-8-sig")  # 示例落盘
    print("[LOAD] 已写入数仓明细表 dws_shop_daily，行数 =", len(df))


def main():
    print("===== 1. Extract 抽取 =====")
    orders = extract_orders()
    refunds = extract_refunds()
    traffic = extract_traffic()

    print("===== 2. Transform 清洗与关联 =====")
    orders = clean_orders(orders)
    daily = merge_metrics(orders, refunds, traffic)
    print(daily.to_string(index=False))

    print("===== 3. 数据质量检查 =====")
    qa = quality_check(daily)
    print("QA 报告：", qa)
    # 质量检查不通过则告警（示例：空值率 > 5% 或负 GMV > 0 时报警）
    if qa["negative_gmv"] > 0 or (qa["null_rate"] and max(qa["null_rate"].values()) > 0.05):
        print("[ALERT] 数据质量异常，请人工核查源数据！")

    print("===== 4. Load 入仓 =====")
    load_to_warehouse(daily)


if __name__ == "__main__":
    main()


# ==================== 以下为扩充部分：数据质量监控与调度 ====================

# 3. 数据质量监控（Data Quality）
# 目的：在入仓前拦截脏数据，保证看板口径可信。
# 实现：对每张目标表执行非空率/唯一性/波动率检查，异常行写 DQ 日志并告警。

DQ_RULES = [
    {"table": "dws_shop_daily", "col": "gmv",        "rule": "non_null", "threshold": 0.99},
    {"table": "dws_shop_daily", "col": "order_cnt",  "rule": "non_null", "threshold": 0.99},
    {"table": "dws_shop_daily", "col": "shop_id",    "rule": "unique_in_day", "threshold": 1.0},
    {"table": "dws_shop_daily", "col": "gmv",        "rule": "pct_change", "threshold": 0.50},
]


def check_non_null(df, col, threshold=0.99):
    """检查指定列非空率是否达到阈值。"""
    rate = 1 - df[col].isna().mean()
    return rate >= threshold, f"{col} 非空率 {rate:.2%}"


def check_unique_in_day(df, col):
    """检查(日期+维度键)在当日是否唯一，用于防重复入仓。"""
    dup = df.duplicated(subset=[col, "dt"]).sum()
    return dup == 0, f"{col}+dt 重复行 {dup}"


def check_pct_change(df, col, threshold=0.50):
    """检查指标环比波动是否超过阈值，波动过大视为异常。"""
    if len(df) < 2:
        return True, "样本不足，跳过"
    cur, prev = df[col].iloc[-1], df[col].iloc[-2]
    if prev == 0:
        return True, "上期为 0，跳过"
    pct = abs(cur - prev) / abs(prev)
    ok = pct <= threshold
    return ok, f"{col} 环比波动 {pct:.2%}"


def run_data_quality(df, table_name, rules=None):
    """批量执行质量规则，返回通过/失败明细。"""
    rules = rules or DQ_RULES
    results = []
    for r in rules:
        if r["table"] != table_name:
            continue
        rule = r["rule"]
        if rule == "non_null":
            ok, msg = check_non_null(df, r["col"], r["threshold"])
        elif rule == "unique_in_day":
            ok, msg = check_unique_in_day(df, r["col"])
        elif rule == "pct_change":
            ok, msg = check_pct_change(df, r["col"], r["threshold"])
        else:
            ok, msg = False, f"未定义规则 {rule}"
        results.append({"rule": rule, "col": r["col"], "pass": ok, "msg": msg})
    return results


def dq_alert(results, task_name):
    """质量检查失败时输出告警（生产环境可接钉钉/企微机器人）。"""
    failed = [r for r in results if not r["pass"]]
    if failed:
        print(f"[DQ][{task_name}] 检查失败 {len(failed)} 项: {failed}")
    else:
        print(f"[DQ][{task_name}] 全部通过")
    return failed


# 4. 增量调度说明（生产环境用 Airflow / DolphinScheduler）
# dag_id: bi_etl_daily
# schedule: 0 1 * * *（每天 01:00 拉取，T+1 看板 08:00 前可见）
# 依赖顺序: extract_orders -> extract_ads -> transform_merge -> data_quality -> load_dws
# 失败策略: 单表失败重试 2 次（间隔 5 分钟）；仍失败发告警并阻断当日入仓，避免脏数据上板


def etl_daily_pipeline(date_str):
    """单日 ETL 全流程编排（演示用）。"""
    print(f"[ETL] 开始 {date_str} 日批任务")
    # 1) 抽取（示例：读本地 CSV 模拟，生产为各平台 API / 数仓源表）
    # orders = extract_orders(date_str)
    # ads    = extract_ads(date_str)
    # 2) 转换合并（调用既有 transform 逻辑）
    # merged = transform_merge(orders, ads)
    # 3) 质量检查
    # results = run_data_quality(merged, "dws_shop_daily")
    # dq_alert(results, "bi_etl_daily")
    # 4) 入仓（调用既有 load 逻辑）
    # load_dws(merged, "dws_shop_daily", date_str)
    print(f"[ETL] {date_str} 流程完成（生产环境启用真实数据源）")


# 5. 单元测试（可直接运行：python ETL脚本.py --self-test）
if __name__ == "__main__":
    import sys
    if "--self-test" in sys.argv:
        import pandas as pd
        df = pd.DataFrame({
            "shop_id": [1, 2, 3],
            "gmv": [100.0, None, 300.0],
            "order_cnt": [10, 20, 30],
            "dt": ["2026-09-20"] * 3,
        })
        res = run_data_quality(df, "dws_shop_daily")
        dq_alert(res, "self_test")
        print("自测完成")
    else:
        etl_daily_pipeline("2026-09-20")
