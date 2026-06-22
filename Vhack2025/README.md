# Vhack2025 — Bitcoin & Crypto Trading Projects

A consolidated collection of Bitcoin/crypto trading analysis and ML projects, including the Vhack2025 hackathon submission and related standalone projects.

All backends run on Python with Flask. Each project has an `app.py` and `templates/` folder for a simple web frontend.

## Repository structure

```
Vhack2025/
├── hackathon_submission/          # Original Vhack2025 hackathon work
│   ├── final_product/             # HMM + CNN + Ensemble (XGBoost, GradientBoost, MLP, LR, RF)
│   ├── final_product_alternative/ # HMM + CNN + LSTM
│   └── roadmap/                   # Learning journey & prototypes
│       ├── ai_model/              # DQN trading agent (first attempt)
│       ├── ensemble/              # Ensemble model on OHLCV data
│       ├── on_chain/              # On-chain data prototype (precursor to final product)
│       └── technical_analysis_simulation/  # Basic TA strategy backtesting (365 days)
│
├── projects/                      # Standalone Bitcoin projects (merged from separate repos)
│   ├── technical_analysis/        # Bitcoin technical analysis indicators & simulation
│   ├── ensemble_model/            # Ensemble model for trading signals
│   ├── news_summarizer/           # Bitcoin news fetcher & AI summarizer (Gemini)
│   ├── training_project/          # Trading engine training experiments
│   └── prediction/                # Bitcoin price prediction (TensorFlow/Keras, 30-day forecast)
```

## Hackathon submission

- **`final_product/`** — the main submission for judges. Uses HMM, CNN, and an ensemble of XGBoost, GradientBoost, MLP, Linear Regression, and Random Forest.
- **`final_product_alternative/`** — alternative version using HMM, CNN, and LSTM.
- **`roadmap/`** — step-by-step learning progression from basic TA to on-chain analysis to DQN agents. Useful for beginners starting from zero.

## Merged projects

These were originally separate repositories, consolidated here for organization:

| Project | Description | Originally from |
|---------|-------------|-----------------|
| `technical_analysis` | Bitcoin TA indicators, volume analysis, strategy simulation | `Bitcoin_Technical_Analysis` |
| `ensemble_model` | Ensemble model (XGBoost, RF, etc.) for trading decisions | `Ensemble_Model_Testing` |
| `news_summarizer` | Fetches Bitcoin news and summarizes with Gemini AI | `BItcoin_News_Summarizer` |
| `training_project` | Trading engine for training and backtesting | `Bitcoin_Training_Project` |
| `prediction` | 30-day Bitcoin price prediction with TensorFlow/Keras | `Bitcoin_Prediction` |

## Running any project

```bash
cd <project_folder>
pip install -r requirements.txt  # if available
python app.py
```

Then open `http://localhost:5000` in your browser.
