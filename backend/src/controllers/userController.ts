import { Request, Response, NextFunction } from "express";
import { v2 as cloudinary } from "cloudinary";
import { User } from "../models/userSchema";
import { Auction } from "../models/auctionSchema";
import { catchAsyncErrors } from "../middlewares/index";
import ErrorHandler from "../middlewares/error";
import { generateToken } from "../utils/helpers";
import { sendEmail, emailTemplates } from "../utils/sendEmail";

export const register = catchAsyncErrors(async (req: any, res: Response, next: NextFunction) => {
  if (!req.files?.profileImage) return next(new ErrorHandler("Profile image required.", 400));
  const { profileImage } = req.files;
  if (!["image/png","image/jpeg","image/webp"].includes(profileImage.mimetype))
    return next(new ErrorHandler("Only PNG/JPG/WEBP allowed.", 400));

  const { userName, email, password, phone, address, role } = req.body;
  if (!userName||!email||!password||!phone||!address||!role) return next(new ErrorHandler("All fields required.", 400));
  if (await User.findOne({ email: email.toLowerCase() })) return next(new ErrorHandler("Email already registered.", 409));

  const cloud = await cloudinary.uploader.upload(profileImage.tempFilePath, { folder: "SA_USERS" });
  if (!cloud || cloud.error) return next(new ErrorHandler("Image upload failed.", 500));

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const user = await User.create({
    userName, email: email.toLowerCase(), password, phone, address, role,
    profileImage: { public_id: cloud.public_id, url: cloud.secure_url },
    otp, otpExpiry: new Date(Date.now() + 10 * 60 * 1000)
  });

  await sendEmail({ email, subject: "Verify your SmartAuction account", message: `Your OTP: ${otp}`, html: emailTemplates.otp(otp) });
  res.status(201).json({ success: true, message: "Check your email for the OTP.", userId: user._id });
});

export const verifyOTP = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() }).select("+otp +otpExpiry");
  if (!user) return next(new ErrorHandler("User not found.", 404));
  if (!user.otp || !user.otpExpiry || new Date() > user.otpExpiry) return next(new ErrorHandler("OTP expired. Request a new one.", 400));
  if (user.otp !== String(otp)) return next(new ErrorHandler("Invalid OTP.", 400));
  user.verified = true; user.otp = undefined; user.otpExpiry = undefined;
  await user.save();
  await sendEmail({ email: user.email, subject: "Welcome to SmartAuction!", message: `Hi ${user.userName}, your account is ready.`, html: emailTemplates.welcome(user.userName) });
  generateToken(user, "Account verified! Welcome to SmartAuction.", 200, res);
});

export const resendOTP = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() });
  if (!user) return next(new ErrorHandler("User not found.", 404));
  if (user.verified) return next(new ErrorHandler("Account already verified.", 400));
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.otp = otp; user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();
  await sendEmail({ email, subject: "New OTP - SmartAuction", message: `Your new OTP: ${otp}`, html: emailTemplates.otp(otp) });
  res.status(200).json({ success: true, message: "New OTP sent." });
});

export const login = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;
  if (!email||!password) return next(new ErrorHandler("Email and password required.", 400));
  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user) return next(new ErrorHandler("Invalid credentials.", 401));
  if (!user.verified) return next(new ErrorHandler("Verify your email first.", 401));
  if (user.blocked) return next(new ErrorHandler("Account blocked. Contact support.", 403));
  if (!await user.comparePassword(password)) return next(new ErrorHandler("Invalid credentials.", 401));
  generateToken(user, "Login successful.", 200, res);
});

export const logout = catchAsyncErrors(async (_req: any, res: Response) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully"
  });
});

export const getProfile = catchAsyncErrors(async (req: any, res: Response) => {
  const user = await User.findById(req.user._id).populate("wishlist", "title image currentBid status endTime category");
  res.status(200).json({ success: true, user });
});

export const updateProfile = catchAsyncErrors(async (req: any, res: Response, next: NextFunction) => {
  const updates: any = {};
  ["userName","phone","address"].forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  if (req.body.paymentMethods) {
    try { updates.paymentMethods = typeof req.body.paymentMethods === "string" ? JSON.parse(req.body.paymentMethods) : req.body.paymentMethods; }
    catch (_) {}
  }
  if (req.files?.profileImage) {
    const cloud = await cloudinary.uploader.upload(req.files.profileImage.tempFilePath, { folder: "SA_USERS" });
    updates.profileImage = { public_id: cloud.public_id, url: cloud.secure_url };
  }
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  res.status(200).json({ success: true, message: "Profile updated.", user });
});

// ── Wishlist ──────────────────────────────────────────────────────────────────
export const toggleWishlist = catchAsyncErrors(async (req: any, res: Response, next: NextFunction) => {
  const { auctionId } = req.params;
  const user = await User.findById(req.user._id);
  if (!user) return next(new ErrorHandler("User not found.", 404));
  const auc = await Auction.findById(auctionId);
  if (!auc) return next(new ErrorHandler("Auction not found.", 404));

  const idx = user.wishlist.findIndex(id => id.toString() === auctionId);
  let action: string;
  if (idx > -1) { user.wishlist.splice(idx, 1); action = "removed"; }
  else { user.wishlist.push(auc._id); action = "added"; }
  await user.save();
  res.status(200).json({ success: true, message: `Auction ${action} ${action === "added" ? "to" : "from"} wishlist.`, action });
});

export const getWishlist = catchAsyncErrors(async (req: any, res: Response) => {
  const user = await User.findById(req.user._id).populate({
    path: "wishlist",
    populate: { path: "createdBy", select: "userName profileImage" }
  });
  res.status(200).json({ success: true, wishlist: user?.wishlist || [] });
});

// ── Password Reset ────────────────────────────────────────────────────────────
export const forgotPasswordOTP = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() });
  if (!user) return next(new ErrorHandler("No account with this email.", 404));
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.otp = otp; user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();
  await sendEmail({ email, subject: "Password Reset OTP - SmartAuction", message: `Reset OTP: ${otp}`, html: emailTemplates.otp(otp) });
  res.status(200).json({ success: true, message: "OTP sent to your email." });
});

export const resetPasswordWithOTP = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
  const { email, otp, newPassword } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() }).select("+otp +otpExpiry");
  if (!user) return next(new ErrorHandler("User not found.", 404));
  if (!user.otp || !user.otpExpiry || new Date() > user.otpExpiry) return next(new ErrorHandler("OTP expired.", 400));
  if (user.otp !== String(otp)) return next(new ErrorHandler("Invalid OTP.", 400));
  if (!newPassword || newPassword.length < 8) return next(new ErrorHandler("Password must be 8+ chars.", 400));
  user.password = newPassword; user.otp = undefined; user.otpExpiry = undefined;
  await user.save();
  res.status(200).json({ success: true, message: "Password reset. Please login." });
});

export const fetchLeaderboard = catchAsyncErrors(async (_req: Request, res: Response) => {
  const users = await User.find({ role: "Bidder" }).sort({ moneySpent: -1 }).limit(50).select("userName profileImage auctionsWon moneySpent");
  res.status(200).json({ success: true, leaderboard: users });
});

export const getPublicProfile = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
  const user = await User.findById(req.params.id).select("-password -otp -otpExpiry");
  if (!user) return next(new ErrorHandler("User not found.", 404));
  res.status(200).json({ success: true, user });
});
