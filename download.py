from flask import Blueprint, request, jsonify
from download_service import run_download_job
import os
import threading

download_bp = Blueprint("download", __name__)

@download_bp.route("/check-conflicts", methods=["POST"])
def check_conflicts():
    """
    下載前先掃描哪些檔案已存在
    body: { "files": ["AAPL_10-K_2023.zip", ...] }
    """
    data = request.json or {}
    companies = data.get("companies", [])
    filing_types = data.get("filing_types", [])
    compress = data.get("compress", False)
    download_dir = data.get("download_path") or os.environ.get("DOWNLOAD_DIR", "/app/downloads")

    conflicts = []
    for company in companies:
        ticker = company.get("ticker") or company.get("cik")
        for form_type in filing_types:
            target_dir = os.path.join(download_dir, ticker, form_type)
            zip_path = f"{target_dir}.zip"

            if os.path.exists(target_dir):
                conflicts.append(target_dir)
            if compress and os.path.exists(zip_path):
                conflicts.append(zip_path)

    return jsonify({"conflicts": conflicts})


@download_bp.route("/start", methods=["POST"])
def start_download():
    """
    啟動下載任務（背景執行，透過 WebSocket 回報進度）
    body: {
        "companies":     [{"cik": "...", "ticker": "AAPL"}],
        "filing_types":  ["10-K"],
        "date_from":     "2020-01-01",
        "date_to":       "2024-12-31",
        "compress":      true,
        "on_conflict":   "overwrite" | "skip"   ← 使用者已確認的衝突策略
    }
    """
    data = request.json or {}

    # 基本驗證
    if not data.get("companies"):
        return jsonify({"error": "companies is required"}), 400
    if not data.get("filing_types"):
        return jsonify({"error": "filing_types is required"}), 400

    # 背景執行，用 WebSocket 推送進度
    job_id = _new_job_id()
    thread = threading.Thread(
        target=run_download_job,
        args=(job_id, data, _emit_progress),
        daemon=True
    )
    thread.start()

    return jsonify({"job_id": job_id, "status": "started"})


# ── helpers ─────────────────────────────────────────────
import uuid
def _new_job_id():
    return str(uuid.uuid4())[:8]


def _emit_progress(job_id: str, payload: dict):
    # Import lazily to avoid circular import during app bootstrap.
    from app import socketio
    socketio.emit("download_progress", {"job_id": job_id, **payload})
