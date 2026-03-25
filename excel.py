from flask import Blueprint, request, jsonify
import pandas as pd
import io

excel_bp = Blueprint("excel", __name__)

@excel_bp.route("/parse", methods=["POST"])
def parse_excel():
    """
    接收上傳的 Excel，回傳欄位名稱清單 + 指定欄位的值
    """
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    col_index = request.form.get("column_index", 0, type=int)

    try:
        df = pd.read_excel(io.BytesIO(file.read()), header=0)
        columns = df.columns.tolist()

        if col_index >= len(columns):
            return jsonify({"error": "Column index out of range"}), 400

        values = df.iloc[:, col_index].dropna().astype(str).tolist()

        return jsonify({
            "columns": columns,
            "values": values,
            "total": len(values)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
