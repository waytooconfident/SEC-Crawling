import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

export default function ProgressPanel({ jobId }) {
  const [logs, setLogs]       = useState([]);
  const [summary, setSummary] = useState(null); // { done, total }
  const [finished, setFinished] = useState(false);
  const logRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io({ path: "/socket.io" });
    socketRef.current = socket;

    socket.on("download_progress", (msg) => {
      if (msg.job_id !== jobId) return;

      setSummary({ done: msg.done, total: msg.total });

      setLogs((prev) => [
        ...prev,
        { status: msg.status, message: msg.message, time: new Date().toLocaleTimeString() },
      ]);

      if (msg.status === "finished") {
        setFinished(true);
        socket.disconnect();
      }
    });

    return () => socket.disconnect();
  }, [jobId]);

  // 自動滾到最底
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const pct = summary ? Math.round((summary.done / summary.total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* 進度條 */}
      {summary && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">
              {finished ? "✅ 完成" : "⏳ 下載中..."}
            </span>
            <span className="text-amber-300 font-mono">
              {summary.done} / {summary.total}
            </span>
          </div>
          <div className="bg-gray-800 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                finished ? "bg-green-500" : "bg-amber-400"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-gray-500 text-xs text-right">{pct}%</p>
        </div>
      )}

      {/* 即時 Log */}
      <div
        ref={logRef}
        className="bg-gray-950 border border-gray-800 rounded-lg p-4 h-56 overflow-y-auto font-mono text-xs space-y-1"
      >
        {logs.length === 0 && (
          <p className="text-gray-600">等待下載開始...</p>
        )}
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-gray-600 shrink-0">{log.time}</span>
            <span className={statusColor(log.status)}>{log.message}</span>
          </div>
        ))}
      </div>

      {/* 完成提示 */}
      {finished && (
        <div className="bg-green-900/30 border border-green-700 rounded-lg px-4 py-3 text-green-300 text-sm">
          ✅ 下載完成！檔案已存放在你設定的下載資料夾中。
        </div>
      )}
    </div>
  );
}

function statusColor(status) {
  switch (status) {
    case "done_one":    return "text-green-400";
    case "skipped":     return "text-gray-400";
    case "error":       return "text-red-400";
    case "finished":    return "text-green-300 font-bold";
    default:            return "text-amber-300";
  }
}
