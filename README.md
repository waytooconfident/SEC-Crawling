# SEC Filing Downloader

SEC EDGAR 批次下載工具（Flask + React + Playwright PDF渲染）。

## 功能

- Excel 拖拉上傳，指定欄位解析公司識別碼
- 手動輸入 ticker / CIK（支援多筆）
- Filing type 可搜尋、多選
- 日期區間選擇
- 可設定下載路徑（留空使用預設）
- 可選擇壓縮成 zip
- 下載前衝突檢查（全部覆蓋 / 全部略過）
- **自動將 HTML 財報轉換為可列印 PDF**
- 即時進度（Socket.IO）

## 目前專案結構（單層）

- 前端: App.jsx, main.jsx, index.html, 各元件 .jsx
- 後端: app.py, excel.py, company.py, filing.py, download.py
- 服務: sec_service.py, download_service.py, pdf_service.py
- Docker: backend.Dockerfile, frontend.Dockerfile, docker-compose.yml

## 必要環境

- Python 3.11+
- Node.js 18+（Vite 5 必要）
- Docker + Docker Compose plugin（docker compose）
- **Chromium 瀏覽器**（用於 PDF 渲染）

## 本機開發

### 後端

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 安裝 Playwright 瀏覽器
python -m playwright install chromium

# 設定 SEC User-Agent（必須使用真實資訊）
export SEC_USER_AGENT="Your Real Name your@email.com"
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

## Docker 部署（推薦）

### 1. 設定 SEC User-Agent

在 `docker-compose.yml` 中修改：

```yaml
environment:
  SEC_USER_AGENT: "Your Real Name yourreal@email.com"  # ⚠️ 必須填寫真實資訊
```

### 2. 設定下載路徑

修改 `docker-compose.yml` 中的 volume 掛載：

**Windows:**
```yaml
volumes:
  - C:\Users\YourName\sec_reports:/app/downloads
```

**macOS:**
```yaml
volumes:
  - /Users/yourname/sec_reports:/app/downloads
```

**Linux:**
```yaml
volumes:
  - /home/yourname/sec_reports:/app/downloads
```

### 3. 啟動服務

```bash
docker compose up --build
```

瀏覽器開啟 http://localhost:8080

## SEC User-Agent 設定說明

SEC EDGAR 要求所有請求必須包含真實的 User-Agent 資訊：

1. **格式**: `"Your Name your@email.com"`
2. **必須真實**: 使用假資訊會被 SEC 封鎖
3. **範例**:
   - `"John Doe john.doe@company.com"`
   - `"Jane Smith jane.smith@university.edu"`

## 功能說明

### PDF 轉換
- 自動將下載的 HTML 財報轉換為 A4 大小的 PDF
- 支援背景列印、完整頁面渲染
- 每個主要財報檔案（primary-document.html）都會生成對應的 PDF

### 衝突處理
- **略過**: 發現已存在檔案時跳過
- **覆蓋**: 刪除舊檔案後重新下載

### 壓縮
- 可選擇將整個 filing 目錄壓縮為 ZIP
- 包含所有原始檔案和生成的 PDF

## 疑難排解

### PDF 渲染失敗
```bash
# 檢查 Chromium 是否正確安裝
python -c "import playwright; playwright.chromium.launch()"
```

### SEC 存取被拒
- 確認 User-Agent 格式正確
- 檢查網路連線
- 避免頻繁請求（已內建 0.5 秒延遲）

### Docker 權限問題
- 確保掛載的目錄存在且有寫入權限
- Windows: 使用絕對路徑而非相對路徑

## 開發注意事項

- SEC 有請求頻率限制，請勿過度使用
- 大量下載時請分批處理
- 定期清理下載目錄以節省空間
