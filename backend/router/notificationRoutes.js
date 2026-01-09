// backend/router/notificationRoutes.js
import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import {
  getNotifications,
  markAsSeen,
  cleanupNotifications,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", isAuthenticated, getNotifications);
router.put("/seen", isAuthenticated, markAsSeen);
router.delete("/cleanup", isAuthenticated, cleanupNotifications);

export default router;
