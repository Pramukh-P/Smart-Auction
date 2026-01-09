# ml/train_model.py
import os
import random
import joblib
import pandas as pd
import numpy as np
import xgboost as xgb
from datetime import datetime, timedelta
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from mongo import get_db
from feature_builder import build_features

os.makedirs("model", exist_ok=True)

# --------------------------------------------------
# CONFIG
# --------------------------------------------------
MIN_REAL_RECORDS = 30        # minimum real auctions required
SEED_RECORDS = 120           # synthetic records to generate
MODEL_PATH = "model/auction_price_xgb.json"
ENCODER_PATH = "model/category_encoder.pkl"

# --------------------------------------------------
# MongoDB
# --------------------------------------------------
print("🔗 Connecting to MongoDB...")
db = get_db()
auctions_col = db.auctions
users_col = db.users

# --------------------------------------------------
# Fetch real auctions
# --------------------------------------------------
print("📦 Fetching completed / ended auctions...")

real_auctions = list(
    auctions_col.find({
        "status": {"$in": ["ended", "completed"]},
        "finalBidAmount": {"$gt": 0}
    })
)

rows = []

for auction in real_auctions:
    seller = users_col.find_one({"_id": auction["createdBy"]})

    comparables = list(
        auctions_col.find({
            "category": auction["category"],
            "status": {"$in": ["ended", "completed"]},
            "finalBidAmount": {"$gt": 0},
            "_id": {"$ne": auction["_id"]}
        })
        .sort("endTime", -1)
        .limit(5)
    )

    rows.append(build_features(auction, seller, comparables))

print(f"📊 Real auction records found: {len(rows)}")

# --------------------------------------------------
# SEED DATA IF NEEDED
# --------------------------------------------------
if len(rows) < MIN_REAL_RECORDS:
    print("⚠️ Not enough real data. Seeding historical auction data...")

    categories = [
        "Electronics", "Mobiles", "Fashion",
        "Home Appliances", "Furniture", "Books", "Vehicles"
    ]

    for _ in range(SEED_RECORDS):
        starting_bid = random.randint(500, 20000)

        final_price = int(
            starting_bid * random.uniform(1.2, 3.5)
        )

        fake_start = datetime.now() - timedelta(
            days=random.randint(30, 365)
        )

        rows.append({
            "startingBid": starting_bid,
            "category": random.choice(categories),
            "condition": random.choice([0, 1]),
            "seller_rating": round(random.uniform(3.0, 5.0), 2),
            "start_weekday": fake_start.weekday(),
            "start_hour": random.randint(8, 22),
            "avg_comparable_price": final_price * random.uniform(0.8, 1.2),
            "avg_comparable_bid_count": random.randint(5, 25),
            "finalBidAmount": final_price
        })

    print(f"🧪 Seeded {SEED_RECORDS} synthetic auctions")

# --------------------------------------------------
# Create DataFrame
# --------------------------------------------------
df = pd.DataFrame(rows)
print(f"✅ Training dataset shape: {df.shape}")

# --------------------------------------------------
# Encode category
# --------------------------------------------------
cat_encoder = LabelEncoder()
df["category_encoded"] = cat_encoder.fit_transform(df["category"])

X = df[
    [
        "startingBid",
        "category_encoded",
        "condition",
        "seller_rating",
        "start_weekday",
        "start_hour",
        "avg_comparable_price",
        "avg_comparable_bid_count",
    ]
]

y = df["finalBidAmount"]

# --------------------------------------------------
# Train / Test Split
# --------------------------------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# --------------------------------------------------
# Train XGBoost Model
# --------------------------------------------------
print("🚀 Training XGBoost Regressor...")

model = xgb.XGBRegressor(
    n_estimators=350,
    max_depth=6,
    learning_rate=0.07,
    subsample=0.85,
    colsample_bytree=0.85,
    objective="reg:squarederror",
    random_state=42
)

model.fit(X_train, y_train)

score = model.score(X_test, y_test)
print(f"🎯 Model R² Score: {round(score * 100, 2)}%")

# --------------------------------------------------
# Save Model & Encoder
# --------------------------------------------------
model.save_model(MODEL_PATH)
joblib.dump(cat_encoder, ENCODER_PATH)

print("💾 Model saved successfully")
print("✅ Training pipeline completed")
