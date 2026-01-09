// backend/models/orderSchema.js
import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema(
  {
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // bidder or auctioneer
    role: { type: String, enum: ["Bidder", "Auctioneer"], required: true },
    subject: String,
    message: String,
    createdAt: { type: Date, default: Date.now },
    replied: { type: Boolean, default: false },
    replyMessage: String,
    repliedAt: Date,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema({
  auction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Auction",
    required: true,
  },
  auctioneer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // Final winning price
  price: {
    type: Number,
    required: true,
  },

  paymentStatus: {
    type: String,
    enum: ["pending", "holding", "paid", "failed"],
    default: "pending",
  },

  shipmentDetails: {
    courier: String,
    trackingId: String,
    shippedDate: Date,
    notes: String,
  },

  deliveryStatus: {
    type: String,
    enum: ["pending", "shipped", "delivered", "completed", "problem"],
    default: "pending",
  },

  payoutStatus: {
    type: String,
    enum: ["pending", "processing", "done", "failed"],
    default: "pending",
  },

  commissionRate: {
    type: Number,
    default: 0.05,
  },
  commissionAmount: {
    type: Number,
    default: 0,
  },
  payoutAmount: {
    type: Number,
    default: 0,
  },

  complaintStatus: {
    type: String,
    enum: ["none", "open", "resolved", "blocked", "refund"],
    default: "none",
  },

  complaintResolvedAt: {
  type: Date,
  },


  // detailed complaint threads (bidder ↔ auctioneer)
  complaints: [complaintSchema],

  payoutTxId: {
    type: String,
  },

  // ⭐ Rating from bidder about auctioneer for this order
  rating: {
    type: Number, // 1–5 stars
    min: 1,
    max: 5,
  },
  ratingComment: {
    type: String,
  },
  ratingGivenAt: {
    type: Date,
  },

  // Flags to help home widgets
  showInBidderHome: {
    type: Boolean,
    default: true,
  },
  showInAuctioneerHome: {
    type: Boolean,
    default: true,
  },

  // Snapshot for republish safety
  snapshot: {
    auctionTitle: String,
    auctionImage: String,
    winnerName: String,
    auctioneerName: String,
    wonAt: Date,
  },

  paidAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Order = mongoose.model("Order", orderSchema);
