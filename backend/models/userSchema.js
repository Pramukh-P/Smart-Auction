//backend/models/userSchema.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema({
  userName: {
    type: String,
    minLength: [3, "Username must contain at least 3 characters."],
    maxLength: [40, "Username cannot exceed 40 characters."],
    required: true,
    trim: true,
  },

  password: {
    type: String,
    select: false,
    minLength: [8, "Password must contain at least 8 characters."],
    required: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },

  address: {
    type: String,
    required: true,
  },

  phone: {
    type: String,
    minLength: [10, "Phone Number must contain exact 10 digits."],
    maxLength: [10, "Phone Number must contain exact 10 digits."],
    required: true,
  },

  profileImage: {
    publicid: { type: String, required: true },
    url: { type: String, required: true },
  },

  paymentMethods: {
    bankTransfer: {
      bankAccountNumber: String,
      bankAccountName: String,
      bankName: String,
    },
    upi: {
      upiId: String,
    },
    paypal: {
      paypalEmail: String,
    },
  },

  role: {
    type: String,
    enum: ["Auctioneer", "Bidder", "Super Admin"],
    required: true,
  },

  unpaidCommission: {
    type: Number,
    default: 0,
  },

  auctionsWon: {
    type: Number,
    default: 0,
  },

  moneySpent: {
    type: Number,
    default: 0,
  },

  welcomeEmailSent: {
    type: Boolean,
    default: false,
  },

  verified: {
    type: Boolean,
    default: false,
  },

  blocked: {
    type: Boolean,
    default: false,
  },

  ratingCount: { type: Number, default: 0 },
  ratingSum: { type: Number, default: 0 },

  // Email verification OTP
  otp: { type: String, select: false },
  otpExpiry: { type: Date, select: false },

  // Forgot password OTP (Issue #4 fix: these fields MUST exist in schema)
  resetPasswordOTP: { type: String, select: false },
  resetPasswordOTPExpiry: { type: Date, select: false },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(String(enteredPassword), this.password);
};

userSchema.methods.generateJsonWebToken = function () {
  // ✅ FIXED: JWT_SECRET_KEY (matches your .env)
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

userSchema.methods.toPublicProfile = function () {
  const avgRating = this.ratingCount > 0 ? this.ratingSum / this.ratingCount : null;
  return {
    id: this._id,
    userName: this.userName,
    role: this.role,
    profileImage: this.profileImage,
    createdAt: this.createdAt,
    auctionsWon: this.auctionsWon,
    moneySpent: this.moneySpent,
    rating: avgRating,
    ratingCount: this.ratingCount,
    blocked: this.blocked,
  };
};

export const User = mongoose.model("User", userSchema);
