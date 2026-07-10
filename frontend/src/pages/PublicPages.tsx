import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Gavel, Sparkles, TrendingUp, Shield, Zap, ArrowRight, CheckCircle, Eye, EyeOff, Upload, Clock, Search, Filter, SlidersHorizontal, MessageCircle, Heart, ChevronDown, ChevronUp, AlertCircle, User, X, Star, ChevronLeft, ChevronRight, PlayCircle, Users, Bot, Hash, Facebook, Twitter, Linkedin, Instagram, MapPin, Phone, Mail, LayoutGrid, Smartphone, Shirt, Sofa, Home as HomeIcon, Music2, Palette, Tag, Dumbbell, BookOpen, Gem, Car, MoreHorizontal, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../store/store";
import { fetchAuctions, fetchAuction, fetchCategoryCounts, resetDetail, wsUpdateBid, wsExtendTime } from "../store/slices";
import { login, register, verifyOTP, resendOTP, forgotPassword, resetPassword, clearError, clearMessage, toggleWishlist } from "../store/slices";
import { placeBid, clearBidError, clearBidMessage } from "../store/slices";
import { submitQuestion, submitAnswer } from "../store/slices";
import { fetchMySiteRating, submitSiteRating, clearSiteRatingError, clearSiteRatingMessage } from "../store/slices";
import { useCountdown, fmtCountdown, useAuctionSocket } from "../hooks/index";
import { Spinner, EmptyState, PageLoader } from "../components/ui/index";
import GoogleButton from "../components/auth/GoogleButton";
import heroBg from "../assets/hero-bg.png";

// ═══════════════════════════════════════════════════════════════════
// HOME PAGE
// ═══════════════════════════════════════════════════════════════════
const HOME_FILTERS = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "upcoming", label: "Upcoming" },
  { key: "ended", label: "Ended" },
] as const;
type HomeFilterKey = typeof HOME_FILTERS[number]["key"];

// Categories a logged-in user can rate the platform on (one submission per account).
const RATING_CATEGORIES: { key: "userSatisfaction" | "aiFeatures" | "chatbotAssistance"; label: string }[] = [
  { key: "userSatisfaction", label: "User Satisfaction" },
  { key: "aiFeatures", label: "AI Features Engagement" },
  { key: "chatbotAssistance", label: "Chatbot Assistance" },
];

const StarRow: React.FC<{ value: number; onChange?: (v: number) => void; readOnly?: boolean }> = ({ value, onChange, readOnly }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map(n => (
      <button key={n} type="button" disabled={readOnly} onClick={() => onChange?.(n)}
        className={readOnly ? "cursor-default" : "cursor-pointer hover:scale-110 transition-transform"}>
        <Star size={20} className={n <= value ? "text-amber-400" : "text-gray-300"} fill={n <= value ? "currentColor" : "none"}/>
      </button>
    ))}
  </div>
);

// ─── Shared auction-card helpers (used by Home hero, Home "Browse Auctions",
// and the full Auctions listing page) ───────────────────────────────
const isLiveAuction = (a: any) => a.status === "active" && new Date(a.startTime) <= new Date();
const isUpcomingAuction = (a: any) => a.status === "active" && new Date(a.startTime) > new Date();
const isEndedAuction = (a: any) => a.status === "ended" || a.status === "completed";
const auctionStatusMeta = (a: any) => {
  if (isEndedAuction(a)) return { key: "ended", label: "Ended", cls: "bg-gray-700 text-white" };
  if (isLiveAuction(a)) return { key: "live", label: "Live", cls: "bg-green-500 text-white" };
  return { key: "upcoming", label: "Upcoming", cls: "bg-white text-gray-800" };
};
const bidCountOf = (a: any) => a.bidCount ?? a.bids?.length ?? 0;

// Live countdown / status text used in card footers.
const CardTimeInfo: React.FC<{ auction: any }> = ({ auction: a }) => {
  const cd = useCountdown(a.endTime);
  if (isEndedAuction(a)) return <span className="flex items-center gap-1"><Clock size={13}/> Ended</span>;
  if (isUpcomingAuction(a)) {
    return <span className="flex items-center gap-1 text-amber-600 font-medium"><Clock size={13}/> Starts {new Date(a.startTime).toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</span>;
  }
  return <span className="flex items-center gap-1"><Clock size={13}/> {cd.isExpired ? "Ended" : fmtCountdown(cd)}</span>;
};

// Full-detail card — used on the Home "Browse Auctions" section and on the
// standalone Auctions listing page (matches the design's Est. Value / AI
// Predicted badge / views layout).
const AuctionCardFull: React.FC<{ auction: any; viewCount: number; badgeLabel?: string; badgeIcon?: React.ReactNode }> = ({ auction: a, viewCount, badgeLabel = "AI Predicted", badgeIcon = <Hash size={11}/> }) => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector(s => s.auth);
  const meta = auctionStatusMeta(a);
  const inWishlist = user?.wishlist?.includes(a._id);
  const seller = typeof a.createdBy === "object" ? a.createdBy as any : null;
  return (
    <Link to={`/auction/item/${a._id}`}
      className="group block bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-indigo-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out">
      <div className="relative overflow-hidden">
        <img src={a.image?.url} alt={a.title} className="w-full h-48 object-cover transition-transform duration-500 ease-out group-hover:scale-110"/>
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"/>
        <span className={`absolute top-3 left-3 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${meta.cls}`}>
          {meta.key === "live" && <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"/>}{meta.label}
        </span>
        <button onClick={(e) => { e.preventDefault(); if (!isAuthenticated) { toast.error("Login to wishlist."); return; } dispatch(toggleWishlist(a._id)); }}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full bg-white flex items-center justify-center transition-colors ${inWishlist ? "text-red-500" : "text-gray-500 hover:text-red-500"}`}>
          <Heart size={15} fill={inWishlist ? "currentColor" : "none"}/>
        </button>
        {a.aiPricePrediction ? (
          <span className="absolute bottom-3 right-3 flex items-center gap-1 bg-indigo-600 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
            {badgeIcon} {badgeLabel}
          </span>
        ) : null}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 leading-snug line-clamp-1 group-hover:text-indigo-600 transition-colors">{a.title}</h3>
        <div className="flex items-center gap-1.5 mt-1.5">
          {seller?.profileImage?.url && <img src={seller.profileImage.url} className="w-4 h-4 rounded-full object-cover" alt=""/>}
          <span className="text-xs text-gray-500">{seller?.userName || "Seller"}</span>
          <CheckCircle size={12} className="text-indigo-500" fill="currentColor" color="white"/>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div><p className="text-[11px] text-gray-400">Current Bid</p><p className="font-bold text-gray-900">₹{(a.currentBid || a.startingBid).toLocaleString()}</p></div>
          <div className="text-right"><p className="text-[11px] text-gray-400">Bids</p><p className="font-bold text-gray-900">{bidCountOf(a)}</p></div>
        </div>
        {a.aiPricePrediction ? <p className="text-xs text-indigo-600 font-medium mt-1.5">Est. Value: ₹{a.aiPricePrediction.toLocaleString()}</p> : null}
        <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
          <CardTimeInfo auction={a}/>
          <span className="flex items-center gap-1"><Eye size={13}/> {viewCount}</span>
        </div>
      </div>
    </Link>
  );
};

// Hero card (big + small variants) for the Home page carousel.
const HeroCard: React.FC<{ auction: any; big?: boolean }> = ({ auction: a, big }) => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector(s => s.auth);
  const meta = auctionStatusMeta(a);
  const cd = useCountdown(a.endTime);
  const inWishlist = user?.wishlist?.includes(a._id);
  const seller = typeof a.createdBy === "object" ? a.createdBy as any : null;
  return (
    <Link to={`/auction/item/${a._id}`}
      className={`relative flex flex-col bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/20 hover:border-indigo-400 hover:bg-white/[0.15] hover:shadow-[0_0_0_1px_rgba(129,140,248,0.6),0_0_24px_rgba(129,140,248,0.35)] transition-all duration-200 ${big ? "h-full" : ""}`}>
      <div className="relative flex-shrink-0">
        <img src={a.image?.url} alt={a.title} className={`w-full object-cover ${big ? "h-64" : "h-28"}`}/>
        <span className={`absolute top-3 left-3 flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${meta.cls}`}>
          {meta.key === "live" && <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"/>}{meta.label}
        </span>
        <button onClick={(e) => { e.preventDefault(); if (!isAuthenticated) { toast.error("Login to wishlist."); return; } dispatch(toggleWishlist(a._id)); }}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-gray-600 hover:text-red-500 transition-colors">
          <Heart size={13} fill={inWishlist ? "currentColor" : "none"} className={inWishlist ? "text-red-500" : ""}/>
        </button>
        {big && isLiveAuction(a) && (
          <span className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full">
            <Clock size={12}/> {cd.isExpired ? "Ended" : fmtCountdown(cd)} Remaining
          </span>
        )}
      </div>
      <div className={`p-3 flex-1 flex flex-col ${big ? "justify-between" : "justify-center"}`}>
        <div>
          <p className={`text-white font-semibold ${big ? "text-base leading-snug" : "text-xs leading-snug line-clamp-2"}`}>{a.title}</p>
          {big && seller && (
            <div className="flex items-center gap-1.5 mt-2">
              {seller.profileImage?.url && <img src={seller.profileImage.url} className="w-5 h-5 rounded-full object-cover" alt=""/>}
              <span className="text-xs text-white/70">{seller.userName}</span>
              <CheckCircle size={12} className="text-indigo-300" fill="currentColor" color="#312e81"/>
            </div>
          )}
        </div>
        <div className={`flex items-center justify-between ${big ? "mt-4" : "mt-2"}`}>
          <div><p className="text-[10px] text-white/50">Current Bid</p><p className={`font-bold text-white ${big ? "text-lg" : "text-xs"}`}>₹{(a.currentBid || a.startingBid).toLocaleString()}</p></div>
          <div className="text-right"><p className="text-[10px] text-white/50">Bids</p><p className={`font-bold text-white ${big ? "text-lg" : "text-xs"}`}>{bidCountOf(a)}</p></div>
        </div>
      </div>
    </Link>
  );
};

// Small removable filter chip used on the Auctions listing page.
const FilterChip: React.FC<{ label: string; onClear: () => void }> = ({ label, onClear }) => (
  <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium pl-3 pr-2 py-1.5 rounded-full">
    {label}
    <button onClick={onClear} className="hover:text-indigo-900 transition-colors"><X size={12}/></button>
  </span>
);


export const Home: React.FC = () => {
  const dispatch = useAppDispatch();
  const { auctions } = useAppSelector(s => s.auction);
  const { isAuthenticated } = useAppSelector(s => s.auth);
  const { rating: myRating, checked: ratingChecked, loading: ratingLoading, error: ratingError, message: ratingMsg } = useAppSelector(s => s.siteRating);
  const [homeFilter, setHomeFilter] = useState<HomeFilterKey>("all");
  const [ratingForm, setRatingForm] = useState({ userSatisfaction: 0, aiFeatures: 0, chatbotAssistance: 0 });
  const [heroPage, setHeroPage] = useState(0);
  useEffect(() => { dispatch(fetchAuctions({ limit: 12, sort: "newest" })); }, [dispatch]);
  useEffect(() => { if (isAuthenticated) dispatch(fetchMySiteRating()); }, [isAuthenticated, dispatch]);
  useEffect(() => { if (ratingError) { toast.error(ratingError); dispatch(clearSiteRatingError()); } }, [ratingError]);
  useEffect(() => { if (ratingMsg) { toast.success(ratingMsg); dispatch(clearSiteRatingMessage()); } }, [ratingMsg]);

  const handleSubmitRating = () => {
    const { userSatisfaction, aiFeatures, chatbotAssistance } = ratingForm;
    if (!userSatisfaction || !aiFeatures || !chatbotAssistance) { toast.error("Please rate all three categories."); return; }
    dispatch(submitSiteRating(ratingForm));
  };

  // Only 6 auctions on the Home page (3 per row, 2 rows) — "View All Auctions" below takes users to the full list.
  const filtered = auctions.filter(a => {
    const started = new Date(a.startTime) <= new Date();
    if (homeFilter === "live") return a.status === "active" && started;
    if (homeFilter === "upcoming") return a.status === "active" && !started;
    if (homeFilter === "ended") return a.status === "ended" || a.status === "completed";
    return true;
  }).slice(0, 6);
  const featured = filtered;

  // Hero carousel: up to 6 auctions split into 2 pages of 3 (1 big + 2 small
  // cards each). If fewer than 6 unique auctions exist, page 2 repeats items
  // from page 1 to always fill 3 slots. Only ever 2 pages max.
  const heroPages = React.useMemo(() => {
    const pool = auctions.slice(0, 6);
    if (pool.length === 0) return [] as any[][];
    if (pool.length <= 3) return [pool];
    const page1 = pool.slice(0, 3);
    const page2 = pool.slice(3, 6);
    let i = 0;
    while (page2.length < 3) { page2.push(page1[i % page1.length]); i++; }
    return [page1, page2];
  }, [auctions]);
  useEffect(() => { if (heroPage > heroPages.length - 1) setHeroPage(0); }, [heroPages.length]);
  const currentHero = heroPages[heroPage] || [];

  const FEATURES = [
    { icon: <Sparkles size={20}/>, title: "AI-Generated Descriptions", desc: "AI analyzes your items and creates compelling descriptions to attract more bidders." },
    { icon: <TrendingUp size={20}/>, title: "Price Prediction", desc: "Get intelligent estimates of the final selling price based on market data." },
    { icon: <Zap size={20}/>, title: "Real-Time Bidding", desc: "WebSocket-powered live bidding with zero delay across all devices." },
    { icon: <Shield size={20}/>, title: "Anti-Snipe Protection", desc: "Last-minute bids automatically extend the auction by 3 minutes." },
    { icon: <Clock size={20}/>, title: "Auto-Relist", desc: "Unpaid auctions auto-relist after 24 hours, notifying all previous bidders." },
    { icon: <CheckCircle size={20}/>, title: "Secure Payments", desc: "Razorpay-powered payments with automatic payout to auctioneers after delivery." },
  ];

  return (
    <div>
      {/* Hero */}
      <section
        className="text-white py-20 relative overflow-hidden bg-gray-950 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        {/* Readability overlay — keeps the same indigo/purple tint over the photo so text and cards stay legible at every screen size */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/85 via-indigo-950/60 to-purple-950/50"/>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in-up">
              <span className="inline-flex items-center gap-1.5 bg-white/10 text-white/90 text-xs font-medium px-3 py-1.5 rounded-full mb-6 border border-white/20">
                <Sparkles size={12}/> AI Powered Auction Platform
              </span>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
                The Future of<br/>
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Online Auctions</span><br/>
                is Here
              </h1>
              <p className="text-white/70 text-lg leading-relaxed mb-8">SmartAuction combines AI with real-time bidding to deliver the smartest, safest, and most exciting auction experience.</p>
              <div className="flex flex-wrap gap-3 mb-8">
                <Link to="/auctions" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2">Browse Auctions <ArrowRight size={16}/></Link>
                <Link to={isAuthenticated ? "/how-it-works" : "/register"} className="border border-white/30 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2">
                  {isAuthenticated ? <><PlayCircle size={16}/> How It Works</> : "Sign Up Free"}
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-6">
                {[
                  { icon: <Shield size={18}/>, title: "Secure", sub: "100% Safe Payments" },
                  { icon: <Sparkles size={18}/>, title: "AI Powered", sub: "Smart Predictions" },
                  { icon: <Users size={18}/>, title: "10,000+", sub: "Happy Users" },
                ].map((t, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-indigo-300 flex-shrink-0">{t.icon}</div>
                    <div><p className="text-sm font-semibold text-white leading-tight">{t.title}</p><p className="text-xs text-white/50">{t.sub}</p></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero auction carousel: 1 big + up to 2 small cards, capped at 2 pages of 3.
                Adapts to however many auctions actually exist — with only 1 or 2
                auctions in the platform, it still shows those instead of showing
                nothing (it used to require exactly 3 to render at all). */}
            <div className="hidden lg:block">
              {currentHero.length === 1 && (
                <div style={{ minHeight: "22rem" }}><HeroCard auction={currentHero[0]} big/></div>
              )}
              {currentHero.length === 2 && (
                <div className="grid grid-cols-2 gap-4" style={{ minHeight: "22rem" }}>
                  <HeroCard auction={currentHero[0]} big/>
                  <HeroCard auction={currentHero[1]} big/>
                </div>
              )}
              {currentHero.length >= 3 && (
                <div className="grid grid-cols-2 grid-rows-2 gap-4" style={{ minHeight: "22rem" }}>
                  <div className="row-span-2"><HeroCard auction={currentHero[0]} big/></div>
                  <HeroCard auction={currentHero[1]}/>
                  <HeroCard auction={currentHero[2]}/>
                </div>
              )}
              {heroPages.length > 1 && (
                <div className="flex justify-end gap-3 mt-4">
                  <button disabled={heroPage === 0} onClick={() => setHeroPage(p => p - 1)}
                    className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors">
                    <ChevronLeft size={18}/>
                  </button>
                  <button disabled={heroPage === heroPages.length - 1} onClick={() => setHeroPage(p => p + 1)}
                    className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-indigo-500 transition-colors">
                    <ChevronRight size={18}/>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div><h2 className="text-2xl font-bold text-gray-900">Browse Auctions</h2><p className="text-gray-500 text-sm mt-1">Discover items live, upcoming, and recently ended</p></div>
            <Link to="/auctions" className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium">View All <ArrowRight size={14}/></Link>
          </div>
          <div className="flex flex-wrap gap-2 mb-8">
            {HOME_FILTERS.map(f => (
              <button key={f.key} onClick={() => setHomeFilter(f.key)}
                className={`text-sm font-medium px-4 py-1.5 rounded-full border transition-colors ${homeFilter === f.key ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600"}`}>
                {f.label}
              </button>
            ))}
          </div>
          {featured.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {featured.map(a => <AuctionCardFull key={a._id} auction={a} viewCount={Math.floor(Math.random()*200)+50} badgeLabel="AI Prediction" badgeIcon={<Zap size={11}/>}/>)}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400 text-sm">No {homeFilter !== "all" ? homeFilter : ""} auctions right now — check back soon!</div>
          )}
          <div className="mt-10 text-center">
            <Link to="/auctions" className="inline-flex items-center gap-2 bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors">
              View All Auctions <ArrowRight size={16}/>
            </Link>
          </div>
        </div>
      </section>

      {/* AI Features */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-indigo-600 text-xs font-semibold uppercase tracking-widest mb-3">Powered by AI</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Smart Technology for Smarter Auctions</h2>
          <p className="text-gray-500 mb-10 max-w-2xl mx-auto">Every aspect of the platform is enhanced by AI to maximize value for buyers and sellers.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-gray-200 text-left hover:shadow-md transition-shadow animate-fade-in-up flex flex-col" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 mb-3">{f.icon}</div>
                <h3 className="font-semibold text-gray-800 mb-1.5">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed flex-1">{f.desc}</p>
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mt-3 self-end hover:bg-indigo-100 transition-colors">
                  <ArrowRight size={14}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-14 bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center mb-10">Experience the SmartAuction Difference</h2>
          <div className="grid grid-cols-3 gap-6 text-center divide-x divide-white/20">
            {[
              { icon: <Users size={22}/>, value: "4.9/5", label: "User satisfaction rating", stars: 5, sub: "(2,500+ reviews)" },
              { icon: <TrendingUp size={22}/>, value: "38%", label: "Higher engagement with AI Features" },
              { icon: <Bot size={22}/>, value: "95%", label: "Chat Bot Assistance Resolved", sub: "(within minutes)" },
            ].map((s, i) => (
              <div key={i} className="px-2">
                <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-3">{s.icon}</div>
                <p className="text-4xl font-bold">{s.value}</p>
                <p className="text-white/70 text-sm mt-2">{s.label}</p>
                {s.stars ? <div className="flex justify-center gap-0.5 mt-2">{Array.from({ length: 5 }).map((_, n) => <Star key={n} size={14} className="text-amber-300" fill="currentColor"/>)}</div> : null}
                {s.sub && <p className="text-white/50 text-xs mt-1">{s.sub}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA (guests) / Rate the website (logged-in users) */}
      {isAuthenticated ? (
        <section className="py-14 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4">
            {!ratingChecked ? (
              <div className="flex justify-center py-6"><Spinner size="h-6 w-6"/></div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                  {myRating ? "Thanks for rating SmartAuction! 🙌" : "Rate your SmartAuction experience"}
                </h2>
                <p className="text-gray-500 text-sm text-center mb-8 max-w-xl mx-auto">
                  {myRating ? "You've already submitted your feedback — here's what you told us." : "Your feedback helps us improve the platform. You can rate us once per account."}
                </p>
                <div className="grid md:grid-cols-2 gap-6 items-start">
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center mx-auto mb-3"><Star size={20} fill="currentColor"/></div>
                    <p className="text-3xl font-bold text-gray-900">4.8/5</p>
                    <p className="text-sm text-gray-500 mb-2">Average Rating</p>
                    <div className="flex justify-center gap-0.5">{Array.from({ length: 5 }).map((_, n) => <Star key={n} size={16} className={n < 4 ? "text-amber-400" : "text-gray-300"} fill={n < 4 ? "currentColor" : "none"}/>)}</div>
                    <p className="text-xs text-gray-400 mt-2">Based on 2,500+ reviews</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl p-6">
                    <div className="space-y-4">
                      {RATING_CATEGORIES.map(c => (
                        <div key={c.key} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{c.label}</span>
                          {myRating ? <StarRow value={myRating[c.key]} readOnly/> : <StarRow value={ratingForm[c.key]} onChange={v => setRatingForm(p => ({ ...p, [c.key]: v }))}/>}
                        </div>
                      ))}
                    </div>
                    {!myRating && (
                      <button onClick={handleSubmitRating} disabled={ratingLoading}
                        className="mt-5 w-full bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60">
                        {ratingLoading ? "Submitting..." : "Submit Rating"}
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      ) : (
        <section className="py-14 bg-white">
          <div className="max-w-xl mx-auto text-center px-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to start bidding?</h2>
            <p className="text-gray-500 text-sm mb-6">Join 10,000+ users already buying and selling with the power of AI.</p>
            <div className="flex gap-3 justify-center">
              <Link to="/register" className="bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors">Sign Up Free</Link>
              <Link to="/auctions" className="border border-gray-300 text-gray-700 font-semibold px-6 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">Browse Auctions</Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════════
export const Login: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error, message, isAuthenticated } = useAppSelector(s => s.auth);
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [show, setShow] = useState(false);

  useEffect(() => { if (isAuthenticated) navigate("/"); }, [isAuthenticated]);
  useEffect(() => {
    if (error) {
      if (/verify your email/i.test(error)) {
        toast.error("Please verify your email to continue.");
        navigate(`/verify-email?email=${encodeURIComponent(email)}`);
      } else {
        toast.error(error);
      }
      dispatch(clearError());
    }
  }, [error]);
  useEffect(() => { if (message) { toast.success(message); dispatch(clearMessage()); } }, [message]);

  const submit = (e: React.FormEvent) => { e.preventDefault(); dispatch(login({ email, password })); };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 text-indigo-600 font-bold text-xl mb-2"><Gavel size={22}/> SmartAuction</div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
          <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} type="email" required placeholder="you@example.com"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input value={password} onChange={e=>setPassword(e.target.value)} type={show?"text":"password"} required placeholder="••••••••"
                className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"/>
              <button type="button" onClick={()=>setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {show?<EyeOff size={16}/>:<Eye size={16}/>}
              </button>
            </div>
          </div>
          <div className="text-right"><Link to="/forgot-password" className="text-xs text-indigo-600 hover:underline">Forgot password?</Link></div>
          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <><Spinner size="h-4 w-4"/><span>Signing in...</span></> : "Sign In"}
          </button>
        </form>

        <div className="flex items-center gap-3 py-4">
          <div className="flex-1 h-px bg-gray-200"/>
          <span className="text-xs text-gray-400">Or continue with</span>
          <div className="flex-1 h-px bg-gray-200"/>
        </div>
        <GoogleButton/>

        <p className="text-center text-sm text-gray-500 mt-5">Don't have an account? <Link to="/register" className="text-indigo-600 font-medium hover:underline">Sign up</Link></p>
        <p className="text-center text-xs text-gray-400 mt-2">Need to verify your email? <Link to="/verify-email" className="text-indigo-600 hover:underline">Verify now</Link></p>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// REGISTER
// ═══════════════════════════════════════════════════════════════════
export const Register: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error, message, isAuthenticated } = useAppSelector(s => s.auth);
  const [step, setStep] = useState<"form"|"otp">("form");
  const [savedEmail, setSavedEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [preview, setPreview] = useState<string|null>(null);
  const [form, setForm] = useState({ userName:"", email:"", password:"", phone:"", address:"", role:"Bidder", profileImage: null as File|null });

  // Google sign-up logs the person in immediately (no OTP step needed).
  useEffect(() => { if (isAuthenticated) navigate("/"); }, [isAuthenticated]);
  useEffect(() => { if (error) { toast.error(error); dispatch(clearError()); } }, [error]);
  useEffect(() => {
    if (message) {
      toast.success(message);
      dispatch(clearMessage());
      // Only the plain email/OTP flow needs to advance to the OTP step —
      // a successful Google sign-up/login lands here already authenticated.
      if (step === "form" && !isAuthenticated) { setSavedEmail(form.email); setStep("otp"); }
      // Google sign-up skips the profile form entirely, so phone/address/
      // profile photo are still empty on the new account — nudge the person
      // to fill them in.
      if (message.includes("Account created with Google")) {
        setTimeout(() => toast("Add a profile photo, phone number, and address to complete your profile.", { icon: "📝", duration: 6000 }), 400);
      }
    }
  }, [message]);

  const handleImg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) { setForm({...form, profileImage:f}); setPreview(URL.createObjectURL(f)); }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.profileImage) { toast.error("Profile image required."); return; }
    const d = new FormData(); Object.entries(form).forEach(([k,v]) => { if (v) d.append(k, v as any); });
    dispatch(register(d));
  };

  const handleOTP = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(verifyOTP({ email: savedEmail, otp }));
  };

  if (step === "otp") return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 w-full max-w-md text-center">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">📧</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Verify Your Email</h2>
        <p className="text-sm text-gray-500 mb-6">6-digit OTP sent to <strong>{savedEmail}</strong></p>
        <form onSubmit={handleOTP} className="space-y-4">
          <input value={otp} onChange={e=>setOtp(e.target.value)} maxLength={6} required placeholder="000000"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest font-bold outline-none focus:ring-2 focus:ring-indigo-500"/>
          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold disabled:opacity-60">
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>
        <button onClick={()=>dispatch(resendOTP({ email: savedEmail }))} className="mt-3 text-sm text-indigo-600 hover:underline">Resend OTP</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 text-indigo-600 font-bold text-xl mb-2"><Gavel size={22}/> SmartAuction</div>
          <h2 className="text-2xl font-bold text-gray-900">Create account</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">I want to</label>
            <div className="grid grid-cols-2 gap-3">
              {["Bidder","Auctioneer"].map(r=>(
                <button key={r} type="button" onClick={()=>setForm({...form,role:r})}
                  className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${form.role===r?"bg-indigo-600 text-white border-indigo-600":"border-gray-300 text-gray-600 hover:border-indigo-300"}`}>
                  {r==="Bidder"?"🛒 Buy & Bid":"🏷️ Sell & Auction"}
                </button>
              ))}
            </div>
          </div>

          <GoogleButton role={form.role as "Bidder"|"Auctioneer"}/>

          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-gray-200"/>
            <span className="text-xs text-gray-400">Or sign up with email</span>
            <div className="flex-1 h-px bg-gray-200"/>
          </div>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="flex justify-center">
            <label className="cursor-pointer">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 hover:border-indigo-400 flex items-center justify-center overflow-hidden transition-colors">
                {preview ? <img src={preview} className="w-full h-full object-cover" alt=""/> : <Upload size={20} className="text-gray-400"/>}
              </div>
              <input type="file" accept="image/*" onChange={handleImg} className="hidden"/>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[{k:"userName",l:"Username",p:"johndoe"},{k:"phone",l:"Phone",p:"10 digits"}].map(({k,l,p})=>(
              <div key={k}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{l}</label>
                <input value={(form as any)[k]} onChange={e=>setForm({...form,[k]:e.target.value})} required placeholder={p}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"/>
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} type="email" required placeholder="you@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
            <input value={form.password} onChange={e=>setForm({...form,password:e.target.value})} type="password" required placeholder="Min 8 characters"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
            <input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} required placeholder="Your address"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"/>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-60">
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-5">Already have an account? <Link to="/login" className="text-indigo-600 font-medium hover:underline">Sign in</Link></p>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// VERIFY EMAIL (standalone — for users who closed the browser before
// finishing the OTP step during signup, or whose OTP expired)
// ═══════════════════════════════════════════════════════════════════
export const VerifyEmail: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { loading, error, message, isAuthenticated } = useAppSelector(s => s.auth);
  const [email, setEmail] = useState(params.get("email") || "");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => { if (isAuthenticated) navigate("/"); }, [isAuthenticated]);
  useEffect(() => { if (error) { toast.error(error); dispatch(clearError()); } }, [error]);
  useEffect(() => {
    if (message) {
      toast.success(message);
      dispatch(clearMessage());
      if (message.toLowerCase().includes("verified")) navigate("/login");
    }
  }, [message]);
  useEffect(() => { if (cooldown <= 0) return; const t = setTimeout(() => setCooldown(c => c - 1), 1000); return () => clearTimeout(t); }, [cooldown]);

  const handleResend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error("Enter your email first."); return; }
    dispatch(resendOTP({ email: email.trim() }));
    setSent(true); setCooldown(30);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(verifyOTP({ email: email.trim(), otp }));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 w-full max-w-md text-center">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">📧</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Verify Your Email</h2>
        <p className="text-sm text-gray-500 mb-6">Enter your account email to request an OTP, then confirm it below.</p>
        <form onSubmit={sent ? handleVerify : handleResend} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} type="email" required placeholder="you@example.com"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"/>
          </div>
          {sent && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">OTP</label>
              <input value={otp} onChange={e=>setOtp(e.target.value)} maxLength={6} required placeholder="000000"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest font-bold outline-none focus:ring-2 focus:ring-indigo-500"/>
            </div>
          )}
          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-60">
            {loading ? "Please wait..." : sent ? "Verify OTP" : "Send OTP"}
          </button>
        </form>
        {sent && (
          <button onClick={handleResend} disabled={cooldown > 0} className="mt-3 text-sm text-indigo-600 hover:underline disabled:text-gray-400 disabled:no-underline">
            {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
          </button>
        )}
        <p className="text-center text-sm text-gray-500 mt-5"><Link to="/login" className="text-indigo-600 font-medium hover:underline">Back to login</Link></p>
      </div>
    </div>
  );
};
export const ForgotPassword: React.FC = () => {
  const dispatch = useAppDispatch();
  const { loading, error, message } = useAppSelector(s => s.auth);
  const [step, setStep] = useState<"email"|"reset">("email");
  const [email, setEmail] = useState(""); const [otp, setOtp] = useState(""); const [pw, setPw] = useState("");
  const navigate = useNavigate();

  useEffect(() => { if (error) { toast.error(error); dispatch(clearError()); } }, [error]);
  useEffect(() => { if (message && step==="email") { toast.success(message); dispatch(clearMessage()); setStep("reset"); }
    if (message && step==="reset") { toast.success(message); dispatch(clearMessage()); navigate("/login"); } }, [message, step]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h2>
        <p className="text-sm text-gray-500 mb-6">{step==="email" ? "Enter your email to receive an OTP." : "Enter the OTP and your new password."}</p>
        {step === "email" ? (
          <form onSubmit={e=>{e.preventDefault();dispatch(forgotPassword({email}));}} className="space-y-4">
            <input value={email} onChange={e=>setEmail(e.target.value)} type="email" required placeholder="you@example.com"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"/>
            <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold disabled:opacity-60">
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={e=>{e.preventDefault();dispatch(resetPassword({email,otp,newPassword:pw}));}} className="space-y-4">
            <input value={otp} onChange={e=>setOtp(e.target.value)} maxLength={6} required placeholder="6-digit OTP"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-center tracking-widest font-bold outline-none focus:ring-2 focus:ring-indigo-500"/>
            <input value={pw} onChange={e=>setPw(e.target.value)} type="password" required placeholder="New password (8+ chars)"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"/>
            <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold disabled:opacity-60">
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}
        <p className="text-center text-sm text-gray-500 mt-4"><Link to="/login" className="text-indigo-600 hover:underline">Back to Login</Link></p>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// AUCTIONS LIST
// ═══════════════════════════════════════════════════════════════════
const CATS = ["All","Electronics","Fashion","Furniture","Home & Garden","Music","Art","Collectibles","Sports","Books","Jewelry","Vehicles","Other"];
const CAT_ICONS: Record<string, React.ReactNode> = {
  "All": <LayoutGrid size={15}/>, "Electronics": <Smartphone size={15}/>, "Fashion": <Shirt size={15}/>,
  "Furniture": <Sofa size={15}/>, "Home & Garden": <HomeIcon size={15}/>, "Music": <Music2 size={15}/>,
  "Art": <Palette size={15}/>, "Collectibles": <Tag size={15}/>, "Sports": <Dumbbell size={15}/>,
  "Books": <BookOpen size={15}/>, "Jewelry": <Gem size={15}/>, "Vehicles": <Car size={15}/>, "Other": <MoreHorizontal size={15}/>,
};
const PRICE_RANGES = [
  { label: "Under ₹5,000", min: "", max: "5000" },
  { label: "₹5,000 – ₹10,000", min: "5000", max: "10000" },
  { label: "₹10,000 – ₹25,000", min: "10000", max: "25000" },
  { label: "₹25,000 – ₹50,000", min: "25000", max: "50000" },
  { label: "Above ₹50,000", min: "50000", max: "" },
];
const SORT_LABELS: Record<string, string> = { newest: "Newest First", "ending-soon": "Ending Soon", "price-low": "Price: Low to High", "price-high": "Price: High to Low" };

export const AuctionsList: React.FC = () => {
  const dispatch = useAppDispatch();
  const { auctions, loading, categoryCounts } = useAppSelector(s => s.auction);
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get("search")||"");
  const [category, setCategory] = useState(params.get("category")||"All");
  const [status, setStatus] = useState<string[]>([]);
  const [min, setMin] = useState(""); const [max, setMax] = useState("");
  const [sort, setSort] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

  // Status is filtered client-side (not sent to the API) so the tab/checkbox
  // counts (All / Live / Upcoming / Ended) always reflect the true totals for
  // the current search + category + price filters, independent of which
  // status is currently selected.
  useEffect(() => {
    const q: any = { sort };
    if (search) q.search = search;
    if (category !== "All") q.category = category;
    if (min) q.minPrice = min;
    if (max) q.maxPrice = max;
    dispatch(fetchAuctions(q));
  }, [search, category, min, max, sort, dispatch]);

  useEffect(() => {
    const q: any = {};
    if (search) q.search = search;
    dispatch(fetchCategoryCounts(q));
  }, [search, dispatch]);

  const catCounts: Record<string, number> = categoryCounts;
  const counts = {
    all: auctions.length,
    live: auctions.filter(isLiveAuction).length,
    upcoming: auctions.filter(isUpcomingAuction).length,
    ended: auctions.filter(isEndedAuction).length,
  };
  const visibleAuctions = status.length === 0 ? auctions : auctions.filter((a: any) =>
    (status.includes("live") && isLiveAuction(a)) || (status.includes("upcoming") && isUpcomingAuction(a)) || (status.includes("ended") && isEndedAuction(a))
  );

  const STATUS_TABS: { key: string; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "live", label: "Live", count: counts.live },
    { key: "upcoming", label: "Upcoming", count: counts.upcoming },
    { key: "ended", label: "Ended", count: counts.ended },
  ];

  const clearAll = () => { setSearch(""); setCategory("All"); setStatus([]); setMin(""); setMax(""); setSort("newest"); };
  const priceLabel = (min || max) ? `₹${min || "0"} - ₹${max || "∞"}` : "All";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Status tabs + Clear All */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {STATUS_TABS.map(t => {
          const active = t.key === "all" ? status.length === 0 : status.length === 1 && status[0] === t.key;
          return (
            <button key={t.key} onClick={() => setStatus(t.key === "all" ? [] : [t.key])}
              className={`text-sm font-medium px-4 py-1.5 rounded-full border transition-colors ${active ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-gray-300 text-gray-600 hover:border-indigo-300 hover:text-indigo-600"}`}>
              {t.label} ({t.count})
            </button>
          );
        })}
        <button onClick={clearAll} className="text-sm text-indigo-600 font-medium hover:underline px-2">Clear All</button>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search auctions, items or categories..."
            className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"/>
          <SlidersHorizontal size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
        </div>
        <div className="relative flex-shrink-0">
          <select value={sort} onChange={e=>setSort(e.target.value)}
            className="appearance-none w-full sm:w-auto border border-gray-300 rounded-xl pl-4 pr-9 py-2.5 text-sm text-gray-700 bg-white outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
            {Object.entries(SORT_LABELS).map(([k,l]) => <option key={k} value={k}>Sort by: {l}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
        </div>
        <button onClick={()=>setShowFilters(!showFilters)} className="md:hidden flex items-center justify-center gap-2 text-sm text-gray-600 border border-gray-300 px-3 py-2.5 rounded-xl">
          <SlidersHorizontal size={15}/> Filters
        </button>
      </div>

      {/* Active filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <FilterChip label={category === "All" ? "All Categories" : category} onClear={() => setCategory("All")}/>
        <FilterChip label={status.length ? status.map(s => s[0].toUpperCase()+s.slice(1)).join(", ") : "Status: All"} onClear={() => setStatus([])}/>
        <FilterChip label={`Price: ${priceLabel}`} onClear={() => { setMin(""); setMax(""); }}/>
        <FilterChip label={SORT_LABELS[sort]} onClear={() => setSort("newest")}/>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className={`${showFilters?"block":"hidden"} md:block w-64 flex-shrink-0 space-y-6`}>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="font-semibold text-gray-700 text-sm mb-3">Categories</h3>
            <div className="space-y-0.5">
              {CATS.map(c=>(
                <button key={c} onClick={()=>setCategory(c)}
                  className={`w-full text-left text-sm px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between ${category===c?"text-indigo-600 bg-indigo-50 font-medium":"text-gray-600 hover:bg-gray-50"}`}>
                  <span className="flex items-center gap-2">{CAT_ICONS[c]}{c}</span>
                  <span className="text-gray-400 text-xs">{catCounts[c]||0}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="font-semibold text-gray-700 text-sm mb-3">Price Range</h3>
            <div className="space-y-2 mb-3">
              {PRICE_RANGES.map(r => (
                <label key={r.label} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="radio" name="priceRange" checked={min===r.min && max===r.max} onChange={()=>{setMin(r.min); setMax(r.max);}}
                    className="text-indigo-600 border-gray-300 focus:ring-indigo-500"/>
                  {r.label}
                </label>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input value={min} onChange={e=>setMin(e.target.value)} type="number" placeholder="Min" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"/>
              <span className="text-gray-400 text-xs flex-shrink-0">to</span>
              <input value={max} onChange={e=>setMax(e.target.value)} type="number" placeholder="Max" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"/>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="font-semibold text-gray-700 text-sm mb-3">Status</h3>
            <div className="space-y-2.5">
              {[["live","Live Auctions","bg-green-500", counts.live],["upcoming","Upcoming","bg-amber-500", counts.upcoming],["ended","Ended","bg-gray-500", counts.ended]].map(([v,l,dot,c]: any)=>(
                <label key={v} className="flex items-center justify-between text-sm text-gray-600 cursor-pointer">
                  <span className="flex items-center gap-2">
                    <input type="checkbox" checked={status.includes(v)} onChange={()=>setStatus(p=>p.includes(v)?p.filter(x=>x!==v):[...p,v])}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/>
                    <span className={`w-2 h-2 rounded-full ${dot}`}/>
                    {l}
                  </span>
                  <span className="text-gray-400 text-xs">{c}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="font-semibold text-gray-700 text-sm mb-3">Sort By</h3>
            <select value={sort} onChange={e=>setSort(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500 bg-white">
              {Object.entries(SORT_LABELS).map(([k,l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>

          <button onClick={clearAll} className="w-full flex items-center justify-center gap-2 text-sm font-medium text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 rounded-xl py-2.5 transition-colors">
            <Trash2 size={15}/> Clear Filters
          </button>
        </aside>

        {/* Grid */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({length:6}).map((_,i)=>(
                <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-100"/><div className="p-4 space-y-2"><div className="h-4 bg-gray-100 rounded w-3/4"/><div className="h-3 bg-gray-100 rounded w-1/2"/></div>
                </div>
              ))}
            </div>
          ) : visibleAuctions.length === 0 ? (
            <EmptyState title="No auctions found" desc="Try adjusting your filters" icon={<Search size={48}/>} action={{label:"Browse All",to:"/auctions"}}/>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibleAuctions.map((a: any)=><AuctionCardFull key={a._id} auction={a} viewCount={Math.floor(Math.random()*200)+20}/>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// AUCTION DETAIL
// ═══════════════════════════════════════════════════════════════════
export const AuctionDetail: React.FC = () => {
  const { id } = useParams<{id:string}>();
  const dispatch = useAppDispatch();
  const { auctionDetail: auction, bids, loading } = useAppSelector(s => s.auction);
  const { user, isAuthenticated } = useAppSelector(s => s.auth);
  const { loading: bidLoading, error: bidError, message: bidMsg } = useAppSelector(s => s.bid);

  const [bidAmt, setBidAmt] = useState("");
  const [tab, setTab] = useState<"description"|"shipping"|"seller"|"qa">("description");
  const [showAllBids, setShowAllBids] = useState(false);
  const [watchers, setWatchers] = useState(0);
  const [questionInput, setQuestionInput] = useState("");
  const [answerIdx, setAnswerIdx] = useState<number|null>(null);
  const [answerInput, setAnswerInput] = useState("");

  const { send, watcherCount } = useAuctionSocket(id, user?._id);
  const endTime = auction?.endTime;
  const cd = useCountdown(endTime);
  const hasStarted = !auction || new Date(auction.startTime) <= new Date();
  const isLastMin = hasStarted && !cd.isExpired && cd.totalSeconds <= 180;

  useEffect(() => { if (id) { dispatch(fetchAuction(id)); } return () => { dispatch(resetDetail()); }; }, [id, dispatch]);
  useEffect(() => { if (auction) setBidAmt(String((auction.currentBid || auction.startingBid) + 1)); }, [auction?.currentBid, auction?.startingBid]);
  useEffect(() => { if (bidError) { toast.error(bidError); dispatch(clearBidError()); } }, [bidError]);
  useEffect(() => { if (bidMsg) { toast.success(bidMsg); dispatch(clearBidMessage()); if (id) dispatch(fetchAuction(id)); } }, [bidMsg]);

  if (loading && !auction) return <PageLoader/>;
  if (!auction) return <div className="min-h-screen flex items-center justify-center"><EmptyState title="Auction not found" action={{label:"Browse Auctions",to:"/auctions"}}/></div>;

  const isActive = auction.status === "active" && !cd.isExpired && new Date(auction.startTime) <= new Date();
  const isOwner = user?._id === (typeof auction.createdBy==="object" ? (auction.createdBy as any)?._id : auction.createdBy);
  const isBidder = user?.role === "Bidder";
  const minBid = (auction.currentBid || auction.startingBid) + 1;
  const inWishlist = user?.wishlist?.includes(auction._id);
  const seller = typeof auction.createdBy === "object" ? auction.createdBy as any : null;
  const winnerObj = typeof auction.winner === "object" ? auction.winner as any : null;
  const winnerId = winnerObj?._id || (typeof auction.winner === "string" ? auction.winner : null);
  const isWinner = !!user && !!winnerId && String(user._id) === String(winnerId);
  const displayedBids = showAllBids ? bids : bids.slice(0, 5);

  const handleBid = async () => {
    if (!isAuthenticated) { toast.error("Please login to bid."); return; }
    if (!isBidder) { toast.error("Only bidders can place bids."); return; }
    const amt = Number(bidAmt);
    if (!amt || amt < minBid) { toast.error(`Minimum bid is ₹${minBid}`); return; }
    dispatch(placeBid({ id: id!, amount: amt }));
  };

  const handleQuestion = async () => {
    if (!questionInput.trim()) return;
    dispatch(submitQuestion({ id: id!, question: questionInput }));
    setQuestionInput("");
    toast.success("Question submitted!");
  };

  const handleAnswer = (idx: number) => {
    if (!answerInput.trim()) return;
    dispatch(submitAnswer({ id: id!, questionIndex: idx, answer: answerInput }));
    setAnswerInput(""); setAnswerIdx(null);
    toast.success("Answer posted!");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Link to="/auctions" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 mb-6 transition-colors">← Back to Auctions</Link>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Image */}
        <div>
          <div className="relative rounded-2xl overflow-hidden bg-gray-100">
            {isActive && <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full z-10"><span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"/>Live Auction</div>}
            <img src={auction.image?.url} alt={auction.title} className="w-full aspect-square object-cover"/>
          </div>
        </div>

        {/* Bid panel */}
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{auction.title}</h1>
            {seller && (
              <div className="flex items-center gap-2 mt-2">
                <img src={seller.profileImage?.url} alt="" className="w-6 h-6 rounded-full object-cover"/>
                <span className="text-sm text-gray-600">{seller.userName}</span>
                <span className="text-xs text-gray-400">Seller</span>
              </div>
            )}
          </div>

          <hr className="border-gray-100"/>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Current Bid</p>
              <p className="text-3xl font-bold text-gray-900">₹{(auction.currentBid || auction.startingBid).toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-0.5">{bids.length} bid{bids.length!==1?"s":""}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">{!hasStarted ? "Starts In" : "Time Remaining"}</p>
              <div className={`flex items-center gap-1.5 ${isLastMin&&isActive?"text-red-500":!hasStarted?"text-amber-600":"text-gray-800"}`}>
                <Clock size={16}/>
                <span className={`text-xl font-bold ${isLastMin&&isActive?"animate-pulse":""}`}>
                  {!hasStarted ? new Date(auction.startTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : auction.status!=="active" ? "Ended" : cd.isExpired ? "Ended" : fmtCountdown(cd)}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Ends {new Date(endTime!).toLocaleString()}</p>
              {watcherCount > 0 && <p className="text-xs text-gray-400 flex items-center gap-1 mt-1"><Eye size={11}/> {watcherCount} watching</p>}
            </div>
          </div>

          {/* Winner announcement */}
          {auction.status !== "active" && winnerObj && (
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">🏆 Winner: {winnerObj.userName}</p>
              <p className="text-xs text-amber-700 mt-0.5">Final bid: ₹{(auction.finalBidAmount || auction.currentBid).toLocaleString()}</p>
            </div>
          )}

          {/* AI Prediction */}
          {auction.aiPricePrediction && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-600"/>
              <div>
                <p className="text-xs text-indigo-600 font-semibold">AI Price Prediction</p>
                <p className="text-sm text-indigo-700 font-bold">₹{auction.aiPricePrediction.toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* Bid input */}
          {isActive && !isOwner && isBidder && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Bid Amount</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                  <input type="number" value={bidAmt} onChange={e=>setBidAmt(e.target.value)} min={minBid}
                    className="w-full pl-7 pr-3 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"/>
                </div>
                <button onClick={handleBid} disabled={bidLoading} className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center gap-2">
                  {bidLoading ? <Spinner size="h-4 w-4"/> : null} Place Bid
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Minimum bid: ₹{minBid.toLocaleString()}</p>
              {isLastMin && <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 flex items-center gap-1.5"><AlertCircle size={12}/> Last {cd.minutes}m {cd.seconds}s! Bidding now may extend the auction by 3 minutes.</div>}
            </div>
          )}

          {!isAuthenticated && isActive && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
              <p className="text-sm text-indigo-700 font-medium">Login to place a bid</p>
              <Link to="/login" className="mt-2 inline-block bg-indigo-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-indigo-700">Login</Link>
            </div>
          )}

          <div className="flex items-center gap-4">
            <button onClick={()=>{ if(!isAuthenticated){toast.error("Login to wishlist.");return;} dispatch(toggleWishlist(auction._id)); }}
              className={`flex items-center gap-1.5 text-sm transition-colors ${inWishlist?"text-red-500":"text-gray-600 hover:text-red-400"}`}>
              <Heart size={16} fill={inWishlist?"currentColor":"none"}/> {inWishlist?"In Wishlist":"Add to Wishlist"}
            </button>
            <button onClick={()=>setTab("qa")} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-indigo-600 transition-colors">
              <MessageCircle size={16}/> Ask a Question
            </button>
            <span className="ml-auto text-xs text-gray-400 flex items-center gap-1"><Eye size={12}/> {bids.length*24+50} views</span>
          </div>

          {/* Winner-only payment actions */}
          {isWinner && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-indigo-800 mb-3">🎉 You won this auction! Complete your payment to receive the item.</p>
              <div className="flex flex-wrap gap-2">
                <Link to="/my-orders" className="bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors">💳 Pay Now</Link>
                <Link to="/my-orders" className="border border-indigo-300 text-indigo-700 text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-indigo-100 transition-colors">Go to My Orders</Link>
              </div>
            </div>
          )}

          <hr className="border-gray-100"/>

          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[["Category",auction.category],["Condition",auction.condition],["Starting Bid",`₹${auction.startingBid?.toLocaleString()}`],["Status",auction.status]].map(([l,v])=>(
                <div key={l}><p className="text-gray-400 text-xs mb-0.5">{l}</p><p className="text-gray-700 font-medium capitalize">{v}</p></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {(["description","shipping","seller","qa"] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab===t?"border-indigo-600 text-indigo-600":"border-transparent text-gray-500 hover:text-gray-700"}`}>
              {t==="qa"?`Q&A (${auction.questions?.length||0})`:t==="shipping"?"Shipping & Returns":t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
        <div className="p-6">
          {tab==="description" && (
            <div className="space-y-4">
              <p className="text-gray-700 leading-relaxed">{auction.description}</p>
              {auction.aiDescription && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                  <h4 className="font-semibold text-indigo-700 flex items-center gap-2 mb-2"><Sparkles size={14}/> AI-Enhanced Description</h4>
                  <p className="text-gray-700 text-sm leading-relaxed">{auction.aiDescription}</p>
                </div>
              )}
            </div>
          )}
          {tab==="shipping" && (
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Items shipped within 3-5 business days after payment confirmation.</p>
              <p>• Tracking information provided via email once shipped.</p>
              <p>• Returns accepted within 7 days if item differs significantly from description.</p>
              <p>• Buyer is responsible for return shipping costs.</p>
            </div>
          )}
          {tab==="seller" && seller && (
            <div className="flex items-center gap-4">
              <img src={seller.profileImage?.url} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-gray-100"/>
              <div>
                <p className="font-semibold text-gray-800">{seller.userName}</p>
                <p className="text-sm text-gray-500">Verified Auctioneer</p>
                <Link to={`/user/${seller._id}`} className="text-xs text-indigo-600 hover:underline mt-0.5 block">View Profile</Link>
              </div>
            </div>
          )}
          {tab==="qa" && (
            <div className="space-y-4">
              {isAuthenticated && !isOwner && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2 text-sm">Ask the seller</h4>
                  <div className="flex gap-2">
                    <input value={questionInput} onChange={e=>setQuestionInput(e.target.value)} placeholder="Your question..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"/>
                    <button onClick={handleQuestion} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">Ask</button>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {!auction.questions?.length ? (
                  <p className="text-gray-400 text-sm text-center py-4">No questions yet. Be the first to ask!</p>
                ) : auction.questions.map((q, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <User size={14} className="text-gray-400 mt-0.5 flex-shrink-0"/>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{q.userName}</p>
                        <p className="text-sm text-gray-600">{q.question}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(q.askedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {q.answer ? (
                      <div className="ml-5 pl-3 border-l-2 border-indigo-200">
                        <p className="text-xs text-indigo-600 font-semibold mb-0.5">Seller's answer</p>
                        <p className="text-sm text-gray-700">{q.answer}</p>
                      </div>
                    ) : isOwner && (
                      answerIdx === i ? (
                        <div className="ml-5 flex gap-2 mt-2">
                          <input value={answerInput} onChange={e=>setAnswerInput(e.target.value)} placeholder="Your answer..."
                            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500"/>
                          <button onClick={()=>handleAnswer(i)} className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700">Post</button>
                          <button onClick={()=>setAnswerIdx(null)} className="px-3 py-1.5 text-gray-500 text-xs rounded-lg border border-gray-200"><X size={12}/></button>
                        </div>
                      ) : (
                        <button onClick={()=>setAnswerIdx(i)} className="ml-5 mt-1 text-xs text-indigo-600 hover:underline">Answer this question</button>
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bid History */}
      {bids.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Bid History</h3>
            <span className="text-xs text-gray-400">{bids.length} total bids</span>
          </div>
          <div className="divide-y divide-gray-50">
            {displayedBids.map((b, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    {b.profileImage ? <img src={b.profileImage} alt="" className="w-8 h-8 rounded-full object-cover"/> : <User size={14} className="text-indigo-600"/>}
                  </div>
                  <p className="text-sm font-medium text-gray-800">{b.userName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">₹{b.amount.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">{b.timestamp ? new Date(b.timestamp).toLocaleString() : ""}</p>
                </div>
              </div>
            ))}
          </div>
          {bids.length > 5 && (
            <button onClick={()=>setShowAllBids(!showAllBids)} className="w-full py-3 text-sm text-indigo-600 hover:bg-indigo-50 flex items-center justify-center gap-1 transition-colors">
              {showAllBids ? <><ChevronUp size={14}/> Show less</> : <><ChevronDown size={14}/> Show all {bids.length} bids</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
