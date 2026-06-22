import os
import csv
from datetime import datetime
import requests
import pandas as pd
from textblob import TextBlob
import tweepy
import yfinance as yf

class BitcoinSentimentAnalyzer:
    def __init__(self, twitter_api_key, twitter_api_secret, twitter_access_token, twitter_access_token_secret):
        """
        Initialize the Bitcoin Sentiment Analyzer with API credentials
        
        Args:
            twitter_api_key (str): Twitter API key
            twitter_api_secret (str): Twitter API secret
            twitter_access_token (str): Twitter access token
            twitter_access_token_secret (str): Twitter access token secret
        """
        # Twitter API Authentication
        auth = tweepy.OAuthHandler(twitter_api_key, twitter_api_secret)
        auth.set_access_token(twitter_access_token, twitter_access_token_secret)
        self.twitter_api = tweepy.API(auth)
        
        # Ensure output directory exists
        os.makedirs('bitcoin_sentiment_data', exist_ok=True)

    def fetch_twitter_sentiment(self, query='Bitcoin', max_tweets=100):
        """
        Fetch and analyze sentiment of tweets about Bitcoin
        
        Args:
            query (str): Search query for tweets
            max_tweets (int): Maximum number of tweets to fetch
        
        Returns:
            list: List of tweet sentiment data
        """
        sentiment_data = []
        
        try:
            # Fetch tweets
            tweets = tweepy.Cursor(self.twitter_api.search_tweets, 
                                   q=query, 
                                   lang='en', 
                                   tweet_mode='extended').items(max_tweets)
            
            for tweet in tweets:
                # Perform sentiment analysis
                full_text = tweet.full_text
                blob = TextBlob(full_text)
                
                sentiment_data.append({
                    'timestamp': tweet.created_at,
                    'text': full_text,
                    'polarity': blob.sentiment.polarity,
                    'subjectivity': blob.sentiment.subjectivity
                })
        
        except Exception as e:
            print(f"Error fetching Twitter sentiment: {e}")
        
        return sentiment_data

    def fetch_news_sentiment(self):
        """
        Fetch news sentiment using NewsAPI
        Note: Replace 'YOUR_NEWS_API_KEY' with an actual NewsAPI key
        
        Returns:
            list: List of news sentiment data
        """
        news_sentiment_data = []
        
        try:
            # Note: You'll need to replace with an actual NewsAPI key
            news_api_key = 'ced5e2bcf3864a42a247c4ed476ba927'
            url = f'https://newsapi.org/v2/everything?q=Bitcoin&language=en&sortBy=publishedAt&apiKey={news_api_key}'
            
            response = requests.get(url)
            news_data = response.json()
            
            for article in news_data.get('articles', []):
                # Perform basic sentiment analysis on article title
                blob = TextBlob(article['title'])
                
                news_sentiment_data.append({
                    'timestamp': article['publishedAt'],
                    'title': article['title'],
                    'source': article['source']['name'],
                    'polarity': blob.sentiment.polarity,
                    'subjectivity': blob.sentiment.subjectivity
                })
        
        except Exception as e:
            print(f"Error fetching news sentiment: {e}")
        
        return news_sentiment_data

    def fetch_fear_and_greed_index(self):
        """
        Fetch the Crypto Fear & Greed Index
        
        Returns:
            dict: Fear and Greed Index data
        """
        try:
            # Alternative API for Fear & Greed Index
            url = 'https://api.alternative.me/fng/'
            response = requests.get(url)
            data = response.json()
            
            return {
                'timestamp': datetime.now(),
                'value': data['data'][0]['value'],
                'value_classification': data['data'][0]['value_classification']
            }
        
        except Exception as e:
            print(f"Error fetching Fear & Greed Index: {e}")
            return None

    def fetch_bitcoin_price(self):
        """
        Fetch current Bitcoin price
        
        Returns:
            dict: Bitcoin price data
        """
        try:
            # Fetch Bitcoin price using yfinance
            bitcoin = yf.Ticker('BTC-USD')
            history = bitcoin.history(period='1d')
            
            return {
                'timestamp': datetime.now(),
                'close_price': history['Close'].iloc[-1],
                'volume': history['Volume'].iloc[-1]
            }
        
        except Exception as e:
            print(f"Error fetching Bitcoin price: {e}")
            return None

    def save_to_csv(self, data, filename):
        """
        Save data to CSV file
        
        Args:
            data (list): List of dictionaries to save
            filename (str): Name of the CSV file
        """
        if not data:
            print(f"No data to save for {filename}")
            return
        
        filepath = os.path.join('bitcoin_sentiment_data', filename)
        
        # Convert data to DataFrame
        df = pd.DataFrame(data)
        
        # Save to CSV
        df.to_csv(filepath, index=False)
        print(f"Data saved to {filepath}")

    def run_sentiment_analysis(self):
        """
        Run comprehensive sentiment analysis and save results
        """
        # Fetch Twitter sentiment
        twitter_sentiment = self.fetch_twitter_sentiment()
        self.save_to_csv(twitter_sentiment, 'twitter_sentiment.csv')
        
        # Fetch News sentiment
        news_sentiment = self.fetch_news_sentiment()
        self.save_to_csv(news_sentiment, 'news_sentiment.csv')
        
        # Fetch Fear & Greed Index
        fear_greed = self.fetch_fear_and_greed_index()
        if fear_greed:
            self.save_to_csv([fear_greed], 'fear_greed_index.csv')
        
        # Fetch Bitcoin Price
        bitcoin_price = self.fetch_bitcoin_price()
        if bitcoin_price:
            self.save_to_csv([bitcoin_price], 'bitcoin_price.csv')

def main():
    # Replace these with your actual API credentials
    TWITTER_API_KEY = 'VZI1qv5aLHaMP1uKYm0mVjxmi'
    TWITTER_API_SECRET = 'MD3aleOgOunXicSA5Uut29qaGTRiegm0QYLt4V0ZlnoAoIoFdr'
    TWITTER_ACCESS_TOKEN = '1473959633928679424-ekP6hB7U8wOep62w6c4Lw1ZgOhm7ty'
    TWITTER_ACCESS_TOKEN_SECRET = 'uxDT7U2yD92NnjCNd3icmcOihEWn6rovdQgKhte9iWpYt'
    
    # Initialize and run sentiment analyzer
    analyzer = BitcoinSentimentAnalyzer(
        TWITTER_API_KEY, 
        TWITTER_API_SECRET, 
        TWITTER_ACCESS_TOKEN, 
        TWITTER_ACCESS_TOKEN_SECRET
    )
    
    # Run sentiment analysis
    analyzer.run_sentiment_analysis()

if __name__ == '__main__':
    main()

# Required Dependencies:
# pip install requests textblob tweepy yfinance pandas