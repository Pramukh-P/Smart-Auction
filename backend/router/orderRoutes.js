// backend/router/orderRoutes.js
import express from "express";
import { isAuthenticated, isAuthorized } from "../middlewares/auth.js";
import {
  getMyOrders,
  getSalesOrders,
  getBidderActiveOrders,
  getAuctioneerActiveOrders,
  getOrderById,
  updateOrderShipment,
  updateOrderDelivery,
  getAdminOrders,
  raiseOrderComplaint,      // 👈 ADD
  replyOrderComplaint  
  // plus any other handlers you have defined in orderController
} from "../controllers/orderController.js";

const router = express.Router();

// Bidder: my orders
router.get(
  "/my",
  isAuthenticated,
  isAuthorized("Bidder"),
  getMyOrders
);

// Auctioneer: sales orders
router.get(
  "/sales",
  isAuthenticated,
  isAuthorized("Auctioneer"),
  getSalesOrders
);

// Dashboard widgets - bidder
router.get(
  "/active/bidder",
  isAuthenticated,
  isAuthorized("Bidder"),
  getBidderActiveOrders
);

// Dashboard widgets - auctioneer
router.get(
  "/active/auctioneer",
  isAuthenticated,
  isAuthorized("Auctioneer"),
  getAuctioneerActiveOrders
);

// Get single order (for any authenticated role)
router.get(
  "/:id",
  isAuthenticated,
  isAuthorized("Bidder", "Auctioneer", "Super Admin"),
  getOrderById
);

// Auctioneer or Super Admin: update shipment
router.put(
  "/shipment/:id",
  isAuthenticated,
  isAuthorized("Auctioneer", "Super Admin"),
  updateOrderShipment
);

// Super Admin: confirm delivery + payout
router.put(
  "/delivery/:id",
  isAuthenticated,
  isAuthorized("Super Admin"),
  updateOrderDelivery
);

// Super Admin: list all paid orders
router.get(
  "/admin/all",
  isAuthenticated,
  isAuthorized("Super Admin"),
  getAdminOrders
);

router.post(
  "/complaint",
  isAuthenticated,
  isAuthorized("Bidder"),
  raiseOrderComplaint
);

// Auctioneer: reply to complaint
router.post(
  "/complaint/reply",
  isAuthenticated,
  isAuthorized("Auctioneer"),
  replyOrderComplaint
);

export default router;
