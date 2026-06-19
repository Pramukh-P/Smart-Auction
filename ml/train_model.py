"""
SmartAuction ML Model Trainer
Run: python train_model.py
"""
import os, joblib, numpy as np, pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")
os.makedirs(MODEL_DIR, exist_ok=True)

DATA = [
    ("Vintage Leather Jacket","Fashion","Used",350,48,520),
    ("Antique Oak Writing Desk","Furniture","Used",1200,72,1850),
    ("Digital Camera DSLR","Electronics","Used",500,96,720),
    ("Vintage Record Collection","Music","Used",650,120,890),
    ("Smart Watch Series 7","Electronics","New",250,72,310),
    ("Handcrafted Pottery Set","Art","New",120,48,165),
    ("iPhone 14 Pro","Electronics","Used",800,72,1100),
    ("Rolex Submariner","Jewelry","Used",5000,120,7200),
    ("Mountain Bike","Sports","Used",400,48,580),
    ("Guitar Gibson Les Paul","Music","Used",2000,96,2800),
    ("Dining Table Set","Furniture","Used",800,48,1100),
    ("Sony PlayStation 5","Electronics","New",450,24,520),
    ("Vintage Camera","Collectibles","Used",200,72,310),
    ("Nike Air Jordan 1","Fashion","New",150,48,230),
    ("MacBook Pro","Electronics","Used",1200,72,1650),
    ("Antique Vase","Art","Used",3000,168,4500),
    ("Trek Road Bicycle","Sports","Used",600,96,850),
    ("Mid Century Coffee Table","Furniture","Used",300,48,420),
    ("Sony WH-1000XM5","Electronics","New",300,48,380),
    ("Vintage Coca-Cola Sign","Collectibles","Used",180,120,265),
    ("Diamond Ring","Jewelry","Used",8000,96,11500),
    ("Vintage Typewriter","Collectibles","Used",400,72,590),
    ("Oil Painting Landscape","Art","Used",2500,120,3600),
    ("Gaming PC RTX 4080","Electronics","New",2000,48,2400),
    ("Vintage Denim Jacket","Fashion","Used",200,96,285),
]

def train():
    df = pd.DataFrame(DATA, columns=["title","category","condition","starting_bid","duration_hours","final_bid"])
    df["log_bid"] = np.log1p(df["starting_bid"])
    encoders = {}
    for col in ["category","condition"]:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col])
        encoders[col] = le
    FEATURES = ["starting_bid","log_bid","category","condition","duration_hours"]
    X, y = df[FEATURES], df["final_bid"]
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
    mdl = RandomForestRegressor(n_estimators=200, max_depth=10, random_state=42, n_jobs=-1)
    mdl.fit(X_tr, y_tr)
    preds = mdl.predict(X_te)
    print(f"✅ MAE: ₹{mean_absolute_error(y_te, preds):.0f} | R²: {r2_score(y_te, preds):.3f}")
    joblib.dump(mdl, os.path.join(MODEL_DIR, "model.pkl"))
    joblib.dump(encoders, os.path.join(MODEL_DIR, "encoders.pkl"))
    joblib.dump(FEATURES, os.path.join(MODEL_DIR, "features.pkl"))
    print(f"💾 Saved to {MODEL_DIR}/")

if __name__ == "__main__":
    train()
