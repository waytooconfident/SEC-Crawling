import { useState } from "react";
import ExcelUploader from "./ExcelUploader";
import CompanyInput from "./CompanyInput";
import FilingSelector from "./FilingSelector";
import DateRangePicker from "./DateRangePicker";
import DownloadPanel from "./DownloadPanel";
import ProgressPanel from "./ProgressPanel";

export default function App() {
  // ── 共用狀態 ─────────────────────────────────────────
  const [companies,    setCompanies]    = useState([]);  // [{ cik, ticker, name }]
  const [filingTypes,  setFilingTypes]  = useState([]);  // ["10-K", "10-Q"]
  const [dateRange,    setDateRange]    = useState({ from: "", to: "" });
  const [compress,     setCompress]     = useState(false);
  const [downloadPath, setDownloadPath] = useState("");
  const [jobId,        setJobId]        = useState(null);

  // 合併來自 Excel 或手動輸入的公司
  const addCompanies = (newList) => {
    setCompanies(prev => {
      const cikSet = new Set(prev.map(c => c.cik));
      const unique = newList.filter(c => !cikSet.has(c.cik));
      return [...prev, ...unique];
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <header className="text-center">
        <h1 className="text-3xl font-bold text-blue-400">SEC Filing Downloader</h1>
        <p className="text-gray-400 mt-1">從 EDGAR 批次下載財報</p>
      </header>

      {/* Step 1 — 上傳 Excel */}
      <Section title="1. 上傳 Excel">
        <ExcelUploader onCompaniesLoaded={addCompanies} />
      </Section>

      {/* Step 2 — 手動輸入 */}
      <Section title="2. 手動輸入 Ticker / CIK">
        <CompanyInput onAdd={addCompanies} />
      </Section>

      {/* 已選公司清單 */}
      {companies.length > 0 && (
        <Section title={`已選公司 (${companies.length})`}>
          <CompanyList companies={companies} onRemove={(cik) =>
            setCompanies(prev => prev.filter(c => c.cik !== cik))
          } />
        </Section>
      )}

      {/* Step 3 — Filing types */}
      <Section title="3. 選擇 Filing Types">
        <FilingSelector selected={filingTypes} onChange={setFilingTypes} />
      </Section>

      {/* Step 4 — 日期區間 */}
      <Section title="4. 財報日期區間">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </Section>

      {/* Step 5+6 — 下載設定 */}
      <Section title="5. 下載設定">
        <DownloadPanel
          compress={compress}
          onCompressChange={setCompress}
          downloadPath={downloadPath}
          onDownloadPathChange={setDownloadPath}
          companies={companies}
          filingTypes={filingTypes}
          dateRange={dateRange}
          onJobStart={setJobId}
        />
      </Section>

      {/* 下載進度 */}
      {jobId && (
        <Section title="下載進度">
          <ProgressPanel jobId={jobId} />
        </Section>
      )}
    </div>
  );
}

// ── 共用 Section wrapper ─────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-gray-200 mb-4">{title}</h2>
      {children}
    </div>
  );
}

// ── 已選公司 Tag 清單 ────────────────────────────────────
function CompanyList({ companies, onRemove }) {
  return (
    <div className="flex flex-wrap gap-2">
      {companies.map(c => (
        <span key={c.cik}
          className="flex items-center gap-1 bg-blue-900 text-blue-200 px-3 py-1 rounded-full text-sm">
          {c.ticker || c.cik}
          <button onClick={() => onRemove(c.cik)}
            className="ml-1 text-blue-400 hover:text-red-400 font-bold">×</button>
        </span>
      ))}
    </div>
  );
}
