// backend/router/paymentRoutes.js
import express from "express";
import Razorpay from "razorpay";
import { isAuthenticated } from "../middlewares/auth.js";
import { Auction } from "../models/auctionSchema.js";
import { Order } from "../models/orderSchema.js";
import crypto from "crypto";

const router = express.Router();

const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.warn(
      "Razorpay keys not set: RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing"
    );
    return null;
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

// Create Razorpay order for an Order
router.post("/create-order", isAuthenticated, async (req, res) => {
  try {
    const { amount, auctionId, orderId } = req.body;

    if (!amount || !auctionId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing amount or auctionId" });
    }

    const razorpay = getRazorpayInstance();
    if (!razorpay) {
      return res.status(500).json({
        success: false,
        message:
          "Razorpay keys missing in environment. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in config.env.",
      });
    }

    const receiptId =
      `order_${auctionId.toString().slice(-10)}` +
      "_" +
      Math.floor(Date.now() / 1000);

    const options = {
      amount: Number(amount),
      currency: "INR",
      receipt: receiptId,
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);

    return res.json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID,
      order,
      auctionId,
      orderId: orderId || null,
    });
  } catch (error) {
    console.error("create-order error", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
});

// Verify Razorpay payment and mark Order as paid (payout pending)
router.post("/verify-payment", isAuthenticated, async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      auctionId,
      orderId,
    } = req.body;

    if (
      !razorpay_payment_id ||
      !razorpay_order_id ||
      !razorpay_signature ||
      !auctionId ||
      !orderId
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing payment details or auction/order id",
      });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment signature" });
    }

    const orderDoc = await Order.findById(orderId)
      .populate("auction")
      .populate("winner")
      .populate("auctioneer");

    if (!orderDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (["paid"].includes(orderDoc.paymentStatus)) {
      return res.json({
        success: true,
        message: "Payment already verified.",
        order: orderDoc,
      });
    }

    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res
        .status(404)
        .json({ success: false, message: "Auction not found" });
    }

    const amount =
      orderDoc.price || auction.finalBidAmount || auction.currentBid || 0;
    const commissionRate = orderDoc.commissionRate || 0.05;
    const commissionAmount = Math.round(amount * commissionRate);
    const payoutAmount = amount - commissionAmount;

    // Bidder view: payment done
    orderDoc.paymentStatus = "paid";
    orderDoc.paidAt = new Date();
    orderDoc.paymentInfo = {
      transactionId: razorpay_payment_id,
      paidAmount: amount,
      paidVia: "Razorpay",
      paidByName: orderDoc.winner?.userName || "",
      paidAt: new Date(),
    };
    orderDoc.commissionAmount = commissionAmount;
    orderDoc.payoutAmount = payoutAmount;
    orderDoc.payoutStatus = "pending"; // holding at admin until delivery

    await orderDoc.save();

    // Auction view: payment done, held with admin
    auction.paymentStatus = "paid";
    auction.finalBidAmount = amount;
    await auction.save();

    return res.json({
      success: true,
      message: "Payment verified and order updated",
      order: orderDoc,
    });
  } catch (error) {
    console.error("verify-payment error", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
});

// Existing bidder my-orders and raise-complaint routes kept as-is
router.get("/my-orders", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await Auction.find({
      highestBidder: userId,
      status: { $in: ["ended", "completed"] },
      paymentStatus: { $in: ["holding", "paid"] },
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, orders });
  } catch (error) {
    console.error("Bidder my-orders error", error);
    res
      .status(500)
      .json({ success: false, message: "Could not fetch orders." });
  }
});

router.post("/raise-complaint", isAuthenticated, async (req, res) => {
  try {
    const { auctionId } = req.body;
    if (!auctionId) {
      return res.status(400).json({ message: "Auction ID is required." });
    }

    const auction = await Auction.findById(auctionId);
    if (!auction || String(auction.highestBidder) !== String(req.user.id)) {
      return res
        .status(404)
        .json({ message: "No matching order found for this user." });
    }

    auction.complaintStatus = "raised";
    await auction.save();

    res.json({
      success: true,
      message: "Complaint submitted. Admin will review the issue.",
    });
  } catch (error) {
    console.error("raise-complaint error", error);
    res
      .status(500)
      .json({ success: false, message: "Could not submit complaint." });
  }
});

export default router;
