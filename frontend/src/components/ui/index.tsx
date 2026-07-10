import React from "react";
import { Link, Navigate } from "react-router-dom";
import { Clock, Eye, Heart, Sparkles, ArrowUpRight } from "lucide-react";
import toast from "react-hot-toast";
import { Auction } from "../../types";
import { useCountdown, fmtCountdown } from "../../hooks/index";
import { useAppDispatch, useAppSelector } from "../../store/store";
import { toggleWishlist } from "../../store/slices";

// ── StatusBadge ───────────────────────────────────────────────────────────────
export const StatusBadge: React.FC<{ status: string; startTime: string }> = ({ status, startTime }) => {
  const isUpcoming = new Date(startTime) > new Date();
  if (status === "ended") return <span className="bg-red-100 text-red-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">Ended</span>;
  if (isUpcoming) return <span className="bg-amber-100 text-amber-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">Upcoming</span>;
  return <span className="flex items-center gap-1 bg-green-100 text-green-700 text-[11px] font-semibold px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"/>Live</span>;
};

// Auctions that haven't started yet show "Starts in" (with the exact date & time),
// otherwise the usual countdown to end. Shared by AuctionCard and the item page.
export const auctionTimerLabel = (auction: { startTime: string; endTime: string; status: string }, cd: ReturnType<typeof useCountdown>): string => {
  const hasStarted = new Date(auction.startTime) <= new Date();
  if (!hasStarted) return `Starts ${new Date(auction.startTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`;
  if (auction.status !== "active" || cd.isExpired) return "Ended";
  return fmtCountdown(cd);
};

// ── AuctionCard ───────────────────────────────────────────────────────────────
interface CardProps { auction: Auction; viewCount?: number; }
const AuctionCard: React.FC<CardProps> = ({ auction, viewCount = 0 }) => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector(s => s.auth);
  const cd = useCountdown(auction.startTime && new Date(auction.startTime) > new Date() ? auction.startTime : auction.endTime);
  const isLive = auction.status === "active" && new Date(auction.startTime) <= new Date();
  const hasStarted = new Date(auction.startTime) <= new Date();
  const lastMin = hasStarted && !cd.isExpired && cd.totalSeconds <= 180;
  const seller = typeof auction.createdBy === "object" ? auction.createdBy : null;
  const inWishlist = !!user?.wishlist?.includes(auction._id);

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!isAuthenticated) { toast.error("Login to wishlist."); return; }
    dispatch(toggleWishlist(auction._id));
  };

  return (
    <Link to={`/auction/item/${auction._id}`} className="group block animate-fade-in-up">
      <div className={`bg-white rounded-xl border overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${lastMin && isLive ? "border-red-300 ring-1 ring-red-200" : "border-gray-200"}`}>
        <div className="relative overflow-hidden h-48">
          <img src={auction.image?.url} alt={auction.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"/>
          <div className="absolute top-2 left-2"><StatusBadge status={auction.status} startTime={auction.startTime}/></div>
          <button onClick={handleWishlist} title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
            className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors ${inWishlist ? "bg-white text-red-500" : "bg-black/30 text-white hover:bg-black/50"}`}>
            <Heart size={14} fill={inWishlist ? "currentColor" : "none"}/>
          </button>
          {auction.aiPricePrediction && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-indigo-600/90 text-white text-[11px] font-medium px-2 py-0.5 rounded-full">
              <Sparkles size={10}/> AI Prediction
            </div>
          )}
          {lastMin && isLive && <div className="absolute bottom-2 left-2 right-2 bg-red-500 text-white text-xs font-bold text-center py-1 rounded-lg animate-pulse">⚡ Last minutes!</div>}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2 flex-1">{auction.title}</h3>
            <ArrowUpRight size={15} className="text-gray-300 group-hover:text-indigo-500 flex-shrink-0 transition-colors mt-0.5"/>
          </div>
          {seller && (
            <div className="flex items-center gap-1.5 mb-2">
              <img src={seller.profileImage?.url} alt="" className="w-4 h-4 rounded-full object-cover"/>
              <span className="text-xs text-gray-400">{seller.userName}</span>
            </div>
          )}
          <p className="text-xs text-gray-400 line-clamp-2 mb-3 leading-relaxed">{auction.description}</p>
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Current Bid</p>
              <p className="text-lg font-bold text-gray-900">₹{(auction.currentBid || auction.startingBid).toLocaleString()}</p>
              {auction.aiPricePrediction && (
                <p className="text-xs text-indigo-500 flex items-center gap-0.5 mt-0.5"><Sparkles size={9}/> Est. ₹{auction.aiPricePrediction.toLocaleString()}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 mb-0.5">Bids</p>
              <p className="font-semibold text-gray-700 text-sm">{auction.bids?.length ?? 0}</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2.5 border-t border-gray-100">
            <div className={`flex items-center gap-1 text-xs font-medium ${!hasStarted ? "text-amber-600" : cd.isExpired ? "text-gray-400" : lastMin ? "text-red-500 animate-pulse" : "text-gray-500"}`}>
              <Clock size={11}/> {auctionTimerLabel(auction, cd)}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-0.5"><Eye size={10}/> {viewCount}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};
export default AuctionCard;

// ── Spinner ───────────────────────────────────────────────────────────────────
export const Spinner: React.FC<{ size?: string }> = ({ size = "h-8 w-8" }) => (
  <div className={`${size} border-2 border-indigo-600 border-t-transparent rounded-full animate-spin`}/>
);

export const PageLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center"><Spinner size="h-10 w-10"/></div>
);

// ── Protected Routes ──────────────────────────────────────────────────────────
export const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({ children, roles }) => {
  const { isAuthenticated, user, loading, authChecked } = useAppSelector(s => s.auth);
  if (loading || !authChecked) return <PageLoader/>;
  if (!isAuthenticated) return <Navigate to="/login" replace/>;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/" replace/>;
  return <>{children}</>;
};

export const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, authChecked } = useAppSelector(s => s.auth);
  if (!authChecked) return <PageLoader/>;
  if (isAuthenticated) return <Navigate to="/" replace/>;
  return <>{children}</>;
};

// ── Empty State ────────────────────────────────────────────────────────────────
export const EmptyState: React.FC<{ icon?: React.ReactNode; title: string; desc?: string; action?: { label: string; to: string } }> = ({ icon, title, desc, action }) => (
  <div className="text-center py-16">
    {icon && <div className="text-gray-300 flex justify-center mb-4">{icon}</div>}
    <p className="text-gray-500 font-medium text-lg">{title}</p>
    {desc && <p className="text-gray-400 text-sm mt-1">{desc}</p>}
    {action && <Link to={action.to} className="mt-4 inline-block bg-indigo-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors">{action.label}</Link>}
  </div>
);

// ── Order Status Badge ────────────────────────────────────────────────────────
export const OrderStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    paid: "bg-blue-100 text-blue-700",
    shipped: "bg-purple-100 text-purple-700",
    delivered: "bg-teal-100 text-teal-700",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    problem: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${map[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
};
