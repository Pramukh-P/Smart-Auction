import { WebSocketServer, WebSocket } from "ws";
import http from "http";

interface SmartWS extends WebSocket {
  auctionId?: string;
  userId?: string;
  isAlive: boolean;
}

// auctionId -> Set<SmartWS>
const auctionRooms = new Map<string, Set<SmartWS>>();
// userId -> SmartWS (for personal notifications)
const userConnections = new Map<string, SmartWS>();

export const broadcastToAuction = (auctionId: string, payload: object): void => {
  const room = auctionRooms.get(String(auctionId));
  if (!room) return;
  const msg = JSON.stringify(payload);
  room.forEach(ws => { if (ws.readyState === WebSocket.OPEN) ws.send(msg); });
};

export const notifyUser = (userId: string, payload: object): void => {
  const ws = userConnections.get(String(userId));
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
};

export const initWebSocketServer = (server: http.Server): WebSocketServer => {
  const wss = new WebSocketServer({ server, path: "/" });

  // Heartbeat
  const hbInterval = setInterval(() => {
    wss.clients.forEach(rawWs => {
      const ws = rawWs as SmartWS;
      if (!ws.isAlive) { cleanup(ws); return ws.terminate(); }
      ws.isAlive = false;
      ws.ping();
    });
  }, 25_000);

  wss.on("close", () => clearInterval(hbInterval));

  wss.on("connection", (rawWs: WebSocket) => {
    const ws = rawWs as SmartWS;
    ws.isAlive = true;

    ws.on("pong", () => { ws.isAlive = true; });

    ws.on("message", raw => {
      try {
        const msg = JSON.parse(raw.toString());
        const { type, auctionId, userId } = msg;

        // Register user for personal notifications
        if (type === "register_user" && userId) {
          ws.userId = userId;
          userConnections.set(String(userId), ws);
          ws.send(JSON.stringify({ type: "registered", userId }));
        }

        if (type === "join_auction" && auctionId) {
          leaveAuction(ws);
          const id = String(auctionId);
          if (!auctionRooms.has(id)) auctionRooms.set(id, new Set());
          auctionRooms.get(id)!.add(ws);
          ws.auctionId = id;
          if (userId) { ws.userId = userId; userConnections.set(String(userId), ws); }
          ws.send(JSON.stringify({ type: "joined_auction", auctionId: id, watcherCount: auctionRooms.get(id)!.size }));
          broadcastToAuction(id, { type: "watcher_count", auctionId: id, count: auctionRooms.get(id)!.size });
        }

        if (type === "leave_auction") leaveAuction(ws);
        if (type === "ping") ws.send(JSON.stringify({ type: "pong" }));
      } catch (_) {}
    });

    ws.on("close", () => cleanup(ws));
    ws.on("error", () => cleanup(ws));
  });

  console.log("✅ WebSocket server ready");
  return wss;
};

function leaveAuction(ws: SmartWS) {
  if (!ws.auctionId) return;
  const room = auctionRooms.get(ws.auctionId);
  if (room) {
    room.delete(ws);
    if (room.size === 0) auctionRooms.delete(ws.auctionId);
    else broadcastToAuction(ws.auctionId, { type: "watcher_count", auctionId: ws.auctionId, count: room.size });
  }
  ws.auctionId = undefined;
}

function cleanup(ws: SmartWS) {
  leaveAuction(ws);
  if (ws.userId) userConnections.delete(ws.userId);
}
