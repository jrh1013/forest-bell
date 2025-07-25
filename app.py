from flask import Flask, render_template
import os

app = Flask(__name__, template_folder="templates", static_folder="static")

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/add")
def add_page():
    return render_template("add.html")

@app.route("/token")
def token_page():
    return render_template("token.html")

@app.route("/ping")
def ping():
    return "pong"

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
