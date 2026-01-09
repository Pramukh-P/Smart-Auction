// backend/router/auctionItemRoutes.js
import express from "express";
import {
  addNewAuctionItem,
  getAllItems,
  getAuctionDetails,
  getMyAuctionItems,
  removeFromAuction,
  republishItem,
} from "../controllers/auctionItemController.js";
import { isAuthenticated, isAuthorized } from "../middlewares/auth.js";
import { trackCommissionStatus } from "../middlewares/trackCommissionStatus.js";

const router = express.Router();

// Create auction (auctioneer only)
router.post(
  "/create",
  isAuthenticated,
  isAuthorized("Auctioneer"),
  trackCommissionStatus,
  addNewAuctionItem
);

// Public: list all active items for Home / Auctions page
router.get("/allitems", getAllItems);

// Public: single auction detail (remove isAuthenticated here)
router.get("/auction/:id", getAuctionDetails);

// Auctioneer: my auctions
router.get(
  "/myitems",
  isAuthenticated,
  isAuthorized("Auctioneer"),
  getMyAuctionItems
);

// Auctioneer: delete auction
router.delete(
  "/delete/:id",
  isAuthenticated,
  isAuthorized("Auctioneer"),
  removeFromAuction
);

// Auctioneer: republish auction
router.put(
  "/item/republish/:id",
  isAuthenticated,
  isAuthorized("Auctioneer"),
  republishItem
);

export default router;
