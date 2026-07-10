import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export interface IUserDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userName: string;
  email: string;
  password: string;
  address?: string;
  phone?: string;
  profileImage: { public_id: string; url: string };
  paymentMethods?: {
    bankTransfer?: { bankAccountNumber?: string; bankAccountName?: string; bankName?: string };
    upi?: { upiId?: string };
    paypal?: { paypalEmail?: string };
  };
  role: "Auctioneer" | "Bidder" | "Super Admin";
  unpaidCommission: number;
  auctionsWon: number;
  moneySpent: number;
  wishlist: mongoose.Types.ObjectId[];
  verified: boolean;
  blocked: boolean;
  ratingCount: number;
  ratingSum: number;
  otp?: string;
  otpExpiry?: Date;
  authProvider: "local" | "google";
  googleId?: string;
  createdAt: Date;
  comparePassword(p: string): Promise<boolean>;
  generateJsonWebToken(): string;
}

const userSchema = new Schema<IUserDocument>({
  userName: { type: String, minlength: [3,"Min 3 chars"], maxlength: [40,"Max 40 chars"] },
  email: { type: String, unique: true, lowercase: true },
  password: { type: String, select: false, minlength: [8,"Min 8 chars"] },
  address: String,
  phone: { type: String, minlength: [10,"10 digits"], maxlength: [10,"10 digits"] },
  profileImage: { public_id: { type: String, required: true }, url: { type: String, required: true } },
  paymentMethods: {
    bankTransfer: { bankAccountNumber: String, bankAccountName: String, bankName: String },
    upi: { upiId: String },
    paypal: { paypalEmail: String }
  },
  role: { type: String, enum: ["Auctioneer","Bidder","Super Admin"] },
  unpaidCommission: { type: Number, default: 0 },
  auctionsWon: { type: Number, default: 0 },
  moneySpent: { type: Number, default: 0 },
  wishlist: [{ type: Schema.Types.ObjectId, ref: "Auction" }],
  verified: { type: Boolean, default: false },
  blocked: { type: Boolean, default: false },
  ratingCount: { type: Number, default: 0 },
  ratingSum: { type: Number, default: 0 },
  otp: String,
  otpExpiry: Date,
  authProvider: { type: String, enum: ["local","google"], default: "local" },
  googleId: { type: String, select: false, sparse: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre<IUserDocument>("save", async function(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
userSchema.methods.comparePassword = async function(p: string) { return bcrypt.compare(p, this.password); };
userSchema.methods.generateJsonWebToken = function() {
  return jwt.sign(
    { id: this._id.toString() },
    process.env.JWT_SECRET_KEY as string,
    {
      expiresIn: (process.env.JWT_EXPIRE || "7d") as any
    }
  );
};

export const User: Model<IUserDocument> = mongoose.model<IUserDocument>("User", userSchema);
