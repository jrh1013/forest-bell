from flask import Flask, render_template, request, redirect, url_for, jsonify
import json
import os

app = Flask(__name__)
DATA_FILE = os.path.join(os.path.dirname(__file__), '../data/reservations.json')

def load_data():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

@app.route('/')
def index():
    reservations = load_data()
    return render_template('index.html', reservations=reservations, count=len(reservations))

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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
