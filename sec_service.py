"""
SEC EDGAR 相關服務
- CIK 查詢 / ticker 轉換
- Filing 搜尋
"""
import requests
import time
import os

HEADERS = {
    # ⚠️ SEC 規定必須填真實資訊，否則會被 block
    "User-Agent": os.environ.get("SEC_USER_AGENT", "YourName yourname@email.com"),
    "Accept-Encoding": "gzip, deflate",
}

TICKER_TO_CIK_URL = "https://www.sec.gov/files/company_tickers.json"
COMPANY_SEARCH_URL = "https://efts.sec.gov/LATEST/search-index"
SUBMISSIONS_URL    = "https://data.sec.gov/submissions/CIK{cik}.json"

# ── 快取 ticker → CIK 對照表（啟動時載入一次）─────────────
_ticker_map: dict = {}

def _load_ticker_map():
    global _ticker_map
    if _ticker_map:
        return
    resp = requests.get(TICKER_TO_CIK_URL, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    # { "0": {"cik_str": 320193, "ticker": "AAPL", "title": "Apple Inc."}, ... }
    for entry in data.values():
        ticker = entry["ticker"].upper()
        cik    = str(entry["cik_str"]).zfill(10)
        _ticker_map[ticker] = {"cik": cik, "name": entry["title"]}


def resolve_cik(identifier: str) -> dict:
    """
    輸入 ticker 或 CIK，回傳 { cik, ticker, name }
    """
    _load_ticker_map()

    # 判斷是否為純數字（CIK）
    clean = identifier.replace("-", "").replace(" ", "")
    if clean.isdigit():
        cik = clean.zfill(10)
        # 反查名稱
        for ticker, info in _ticker_map.items():
            if info["cik"] == cik:
                return {"cik": cik, "ticker": ticker, "name": info["name"]}
        return {"cik": cik, "ticker": "", "name": "Unknown"}

    # Ticker 查詢（處理 BF.B 這類含點的 ticker）
    ticker_upper = identifier.upper()
    if ticker_upper in _ticker_map:
        info = _ticker_map[ticker_upper]
        return {"cik": info["cik"], "ticker": ticker_upper, "name": info["name"]}

    raise ValueError(f"Cannot resolve identifier: {identifier}")


def search_companies(query: str, limit: int = 10) -> list:
    """
    用公司名稱關鍵字搜尋（回傳給前端下拉選單）
    """
    _load_ticker_map()
    query_upper = query.upper()
    results = []
    for ticker, info in _ticker_map.items():
        if query_upper in ticker or query_upper in info["name"].upper():
            results.append({
                "ticker": ticker,
                "cik":    info["cik"],
                "name":   info["name"],
            })
        if len(results) >= limit:
            break
    return results


def get_filings_for_company(cik: str, filing_types: list, date_from: str, date_to: str) -> list:
    """
    查詢某公司在日期區間內的 filings
    """
    cik_padded = cik.zfill(10)
    url = SUBMISSIONS_URL.format(cik=cik_padded)

    resp = requests.get(url, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    recent = data.get("filings", {}).get("recent", {})
    forms  = recent.get("form", [])
    dates  = recent.get("filingDate", [])
    acc_nos = recent.get("accessionNumber", [])

    results = []
    for form, date, acc in zip(forms, dates, acc_nos):
        if filing_types and form not in filing_types:
            continue
        if date_from and date < date_from:
            continue
        if date_to and date > date_to:
            continue
        results.append({
            "form": form,
            "date": date,
            "accession_number": acc,
            "cik": cik_padded,
        })

    return results
