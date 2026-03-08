from flask import Flask, jsonify
from flask_cors import CORS
import csv

app = Flask(__name__)
CORS(app)  # allows your HTML page to talk to the server

@app.route('/data')
def get_data():
    rows = []
    with open('your_data.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return jsonify(rows)

if __name__ == '__main__':
    app.run(debug=True)