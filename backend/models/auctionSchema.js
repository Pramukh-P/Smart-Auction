// backend/models/auctionSchema.js
import mongoose from "mongoose";

const auctionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  startingBid: { type: Number, required: true },
  category: { type: String, required: true },
  condition: {
    type: String,
    enum: ["New", "Used"],
    required: true,
  },
  currentBid: { type: Number, default: 0 },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },

  status: {
    type: String,
    enum: ["active", "ended", "completed"],
    default: "active",
  },

  image: {
    public_id: { type: String, required: true },
    url: { type: String, required: true },
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },

  bids: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      userName: String,
      profileImage: String,
      amount: Number,
    },
  ],

  highestBidder: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  highestBidderName: { type: String, default: "" },
  highestBidderEmail: { type: String, default: "" },

  complaintStatus: {
    type: String,
    enum: ["none", "raised", "resolved"],
    default: "none",
  },

  // === Payment & Delivery Tracking ===
  finalBidAmount: { type: Number, default: 0 }, // Winning bid amount
  auctioneerUpiId: { type: String, default: "" }, // Payout UPI ID

  paymentStatus: {
    // Tracks the state of the winner’s payment
    type: String,
    enum: ["pending", "holding", "paid", "failed"],
    default: "pending",
  },

  // Delivery status flow controlled by auctioneer + admin
  deliveryStatus: {
    type: String,
    enum: ["Pending", "Shipped", "Delivered", "Completed"],
    default: "Pending",
  },

  shipmentDetails: {
    courier: { type: String },
    trackingNumber: { type: String },
    shippedAt: { type: Date },
  },

  payoutReleased: {
    // True when 95% payout to auctioneer done by admin
    type: Boolean,
    default: false,
  },

  commissionCalculated: {
    // True when system computed 95/5 split
    type: Boolean,
    default: false,
  },

  // ==== AI helpers (generated once per auction) ====
  aiDescription: { type: String },
  aiPricePrediction: { type: Number },

  createdAt: { type: Date, default: Date.now },
});

// Index to optimize admin filtering (paid + shipped + not yet released)
auctionSchema.index({
  paymentStatus: 1,
  deliveryStatus: 1,
  payoutReleased: 1,
});

export const Auction = mongoose.model("Auction", auctionSchema);
