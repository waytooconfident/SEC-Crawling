import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";

export default function ExcelUploader({ onCompaniesLoaded }) {
  const [file, setFile]         = useState(null);
  const [columns, setColumns]   = useState([]);
  const [colIndex, setColIndex] = useState(0);
  const [preview, setPreview]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const onDrop = useCallback(async (accepted) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setError("");
    await parseExcel(f, 0);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
  });

  const parseExcel = async (f, idx) => {
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", f);
      form.append("column_index", idx);
      const { data } = await axios.post("/api/excel/parse", form);
      setColumns(data.columns);
      setPreview(data.values.slice(0, 5));
    } catch (e) {
      setError(e.response?.data?.error || "解析失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleColChange = async (idx) => {
    setColIndex(idx);
    if (file) await parseExcel(file, idx);
  };

  const handleConfirm = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("column_index", colIndex);
      const { data } = await axios.post("/api/excel/parse", form);
      const { data: resolved } = await axios.post("/api/company/resolve", {
        identifiers: data.values,
      });
      const ok = resolved.filter((r) => r.status === "ok");
      onCompaniesLoaded(ok);
    } catch (e) {
      setError(e.response?.data?.error || "匯入失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-amber-400 bg-amber-400/10"
            : "border-gray-700 hover:border-gray-500 bg-gray-800/40"
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-4xl mb-3">📂</div>
        {file ? (
          <div>
            <p className="text-green-400 font-medium">{file.name}</p>
            <p className="text-gray-500 text-sm mt-1">點此更換檔案</p>
          </div>
        ) : (
          <div>
            <p className="text-gray-300">拖拉 Excel 到此，或點選選擇</p>
            <p className="text-gray-500 text-sm mt-1">.xlsx / .xls</p>
          </div>
        )}
      </div>

      {columns.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-gray-400 text-sm whitespace-nowrap">使用第幾欄：</span>
          {columns.map((col, i) => (
            <button
              key={i}
              onClick={() => handleColChange(i)}
              className={`px-3 py-1 rounded text-sm border transition-colors ${
                colIndex === i
                  ? "border-amber-400 bg-amber-400/20 text-amber-300"
                  : "border-gray-700 text-gray-400 hover:border-gray-500"
              }`}
            >
              {i}: {col}
            </button>
          ))}
        </div>
      )}

      {preview.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-3 text-sm">
          <p className="text-gray-400 mb-2">預覽（前 5 筆）：</p>
          <div className="flex flex-wrap gap-2">
            {preview.map((v, i) => (
              <span key={i} className="bg-gray-700 text-gray-200 px-2 py-0.5 rounded font-mono text-xs">
                {v}
              </span>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {columns.length > 0 && (
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-5 py-2 rounded-lg transition-colors text-sm"
        >
          {loading ? "匯入中..." : "✓ 匯入此欄位的公司"}
        </button>
      )}
    </div>
  );
}
