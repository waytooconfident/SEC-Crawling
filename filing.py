from flask import Blueprint, request, jsonify
from sec_service import get_filings_for_company

filing_bp = Blueprint("filing", __name__)

# 常見 Filing types 清單（靜態）
COMMON_FILING_TYPES = [
    {"value": "10-K",    "label": "10-K  — 年度報告"},
    {"value": "10-Q",    "label": "10-Q  — 季度報告"},
    {"value": "8-K",     "label": "8-K   — 重大事件"},
    {"value": "20-F",    "label": "20-F  — 外國公司年報"},
    {"value": "6-K",     "label": "6-K   — 外國公司季報"},
    {"value": "DEF 14A", "label": "DEF 14A — 股東委託書"},
    {"value": "S-1",     "label": "S-1   — IPO 申請"},
    {"value": "4",       "label": "Form 4 — 內部人員持股異動"},
    {"value": "SC 13G",  "label": "SC 13G — 大股東申報"},
    {"value": "SC 13D",  "label": "SC 13D — 大股東申報（主動）"},
]

@filing_bp.route("/types", methods=["GET"])
def filing_types():
    return jsonify(COMMON_FILING_TYPES)


@filing_bp.route("/list", methods=["POST"])
def list_filings():
    """
    查詢某公司特定 filing type 在日期區間內的 filings
    body: {
        "cik": "0000320193",
        "filing_types": ["10-K", "10-Q"],
        "date_from": "2020-01-01",
        "date_to": "2024-12-31"
    }
    """
    data = request.json or {}
    cik          = data.get("cik")
    filing_types = data.get("filing_types", [])
    date_from    = data.get("date_from")
    date_to      = data.get("date_to")

    if not cik:
        return jsonify({"error": "cik is required"}), 400

    try:
        filings = get_filings_for_company(cik, filing_types, date_from, date_to)
        return jsonify(filings)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
