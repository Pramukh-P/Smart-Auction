// backend/controllers/complaintController.js
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { Complaint } from "../models/complaintSchema.js";
import { Order } from "../models/orderSchema.js";
import { User } from "../models/userSchema.js";
import { sendEmail } from "../utils/sendEmail.js";

// User (bidder/auctioneer) submits a complaint for an order
export const submitComplaint = catchAsyncErrors(async (req, res, next) => {
  const { orderId, reason } = req.body;
  if (!orderId || !reason) return next(new ErrorHandler("Order and reason required.", 400));

  const order = await Order.findById(orderId);
  if (!order) return next(new ErrorHandler("Order not found", 404));

  // Prevent duplicate open complaints
  const existing = await Complaint.findOne({ order: orderId, raisedBy: req.user._id, status: "open" });
  if (existing) return next(new ErrorHandler("You already have an open complaint for this order.", 400));

  const complaint = await Complaint.create({
    order: orderId,
    raisedBy: req.user._id,
    targetUser: req.user.role === "Bidder" ? order.auctioneer : order.winner,
    reason,
  });

  // Optionally notify admin
  res.status(201).json({ success: true, message: "Complaint submitted.", complaint });
});

// User lists their complaints
export const getMyComplaints = catchAsyncErrors(async (req, res, next) => {
  const complaints = await Complaint.find({ raisedBy: req.user._id }).populate("order targetUser");
  res.status(200).json({ success: true, complaints });
});

// Admin views all open or unresolved complaints
export const getAllComplaintsAdmin = catchAsyncErrors(async (req, res, next) => {
  const complaints = await Complaint.find({ status: { $in: ["open", "blocked"] } })
    .populate("order raisedBy targetUser");
  res.status(200).json({ success: true, complaints });
});

// Admin resolves complaint: marks as resolved, blocked, or processes refund; notifies users
export const resolveComplaint = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const { action, adminNote } = req.body; // action = "resolved" | "blocked" | "refund"

  const complaint = await Complaint.findById(id).populate("order raisedBy targetUser");
  if (!complaint) return next(new ErrorHandler("Complaint not found", 404));
  if (!["resolved", "blocked", "refund"].includes(action)) return next(new ErrorHandler("Invalid action.", 400));

  complaint.status = action;
  complaint.adminNote = adminNote;
  complaint.resolvedAt = new Date();
  await complaint.save();

  const order = await Order.findById(complaint.order);

  // If blocking user (bidder/auctioneer)
  if (action === "blocked" && complaint.targetUser) {
    await User.findByIdAndUpdate(complaint.targetUser, { blocked: true });
  }

  // If refund, simulate admin refund process here (manual step)
  if (action === "refund" && order) {
    order.payoutStatus = "problem";
    await order.save();
  }

  // Send email to complainant
  const user = await User.findById(complaint.raisedBy);
  if (user) {
    await sendEmail({
      email: user.email,
      subject: "Your complaint has been resolved",
      message: `Your complaint for order #${complaint.order} (${complaint.reason}) has been marked as: ${action.toUpperCase()}. Note: ${adminNote || "None"}`
    });
  }

  res.status(200).json({ success: true, message: "Complaint resolved.", complaint });
});
