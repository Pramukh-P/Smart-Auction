// backend/router/authRoutes.js
import express from "express";
import {
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPasswordWithOtp,
} from "../controllers/userController.js";

const router = express.Router();

// Forgot-password with OTP
router.post("/forgot-password/request-otp", requestPasswordResetOtp);
router.post("/forgot-password/verify-otp", verifyPasswordResetOtp);
router.put("/forgot-password/reset", resetPasswordWithOtp);

export default router;
