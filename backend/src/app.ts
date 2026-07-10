import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import { userRouter, auctionRouter, bidRouter, orderRouter, notifRouter, commissionRouter, chatRouter, adminRouter, siteRatingRouter } from "./router/index";
import { errorMiddleware } from "./middlewares/error";

const app = express();

// FRONTEND_URL may be a single URL or a comma-separated list (e.g. when you have
// a staging + production frontend). Trailing slashes are stripped defensively.
const ALLOWED = [
  ...(process.env.FRONTEND_URL || "").split(",").map(u => u.trim().replace(/\/$/, "")).filter(Boolean),
  "http://localhost:5173",
  "https://localhost:5173"
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const clean = origin.replace(/\/$/, "");
    if (ALLOWED.includes(clean) || clean.endsWith(".netlify.app") || clean.endsWith(".vercel.app")) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"]
}));
app.options("*", cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(fileUpload({ useTempFiles: true, tempFileDir: "/tmp/", limits: { fileSize: 10 * 1024 * 1024 } }));

app.get("/health", (_req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

app.use("/api/v1/users", userRouter);
app.use("/api/v1/auctions", auctionRouter);
app.use("/api/v1/bids", bidRouter);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/notifications", notifRouter);
app.use("/api/v1/commission", commissionRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/site-rating", siteRatingRouter);

app.use(errorMiddleware);
export default app;
