// backend/router/bidRoutes.js

import express from "express";
import {
  placeBid,
} from "../controllers/bidController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

// Place or update bid on auction item
router.post("/place/:id", isAuthenticated, placeBid);

export default router;
