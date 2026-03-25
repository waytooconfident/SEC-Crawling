"""
PDF 渲染服務
將 SEC EDGAR 的 HTML 財報轉換為可列印的 PDF 檔案
"""
import os
import asyncio
import logging
from pathlib import Path
from typing import List, Tuple
from playwright.async_api import async_playwright
import concurrent.futures

logger = logging.getLogger(__name__)

class PDFRenderer:
    """HTML to PDF 渲染器"""

    def __init__(self, max_concurrent: int = 3):
        self.max_concurrent = max_concurrent
        self.browser = None
        self.playwright = None

    async def __aenter__(self):
        """啟動 Playwright 瀏覽器"""
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',  # 重要：Docker 環境中需要
                '--disable-gpu'
            ]
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """關閉瀏覽器"""
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()

    async def render_html_to_pdf(self, html_path: str, pdf_path: str) -> bool:
        """
        將單個 HTML 檔案轉換為 PDF

        Args:
            html_path: HTML 檔案路徑
            pdf_path: 輸出 PDF 路徑

        Returns:
            bool: 轉換是否成功
        """
        try:
            if not os.path.exists(html_path):
                logger.warning(f"HTML file not found: {html_path}")
                return False

            # 讀取 HTML 內容
            with open(html_path, 'r', encoding='utf-8', errors='ignore') as f:
                html_content = f.read()

            # 創建新頁面
            page = await self.browser.new_page()

            try:
                # 設置內容
                await page.set_content(html_content, wait_until='networkidle')

                # 等待頁面完全載入
                await page.wait_for_load_state('networkidle')

                # 額外等待確保動態內容載入
                await asyncio.sleep(1)

                # 生成 PDF
                await page.pdf(
                    path=pdf_path,
                    format='A4',
                    print_background=True,
                    margin={
                        'top': '0.5in',
                        'right': '0.5in',
                        'bottom': '0.5in',
                        'left': '0.5in'
                    },
                    prefer_css_page_size=False
                )

                logger.info(f"Successfully rendered PDF: {pdf_path}")
                return True

            finally:
                await page.close()

        except Exception as e:
            logger.error(f"Failed to render PDF for {html_path}: {str(e)}")
            return False

    async def render_directory_htmls_to_pdfs(self, filing_dir: str) -> int:
        """
        將整個 filing 目錄中的 HTML 檔案轉換為 PDF

        Args:
            filing_dir: 包含 HTML 檔案的目錄路徑

        Returns:
            int: 成功轉換的檔案數量
        """
        filing_path = Path(filing_dir)
        if not filing_path.exists():
            logger.warning(f"Filing directory not found: {filing_dir}")
            return 0

        # 尋找所有 HTML 檔案
        html_files = []
        for html_file in filing_path.rglob('*.html'):
            if html_file.name.startswith('primary-document'):  # 主要財報檔案
                html_files.append(html_file)

        if not html_files:
            logger.info(f"No primary HTML files found in {filing_dir}")
            return 0

        # 限制並發數量
        semaphore = asyncio.Semaphore(self.max_concurrent)
        success_count = 0

        async def render_with_semaphore(html_file: Path):
            async with semaphore:
                pdf_path = html_file.with_suffix('.pdf')
                success = await self.render_html_to_pdf(str(html_file), str(pdf_path))
                return 1 if success else 0

        # 並發處理所有 HTML 檔案
        tasks = [render_with_semaphore(html_file) for html_file in html_files]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # 統計成功數量
        for result in results:
            if isinstance(result, int):
                success_count += result
            else:
                logger.error(f"Exception during PDF rendering: {result}")

        logger.info(f"Rendered {success_count}/{len(html_files)} PDFs in {filing_dir}")
        return success_count

# 全域渲染器實例
_renderer = None

async def get_renderer() -> PDFRenderer:
    """獲取全域 PDF 渲染器實例"""
    global _renderer
    if _renderer is None:
        _renderer = PDFRenderer()
        await _renderer.__aenter__()
    return _renderer

async def render_filing_html_to_pdf(filing_dir: str) -> int:
    """
    將 SEC filing 目錄中的 HTML 轉換為 PDF（主要入口函數）

    Args:
        filing_dir: filing 目錄路徑

    Returns:
        int: 成功轉換的 PDF 數量
    """
    try:
        renderer = await get_renderer()
        return await renderer.render_directory_htmls_to_pdfs(filing_dir)
    except Exception as e:
        logger.error(f"PDF rendering failed for {filing_dir}: {str(e)}")
        return 0

def cleanup_renderer():
    """清理全域渲染器（應用程式關閉時呼叫）"""
    global _renderer
    if _renderer:
        try:
            # 簡單的清理方式：直接標記為 None，讓 GC 處理
            # 在生產環境中，瀏覽器實例會在應用關閉時自動清理
            logger.info("Cleaning up PDF renderer...")
        except Exception as e:
            logger.error(f"Error during renderer cleanup: {str(e)}")
        finally:
            _renderer = None
