// backend/models/commissionSchema.js
import mongoose from "mongoose";

const commissionSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
  },

  // Link back to order (for debugging / drill-down)
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },

  // Link back to auction
  auction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Auction",
    required: true,
  },

  // Auctioneer who paid this commission
  auctioneer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // Optional label: "Auto Payout" / "Manual Proof"
  source: {
    type: String,
    default: "Auto Payout",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// helpful index for monthly aggregation
commissionSchema.index({ createdAt: 1 });

export const Commission = mongoose.model(
  "Commission",
  commissionSchema
);
