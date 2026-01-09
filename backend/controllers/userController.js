// backend/controllers/userController.js
import crypto from "crypto";
import cloudinary from "cloudinary";
import { User } from "../models/userSchema.js";
import { Order } from "../models/orderSchema.js";
import ErrorHandler from "../middlewares/error.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import { sendEmail } from "../utils/sendEmail.js";

// Helpers
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const hashOTP = (otp) => crypto.createHash("sha256").update(String(otp)).digest("hex");

const sendToken = (user, statusCode, message, res) => {
  const token = user.generateJsonWebToken();

  // ✅ FIXED: COOKIE_EXPIRE (matches your .env)
  const cookieExpireDays = Number(process.env.COOKIE_EXPIRE || 7);
  const options = {
    expires: new Date(Date.now() + cookieExpireDays * 24 * 60 * 60 * 1000),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };

  // Remove sensitive fields
  const safeUser = user.toObject ? user.toObject() : user;
  delete safeUser.password;
  delete safeUser.otp;
  delete safeUser.otpExpiry;
  delete safeUser.resetPasswordOTP;
  delete safeUser.resetPasswordOTPExpiry;

  return res.status(statusCode).cookie("token", token, options).json({
    success: true,
    message,
    user: safeUser,
  });
};

// ======================= REGISTRATION FLOW =======================

// POST /api/v1/user/register
export const register = catchAsyncErrors(async (req, res, next) => {
  const {
    userName,
    email,
    phone,
    address,
    role,
    password,
    bankAccountName,
    bankAccountNumber,
    bankName,
    upiId,
    paypalEmail,
  } = req.body;

  if (!userName || !email || !phone || !address || !role || !password) {
    return next(new ErrorHandler("Please fill full form.", 400));
  }

  if (!req.files || !req.files.profileImage) {
    return next(new ErrorHandler("Profile image is required.", 400));
  }

  const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (existing) {
    return next(new ErrorHandler("User already registered.", 400));
  }

  if (role === "Auctioneer") {
    if (!bankAccountName || !bankAccountNumber || !bankName || !upiId || !paypalEmail) {
      return next(new ErrorHandler("Please provide all Auctioneer payment details.", 400));
    }
  }

  // Upload profile image
  const file = req.files.profileImage;
  const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  if (!allowed.includes(file.mimetype)) {
    return next(new ErrorHandler("File format not supported.", 400));
  }

  const upload = await cloudinary.v2.uploader.upload(file.tempFilePath, {
    folder: "MERNAUCTIONPLATFORM/USERS",
  });

  // Create OTP
  const otp = generateOTP();
  const otpHashed = hashOTP(otp);
  const otpExpiry = Date.now() + 10 * 60 * 1000;

  const user = await User.create({
    userName,
    email: String(email).toLowerCase().trim(),
    phone,
    address,
    role,
    password,
    profileImage: {
      publicid: upload.public_id,
      url: upload.secure_url,
    },
    ...(role === "Auctioneer"
      ? {
          paymentMethods: {
            bankTransfer: { bankAccountNumber, bankAccountName, bankName },
            upi: { upiId },
            paypal: { paypalEmail },
          },
        }
      : {}),
    verified: false,
    otp: otpHashed,
    otpExpiry,
  });

  await sendEmail(
    user.email,
    "SmartAuction - Verify your Email",
    `Your OTP is: **${otp}**\n\nThis OTP is valid for 10 minutes.`
  );

  return res.status(201).json({
    success: true,
    message: "OTP sent to your email. Please verify.",
    userId: user._id,
  });
});

// POST /api/v1/user/verify-otp
export const verifyOTP = catchAsyncErrors(async (req, res, next) => {
  const { userId, otp } = req.body;

  if (!userId || !otp) return next(new ErrorHandler("userId and otp are required.", 400));

  const user = await User.findById(userId).select("+otp +otpExpiry");
  if (!user) return next(new ErrorHandler("User not found.", 404));

  if (user.verified) {
    return res.status(200).json({
      success: true,
      message: "Email already verified.",
    });
  }

  if (!user.otp || !user.otpExpiry) {
    return next(new ErrorHandler("No OTP found. Please request a new OTP.", 400));
  }

  if (Date.now() > new Date(user.otpExpiry).getTime()) {
    return next(new ErrorHandler("OTP expired. Please request a new OTP.", 400));
  }

  const incoming = hashOTP(otp);
  if (incoming !== user.otp) {
    return next(new ErrorHandler("Invalid OTP.", 400));
  }

  user.verified = true;
  user.otp = undefined;
  user.otpExpiry = undefined;
  await user.save();

  return res.status(200).json({
    success: true,
    message: "Email verified. Registration complete!",
  });
});

// POST /api/v1/user/resend-otp
export const resendVerificationOtp = catchAsyncErrors(async (req, res, next) => {
  const { email } = req.body;
  if (!email) return next(new ErrorHandler("Email is required.", 400));

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select(
    "+otp +otpExpiry"
  );

  if (!user) return next(new ErrorHandler("No account found with this email.", 404));
  if (user.verified) {
    return res.status(200).json({ success: true, message: "Email already verified." });
  }

  const otp = generateOTP();
  user.otp = hashOTP(otp);
  user.otpExpiry = Date.now() + 10 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  await sendEmail(
    user.email,
    "SmartAuction - Resend Verification OTP",
    `Your OTP is: **${otp}**\n\nThis OTP is valid for 10 minutes.`
  );

  return res.status(200).json({
    success: true,
    message: "New OTP sent to your email.",
    userId: user._id,
  });
});

// ======================= LOGIN =======================

// POST /api/v1/user/login
export const login = catchAsyncErrors(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) return next(new ErrorHandler("Please fill full form.", 400));

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select(
    "+password"
  );
  if (!user) {
    return next(new ErrorHandler("No account found with this email.", 404));
  }

  // Unverified account
  if (!user.verified) {
    return res.status(403).json({
      success: false,
      message: "Email not verified. Please verify OTP (or resend OTP).",
      needsVerification: true,
      userId: user._id,
      email: user.email,
    });
  }

  if (user.blocked) {
    return next(new ErrorHandler("Your account is blocked by admin.", 403));
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) return next(new ErrorHandler("Invalid password.", 401));

  return sendToken(user, 200, "Login successfully.", res);
});

// ======================= LOGOUT & PROFILE =======================

// GET /api/v1/user/logout
export const logout = catchAsyncErrors(async (req, res) => {
  return res
    .status(200)
    .cookie("token", "", { expires: new Date(Date.now()), httpOnly: true })
    .json({ success: true, message: "Logout Successfully." });
});

// GET /api/v1/user/me
export const getProfile = catchAsyncErrors(async (req, res) => {
  return res.status(200).json({ success: true, user: req.user });
});

// PUT /api/v1/user/me
export const updateProfile = catchAsyncErrors(async (req, res, next) => {
  const updates = {};
  if (req.body.userName !== undefined) updates.userName = req.body.userName;
  if (req.body.phone !== undefined) updates.phone = req.body.phone;
  if (req.body.address !== undefined) updates.address = req.body.address;

  if (req.files && req.files.profileImage) {
    const file = req.files.profileImage;
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return next(new ErrorHandler("File format not supported.", 400));
    }

    const upload = await cloudinary.v2.uploader.upload(file.tempFilePath, {
      folder: "MERNAUCTIONPLATFORM/USERS",
    });

    updates.profileImage = { publicid: upload.public_id, url: upload.secure_url };
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  return res.status(200).json({ success: true, user });
});

// ======================= FORGOT PASSWORD =======================

// POST /api/v1/auth/forgot-password/request-otp
export const requestPasswordResetOtp = catchAsyncErrors(async (req, res, next) => {
  const { email } = req.body;
  if (!email) return next(new ErrorHandler("Email is required.", 400));

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select(
    "+resetPasswordOTP +resetPasswordOTPExpiry"
  );

  if (!user) return next(new ErrorHandler("No account found with this email.", 404));

  const otp = generateOTP();
  user.resetPasswordOTP = hashOTP(otp);
  user.resetPasswordOTPExpiry = Date.now() + 10 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  await sendEmail(
    user.email,
    "SmartAuction - Password Reset OTP",
    `Your OTP is: **${otp}**\n\nThis OTP is valid for 10 minutes.`
  );

  return res.status(200).json({ success: true, message: "OTP sent to your email." });
});

// POST /api/v1/auth/forgot-password/verify-otp
export const verifyPasswordResetOtp = catchAsyncErrors(async (req, res, next) => {
  const { email, otp } = req.body;
  if (!email || !otp) return next(new ErrorHandler("Email and OTP are required.", 400));

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select(
    "+resetPasswordOTP +resetPasswordOTPExpiry"
  );

  if (!user) return next(new ErrorHandler("No account found with this email.", 404));

  if (!user.resetPasswordOTP || !user.resetPasswordOTPExpiry) {
    return next(new ErrorHandler("No OTP found. Please request a new one.", 400));
  }

  if (Date.now() > new Date(user.resetPasswordOTPExpiry).getTime()) {
    return next(new ErrorHandler("OTP expired. Please request a new one.", 400));
  }

  if (hashOTP(otp) !== user.resetPasswordOTP) {
    return next(new ErrorHandler("Invalid OTP.", 400));
  }

  return res.status(200).json({
    success: true,
    message: "OTP verified successfully. You can now reset your password.",
  });
});

// PUT /api/v1/auth/forgot-password/reset
export const resetPasswordWithOtp = catchAsyncErrors(async (req, res, next) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return next(new ErrorHandler("Email, OTP and newPassword are required.", 400));
  }

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select(
    "+password +resetPasswordOTP +resetPasswordOTPExpiry"
  );

  if (!user) return next(new ErrorHandler("No account found with this email.", 404));

  if (!user.resetPasswordOTP || !user.resetPasswordOTPExpiry) {
    return next(new ErrorHandler("No OTP found. Please request a new one.", 400));
  }

  if (Date.now() > new Date(user.resetPasswordOTPExpiry).getTime()) {
    return next(new ErrorHandler("OTP expired. Please request a new one.", 400));
  }

  if (hashOTP(otp) !== user.resetPasswordOTP) {
    return next(new ErrorHandler("Invalid OTP.", 400));
  }

  // ✅ FIXED: Skip validation (avoids profileImage error)
  user.password = newPassword;
  user.resetPasswordOTP = undefined;
  user.resetPasswordOTPExpiry = undefined;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json({
    success: true,
    message: "Password reset successful. You can now log in.",
  });
});

// ======================= PUBLIC ROUTES =======================

// GET /api/v1/user/leaderboard
export const fetchLeaderboard = catchAsyncErrors(async (req, res) => {
  const leaderboard = await User.find({ role: "Bidder" })
    .sort({ moneySpent: -1 })
    .select("userName profileImage moneySpent auctionsWon");

  return res.status(200).json({ success: true, leaderboard });
});

// GET /api/v1/user/public/:id
export const getPublicProfile = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new ErrorHandler("User not found.", 404));

  const profile = user.toPublicProfile();

  return res.status(200).json({
    success: true,
    profile,
  });
});
