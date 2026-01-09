# ml/api/app.py
from fastapi import FastAPI
from pydantic import BaseModel
from .predictor import predict_price

app = FastAPI(title="Auction Price Prediction Service")

# -------------------------------
# Request schema
# -------------------------------
class PredictionRequest(BaseModel):
    startingBid: float
    category: str
    condition: str
    sellerRating: float
    startTime: str
    avgComparablePrice: float = 0
    avgComparableBidCount: float = 0


# -------------------------------
# Health check
# -------------------------------
@app.get("/health")
def health():
    return {"status": "ok"}


# -------------------------------
# Prediction endpoint
# -------------------------------
@app.post("/predict-price")
def predict(request: PredictionRequest):
    predicted_price = predict_price(request.dict())
    return {
        "predictedPrice": predicted_price
    }
