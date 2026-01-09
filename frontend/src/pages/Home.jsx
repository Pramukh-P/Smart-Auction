// frontend/src/pages/Home.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import Spinner from "@/custom-components/Spinner";
import axios from "axios";
import { getLeaderboard } from "@/store/slices/userSlice";
import { getAllAuctionItems } from "@/store/slices/auctionSlice";

const ORDER_API = "http://localhost:5000/api/v1/order";
axios.defaults.withCredentials = true;

// Guest chatbot (unchanged logic)
const GuestChatBot = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hi! I'm your SmartAuction guide. Ask me what this website is about, how it works, or how to login / signup.",
      type: "info",
    },
  ]);

  const handleSend = (e) => {
    e.preventDefault();
    const question = input.trim();
    if (!question) return;

    const lower = question.toLowerCase();
    const newMessages = [
      ...messages,
      { from: "user", text: question, type: "user" },
    ];

    let reply = "";
    let type = "info";

    if (lower.includes("what") && lower.includes("website")) {
      reply =
        "SmartAuction is an online auction platform where Auctioneers post items and Bidders place real-time bids. The highest bidder wins the item and completes payment securely.";
    } else if (lower.includes("how") && lower.includes("work")) {
      reply =
        "SmartAuction works in 4 steps: 1) Create an account, 2) Auctioneers post items, 3) Bidders place bids until the auction ends, 4) Winner pays and order + delivery are tracked on the platform.";
    } else if (
      lower.includes("login") ||
      lower.includes("sign up") ||
      lower.includes("signup") ||
      lower.includes("register")
    ) {
      reply =
        "To login or signup: click the Login or Sign Up button in the top-right of the page. Then enter your email, password, and follow the steps.";
      type = "loginPrompt";
    } else {
      reply =
        "I can only answer about this website, how it works, and how to login/signup. Please login to use the full chatbot.";
    }

    setMessages([...newMessages, { from: "bot", text: reply, type }]);
    setInput("");
  };

  return (
    <>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-5 right-5 z-40 rounded-full shadow-glow bg-blue-600 text-white w-12 h-12 flex items-center justify-center text-2xl"
      >
        ?
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-40 w-80 max-w-[90vw] glass bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 flex flex-col">
          <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">
              SmartAuction Guide
            </h3>
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-gray-500 hover:text-gray-700 secondary"
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 text-xs space-y-2">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${
                  m.from === "bot" ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`px-3 py-2 rounded-2xl max-w-[80%] ${
                    m.from === "bot"
                      ? "bg-gray-100 text-gray-800"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <form
            onSubmit={handleSend}
            className="border-t border-gray-200 px-2 py-2 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 text-xs border border-gray-300 rounded-full px-3 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Ask about SmartAuction..."
            />
            <button
              type="submit"
              className="btn-primary text-xs px-3 py-1"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
};

const getCountdown = (endTime) => {
  if (!endTime) return "";
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const mins = Math.floor(diff / (1000 * 60));
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs > 0) return `${hrs}h ${remMins}m left`;
  return `${mins}m left`;
};

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

const HEADLINES = [
  "Turn rare finds and collectibles into verified bidding wars.",
  "Host serious auctions with transparent payouts and delivery.",
  "Win unique pieces with live, competitive bidding.",
  "Scale your selling with structured, time‑boxed auctions.",
  "Bid with confidence on verified, tracked listings.",
];

const QUOTES = [
  "Verified auctions that treat every bid like it matters.",
  "Built for serious sellers and smart bidders—no noisy clutter.",
  "From listing to delivery, every step is transparent and trackable.",
  "Turn niche collections into competitive bidding stories.",
  "One dashboard for auctions, orders, payouts, and trust.",
];

const Home = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { isAuthenticated, loading, user, leaderboard } = useSelector(
    (state) => state.user
  );
  const {
    allAuctions = [],
    loading: auctionsLoading,
  } = useSelector((state) => state.auction);

  const [activeOrders, setActiveOrders] = useState([]);
  const [ratingReminders, setRatingReminders] = useState([]);
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    dispatch(getAllAuctionItems());
    dispatch(getLeaderboard());
  }, [dispatch]);

  useEffect(() => {
    const id = setInterval(() => {
      setHeadlineIndex((prev) => (prev + 1) % HEADLINES.length);
      setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  if (loading && user == null && !isAuthenticated) {
    return (
      <section className="page-container flex items-center justify-center min-h-screen">
        <Spinner />
      </section>
    );
  }

  const stats = useMemo(() => {
    const total = allAuctions.length;
    const now = new Date();
    const live = allAuctions.filter((a) => {
      if (!a.startTime || !a.endTime) return false;
      const s = new Date(a.startTime);
      const e = new Date(a.endTime);
      return s <= now && e > now && a.status === "active";
    }).length;
    const todayString = now.toDateString();
    const todayCount = allAuctions.filter((a) => {
      if (!a.startTime) return false;
      return new Date(a.startTime).toDateString() === todayString;
    }).length;
    return { total, live, today: todayCount };
  }, [allAuctions]);

  const auctionsToday = useMemo(() => {
    const todayString = new Date().toDateString();
    return allAuctions
      .filter((item) => {
        if (!item.startTime) return false;
        return new Date(item.startTime).toDateString() === todayString;
      })
      .slice(0, 10);
  }, [allAuctions]);

  const featuredAuctions = useMemo(
    () => allAuctions.slice(0, 10),
    [allAuctions]
  );

  // keep top5 shape compatible with old code
  const top5 = useMemo(
    () => leaderboard.slice(0, 5),
    [leaderboard]
  );

  const isRecentlyDelivered = (order) => {
    if (order.deliveryStatus !== "completed" || !order.paidAt) return false;
    const paidAtTime = new Date(order.paidAt).getTime();
    return Date.now() - paidAtTime <= FOUR_HOURS_MS;
  };

  useEffect(() => {
    const fetchActiveOrders = async () => {
      if (!isAuthenticated || !user) {
        setActiveOrders([]);
        setRatingReminders([]);
        return;
      }
      try {
        if (user.role === "Bidder") {
          const { data } = await axios.get(`${ORDER_API}/active/bidder`, {
            withCredentials: true,
          });
          const list = data.orders || [];
          setActiveOrders(list);
          const completedForRating = list.filter(
            (o) =>
              o.deliveryStatus === "completed" &&
              !o.rating &&
              o.paidAt &&
              Date.now() - new Date(o.paidAt).getTime() <
                2 * 24 * 60 * 60 * 1000
          );
          setRatingReminders(completedForRating);
        } else if (user.role === "Auctioneer") {
          const { data } = await axios.get(
            `${ORDER_API}/active/auctioneer`,
            { withCredentials: true }
          );
          setActiveOrders(data.orders || []);
          setRatingReminders([]);
        } else {
          setActiveOrders([]);
          setRatingReminders([]);
        }
      } catch {
        setActiveOrders([]);
        setRatingReminders([]);
      }
    };
    fetchActiveOrders();
  }, [isAuthenticated, user]);

  const {
    auctioneerActiveAuctions,
    auctioneerPendingOrders,
    bidderActiveAuctions,
    bidderPendingOrders,
    nextActions,
    soonEndingAuctions,
    recommendedAuctions,
  } = useMemo(() => {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    const isAuctionLive = (a) => {
      if (!a.startTime || !a.endTime) return false;
      const s = new Date(a.startTime);
      const e = new Date(a.endTime);
      return s <= now && e > now && a.status === "active";
    };

    let auctioneerActive = [];
    let auctioneerPending = [];
    let bidderActive = [];
    let bidderPending = [];
    let soonEnding = [];
    let recommended = [];
    const actions = [];

    if (user && user.role === "Auctioneer") {
      const uid = String(user.id || user._id);

      auctioneerActive = allAuctions.filter((a) => {
        const createdId =
          a.createdBy?.id || a.createdBy?._id || a.createdBy;
        return String(createdId) === uid && isAuctionLive(a);
      });

      auctioneerPending = activeOrders.filter(
        (o) => o.pendingReason !== null
      );

      /* ---------- COMPLAINT ACTIONS (AUCTIONEER) ---------- */
      const auctioneerHasOpenComplaint = auctioneerPending.some(
        (o) => o.pendingReason === "complaint_open"
      );

      const auctioneerHasResolvedComplaint = auctioneerPending.some(
        (o) => o.pendingReason === "complaint_resolved_recent"
      );

      if (auctioneerHasOpenComplaint) {
        actions.push(
          "A bidder has raised a complaint on an order. Review and respond immediately."
        );
      }

      if (auctioneerHasResolvedComplaint) {
        actions.push(
          "You recently resolved a complaint. Monitor the order for final confirmation."
        );
      }


      soonEnding = allAuctions.filter((a) => {
        if (!a.startTime || !a.endTime) return false;
        const createdId =
          a.createdBy?.id || a.createdBy?._id || a.createdBy;
        if (String(createdId) !== uid) return false;
        const e = new Date(a.endTime);
        return e > now && e <= oneHourLater && a.status === "active";
      });

      if (auctioneerActive.length === 0) {
        actions.push(
          "You have no live auctions. Create a new auction to start selling."
        );
      } else {
        actions.push(
          `You have ${auctioneerActive.length} live auction${
            auctioneerActive.length > 1 ? "s" : ""
          }. Keep an eye on bids and be ready to ship once orders are paid.`
        );
      }

      const awaitingPayment = auctioneerPending.some(
        (o) => o.paymentStatus === "pending"
      );
      const awaitingShipment = auctioneerPending.some(
        (o) => o.paymentStatus === "paid" && o.deliveryStatus === "pending"
      );
      const inTransit = auctioneerPending.some(
        (o) => o.deliveryStatus === "shipped"
      );
      const recentlyDeliveredSome = auctioneerPending.some((o) =>
        isRecentlyDelivered(o)
      );

      if (awaitingPayment) {
        actions.push(
          "Some of your orders are awaiting bidder payment. Monitor them from the orders page."
        );
      }
      if (awaitingShipment) {
        actions.push(
          "You have paid orders without shipment details. Ship them and update tracking."
        );
      }
      if (inTransit) {
        actions.push(
          "Some shipments are in transit. Confirm delivery once items reach the bidder."
        );
      }
      if (recentlyDeliveredSome) {
        actions.push(
          "Recent deliveries completed in the last few hours. Keep an eye on any complaints."
        );
      }
    }

    if (user && user.role === "Bidder") {
      const uid = String(user.id || user._id);

      bidderActive = allAuctions.filter((a) => {
        if (!a.bids || !a.bids.length) return false;
        const s = new Date(a.startTime || 0);
        const e = new Date(a.endTime || 0);
        const live = s <= now && e > now && a.status === "active";
        if (!live) return false;
        return a.bids.some((b) => String(b.userId) === uid);
      });

      bidderPending = activeOrders.filter(
        (o) => o.pendingReason !== null
      );

      /* ---------- COMPLAINT ACTIONS (BIDDER) ---------- */
    const bidderHasOpenComplaint = bidderPending.some(
      (o) => o.pendingReason === "complaint_open"
    );

    const bidderHasResolvedComplaint = bidderPending.some(
      (o) => o.pendingReason === "complaint_resolved_recent"
    );

    if (bidderHasOpenComplaint) {
      actions.push(
        "You have raised a complaint. Awaiting auctioneer response."
      );
    }

    if (bidderHasResolvedComplaint) {
      actions.push(
        "Your complaint was resolved. Verify the solution before the order closes."
      );
    }


      const myCategories = new Set();
      allAuctions.forEach((a) => {
        if (!a.category) return;
        if (!a.bids || !a.bids.length) return;
        const hasMyBid = a.bids.some((b) => String(b.userId) === uid);
        if (hasMyBid) myCategories.add(a.category);
      });
      if (myCategories.size > 0) {
        recommended = allAuctions.filter((a) => {
          if (a.status !== "active") return false;
          if (!a.category) return false;
          return myCategories.has(a.category);
        });
        recommended = recommended.slice(0, 5);
      } else {
        recommended = allAuctions
          .filter((a) => a.status === "active")
          .slice(0, 5);
      }

      if (bidderActive.length === 0) {
        actions.push(
          "You have no active bids. Browse auctions and place a bid to get started."
        );
      } else {
        actions.push(
          `You are bidding on ${bidderActive.length} live auction${
            bidderActive.length > 1 ? "s" : ""
          }. Track them here or from your dashboard.`
        );
      }

      const mustPay = bidderPending.some(
        (o) => o.paymentStatus !== "paid"
      );
      const waitingDelivery = bidderPending.some(
        (o) =>
          o.paymentStatus === "paid" &&
          o.deliveryStatus !== "completed"
      );
      const recentlyDeliveredSome = bidderPending.some((o) =>
        isRecentlyDelivered(o)
      );

      if (mustPay) {
        actions.push(
          "You have unpaid winning orders. Tap them to complete payment."
        );
      }
      if (waitingDelivery) {
        actions.push(
          "Some of your paid orders are still in shipment or confirmation. Track delivery from the order details."
        );
      }
      if (recentlyDeliveredSome) {
        actions.push(
          "Recent deliveries completed. Verify items and rate the auctioneer if everything is fine."
        );
      }

      soonEnding = allAuctions.filter((a) => {
        if (!a.startTime || !a.endTime) return false;
        const e = new Date(a.endTime);
        const s = new Date(a.startTime);
        return (
          s <= now &&
          e > now &&
          e <= oneHourLater &&
          a.status === "active"
        );
      });
    } else if (!user) {
      soonEnding = allAuctions.filter((a) => {
        if (!a.startTime || !a.endTime) return false;
        const e = new Date(a.endTime);
        const s = new Date(a.startTime);
        return (
          s <= now &&
          e > now &&
          e <= oneHourLater &&
          a.status === "active"
        );
      });
    }

    if (!user) {
      recommended = allAuctions
        .filter((a) => a.status === "active")
        .slice(0, 5);
    }

    return {
      auctioneerActiveAuctions: auctioneerActive,
      auctioneerPendingOrders: auctioneerPending,
      bidderActiveAuctions: bidderActive,
      bidderPendingOrders: bidderPending,
      nextActions: actions,
      soonEndingAuctions: soonEnding,
      recommendedAuctions: recommended,
    };
  }, [user, allAuctions, activeOrders]);

  const handleAuctionClick = (id) => navigate(`/auction/item/${id}`);
  const handleViewAllAuctions = () => navigate("/auctions");
  const handleGotoLeaderboard = () => navigate("/leaderboard");

  const howItWorks = [
    {
      title: "1. Create an account",
      description:
        "Sign up as a Bidder or Auctioneer in a few clicks and complete your basic profile.",
    },
    {
      title: "2. List or browse items",
      description:
        "Auctioneers create auctions with detailed descriptions. Bidders explore live and upcoming auctions.",
    },
    {
      title: "3. Live bidding",
      description:
        "Place real-time bids with instant updates so everyone sees the latest highest bid.",
    },
    {
      title: "4. Win & complete order",
      description:
        "Winners pay securely, track shipment and delivery, and rate the auctioneer after completion.",
    },
  ];

  const heroAnimationStyles = `
@keyframes heroSlideFade {
  0% {
    opacity: 0;
    transform: translateY(14px);
  }
  60% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
.hero-animate {
  animation: heroSlideFade 0.8s ease-out;
}
`;

  return (
    <section className="page-container pt-12 pb-10 min-h-screen flex flex-col">
      {/* HERO */}
      <div className="w-full max-w-6xl mx-auto mb-5">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 border border-blue-100 shadow-md">
          <style>{heroAnimationStyles}</style>
          <div className="pointer-events-none absolute -left-10 top-[-30px] h-16 w-16 rounded-full bg-blue-300/40 blur-3xl" />
          <div className="pointer-events-none absolute right-[-40px] bottom-[-40px] h-24 w-24 rounded-full bg-sky-200/50 blur-3xl" />
          <div className="relative px-6 py-4 md:px-10 md:py-5 flex flex-col md:flex-row items-center gap-4">
            <div className="flex-[1.4] text-center md:text-left space-y-2.5">
              <div className="relative h-[8.2rem] md:h-[13.8rem] overflow-hidden">
                <h1
                  key={headlineIndex}
                  className="absolute inset-0 text-xl md:text-2xl font-extrabold leading-snug text-slate-900 hero-animate"
                >
                  {HEADLINES[headlineIndex]}
                </h1>
              </div>

              <div className="h-10 md:h-11 flex items-center">
                <p
                  key={quoteIndex}
                  className="text-xs md:text-sm text-slate-700 max-w-xl mx-auto md:mx-0 transition-opacity duration-500"
                >
                  {QUOTES[quoteIndex]}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 mt-1 justify-center md:justify-start">
                {!isAuthenticated ? (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate("/login")}
                      className="btn-primary text-xs md:text-sm font-semibold"
                    >
                      Login to start bidding
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/sign-up")}
                      className="btn-primary text-xs md:text-sm font-semibold"
                    >
                      Create free account
                    </button>
                  </>
                ) : user?.role === "Auctioneer" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate("/create-auction")}
                      className="btn-primary text-xs md:text-sm font-semibold"
                    >
                      Create new auction
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/view-my-auctions")}
                      className="btn-primary text-xs md:text-sm font-semibold"
                    >
                      Manage my auctions
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleViewAllAuctions}
                      className="btn-primary text-xs md:text-sm font-semibold"
                    >
                      Browse live auctions
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/my-orders")}
                      className="btn-primary text-xs md:text-sm font-semibold"
                    >
                      View my orders
                    </button>
                  </>
                )}
              </div>

              {isAuthenticated && user && (
                <p className="text-[11px] text-slate-600 mt-0.5 flex items-center gap-2 justify-center md:justify-start">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-[11px] font-bold">
                    {user.userName?.[0]?.toUpperCase() || "U"}
                  </span>
                  <span>
                    Logged in as{" "}
                    <span className="font-semibold text-slate-900">
                      {user.userName}
                    </span>{" "}
                    ({user.role})
                  </span>
                </p>
              )}
            </div>

            <div className="flex-1 w-full md:max-w-xs">
              <div className="bg-white/90 backdrop-blur-lg rounded-2xl border border-blue-100 px-4 py-3 flex flex-col gap-2.5 shadow-sm">
                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span className="uppercase tracking-wide font-semibold text-slate-700">
                    Today
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center text-[11px]">
                  <div className="flex flex-col items-center">
                    <span className="uppercase tracking-wide text-slate-500">
                      Auctions
                    </span>
                    <span className="text-lg font-extrabold text-blue-700">
                      {auctionsLoading ? "…" : stats.total}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="uppercase tracking-wide text-slate-500">
                      Live
                    </span>
                    <span className="text-lg font-extrabold text-emerald-600">
                      {auctionsLoading ? "…" : stats.live}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="uppercase tracking-wide text-slate-500">
                      Today
                    </span>
                    <span className="text-lg font-extrabold text-indigo-600">
                      {auctionsLoading ? "…" : stats.today}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NEXT BEST ACTIONS */}
      <div className="w-full max-w-6xl mx-auto mb-8">
        <div className="glass rounded-2xl p-4 bg-white/90 backdrop-blur-lg shadow-md border border-gray-200 flex flex-col">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Next best actions
          </h3>
          {isAuthenticated && nextActions.length > 0 ? (
            <ul className="text-xs text-gray-700 list-disc list-inside space-y-1">
              {nextActions.map((txt, idx) => (
                <li key={idx}>{txt}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-500">
              You&apos;re all caught up. Explore live auctions or create a new
              one to get started.
            </p>
          )}
        </div>
      </div>

      {/* YOUR ACTIVE AUCTIONS */}
      <div className="w-full max-w-6xl mx-auto mb-6">
        {isAuthenticated && user?.role === "Auctioneer" && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm md:text-base font-semibold text-gray-900">
                Your active auctions
              </h3>
              <span className="text-[11px] text-gray-500">
                Live auctions you are currently hosting
              </span>
            </div>
            {auctioneerActiveAuctions.length === 0 ? (
              <p className="text-xs text-gray-500">
                You don&apos;t have any live auctions right now.
              </p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {auctioneerActiveAuctions.map((a) => (
                  <button
                    key={a._id}
                    type="button"
                    onClick={() => handleAuctionClick(a._id)}
                    className="auction-card min-w-[240px] h-[120px] p-3 rounded-2xl border border-gray-200 shadow-sm relative text-left hover:shadow-md transition"
                  >
                    <div className="absolute inset-0 rounded-2xl border border-emerald-500 animate-pulse-slow pointer-events-none" />
                    <p className="font-semibold text-sm truncate text-gray-900 relative">
                      {a.title}
                    </p>
                    <p className="text-xs text-gray-600 relative">
                      Current bid{" "}
                      <span className="font-semibold text-blue-700">
                        ₹{a.currentBid || a.startingBid}
                      </span>
                    </p>
                    <p className="text-[11px] text-emerald-700 font-semibold relative">
                      Live • {getCountdown(a.endTime)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {isAuthenticated && user?.role === "Bidder" && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm md:text-base font-semibold text-gray-900">
                Your active auctions
              </h3>
              <span className="text-[11px] text-gray-500">
                Live auctions where you have placed a bid
              </span>
            </div>
            {bidderActiveAuctions.length === 0 ? (
              <p className="text-xs text-gray-500">
                You don&apos;t have any live bids right now.
              </p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {bidderActiveAuctions.map((a) => (
                  <button
                    key={a._id}
                    type="button"
                    onClick={() => handleAuctionClick(a._id)}
                    className="auction-card min-w-[240px] h-[120px] p-3 rounded-2xl border border-gray-200 shadow-sm relative text-left hover:shadow-md transition"
                  >
                    <div className="absolute inset-0 rounded-2xl border border-emerald-500 animate-pulse-slow pointer-events-none" />
                    <p className="font-semibold text-sm truncate text-gray-900 relative">
                      {a.title}
                    </p>
                    <p className="text-xs text-gray-600 relative">
                      Current bid{" "}
                      <span className="font-semibold text-blue-700">
                        ₹{a.currentBid || a.startingBid}
                      </span>
                    </p>
                    <p className="text-[11px] text-emerald-700 font-semibold relative">
                      Live • {getCountdown(a.endTime)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* PENDING ORDERS */}
      <div className="w-full max-w-6xl mx-auto mb-6">
        {isAuthenticated && user?.role === "Auctioneer" && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm md:text-base font-semibold text-gray-900">
                Your pending orders
              </h3>
            </div>
            {auctioneerPendingOrders.length === 0 ? (
              <p className="text-xs text-gray-500">
                No pending orders right now. New sales will appear here.
              </p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {auctioneerPendingOrders.map((o) => {
                  const recentDelivered = isRecentlyDelivered(o);

                  let statusChip = null;
                  let deliveryChip = null;
                  /* ---- COMPLAINT STATES (ALWAYS PRIORITY) ---- */
                  if (o.pendingReason === "complaint_open") {
                    statusChip = (
                      <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[11px]">
                        Complaint raised
                      </span>
                    );
                  } else if (o.pendingReason === "complaint_resolved_recent") {
                    statusChip = (
                      <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-[11px]">
                        Complaint resolved (last 2 hours)
                      </span>
                    );
                  }

                  /* ---- DELIVERY & PAYMENT STATES ---- */
                  else if (o.paymentStatus === "pending") {
                    statusChip = (
                      <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[11px]">
                        Awaiting bidder payment
                      </span>
                    );
                  } else if (o.paymentStatus === "holding") {
                    statusChip = (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px]">
                        Payment on hold
                      </span>
                    );
                  } else if (o.paymentStatus === "paid" && o.deliveryStatus === "pending") {
                    statusChip = (
                      <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-[11px]">
                        Awaiting shipment
                      </span>
                    );
                  } else if (o.deliveryStatus === "shipped") {
                    statusChip = (
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px]">
                        In transit
                      </span>
                    );
                  }

                  if (recentDelivered) {
                    deliveryChip = (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px]">
                        Delivery completed (last 4 hours)
                      </span>
                    );
                  }
                  

                  return (
                    <button
                      key={o._id}
                      type="button"
                      onClick={() => navigate(`/order/${o._id}`)}
                      className={`auction-card min-w-[250px] h-[130px] p-3 rounded-2xl shadow-sm border text-left hover:shadow-md transition ${
                        recentDelivered
                          ? "border-emerald-500 ring-1 ring-emerald-200"
                          : "border-gray-200"
                      }`}
                    >
                      <p className="font-semibold text-sm truncate">
                        {o.auction?.title || "Auction"}
                      </p>
                      <p className="text-xs text-gray-600">
                        Winner:{" "}
                        <span className="font-semibold">
                          {o.winner?.userName || "N/A"}
                        </span>
                      </p>
                      <p className="text-xs text-gray-600">
                        Price:{" "}
                        <span className="font-semibold text-blue-700">
                          ₹{o.price}
                        </span>
                      </p>
                      <div className="mt-1 flex flex-col gap-1">
                        {statusChip}
                        {deliveryChip}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {isAuthenticated && user?.role === "Bidder" && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm md:text-base font-semibold text-gray-900">
                Your pending orders
              </h3>
            </div>
            {bidderPendingOrders.length === 0 ? (
              <p className="text-xs text-gray-500">
                No pending orders. Won auctions will appear here until payment
                and delivery are completed.
              </p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {bidderPendingOrders.map((o) => {
                  const recentDelivered = isRecentlyDelivered(o);

                  let statusChip1 = null;
                  let statusChip2 = null;
                  let deliveryChip = null;


                  /* ---- COMPLAINT STATES ---- */
                  if (o.pendingReason === "complaint_open") {
                    statusChip1 = (
                      <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[11px]">
                        Complaint raised
                      </span>
                    );
                  } else if (o.pendingReason === "complaint_resolved_recent") {
                    statusChip1 = (
                      <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-[11px]">
                        Complaint resolved (last 2 hours)
                      </span>
                    );
                  }

                  /* ---- PAYMENT / DELIVERY ---- */
                  else if (o.paymentStatus !== "paid") {
                    statusChip1 = (
                      <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[11px]">
                        Payment pending
                      </span>
                    );
                    statusChip2 = (
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px]">
                        Tap to complete payment
                      </span>
                    );
                  } else if (o.deliveryStatus !== "completed") {
                    statusChip1 = (
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px]">
                        Waiting for delivery
                      </span>
                    );
                  } 

                  if (recentDelivered) {
                    deliveryChip = (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px]">
                        Delivery completed (last 4 hours)
                      </span>
                    );
                  }

                  return (
                    <button
                      key={o._id}
                      type="button"
                      onClick={() => navigate(`/order/${o._id}`)}
                      className={`auction-card min-w-[250px] h-[130px] p-3 rounded-2xl shadow-sm border text-left hover:shadow-md transition ${
                        recentDelivered
                          ? "border-emerald-500 ring-1 ring-emerald-200"
                          : "border-gray-200"
                      }`}
                    >
                      <p className="font-semibold text-sm truncate">
                        {o.auction?.title || "Auction"}
                      </p>
                      <p className="text-xs text-gray-600">
                        Winning amount{" "}
                        <span className="font-semibold text-blue-700">
                          ₹{o.price}
                        </span>
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Auction ended{" "}
                        {o.auction?.endTime
                          ? new Date(o.auction.endTime).toLocaleString()
                          : "N/A"}
                      </p>
                      <div className="mt-1 flex flex-col gap-1">
                        {statusChip1}
                        {statusChip2}
                        {deliveryChip}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SOON ENDING + TODAY */}
      <div className="w-full max-w-6xl mx-auto mb-8 space-y-6">
        {soonEndingAuctions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base md:text-lg font-semibold text-gray-900">
                Ending in the next hour
              </h3>
            </div>
            <div className="glass bg-white/90 backdrop-blur-lg rounded-2xl shadow-md p-3">
              <div className="flex gap-3 overflow-x-auto pb-1">
                {soonEndingAuctions.map((a) => {
                  const now = Date.now();
                  const total =
                    new Date(a.endTime).getTime() -
                    new Date(a.startTime).getTime();
                  const left =
                    new Date(a.endTime).getTime() - now;
                  const progress =
                    total > 0 ? Math.max(0, Math.min(1, left / total)) : 0;

                  return (
                    <button
                      key={a._id}
                      type="button"
                      onClick={() => handleAuctionClick(a._id)}
                      className="auction-card min-w-[260px] h-[150px] text-left rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition p-3 flex flex-col gap-1"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          {a.image?.url && (
                            <img
                              src={a.image.url}
                              alt={a.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm truncate text-gray-900">
                            {a.title}
                          </p>
                          <p className="text-xs text-gray-600">
                            Current bid{" "}
                            <span className="font-semibold text-blue-700">
                              ₹{a.currentBid || a.startingBid}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 w-full bg-red-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 transition-all"
                          style={{ width: `${progress * 100}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-red-600 font-semibold mt-1">
                        Ends • {getCountdown(a.endTime)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {auctionsToday.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base md:text-lg font-semibold text-gray-900">
                Auctions scheduled for today
              </h3>
            </div>
            <div className="glass bg-white/90 backdrop-blur-lg rounded-2xl shadow-md p-3">
              <div className="flex gap-3 overflow-x-auto pb-1">
                {auctionsToday.map((item) => (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => handleAuctionClick(item._id)}
                    className="auction-card min-w-[260px] h-[260px] text-left rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition p-3 flex flex-col gap-1"
                  >
                    <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 mb-2">
                      {item.image?.url && (
                        <img
                          src={item.image.url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <p className="font-semibold text-sm truncate text-gray-900">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-600">
                      Starting bid{" "}
                      <span className="font-semibold text-blue-700">
                        ₹{item.startingBid}
                      </span>
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Starts{" "}
                      {item.startTime
                        ? new Date(item.startTime).toLocaleString()
                        : "N/A"}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* LEADERBOARD + RECOMMENDED with fixed equal height and scroll */}
      <div className="w-full max-w-6xl mx-auto mb-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xl md:text-2xl font-extrabold text-gradient">
                Top 5 bidders
              </h3>
              <p className="text-xs text-gray-500">
                Ranked by total bid expenditure and auctions won.
              </p>
            </div>
            <button
              onClick={handleGotoLeaderboard}
              className="btn-primary text-[11px] md:text-xs font-semibold px-4 py-2"
            >
              Go to leaderboard
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl shadow-md glass bg-white/90 backdrop-blur-lg border border-gray-200 h-[260px] flex flex-col">
            <div className="overflow-x-auto overflow-y-auto flex-1">
              <table className="min-w-full text-left rounded-2xl border-collapse">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-gray-300">
                    <th className="py-3 px-4 text-xs md:text-sm w-10 text-center">
                      #
                    </th>
                    <th className="py-3 px-4 text-xs md:text-sm">Profile</th>
                    <th className="py-3 px-4 text-xs md:text-sm">Username</th>
                    <th className="py-3 px-4 text-xs md:text-sm">
                      Bid expenditure
                    </th>
                    <th className="py-3 px-4 text-xs md:text-sm">
                      Auctions won
                    </th>
                  </tr>
                </thead>
                <tbody className="text-gray-800 text-xs md:text-sm font-medium">
                  {top5.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-4 px-4 text-center text-gray-500"
                      >
                        No bidder data available yet.
                      </td>
                    </tr>
                  ) : (
                    top5.map((element, index) => (
                      <tr
                        key={element._id || index}
                        className="border-b border-gray-300 hover:bg-blue-50 transition-colors duration-300"
                      >
                        <td className="py-3 px-4 text-center font-semibold">
                          {index + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden bg-gray-200">
                            {element.profileImage?.url ? (
                              <img
                                src={element.profileImage.url}
                                alt={element.userName || "User"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500">
                                {element.userName?.[0]?.toUpperCase() || "U"}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">{element.userName}</td>
                        <td className="py-3 px-4 text-blue-600 font-semibold">
                          ₹{element.moneySpent}
                        </td>
                        <td className="py-3 px-4 text-blue-600 font-semibold">
                          {element.auctionsWon}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 bg-white/90 backdrop-blur-lg shadow-md flex flex-col h-[330px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg text-gray-900">
              {isAuthenticated && user?.role === "Bidder"
                ? "Recommended for you"
                : "Popular live auctions"}
            </h3>
            {/* <button
              onClick={handleViewAllAuctions}
              className="btn-primary text-[11px] font-semibold px-3 py-1"
            >
              View all
            </button> */}
          </div>
          {recommendedAuctions.length === 0 ? (
            <p className="text-xs text-gray-500">
              Live auctions will appear here once sellers start listing items.
            </p>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto text-sm flex-1">
              {recommendedAuctions.map((a) => (
                <button
                  key={a._id}
                  onClick={() => handleAuctionClick(a._id)}
                  className="w-full text-left px-3 py-2 rounded-xl bg-white cursor-pointer hover:bg-blue-50 border border-gray-100 flex flex-col"
                >
                  <span className="font-semibold text-gray-900 truncate">
                    {a.title}
                  </span>
                  <span className="text-xs text-gray-600">
                    Category: {a.category || "General"} • Current bid: ₹
                    {a.currentBid || a.startingBid}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FEATURED AUCTIONS */}
      <div className="w-full max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base md:text-lg font-semibold text-gray-900">
            Featured auctions
          </h3>
          <button
            onClick={handleViewAllAuctions}
            className="btn-primary text-[11px] font-semibold px-3 py-1"
          >
            View all
          </button>
        </div>
        <div className="glass bg-white/90 backdrop-blur-lg rounded-2xl shadow-md p-3">
          {featuredAuctions.length === 0 ? (
            <p className="text-xs text-gray-500">
              Featured auctions will appear here once auctioneers start listing
              items.
            </p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {featuredAuctions.map((a) => (
                <button
                  key={a._id}
                  type="button"
                  onClick={() => handleAuctionClick(a._id)}
                  className="auction-card min-w-[260px] h-[260px] text-left rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition p-3 flex flex-col gap-1"
                >
                  <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 mb-2">
                    {a.image?.url && (
                      <img
                        src={a.image.url}
                        alt={a.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <p className="font-semibold text-sm truncate text-gray-900">
                    {a.title}
                  </p>
                  <p className="text-xs text-gray-600">
                    Starting bid{" "}
                    <span className="font-semibold text-blue-700">
                      ₹{a.startingBid}
                    </span>
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Ends{" "}
                    {a.endTime
                      ? new Date(a.endTime).toLocaleString()
                      : "N/A"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* HOW IT WORKS + FOOTER */}
      <div className="w-full max-w-6xl mx-auto mb-10">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3">
          How SmartAuction works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {howItWorks.map((step) => (
            <div
              key={step.title}
              className="glass bg-white/90 backdrop-blur-lg rounded-2xl shadow-md border border-gray-200 p-3"
            >
              <h4 className="text-sm font-semibold text-gray-900 mb-1">
                {step.title}
              </h4>
              <p className="text-xs text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* <Footer />  keep your existing footer here */}

      {!isAuthenticated && <GuestChatBot />}
    </section>
  );
};

export default Home;
