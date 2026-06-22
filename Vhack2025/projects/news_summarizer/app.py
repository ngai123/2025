from flask import Flask, render_template, jsonify
from bitcoin_news_summarizer import BitcoinDataAnalyzer  # Import from separate analyzer.py

app = Flask(__name__)

# API Credentials (Replace with your actual credentials)
TWITTER_API_KEY = 'VZI1qv5aLHaMP1uKYm0mVjxmi'
TWITTER_API_SECRET = 'MD3aleOgOunXicSA5Uut29qaGTRiegm0QYLt4V0ZlnoAoIoFdr'
TWITTER_ACCESS_TOKEN = '1473959633928679424-ekP6hB7U8wOep62w6c4Lw1ZgOhm7ty'
TWITTER_ACCESS_TOKEN_SECRET = 'uxDT7U2yD92NnjCNd3icmcOihEWn6rovdQgKhte9iWpYt'
GEMINI_API_KEY = 'AIzaSyBi7e2Adkd5OAYK2O1aPfxObMgtnHr7aX0'
NEWS_API_KEY = 'ced5e2bcf3864a42a247c4ed476ba927'

# Initialize the analyzer instance
analyzer_instance = BitcoinDataAnalyzer(
    TWITTER_API_KEY,
    TWITTER_API_SECRET,
    TWITTER_ACCESS_TOKEN,
    TWITTER_ACCESS_TOKEN_SECRET,
    GEMINI_API_KEY,
    NEWS_API_KEY
)

@app.route('/')
def index():
    """Render the main page."""
    return render_template('index.html')

@app.route('/generate', methods=['GET'])
def generate():
    """Generate Bitcoin analysis and return the summary."""
    try:
        summary = analyzer_instance.run_comprehensive_analysis()
        return jsonify({'summary': summary})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)