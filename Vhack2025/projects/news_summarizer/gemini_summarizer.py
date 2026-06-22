import os
import pandas as pd
import google.generativeai as genai

class BitcoinDataSummarizer:
    def __init__(self, gemini_api_key):
        """
        Initialize the Bitcoin Data Summarizer
        
        Args:
            gemini_api_key (str): Google Gemini API key
        """
        # Configure Gemini API
        genai.configure(api_key=gemini_api_key)
        
        # Path to sentiment data directory
        self.data_dir = 'bitcoin_sentiment_data'

    def load_csv_data(self):
        """
        Load data from CSV files in the sentiment data directory
        
        Returns:
            dict: Dictionary containing data from different CSV files
        """
        data_summary = {}
        
        # List of CSV files to process
        csv_files = [
            'news_sentiment.csv',
            'fear_greed_index.csv',
            'bitcoin_price.csv'
        ]
        
        for filename in csv_files:
            filepath = os.path.join(self.data_dir, filename)
            
            try:
                # Read CSV file
                df = pd.read_csv(filepath)
                
                # Store DataFrame for each file
                data_summary[filename] = df
                
                # Print basic information about the loaded data
                print(f"Loaded {filename}:")
                print(df.head())
                print("\n")
            
            except FileNotFoundError:
                print(f"File not found: {filename}")
            except Exception as e:
                print(f"Error reading {filename}: {e}")
        
        return data_summary

    def generate_bitcoin_summary(self, data_summary):
        """
        Generate a comprehensive summary using Gemini API
        
        Args:
            data_summary (dict): Dictionary of DataFrames with Bitcoin data
        
        Returns:
            str: Comprehensive summary of Bitcoin data
        """
        # Initialize Gemini model
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Prepare prompt with data from CSV files
        prompt = "Provide a comprehensive analysis of today's Bitcoin market based on the following data:\n\n"
        
        # Add news sentiment data
        if 'news_sentiment.csv' in data_summary:
            news_df = data_summary['news_sentiment.csv']
            prompt += "News Sentiment:\n"
            for _, row in news_df.iterrows():
                prompt += f"- Title: {row['title']}\n"
                prompt += f"  Sentiment Polarity: {row['polarity']}\n"
                prompt += f"  Subjectivity: {row['subjectivity']}\n"
        
        # Add Fear & Greed Index
        if 'fear_greed_index.csv' in data_summary:
            fg_df = data_summary['fear_greed_index.csv']
            prompt += "\nFear & Greed Index:\n"
            for _, row in fg_df.iterrows():
                prompt += f"- Value: {row.get('value', 'N/A')}\n"
                prompt += f"  Classification: {row.get('value_classification', 'N/A')}\n"
        
        # Add Bitcoin Price
        if 'bitcoin_price.csv' in data_summary:
            price_df = data_summary['bitcoin_price.csv']
            prompt += "\nBitcoin Price:\n"
            for _, row in price_df.iterrows():
                prompt += f"- Close Price: {row.get('close_price', 'N/A')}\n"
                prompt += f"  Volume: {row.get('volume', 'N/A')}\n"
        
        # Add context and request for analysis
        prompt += "\nProvide a comprehensive market analysis considering these data points. " \
                  "Discuss potential market trends, sentiment, and outlook. " \
                  "Include insights on price movement, news impact, and overall market sentiment. " \
                  "Format your response in clear, concise paragraphs."
        
        try:
            # Generate summary
            response = model.generate_content(prompt)
            return response.text
        
        except Exception as e:
            print(f"Error generating summary: {e}")
            return "Unable to generate summary due to an error."

    def save_summary(self, summary):
        """
        Save the generated summary to a text file
        
        Args:
            summary (str): Comprehensive Bitcoin market summary
        """
        # Ensure output directory exists
        os.makedirs('bitcoin_summaries', exist_ok=True)
        
        # Create filename with current date
        from datetime import datetime
        filename = f'bitcoin_market_summary_{datetime.now().strftime("%Y%m%d_%H%M%S")}.txt'
        filepath = os.path.join('bitcoin_summaries', filename)
        
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(summary)
            
            print(f"Summary saved to {filepath}")
        
        except Exception as e:
            print(f"Error saving summary: {e}")

    def run_bitcoin_data_analysis(self):
        """
        Orchestrate the entire Bitcoin data analysis process
        """
        # Load CSV data
        data_summary = self.load_csv_data()
        
        # Generate comprehensive summary
        bitcoin_summary = self.generate_bitcoin_summary(data_summary)
        
        # Print summary to console
        print("\n--- Bitcoin Market Summary ---")
        print(bitcoin_summary)
        
        # Save summary to file
        self.save_summary(bitcoin_summary)

def main():
    # Gemini API Key
    GEMINI_API_KEY = 'AIzaSyBi7e2Adkd5OAYK2O1aPfxObMgtnHr7aX0'
    
    # Initialize and run Bitcoin Data Summarizer
    summarizer = BitcoinDataSummarizer(
        gemini_api_key=GEMINI_API_KEY
    )
    
    # Run data analysis
    summarizer.run_bitcoin_data_analysis()

if __name__ == '__main__':
    main()

# Required Dependencies:
# pip install google-generativeai pandas