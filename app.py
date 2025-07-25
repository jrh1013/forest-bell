from flask import Flask, render_template, request, jsonify
import sqlite3
import os
import json

app = Flask(__name__, template_folder="templates", static_folder="static")

DB_FILE = "reservations.db"
JSON_FILE = "reservations.json"

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

# ✅ DB → JSON 동기화
def sync_to_json():
    data = get_reservations()
    with open(JSON_FILE, "w", encoding="utf-8") as f:
        json.dump([{"region": r["region"], "date": r["date"]} for r in data], f, ensure_ascii=False, indent=2)

# ✅ DB 조회
def get_reservations():
    with sqlite3.connect(DB_FILE) as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, region, date FROM reservations ORDER BY id")
        rows = cur.fetchall()
        return [{"id": r[0], "region": r[1], "date": r[2]} for r in rows]

# ✅ 라우트
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/edit")
def edit_page():
    return render_template("edit.html")

@app.route("/token")
def token_page():
    return render_template("token.html")

@app.route("/ping")
def ping():
    return "pong"

# ✅ API: 리스트 조회
@app.route("/api/reservations", methods=["GET"])
def api_get_reservations():
    return jsonify(get_reservations())

# ✅ API: 전체 갱신 (임시 리스트 → DB 저장)
@app.route("/api/reservations", methods=["POST"])
def api_update_reservations():
    data = request.json
    if not isinstance(data, list):
        return jsonify({"error": "Invalid data format"}), 400
    with sqlite3.connect(DB_FILE) as conn:
        conn.execute("DELETE FROM reservations")
        for item in data:
            conn.execute("INSERT INTO reservations (region, date) VALUES (?, ?)", (item["region"], item["date"]))
    sync_to_json()
    return jsonify({"success": True})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
