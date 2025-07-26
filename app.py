from flask import Flask, render_template, request, jsonify
import sqlite3
import os
import requests
import base64
import json

app = Flask(__name__, template_folder="templates", static_folder="static")
DB_FILE = "reservations.db"

# ✅ DB 초기화
def init_db():
    with sqlite3.connect(DB_FILE) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS reservations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                region TEXT NOT NULL,
                date TEXT NOT NULL
            )
        """)

init_db()

# ✅ DB 데이터 조회
def get_reservations():
    with sqlite3.connect(DB_FILE) as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, region, date FROM reservations ORDER BY id")
        rows = cur.fetchall()
        return [{"id": r[0], "region": r[1], "date": r[2]} for r in rows]

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/edit")
def edit_page():
    return render_template("edit.html")

@app.route("/token")
def token_page():
    return render_template("token.html")

# ✅ API: 리스트 조회
@app.route("/api/reservations", methods=["GET"])
def api_get_reservations():
    return jsonify(get_reservations())

# ✅ API: 기존 개별 추가
@app.route("/api/reservations", methods=["POST"])
def api_add_reservation():
    data = request.json
    if not data.get("region") or not data.get("date"):
        return jsonify({"error": "Missing data"}), 400
    with sqlite3.connect(DB_FILE) as conn:
        conn.execute("INSERT INTO reservations (region, date) VALUES (?, ?)", (data["region"], data["date"]))
    return jsonify({"success": True})

# ✅ API: 삭제
@app.route("/api/reservations/<int:item_id>", methods=["DELETE"])
def api_delete_reservation(item_id):
    with sqlite3.connect(DB_FILE) as conn:
        conn.execute("DELETE FROM reservations WHERE id=?", (item_id,))
    return jsonify({"success": True})

# ✅ API: bulk 저장 (전체 덮어쓰기)
@app.route("/api/reservations/bulk", methods=["POST"])
def api_bulk_update():
    data = request.json
    if not isinstance(data, list):
        return jsonify({"error": "Invalid data format"}), 400
    with sqlite3.connect(DB_FILE) as conn:
        conn.execute("DELETE FROM reservations")
        for item in data:
            conn.execute("INSERT INTO reservations (region, date) VALUES (?, ?)", (item["region"], item["date"]))
    return jsonify({"success": True, "count": len(data)})

# ✅ API: GitHub → DB 동기화 (GitHub API 방식, 즉시 최신 데이터)
@app.route("/api/sync", methods=["POST"])
def api_sync():
    token = request.headers.get("Authorization")  # UI에서 토큰을 헤더로 전달
    if not token:
        return jsonify({"error": "Missing GitHub token"}), 400

    url = "https://api.github.com/repos/jrh1013/forest-bell/contents/data/reservations.json"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }

    try:
        res = requests.get(url, headers=headers, timeout=10)
        res.raise_for_status()
        content_data = res.json()
        encoded_content = content_data.get("content", "")
        if not encoded_content:
            return jsonify({"error": "No content in GitHub response"}), 500

        decoded_json = json.loads(base64.b64decode(encoded_content).decode("utf-8"))

        # DB 업데이트
        with sqlite3.connect(DB_FILE) as conn:
            conn.execute("DELETE FROM reservations")
            for item in decoded_json:
                conn.execute("INSERT INTO reservations (region, date) VALUES (?, ?)", (item["region"], item["date"]))

        return jsonify({"success": True, "count": len(decoded_json)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
