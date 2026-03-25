# SEC Filing Downloader

SEC EDGAR 批次下載工具（Flask + React）。

## 功能

- Excel 拖拉上傳，指定欄位解析公司識別碼
- 手動輸入 ticker / CIK（支援多筆）
- Filing type 可搜尋、多選
- 日期區間選擇
- 可設定下載路徑（留空使用預設）
- 可選擇壓縮成 zip
- 下載前衝突檢查（全部覆蓋 / 全部略過 / 先確認）
- 即時進度（Socket.IO）

## 目前專案結構（單層）

- 前端: App.jsx, main.jsx, index.html, 各元件 .jsx
- 後端: app.py, excel.py, company.py, filing.py, download.py
- 服務: sec_service.py, download_service.py
- Docker: backend.Dockerfile, frontend.Dockerfile, docker-compose.yml

## 必要環境

- Python 3.11+
- Node.js 18+（Vite 5 必要）
- Docker + Docker Compose plugin（docker compose）

## 本機開發

### 後端

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export SEC_USER_AGENT="Your Name your@email.com"
export DOWNLOAD_DIR="$(pwd)/downloads"
python app.py
```

### 前端

```bash
npm install
npm run dev
```

前端預設連到 http://localhost:5000。
如需修改 API 目標:

```bash
VITE_API_TARGET=http://your-backend:5000 npm run dev
```

## Docker 啟動

1. 修改 docker-compose.yml 中 SEC_USER_AGENT
2. 修改 volume 左側路徑（下載目錄）

```bash
docker compose up --build
```

瀏覽器開啟 http://localhost:8080

## 注意事項

- SEC 需要合法 User-Agent（姓名 + Email）
- Web UI 無法直接讀取使用者電腦完整資料夾路徑，手動輸入的是伺服器端可存取路徑
- 若在容器中自訂下載路徑，需確認該路徑已掛載 volume
