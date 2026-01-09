// backend/router/complaintRoutes.js
import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import {
  submitComplaint,
  getMyComplaints,
  getAllComplaintsAdmin,
  resolveComplaint,
} from "../controllers/complaintController.js";

const router = express.Router();

// Bidder or Auctioneer files a complaint
router.post("/submit", isAuthenticated, submitComplaint);

// User views complaints they've filed
router.get("/mine", isAuthenticated, getMyComplaints);

// Admin views all complaints
router.get("/admin/all", isAuthenticated, isAuthorized("Super Admin"), getAllComplaintsAdmin);

// Admin resolves complaint (refund, block user, update order status)
router.put("/resolve/:id", isAuthenticated, isAuthorized("Super Admin"), resolveComplaint);

export default router;
