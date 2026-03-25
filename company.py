from flask import Blueprint, request, jsonify
from sec_service import resolve_cik, search_companies

company_bp = Blueprint("company", __name__)

@company_bp.route("/resolve", methods=["POST"])
def resolve():
    """
    接收 ticker 或 CIK，統一轉成 CIK + 公司名稱
    body: { "identifiers": ["AAPL", "0000320193", "BF.B"] }
    """
    data = request.json or {}
    identifiers = data.get("identifiers", [])

    results = []
    for ident in identifiers:
        try:
            info = resolve_cik(ident.strip())
            results.append({"input": ident, "status": "ok", **info})
        except Exception as e:
            results.append({"input": ident, "status": "error", "message": str(e)})

    return jsonify(results)


@company_bp.route("/search", methods=["GET"])
def search():
    """
    搜尋公司名稱 (給下拉選單用)
    ?q=apple&limit=10
    """
    query = request.args.get("q", "")
    limit = request.args.get("limit", 10, type=int)

    if not query:
        return jsonify([])

    try:
        results = search_companies(query, limit)
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
