// backend/utils/payoutHelper.js
import Razorpay from "razorpay";
import { config } from "dotenv";
config({ path: "./config/config.env" });

let razorpay;
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn("⚠️ RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET not set. Payouts will not work.");
} else {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

/**
 * Send payout to auctioneer after delivery is confirmed.
 * @param {String} upiId - Auctioneer's UPI ID
 * @param {Number} amount - Amount to be sent (in INR)
 * @param {String} auctionId - Reference ID for transaction
 */
export const sendPayoutToAuctioneer = async (upiId, amount, auctionId) => {
  if (!razorpay) throw new Error("Razorpay not initialized. Check keys in .env");
  if (!upiId) throw new Error("Auctioneer UPI ID is required for payout");
  if (!amount || amount <= 0) throw new Error("Amount must be greater than zero");

  try {
    // In TEST mode, just log payout; for real, setup payout via RazorpayX API.
    console.log(`Simulated Payout: UPI: ${upiId}, Amount: ₹${amount}, Ref: ${auctionId}`);
    return { success: true,txId: `TEST-${Date.now()}`, mode: "test", amount, upiId, ref: auctionId };

    // Uncomment below for real payout
    // const payoutOptions = {
    //   account_number: "YOUR_RAZORPAYX_ACCOUNT_NUMBER",
    //   fund_account: {
    //     account_type: "vpa",
    //     vpa: { address: upiId },
    //     contact: { name: "Auctioneer", type: "vendor" }
    //   },
    //   amount: Math.round(amount * 100),
    //   currency: "INR",
    //   mode: "UPI",
    //   purpose: "payout",
    //   queue_if_low_balance: true,
    //   reference_id: auctionId,
    //   narration: "SmartAuction Sale Payout",
    // };
    // const payout = await razorpay.payouts.create(payoutOptions);
    // console.log("✅ Payout Successful:", payout);
    // return payout;

  } catch (error) {
    console.error("❌ Payout Error:", error);
    throw error;
  }
};
