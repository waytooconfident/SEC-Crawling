import { useState, useEffect } from "react";
import axios from "axios";

export default function FilingSelector({ selected, onChange }) {
  const [types, setTypes]   = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    axios.get("/api/filing/types").then(({ data }) => setTypes(data));
  }, []);

  const filtered = types.filter(
    (t) =>
      t.value.toLowerCase().includes(search.toLowerCase()) ||
      t.label.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (value) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  };

  const selectAll   = () => onChange(filtered.map((t) => t.value));
  const clearAll    = () => onChange([]);

  return (
    <div className="space-y-3">
      {/* 搜尋 */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜尋 Filing type，例如 10-K"
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400 text-sm"
      />

      {/* 全選/清除 */}
      <div className="flex gap-3 text-xs text-gray-400">
        <button onClick={selectAll} className="hover:text-amber-400 transition-colors">全選</button>
        <span>|</span>
        <button onClick={clearAll}  className="hover:text-red-400 transition-colors">清除</button>
        {selected.length > 0 && (
          <span className="ml-auto text-amber-400">已選 {selected.length} 項</span>
        )}
      </div>

      {/* 清單 */}
      <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
        {filtered.map((t) => {
          const checked = selected.includes(t.value);
          return (
            <label
              key={t.value}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                checked ? "bg-amber-400/10 border border-amber-400/30" : "hover:bg-gray-800"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(t.value)}
                className="accent-amber-400 w-4 h-4 shrink-0"
              />
              <span className={`font-mono text-sm w-20 shrink-0 ${checked ? "text-amber-300" : "text-gray-300"}`}>
                {t.value}
              </span>
              <span className="text-gray-400 text-sm">{t.label.split("—")[1]?.trim()}</span>
            </label>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-gray-500 text-sm px-3 py-4 text-center">無符合結果</p>
        )}
      </div>
    </div>
  );
}
