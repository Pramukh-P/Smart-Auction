// backend/controllers/orderController.js
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { Order } from "../models/orderSchema.js";
import { User } from "../models/userSchema.js";
import { Auction } from "../models/auctionSchema.js";
import { Commission } from "../models/commissionSchema.js";
import mongoose from "mongoose";
import { sendPayoutToAuctioneer } from "../utils/payoutHelper.js";
import { sendEmail } from "../utils/sendEmail.js";

export const getMyOrders = catchAsyncErrors(async (req, res, next) => {
  const orders = await Order.find({ winner: req.user.id })
    .populate("auction")
    .populate("auctioneer")
    .populate("winner");
  res.status(200).json({ success: true, orders });
});

export const getSalesOrders = catchAsyncErrors(async (req, res, next) => {
  const orders = await Order.find({ auctioneer: req.user.id })
    .populate("auction")
    .populate("auctioneer")
    .populate("winner");
  res.status(200).json({ success: true, orders });
});

export const getBidderActiveOrders = catchAsyncErrors(
  async (req, res, next) => {
    const now = Date.now();
    const FOUR_HOURS = 4 * 60 * 60 * 1000;
    const TWO_HOURS = 2 * 60 * 60 * 1000;

    const orders = await Order.find({
      winner: req.user.id,
    })
      .sort({ updatedAt: -1 })
      .populate("auction")
      .populate("auctioneer")
      .populate("winner");

    const enrichedOrders = orders.map((order) => {
      let pendingReason = null;

      // 🔴 Complaint open → ALWAYS pending
      if (order.complaintStatus === "open") {
        pendingReason = "complaint_open";
      }

      // 🟠 Complaint resolved → 2 hours grace
      else if (
        order.complaintStatus === "resolved" &&
        order.complaintResolvedAt &&
        now - new Date(order.complaintResolvedAt).getTime() < TWO_HOURS
      ) {
        pendingReason = "complaint_resolved_recent";
      }

      // 🟢 Delivery completed → 4 hours grace
      else if (
        order.deliveryStatus === "completed" &&
        order.paidAt &&
        now - new Date(order.paidAt).getTime() < FOUR_HOURS
      ) {
        pendingReason = "recently_delivered";
      }

      // 🔵 Still in progress
      else if (
        ["pending", "shipped", "delivered", "problem"].includes(
          order.deliveryStatus
        )
      ) {
        pendingReason = "in_progress";
      }

      return {
        ...order.toObject(),
        pendingReason,
      };
    });

    res.status(200).json({
      success: true,
      orders: enrichedOrders,
    });
  }
);

export const getAuctioneerActiveOrders = catchAsyncErrors(
  async (req, res, next) => {
    const now = Date.now();
    const FOUR_HOURS = 4 * 60 * 60 * 1000;
    const TWO_HOURS = 2 * 60 * 60 * 1000;

    const orders = await Order.find({
      auctioneer: req.user.id,
    })
      .sort({ updatedAt: -1 })
      .populate("auction")
      .populate("auctioneer")
      .populate("winner");

    const enrichedOrders = orders.map((order) => {
      let pendingReason = null;

      if (order.complaintStatus === "open") {
        pendingReason = "complaint_open";
      } else if (
        order.complaintStatus === "resolved" &&
        order.complaintResolvedAt &&
        now - new Date(order.complaintResolvedAt).getTime() < TWO_HOURS
      ) {
        pendingReason = "complaint_resolved_recent";
      } else if (
        order.deliveryStatus === "completed" &&
        order.paidAt &&
        now - new Date(order.paidAt).getTime() < FOUR_HOURS
      ) {
        pendingReason = "recently_delivered";
      } else if (
        ["pending", "shipped", "delivered", "problem"].includes(
          order.deliveryStatus
        )
      ) {
        pendingReason = "in_progress";
      }

      return {
        ...order.toObject(),
        pendingReason,
      };
    });

    res.status(200).json({
      success: true,
      orders: enrichedOrders,
    });
  }
);



export const getOrderById = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Order not found", 404));
  }
  const order = await Order.findById(id)
    .populate("auction")
    .populate("auctioneer")
    .populate("winner");

  if (!order) {
    return next(new ErrorHandler("Order not found", 404));
  }

  if (!Array.isArray(order.complaints)) {
    order.complaints = [];
  }

  res.status(200).json({ success: true, order });
});

export const updateOrderShipment = catchAsyncErrors(
  async (req, res, next) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorHandler("Order not found", 404));
    }

    const order = await Order.findById(id)
      .populate("auction")
      .populate("auctioneer")
      .populate("winner");

    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    if (req.user.role === "Auctioneer") {
      const auctioneerIdFromOrder =
        order.auctioneer?._id || order.auctioneer;
      if (
        !auctioneerIdFromOrder ||
        auctioneerIdFromOrder.toString() !== req.user.id.toString()
      ) {
        return next(
          new ErrorHandler("You are not allowed to ship this order", 403)
        );
      }
    }

    if (order.deliveryStatus === "shipped") {
      return next(new ErrorHandler("Order already shipped", 400));
    }

    if (["delivered", "completed"].includes(order.deliveryStatus)) {
      return next(
        new ErrorHandler("Delivered order cannot be updated", 400)
      );
    }

    const { courier, trackingId, notes } = req.body || {};
    if (!courier || !trackingId) {
      return next(
        new ErrorHandler("Complete shipment details required.", 400)
      );
    }

    order.deliveryStatus = "shipped";
    order.shipmentDetails = {
      courier,
      trackingId,
      shippedDate: new Date(),
      notes,
    };
    await order.save();

    if (order.winner?.email) {
      const auctionTitle = order.auction?.title || "auction item";
      const bidderName = order.winner.userName || "Bidder";
      const message = [
        `Hi ${bidderName},`,
        "",
        `Your order for "${auctionTitle}" has been shipped by the auctioneer.`,
        "",
        `Courier: ${courier}`,
        `Tracking ID: ${trackingId}`,
        notes ? `Notes from seller: ${notes}` : "",
        "",
        "You can track the shipment using the above details.",
      ]
        .filter(Boolean)
        .join("\n");

      await sendEmail({
        email: order.winner.email,
        subject: `Your order has been shipped - ${auctionTitle}`,
        message,
      });
    }

    res.status(200).json({
      success: true,
      message: "Order marked as shipped and bidder notified",
      order,
    });
  }
);

export const updateOrderDelivery = catchAsyncErrors(
  async (req, res, next) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorHandler("Order not found", 404));
    }

    const order = await Order.findById(id)
      .populate("auction")
      .populate("auctioneer")
      .populate("winner");

    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    if (order.deliveryStatus !== "shipped") {
      return next(new ErrorHandler("Order not shipped yet.", 400));
    }

    order.deliveryStatus = "delivered";
    order.payoutStatus = "processing";
    await order.save();

    const auctioneerUser = await User.findById(order.auctioneer);
    if (!auctioneerUser) {
      return next(new ErrorHandler("Auctioneer not found", 404));
    }

    try {
      const upiId = auctioneerUser.paymentMethods?.upi?.upiId;
      const result = await sendPayoutToAuctioneer(
        upiId,
        order.payoutAmount,
        order.id
      );

      order.payoutStatus = "done";
      order.payoutTxId = result?.txId || result?.transactionId || "NA";
      order.paidAt = new Date();
      order.deliveryStatus = "completed";
      await order.save();

      if (order.auction) {
        await Auction.findByIdAndUpdate(
          order.auction._id || order.auction,
          {
            paymentStatus: "paid",
            deliveryStatus: "Completed",
            payoutReleased: true,
          },
          { new: true }
        );
      }

      // write commission to dedicated collection
      if (order.commissionAmount && order.commissionAmount > 0) {
        await Commission.create({
          amount: order.commissionAmount,
          order: order._id,
          auction: order.auction?._id || order.auction,
          auctioneer: order.auctioneer?._id || order.auctioneer,
          source: "Auto Payout",
        });
      }

      const auctionTitle = order.auction?.title || "your auction item";

      await sendEmail({
        email: auctioneerUser.email,
        subject: `Payout processed for ${auctionTitle}`,
        message: `${
          order.payoutAmount
        } credited after ${order.commissionAmount} commission for ${auctionTitle}.`,
      });

      if (order.winner?.email) {
        const bidderName = order.winner.userName || "Bidder";
        const bidderMessage = [
          `Hi ${bidderName},`,
          "",
          `Your order for "${auctionTitle}" is marked as delivered by admin.`,
          "",
          "If there is any issue, please raise a complaint from the order details page.",
        ].join("\n");

        await sendEmail({
          email: order.winner.email,
          subject: `Delivery completed for ${auctionTitle}`,
          message: bidderMessage,
        });
      }

      res.status(200).json({
        success: true,
        message:
          "Delivery confirmed, payout completed, commission recorded, and auction updated.",
        order,
      });
    } catch (err) {
      order.payoutStatus = "failed";
      order.payoutError = err.message;
      await order.save();
      return next(
        new ErrorHandler(`Payout failed: ${err.message}`, 500)
      );
    }
  }
);

export const getAdminOrders = catchAsyncErrors(
  async (req, res, next) => {
    const orders = await Order.find({ paymentStatus: "paid" })
      .sort({ createdAt: -1 })
      .populate("auction")
      .populate("auctioneer")
      .populate("winner");
    res.status(200).json({ success: true, orders });
  }
);

// The complaint-related handlers you already have:
export const blockBidder = catchAsyncErrors(async (req, res, next) => {
  // existing logic
});

export const blockAuctioneer = catchAsyncErrors(async (req, res, next) => {
  // existing logic
});

export const rateAuctioneer = catchAsyncErrors(async (req, res, next) => {
  // existing logic
});

export const raiseOrderComplaint = catchAsyncErrors(
  async (req, res, next) => {
    const { orderId, reason, subject } = req.body;
    if (!orderId || !reason) {
      return next(
        new ErrorHandler("Order and reason are required.", 400)
      );
    }
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return next(new ErrorHandler("Order not found.", 404));
    }
    const order = await Order.findById(orderId);
    if (!order) {
      return next(new ErrorHandler("Order not found.", 404));
    }
    if (order.winner.toString() !== req.user.id.toString()) {
      return next(
        new ErrorHandler(
          "You cannot complain about this order.",
          403
        )
      );
    }

    if (!Array.isArray(order.complaints)) {
      order.complaints = [];
    }

    const alreadyOpen = order.complaints.some(
      (c) => c.role === "Bidder" && c.replied === false
    );
    if (alreadyOpen) {
      return next(
        new ErrorHandler(
          "You already have an open complaint for this order.",
          400
        )
      );
    }

    order.complaints.push({
      by: req.user.id,
      role: "Bidder",
      subject: subject || "Order complaint",
      message: reason,
    });

    order.complaintStatus = "open";
    order.complaintResolvedAt = null;
    order.deliveryStatus = "problem"; // ⭐ IMPORTANT

    await order.save();
    res.status(201).json({
      success: true,
      message: "Complaint submitted.",
      complaints: order.complaints,
    });
  }
);

export const replyOrderComplaint = catchAsyncErrors(
  async (req, res, next) => {
    const { orderId, reply } = req.body;
    if (!orderId || !reply) {
      return next(
        new ErrorHandler("OrderId and reply are required.", 400)
      );
    }
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return next(new ErrorHandler("Order not found.", 404));
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return next(new ErrorHandler("Order not found.", 404));
    }

    if (order.auctioneer.toString() !== req.user.id.toString()) {
      return next(
        new ErrorHandler(
          "Not allowed to reply on this order complaint.",
          403
        )
      );
    }

    if (!Array.isArray(order.complaints) || order.complaints.length === 0) {
      return next(
        new ErrorHandler("No complaint found for this order.", 400)
      );
    }

    const lastComplaint =
      order.complaints[order.complaints.length - 1];
    lastComplaint.replied = true;
    lastComplaint.replyMessage = reply;
    lastComplaint.repliedAt = new Date();

    order.complaintStatus = "resolved";
    order.complaintResolvedAt = new Date();
    order.deliveryStatus = "completed"; // ✅ restore

    await order.save();
    res.status(200).json({
      success: true,
      message: "Reply stored on complaint.",
      complaints: order.complaints,
    });
  }
);
