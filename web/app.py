from flask import Flask, render_template, request, redirect, url_for, jsonify
import json, os, threading, time, subprocess

app = Flask(__name__)
DATA_FILE = os.path.join(os.path.dirname(__file__), '../data/reservations.json')

monitoring = False
monitor_thread = None

def load_data():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def monitor_loop():
    global monitoring
    while monitoring:
        print("✅ 모니터링 실행 중...")
        subprocess.run(["node", "../scripts/check.js"])
        time.sleep(180)  # 3분 대기

@app.route('/')
def index():
    reservations = load_data()
    return render_template('index.html', reservations=reservations, count=len(reservations), monitoring=monitoring)

@app.route('/add', methods=['GET', 'POST'])
def add():
    if request.method == 'POST':
        region = request.form['region']
        date = request.form['date']
        reservations = load_data()
        if len(reservations) < 15:
            reservations.append({'region': region, 'date': date})
            save_data(reservations)
        return redirect(url_for('index'))
    return render_template('add.html')

@app.route('/delete/<int:index>')
def delete(index):
    reservations = load_data()
    if 0 <= index < len(reservations):
        reservations.pop(index)
        save_data(reservations)
    return redirect(url_for('index'))

@app.route('/start', methods=['POST'])
def start_monitoring():
    global monitoring, monitor_thread
    if not monitoring:
        monitoring = True
        monitor_thread = threading.Thread(target=monitor_loop)
        monitor_thread.daemon = True
        monitor_thread.start()
    return jsonify({"status": "running"})

@app.route('/stop', methods=['POST'])
def stop_monitoring():
    global monitoring
    monitoring = False
    return jsonify({"status": "stopped"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
