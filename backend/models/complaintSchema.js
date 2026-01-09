// backend/models/complaintSchema.js
import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reason: { type: String, required: true },
  adminNote: String,
  status: {
    type: String,
    enum: ["open", "resolved", "blocked", "refund"],
    default: "open",
  },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: Date,
});

export const Complaint = mongoose.model("Complaint", complaintSchema);
