import { useEffect, useRef, useCallback, useState } from "react";
import { useAppDispatch } from "../store/store";
import { wsUpdateBid, wsExtendTime, wsNewQuestion, wsAnswered } from "../store/slices";
import { addWsNotif } from "../store/slices";
import toast from "react-hot-toast";

// ── Countdown ─────────────────────────────────────────────────────────────────
interface TimeLeft { days: number; hours: number; minutes: number; seconds: number; isExpired: boolean; totalSeconds: number; }

export function useCountdown(endTime?: string | Date): TimeLeft {
  const calc = (): TimeLeft => {
    if (!endTime) return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, totalSeconds: 0 };
    const diff = new Date(endTime).getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, totalSeconds: 0 };
    const ts = Math.floor(diff / 1000);
    return { days: Math.floor(diff / 86400000), hours: Math.floor((diff / 3600000) % 24), minutes: Math.floor((diff / 60000) % 60), seconds: Math.floor(ts % 60), isExpired: false, totalSeconds: ts };
  };
  const [t, setT] = useState<TimeLeft>(calc);
  useEffect(() => { if (!endTime) return; const id = setInterval(() => setT(calc()), 1000); return () => clearInterval(id); }, [endTime]);
  return t;
}

export function fmtCountdown(t: TimeLeft): string {
  if (t.isExpired) return "Ended";
  if (t.days > 0) return `${t.days}d ${t.hours}h ${t.minutes}m`;
  if (t.hours > 0) return `${t.hours}h ${t.minutes}m ${t.seconds}s`;
  return `${t.minutes}m ${t.seconds}s`;
}

// ── WebSocket ────────────────────────────────────────────────────────────────
const WS_URL = (): string => {
  const env = (import.meta as any).env?.VITE_WS_URL;
  if (env) return env;
  return window.location.protocol === "https:" ? `wss://${window.location.host}` : `ws://localhost:5000`;
};

export function useAuctionSocket(auctionId?: string, userId?: string) {
  const dispatch = useAppDispatch();
  const ws = useRef<WebSocket | null>(null);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  const [watcherCount, setWatcherCount] = useState(0);

  const connect = useCallback(() => {
    if (!auctionId || !alive.current) return;
    try {
      const socket = new WebSocket(WS_URL());
      ws.current = socket;

      socket.onopen = () => {
        try {
          socket.send(JSON.stringify({
            type: "join_auction",
            auctionId,
            userId
          }));

          if (userId) {
            socket.send(JSON.stringify({
              type: "register_user",
              userId
            }));
          }
        } catch (err) {
          console.error(err);
        }
      };

      socket.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "bid_update") { dispatch(wsUpdateBid(msg)); if (msg.extended) toast("⏰ Auction extended by 3 minutes!", { icon: "⏰", style: { background: "#fef3c7", color: "#92400e" }, duration: 6000 }); }
          if (msg.type === "auction_extended") { dispatch(wsExtendTime({ auctionId, newEndTime: msg.newEndTime })); toast(msg.message, { icon: "⏰", duration: 6000, style: { background: "#fef3c7", color: "#92400e" } }); }
          if (msg.type === "outbid_notification") toast.error(`You've been outbid on "${msg.auctionTitle}"! New bid: ₹${msg.newBid?.toLocaleString()}`, { duration: 8000 });
          if (msg.type === "watcher_count") setWatcherCount(msg.count);
          if (msg.type === "new_question") dispatch(wsNewQuestion(msg));
          if (msg.type === "question_answered") dispatch(wsAnswered(msg));
          if (msg.type === "relist_notification") { dispatch(addWsNotif({ message: msg.message, seen: false, type: "relist", createdAt: new Date().toISOString() })); toast(msg.message, { icon: "🔔", duration: 8000 }); }
        } catch (_) { }
      };

      socket.onclose = () => {
        if (!alive.current) return;
        retry.current = setTimeout(() => { if (alive.current) connect(); }, 3000);
      };
      socket.onerror = () => socket.close();
    } catch (_) { }
  }, [auctionId, userId, dispatch]);

  useEffect(() => {
    alive.current = true;
    connect();
    return () => {
      alive.current = false;
      if (retry.current) clearTimeout(retry.current);
      if (ws.current) {
        try {
          if (ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
              type: "leave_auction",
              auctionId
            }));
          }
        } catch (err) {
          console.error("WS cleanup error:", err);
        }

        ws.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((msg: object) => { if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify(msg)); }, []);
  return { send, watcherCount };
}

// ── Global WS (for notifications only) ────────────────────────────────────────
export function useGlobalSocket(userId?: string) {
  const dispatch = useAppDispatch();
  const ws = useRef<WebSocket | null>(null);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    if (!userId) return;
    alive.current = true;
    const connect = () => {
      try {
        const socket = new WebSocket(WS_URL());
        ws.current = socket;
        socket.onopen = () => socket.send(JSON.stringify({ type: "register_user", userId }));
        socket.onmessage = e => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === "outbid_notification") {
              dispatch(addWsNotif({ message: `You've been outbid on "${msg.auctionTitle}"`, seen: false, type: "outbid", createdAt: new Date().toISOString() }));
              toast.error(`Outbid on "${msg.auctionTitle}"! New bid: ₹${msg.newBid?.toLocaleString()}`, { duration: 6000 });
            }
          } catch (_) { }
        };
        socket.onclose = () => { if (!alive.current) return; retry.current = setTimeout(() => alive.current && connect(), 5000); };
        socket.onerror = () => socket.close();
      } catch (_) { }
    };
    connect();
    return () => {
      alive.current = false;
      if (retry.current) clearTimeout(retry.current);
      ws.current?.close();
    };
  }, [userId, dispatch]);
}
