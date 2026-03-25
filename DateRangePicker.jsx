import { useState } from "react";

const SHORTCUTS = [
  { label: "近 1 年", from: yearsAgo(1), to: today() },
  { label: "近 3 年", from: yearsAgo(3), to: today() },
  { label: "近 5 年", from: yearsAgo(5), to: today() },
  { label: "近 10 年", from: yearsAgo(10), to: today() },
  { label: "全部",    from: "1993-01-01", to: today() },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}
function yearsAgo(n) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d.toISOString().slice(0, 10);
}

export default function DateRangePicker({ value, onChange }) {
  const [active, setActive] = useState(null);

  const apply = (shortcut, idx) => {
    setActive(idx);
    onChange({ from: shortcut.from, to: shortcut.to });
  };

  const handleManual = (field, val) => {
    setActive(null);
    onChange({ ...value, [field]: val });
  };

  return (
    <div className="space-y-4">
      {/* 快速選項 */}
      <div className="flex flex-wrap gap-2">
        {SHORTCUTS.map((s, i) => (
          <button
            key={i}
            onClick={() => apply(s, i)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              active === i
                ? "border-amber-400 bg-amber-400/20 text-amber-300"
                : "border-gray-700 text-gray-400 hover:border-gray-500"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* 手動輸入 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs">開始日期</label>
          <input
            type="date"
            value={value.from}
            max={value.to || today()}
            onChange={(e) => handleManual("from", e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:border-amber-400 text-sm [color-scheme:dark]"
          />
        </div>
        <span className="text-gray-500 mt-5">→</span>
        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs">結束日期</label>
          <input
            type="date"
            value={value.to}
            min={value.from}
            max={today()}
            onChange={(e) => handleManual("to", e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:border-amber-400 text-sm [color-scheme:dark]"
          />
        </div>
      </div>

      {value.from && value.to && (
        <p className="text-gray-400 text-xs">
          選取區間：<span className="text-amber-300">{value.from}</span>
          {" → "}
          <span className="text-amber-300">{value.to}</span>
        </p>
      )}
    </div>
  );
}
