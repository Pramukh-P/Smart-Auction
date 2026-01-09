// backend / automation / endedAuctionCron.js

import cron from "node-cron";
import { Auction } from "../models/auctionSchema.js";
import { User } from "../models/userSchema.js";
import { Notification } from "../models/notificationSchema.js";
import { sendEmail } from "../utils/sendEmail.js";
import { calculateCommission } from "../controllers/commissionController.js";
import { Order } from "../models/orderSchema.js";

/**
 * Cron job to process auctions that have ended
 * Runs every minute, updates status, calculates commission,
 * notifies winner and auctioneer, and creates orders.
 */
export const endedAuctionCron = () => {
  cron.schedule("*/1 * * * *", async () => {
    try {
      const now = new Date();
      console.log("⏳ Running endedAuctionCron...");

      // Fetch active auctions passed endTime and not yet processed
      const endedAuctions = await Auction.find({
        status: "active",
        endTime: { $lt: now },
        commissionCalculated: false,
      });

      for (const auction of endedAuctions) {
        try {
          console.log(`🔔 Processing auction: ${auction.title}`);

          // Calculate commission
          const commissionAmount = await calculateCommission(auction._id);

          // Mark auction ended and commission processed
          auction.status = "ended";
          auction.commissionCalculated = true;

          if (auction.bids && auction.bids.length > 0) {
            // Find highest bid
            const sortedBids = [...auction.bids].sort((a, b) => b.amount - a.amount);
            const highestBid = sortedBids[0];
            auction.highestBidder = highestBid.userId;
            auction.finalBidAmount = highestBid.amount;
            auction.deliveryStatus = "Pending";
            auction.paymentStatus = "pending";

            await auction.save();

            // Create order record
            let order = await Order.findOne({ auction: auction._id });
            if (!order) {
              order = new Order({
                auction: auction._id,
                auctioneer: auction.createdBy,
                winner: highestBid.userId,
                price: highestBid.amount,
                paymentStatus: "pending",
                deliveryStatus: "pending",
                payoutStatus: "pending",
                commissionAmount,
                payoutAmount: Math.round(highestBid.amount * 0.95),
                complaintStatus: "none",
              });
              await order.save();
            }

            // Update User stats
            const bidder = await User.findById(highestBid.userId);
            const auctioneer = await User.findById(auction.createdBy);
            if (bidder && auctioneer) {
              await User.findByIdAndUpdate(
                bidder._id,
                { $inc: { moneySpent: highestBid.amount, auctionsWon: 1 } },
                { new: true }
              );
              await User.findByIdAndUpdate(
                auctioneer._id,
                { $inc: { unpaidCommission: commissionAmount } },
                { new: true }
              );
            }

            // Notifications to bidder and auctioneer
            await Notification.create({
              user: bidder._id,
              message: `🎉 You won the auction "${auction.title}" with a bid of ₹${highestBid.amount}. Please complete payment.`,
              auction: auction._id,
            });
            await Notification.create({
              user: auctioneer._id,
              message: `✅ Your auction "${auction.title}" has ended. Winner: ${bidder.userName}, Bid: ₹${highestBid.amount}.`,
              auction: auction._id,
            });

            // Emails to bidder and auctioneer
            if (bidder.email) {
              await sendEmail({
                email: bidder.email,
                subject: `Congratulations! You won the auction for "${auction.title}"`,
                message: `Dear ${bidder.userName},

You have won the auction "${auction.title}" with a winning bid of ₹${highestBid.amount}.

Please contact the auctioneer at: ${auctioneer.email || "Not available"} to complete payment.

Thank you for using SmartAuction!

Best regards,
Smart Auction Team`,
              });
            }
            if (auctioneer.email) {
              await sendEmail({
                email: auctioneer.email,
                subject: `Your auction "${auction.title}" has ended`,
                message: `Dear ${auctioneer.userName},

Your auction "${auction.title}" has ended.

Winner Details:
- Name: ${bidder.userName}
- Email: ${bidder.email}
- Bid: ₹${highestBid.amount}

Your commission of ₹${commissionAmount} is due to the platform.

Please update delivery status once shipped/delivered.

Thank you for hosting with SmartAuction!

Best regards,
Smart Auction Team`,
              });
            }
          } else {
            // No bids => mark auction ended with no payout
            auction.finalBidAmount = 0;
            auction.deliveryStatus = "Completed";
            auction.paymentStatus = "failed";
            auction.payoutReleased = true;
            await auction.save();
            console.log(`⚠️ No bids for auction "${auction.title}"`);
          }
        } catch (innerError) {
          console.error("❌ Error processing auction:", auction._id, innerError);
        }
      }
    } catch (error) {
      console.error("❌ Error in endedAuctionCron:", error);
    }
  });
};
