import { Request, Response, NextFunction } from "express";
import { v2 as cloudinary } from "cloudinary";
import { OAuth2Client } from "google-auth-library";
import { User } from "../models/userSchema";
import { Auction } from "../models/auctionSchema";
import { catchAsyncErrors } from "../middlewares/index";
import ErrorHandler from "../middlewares/error";
import { generateToken, isDeployed } from "../utils/helpers";
import { sendEmail, emailTemplates } from "../utils/sendEmail";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
  if (!user.password) return next(new ErrorHandler("This account was created with Google Sign-In. Please use \"Login with Google\" instead.", 400));
  if (!await user.comparePassword(password)) return next(new ErrorHandler("Invalid credentials.", 401));
  generateToken(user, "Login successful.", 200, res);
});

// ── Google Sign-In / Sign-Up ─────────────────────────────────────────────────
// Used by both the Login page ("Login with Google" — no `role` sent, only
// existing accounts can sign in) and the Register page ("Sign up with
// Google" — `role` is sent from the role toggle, used only if a new account
// needs to be created). If an account with that email already exists, this
// always just logs the person in (and links the Google id if it wasn't
// linked yet) regardless of which page triggered it.
export const googleAuth = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
  const { credential, role } = req.body;
  if (!credential) return next(new ErrorHandler("Google credential missing.", 400));
  if (!process.env.GOOGLE_CLIENT_ID) return next(new ErrorHandler("Google Sign-In is not configured on the server.", 500));

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch (_err) {
    return next(new ErrorHandler("Invalid or expired Google credential.", 401));
  }
  if (!payload?.email) return next(new ErrorHandler("Could not read your Google account email.", 400));
  if (!payload.email_verified) return next(new ErrorHandler("Your Google email is not verified.", 400));

  const email = payload.email.toLowerCase();
  let user = await User.findOne({ email });

  if (user) {
    if (user.blocked) return next(new ErrorHandler("Account blocked. Contact support.", 403));
    let changed = false;
    if (!user.googleId) { user.googleId = payload.sub; changed = true; }
    if (!user.verified) { user.verified = true; changed = true; }
    if (changed) await user.save();
    return generateToken(user, "Login successful.", 200, res);
  }

  // No account with this email yet — only create one if this came from the
  // Register page (role provided). The Login page's Google button sends no
  // role, so a non-existent account correctly errors out here instead of
  // silently signing someone up.
  if (!role || !["Bidder","Auctioneer"].includes(role)) {
    return next(new ErrorHandler("No account found with this Google account. Please sign up first.", 404));
  }

  const userName = (payload.name || payload.email.split("@")[0]).slice(0, 40).padEnd(3, "_");
  user = await User.create({
    userName,
    email,
    role,
    profileImage: { public_id: "google_oauth", url: payload.picture || "" },
    verified: true,
    authProvider: "google",
    googleId: payload.sub
  });

  await sendEmail({ email: user.email, subject: "Welcome to SmartAuction!", message: `Hi ${user.userName}, your account is ready.`, html: emailTemplates.welcome(user.userName) });
  generateToken(user, "Account created with Google. Welcome to SmartAuction!", 201, res);
});

export const logout = catchAsyncErrors(async (_req: any, res: Response) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: isDeployed,
    sameSite: isDeployed ? "none" : "lax"
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
