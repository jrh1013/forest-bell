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

# ✅ DB 조회
def get_reservations():
    with sqlite3.connect(DB_FILE) as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, region, date FROM reservations ORDER BY id")
        rows = cur.fetchall()
        return [{"id": r[0], "region": r[1], "date": r[2]} for r in rows]

# ✅ DB 저장
def save_reservations(new_list):
    with sqlite3.connect(DB_FILE) as conn:
        conn.execute("DELETE FROM reservations")
        for item in new_list:
            conn.execute("INSERT INTO reservations (region, date) VALUES (?, ?)",
                         (item["region"], item["date"]))

# ✅ HTML 페이지
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/edit")
def edit_page():
    return render_template("edit.html")

@app.route("/token")
def token_page():
    return render_template("token.html")

# ✅ API: 조회
@app.route("/api/reservations", methods=["GET"])
def api_get_reservations():
    return jsonify(get_reservations())

# ✅ API: Bulk 저장
@app.route("/api/reservations/bulk", methods=["POST"])
def api_bulk_save():
    data = request.json
    if not isinstance(data, list):
        return jsonify({"error": "Invalid data format"}), 400
    save_reservations(data)
    return jsonify({"success": True})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
