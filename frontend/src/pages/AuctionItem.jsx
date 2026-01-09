// frontend/src/pages/AuctionItem.jsx
import Spinner from "@/custom-components/Spinner";
import { getAuctionDetail } from "@/store/slices/auctionSlice";
import { placeBid } from "@/store/slices/bidSlice";
import {
  AlertCircle,
  Bell,
  ChevronDown,
  Clock,
  Eye,
  Gavel,
  Users,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { connectAuctionSocket } from "@/lib/socket";

const formatCountdown = (msDiff) => {
  if (msDiff <= 0) return "00h 00m 00s";
  const totalSeconds = Math.floor(msDiff / 1000);
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${hours}h ${minutes}m ${seconds}s`;
};

const AuctionItem = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();

  const { auctionDetail, loading } = useSelector((state) => state.auction);
  const { isAuthenticated, user } = useSelector((state) => state.user);

  const [bidAmount, setBidAmount] = useState("");
  const [expandedDetails, setExpandedDetails] = useState(false);
  const [watchCount, setWatchCount] = useState(0);
  const [timeLabel, setTimeLabel] = useState("");
  const [timeValue, setTimeValue] = useState("");
  const socketRef = useRef(null);
  const timerRef = useRef(null);

  // Fetch initial auction details via API
  useEffect(() => {
    if (id) {
      dispatch(getAuctionDetail(id));
    }
  }, [id, dispatch]);

  // WebSocket: connect and listen for real-time updates
  useEffect(() => {
    if (!id) return;

    const socket = connectAuctionSocket(id);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "bid_update" && data.auctionId === id) {
          if (
            user &&
            data.highestBidderId &&
            data.highestBidderId !== String(user._id)
          ) {
            toast.info(
              `New highest bid on this auction: ₹${data.currentBid}`,
              { autoClose: 2500 }
            );
          }
          dispatch(getAuctionDetail(id));
        }

        if (data.type === "watcher_count" && data.auctionId === id) {
          setWatchCount(data.count || 0);
        }
      } catch (err) {
        console.error("WS message parse error:", err);
      }
    };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    socket.onclose = () => {
      socketRef.current = null;
    };

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [id, dispatch, user]);

  // Live countdown for starts in / ends in
  useEffect(() => {
    if (!auctionDetail) return;

    const startTime = new Date(auctionDetail.startTime);
    const endTime = new Date(auctionDetail.endTime);

    const updateTime = () => {
      const now = new Date();
      if (now < startTime) {
        setTimeLabel("Starts in");
        setTimeValue(formatCountdown(startTime.getTime() - now.getTime()));
      } else if (now >= startTime && now < endTime) {
        setTimeLabel("Ends in");
        setTimeValue(formatCountdown(endTime.getTime() - now.getTime()));
      } else {
        setTimeLabel("Status");
        setTimeValue("Auction ended");
      }
    };

    updateTime();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(updateTime, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [auctionDetail]);

  if (loading || !auctionDetail) {
    return (
      <div className="flex items-center justify-center min-h-screen pt-20 lg:pt-24">
        <Spinner />
      </div>
    );
  }

  const {
    title,
    description,
    image,
    startingBid,
    currentBid,
    endTime,
    startTime,
    bids = [],
    createdBy,
    status,
    category,
    condition,
    aiDescription,
    aiPricePrediction,
    winner,
    highestBidderName,
    finalBidAmount,
  } = auctionDetail;

  const now = new Date();
  const auctionStarted = new Date(startTime) <= now;
  const auctionEnded = new Date(endTime) <= now || status === "ended";

  const handlePlaceBid = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (!bidAmount || isNaN(bidAmount)) {
      toast.error("Please enter a valid bid amount.");
      return;
    }

    dispatch(
      placeBid({
        id,
        amount: Number(bidAmount),
      })
    )
      .unwrap()
      .then((res) => {
        toast.success(res?.message || "Bid placed successfully.");
        setBidAmount("");
      })
      .catch((err) => {
        toast.error(
          err?.message ||
            err ||
            "Failed to place bid. Please try again."
        );
      });
  };

  const highestBid = currentBid || startingBid;

  const winnerNameDisplay =
    winner?.userName || highestBidderName || "N/A";
  const winningAmountDisplay =
    finalBidAmount || highestBid || startingBid || 0;

  return (
    <section className="page-container pt-24 pb-10 px-4">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-glow p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Image + AI description + AI price */}
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden shadow-lg">
            <img
              src={image?.url}
              alt={title}
              className="w-full h-72 md:h-80 object-cover transition-transform duration-500 hover:scale-105"
            />
            <div className="absolute top-3 left-3 flex gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  auctionEnded
                    ? "bg-red-100 text-red-700 border border-red-200"
                    : auctionStarted
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                }`}
              >
                {auctionEnded
                  ? "Ended"
                  : auctionStarted
                  ? "Live"
                  : "Upcoming"}
              </span>
              {category && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                  {category}
                </span>
              )}
            </div>
            {condition && (
              <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-gray-700 border border-gray-200">
                Condition: {condition}
              </div>
            )}
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-500" />
              <span>{watchCount} watching</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-green-500" />
              <span>{bids.length} bids</span>
            </div>
            {createdBy && (
              <button
                onClick={() => navigate(`/profile/${createdBy._id}`)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
              >
                <Gavel className="w-4 h-4" />
                <span>By {createdBy.userName}</span>
              </button>
            )}
          </div>

          {/* AI Description */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-900 text-sm">
                AI Description
              </h3>
              {createdBy && (
                <span className="text-xs text-gray-500">
                  based on details from{" "}
                  <span className="font-semibold">
                    {createdBy.userName}
                  </span>
                </span>
              )}
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {aiDescription || description}
            </p>
          </div>

          {/* AI Price Prediction */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="flex items-center gap-2 mb-1">
              <Gavel className="w-4 h-4 text-emerald-700" />
              <h3 className="font-semibold text-gray-900 text-sm">
                Price Prediction
              </h3>
            </div>
            {aiPricePrediction ? (
              <>
                <p className="text-2xl font-bold text-emerald-700">
                  ₹{aiPricePrediction}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Estimated final bid based on category, condition and
                  starting bid. This is only a rough prediction and not
                  guaranteed.
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-600">
                Prediction not available for this auction.
              </p>
            )}
          </div>
        </div>

        {/* Right: core details and bidding box */}
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              {title}
            </h1>
            {/* Original description removed from here, now on left as AI Description */}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Gavel className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-800">
                  Current Bid
                </h3>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ₹{highestBid}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Starting bid: ₹{startingBid}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-800">Time</h3>
              </div>
              <p className="text-sm text-gray-700">
                Starts: {new Date(startTime).toLocaleString()}
              </p>
              <p className="text-sm text-gray-700">
                Ends: {new Date(endTime).toLocaleString()}
              </p>
              <p className="mt-2 text-xs text-blue-700 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span className="font-semibold">{timeLabel}:</span>{" "}
                <span>{timeValue}</span>
              </p>
              {auctionEnded && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Auction has ended.
                </p>
              )}
            </div>
          </div>

          {/* Winner info after auction ends */}
          {auctionEnded && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm">
              <p className="font-semibold text-emerald-800">
                Winner: {winnerNameDisplay}
              </p>
              <p className="text-emerald-700 mt-1">
                Winning bid: ₹{winningAmountDisplay}
              </p>
            </div>
          )}

          {/* Bid box */}
          <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Gavel className="w-5 h-5 text-emerald-600" />
                Place Your Bid
              </h3>
              {!auctionStarted && !auctionEnded && (
                <span className="text-xs text-yellow-700 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Auction not started yet
                </span>
              )}
              {auctionEnded && (
                <span className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Bidding closed
                </span>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-3 items-stretch">
              <input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder={`Min: ₹${
                  Math.max(startingBid, currentBid || startingBid) + 1
                }`}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!auctionStarted || auctionEnded}
              />
              <button
                type="button"
                onClick={handlePlaceBid}
                disabled={!auctionStarted || auctionEnded}
                className={`auction-bid-button flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${
                  !auctionStarted || auctionEnded
                    ? "opacity-60 cursor-not-allowed"
                    : ""
                }`}
              >
                <Gavel className="w-4 h-4" />
                Place Bid
              </button>
            </div>
          </div>

          {/* Bid history */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
            <button
              type="button"
              onClick={() => setExpandedDetails((v) => !v)}
              className="w-full flex items-center justify-between text-sm font-semibold text-gray-700"
            >
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                Bid History ({bids.length})
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  expandedDetails ? "rotate-180" : ""
                }`}
              />
            </button>
            {expandedDetails && (
              <div className="mt-3 max-h-60 overflow-y-auto space-y-2 text-xs">
                {bids.length === 0 && (
                  <p className="text-gray-500">
                    No bids yet. Be the first!
                  </p>
                )}
                {bids
                  .slice()
                  .sort((a, b) => b.amount - a.amount)
                  .map((b, idx) => (
                    <div
                      key={`${b.userId}-${b.amount}-${idx}`}
                      className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        {b.profileImage && (
                          <img
                            src={b.profileImage}
                            alt={b.userName}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        )}
                        <span className="font-medium">
                          {b.userName || "Bidder"}
                        </span>
                      </div>
                      <span className="font-semibold text-gray-800">
                        ₹{b.amount}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Alerts / watch section */}
          {/* <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Bell className="w-4 h-4 text-orange-500" />
              <span>
                Use the AI assistant to set alerts for this auction.
              </span>
            </div>
          </div> */}
        </div>
      </div>
    </section>
  );
};

export default AuctionItem;
