from flask import Flask, render_template, request, jsonify
import sqlite3
import os
import json
import base64
import requests

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

# ✅ 현재 예약 리스트 불러오기
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

# ✅ API: 현재 예약 리스트 조회
@app.route("/api/reservations", methods=["GET"])
def api_get_reservations():
    return jsonify(get_reservations())

# ✅ API: 전체 저장 (DB + GitHub JSON)
@app.route("/api/save_all", methods=["POST"])
def api_save_all():
    data = request.json
    if not isinstance(data, list):
        return jsonify({"error": "Invalid data"}), 400

    # 1. DB 갱신
    with sqlite3.connect(DB_FILE) as conn:
        conn.execute("DELETE FROM reservations")
        for item in data:
            conn.execute("INSERT INTO reservations (region, date) VALUES (?, ?)", (item["region"], item["date"]))

    # 2. GitHub JSON 갱신
    token = request.headers.get("Authorization", "").replace("token ", "")
    if not token:
        return jsonify({"error": "GitHub token required"}), 401

    repo_owner = "jrh1013"
    repo_name = "forest-bell"
    file_path = "data/reservations.json"
    branch = "main"

    url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/contents/{file_path}"
    headers = {"Authorization": f"token {token}"}
    get_res = requests.get(url, headers=headers)
    if get_res.status_code != 200:
        return jsonify({"error": "Failed to fetch file info"}), 500
    sha = get_res.json().get("sha")

    new_content = base64.b64encode(json.dumps(data, ensure_ascii=False, indent=2).encode()).decode()
    put_res = requests.put(url, headers=headers, json={
        "message": "Update reservations.json",
        "content": new_content,
        "sha": sha,
        "branch": branch
    })

    if put_res.status_code in [200, 201]:
        return jsonify({"success": True})
    else:
        return jsonify({"error": "Failed to update GitHub", "detail": put_res.text}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
