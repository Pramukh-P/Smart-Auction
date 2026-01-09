// backend/router/userRoutes.js
import express from 'express';
import {
  register,
  verifyOTP,
  login,
  getProfile,
  logout,
  updateProfile,
  fetchLeaderboard,
  getPublicProfile,
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPasswordWithOtp,
  resendVerificationOtp
} from '../controllers/userController.js';
import { isAuthenticated } from '../middlewares/auth.js';
import { Auction } from '../models/auctionSchema.js';

const router = express.Router();

// Registration flow
router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendVerificationOtp); // ✅ ADD THIS ROUTE

// Login
router.post('/login', login);

// Password Reset Routes (OTP-based)
router.post('/forgot-password/request-otp', requestPasswordResetOtp);
router.post('/forgot-password/verify-otp', verifyPasswordResetOtp);
router.put('/forgot-password/reset', resetPasswordWithOtp);

// Authenticated user routes
router.get('/me', isAuthenticated, getProfile);
router.put('/me', isAuthenticated, updateProfile);
router.get('/logout', isAuthenticated, logout);
router.get('/leaderboard', fetchLeaderboard);

// Public lightweight profile by ID (for avatar clicks)
router.get('/public/:id', getPublicProfile);

// Legacy Bidder order overview (kept for backward compatibility)
router.get('/my-orders', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await Auction.find({
      highestBidder: userId,
      status: { $in: ['ended', 'completed'] },
      paymentStatus: { $in: ['holding', 'paid'] }
    })
    .sort({ createdAt: -1 })
    .lean();
    
    res.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Bidder my-orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Could not fetch orders.'
    });
  }
});

// Very minimal complaint marker on Auction (backward compatibility)
router.post('/raise-complaint', isAuthenticated, async (req, res) => {
  try {
    const { auctionId } = req.body;
    if (!auctionId) {
      return res.status(400).json({ message: 'Auction ID is required.' });
    }

    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(404).json({ message: 'Auction not found.' });
    }

    if (String(auction.highestBidder) !== String(req.user.id)) {
      return res.status(404).json({ message: 'No matching order found for this user.' });
    }

    auction.complaintStatus = 'raised';
    await auction.save();

    res.json({
      success: true,
      message: 'Complaint submitted. Admin will review the issue.'
    });
  } catch (error) {
    console.error('raise-complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Could not submit complaint.'
    });
  }
});

export default router;
