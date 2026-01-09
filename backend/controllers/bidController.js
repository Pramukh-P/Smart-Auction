// backend/controllers/bidController.js

import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { Auction } from "../models/auctionSchema.js";
import { Bid } from "../models/bidSchema.js";
import { User } from "../models/userSchema.js";
import { Notification } from "../models/notificationSchema.js";
import { broadcastToAuctionRoom } from "../server.js";

/**
 * @route POST /api/v1/bid/place/:id
 * @desc Place or update a bid on an auction item
 * @access Private (Bidder)
 */
export const placeBid = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  // Normalize amount from body and ensure it is numeric
  let { amount } = req.body;
  if (amount === undefined || amount === null || amount === "") {
    return next(new ErrorHandler("Please place your bid.", 400));
  }
  amount = Number(amount);
  if (Number.isNaN(amount) || amount <= 0) {
    return next(new ErrorHandler("Please place your bid.", 400));
  }

  const auctionItem = await Auction.findById(id).populate("createdBy");
  if (!auctionItem) {
    return next(new ErrorHandler("Auction Item not found.", 404));
  }

  if (auctionItem.status !== "active") {
    return next(new ErrorHandler("Auction not active.", 400));
  }

  if (amount <= (auctionItem.currentBid || 0)) {
    return next(
      new ErrorHandler(
        "Bid amount must be greater than the current bid.",
        400
      )
    );
  }
  if (amount < auctionItem.startingBid) {
    return next(
      new ErrorHandler("Bid amount must be greater than starting bid.", 400)
    );
  }

  const bidderDetail = await User.findById(req.user._id);
  if (!bidderDetail) {
    return next(new ErrorHandler("Bidder not found.", 404));
  }
  if (bidderDetail.blocked) {
    return next(new ErrorHandler("Your account is blocked.", 403));
  }

  // NEW: only Bidder role can place bids
  if (bidderDetail.role !== "Bidder") {
    return next(
      new ErrorHandler("Only bidders are allowed to place bids.", 403)
    );
  }

  try {
    const existingBid = await Bid.findOne({
      "bidder.id": req.user._id,
      auctionItem: auctionItem._id,
    });

    const existingBidInAuction = auctionItem.bids.find(
      (bid) => String(bid.userId) === String(req.user._id)
    );

    if (existingBid && existingBidInAuction) {
      // Update existing bid
      existingBidInAuction.amount = amount;
      existingBid.amount = amount;
      await existingBid.save();
      auctionItem.currentBid = amount;
    } else {
      // New bid
      await Bid.create({
        amount,
        bidder: {
          id: bidderDetail._id,
          userName: bidderDetail.userName,
          profileImage: bidderDetail.profileImage?.url,
        },
        auctionItem: auctionItem._id,
      });

      auctionItem.bids.push({
        userId: req.user._id,
        userName: bidderDetail.userName,
        profileImage: bidderDetail.profileImage?.url,
        amount,
      });

      auctionItem.currentBid = amount;
    }

    // Update highest bidder info
    auctionItem.highestBidder = bidderDetail._id;
    auctionItem.highestBidderName = bidderDetail.userName;
    auctionItem.highestBidderEmail = bidderDetail.email;

    await auctionItem.save();

    // Notifications: previous highest bidder
    if (auctionItem.bids.length > 1) {
      const sortedBids = [...auctionItem.bids].sort(
        (a, b) => b.amount - a.amount
      );
      const prevHighestBidder = sortedBids[1];
      if (String(prevHighestBidder.userId) !== String(req.user._id)) {
        await Notification.create({
          user: prevHighestBidder.userId,
          message: `Your bid has been overbid on "${auctionItem.title}".`,
          auction: auctionItem._id,
        });
      }
    }

    // Notifications: auctioneer
    if (String(auctionItem.createdBy._id) !== String(req.user._id)) {
      await Notification.create({
        user: auctionItem.createdBy._id,
        message: `A new bid was placed on your auction "${auctionItem.title}".`,
        auction: auctionItem._id,
      });
    }

    // WebSocket broadcast to all watchers of this auction
    broadcastToAuctionRoom(auctionItem._id, {
      type: "bid_update",
      auctionId: String(auctionItem._id),
      currentBid: auctionItem.currentBid,
      highestBidderId: String(auctionItem.highestBidder),
      highestBidderName: auctionItem.highestBidderName,
      totalBids: auctionItem.bids.length,
      bids: auctionItem.bids.map((b) => ({
        userId: String(b.userId),
        userName: b.userName,
        amount: b.amount,
        profileImage: b.profileImage,
      })),
      updatedAt: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: "Bid placed successfully.",
      currentBid: auctionItem.currentBid,
    });
  } catch (error) {
    return next(
      new ErrorHandler(error.message || "Failed to place bid.", 500)
    );
  }
});
