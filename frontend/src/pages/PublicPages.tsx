import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Gavel, Sparkles, TrendingUp, Shield, Zap, ArrowRight, CheckCircle, Eye, EyeOff, Upload, Clock, Search, Filter, SlidersHorizontal, MessageCircle, Heart, ChevronDown, ChevronUp, AlertCircle, User, X } from "lucide-react";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../store/store";
import { fetchAuctions, fetchAuction, resetDetail, wsUpdateBid, wsExtendTime } from "../store/slices";
import { login, register, verifyOTP, resendOTP, forgotPassword, resetPassword, clearError, clearMessage, toggleWishlist } from "../store/slices";
import { placeBid, clearBidError, clearBidMessage } from "../store/slices";
import { submitQuestion, submitAnswer } from "../store/slices";
import { useCountdown, fmtCountdown, useAuctionSocket } from "../hooks/index";
import AuctionCard, { StatusBadge, Spinner, EmptyState, PageLoader } from "../components/ui/index";

// ═══════════════════════════════════════════════════════════════════
// HOME PAGE
// ═══════════════════════════════════════════════════════════════════
export const Home: React.FC = () => {
  const dispatch = useAppDispatch();
  const { auctions } = useAppSelector(s => s.auction);
  useEffect(() => { dispatch(fetchAuctions({ limit: 6 })); }, [dispatch]);
  const featured = auctions.filter(a => a.status === "active" && new Date(a.startTime) <= new Date()).slice(0, 3);

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
      <section className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 bg-white/10 text-white/90 text-xs font-medium px-3 py-1.5 rounded-full mb-6 border border-white/20">
                <Sparkles size={12}/> AI Powered Auction Platform
              </span>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
                The Future of <span className="text-indigo-300">Online Auctions</span> is Here
              </h1>
              <p className="text-white/70 text-lg leading-relaxed mb-8">SmartAuction combines AI with real-time bidding for the most intelligent auction experience ever created.</p>
              <div className="flex flex-wrap gap-3">
                <Link to="/auctions" className="bg-white text-indigo-900 font-semibold px-6 py-3 rounded-xl hover:bg-indigo-50 transition-colors flex items-center gap-2">Browse Auctions <ArrowRight size={16}/></Link>
                <Link to="/register" className="border border-white/30 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition-colors">Sign Up Free</Link>
              </div>
              <div className="flex items-center gap-6 mt-8 text-sm text-white/60">
                <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-green-400"/> 10,000+ Users</span>
                <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-green-400"/> AI-Powered</span>
                <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-green-400"/> Secure</span>
              </div>
            </div>
            <div className="hidden lg:grid grid-cols-2 gap-3">
              {auctions.slice(0, 4).map(a => (
                <Link key={a._id} to={`/auction/item/${a._id}`} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl overflow-hidden hover:bg-white/20 transition-colors">
                  <img src={a.image?.url} alt={a.title} className="w-full h-28 object-cover"/>
                  <div className="p-2.5">
                    <p className="text-white text-xs font-semibold truncate">{a.title}</p>
                    <p className="text-indigo-300 text-xs mt-0.5">₹{(a.currentBid || a.startingBid).toLocaleString()}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-8">
              <div><h2 className="text-2xl font-bold text-gray-900">Featured Auctions</h2><p className="text-gray-500 text-sm mt-1">Live auctions with active bidding</p></div>
              <Link to="/auctions" className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium">View All <ArrowRight size={14}/></Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {featured.map(a => <AuctionCard key={a._id} auction={a} viewCount={Math.floor(Math.random()*200)+50} likeCount={Math.floor(Math.random()*30)+5}/>)}
            </div>
          </div>
        </section>
      )}

      {/* AI Features */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-indigo-600 text-xs font-semibold uppercase tracking-widest mb-3">Powered by AI</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Smart Technology for Smarter Auctions</h2>
          <p className="text-gray-500 mb-10 max-w-2xl mx-auto">Every aspect of the platform is enhanced by AI to maximize value for buyers and sellers.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-gray-200 text-left hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 mb-3">{f.icon}</div>
                <h3 className="font-semibold text-gray-800 mb-1.5">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-14 bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center mb-10">Experience the AI Difference</h2>
          <div className="grid grid-cols-3 gap-6 text-center">
            {[["92%","Accuracy in price predictions"],["38%","Higher engagement with AI descriptions"],["4.9/5","User satisfaction rating"]].map(([v,l])=>(
              <div key={v}><p className="text-4xl font-bold">{v}</p><p className="text-white/70 text-sm mt-2">{l}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
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
  useEffect(() => { if (error) { toast.error(error); dispatch(clearError()); } }, [error]);
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
        <p className="text-center text-sm text-gray-500 mt-5">Don't have an account? <Link to="/register" className="text-indigo-600 font-medium hover:underline">Sign up</Link></p>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// REGISTER
// ═══════════════════════════════════════════════════════════════════
export const Register: React.FC = () => {
  const dispatch = useAppDispatch();
  const { loading, error, message } = useAppSelector(s => s.auth);
  const [step, setStep] = useState<"form"|"otp">("form");
  const [savedEmail, setSavedEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [preview, setPreview] = useState<string|null>(null);
  const [form, setForm] = useState({ userName:"", email:"", password:"", phone:"", address:"", role:"Bidder", profileImage: null as File|null });

  useEffect(() => { if (error) { toast.error(error); dispatch(clearError()); } }, [error]);
  useEffect(() => { if (message && step === "form") { toast.success(message); dispatch(clearMessage()); setSavedEmail(form.email); setStep("otp"); } }, [message, step]);

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
// FORGOT PASSWORD
// ═══════════════════════════════════════════════════════════════════
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

export const AuctionsList: React.FC = () => {
  const dispatch = useAppDispatch();
  const { auctions, loading } = useAppSelector(s => s.auction);
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search")||"");
  const [category, setCategory] = useState(params.get("category")||"All");
  const [status, setStatus] = useState<string[]>([]);
  const [min, setMin] = useState(""); const [max, setMax] = useState("");
  const [sort, setSort] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const q: any = { sort };
    if (search) q.search = search;
    if (category !== "All") q.category = category;
    if (status.length === 1) q.status = status[0];
    if (min) q.minPrice = min;
    if (max) q.maxPrice = max;
    dispatch(fetchAuctions(q));
  }, [search, category, status, min, max, sort, dispatch]);

  const catCounts: Record<string, number> = { All: auctions.length };
  auctions.forEach(a => { catCounts[a.category] = (catCounts[a.category]||0)+1; });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Browse Auctions</h1>
        <button onClick={()=>setShowFilters(!showFilters)} className="md:hidden flex items-center gap-2 text-sm text-gray-600 border border-gray-300 px-3 py-1.5 rounded-lg">
          <SlidersHorizontal size={15}/> Filters
        </button>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className={`${showFilters?"block":"hidden"} md:block w-52 flex-shrink-0 space-y-6`}>
          <div>
            <h3 className="font-semibold text-gray-700 text-sm mb-3">Categories</h3>
            <div className="space-y-0.5">
              {CATS.map(c=>(
                <button key={c} onClick={()=>setCategory(c)}
                  className={`w-full text-left text-sm px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between ${category===c?"text-indigo-600 bg-indigo-50 font-medium":"text-gray-600 hover:bg-gray-50"}`}>
                  <span>{c}</span>
                  <span className="text-gray-400 text-xs">{catCounts[c]||0}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-700 text-sm mb-3">Price Range</h3>
            <div className="flex items-center gap-2">
              <input value={min} onChange={e=>setMin(e.target.value)} type="number" placeholder="Min" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"/>
              <span className="text-gray-400 text-xs flex-shrink-0">to</span>
              <input value={max} onChange={e=>setMax(e.target.value)} type="number" placeholder="Max" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"/>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-700 text-sm mb-3">Status</h3>
            <div className="space-y-2">
              {[["live","Live Auctions"],["upcoming","Upcoming"],["ended","Ended"]].map(([v,l])=>(
                <label key={v} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={status.includes(v)} onChange={()=>setStatus(p=>p.includes(v)?p.filter(x=>x!==v):[...p,v])}
                    className="rounded border-gray-300 text-indigo-600"/>
                  {l}
                </label>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-700 text-sm mb-3">Sort By</h3>
            <select value={sort} onChange={e=>setSort(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500 bg-white">
              <option value="newest">Newest First</option>
              <option value="ending-soon">Ending Soon</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </aside>

        {/* Grid */}
        <div className="flex-1 min-w-0">
          <div className="mb-4 flex items-center justify-between">
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-full"/>
            </div>
            <p className="text-sm text-gray-500 ml-4">{auctions.length} results</p>
          </div>
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({length:6}).map((_,i)=>(
                <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-100"/><div className="p-4 space-y-2"><div className="h-4 bg-gray-100 rounded w-3/4"/><div className="h-3 bg-gray-100 rounded w-1/2"/></div>
                </div>
              ))}
            </div>
          ) : auctions.length === 0 ? (
            <EmptyState title="No auctions found" desc="Try adjusting your filters" icon={<Search size={48}/>} action={{label:"Browse All",to:"/auctions"}}/>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {auctions.map(a=><AuctionCard key={a._id} auction={a} viewCount={Math.floor(Math.random()*200)+20} likeCount={Math.floor(Math.random()*50)+5}/>)}
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
  const isLastMin = !cd.isExpired && cd.totalSeconds <= 180;

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
              <p className="text-xs text-gray-400 mb-1">Time Remaining</p>
              <div className={`flex items-center gap-1.5 ${isLastMin&&isActive?"text-red-500":"text-gray-800"}`}>
                <Clock size={16}/>
                <span className={`text-xl font-bold ${isLastMin&&isActive?"animate-pulse":""}`}>
                  {auction.status!=="active" ? "Ended" : cd.isExpired ? "Ended" : fmtCountdown(cd)}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Ends {new Date(endTime!).toLocaleString()}</p>
              {watcherCount > 0 && <p className="text-xs text-gray-400 flex items-center gap-1 mt-1"><Eye size={11}/> {watcherCount} watching</p>}
            </div>
          </div>

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
