// backend/controllers/superAdminController.js
import mongoose from "mongoose";
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { Commission } from "../models/commissionSchema.js";
import { User } from "../models/userSchema.js";
import { Auction } from "../models/auctionSchema.js";
import { Order } from "../models/orderSchema.js";
import { PaymentProof } from "../models/commissionProofSchema.js";

/* -------------------------------------------------------------
   🗑️ Delete Auction Item
------------------------------------------------------------- */
export const deleteAuctionItem = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid Id format.", 400));
  }
  const auctionItem = await Auction.findById(id);
  if (!auctionItem) {
    return next(new ErrorHandler("Auction not found.", 404));
  }

  await auctionItem.deleteOne();
  await Order.deleteMany({ auction: auctionItem._id });

  res.status(200).json({
    success: true,
    message: "Auction item and linked orders deleted successfully.",
  });
});

/* -------------------------------------------------------------
   💳 Get all Payment Proofs
------------------------------------------------------------- */
export const getAllPaymentProofs = catchAsyncErrors(
  async (req, res, next) => {
    const paymentProofs = await PaymentProof.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      paymentProofs,
    });
  }
);

/* -------------------------------------------------------------
   📄 Get Payment Proof Detail
------------------------------------------------------------- */
export const getPaymentProofDetail = catchAsyncErrors(
  async (req, res, next) => {
    const { id } = req.params;
    const paymentProofDetail = await PaymentProof.findById(id);
    res.status(200).json({
      success: true,
      paymentProofDetail,
    });
  }
);

/* -------------------------------------------------------------
   ✅ Update Payment Proof Status (Manual Approval)
------------------------------------------------------------- */
export const updateProofStatus = catchAsyncErrors(
  async (req, res, next) => {
    const { id } = req.params;
    const { amount, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ErrorHandler("Invalid ID format.", 400));
    }

    let proof = await PaymentProof.findById(id);
    if (!proof)
      return next(new ErrorHandler("Payment proof not found.", 404));

    proof = await PaymentProof.findByIdAndUpdate(
      id,
      { status, amount },
      { new: true, runValidators: true }
    );

    if (status === "Approved") {
      const user = await User.findById(proof.userId);
      if (user) {
        const settleAmount = Math.min(user.unpaidCommission || 0, amount);
        user.unpaidCommission = Math.max(
          user.unpaidCommission - amount,
          0
        );
        await user.save();

        await Commission.create({
          amount: settleAmount,
          user: user._id,
          source: "Manual Proof",
        });

        await PaymentProof.findByIdAndUpdate(proof._id, {
          status: "Settled",
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Payment proof amount and status updated successfully.",
      proof,
    });
  }
);

/* -------------------------------------------------------------
   🗑️ Delete Payment Proof
------------------------------------------------------------- */
export const deletePaymentProof = catchAsyncErrors(
  async (req, res, next) => {
    const { id } = req.params;
    const proof = await PaymentProof.findById(id);
    if (!proof)
      return next(new ErrorHandler("Payment proof not found.", 404));
    await proof.deleteOne();
    res.status(200).json({
      success: true,
      message: "Payment proof deleted successfully.",
    });
  }
);

/* -------------------------------------------------------------
   👥 Get User Statistics (Bidders / Auctioneers per Month)
------------------------------------------------------------- */
export const fetchAllUsers = catchAsyncErrors(async (req, res, next) => {
  const users = await User.aggregate([
    {
      $group: {
        _id: {
          month: { $month: "$createdAt" },
          role: "$role",
        },
        count: { $sum: 1 },
      },
    },
  ]);

  const bidders = users.filter((u) => u._id.role === "Bidder");
  const auctioneers = users.filter((u) => u._id.role === "Auctioneer");

  const toMonthlyArray = (arr) => {
    const result = Array(12).fill(0);
    arr.forEach((u) => (result[u._id.month - 1] = u.count));
    return result;
  };

  res.status(200).json({
    success: true,
    biddersArray: toMonthlyArray(bidders),
    auctioneersArray: toMonthlyArray(auctioneers),
  });
});

/* -------------------------------------------------------------
   📈 Monthly Commission Revenue (from Commission model)
------------------------------------------------------------- */
// export const getMonthlyCommissions = catchAsyncErrors(
//   async (req, res, next) => {
//     const commissionData = await Commission.aggregate([
//       {
//         $group: {
//           _id: {
//             month: { $month: "$createdAt" },
//             year: { $year: "$createdAt" },
//           },
//           totalAmount: { $sum: "$amount" },
//         },
//       },
//       { $sort: { "_id.year": 1, "_id.month": 1 } },
//     ]);

//     const monthlyTotals = Array(12).fill(0);
//     commissionData.forEach((entry) => {
//       monthlyTotals[entry._id.month - 1] = entry.totalAmount;
//     });

//     res.status(200).json({
//       success: true,
//       totalMonthlyRevenue: monthlyTotals,
//     });
//   }
// );

/* -------------------------------------------------------------
   👥 Get All Users by Role (Bidder / Auctioneer)
------------------------------------------------------------- */
export const getUsersByRole = catchAsyncErrors(async (req, res, next) => {
  const { role } = req.query;
  if (!["Bidder", "Auctioneer"].includes(role)) {
    return next(new ErrorHandler("Invalid role type", 400));
  }

  const users = await User.find({ role }).select(
    "userName email role createdAt"
  );
  res.status(200).json({ success: true, users });
});

/* -------------------------------------------------------------
   👤 Get Single User Details
------------------------------------------------------------- */
export const getUserDetail = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return next(new ErrorHandler("Invalid Id", 400));

  const user = await User.findById(id).select(
    "userName email role createdAt"
  );
  if (!user) return next(new ErrorHandler("User not found", 404));

  if (user.role === "Bidder") {
    const wonAuctions = await Auction.find({
      highestBidder: id,
      status: "ended",
    });
    const totalSpent = wonAuctions.reduce(
      (sum, a) => sum + (a.finalBidAmount || 0),
      0
    );
    const unpaid = wonAuctions.filter((a) => a.paymentStatus !== "paid");

    return res.status(200).json({
      success: true,
      user,
      stats: {
        totalWon: wonAuctions.length,
        totalSpent,
        unpaidAuctions: unpaid.length,
      },
    });
  }

  if (user.role === "Auctioneer") {
    const myAuctions = await Auction.find({ createdBy: id }).select("_id");
    const auctionIds = myAuctions.map((a) => a._id);

    const unshippedOrders = await Order.find({
      auctioneer: id,
      auction: { $in: auctionIds },
      paymentStatus: "paid",
      deliveryStatus: { $in: ["pending", "shipped"] },
    }).select("_id");

    return res.status(200).json({
      success: true,
      user,
      stats: {
        totalCreated: myAuctions.length,
        unshippedCount: unshippedOrders.length,
      },
    });
  }
});

/* -------------------------------------------------------------
   🗑️ Delete User
------------------------------------------------------------- */
export const deleteUser = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return next(new ErrorHandler("Invalid Id", 400));

  const user = await User.findById(id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  await user.deleteOne();

  await Auction.deleteMany({ createdBy: id });
  await Order.deleteMany({ winner: id });

  res.status(200).json({
    success: true,
    message: `${user.role} "${user.userName}" deleted successfully.`,
  });
});

/* -------------------------------------------------------------
   📦 Get Bidder's Unpaid Auctions
------------------------------------------------------------- */
export const getBidderUnpaidAuctions = catchAsyncErrors(
  async (req, res, next) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return next(new ErrorHandler("Invalid Id", 400));

    const unpaidAuctions = await Auction.find({
      highestBidder: id,
      paymentStatus: { $ne: "paid" },
      status: "ended",
    })
      .populate("createdBy", "userName email")
      .select(
        "title finalBidAmount createdBy paymentStatus deliveryStatus"
      );

    res.status(200).json({
      success: true,
      unpaidAuctions,
    });
  }
);

/* -------------------------------------------------------------
   🚚 Get Auctioneer's Unshipped Auctions (Paid but not delivered)
------------------------------------------------------------- */
export const getAuctioneerUnshippedAuctions = catchAsyncErrors(
  async (req, res, next) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return next(new ErrorHandler("Invalid Id", 400));

    const unshippedOrders = await Order.find({
      auctioneer: id,
      paymentStatus: "paid",
      deliveryStatus: { $in: ["pending", "shipped"] },
    })
      .populate("auction", "title finalBidAmount")
      .populate("winner", "userName email")
      .select(
        "auction winner price deliveryStatus paymentStatus commissionAmount payoutAmount"
      );

    res.status(200).json({
      success: true,
      unshipped: unshippedOrders.map((o) => ({
        _id: o._id,
        title: o.auction?.title || "Auction",
        finalBidAmount:
          o.price || o.auction?.finalBidAmount || 0,
        highestBidder: o.winner,
        paymentStatus: o.paymentStatus,
        deliveryStatus: o.deliveryStatus,
      })),
    });
  }
);

/* -------------------------------------------------------------
   📈 Monthly Commission Revenue (from Commission model)
------------------------------------------------------------- */
// inside backend/controllers/superAdminController.js

export const getMonthlyCommissions = catchAsyncErrors(
  async (req, res, next) => {
    const commissionData = await Commission.aggregate([
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
          },
          totalAmount: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthlyTotals = Array(12).fill(0);
    commissionData.forEach((entry) => {
      monthlyTotals[entry._id.month - 1] = entry.totalAmount;
    });

    res.status(200).json({
      success: true,
      totalMonthlyRevenue: monthlyTotals,
    });
  }
);


/* -------------------------------------------------------------
   💰 Monthly Income (Orders) – GMV (optional)
------------------------------------------------------------- */
export const getMonthlyIncome = catchAsyncErrors(
  async (req, res, next) => {
    const pipeline = [
      {
        $match: {
          paymentStatus: { $in: ["holding", "paid"] },
        },
      },
      {
        $project: {
          amount: "$price",
          paidMonth: {
            $month: { $ifNull: ["$paidAt", "$createdAt"] },
          },
        },
      },
      {
        $group: {
          _id: "$paidMonth",
          total: { $sum: "$amount" },
        },
      },
    ];

    const result = await Order.aggregate(pipeline);
    const monthlyTotals = new Array(12).fill(0);
    result.forEach((r) => (monthlyTotals[r._id - 1] = r.total));

    res.status(200).json({
      success: true,
      totalMonthlyRevenue: monthlyTotals,
    });
  }
);