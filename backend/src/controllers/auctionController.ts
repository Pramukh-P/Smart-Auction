import { Request, Response, NextFunction } from "express";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import { Auction } from "../models/auctionSchema";
import { Bid, Order, Notification } from "../models/index";
import { User } from "../models/userSchema";
import { catchAsyncErrors } from "../middlewares/index";
import ErrorHandler from "../middlewares/error";
import { generateAIDescription, generatePricePrediction } from "../utils/aiHelpers";
import { broadcastToAuction } from "../utils/wsManager";
import { sendEmail } from "../utils/sendEmail";

export const createAuction = catchAsyncErrors(async (req: any, res: Response, next: NextFunction) => {
  if (!req.files?.image) return next(new ErrorHandler("Item image required.", 400));
  const { image } = req.files;
  if (!["image/png","image/jpeg","image/webp"].includes(image.mimetype))
    return next(new ErrorHandler("Only PNG/JPG/WEBP images allowed.", 400));

  const { title, description, category, condition, startingBid, startTime, endTime } = req.body;
  if (!title||!description||!category||!condition||!startingBid||!startTime||!endTime)
    return next(new ErrorHandler("All fields are required.", 400));

  const start = new Date(startTime), end = new Date(endTime), now = new Date();
  if (start < now) return next(new ErrorHandler("Start time must be in the future.", 400));
  if (start >= end) return next(new ErrorHandler("End time must be after start time.", 400));
  const minDuration = 30 * 60 * 1000;
  if (end.getTime() - start.getTime() < minDuration) return next(new ErrorHandler("Auction must run for at least 30 minutes.", 400));

  const activeCount = await Auction.countDocuments({ createdBy: req.user._id, status: "active" });
  if (activeCount >= 5) return next(new ErrorHandler("Max 5 active auctions at a time.", 400));

  const cloud = await cloudinary.uploader.upload(image.tempFilePath, { folder: "SA_AUCTIONS" });
  if (!cloud || cloud.error) return next(new ErrorHandler("Image upload failed.", 500));

  const auction = await Auction.create({
    title, description, category, condition,
    startingBid: Number(startingBid),
    startTime: start, endTime: end,
    image: { public_id: cloud.public_id, url: cloud.secure_url },
    createdBy: req.user._id
  });

  // Generate AI content asynchronously (non-blocking)
  (async () => {
    try {
      const [aiDesc, aiPrice] = await Promise.all([
        generateAIDescription(title, description, category, condition),
        generatePricePrediction(title, category, condition, Number(startingBid))
      ]);
      const updates: any = {};
      if (aiDesc) updates.aiDescription = aiDesc;
      if (aiPrice) updates.aiPricePrediction = aiPrice;
      if (Object.keys(updates).length) await Auction.findByIdAndUpdate(auction._id, updates);
    } catch (_) {}
  })();

  res.status(201).json({ success: true, message: `Auction created. Goes live at ${start.toLocaleString()}`, auction });
});

// Category counts ignore the currently-selected category filter (but respect
// search/status) so the sidebar can show accurate counts for every category at once,
// instead of just the counts within whatever category is already selected.
export const getCategoryCounts = catchAsyncErrors(async (req: Request, res: Response) => {
  const { status, search } = req.query as any;
  const filter: any = {};
  if (status) {
    if (status === "live") { filter.status = "active"; filter.startTime = { $lte: new Date() }; }
    else if (status === "upcoming") { filter.status = "active"; filter.startTime = { $gt: new Date() }; }
    else if (status === "ended") filter.status = "ended";
  }
  if (search) filter.title = { $regex: search, $options: "i" };

  const [byCategory, total] = await Promise.all([
    Auction.aggregate([{ $match: filter }, { $group: { _id: "$category", count: { $sum: 1 } } }]),
    Auction.countDocuments(filter)
  ]);
  const counts: Record<string, number> = { All: total };
  for (const c of byCategory) counts[c._id] = c.count;
  res.status(200).json({ success: true, counts });
});

export const getAllAuctions = catchAsyncErrors(async (req: Request, res: Response) => {
  const { category, status, search, sort, page = "1", limit = "20" } = req.query as any;
  const filter: any = {};
  if (category && category !== "All") filter.category = category;
  if (status) {
    if (status === "live") { filter.status = "active"; filter.startTime = { $lte: new Date() }; }
    else if (status === "upcoming") { filter.status = "active"; filter.startTime = { $gt: new Date() }; }
    else if (status === "ended") filter.status = "ended";
  }
  if (search) filter.title = { $regex: search, $options: "i" };

  const sortMap: any = { newest: { createdAt: -1 }, "ending-soon": { endTime: 1 }, "price-low": { currentBid: 1 }, "price-high": { currentBid: -1 } };
  const sortObj = sortMap[sort] || { createdAt: -1 };
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [items, total] = await Promise.all([
    Auction.find(filter).populate("createdBy","userName profileImage").sort(sortObj).skip(skip).limit(parseInt(limit)),
    Auction.countDocuments(filter)
  ]);

  res.status(200).json({ success: true, items, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

export const getAuctionById = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return next(new ErrorHandler("Invalid auction ID.", 400));
  const auction = await Auction.findById(req.params.id)
    .populate("createdBy","userName email profileImage paymentMethods")
    .populate("winner","userName email profileImage")
    .populate("highestBidder","userName profileImage");
  if (!auction) return next(new ErrorHandler("Auction not found.", 404));

  // Lazy-generate AI content if missing
  if (!auction.aiDescription || !auction.aiPricePrediction) {
    (async () => {
      try {
        const updates: any = {};
        if (!auction.aiDescription) {
          const desc = await generateAIDescription(auction.title, auction.description, auction.category, auction.condition);
          if (desc) updates.aiDescription = desc;
        }
        if (!auction.aiPricePrediction) {
          const price = await generatePricePrediction(auction.title, auction.category, auction.condition, auction.startingBid);
          if (price) updates.aiPricePrediction = price;
        }
        if (Object.keys(updates).length) await Auction.findByIdAndUpdate(auction._id, updates);
      } catch (_) {}
    })();
  }

  const bidders = [...auction.bids].sort((a, b) => b.amount - a.amount);
  const order = auction.winner ? await Order.findOne({ auction: auction._id }) : null;
  res.status(200).json({ success: true, auction, bidders, order });
});

export const getMyAuctions = catchAsyncErrors(async (req: any, res: Response) => {
  const auctions = await Auction.find({ createdBy: req.user._id })
    .populate("winner","userName email")
    .sort({ createdAt: -1 });
  res.status(200).json({ success: true, auctions });
});

export const deleteAuction = catchAsyncErrors(async (req: any, res: Response, next: NextFunction) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return next(new ErrorHandler("Invalid ID.", 400));
  const auction = await Auction.findById(req.params.id);
  if (!auction) return next(new ErrorHandler("Auction not found.", 404));
  if (String(auction.createdBy) !== String(req.user._id) && req.user.role !== "Super Admin")
    return next(new ErrorHandler("Not authorized.", 403));
  if (auction.status === "active" && auction.bids.length > 0)
    return next(new ErrorHandler("Cannot delete auction with active bids.", 400));
  if (auction.image?.public_id) await cloudinary.uploader.destroy(auction.image.public_id).catch(() => {});
  await auction.deleteOne();
  res.status(200).json({ success: true, message: "Auction deleted." });
});

export const republishAuction = catchAsyncErrors(async (req: any, res: Response, next: NextFunction) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return next(new ErrorHandler("Invalid ID.", 400));
  const auction = await Auction.findById(req.params.id);
  if (!auction) return next(new ErrorHandler("Auction not found.", 404));
  if (String(auction.createdBy) !== String(req.user._id)) return next(new ErrorHandler("Not authorized.", 403));
  if (auction.status === "active") return next(new ErrorHandler("Auction is already active.", 400));

  const { startTime, endTime } = req.body;
  if (!startTime || !endTime) return next(new ErrorHandler("Start and end time required.", 400));
  const start = new Date(startTime), end = new Date(endTime);
  if (start < new Date()) return next(new ErrorHandler("Start time must be future.", 400));
  if (start >= end) return next(new ErrorHandler("End must be after start.", 400));

  // Undo winner stats if any
  if (auction.highestBidder) {
    await User.findByIdAndUpdate(auction.highestBidder, {
      $inc: { moneySpent: -(auction.currentBid || 0), auctionsWon: -1 }
    });
  }

  await Bid.deleteMany({ auctionItem: auction._id });
  await Order.deleteMany({ auction: auction._id });
  await User.findByIdAndUpdate(req.user._id, { unpaidCommission: 0 });

  const updated = await Auction.findByIdAndUpdate(req.params.id, {
    startTime: start, endTime: end, status: "active",
    bids: [], currentBid: 0, highestBidder: null,
    highestBidderName: "", highestBidderEmail: "",
    winner: null, paymentStatus: "pending", finalBidAmount: 0,
    paymentDeadline: undefined, commissionCalculated: false,
    $inc: { republishCount: 1 }
  }, { new: true });

  res.status(200).json({ success: true, message: `Auction republished. Goes live ${start.toLocaleString()}`, auction: updated });
});

// ── Q&A ───────────────────────────────────────────────────────────────────────
export const askQuestion = catchAsyncErrors(async (req: any, res: Response, next: NextFunction) => {
  const { question } = req.body;
  if (!question?.trim()) return next(new ErrorHandler("Question cannot be empty.", 400));
  const auction = await Auction.findById(req.params.id).populate("createdBy","email userName");
  if (!auction) return next(new ErrorHandler("Auction not found.", 404));

  auction.questions.push({ userId: req.user._id, userName: req.user.userName, question: question.trim(), askedAt: new Date() });
  await auction.save();

  // Notify auctioneer
  const auctioneer = auction.createdBy as any;
  if (auctioneer?.email) {
    await sendEmail({
      email: auctioneer.email,
      subject: `New question on "${auction.title}"`,
      message: `${req.user.userName} asked: "${question}"\n\nLog in to answer: ${process.env.FRONTEND_URL}/my-auctions`
    });
  }

  // Notify via WebSocket
  broadcastToAuction(String(auction._id), {
    type: "new_question",
    auctionId: String(auction._id),
    question: { userName: req.user.userName, question, askedAt: new Date() }
  });

  res.status(201).json({ success: true, message: "Question submitted. The seller will respond soon.", questions: auction.questions });
});

export const answerQuestion = catchAsyncErrors(async (req: any, res: Response, next: NextFunction) => {
  const { questionIndex, answer } = req.body;
  if (!answer?.trim()) return next(new ErrorHandler("Answer cannot be empty.", 400));
  const auction = await Auction.findById(req.params.id);
  if (!auction) return next(new ErrorHandler("Auction not found.", 404));
  if (String(auction.createdBy) !== String(req.user._id)) return next(new ErrorHandler("Not authorized.", 403));

  const q = auction.questions[questionIndex];
  if (!q) return next(new ErrorHandler("Question not found.", 404));
  q.answer = answer.trim();
  await auction.save();

  broadcastToAuction(String(auction._id), {
    type: "question_answered",
    auctionId: String(auction._id),
    questionIndex, answer
  });

  res.status(200).json({ success: true, message: "Answer posted.", questions: auction.questions });
});
