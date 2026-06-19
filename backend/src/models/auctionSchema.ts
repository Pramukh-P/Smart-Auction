import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBidEntry {
  userId: mongoose.Types.ObjectId;
  userName: string;
  profileImage?: string;
  amount: number;
  timestamp: Date;
}

export interface IAuctionDocument extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  startingBid: number;
  category: string;
  condition: "New" | "Used";
  currentBid: number;
  startTime: Date;
  endTime: Date;
  status: "active" | "ended" | "completed";
  image: { public_id: string; url: string };
  createdBy: mongoose.Types.ObjectId;
  winner?: mongoose.Types.ObjectId | null;
  bids: IBidEntry[];
  highestBidder?: mongoose.Types.ObjectId | null;
  highestBidderName: string;
  highestBidderEmail: string;
  finalBidAmount: number;
  paymentStatus: "pending" | "holding" | "paid" | "failed";
  paymentDeadline?: Date;
  deliveryStatus: "Pending" | "Shipped" | "Delivered" | "Completed";
  payoutReleased: boolean;
  commissionCalculated: boolean;
  aiDescription?: string;
  aiPricePrediction?: number;
  republishCount: number;
  questions: { userId: mongoose.Types.ObjectId; userName: string; question: string; answer?: string; askedAt: Date }[];
  createdAt: Date;
}

const auctionSchema = new Schema<IAuctionDocument>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  startingBid: { type: Number, required: true },
  category: { type: String, required: true },
  condition: { type: String, enum: ["New","Used"], required: true },
  currentBid: { type: Number, default: 0 },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: { type: String, enum: ["active","ended","completed"], default: "active" },
  image: { public_id: { type: String, required: true }, url: { type: String, required: true } },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  winner: { type: Schema.Types.ObjectId, ref: "User", default: null },
  bids: [{
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: String, profileImage: String, amount: Number,
    timestamp: { type: Date, default: Date.now }, _id: false
  }],
  highestBidder: { type: Schema.Types.ObjectId, ref: "User", default: null },
  highestBidderName: { type: String, default: "" },
  highestBidderEmail: { type: String, default: "" },
  finalBidAmount: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ["pending","holding","paid","failed"], default: "pending" },
  paymentDeadline: Date,
  deliveryStatus: { type: String, enum: ["Pending","Shipped","Delivered","Completed"], default: "Pending" },
  payoutReleased: { type: Boolean, default: false },
  commissionCalculated: { type: Boolean, default: false },
  aiDescription: String,
  aiPricePrediction: Number,
  republishCount: { type: Number, default: 0 },
  questions: [{
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    userName: String, question: String, answer: String,
    askedAt: { type: Date, default: Date.now }, _id: false
  }],
  createdAt: { type: Date, default: Date.now }
});

auctionSchema.index({ status: 1, endTime: 1 });
auctionSchema.index({ status: 1, startTime: 1 });

export const Auction: Model<IAuctionDocument> = mongoose.model<IAuctionDocument>("Auction", auctionSchema);
