// backend/router/auctioneerRoutes.js
import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { Auction } from "../models/auctionSchema.js";
import { Notification } from "../models/notificationSchema.js";
import { sendEmail } from "../utils/sendEmail.js";

const router = express.Router();

/**
 * GET /api/v1/auctioneer/my-orders
 * Returns all finished auctions created by this auctioneer (where winner exists)
 */
router.get("/my-orders", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;

    const auctions = await Auction.find({
      createdBy: userId,
      status: { $in: ["ended", "completed"] },
      highestBidder: { $ne: null },
    })
      .populate("highestBidder", "userName email")
      .sort({ createdAt: -1 })
      .lean();

    const formatted = auctions.map((auction) => ({
      _id: auction._id,
      title: auction.title,
      finalBidAmount: auction.finalBidAmount || auction.currentBid || 0,
      paymentStatus: auction.paymentStatus,
      deliveryStatus: auction.deliveryStatus || "Pending",
      shipmentDetails: auction.shipmentDetails || {},
      payoutReleased: auction.payoutReleased || false,
      commissionAmount: Math.round((auction.finalBidAmount || 0) * 0.05),
      sellerAmount: Math.round((auction.finalBidAmount || 0) * 0.95),
      highestBidderName:
        auction.highestBidderName ||
        auction.highestBidder?.userName ||
        "N/A",
      highestBidderEmail:
        auction.highestBidderEmail ||
        auction.highestBidder?.email ||
        "N/A",
    }));

    res.json({ success: true, auctions: formatted });
  } catch (error) {
    console.error("Auctioneer my-orders error:", error);
    res
      .status(500)
      .json({ success: false, message: "Could not fetch auctions." });
  }
});

/**
 * PUT /api/v1/auctioneer/update-shipment/:auctionId
 * Sets/updates shipment details for an auction (by auctioneer)
 */
router.put("/update-shipment/:auctionId", isAuthenticated, async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { courier, trackingNumber } = req.body;

    if (!courier || !trackingNumber) {
      return res
        .status(400)
        .json({ message: "Courier and tracking number are required." });
    }

    const auction = await Auction.findOne({
      _id: auctionId,
      createdBy: req.user._id,
    }).populate("highestBidder", "email userName");

    if (!auction) {
      return res
        .status(404)
        .json({ message: "Auction not found or not owned by you." });
    }

    // ✅ Allow both 'paid' and 'holding' payments
    if (!["paid", "holding"].includes(auction.paymentStatus)) {
      return res
        .status(400)
        .json({ message: "Payment not confirmed or invalid for shipment." });
    }

    // Prevent reshipping after completion
    if (auction.deliveryStatus === "Completed") {
      return res
        .status(400)
        .json({ message: "This order is already marked completed." });
    }

    // ✅ Update shipment details
    auction.shipmentDetails = {
      courier,
      trackingNumber,
      shippedAt: new Date(),
    };
    auction.deliveryStatus = "Shipped";
    await auction.save();

    // ✅ Notify the bidder (winner)
    if (auction.highestBidder?._id) {
      await Notification.create({
        user: auction.highestBidder._id,
        message: `📦 Your item "${auction.title}" has been shipped via ${courier} (Tracking: ${trackingNumber}).`,
        auction: auction._id,
      });

      if (auction.highestBidder.email) {
        await sendEmail({
          email: auction.highestBidder.email,
          subject: `Your auction item "${auction.title}" has been shipped!`,
          message: `Dear ${auction.highestBidder.userName},

Your auction item "${auction.title}" has been shipped successfully!

📦 Courier: ${courier}
🔢 Tracking Number: ${trackingNumber}

You can track your shipment using the provided tracking number.

Thank you for using SmartAuction!

Best regards,
SmartAuction Team`,
        });
      }
    }

    res.json({
      success: true,
      message: "Shipment details updated and notification sent.",
      deliveryStatus: auction.deliveryStatus,
      shipmentDetails: auction.shipmentDetails,
    });
  } catch (error) {
    console.error("update-shipment error:", error);
    res
      .status(500)
      .json({ success: false, message: "Could not save shipment." });
  }
});

export default router;
