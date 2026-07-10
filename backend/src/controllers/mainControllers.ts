import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Order, Notification, Commission, PaymentProof, ChatMessage, ChatComplaint, SiteRating } from "../models/index";
import { Auction } from "../models/auctionSchema";
import { User } from "../models/userSchema";
import { Bid } from "../models/index";
import { catchAsyncErrors } from "../middlewares/index";
import ErrorHandler from "../middlewares/error";
import { sendEmail, emailTemplates } from "../utils/sendEmail";
// import { sendPayoutToAuctioneer } from "../utils/helpers";
import { chatWithAI } from "../utils/aiHelpers";
import { v2 as cloudinary } from "cloudinary";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "app.smartauctions@gmail.com";

const pop = (q: any) => q
  .populate("auction","title image category status")
  .populate("auctioneer","userName email profileImage paymentMethods")
  .populate("winner","userName email profileImage");

// ── ORDERS ───────────────────────────────────────────────────────────────────
export const getMyOrders = catchAsyncErrors(async (req: any, res: Response) => {
  const orders = await pop(Order.find({ winner: req.user._id }).sort({ createdAt: -1 }));
  res.status(200).json({ success: true, orders });
});

export const getMySales = catchAsyncErrors(async (req: any, res: Response) => {
  const orders = await pop(Order.find({ auctioneer: req.user._id }).sort({ createdAt: -1 }));
  res.status(200).json({ success: true, orders });
});

export const getOrderById = catchAsyncErrors(async (req: any, res: Response, next: NextFunction) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return next(new ErrorHandler("Invalid order ID.", 400));
  const order = await pop(Order.findById(req.params.id));
  if (!order) return next(new ErrorHandler("Order not found.", 404));
  const winnerId = (order.winner as any)?._id?.toString();
  const auctioneerId = (order.auctioneer as any)?._id?.toString();
  if (winnerId !== String(req.user._id) && auctioneerId !== String(req.user._id) && req.user.role !== "Super Admin")
    return next(new ErrorHandler("Not authorized.", 403));
  res.status(200).json({ success: true, order });
});

export const shipOrder = catchAsyncErrors(async (req: any, res: Response, next: NextFunction) => {
  const { courier, trackingId, notes } = req.body;
  if (!courier || !trackingId) return next(new ErrorHandler("Courier and tracking ID required.", 400));
  const order = await pop(Order.findById(req.params.id));
  if (!order) return next(new ErrorHandler("Order not found.", 404));
  const auctioneerId = (order.auctioneer as any)?._id?.toString();
  if (auctioneerId !== String(req.user._id)) return next(new ErrorHandler("Not authorized.", 403));
  if (order.paymentStatus !== "paid") return next(new ErrorHandler("Payment not received yet.", 400));
  if (["shipped","delivered","completed"].includes(order.deliveryStatus)) return next(new ErrorHandler("Order already shipped.", 400));

  order.deliveryStatus = "shipped";
  order.shipmentDetails = { courier, trackingId, shippedDate: new Date(), notes };
  await order.save();

  const winner = order.winner as any;
  const auctionTitle = (order.auction as any)?.title || "your item";
  if (winner?.email) {
    await sendEmail({ email: winner.email, subject: `Your order shipped: ${auctionTitle}`, message: "", html: emailTemplates.shipped(auctionTitle, courier, trackingId) });
  }
  await Notification.create({
    user: (order.winner as any)?._id || order.winner,
    auction: (order.auction as any)?._id || order.auction,
    type: "payment",
    message: `Your order for "${auctionTitle}" has been shipped! Tracking: ${trackingId}`,
    link: `/my-orders/${order._id}`
  });

  res.status(200).json({ success: true, message: "Order shipped. Buyer notified.", order });
});

// Commission belongs to the platform the instant a sale is delivered — it must
// never depend on whether we could also successfully pay out the auctioneer's
// share (e.g. because they haven't added a UPI ID yet). This records it exactly
// once per order, however many times payout is attempted/retried.
const recordCommissionIfMissing = async (order: any, auctioneerId: any) => {
  if (!(order.commissionAmount > 0)) return;
  const exists = await Commission.findOne({ order: order._id });
  if (exists) return;
  await Commission.create({
    amount: order.commissionAmount, order: order._id,
    auction: (order.auction as any)?._id || order.auction,
    auctioneer: auctioneerId, source: "Auto Payout"
  });
};

// Attempts (or retries) sending the auctioneer their net payout for an already-
// delivered order, and emails/notifies them on success. Commission is handled
// separately by recordCommissionIfMissing so it's never blocked by this.


// const attemptPayout = async (order: any, auctioneer: any) => {
//   const upiId = auctioneer.paymentMethods?.upi?.upiId;
//   const result = await sendPayoutToAuctioneer(upiId, order.payoutAmount, String(order._id));
//   order.payoutStatus = "done";
//   order.payoutTxId = result.txId;
//   order.payoutError = undefined;
//   order.deliveryStatus = "completed";
//   await order.save();

//   await Auction.findByIdAndUpdate((order.auction as any)?._id || order.auction, { payoutReleased: true, deliveryStatus: "Completed", paymentStatus: "paid" });

//   const auctionTitle = (order.auction as any)?.title || "auction item";
//   if (auctioneer.email) {
//     await sendEmail({ email: auctioneer.email, subject: `Payout sent: ₹${order.payoutAmount.toLocaleString()}`, message: `Your payout of ₹${order.payoutAmount.toLocaleString()} for "${auctionTitle}" has been processed.\nTx ID: ${result.txId}` });
//   }
//   await Notification.create({
//     user: auctioneer._id, type: "payment",
//     message: `💰 Payout of ₹${order.payoutAmount.toLocaleString()} sent for "${auctionTitle}"`,
//     link: `/my-auctions`
//   });
// };

const attemptPayout = async (order: any, auctioneer: any) => {

  // Simulated payout because SmartAuction uses only Razorpay Payment Gateway.
  // The commission has already been deducted while creating payoutAmount.

  const txId = `SIM_${Date.now()}`;

  order.payoutStatus = "done";
  order.payoutTxId = txId;
  order.payoutError = undefined;
  order.deliveryStatus = "completed";

  await order.save();

  await Auction.findByIdAndUpdate(
    (order.auction as any)?._id || order.auction,
    {
      payoutReleased: true,
      deliveryStatus: "Completed",
      paymentStatus: "paid"
    }
  );

  const auctionTitle =
    (order.auction as any)?.title || "auction item";

  if (auctioneer.email) {
    await sendEmail({
      email: auctioneer.email,
      subject: `Payout Recorded Successfully`,
      message:
`Buyer Payment : ₹${order.price.toLocaleString()}

Commission Deducted : ₹${order.commissionAmount.toLocaleString()}

Amount Credited : ₹${order.payoutAmount.toLocaleString()}

Transaction ID : ${txId}

Thank you for using SmartAuction.`
    });
  }

  await Notification.create({
    user: auctioneer._id,
    type: "payment",
    message: `₹${order.payoutAmount.toLocaleString()} credited (Simulated)`,
    link: "/my-sales"
  });

};

export const confirmDelivery = catchAsyncErrors(async (req: any, res: Response, next: NextFunction) => {
  const order = await pop(Order.findById(req.params.id));
  if (!order) return next(new ErrorHandler("Order not found.", 404));
  const winnerId = (order.winner as any)?._id?.toString();
  if (winnerId !== String(req.user._id)) return next(new ErrorHandler("Only buyer can confirm delivery.", 403));
  if (order.deliveryStatus !== "shipped") return next(new ErrorHandler("Order has not been shipped yet.", 400));

  order.deliveryStatus = "delivered";
  order.payoutStatus = "processing";
  await order.save();

  const auctioneer = await User.findById((order.auctioneer as any)?._id || order.auctioneer);
  if (auctioneer) {
    // The platform's commission is recorded immediately — it does not wait on payout.
    await recordCommissionIfMissing(order, auctioneer._id);
    try {
      await attemptPayout(order, auctioneer);
    } catch (err: any) {
      order.payoutStatus = "failed";
      order.payoutError = /UPI ID required/i.test(err.message)
        ? "Add your UPI ID in Profile settings to receive automatic payouts."
        : err.message;
      await order.save();
    }
  }
  res.status(200).json({ success: true, message: "Delivery confirmed. Commission recorded, payout initiated.", order });
});

// Lets an auctioneer retry a payout that previously failed (e.g. after adding
// their UPI ID). Commission was already recorded at delivery time regardless.
export const retryPayout = catchAsyncErrors(async (req: any, res: Response, next: NextFunction) => {
  const order = await pop(Order.findById(req.params.id));
  if (!order) return next(new ErrorHandler("Order not found.", 404));
  const auctioneerId = (order.auctioneer as any)?._id?.toString();
  if (auctioneerId !== String(req.user._id)) return next(new ErrorHandler("Only the seller can retry this payout.", 403));
  if (order.payoutStatus === "done") return next(new ErrorHandler("Payout already completed.", 400));
  if (!["delivered", "completed"].includes(order.deliveryStatus)) return next(new ErrorHandler("Order must be delivered before payout.", 400));

  const auctioneer = await User.findById(req.user._id);
  if (!auctioneer) return next(new ErrorHandler("Auctioneer not found.", 404));

  await recordCommissionIfMissing(order, auctioneer._id);
  order.payoutStatus = "processing";
  await order.save();
  try {
    await attemptPayout(order, auctioneer);
    res.status(200).json({ success: true, message: "Payout sent successfully.", order });
  } catch (err: any) {
    order.payoutStatus = "failed";
    order.payoutError = /UPI ID required/i.test(err.message)
      ? "Add your UPI ID in Profile settings to receive automatic payouts."
      : err.message;
    await order.save();
    return next(new ErrorHandler(order.payoutError, 400));
  }
});

export const raiseComplaint = catchAsyncErrors(async (req: any, res: Response, next: NextFunction) => {
  const { subject, message } = req.body;
  if (!message?.trim()) return next(new ErrorHandler("Complaint message required.", 400));
  const order = await Order.findById(req.params.id);
  if (!order) return next(new ErrorHandler("Order not found.", 404));
  const winnerId = String(order.winner);
  const auctioneerId = String(order.auctioneer);
  const myId = String(req.user._id);
  if (myId !== winnerId && myId !== auctioneerId) return next(new ErrorHandler("Not your order.", 403));

  order.complaints.push({
    by: req.user._id,
    role: req.user.role === "Bidder" ? "Bidder" : "Auctioneer",
    subject: subject || "Order complaint",
    message,
    createdAt: new Date(),
    replied: false
  });
  order.complaintStatus = "open";
  await order.save();
  res.status(201).json({ success: true, message: "Complaint submitted. Admin will review shortly.", order });
});

export const submitRating = catchAsyncErrors(async (req: any, res: Response, next: NextFunction) => {
  const { rating, ratingComment } = req.body;
  if (!rating || rating < 1 || rating > 5) return next(new ErrorHandler("Rating must be 1-5.", 400));
  const order = await Order.findById(req.params.id);
  if (!order) return next(new ErrorHandler("Order not found.", 404));
  if (String(order.winner) !== String(req.user._id)) return next(new ErrorHandler("Only buyer can rate.", 403));
  if (order.deliveryStatus !== "completed") return next(new ErrorHandler("Delivery must be completed to rate.", 400));
  if (order.rating) return next(new ErrorHandler("Already rated.", 400));

  order.rating = Number(rating);
  order.ratingComment = ratingComment;
  await order.save();

  await User.findByIdAndUpdate(order.auctioneer, { $inc: { ratingCount: 1, ratingSum: Number(rating) } });
  res.status(200).json({ success: true, message: "Rating submitted.", order });
});

export const verifyPayment = catchAsyncErrors(async (req: any, res: Response, next: NextFunction) => {
  const { orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature, auctionId } = req.body;
  if (!orderId) return next(new ErrorHandler("Order ID required.", 400));

  const crypto = require("crypto");
  let paymentValid = true;
  if (razorpay_payment_id && razorpay_order_id && razorpay_signature) {
    const generated = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
    paymentValid = generated === razorpay_signature;
  }
  if (!paymentValid) return next(new ErrorHandler("Invalid payment signature.", 400));

  const order = await pop(Order.findById(orderId));
  if (!order) return next(new ErrorHandler("Order not found.", 404));
  if (order.paymentStatus === "paid") return res.json({ success: true, message: "Already paid.", order });

  order.paymentStatus = "paid";
  order.paidAt = new Date();
  order.paymentInfo = { transactionId: razorpay_payment_id || `MANUAL_${Date.now()}`, paidAmount: order.price, paidVia: "Razorpay", paidAt: new Date() };
  await order.save();

  if (auctionId) await Auction.findByIdAndUpdate(auctionId, { paymentStatus: "paid", paymentDeadline: undefined });

  const auctioneer = order.auctioneer as any;
  const auctionTitle = (order.auction as any)?.title || "auction item";
  if (auctioneer?.email) {
    await sendEmail({ email: auctioneer.email, subject: `Payment received for "${auctionTitle}"`, message: `Payment of ₹${order.price.toLocaleString()} received for "${auctionTitle}".\nPlease ship the item ASAP.` });
  }
  await Notification.create({
    user: (order.auctioneer as any)?._id || order.auctioneer, type: "payment",
    message: `💳 Payment of ₹${order.price.toLocaleString()} received for "${auctionTitle}"`,
    link: `/my-sales`
  });

  res.status(200).json({ success: true, message: "Payment verified.", order });
});

export const createRazorpayOrder = catchAsyncErrors(async (req: any, res: Response, next: NextFunction) => {
  const { amount, currency = "INR" } = req.body;
  if (!amount) return next(new ErrorHandler("Amount required.", 400));
  if (!process.env.RAZORPAY_KEY_ID) {
    return res.json({ success: true, simulated: true, key: "test", order: { id: `SIM_${Date.now()}`, amount: amount * 100, currency } });
  }
  try {
    const Razorpay = require("razorpay");
    const rz = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
    const order = await rz.orders.create({ amount: Math.round(amount * 100), currency, receipt: `sa_${Date.now()}`, payment_capture: true });
    res.json({ success: true, key: process.env.RAZORPAY_KEY_ID, order });
  } catch (err: any) { return next(new ErrorHandler(`Payment gateway error: ${err.message}`, 500)); }
});

// ── NOTIFICATIONS ────────────────────────────────────────────────────────────
export const getNotifications = catchAsyncErrors(async (req: any, res: Response) => {
  const notifs = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30)
    .populate("auction","title image");
  const unread = await Notification.countDocuments({ user: req.user._id, seen: false });
  res.status(200).json({ success: true, notifications: notifs, unread });
});

export const markAllSeen = catchAsyncErrors(async (req: any, res: Response) => {
  await Notification.updateMany({ user: req.user._id, seen: false }, { seen: true });
  res.status(200).json({ success: true, message: "All notifications marked as seen." });
});

export const deleteNotification = catchAsyncErrors(async (req: any, res: Response, next: NextFunction) => {
  const notif = await Notification.findOne({ _id: req.params.id, user: req.user._id });
  if (!notif) return next(new ErrorHandler("Notification not found.", 404));
  await notif.deleteOne();
  res.status(200).json({ success: true, message: "Notification deleted." });
});

// ── COMMISSION ────────────────────────────────────────────────────────────────
export const submitCommissionProof = catchAsyncErrors(async (req: any, res: Response, next: NextFunction) => {
  if (!req.files?.proof) return next(new ErrorHandler("Payment proof screenshot required.", 400));
  const { amount, comment } = req.body;
  if (!amount || !comment) return next(new ErrorHandler("Amount and comment required.", 400));

  const user = await User.findById(req.user._id);
  if (!user) return next(new ErrorHandler("User not found.", 404));
  if (user.unpaidCommission <= 0) return res.json({ success: true, message: "No unpaid commission." });
  if (Number(amount) > user.unpaidCommission) return next(new ErrorHandler(`Amount exceeds balance ₹${user.unpaidCommission}.`, 400));

  const cloud = await cloudinary.uploader.upload(req.files.proof.tempFilePath, { folder: "SA_PROOFS" });
  if (!cloud || cloud.error) return next(new ErrorHandler("Upload failed.", 500));

  const proof = await PaymentProof.create({
    userId: req.user._id,
    proof: { public_id: cloud.public_id, url: cloud.secure_url },
    amount: Number(amount), comment
  });
  res.status(201).json({ success: true, message: "Proof submitted. Admin will review within 24 hours.", proof });
});

// Commission is now deducted automatically from the auctioneer's payout at delivery
// confirmation (see confirmDelivery) and sent straight to the platform — no manual
// payment or proof upload is required any more. This endpoint just surfaces that
// automatic history to the auctioneer.
export const getMyCommissions = catchAsyncErrors(async (req: any, res: Response) => {
  const commissions = await Commission.find({ auctioneer: req.user._id }).sort({ createdAt: -1 }).populate("auction", "title image");
  const total = commissions.reduce((sum, c) => sum + c.amount, 0);
  res.status(200).json({ success: true, commissions, total });
});

// ── CHATBOT ───────────────────────────────────────────────────────────────────
export const chatbotMessage = catchAsyncErrors(async (req: any, res: Response, next: NextFunction) => {
  const { message } = req.body;
  if (!message?.trim()) return next(new ErrorHandler("Message required.", 400));

  // Fetch last 10 messages for context
  const history = await ChatMessage.find({ user: req.user._id })
    .sort({ createdAt: -1 }).limit(10).lean();
  const formatted = history.reverse().map(m => ({ role: m.role as "user"|"assistant", content: m.content }));

  // Give the bot order-tracking context so it can answer directly
  const recentOrders = await Order.find({ $or: [{ winner: req.user._id }, { auctioneer: req.user._id }] })
    .sort({ createdAt: -1 }).limit(5)
    .populate("auction", "title");
  const orderContext = recentOrders.map(o => ({
    title: (o.auction as any)?.title || o.snapshot?.auctionTitle || "item",
    deliveryStatus: o.deliveryStatus, paymentStatus: o.paymentStatus,
    trackingId: o.shipmentDetails?.trackingId, courier: o.shipmentDetails?.courier,
    price: o.price
  }));

  const { reply, escalate } = await chatWithAI(message.trim(), formatted, { userName: req.user.userName, recentOrders: orderContext });

  // Save both messages
  await ChatMessage.create([
    { user: req.user._id, role: "user", content: message.trim() },
    { user: req.user._id, role: "assistant", content: reply }
  ]);

  if (escalate) {
    try {
      await ChatComplaint.create({
        user: req.user._id, userName: req.user.userName, email: req.user.email,
        details: `User message: ${message.trim()}\n\nBot response: ${reply}`
      });
      await sendEmail({
        email: ADMIN_EMAIL,
        subject: `Chatbot escalation from ${req.user.userName}`,
        message: `A user's issue could not be resolved by the SmartAuction AI assistant and needs human follow-up.\n\nUser: ${req.user.userName} (${req.user.email})\n\nMessage: ${message.trim()}\n\nBot reply: ${reply}`
      });
    } catch (_) { /* never block the chat reply on escalation failures */ }
  }

  res.status(200).json({ success: true, reply, escalated: escalate });
});

export const getChatHistory = catchAsyncErrors(async (req: any, res: Response) => {
  const messages = await ChatMessage.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50).lean();
  res.status(200).json({ success: true, messages: messages.reverse() });
});

export const clearChatHistory = catchAsyncErrors(async (req: any, res: Response) => {
  await ChatMessage.deleteMany({ user: req.user._id });
  res.status(200).json({ success: true, message: "Chat history cleared." });
});

// ── ADMIN ─────────────────────────────────────────────────────────────────────
export const adminGetDashboard = catchAsyncErrors(async (_req: any, res: Response) => {
  const { Auction } = require("../models/auctionSchema");
  const [totalUsers, totalAuctions, activeAuctions, openComplaints, openChatComplaints, revenueData, recentActivity] = await Promise.all([
    User.countDocuments(),
    Auction.countDocuments(),
    Auction.countDocuments({ status: "active" }),
    Order.countDocuments({ complaintStatus: "open" }),
    ChatComplaint.countDocuments({ status: "open" }),
    Commission.aggregate([{ $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, total: { $sum: "$amount" }, count: { $sum: 1 } } }, { $sort: { "_id.year": -1, "_id.month": -1 } }, { $limit: 12 }]),
    Notification.find().sort({ createdAt: -1 }).limit(10)
  ]);
  const totalRevenue = await Commission.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]);
  const categoryStats = await Auction.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }, { $sort: { count: -1 } }]);

  res.status(200).json({
    success: true,
    stats: { totalUsers, totalAuctions, activeAuctions, totalRevenue: totalRevenue[0]?.total || 0, openComplaints, openChatComplaints },
    revenueData, categoryStats, recentActivity
  });
});

export const adminGetUsers = catchAsyncErrors(async (_req: any, res: Response) => {
  const users = await User.find().sort({ createdAt: -1 }).select("-password -otp");
  res.status(200).json({ success: true, users });
});

export const adminToggleBlock = catchAsyncErrors(async (req: any, res: Response, next: NextFunction) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new ErrorHandler("User not found.", 404));
  if (user.role === "Super Admin") return next(new ErrorHandler("Cannot block a Super Admin.", 403));
  user.blocked = !user.blocked;
  await user.save();
  if (user.blocked) await sendEmail({ email: user.email, subject: "Account Suspended", message: `Dear ${user.userName},\n\nYour account has been suspended. Contact support if you believe this is a mistake.\n\nSmartAuction Team` });
  res.status(200).json({ success: true, message: `User ${user.blocked ? "blocked" : "unblocked"}.`, blocked: user.blocked });
});

export const adminDeleteUser = catchAsyncErrors(async (req: any, res: Response, next: NextFunction) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new ErrorHandler("User not found.", 404));
  if (user.role === "Super Admin") return next(new ErrorHandler("Cannot delete Super Admin.", 403));
  await user.deleteOne();
  res.status(200).json({ success: true, message: "User deleted." });
});

export const adminGetProofs = catchAsyncErrors(async (_req: any, res: Response) => {
  const proofs = await PaymentProof.find().populate("userId","userName email unpaidCommission").sort({ uploadedAt: -1 });
  res.status(200).json({ success: true, proofs });
});

export const adminUpdateProof = catchAsyncErrors(async (req: any, res: Response, next: NextFunction) => {
  const { status, amount } = req.body;
  const proof = await PaymentProof.findById(req.params.id).populate("userId","userName email unpaidCommission");
  if (!proof) return next(new ErrorHandler("Proof not found.", 404));
  proof.status = status;
  await proof.save();
  const user = proof.userId as any;
  if (status === "Approved" && amount) {
    await User.findByIdAndUpdate(user._id, { $inc: { unpaidCommission: -Number(amount) } });
    await sendEmail({ email: user.email, subject: "Commission payment approved", message: `Your payment of ₹${amount} has been approved. Your balance has been updated.` });
  } else if (status === "Rejected") {
    await sendEmail({ email: user.email, subject: "Commission proof rejected", message: `Your payment proof was rejected. Please resubmit a valid screenshot.` });
  }
  res.status(200).json({ success: true, message: `Proof ${status}.`, proof });
});

export const adminGetComplaints = catchAsyncErrors(async (_req: any, res: Response) => {
  const orders = await pop(Order.find({ complaintStatus: "open" }).sort({ createdAt: -1 }));
  res.status(200).json({ success: true, orders });
});

export const adminResolveComplaint = catchAsyncErrors(async (req: any, res: Response, next: NextFunction) => {
  const { action, adminNote } = req.body;
  const order = await pop(Order.findById(req.params.id));
  if (!order) return next(new ErrorHandler("Order not found.", 404));
  order.complaintStatus = action;
  if (adminNote && order.complaints.length > 0) {
    const last = order.complaints[order.complaints.length - 1];
    last.replied = true; last.replyMessage = adminNote;
  }
  await order.save();
  const msg = `Your complaint was ${action} by admin.${adminNote ? ` Note: ${adminNote}` : ""}`;
  const winner = order.winner as any, auctioneer = order.auctioneer as any;
  if (winner?.email) await sendEmail({ email: winner.email, subject: "Complaint update", message: msg });
  if (auctioneer?.email) await sendEmail({ email: auctioneer.email, subject: "Complaint update", message: msg });
  res.status(200).json({ success: true, message: `Complaint ${action}.` });
});

// All commission is automatic now — this just lists recent Commission entries
// across every auctioneer so admin can audit platform revenue at a glance.
export const adminGetCommissions = catchAsyncErrors(async (_req: any, res: Response) => {
  const commissions = await Commission.find().sort({ createdAt: -1 }).limit(100)
    .populate("auctioneer", "userName email").populate("auction", "title image");
  const total = await Commission.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]);
  res.status(200).json({ success: true, commissions, total: total[0]?.total || 0 });
});

export const adminGetChatComplaints = catchAsyncErrors(async (_req: any, res: Response) => {
  const complaints = await ChatComplaint.find({ status: "open" }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, complaints });
});

export const adminResolveChatComplaint = catchAsyncErrors(async (req: any, res: Response, next: NextFunction) => {
  const complaint = await ChatComplaint.findById(req.params.id);
  if (!complaint) return next(new ErrorHandler("Complaint not found.", 404));
  complaint.status = "resolved";
  await complaint.save();
  res.status(200).json({ success: true, message: "Complaint marked resolved." });
});

export const adminDeleteAuction = catchAsyncErrors(async (req: any, res: Response, next: NextFunction) => {
  const auction = await Auction.findById(req.params.id);
  if (!auction) return next(new ErrorHandler("Auction not found.", 404));
  await Bid.deleteMany({ auctionItem: auction._id });
  await Order.deleteMany({ auction: auction._id });
  if (auction.image?.public_id) await cloudinary.uploader.destroy(auction.image.public_id).catch(() => {});
  await auction.deleteOne();
  res.status(200).json({ success: true, message: "Auction deleted by admin." });
});

// ── SITE RATING ──────────────────────────────────────────────────────────────
// Logged-in users rate the platform once (User Satisfaction, AI Features,
// Chatbot Assistance, each 1-5). Shown on the Home page in place of the
// "Ready to start bidding?" CTA once the user is authenticated.
export const getMySiteRating = catchAsyncErrors(async (req: any, res: Response) => {
  const rating = await SiteRating.findOne({ user: req.user._id });
  res.status(200).json({ success: true, rating });
});

export const submitSiteRating = catchAsyncErrors(async (req: any, res: Response, next: NextFunction) => {
  const existing = await SiteRating.findOne({ user: req.user._id });
  if (existing) return next(new ErrorHandler("You've already rated SmartAuction. Thanks for your feedback!", 400));

  const { userSatisfaction, aiFeatures, chatbotAssistance } = req.body;
  for (const v of [userSatisfaction, aiFeatures, chatbotAssistance]) {
    if (typeof v !== "number" || v < 1 || v > 5) return next(new ErrorHandler("All three ratings must be between 1 and 5.", 400));
  }

  const rating = await SiteRating.create({ user: req.user._id, userSatisfaction, aiFeatures, chatbotAssistance });
  res.status(201).json({ success: true, message: "Thanks for rating SmartAuction!", rating });
});
