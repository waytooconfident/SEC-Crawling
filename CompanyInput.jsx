import { useState, useRef, useEffect } from "react";
import axios from "axios";

export default function CompanyInput({ onAdd }) {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const [error, setError]       = useState("");
  const debounce = useRef(null);
  const wrapRef  = useRef(null);

  // 點外面關閉下拉
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = (val) => {
    setQuery(val);
    setError("");
    clearTimeout(debounce.current);
    if (!val.trim()) { setResults([]); setShowDrop(false); return; }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`/api/company/search?q=${encodeURIComponent(val)}&limit=8`);
        setResults(data);
        setShowDrop(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 350);
  };

  // 直接輸入按 Enter 送出（不透過搜尋）
  const handleManual = async () => {
    const raw = query.trim();
    if (!raw) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post("/api/company/resolve", { identifiers: raw.split(/[\s,，]+/).filter(Boolean) });
      const ok   = data.filter((r) => r.status === "ok");
      const fail = data.filter((r) => r.status !== "ok").map((r) => r.input);
      if (ok.length)   onAdd(ok);
      if (fail.length) setError(`找不到：${fail.join(", ")}`);
      if (ok.length)   setQuery("");
    } catch (e) {
      setError("查詢失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (company) => {
    onAdd([company]);
    setQuery("");
    setResults([]);
    setShowDrop(false);
  };

  return (
    <div className="space-y-3">
      <p className="text-gray-400 text-sm">輸入 Ticker（如 AAPL、BF.B）或 CIK，多個用空格或逗號分隔</p>
      <div ref={wrapRef} className="relative">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleManual()}
            placeholder="AAPL, MSFT, 0000320193 ..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400 font-mono text-sm"
          />
          <button
            onClick={handleManual}
            disabled={loading || !query.trim()}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
          >
            {loading ? "..." : "+ 新增"}
          </button>
        </div>

        {/* 搜尋下拉 */}
        {showDrop && results.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 overflow-hidden">
            {results.map((r) => (
              <button
                key={r.cik}
                onClick={() => handleSelect(r)}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-700 flex items-center justify-between gap-4 transition-colors"
              >
                <span className="text-amber-300 font-mono text-sm w-16 shrink-0">{r.ticker}</span>
                <span className="text-gray-300 text-sm flex-1 truncate">{r.name}</span>
                <span className="text-gray-500 text-xs font-mono shrink-0">{r.cik}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
