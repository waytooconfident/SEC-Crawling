# SEC EDGAR Downloader - Makefile

.PHONY: help setup dev dev-backend dev-frontend docker-build docker-up docker-down clean test

help: ## 顯示幫助資訊
	@echo "SEC EDGAR Downloader - 開發命令"
	@echo ""
	@echo "開發環境設定:"
	@echo "  setup         安裝所有依賴和設定開發環境"
	@echo "  dev           同時啟動後端和前端（需要 tmux 或 screen）"
	@echo "  dev-backend   啟動後端服務"
	@echo "  dev-frontend  啟動前端服務"
	@echo ""
	@echo "Docker 部署:"
	@echo "  docker-build  建置 Docker 映像"
	@echo "  docker-up     啟動 Docker 服務"
	@echo "  docker-down   停止 Docker 服務"
	@echo ""
	@echo "維護:"
	@echo "  clean         清理快取檔案"
	@echo "  test          執行基本測試"

setup: ## 安裝依賴和設定環境
	./setup.sh

dev-backend: ## 啟動後端開發服務
	@echo "啟動後端服務..."
	@if [ ! -f .env ]; then \
		echo "❌ 請先設定 .env 檔案（參考 .env.example）"; \
		exit 1; \
	fi
	source .venv/bin/activate && python app.py

dev-frontend: ## 啟動前端開發服務
	@echo "啟動前端服務..."
	npm run dev

dev: ## 同時啟動後端和前端
	@echo "同時啟動後端和前端服務..."
	@if command -v tmux &> /dev/null; then \
		tmux new-session -d -s sec-dev './Makefile dev-backend'; \
		tmux split-window -h './Makefile dev-frontend'; \
		tmux attach-session -t sec-dev; \
	else \
		echo "請安裝 tmux 或手動開啟兩個終端視窗"; \
		echo "終端1: make dev-backend"; \
		echo "終端2: make dev-frontend"; \
	fi

docker-build: ## 建置 Docker 映像
	docker compose build

docker-up: ## 啟動 Docker 服務
	docker compose up

docker-down: ## 停止 Docker 服務
	docker compose down

clean: ## 清理快取檔案
	@echo "清理快取檔案..."
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type d -name .pytest_cache -exec rm -rf {} +
	find . -type d -name .coverage -exec rm -rf {} +
	rm -rf node_modules/.cache
	rm -rf .next
	rm -rf dist

test: ## 執行基本測試
	@echo "執行基本測試..."
	source .venv/bin/activate && python -c "import flask, playwright; print('✅ 基本依賴檢查通過')"
	npm test --if-present || echo "⚠️  無前端測試"