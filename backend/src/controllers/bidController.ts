import { Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Auction } from "../models/auctionSchema";
import { Bid, Notification } from "../models/index";
import { User } from "../models/userSchema";
import { catchAsyncErrors } from "../middlewares/index";
import ErrorHandler from "../middlewares/error";
import { broadcastToAuction, notifyUser } from "../utils/wsManager";

// Per-auction mutex to prevent race conditions on simultaneous bids
const bidLocks = new Map<string, boolean>();

export const placeBid = catchAsyncErrors(async (req: any, res: Response, next: NextFunction) => {
  const auctionId = String(req.params.id);

  // Validate input first (before lock)
  let amount = Number(req.body.amount);
  if (!req.body.amount || isNaN(amount) || amount <= 0)
    return next(new ErrorHandler("Valid bid amount required.", 400));

  // Acquire lock — reject if already locked
  if (bidLocks.get(auctionId))
    return next(new ErrorHandler("A bid is being processed. Retry in a moment.", 409));
  bidLocks.set(auctionId, true);

  try {
    const auction = await Auction.findById(auctionId).populate("createdBy","_id email userName");
    if (!auction) return next(new ErrorHandler("Auction not found.", 404));

    const now = new Date();
    if (auction.status !== "active") return next(new ErrorHandler("Auction is not active.", 400));
    if (new Date(auction.startTime) > now) return next(new ErrorHandler("Auction has not started yet.", 400));
    if (new Date(auction.endTime) < now) return next(new ErrorHandler("Auction has ended.", 400));

    const minBid = Math.max(auction.currentBid, auction.startingBid) + 1;
    if (amount < minBid) return next(new ErrorHandler(`Bid must be at least ₹${minBid}.`, 400));

    const bidder = await User.findById(req.user._id);
    if (!bidder) return next(new ErrorHandler("Bidder not found.", 404));
    if (bidder.role !== "Bidder") return next(new ErrorHandler("Only bidders can place bids.", 403));
    if (bidder.blocked) return next(new ErrorHandler("Account blocked.", 403));

    const auctioneerId = (auction.createdBy as any)?._id?.toString() || auction.createdBy?.toString();
    if (auctioneerId === String(req.user._id))
      return next(new ErrorHandler("You cannot bid on your own auction.", 403));

    const prevHighestBidderId = auction.highestBidder ? String(auction.highestBidder) : null;

    // Upsert bid in bids array
    const existingBidIdx = auction.bids.findIndex(b => String(b.userId) === String(req.user._id));
    if (existingBidIdx > -1) {
      auction.bids[existingBidIdx].amount = amount;
      auction.bids[existingBidIdx].timestamp = now;
    } else {
      auction.bids.push({ userId: bidder._id, userName: bidder.userName, profileImage: bidder.profileImage?.url, amount, timestamp: now });
    }

    // Upsert Bid document
    await Bid.findOneAndUpdate(
      { "bidder.id": bidder._id, auctionItem: auction._id },
      { amount, bidder: { id: bidder._id, userName: bidder.userName, profileImage: bidder.profileImage?.url } },
      { upsert: true, new: true }
    );

    auction.currentBid = amount;
    auction.highestBidder = bidder._id;
    auction.highestBidderName = bidder.userName;
    auction.highestBidderEmail = bidder.email;

    // ── Anti-snipe: extend auction by 3 min if bid placed in last 3 min ──
    const timeLeft = new Date(auction.endTime).getTime() - now.getTime();
    const EXTENSION_MS = 3 * 60 * 1000;
    let extended = false;
    if (timeLeft > 0 && timeLeft <= EXTENSION_MS) {
      auction.endTime = new Date(auction.endTime.getTime() + EXTENSION_MS);
      extended = true;
    }

    await auction.save();

    // Notify outbid user (in-app + WS)
    if (prevHighestBidderId && prevHighestBidderId !== String(req.user._id)) {
      const note = await Notification.create({
        user: new mongoose.Types.ObjectId(prevHighestBidderId),
        auction: auction._id,
        type: "outbid",
        message: `You've been outbid on "${auction.title}". New bid: ₹${amount.toLocaleString()}`,
        link: `/auction/item/${auction._id}`
      });
      notifyUser(prevHighestBidderId, { type: "outbid_notification", auctionId, auctionTitle: auction.title, newBid: amount, notification: note });
    }

    // Notify auctioneer (in-app)
    if (auctioneerId && auctioneerId !== String(req.user._id)) {
      await Notification.create({
        user: new mongoose.Types.ObjectId(auctioneerId),
        auction: auction._id,
        type: "bid",
        message: `New bid of ₹${amount.toLocaleString()} on "${auction.title}" by ${bidder.userName}`,
        link: `/auction/item/${auction._id}`
      });
    }

    // WS broadcast to all watchers in room
    const sortedBids = [...auction.bids].sort((a, b) => b.amount - a.amount).slice(0, 20);
    broadcastToAuction(auctionId, {
      type: "bid_update",
      auctionId,
      currentBid: auction.currentBid,
      highestBidderId: String(bidder._id),
      highestBidderName: bidder.userName,
      totalBids: auction.bids.length,
      bids: sortedBids,
      endTime: auction.endTime.toISOString(),
      extended,
      updatedAt: now.toISOString()
    });

    if (extended) {
      broadcastToAuction(auctionId, {
        type: "auction_extended",
        auctionId,
        newEndTime: auction.endTime.toISOString(),
        message: "⏰ Auction extended by 3 minutes due to a last-minute bid!"
      });
    }

    res.status(201).json({
      success: true,
      message: extended ? "Bid placed! Auction extended by 3 minutes." : "Bid placed successfully.",
      currentBid: auction.currentBid,
      endTime: auction.endTime,
      extended
    });
  } finally {
    bidLocks.delete(auctionId);
  }
});
