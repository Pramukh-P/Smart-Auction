// backend/server.js

import { config } from "dotenv";
config({ path: "./config/config.env" });

import http from "http";
import { WebSocketServer } from "ws";
import app from "./app.js";
import cloudinary from "cloudinary";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create HTTP server and attach Express app
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// ---- SIMPLE WEBSOCKET LAYER FOR BIDDING ----

// Map of auctionId -> Set of client sockets
const auctionRooms = new Map();

/**
 * Broadcast JSON message to all clients in a given auction room.
 */
export function broadcastToAuctionRoom(auctionId, payload) {
  const room = auctionRooms.get(String(auctionId));
  if (!room) return;
  const data = JSON.stringify(payload);
  for (const ws of room) {
    if (ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  }
}

/**
 * Create WebSocket server on top of same HTTP server.
 * Clients connect to: ws://localhost:5000
 * and must send: { "type": "join_auction", "auctionId": "<id>" }
 */
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  ws.currentAuctionId = null;

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === "join_auction" && data.auctionId) {
        const auctionId = String(data.auctionId);

        // Leave previous room
        if (ws.currentAuctionId && auctionRooms.has(ws.currentAuctionId)) {
          const oldRoom = auctionRooms.get(ws.currentAuctionId);
          oldRoom.delete(ws);
        }

        // Join new room
        if (!auctionRooms.has(auctionId)) {
          auctionRooms.set(auctionId, new Set());
        }
        auctionRooms.get(auctionId).add(ws);
        ws.currentAuctionId = auctionId;

        // Optional ACK
        ws.send(
          JSON.stringify({
            type: "joined_auction",
            auctionId,
          })
        );
      }
    } catch (err) {
      console.error("WS message parse error:", err.message);
    }
  });

  ws.on("close", () => {
    if (ws.currentAuctionId && auctionRooms.has(ws.currentAuctionId)) {
      const room = auctionRooms.get(ws.currentAuctionId);
      room.delete(ws);
      if (room.size === 0) {
        auctionRooms.delete(ws.currentAuctionId);
      }
    }
  });
});

// ---- START SERVER ----
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.warn(
      "⚠️ RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET not set. Payouts will not be executed in this environment."
    );
  }
});
