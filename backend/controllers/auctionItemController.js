// controllers/auctionItemController.js

import { Auction } from "../models/auctionSchema.js";
import { User } from "../models/userSchema.js";
import { Bid } from "../models/bidSchema.js";
import { Order } from "../models/orderSchema.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import { generateAuctionDescription } from "../utils/aiHelpers.js";
import { predictAuctionPriceML } from "../utils/mlPricePredictor.js";
/**
 * Add new auction item
 */
export const addNewAuctionItem = catchAsyncErrors(async (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return next(new ErrorHandler("Auction item image required.", 400));
  }

  const { image } = req.files;
  const allowedFormats = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedFormats.includes(image.mimetype)) {
    return next(new ErrorHandler("File format not supported.", 400));
  }

  const {
    title,
    description,
    category,
    condition,
    startingBid,
    startTime,
    endTime,
  } = req.body;
  if (
    !title ||
    !description ||
    !category ||
    !condition ||
    !startingBid ||
    !startTime ||
    !endTime
  ) {
    return next(new ErrorHandler("Please provide all details.", 400));
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (start < Date.now()) {
    return next(
      new ErrorHandler(
        "Auction starting time must be greater than present time.",
        400
      )
    );
  }
  if (start >= end) {
    return next(
      new ErrorHandler(
        "Auction starting time must be less than ending time.",
        400
      )
    );
  }

  const alreadyOneAuctionActive = await Auction.find({
    createdBy: req.user._id,
    status: "active",
    endTime: { $gt: new Date() },
  });

  if (alreadyOneAuctionActive.length > 2) {
    return next(
      new ErrorHandler("You already have three active auction."),
      400
    );
  }

  try {
    const cloudinaryResponse = await cloudinary.uploader.upload(
      image.tempFilePath,
      {
        folder: "MERN_AUCTION_PLATFORM_AUCTIONS",
      }
    );

    if (!cloudinaryResponse || cloudinaryResponse.error) {
      return next(
        new ErrorHandler(
          "Failed to upload auction image to cloudinary.",
          500
        )
      );
    }

    const auctionItem = await Auction.create({
      title,
      description,
      category,
      condition,
      startingBid,
      startTime: start,
      endTime: end,
      image: {
        public_id: cloudinaryResponse.public_id,
        url: cloudinaryResponse.secure_url,
      },
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: `Auction item created and will be listed on auction page at ${start}`,
      auctionItem,
    });
  } catch (error) {
    return next(
      new ErrorHandler(error.message || "Failed to create auction.", 500)
    );
  }
});

/**
 * Get all items for auction page
 */
export const getAllItems = catchAsyncErrors(async (req, res, next) => {
  let items = await Auction.find()
    .populate("createdBy", "userName name email")
    .populate("winner", "userName name email")
    .populate("highestBidder", "userName name email");

  res.status(200).json({ success: true, items });
});

/**
 * Get auction details (with bidder + order info)
 * - Populates winner/highestBidder/createdBy so returned auctionItem has winner.name & winner.email
 * - Also returns order and payment status for winner
 * - Generates aiDescription and aiPricePrediction once per auction (uses OpenAI if configured)
 */
export const getAuctionDetails = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid Id format.", 400));
  }

  let auctionItem = await Auction.findById(id)
    .populate("createdBy", "userName name email")
    .populate("highestBidder", "userName name email")
    .populate("winner", "userName name email");

  if (!auctionItem) return next(new ErrorHandler("Auction not found.", 404));

  // Lazily generate AI description and price prediction if missing
  let updated = false;

  if (!auctionItem.aiDescription) {
    const aiDesc = await generateAuctionDescription(auctionItem);
    if (aiDesc) {
      auctionItem.aiDescription = aiDesc;
      updated = true;
    }
  }

  if (
    typeof auctionItem.aiPricePrediction !== "number" ||
    auctionItem.aiPricePrediction <= 0
  ) {
    // Fetch comparables: last few ended auctions in same category
    const comparables = await Auction.find({
      category: auctionItem.category,
      status: "ended",
      finalBidAmount: { $gt: 0 },
    })
      .sort({ endTime: -1 })
      .limit(5)
      .select("title category condition startingBid finalBidAmount")
      .lean();

    const seller = await User.findById(auctionItem.createdBy);

const sellerRating =
  seller && seller.ratingCount > 0
    ? seller.ratingSum / seller.ratingCount
    : 0;

const avgComparablePrice =
  comparables.length > 0
    ? Math.round(
        comparables.reduce((sum, a) => sum + a.finalBidAmount, 0) /
          comparables.length
      )
    : 0;

const avgComparableBidCount =
  comparables.length > 0
    ? Math.round(
        comparables.reduce(
          (sum, a) => sum + (a.bids?.length || 0),
          0
        ) / comparables.length
      )
    : 0;

const mlPrice = await predictAuctionPriceML({
  startingBid: auctionItem.startingBid,
  category: auctionItem.category,
  condition: auctionItem.condition,
  sellerRating,
  startTime: auctionItem.startTime.toISOString(),
  avgComparablePrice,
  avgComparableBidCount,
});

if (mlPrice && mlPrice > 0) {
  auctionItem.aiPricePrediction = mlPrice;
  updated = true;
}

    if (mlPrice && mlPrice > 0) {
      auctionItem.aiPricePrediction = mlPrice;
      updated = true;
    }
  }

  if (updated) {
    await auctionItem.save();
  }

  // produce sorted bidders (descending by amount)
  const bidders = [...(auctionItem.bids || [])].sort(
    (a, b) => b.amount - a.amount
  );

  // If auction ended, find an order for the winner (try winner first, fallback to highestBidder)
  let order = null;
  const winnerId = auctionItem.winner || auctionItem.highestBidder;
  if (auctionItem.status === "ended" && winnerId) {
    order = await Order.findOne({
      auction: auctionItem._id,
      winner: winnerId,
    });
  }

  res.status(200).json({
    success: true,
    auctionItem: {
      ...auctionItem.toObject(),
      paymentStatus: auctionItem.paymentStatus,
    },
    bidders,
    order: order ? order.toObject() : null,
  });
});

/**
 * List my auctions
 */
export const getMyAuctionItems = catchAsyncErrors(async (req, res, next) => {
  const items = await Auction.find({ createdBy: req.user._id })
    .populate("winner", "userName name email")
    .populate("highestBidder", "userName name email");
  res.status(200).json({ success: true, items });
});

/**
 * Remove auction
 */
export const removeFromAuction = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return next(new ErrorHandler("Invalid Id format.", 400));
  const auctionItem = await Auction.findById(id);
  if (!auctionItem)
    return next(new ErrorHandler("Auction not found.", 404));
  await auctionItem.deleteOne();
  res
    .status(200)
    .json({ success: true, message: "Auction item deleted successfully." });
});

/**
 * Republish auction (reset winner/payment/status)
 */
export const republishItem = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return next(new ErrorHandler("Invalid Id format.", 400));

  let auctionItem = await Auction.findById(id);
  if (!auctionItem) return next(new ErrorHandler("Auction not found.", 404));
  if (!req.body.startTime || !req.body.endTime)
    return next(
      new ErrorHandler(
        "Starttime and Endtime for republish is mandatory.",
        400
      )
    );

  if (new Date(auctionItem.endTime) > Date.now())
    return next(
      new ErrorHandler("Auction is already active, cannot republish", 400)
    );

  let data = {
    startTime: new Date(req.body.startTime),
    endTime: new Date(req.body.endTime),
    status: "active",
  };
  if (data.startTime < Date.now())
    return next(
      new ErrorHandler(
        "Auction starting time must be greater than present time",
        400
      )
    );
  if (data.startTime >= data.endTime)
    return next(
      new ErrorHandler(
        "Auction starting time must be less than ending time.",
        400
      )
    );

  if (auctionItem.highestBidder) {
    const highestBidder = await User.findById(auctionItem.highestBidder);
    if (highestBidder) {
      highestBidder.moneySpent =
        (highestBidder.moneySpent || 0) - (auctionItem.currentBid || 0);
      highestBidder.auctionsWon = Math.max(
        0,
        (highestBidder.auctionsWon || 0) - 1
      );
      await highestBidder.save();
    }
  }

  data.bids = [];
  data.commissionCalculated = false;
  data.currentBid = 0;
  data.highestBidder = null;
  data.highestBidderName = "";
  data.highestBidderEmail = "";
  data.winner = null;
  data.paymentStatus = "pending";
  data.finalBidAmount = 0;

  auctionItem = await Auction.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  await Bid.deleteMany({ auctionItem: auctionItem._id });
  await Order.deleteMany({ auction: auctionItem._id });

  await User.findByIdAndUpdate(
    req.user._id,
    { unpaidCommission: 0 },
    { new: true, runValidators: false }
  );

  res.status(200).json({
    success: true,
    auctionItem,
    message: `Auction republished and will be active on ${req.body.startTime}`,
  });
});

/**
 * Helper: Save Winner Info
 */
export const saveWinnerDetails = async (auctionId) => {
  if (!mongoose.Types.ObjectId.isValid(auctionId)) return;
  const auction = await Auction.findById(auctionId).populate(
    "highestBidder",
    "userName name email"
  );
  if (!auction || !auction.highestBidder) return;

  const winnerUser = auction.highestBidder;

  const winnerName = winnerUser.userName || winnerUser.name || "";
  const winnerEmail = winnerUser.email || "";

  auction.highestBidderName = winnerName;
  auction.highestBidderEmail = winnerEmail;

  auction.winner = auction.highestBidder;

  if (auction.currentBid && auction.currentBid > 0) {
    auction.finalBidAmount = auction.currentBid;
  }

  await auction.save();
};

/**
 * GET /api/v1/auctioneer/my-orders
 */
export const getMyOrders = catchAsyncErrors(async (req, res, next) => {
  const auctions = await Auction.find({ createdBy: req.user._id })
    .populate("winner", "userName email")
    .populate("highestBidder", "userName email")
    .lean();

  const formatted = auctions.map((auction) => ({
    _id: auction._id,
    title: auction.title,
    finalBidAmount: auction.finalBidAmount || auction.currentBid || 0,
    paymentStatus: auction.paymentStatus,
    deliveryStatus: auction.deliveryStatus,
    shipmentDetails: auction.shipmentDetails || null,
    payoutReleased: auction.payoutReleased || false,
    commissionAmount:
      Math.round((auction.finalBidAmount || 0) * 0.05) || 0,
    sellerAmount:
      Math.round((auction.finalBidAmount || 0) * 0.95) || 0,
    highestBidderName:
      auction.highestBidderName ||
      auction.winner?.userName ||
      auction.highestBidder?.userName ||
      "N/A",
    highestBidderEmail:
      auction.highestBidderEmail ||
      auction.winner?.email ||
      auction.highestBidder?.email ||
      "N/A",
  }));

  res.status(200).json({ success: true, auctions: formatted });
});
