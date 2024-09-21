from flask import Flask, render_template, jsonify, request
import random

app = Flask(__name__)

# List of Korean words (you can expand this list)
korean_words = [
    '안녕하세요', '감사합니다', '사랑해요', '행복', '가족',
    '친구', '학교', '음식', '여행', '책', '영화', '음악'
]

simple_words = ['안녕', '학교', '책', '친구', '사랑', '가족']
advanced_words = ['안녕하세요', '감사합니다', '사랑해요', '행복', '여행', '영화', '음악']

current_words = simple_words.copy()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_word')
def get_word():
    return jsonify({'word': random.choice(current_words)})

@app.route('/update_words', methods=['POST'])
def update_words():
    data = request.json
    level = data.get('level')
    global current_words
    if level > 1:
        current_words = advanced_words
    else:
        current_words = simple_words
    return jsonify({'success': True})

@app.route('/log', methods=['POST'])
def log():
    message = request.json.get('message')
    print("JavaScript Console:", message)
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True)