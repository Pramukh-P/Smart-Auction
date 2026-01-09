# ml/api/predictor.py
import os
import joblib
import xgboost as xgb
import numpy as np
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MODEL_PATH = os.path.join(BASE_DIR, "model", "auction_price_xgb.json")
ENCODER_PATH = os.path.join(BASE_DIR, "model", "category_encoder.pkl")

model = xgb.XGBRegressor()
model.load_model(MODEL_PATH)

category_encoder = joblib.load(ENCODER_PATH)

# -------------------------------
# Feature builder for inference
# -------------------------------
def predict_price(payload: dict) -> int:
    starting_bid = payload["startingBid"]
    category = payload["category"]
    condition = 1 if payload["condition"] == "New" else 0
    seller_rating = payload.get("sellerRating", 0)

    start_time = datetime.fromisoformat(payload["startTime"])
    start_weekday = start_time.weekday()
    start_hour = start_time.hour

    avg_comparable_price = payload.get("avgComparablePrice", 0)
    avg_comparable_bid_count = payload.get("avgComparableBidCount", 0)

    # ✅ SAFE category encoding
    if category in category_encoder.classes_:
        category_encoded = int(category_encoder.transform([category])[0])
    else:
        category_encoded = 0  # fallback

    X = np.array([[
        starting_bid,
        category_encoded,
        condition,
        seller_rating,
        start_weekday,
        start_hour,
        avg_comparable_price,
        avg_comparable_bid_count
    ]])

    prediction = model.predict(X)[0]
    prediction = max(prediction, starting_bid)

    return int(round(prediction))