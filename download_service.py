"""
下載服務
- 執行實際下載
- 透過 WebSocket 推送進度給前端
- 處理壓縮、衝突策略
"""
import os
import subprocess
import time
import zipfile
import shutil
from pathlib import Path
from sec_edgar_downloader import Downloader

DOWNLOAD_DIR = os.environ.get("DOWNLOAD_DIR", "/app/downloads")

def run_download_job(job_id: str, config: dict, emit_progress):
    """
    在背景 thread 中執行，透過 socketio emit 回報進度
    config keys:
        companies    : [{ cik, ticker }]
        filing_types : ["10-K", ...]
        date_from    : "YYYY-MM-DD"
        date_to      : "YYYY-MM-DD"
        compress     : bool
        on_conflict  : "overwrite" | "skip"
    """
    companies    = config["companies"]
    filing_types = config["filing_types"]
    date_from    = config.get("date_from", "")
    date_to      = config.get("date_to", "")
    compress     = config.get("compress", False)
    on_conflict  = config.get("on_conflict", "skip")
    download_dir = config.get("download_path") or DOWNLOAD_DIR

    os.makedirs(download_dir, exist_ok=True)

    total = len(companies) * len(filing_types)
    done  = 0

    sec_user_agent = os.environ.get("SEC_USER_AGENT", "YourName yourname@email.com").strip()
    company_name, email_address = _parse_sec_user_agent(sec_user_agent)

    dl = Downloader(
        company_name=company_name,
        email_address=email_address,
        download_folder=download_dir,
    )

    for company in companies:
        ticker = company.get("ticker") or company.get("cik")

        for form_type in filing_types:
            emit_progress(job_id, {
                "status":  "downloading",
                "message": f"Downloading {ticker} {form_type}...",
                "done":    done,
                "total":   total,
            })

            try:
                # ── 衝突偵測 ────────────────────────────────
                target_dir = os.path.join(download_dir, ticker, form_type)
                zip_path = target_dir + ".zip"

                conflict_exists = os.path.exists(target_dir) or (compress and os.path.exists(zip_path))
                if conflict_exists and on_conflict == "skip":
                    emit_progress(job_id, {
                        "status":  "skipped",
                        "message": f"Skipped {ticker} {form_type} (already exists)",
                        "done":    done + 1,
                        "total":   total,
                    })
                    done += 1
                    continue
                if conflict_exists and on_conflict == "overwrite":
                    if os.path.exists(target_dir):
                        shutil.rmtree(target_dir, ignore_errors=True)
                    if os.path.exists(zip_path):
                        os.remove(zip_path)

                # ── 實際下載 ────────────────────────────────
                kwargs = {}
                if date_from: kwargs["after"]  = date_from
                if date_to:   kwargs["before"] = date_to

                dl.get(form_type, ticker, download_details=True, **kwargs)

                # 將下載後的 HTML 轉為 PDF（客戶要的可列印版）
                rendered = _render_filing_html_to_pdf(target_dir)
                if rendered > 0:
                    emit_progress(job_id, {
                        "status": "rendered",
                        "message": f"Rendered {rendered} PDF(s) for {ticker} {form_type}",
                        "done": done,
                        "total": total,
                    })

                # ── 壓縮 ────────────────────────────────────
                if compress and os.path.exists(target_dir):
                    _zip_folder(target_dir, zip_path)

                done += 1
                emit_progress(job_id, {
                    "status":  "done_one",
                    "message": f"✓ {ticker} {form_type}",
                    "done":    done,
                    "total":   total,
                })

                time.sleep(0.5)  # SEC rate limit 保護

            except Exception as e:
                done += 1
                emit_progress(job_id, {
                    "status":  "error",
                    "message": f"✗ {ticker} {form_type}: {str(e)}",
                    "done":    done,
                    "total":   total,
                })

    emit_progress(job_id, {
        "status":  "finished",
        "message": f"All done. {done}/{total} processed.",
        "done":    done,
        "total":   total,
    })


# ── helpers ─────────────────────────────────────────────

def _zip_folder(folder_path: str, output_path: str):
    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(folder_path):
            for file in files:
                abs_path = os.path.join(root, file)
                arcname  = os.path.relpath(abs_path, folder_path)
                zf.write(abs_path, arcname)


def _parse_sec_user_agent(user_agent: str):
    # Expected shape: "Name email@example.com"
    parts = user_agent.split()
    email = "you@email.com"
    if parts and "@" in parts[-1]:
        email = parts[-1]
        company = " ".join(parts[:-1]) or "SEC Downloader"
        return company, email
    return user_agent or "SEC Downloader", email


def _render_filing_html_to_pdf(target_dir: str) -> int:
    """Render downloaded filing HTML files to PDF beside each source file."""
    root = Path(target_dir)
    if not root.exists():
        return 0

    rendered = 0
    html_files = sorted(
        [
            *root.rglob("*.htm"),
            *root.rglob("*.html"),
        ]
    )

    # Skip SEC helper indexes and inline viewer files to reduce noisy outputs.
    ignored_names = {"index.html", "index.htm", "ixviewer.html"}
    for html_path in html_files:
        if html_path.name.lower() in ignored_names:
            continue

        pdf_path = html_path.with_suffix(".pdf")
        if _html_file_to_pdf(html_path, pdf_path):
            rendered += 1

    return rendered


def _html_file_to_pdf(html_path: Path, pdf_path: Path) -> bool:
    try:
        browser = _find_chromium_binary()
        if not browser:
            return False

        cmd = [
            browser,
            "--headless",
            "--no-sandbox",
            "--disable-gpu",
            "--run-all-compositor-stages-before-draw",
            "--virtual-time-budget=10000",
            f"--print-to-pdf={pdf_path}",
            html_path.resolve().as_uri(),
        ]
        completed = subprocess.run(cmd, check=False, capture_output=True, text=True)
        return completed.returncode == 0 and pdf_path.exists() and pdf_path.stat().st_size > 0
    except Exception:
        return False


def _find_chromium_binary() -> str | None:
    for candidate in ("chromium", "chromium-browser", "google-chrome", "google-chrome-stable"):
        found = shutil.which(candidate)
        if found:
            return found
    return None
