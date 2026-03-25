#!/bin/bash

# SEC EDGAR Downloader 開發環境設定腳本
# 用法: ./setup.sh

set -e

echo "🚀 設定 SEC EDGAR Downloader 開發環境"

# 檢查 Python
if ! command -v python3 &> /dev/null; then
    echo "❌ 需要安裝 Python 3.11+"
    exit 1
fi

# 檢查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 需要安裝 Node.js 18+"
    exit 1
fi

# 檢查 Docker
if ! command -v docker &> /dev/null; then
    echo "⚠️  建議安裝 Docker 用於生產部署"
fi

echo "📦 建立 Python 虛擬環境"
python3 -m venv .venv
source .venv/bin/activate

echo "📦 安裝 Python 依賴"
pip install -r requirements.txt

echo "📦 安裝 Playwright 瀏覽器"
python -m playwright install chromium

echo "📦 安裝 Node.js 依賴"
npm install

echo "📝 檢查環境變數設定"
if [ ! -f .env ]; then
    echo "⚠️  請複製 .env.example 為 .env 並設定 SEC_USER_AGENT"
    echo "   cp .env.example .env"
    echo "   然後編輯 .env 檔案填入真實的姓名和 Email"
else
    echo "✅ .env 檔案已存在"
fi

echo ""
echo "🎉 設定完成！"
echo ""
echo "啟動開發服務："
echo "1. 後端: source .venv/bin/activate && python app.py"
echo "2. 前端: npm run dev"
echo ""
echo "或使用 Docker 部署："
echo "   docker compose up --build"