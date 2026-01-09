// controllers/chatController.js
import { Auction } from "../models/auctionSchema.js";
import { Bid } from "../models/bidSchema.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config({ path: "./config/config.env" });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const handleChat = catchAsyncErrors(async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ reply: "Message is required." });
  }

  const lowerMsg = message.toLowerCase();
  const now = new Date();
  let reply = "";

  // 🧭 Intent 1: Help
  if (lowerMsg.includes("help")) {
    reply = `
      <b>Here’s what I can do:</b><br/>
      • Show auctions ending soon<br/>
      • List live auctions<br/>
      • Suggest bidding amounts<br/>
      • Analyze if your bid is good<br/>
      • Notify when you’re outbid<br/><br/>
      Try asking: <i>“Is ₹7000 a good bid for the gold watch?”</i>
    `;
  }

  // 🕒 Intent 2: Auctions ending soon
  else if (lowerMsg.includes("ending soon")) {
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const endingAuctions = await Auction.find({
      endTime: { $gte: now, $lte: twoHoursLater },
      status: "active",
    }).limit(5);

    if (!endingAuctions.length) {
      reply = "No auctions are ending within the next few hours. Check back later for new listings!";
    } else {
      const auctionList = endingAuctions
        .map((a, i) => {
          const name = a.itemName || a.title || a.name || a.productName || "Unnamed Item";
          const remainingMins = Math.floor((a.endTime - now) / (1000 * 60));
          return `${i + 1}. ${name} — Starting Bid: ₹${a.startingBid} — Ends In: ${remainingMins} mins`;
        })
        .join("<br/>");

      reply = `🕒 <b>Here are auctions ending soon:</b><br/><br/>${auctionList}`;
    }
  }

  // 🔥 Intent 3: Live or ongoing auctions
  else if (
    lowerMsg.includes("live auctions") ||
    lowerMsg.includes("ongoing auctions") ||
    lowerMsg.includes("current auctions")
  ) {
    const liveAuctions = await Auction.find({
      startTime: { $lte: now },
      endTime: { $gte: now },
    }).limit(5);

    if (!liveAuctions.length) {
      reply = "🚫 There are no live auctions right now. Check back later!";
    } else {
      const auctionList = liveAuctions
        .map((a, i) => {
          const name = a.itemName || a.title || a.name || a.productName || "Unnamed Item";
          const remainingMins = Math.floor((a.endTime - now) / (1000 * 60));
          return `${i + 1}. ${name} — Starting Bid: ₹${a.startingBid} — Ends In: ${remainingMins} mins`;
        })
        .join("<br/>");

      reply = `
        🔥 <b>Live Auctions:</b><br/><br/>
        ${auctionList}<br/><br/>
        <button 
          style="background:#2563eb;color:white;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;"
          onclick="window.open('http://localhost:5173/auctions','_self')"
        >
          Click Here to View All Live Auctions
        </button>
      `;
    }
  }

  // 💸 Intent 4: Check if a bid is good
  else if (lowerMsg.includes("₹") || lowerMsg.includes("rs") || lowerMsg.includes("bid")) {
    const amountMatch = message.match(/\d+/);
    const amount = amountMatch ? parseInt(amountMatch[0]) : null;

    if (!amount) {
      reply = "Please specify the amount you’re considering (e.g., ₹7000).";
    } else {
      const latestAuction = await Auction.findOne({ status: "active" }).sort({ endTime: 1 });

      if (!latestAuction) {
        reply = "No active auctions found right now.";
      } else {
        const topBid = await Bid.findOne({ auction: latestAuction._id })
          .sort({ amount: -1 })
          .populate("user", "name email");

        if (!topBid) {
          reply = `No one has bid yet for <b>${latestAuction.title}</b>. ₹${amount} would be a great start!`;
        } else {
          const diff = amount - topBid.amount;
          if (diff > 0)
            reply = `✅ Yes, ₹${amount} is a strong bid for <b>${latestAuction.title}</b> — it’s ₹${diff} higher than the top bid (₹${topBid.amount}).`;
          else if (diff === 0)
            reply = `⚖️ ₹${amount} matches the current top bid (₹${topBid.amount}). You might want to go slightly higher.`;
          else
            reply = `⚠️ ₹${amount} is lower than the top bid (₹${topBid.amount}). Try bidding at least ₹${topBid.amount + 100}.`;
        }
      }
    }
  }

  // 💬 Fallback — use OpenAI
  else {
    try {
      const systemPrompt = `
        You are an AI Auction Assistant for a Smart Auctions platform.
        You help users with bidding info, payments, and auction insights.
        Be concise, friendly, and clear. If unsure, say you'll check later.
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.7,
      });

      reply = completion.choices[0].message.content;
    } catch (err) {
      console.error("OpenAI error:", err);
      reply = "Sorry — the AI assistant is currently unavailable.";
    }
  }

  res.status(200).json({ success: true, reply });
});
