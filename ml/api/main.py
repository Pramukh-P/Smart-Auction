"""SmartAuction ML Price Prediction Service"""
import os, math, numpy as np, joblib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional

BASE = os.path.dirname(os.path.dirname(__file__))
MODEL_DIR = os.path.join(BASE, "model")
model = encoders = feature_names = None

def load():
    global model, encoders, feature_names
    mp = os.path.join(MODEL_DIR, "model.pkl")
    ep = os.path.join(MODEL_DIR, "encoders.pkl")
    fp = os.path.join(MODEL_DIR, "features.pkl")
    if all(os.path.exists(p) for p in [mp, ep, fp]):
        try:
            model = joblib.load(mp); encoders = joblib.load(ep); feature_names = joblib.load(fp)
            print("✅ ML model loaded")
        except Exception as e: print(f"❌ Load error: {e}")
    else: print("⚠️  Model files not found. Run: python train_model.py")

load()

app = FastAPI(title="SmartAuction ML", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class PredictReq(BaseModel):
    title: str = "Item"; category: str = "Electronics"
    condition: str = "Used"; starting_bid: float = Field(..., gt=0)
    duration_hours: Optional[float] = 72

MULTIPLIERS = {"Electronics":1.35,"Jewelry":1.50,"Art":1.45,"Collectibles":1.40,"Fashion":1.25,"Furniture":1.30,"Music":1.35,"Sports":1.30}

def fallback(req: PredictReq) -> float:
    m = MULTIPLIERS.get(req.category, 1.25) * (1.0 if req.condition=="New" else 0.88)
    return round(req.starting_bid * m * (1.0 + min((req.duration_hours or 72)/720, 0.15)))

@app.get("/health")
def health(): return {"status":"ok","model_loaded":model is not None}

@app.post("/predict")
def predict(req: PredictReq):
    if model is None:
        p = fallback(req)
        return {"predicted_price":p,"confidence_low":round(p*0.85),"confidence_high":round(p*1.15),"model":"rule_based"}
    try:
        enc = encoders or {}
        cat = enc.get("category"); cond = enc.get("condition")
        cat_v = int(cat.transform([req.category if req.category in cat.classes_ else cat.classes_[0]])[0]) if cat else 0
        cond_v = int(cond.transform([req.condition if req.condition in cond.classes_ else cond.classes_[0]])[0]) if cond else 0
        feats = np.array([[req.starting_bid, math.log1p(req.starting_bid), cat_v, cond_v, req.duration_hours or 72]])
        p = max(float(model.predict(feats)[0]), req.starting_bid)
        return {"predicted_price":round(p),"confidence_low":round(p*0.85),"confidence_high":round(p*1.15),"model":"random_forest"}
    except Exception as e:
        p = fallback(req)
        return {"predicted_price":p,"confidence_low":round(p*0.85),"confidence_high":round(p*1.15),"model":"fallback","error":str(e)}
