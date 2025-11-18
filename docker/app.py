from flask import Flask, jsonify
import os

app = Flask(__name__)

@app.route('/')
def home():
    return jsonify({"message": "Hello from secure Flask to the whole heise Classroom!"})

@app.route('/health')
def health():
    return jsonify({"status": "healthy"}), 200

if __name__ == '__main__':
    # Nur für Development - Production nutzt Gunicorn
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 8080)))
