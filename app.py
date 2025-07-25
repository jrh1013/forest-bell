from flask import Flask, render_template, request, jsonify
import sqlite3
import os

app = Flask(__name__)

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

# ✅ DB에서 데이터 불러오기
def get_reservations():
    with sqlite3.connect(DB_FILE) as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, region, date FROM reservations ORDER BY id")
        rows = cur.fetchall()
        return [{"id": r[0], "region": r[1], "date": r[2]} for r in rows]

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/add")
def add_page():
    return render_template("add.html")

@app.route("/token")
def token_page():
    return render_template("token.html")

# ✅ API: 리스트 조회
@app.route("/api/reservations", methods=["GET"])
def api_get_reservations():
    return jsonify(get_reservations())

# ✅ API: 추가
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

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
