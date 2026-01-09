// backend/router/chatRoutes.js
import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import { Auction } from "../models/auctionSchema.js";
import { Bid } from "../models/bidSchema.js";
import { User } from "../models/userSchema.js";

dotenv.config({ path: "./config/config.env" });

const router = express.Router();

console.log("✅ OpenAI key exists:", !!process.env.OPENAI_API_KEY);

router.post("/", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ reply: "Message is required." });
    }

    const lowerMsg = message.toLowerCase();
    const now = new Date();

    // 🆘 Contact / Complaint / Problem Detection
    if (
      lowerMsg.includes("contact") ||
      lowerMsg.includes("complaint") ||
      lowerMsg.includes("problem") ||
      lowerMsg.includes("issue") ||
      lowerMsg.includes("not working") ||
      lowerMsg.includes("support") ||
      lowerMsg.includes("help")
    ) {
      return res.json({
        reply: `💬 It seems you need assistance. Please click below to contact our support team.<br/><br/>
          <button style="background:#2563eb;color:white;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;"
            onclick="window.open('http://localhost:5173/contact','_self')">Contact</button>`,
      });
    }

    // 🏆 Leaderboard Query
    if (
      lowerMsg.includes("leaderboard") ||
      lowerMsg.includes("top") ||
      lowerMsg.includes("leading")
    ) {
      const topBidders = await Bid.aggregate([
        { $group: { _id: "$bidder", totalBid: { $sum: "$amount" } } },
        { $sort: { totalBid: -1 } },
        { $limit: 2 },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        {
          $project: {
            name: { $arrayElemAt: ["$userDetails.name", 0] },
            totalBid: 1,
          },
        },
      ]);

      if (!topBidders.length) {
        return res.json({
          reply: "⚠️ No leaderboard data yet. Place your first bid to get ranked!",
        });
      }

      const leaderboardList = topBidders
        .map(
          (u, i) => `${i + 1}. ${u.name || "Unknown"} — ₹${u.totalBid.toLocaleString()}`
        )
        .join("<br/>");

      return res.json({
        reply: `🏆 <b>Top Bidders</b><br/>${leaderboardList}<br/><br/>
          <button style="background:#10b981;color:white;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;"
            onclick="window.open('http://localhost:5173/leaderboard','_self')">View Full Leaderboard</button>`,
      });
    }

    // 👤 My Profile Query
    if (
      lowerMsg.includes("my profile") ||
      lowerMsg.includes("profile") ||
      lowerMsg.includes("account") ||
      lowerMsg.includes("me")
    ) {
      return res.json({
        reply: `👤 You can view your account details below.<br/><br/>
          <button style="background:#9333ea;color:white;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;"
            onclick="window.open('http://localhost:5173/me','_self')">My Profile</button>`,
      });
    }

    // 🕒 Auctions ending soon
    if (lowerMsg.includes("ending soon")) {
      const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const endingAuctions = await Auction.find({
        endTime: { $gte: now, $lte: twoHoursLater },
        status: "active",
      }).limit(5);

      if (!endingAuctions.length) {
        return res.json({
          reply:
            "No auctions are ending within the next few hours. Check back later for new listings!",
        });
      }

      const auctionList = endingAuctions
        .map((a, i) => {
          const name =
            a.itemName || a.title || a.name || a.productName || "Unnamed Item";
          const remainingMins = Math.floor((a.endTime - now) / (1000 * 60));
          return `${i + 1}. ${name} — Starting Bid: ₹${a.startingBid} — Ends In: ${remainingMins} mins`;
        })
        .join("<br/>");

      return res.json({
        reply: `🕒 <b>Auctions Ending Soon:</b><br/>${auctionList}`,
      });
    }

    // 🔥 Live or ongoing auctions
    if (
      lowerMsg.includes("live auctions") ||
      lowerMsg.includes("ongoing auctions") ||
      lowerMsg.includes("current auctions")
    ) {
      const liveAuctions = await Auction.find({
        startTime: { $lte: now },
        endTime: { $gte: now },
      }).limit(5);

      if (!liveAuctions.length) {
        return res.json({
          reply: "🚫 There are no live auctions right now. Check back later!",
        });
      }

      const auctionList = liveAuctions
        .map((a, i) => {
          const name =
            a.itemName || a.title || a.name || a.productName || "Unnamed Item";
          const remainingMins = Math.floor((a.endTime - now) / (1000 * 60));
          return `${i + 1}. ${name} — Starting Bid: ₹${a.startingBid} — Ends In: ${remainingMins} mins`;
        })
        .join("<br/>");

      return res.json({
        reply: `🔥 <b>Live Auctions:</b><br/>${auctionList}<br/><br/>
          <button style="background:#2563eb;color:white;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;"
            onclick="window.open('/auctions','_self')">View All Live Auctions</button>`,
      });
    }

    // 💸 Personalized bidding advice (existing logic kept same)
    if (
      lowerMsg.includes("bid") ||
      lowerMsg.includes("offer") ||
      lowerMsg.includes("price")
    ) {
      const bidMatch = message.match(/₹?\s?(\d{3,6})/);
      const userBid = bidMatch ? parseInt(bidMatch[1]) : null;

      const activeAuction = await Auction.findOne({
        startTime: { $lte: now },
        endTime: { $gte: now },
        status: "active",
      }).sort({ endTime: 1 });

      if (!activeAuction) {
        return res.json({
          reply:
            "There are no active auctions right now to analyze bids for. Check back later!",
        });
      }

      const currentPrice = activeAuction.currentBid || activeAuction.startingBid;
      const name =
        activeAuction.itemName ||
        activeAuction.title ||
        activeAuction.name ||
        "Unnamed Item";

      if (userBid) {
        if (userBid < currentPrice) {
          return res.json({
            reply: `⚠️ Your bid of ₹${userBid} is below the current bid of ₹${currentPrice} for "${name}". You might want to raise it to at least ₹${currentPrice + 500}.`,
          });
        } else if (userBid >= currentPrice && userBid < currentPrice + 1000) {
          return res.json({
            reply: `👍 ₹${userBid} is a competitive offer for "${name}". You’re in a good range!`,
          });
        } else {
          return res.json({
            reply: `🔥 ₹${userBid} is a strong bid for "${name}" — you’ll likely stay on top unless others counter soon.`,
          });
        }
      } else {
        const suggestedBid = currentPrice + 500;
        return res.json({
          reply: `💡 The current highest bid for "${name}" is ₹${currentPrice}. A smart next bid would be around ₹${suggestedBid}.`,
        });
      }
    }

    // 🕵️ Item Info & Recommendations (existing logic kept same)
    if (
      lowerMsg.includes("condition") ||
      lowerMsg.includes("seller") ||
      lowerMsg.includes("who") ||
      lowerMsg.includes("similar") ||
      lowerMsg.includes("like") ||
      lowerMsg.includes("recommend")
    ) {
      const words = message.split(" ");
      const possibleItemName = words.slice(-3).join(" ");

      const item =
        (await Auction.findOne({
          $or: [
            { itemName: { $regex: possibleItemName, $options: "i" } },
            { title: { $regex: possibleItemName, $options: "i" } },
            { name: { $regex: possibleItemName, $options: "i" } },
          ],
        })) || (await Auction.findOne().sort({ createdAt: -1 }));

      if (!item) {
        return res.json({
          reply: `I couldn’t find any auction matching "${possibleItemName}". Try using the exact product name.`,
        });
      }

      if (lowerMsg.includes("condition") || lowerMsg.includes("who")) {
        const seller =
          item.seller?.name ||
          item.sellerName ||
          item.userName ||
          "Unknown Seller";
        const condition = item.condition || "Not specified";
        const title =
          item.itemName || item.title || item.name || "Unnamed Item";

        return res.json({
          reply: `🕵️ "${title}" is listed by ${seller}. Condition: ${condition}.`,
        });
      }

      if (
        lowerMsg.includes("similar") ||
        lowerMsg.includes("like") ||
        lowerMsg.includes("recommend")
      ) {
        const similar = await Auction.find({
          category: item.category,
          _id: { $ne: item._id },
        }).limit(3);

        if (!similar.length) {
          return res.json({
            reply: `No similar items found for "${item.itemName || item.title}".`,
          });
        }

        const list = similar
          .map(
            (s, i) =>
              `${i + 1}. ${s.itemName || s.title} — Starting Bid: ₹${s.startingBid}`
          )
          .join("<br/>");

        return res.json({
          reply: `🛍️ Similar auctions to "${item.itemName || item.title}":<br/>${list}`,
        });
      }
    }

    // 💬 Default fallback (OpenAI)
    const systemPrompt = `
      You are an AI Auction Assistant for Smart Auctions.
      Help users with navigation, bidding, payments, and auction insights.
      If you don't find data, respond politely and guide them to check on the website.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.7,
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error("❌ Chat error:", err);
    res.status(500).json({
      reply: "Sorry, the AI assistant is currently unavailable.",
    });
  }
});

export default router;
