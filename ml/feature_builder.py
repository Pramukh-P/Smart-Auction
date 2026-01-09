# ml/feature_builder.py
import pandas as pd
import numpy as np

def compute_seller_rating(user):
    if not user:
        return 0
    count = user.get("ratingCount", 0)
    total = user.get("ratingSum", 0)
    return round(total / count, 2) if count > 0 else 0


def build_features(auction, seller, comparables):
    start_time = auction["startTime"]

    avg_price = (
        np.mean([c["finalBidAmount"] for c in comparables])
        if comparables else 0
    )

    avg_bid_count = (
        np.mean([len(c.get("bids", [])) for c in comparables])
        if comparables else 0
    )

    return {
        "startingBid": auction["startingBid"],
        "category": auction["category"],
        "condition": 1 if auction["condition"] == "New" else 0,
        "seller_rating": compute_seller_rating(seller),
        "start_weekday": start_time.weekday(),
        "start_hour": start_time.hour,
        "avg_comparable_price": avg_price,
        "avg_comparable_bid_count": avg_bid_count,
        "finalBidAmount": auction["finalBidAmount"]
    }
