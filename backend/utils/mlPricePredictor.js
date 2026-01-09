// backend/utils/mlPricePredictor.js
import axios from "axios";

export const predictAuctionPriceML = async ({
  startingBid,
  category,
  condition,
  sellerRating,
  startTime,
  avgComparablePrice = 0,
  avgComparableBidCount = 0,
}) => {
  try {
    const response = await axios.post(
      process.env.ML_PREDICT_URL,
      {
        startingBid,
        category,
        condition,
        sellerRating,
        startTime,
        avgComparablePrice,
        avgComparableBidCount,
      },
      { timeout: 1500 }
    );

    return response.data?.predictedPrice || null;
  } catch (error) {
    console.error("ML price prediction failed:", error.message);
    return null;
  }
};
