// backend/controllers/adminDeliveryController.js
import { Auction } from "../models/auctionSchema.js";
import { User } from "../models/userSchema.js";
import { Notification } from "../models/notificationSchema.js";
import { Order } from "../models/orderSchema.js";
import { sendEmail } from "../utils/sendEmail.js";
import Razorpay from "razorpay";

/**
 * ✅ GET ended auctions awaiting shipment/delivery
 */
export const getEndedAuctions = async (req, res) => {
  try {
    // Fetch all relevant auctions
    const auctions = await Auction.find({
      paymentStatus: { $in: ["holding", "completed", "paid"] },
      deliveryStatus: { $in: ["Pending", "Shipped"] },
    })
      .populate("winner", "userName email")
      .populate("highestBidder", "userName email")
      .sort({ updatedAt: -1 })
      .lean();

    // Map the fields we need, including shipmentDetails now
    const formatted = auctions.map((a) => ({
      _id: a._id,
      title: a.title,
      category: a.category,
      finalBidAmount: a.finalBidAmount || a.currentBid || 0,
      deliveryStatus: a.deliveryStatus,
      paymentStatus: a.paymentStatus,
      payoutReleased: a.payoutReleased || false,
      highestBidderName: a.winner?.userName || a.highestBidder?.userName || "N/A",
      highestBidderEmail: a.winner?.email || a.highestBidder?.email || "N/A",
      image: a.image?.url || "",

      // ✅ Added this:
      shipmentDetails: {
        courier: a.shipmentDetails?.courier || null,
        trackingNumber: a.shipmentDetails?.trackingNumber || null,
        shippedAt: a.shipmentDetails?.shippedAt || null,
      },
    }));

    res.status(200).json({ success: true, auctions: formatted });
  } catch (error) {
    console.error("❌ Error fetching ended auctions:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * ✅ RazorpayX Instance
 */
let razorpayX = null;
function getRazorpayX() {
  if (!razorpayX) {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) {
      console.warn("⚠️ Razorpay keys missing — payout disabled.");
      return null;
    }
    razorpayX = new Razorpay({ key_id, key_secret });
  }
  return razorpayX;
}

/**
 * ✅ Mark delivery completed & trigger payout
 */
export const markDeliveryCompleted = async (req, res) => {
  try {
    const { auctionId } = req.params;

    const auction = await Auction.findById(auctionId)
      .populate("createdBy", "userName email upiId paymentMethods")
      .populate("highestBidder", "userName email");

    if (!auction) return res.status(404).json({ success: false, message: "Auction not found" });

    const order = await Order.findOne({ auction: auctionId });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    if (order.deliveryStatus === "completed")
      return res.status(400).json({ success: false, message: "Delivery already completed" });

    const auctioneer = await User.findById(auction.createdBy._id);
    if (!auctioneer) return res.status(404).json({ success: false, message: "Auctioneer not found" });

    const payoutAmount = order.payoutAmount;
    const commissionAmount = order.commissionAmount;

    const razorpayInstance = getRazorpayX();
    let payoutResponse = { id: "dev_mode_payout_id" };

    if (razorpayInstance) {
      try {
        const payoutBody = {
          account_number: auctioneer.paymentMethods?.upi?.upiId || auctioneer.upiId,
          amount: payoutAmount * 100,
          currency: "INR",
          mode: "UPI",
          purpose: "payout",
          queue_if_low_balance: true,
          narration: `Auction payout for ${auction.title}`,
          reference_id: `auction_payout_${auction._id}_${Date.now()}`,
        };

        payoutResponse = await razorpayInstance.payouts.create(payoutBody);
      } catch (err) {
        console.warn("⚠️ Payout attempt failed:", err.message);
      }
    }

    // ✅ Update delivery + payout
    order.deliveryStatus = "completed";
    order.paymentStatus = "paid";
    order.payoutStatus = "paid";
    await order.save();

    await Auction.findByIdAndUpdate(auctionId, {
      $set: { deliveryStatus: "Completed", paymentStatus: "paid" },
    });

    // ✅ Notify both users
    await Notification.create({
      user: auctioneer._id,
      message: `💰 ₹${payoutAmount} credited (after ₹${commissionAmount} commission) for "${auction.title}"`,
      auction: auction._id,
    });

    await Notification.create({
      user: auction.highestBidder._id,
      message: `📦 Delivery confirmed for "${auction.title}"`,
      auction: auction._id,
    });

    // ✅ Emails
    await sendEmail({
      email: auctioneer.email,
      subject: `Payout released for "${auction.title}"`,
      message: `Dear ${auctioneer.userName},

Your payout of ₹${payoutAmount} for "${auction.title}" has been released.

Commission deducted: ₹${commissionAmount}
Net credited: ₹${payoutAmount}

Best regards,
SmartAuction Team`,
    });

    await sendEmail({
      email: auction.highestBidder.email,
      subject: `Delivery confirmed for "${auction.title}"`,
      message: `Dear ${auction.highestBidder.userName},

Your item "${auction.title}" has been marked as delivered successfully.

Thank you for participating in SmartAuction!

Best regards,
SmartAuction Team`,
    });

    res.json({
      success: true,
      message: "✅ Delivery completed & payout released successfully",
      payoutAmount,
      payoutId: payoutResponse?.id || null,
    });
  } catch (error) {
    console.error("❌ markDeliveryCompleted error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
