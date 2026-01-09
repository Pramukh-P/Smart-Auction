// frontend/src/lib/socket.js

let WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:5000";

/**
 * Create a WebSocket connection and join a specific auction room.
 */
export function connectAuctionSocket(auctionId) {
  const socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    try {
      socket.send(
        JSON.stringify({
          type: "join_auction",
          auctionId,
        })
      );
    } catch (err) {
      console.error("Failed to send join_auction:", err);
    }
  };

  return socket;
}
