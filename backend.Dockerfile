FROM python:3.11-slim

# 安裝系統依賴（包含 Chromium 用於 PDF 渲染）
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libxss1 \
    libasound2 \
    libgtk-3-0 \
    libx11-xcb1 \
    libxcb-dri3-0 \
    libxcb-shm0 \
    libxcb1 \
    libxss1 \
    libxtst6 \
    libxrandr2 \
    libxdamage1 \
    libxfixes3 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxi6 \
    libxtst6 \
    libnss3 \
    libcups2 \
    libxrandr2 \
    libxss1 \
    libgtk-3-0 \
    libgbm1 \
    libx11-xcb1 \
    libxcb-dri3-0 \
    libxcb-shm0 \
    libxcb1 \
    libxss1 \
    libxtst6 \
    libxrandr2 \
    libxdamage1 \
    libxfixes3 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxi6 \
    libxtst6 \
    libnss3 \
    libcups2 \
    libxrandr2 \
    libxss1 \
    libgtk-3-0 \
    libgbm1 \
    chromium \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 安裝 Playwright 瀏覽器
RUN python -m playwright install chromium

COPY app.py company.py download.py excel.py filing.py sec_service.py download_service.py pdf_service.py ./

RUN mkdir -p /app/downloads

EXPOSE 5000

CMD ["gunicorn", "--worker-class", "eventlet", "--workers", "1", "--bind", "0.0.0.0:5000", "--timeout", "300", "app:app"]
