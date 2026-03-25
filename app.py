from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO
import os

app = Flask(__name__, static_folder="dist", static_url_path="/")
CORS(app, resources={r"/api/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

DOWNLOAD_DIR = os.environ.get("DOWNLOAD_DIR", "/app/downloads")

# ── Routes ──────────────────────────────────────────────
from excel import excel_bp
from company import company_bp
from filing import filing_bp
from download import download_bp

app.register_blueprint(excel_bp,    url_prefix="/api/excel")
app.register_blueprint(company_bp,  url_prefix="/api/company")
app.register_blueprint(filing_bp,   url_prefix="/api/filing")
app.register_blueprint(download_bp, url_prefix="/api/download")

# ── Serve React (production) ─────────────────────────────
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path):
    if app.static_folder and os.path.exists(app.static_folder):
        if path and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        index_file = os.path.join(app.static_folder, "index.html")
        if os.path.exists(index_file):
            return send_from_directory(app.static_folder, "index.html")
    return {"status": "ok", "message": "SEC backend is running"}

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
