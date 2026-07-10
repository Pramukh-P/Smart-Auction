import express from "express";
import { isAuthenticated, isAuthorized, trackCommissionStatus } from "../middlewares/index";
import * as UC from "../controllers/userController";
import * as AC from "../controllers/auctionController";
import { placeBid } from "../controllers/bidController";
import * as MC from "../controllers/mainControllers";

// ── User Routes ───────────────────────────────────────────────────────────────
export const userRouter = express.Router();
userRouter.post("/register", UC.register);
userRouter.post("/verify-otp", UC.verifyOTP);
userRouter.post("/resend-otp", UC.resendOTP);
userRouter.post("/login", UC.login);
userRouter.get("/logout", isAuthenticated, UC.logout);
userRouter.get("/me", isAuthenticated, UC.getProfile);
userRouter.put("/me", isAuthenticated, UC.updateProfile);
userRouter.get("/leaderboard", UC.fetchLeaderboard);
userRouter.get("/public/:id", UC.getPublicProfile);
userRouter.post("/forgot-password", UC.forgotPasswordOTP);
userRouter.post("/reset-password", UC.resetPasswordWithOTP);
userRouter.post("/wishlist/:auctionId", isAuthenticated, UC.toggleWishlist);
userRouter.get("/wishlist", isAuthenticated, UC.getWishlist);

// ── Auction Routes ────────────────────────────────────────────────────────────
export const auctionRouter = express.Router();
auctionRouter.get("/", AC.getAllAuctions);
auctionRouter.get("/meta/category-counts", AC.getCategoryCounts);
auctionRouter.get("/:id", AC.getAuctionById);
auctionRouter.post("/", isAuthenticated, isAuthorized("Auctioneer"), trackCommissionStatus, AC.createAuction);
auctionRouter.delete("/:id", isAuthenticated, AC.deleteAuction);
auctionRouter.put("/:id/republish", isAuthenticated, isAuthorized("Auctioneer"), AC.republishAuction);
auctionRouter.get("/auctioneer/my", isAuthenticated, isAuthorized("Auctioneer"), AC.getMyAuctions);
auctionRouter.post("/:id/question", isAuthenticated, AC.askQuestion);
auctionRouter.post("/:id/answer", isAuthenticated, isAuthorized("Auctioneer"), AC.answerQuestion);

// ── Bid Routes ────────────────────────────────────────────────────────────────
export const bidRouter = express.Router();
bidRouter.post("/:id", isAuthenticated, isAuthorized("Bidder"), placeBid);

// ── Order Routes ──────────────────────────────────────────────────────────────
export const orderRouter = express.Router();
orderRouter.get("/my", isAuthenticated, isAuthorized("Bidder"), MC.getMyOrders);
orderRouter.get("/sales", isAuthenticated, isAuthorized("Auctioneer"), MC.getMySales);
orderRouter.get("/:id", isAuthenticated, MC.getOrderById);
orderRouter.put("/:id/ship", isAuthenticated, isAuthorized("Auctioneer"), MC.shipOrder);
orderRouter.put("/:id/deliver", isAuthenticated, isAuthorized("Bidder"), MC.confirmDelivery);
orderRouter.post("/:id/retry-payout", isAuthenticated, isAuthorized("Auctioneer"), MC.retryPayout);
orderRouter.post("/:id/complaint", isAuthenticated, MC.raiseComplaint);
orderRouter.post("/:id/rate", isAuthenticated, isAuthorized("Bidder"), MC.submitRating);
orderRouter.post("/payment/create", isAuthenticated, MC.createRazorpayOrder);
orderRouter.post("/payment/verify", isAuthenticated, MC.verifyPayment);

// ── Site Rating Routes ────────────────────────────────────────────────────────
export const siteRatingRouter = express.Router();
siteRatingRouter.get("/me", isAuthenticated, MC.getMySiteRating);
siteRatingRouter.post("/", isAuthenticated, MC.submitSiteRating);

// ── Notification Routes ───────────────────────────────────────────────────────
export const notifRouter = express.Router();
notifRouter.get("/", isAuthenticated, MC.getNotifications);
notifRouter.put("/seen", isAuthenticated, MC.markAllSeen);
notifRouter.delete("/:id", isAuthenticated, MC.deleteNotification);

// ── Commission Routes ─────────────────────────────────────────────────────────
// Commission is now fully automatic (deducted from payout at delivery confirmation).
// The proof-upload route is kept only for backward compatibility and is unused by the UI.
export const commissionRouter = express.Router();
commissionRouter.post("/proof", isAuthenticated, isAuthorized("Auctioneer"), MC.submitCommissionProof);
commissionRouter.get("/my", isAuthenticated, isAuthorized("Auctioneer"), MC.getMyCommissions);

// ── Chatbot Routes ────────────────────────────────────────────────────────────
export const chatRouter = express.Router();
chatRouter.post("/", isAuthenticated, MC.chatbotMessage);
chatRouter.get("/history", isAuthenticated, MC.getChatHistory);
chatRouter.delete("/history", isAuthenticated, MC.clearChatHistory);

// ── Admin Routes ──────────────────────────────────────────────────────────────
export const adminRouter = express.Router();
const SA = isAuthorized("Super Admin");
adminRouter.use(isAuthenticated, SA);
adminRouter.get("/dashboard", MC.adminGetDashboard);
adminRouter.get("/users", MC.adminGetUsers);
adminRouter.patch("/users/:id/block", MC.adminToggleBlock);
adminRouter.delete("/users/:id", MC.adminDeleteUser);
adminRouter.get("/proofs", MC.adminGetProofs);
adminRouter.patch("/proofs/:id", MC.adminUpdateProof);
adminRouter.get("/complaints", MC.adminGetComplaints);
adminRouter.patch("/complaints/:id/resolve", MC.adminResolveComplaint);
adminRouter.get("/chat-complaints", MC.adminGetChatComplaints);
adminRouter.patch("/chat-complaints/:id/resolve", MC.adminResolveChatComplaint);
adminRouter.get("/commissions", MC.adminGetCommissions);
adminRouter.delete("/auctions/:id", MC.adminDeleteAuction);
