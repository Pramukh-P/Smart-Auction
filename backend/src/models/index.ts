import mongoose, { Schema, Document, Model } from "mongoose";

// ── Bid ─────────────────────────────────────────────────────────────────────
export interface IBidDocument extends Document {
  amount: number;
  bidder: { id: mongoose.Types.ObjectId; userName: string; profileImage?: string };
  auctionItem: mongoose.Types.ObjectId;
}
export const Bid: Model<IBidDocument> = mongoose.model<IBidDocument>("Bid", new Schema<IBidDocument>({
  amount: Number,
  bidder: { id: { type: Schema.Types.ObjectId, ref: "User" }, userName: String, profileImage: String },
  auctionItem: { type: Schema.Types.ObjectId, ref: "Auction" }
}));

// ── Notification ─────────────────────────────────────────────────────────────
export interface INotificationDocument extends Document {
  user: mongoose.Types.ObjectId;
  auction?: mongoose.Types.ObjectId;
  type: "bid" | "win" | "payment" | "relist" | "system" | "outbid" | "extended";
  message: string;
  seen: boolean;
  link?: string;
  createdAt: Date;
}
export const Notification: Model<INotificationDocument> = mongoose.model<INotificationDocument>("Notification",
  new Schema<INotificationDocument>({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    auction: { type: Schema.Types.ObjectId, ref: "Auction" },
    type: { type: String, enum: ["bid","win","payment","relist","system","outbid","extended"], default: "system" },
    message: { type: String, required: true },
    seen: { type: Boolean, default: false },
    link: String,
    createdAt: { type: Date, default: Date.now }
  }, { timestamps: false })
);

// ── PaymentProof ─────────────────────────────────────────────────────────────
export interface IPaymentProofDocument extends Document {
  userId: mongoose.Types.ObjectId;
  proof: { public_id: string; url: string };
  uploadedAt: Date;
  status: "Pending" | "Approved" | "Rejected" | "Settled";
  amount?: number;
  comment?: string;
}
export const PaymentProof: Model<IPaymentProofDocument> = mongoose.model<IPaymentProofDocument>("PaymentProof",
  new Schema<IPaymentProofDocument>({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    proof: { public_id: { type: String, required: true }, url: { type: String, required: true } },
    uploadedAt: { type: Date, default: Date.now },
    status: { type: String, default: "Pending", enum: ["Pending","Approved","Rejected","Settled"] },
    amount: Number, comment: String
  })
);

// ── Commission ────────────────────────────────────────────────────────────────
export interface ICommissionDocument extends Document {
  amount: number;
  order?: mongoose.Types.ObjectId;
  auction?: mongoose.Types.ObjectId;
  auctioneer?: mongoose.Types.ObjectId;
  source: string;
  createdAt: Date;
}
const commissionSchema = new Schema<ICommissionDocument>({
  amount: { type: Number, required: true },
  order: { type: Schema.Types.ObjectId, ref: "Order" },
  auction: { type: Schema.Types.ObjectId, ref: "Auction" },
  auctioneer: { type: Schema.Types.ObjectId, ref: "User" },
  source: { type: String, default: "Auto" },
  createdAt: { type: Date, default: Date.now }
});
export const Commission: Model<ICommissionDocument> = mongoose.model<ICommissionDocument>("Commission", commissionSchema);

// ── Order ─────────────────────────────────────────────────────────────────────
export interface IOrderDocument extends Document {
  auction: mongoose.Types.ObjectId;
  auctioneer: mongoose.Types.ObjectId;
  winner: mongoose.Types.ObjectId;
  price: number;
  paymentStatus: "pending" | "holding" | "paid" | "failed";
  deliveryStatus: "pending" | "shipped" | "delivered" | "completed" | "problem";
  payoutStatus: "pending" | "processing" | "done" | "failed";
  commissionRate: number;
  commissionAmount: number;
  payoutAmount: number;
  complaintStatus: "none" | "open" | "resolved" | "blocked" | "refund";
  shipmentDetails?: { courier?: string; trackingId?: string; shippedDate?: Date; notes?: string };
  paymentInfo?: { transactionId?: string; paidAmount?: number; paidVia?: string; paidAt?: Date };
  complaints: { by: mongoose.Types.ObjectId; role: string; subject?: string; message?: string; createdAt: Date; replied: boolean; replyMessage?: string }[];
  payoutTxId?: string;
  payoutError?: string;
  rating?: number;
  ratingComment?: string;
  snapshot?: { auctionTitle?: string; auctionImage?: string; winnerName?: string; auctioneerName?: string; wonAt?: Date };
  paidAt?: Date;
  createdAt: Date;
}
export const Order: Model<IOrderDocument> = mongoose.model<IOrderDocument>("Order", new Schema<IOrderDocument>({
  auction: { type: Schema.Types.ObjectId, ref: "Auction", required: true },
  auctioneer: { type: Schema.Types.ObjectId, ref: "User", required: true },
  winner: { type: Schema.Types.ObjectId, ref: "User", required: true },
  price: { type: Number, required: true },
  paymentStatus: { type: String, enum: ["pending","holding","paid","failed"], default: "pending" },
  deliveryStatus: { type: String, enum: ["pending","shipped","delivered","completed","problem"], default: "pending" },
  payoutStatus: { type: String, enum: ["pending","processing","done","failed"], default: "pending" },
  commissionRate: { type: Number, default: 0.05 },
  commissionAmount: { type: Number, default: 0 },
  payoutAmount: { type: Number, default: 0 },
  complaintStatus: { type: String, enum: ["none","open","resolved","blocked","refund"], default: "none" },
  shipmentDetails: { courier: String, trackingId: String, shippedDate: Date, notes: String },
  paymentInfo: { transactionId: String, paidAmount: Number, paidVia: String, paidAt: Date },
  complaints: [{ by: { type: Schema.Types.ObjectId, ref: "User" }, role: String, subject: String, message: String, createdAt: { type: Date, default: Date.now }, replied: { type: Boolean, default: false }, replyMessage: String, _id: false }],
  payoutTxId: String, payoutError: String,
  rating: { type: Number, min: 1, max: 5 }, ratingComment: String,
  snapshot: { auctionTitle: String, auctionImage: String, winnerName: String, auctioneerName: String, wonAt: Date },
  paidAt: Date,
  createdAt: { type: Date, default: Date.now }
}));

// ── SiteRating ────────────────────────────────────────────────────────────────
// One rating per account (enforced both by the unique index below and in the
// controller, which rejects a second submission). Powers the "Rate SmartAuction"
// panel shown to logged-in users on the Home page.
export interface ISiteRatingDocument extends Document {
  user: mongoose.Types.ObjectId;
  userSatisfaction: number;
  aiFeatures: number;
  chatbotAssistance: number;
  createdAt: Date;
}
export const SiteRating: Model<ISiteRatingDocument> = mongoose.model<ISiteRatingDocument>("SiteRating",
  new Schema<ISiteRatingDocument>({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    userSatisfaction: { type: Number, min: 1, max: 5, required: true },
    aiFeatures: { type: Number, min: 1, max: 5, required: true },
    chatbotAssistance: { type: Number, min: 1, max: 5, required: true },
    createdAt: { type: Date, default: Date.now }
  })
);

// ── ChatMessage ───────────────────────────────────────────────────────────────
export interface IChatMessageDocument extends Document {
  user: mongoose.Types.ObjectId;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}
export const ChatMessage: Model<IChatMessageDocument> = mongoose.model<IChatMessageDocument>("ChatMessage",
  new Schema<IChatMessageDocument>({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["user","assistant"], required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  })
);

// ── ChatComplaint ─────────────────────────────────────────────────────────────
// Raised automatically by the AI support chatbot when it can't resolve a user's issue.
export interface IChatComplaintDocument extends Document {
  user: mongoose.Types.ObjectId;
  userName: string;
  email: string;
  details: string;
  status: "open" | "resolved";
  createdAt: Date;
}
export const ChatComplaint: Model<IChatComplaintDocument> = mongoose.model<IChatComplaintDocument>("ChatComplaint",
  new Schema<IChatComplaintDocument>({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    email: { type: String, required: true },
    details: { type: String, required: true },
    status: { type: String, enum: ["open","resolved"], default: "open" },
    createdAt: { type: Date, default: Date.now }
  })
);
