// backend/models/notificationSchema.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    auction: { type: mongoose.Schema.Types.ObjectId, ref: "Auction" }, // ✅ add
    message: { type: String, required: true },
    seen: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Notification = mongoose.model("Notification", notificationSchema);
