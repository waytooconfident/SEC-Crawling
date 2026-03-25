import { useState } from "react";
import axios from "axios";

export default function DownloadPanel({
  compress, onCompressChange,
  downloadPath, onDownloadPathChange,
  companies, filingTypes, dateRange, onJobStart,
}) {
  const [conflictStrategy, setConflictStrategy] = useState("ask");
  const [conflicts, setConflicts]               = useState([]);
  const [showModal, setShowModal]               = useState(false);
  const [loading, setLoading]                   = useState(false);
  const [errors, setErrors]                     = useState([]);

  const validate = () => {
    const e = [];
    if (!companies.length)    e.push("請至少選擇一間公司");
    if (!filingTypes.length)  e.push("請至少選擇一種 Filing type");
    if (!dateRange.from || !dateRange.to) e.push("請設定日期區間");
    setErrors(e);
    return e.length === 0;
  };

  const handleStart = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      // 先檢查衝突
      if (conflictStrategy === "ask") {
        const { data } = await axios.post("/api/download/check-conflicts", {
          companies,
          filing_types: filingTypes,
          compress,
          download_path: downloadPath,
        });
        if (data.conflicts.length > 0) {
          setConflicts(data.conflicts);
          setShowModal(true);
          setLoading(false);
          return;
        }
      }

      await startDownload(conflictStrategy === "ask" ? "skip" : conflictStrategy);
    } catch (e) {
      setErrors(["啟動下載失敗：" + e.message]);
      setLoading(false);
    }
  };

  const startDownload = async (strategy) => {
    setLoading(true);
    setShowModal(false);
    try {
      const { data } = await axios.post("/api/download/start", {
        companies,
        filing_types: filingTypes,
        date_from:    dateRange.from,
        date_to:      dateRange.to,
        compress,
        download_path: downloadPath,
        on_conflict:  strategy,
      });
      onJobStart(data.job_id);
    } finally {
      setLoading(false);
    }
  };

  const ready = companies.length > 0 && filingTypes.length > 0 && dateRange.from && dateRange.to;

  return (
    <div className="space-y-5">
      {/* 下載摘要 */}
      <div className="bg-gray-800 rounded-lg p-4 text-sm space-y-1">
        <Row label="公司數量"   value={`${companies.length} 間`}       ok={companies.length > 0} />
        <Row label="Filing types" value={filingTypes.join(", ") || "—"}  ok={filingTypes.length > 0} />
        <Row label="日期區間"   value={dateRange.from && dateRange.to ? `${dateRange.from} → ${dateRange.to}` : "—"} ok={!!(dateRange.from && dateRange.to)} />
        <Row label="預計任務數" value={`${companies.length * filingTypes.length} 筆`} ok={ready} />
      </div>

      {/* 壓縮選項 */}
      <label className="flex items-center gap-3 cursor-pointer group">
        <div
          onClick={() => onCompressChange(!compress)}
          className={`w-11 h-6 rounded-full transition-colors relative ${compress ? "bg-amber-400" : "bg-gray-700"}`}
        >
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${compress ? "translate-x-6" : "translate-x-1"}`} />
        </div>
        <span className="text-gray-300 text-sm">下載後壓縮成 .zip</span>
      </label>

      {/* 衝突策略 */}
      <div className="space-y-2">
        <p className="text-gray-400 text-sm">下載路徑（留空使用預設）</p>
        <div className="flex gap-2">
          <input
            value={downloadPath}
            onChange={(e) => onDownloadPathChange(e.target.value)}
            placeholder="例如 /app/downloads 或 /Users/name/SEC"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400 font-mono text-sm"
          />
        </div>
        <p className="text-gray-500 text-xs">Web 介面無法安全取得系統完整路徑，請手動輸入伺服器可存取的路徑。</p>
      </div>

      <div className="space-y-2">
        <p className="text-gray-400 text-sm">若檔案已存在：</p>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "ask",       label: "🙋 先確認" },
            { value: "overwrite", label: "♻️ 全部覆蓋" },
            { value: "skip",      label: "⏭ 全部略過" },
          ].map((o) => (
            <button
              key={o.value}
              onClick={() => setConflictStrategy(o.value)}
              className={`px-4 py-1.5 rounded-lg text-sm border transition-colors ${
                conflictStrategy === o.value
                  ? "border-amber-400 bg-amber-400/20 text-amber-300"
                  : "border-gray-700 text-gray-400 hover:border-gray-500"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 space-y-1">
          {errors.map((e, i) => <p key={i} className="text-red-300 text-sm">⚠ {e}</p>)}
        </div>
      )}

      {/* 開始按鈕 */}
      <button
        onClick={handleStart}
        disabled={loading}
        className="w-full py-3 rounded-xl font-bold text-base transition-all
          bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black
          shadow-lg shadow-amber-500/20 hover:shadow-amber-400/30"
      >
        {loading ? "⏳ 準備中..." : "▶ 開始下載"}
      </button>

      {/* 衝突確認 Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-gray-100">⚠ 發現衝突檔案</h3>
            <p className="text-gray-400 text-sm">以下 {conflicts.length} 個項目已存在，請選擇處理方式：</p>
            <div className="bg-gray-800 rounded-lg p-3 max-h-40 overflow-y-auto">
              {conflicts.map((c, i) => (
                <p key={i} className="text-amber-300 text-xs font-mono py-0.5">{c}</p>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => startDownload("overwrite")}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-sm transition-colors"
              >
                全部覆蓋
              </button>
              <button
                onClick={() => startDownload("skip")}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold rounded-lg text-sm transition-colors"
              >
                全部略過
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-700 hover:border-gray-500 text-gray-400 rounded-lg text-sm transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, ok }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500">{label}</span>
      <span className={ok ? "text-gray-200" : "text-gray-600"}>{value}</span>
    </div>
  );
}
