// backend/router/superAdminRoutes.js
import express from "express";
import { isAuthenticated, isAuthorized } from "../middlewares/auth.js";
import {
  deleteAuctionItem,
  deletePaymentProof,
  fetchAllUsers,
  getAllPaymentProofs,
  getPaymentProofDetail,
  updateProofStatus,
  getMonthlyCommissions,
  getUsersByRole,
  getUserDetail,
  deleteUser,
  getBidderUnpaidAuctions,
  getAuctioneerUnshippedAuctions,
  getMonthlyIncome,
} from "../controllers/superAdminController.js";
import {
  getEndedAuctions,
  markDeliveryCompleted,
} from "../controllers/adminDeliveryController.js";

const router = express.Router();

// 💳 Payment Proof Management
router.get(
  "/paymentproofs/getall",
  isAuthenticated,
  isAuthorized("Super Admin"),
  getAllPaymentProofs
);

router.get(
  "/paymentproof/:id",
  isAuthenticated,
  isAuthorized("Super Admin"),
  getPaymentProofDetail
);

router.put(
  "/paymentproof/status/update/:id",
  isAuthenticated,
  isAuthorized("Super Admin"),
  updateProofStatus
);

router.delete(
  "/paymentproof/delete/:id",
  isAuthenticated,
  isAuthorized("Super Admin"),
  deletePaymentProof
);

// 👥 User Statistics
router.get(
  "/users/getall",
  isAuthenticated,
  isAuthorized("Super Admin"),
  fetchAllUsers
);

// 💰 Monthly revenue for admin (COMMISSIONS ONLY)
router.get(
  "/monthlyincome",
  isAuthenticated,
  isAuthorized("Super Admin"),
  getMonthlyCommissions
);

// (Optional) Total GMV from orders, if you ever need it separately
router.get(
  "/monthlygmv",
  isAuthenticated,
  isAuthorized("Super Admin"),
  getMonthlyIncome
);

// 🚚 Delivery & Auction Management
router.get(
  "/auction/ended",
  isAuthenticated,
  isAuthorized("Super Admin"),
  getEndedAuctions
);

router.put(
  "/auction/delivery/complete/:auctionId",
  isAuthenticated,
  isAuthorized("Super Admin"),
  markDeliveryCompleted
);

router.delete(
  "/auctionitem/delete/:id",
  isAuthenticated,
  isAuthorized("Super Admin"),
  deleteAuctionItem
);

// User management + unpaid/unshipped
router.get(
  "/users/byrole",
  isAuthenticated,
  isAuthorized("Super Admin"),
  getUsersByRole
);
router.get(
  "/user/:id",
  isAuthenticated,
  isAuthorized("Super Admin"),
  getUserDetail
);
router.delete(
  "/user/delete/:id",
  isAuthenticated,
  isAuthorized("Super Admin"),
  deleteUser
);
router.get(
  "/user/bidder/unpaid/:id",
  isAuthenticated,
  isAuthorized("Super Admin"),
  getBidderUnpaidAuctions
);
router.get(
  "/user/auctioneer/unshipped/:id",
  isAuthenticated,
  isAuthorized("Super Admin"),
  getAuctioneerUnshippedAuctions
);

export default router;
