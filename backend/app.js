// backend/app.js


import { config } from "dotenv";
config({ path: "./config/config.env" });

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload"; // ✅ File upload
import connectDB from "./database/connection.js";
import { errorMiddleware } from "./middlewares/error.js";

// Cron jobs
import { endedAuctionCron } from "./automation/endedAuctionCron.js";
import { verifyCommissionCron } from "./automation/verifyCommissionCorn.js";
import { sendWelcomeEmailCron } from "./automation/userRegisteredCron.js";

import chatRoutes from "./router/chatRoutes.js";
import orderRoutes from "./router/orderRoutes.js";

const app = express();

// Frontend origin
const frontendOrigin = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(
  cors({
    origin: [frontendOrigin],
    methods: ["POST", "GET", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "10mb" })); // ✅ Bigger limit for images
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ✅ FIXED: File upload middleware (handles profileImage)
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/", // ✅ Linux/Mac temp dir
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  })
);

// ✅ Routes
import userRouter from "./router/userRoutes.js";
import auctionItemRouter from "./router/auctionItemRoutes.js";
import bidRouter from "./router/bidRoutes.js";
import commissionRouter from "./router/commissionRouter.js";
import superAdminRouter from "./router/superAdminRoutes.js";
import notificationRoutes from "./router/notificationRoutes.js";
import categoryRoutes from "./router/categoryRoutes.js";
import paymentRoutes from "./router/paymentRoutes.js";
import auctioneerRoutes from "./router/auctioneerRoutes.js";
import authRoutes from "./router/authRoutes.js";

app.use("/api/v1/user", userRouter);
app.use("/api/v1/auctionitem", auctionItemRouter);
app.use("/api/v1/bid", bidRouter);
app.use("/api/v1/commission", commissionRouter);
app.use("/api/v1/superadmin", superAdminRouter);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/auctioneer", auctioneerRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/order", orderRoutes);

// Start cron jobs + DB
endedAuctionCron();
verifyCommissionCron();
sendWelcomeEmailCron();
connectDB();

app.use(errorMiddleware);

export default app;
