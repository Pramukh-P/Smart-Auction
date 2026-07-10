import cron from "node-cron";
import { Auction } from "../models/auctionSchema";
import { Order, Bid, Notification, Commission } from "../models/index";
import { User } from "../models/userSchema";
import { sendEmail, sendBulkEmails, emailTemplates } from "../utils/sendEmail";
import { broadcastToAuction } from "../utils/wsManager";

export const startCronJobs = (): void => {

  // ── Every minute: end expired auctions ──────────────────────────────────────
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const expired = await Auction.find({ status: "active", endTime: { $lte: now } });

      for (const auction of expired) {
        auction.status = "ended";

        if (auction.highestBidder && auction.currentBid > 0) {
          auction.winner = auction.highestBidder;
          auction.finalBidAmount = auction.currentBid;
          const deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          auction.paymentDeadline = deadline;
          await auction.save();

          // Create order if not exists
          const existingOrder = await Order.findOne({ auction: auction._id });
          if (!existingOrder) {
            const commAmt = Math.round(auction.finalBidAmount * 0.05);
            const payoutAmt = auction.finalBidAmount - commAmt;
            const winner = await User.findById(auction.highestBidder);
            const auctioneer = await User.findById(auction.createdBy);

            const order = await Order.create({
              auction: auction._id,
              auctioneer: auction.createdBy,
              winner: auction.highestBidder,
              price: auction.finalBidAmount,
              commissionRate: 0.05,
              commissionAmount: commAmt,
              payoutAmount: payoutAmt,
              snapshot: {
                auctionTitle: auction.title,
                auctionImage: auction.image?.url,
                winnerName: winner?.userName || auction.highestBidderName,
                auctioneerName: auctioneer?.userName || "",
                wonAt: now
              }
            });

            // Update winner stats
            await User.findByIdAndUpdate(auction.highestBidder, {
              $inc: { auctionsWon: 1, moneySpent: auction.finalBidAmount }
            });

            // Notifications
            await Notification.create({
              user: auction.highestBidder,
              auction: auction._id,
              type: "win",
              message: `🎉 You won "${auction.title}"! Pay ₹${auction.finalBidAmount.toLocaleString()} within 24 hours.`,
              link: `/my-orders/${order._id}`
            });

            await Notification.create({
              user: auction.createdBy,
              auction: auction._id,
              type: "payment",
              message: `Your auction "${auction.title}" ended. Winner: ${winner?.userName}. Bid: ₹${auction.finalBidAmount.toLocaleString()}`,
              link: `/my-auctions`
            });

            // Emails
            if (winner?.email) {
              await sendEmail({
                email: winner.email,
                subject: `🎉 You won "${auction.title}"!`,
                message: "",
                html: emailTemplates.auctionWon(winner.userName, auction.title, auction.finalBidAmount, String(order._id), deadline.toLocaleString())
              });
            }
            if (auctioneer?.email) {
              await sendEmail({
                email: auctioneer.email,
                subject: `Auction ended: "${auction.title}"`,
                message: `Your auction ended.\nWinner: ${winner?.userName}\nBid: ₹${auction.finalBidAmount.toLocaleString()}\nYou'll receive ₹${payoutAmt.toLocaleString()} after delivery confirmation.`
              });
            }

            // NOTE: commission is now fully automatic — it's deducted from the
            // auctioneer's payout at delivery confirmation and recorded on the
            // Commission collection there (see confirmDelivery). No manual
            // "unpaidCommission" debt or payment-proof upload is needed any more.
            console.log(`✅ Auction ended: "${auction.title}" | Winner: ${winner?.userName} | Bid: ₹${auction.finalBidAmount}`);
          }
        } else {
          // No bids
          await auction.save();
          console.log(`📭 Auction ended (no bids): "${auction.title}"`);
        }

        // Broadcast end
        broadcastToAuction(String(auction._id), { type: "auction_ended", auctionId: String(auction._id), status: "ended" });
      }
    } catch (err: any) {
      console.error("❌ Auction end cron:", err.message);
    }
  });

  // ── Every 5 minutes: detect unpaid winners, relist ──────────────────────────
  cron.schedule("*/5 * * * *", async () => {
    try {
      const now = new Date();
      const unpaid = await Auction.find({
        status: "ended",
        paymentStatus: "pending",
        paymentDeadline: { $lte: now },
        winner: { $ne: null }
      });

      for (const auction of unpaid) {
        console.log(`🔄 Relisting unpaid auction: "${auction.title}"`);

        const winner = await User.findById(auction.winner);
        const auctioneer = await User.findById(auction.createdBy);

        // Undo winner stats
        if (auction.winner) {
          await User.findByIdAndUpdate(auction.winner, {
            $inc: { auctionsWon: -1, moneySpent: -(auction.finalBidAmount || 0) }
          });
        }

        // Get all previous bidder user IDs (excluding failed winner)
        const prevBidderIds = auction.bids
          .filter(b => String(b.userId) !== String(auction.winner))
          .map(b => b.userId);

        // Email failed winner
        if (winner?.email) {
          await sendEmail({
            email: winner.email,
            subject: `Payment deadline expired for "${auction.title}"`,
            message: `Dear ${winner.userName},\n\nYour 24-hour payment window for "${auction.title}" (₹${auction.finalBidAmount?.toLocaleString()}) has expired. The auction has been relisted.\n\nSmartAuction Team`
          });
        }

        // Email auctioneer
        if (auctioneer?.email) {
          await sendEmail({
            email: auctioneer.email,
            subject: `Auction relisted: "${auction.title}"`,
            message: `Dear ${auctioneer.userName},\n\nThe winner of "${auction.title}" did not complete payment. Your item has been automatically relisted and all previous bidders have been notified.\n\nSmartAuction Team`
          });
        }

        // Email all previous bidders (second chance)
        if (prevBidderIds.length > 0) {
          const bidderUsers = await User.find({ _id: { $in: prevBidderIds }, email: { $exists: true } }).select("email userName");
          const emails = bidderUsers.map(u => u.email).filter(Boolean) as string[];
          if (emails.length > 0) {
            await sendBulkEmails(
              emails,
              `🔔 Second Chance: "${auction.title}" is back!`,
              `Good news! The auction for "${auction.title}" has been relisted.`,
              emailTemplates.secondChance(auction.title, auction.startingBid, String(auction._id))
            );
          }

          // In-app notifications
          for (const bidderId of prevBidderIds) {
            await Notification.create({
              user: bidderId,
              auction: auction._id,
              type: "relist",
              message: `🔔 Second chance! "${auction.title}" has been relisted. Bid now!`,
              link: `/auction/item/${auction._id}`
            });
          }
        }

        // Delete old order + bids
        await Order.deleteMany({ auction: auction._id });
        await Bid.deleteMany({ auctionItem: auction._id });

        // Relist for 24 hours
        const newEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        auction.status = "active";
        auction.startTime = now;
        auction.endTime = newEnd;
        auction.winner = null;
        auction.highestBidder = null;
        auction.highestBidderName = "";
        auction.highestBidderEmail = "";
        auction.currentBid = 0;
        auction.finalBidAmount = 0;
        auction.paymentStatus = "pending";
        auction.paymentDeadline = undefined;
        auction.bids = [];
        auction.republishCount = (auction.republishCount || 0) + 1;
        await auction.save();

        broadcastToAuction(String(auction._id), {
          type: "auction_relisted",
          auctionId: String(auction._id),
          newEndTime: newEnd.toISOString()
        });

        console.log(`✅ Relisted: "${auction.title}" until ${newEnd.toLocaleString()}`);
      }
    } catch (err: any) {
      console.error("❌ Unpaid auction cron:", err.message);
    }
  });

  console.log("⏰ Cron jobs started");
};
