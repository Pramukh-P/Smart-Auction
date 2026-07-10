// import { Response } from "express";

// export const generateToken = (user: any, message: string, statusCode: number, res: Response): void => {
//   const token = user.generateJsonWebToken();
//   const days = parseInt(process.env.COOKIE_EXPIRE || "7");
//   res.status(statusCode)
//     .cookie("token", token, {
//       expires: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
//     })
//     .json({ success: true, message, user, token });
// };

// export const sendPayoutToAuctioneer = async (upiId: string | undefined, amount: number, ref: string) => {
//   if (!upiId) throw new Error("Auctioneer UPI ID required for payout.");
//   // Razorpay payout integration
//   if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
//     const txId = `SIM_${Date.now()}`;
//     console.log(`💰 [SIMULATED] Payout ₹${amount} → ${upiId} | Ref: ${ref} | TxID: ${txId}`);
//     return { txId, mode: "simulated" };
//   }
//   try {
//     const Razorpay = require("razorpay");
//     const rz = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
//     const payout = await rz.payouts.create({
//       account_number: upiId, amount: Math.round(amount * 100),
//       currency: "INR", mode: "UPI", purpose: "payout",
//       queue_if_low_balance: true, narration: `SmartAuction payout ${ref}`
//     });
//     return { txId: payout.id, mode: "live" };
//   } catch (err: any) {
//     throw new Error(`Payout failed: ${err.message}`);
//   }
// };


import { Response } from "express";

export const generateToken = (user: any, message: string, statusCode: number, res: Response): void => {
  const token = user.generateJsonWebToken();
  const days = parseInt(process.env.COOKIE_EXPIRE || "7");
  res.status(statusCode)
    .cookie("token", token, {
      expires: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
    })
    .json({ success: true, message, user, token });
};

export const sendPayoutToAuctioneer = async (upiId: string | undefined, amount: number, ref: string) => {
  if (!upiId) throw new Error("Auctioneer UPI ID required for payout.");
  // Razorpay payout integration
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    const txId = `SIM_${Date.now()}`;
    console.log(`💰 [SIMULATED] Payout ₹${amount} → ${upiId} | Ref: ${ref} | TxID: ${txId}`);
    return { txId, mode: "simulated" };
  }
  try {
    const Razorpay = require("razorpay");
    const rz = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });

    // Payouts is a RazorpayX feature that only exists on a separate, KYC-approved
    // RazorpayX current account — it is NOT available on a standard Razorpay
    // payment-gateway account/SDK instance (the one used to accept bidder
    // payments). If it isn't set up, `rz.payouts` is undefined here. Rather than
    // crash the whole delivery-confirmation flow over it, fall back to a
    // simulated payout so orders can still complete; swap this for a real
    // RazorpayX integration once that account is set up.
    if (!rz.payouts || typeof rz.payouts.create !== "function") {
      const txId = `SIM_${Date.now()}`;
      console.warn(`⚠️ RazorpayX Payouts API not available on this account — simulating payout instead. Ref: ${ref}`);
      return { txId, mode: "simulated-fallback" };
    }

    const payout = await rz.payouts.create({
      account_number: upiId, amount: Math.round(amount * 100),
      currency: "INR", mode: "UPI", purpose: "payout",
      queue_if_low_balance: true, narration: `SmartAuction payout ${ref}`
    });
    return { txId: payout.id, mode: "live" };
  } catch (err: any) {
    throw new Error(`Payout failed: ${err.message}`);
  }
};
