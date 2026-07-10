import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "./store/store";
import { fetchProfile } from "./store/slices";
import Layout from "./components/layout/Layout";
import Chatbot from "./components/chatbot/Chatbot";
import { ProtectedRoute, GuestRoute, PageLoader } from "./components/ui/index";

// Pages
import { Home, Login, Register, VerifyEmail, ForgotPassword, AuctionsList, AuctionDetail } from "./pages/PublicPages";
import { MyOrders, Wishlist, Profile } from "./pages/BidderPages";
import { MyAuctions, CreateAuction, MySales, CommissionProof } from "./pages/AuctioneerPages";
import AdminDashboard from "./pages/AdminDashboard";

// ── Static pages ───────────────────────────────────────────────────────────────
const HowItWorks: React.FC = () => (
  <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <h1 className="text-3xl font-bold text-gray-900 mb-4 text-center">How SmartAuction Works</h1>
    <p className="text-gray-500 text-center mb-12">Simple, secure, and powered by AI.</p>
    <div className="grid md:grid-cols-2 gap-6">
      {[
        {step:1,t:"Create an Account",d:"Register as Bidder or Auctioneer. Verify your email with a one-time OTP sent via Brevo."},
        {step:2,t:"Browse or List Items",d:"Bidders browse live auctions with AI price predictions. Auctioneers create listings and AI auto-enhances descriptions."},
        {step:3,t:"Real-Time Bidding",d:"Bids update instantly via WebSockets. Anti-snipe: last-minute bids extend auction by 3 minutes automatically."},
        {step:4,t:"Win & Pay",d:"Winners receive email notifications and pay via Razorpay within 24 hours. Non-payment triggers automatic relist."},
        {step:5,t:"Shipping & Delivery",d:"Auctioneers mark as shipped with courier + tracking ID. Buyers confirm delivery to release payout."},
        {step:6,t:"Automatic Payout",d:"After delivery confirmation, the auctioneer's payout (price minus 5% commission) is sent automatically to their UPI."},
      ].map(s=>(
        <div key={s.step} className="flex gap-4 p-5 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">{s.step}</div>
          <div><h3 className="font-semibold text-gray-800 mb-1">{s.t}</h3><p className="text-sm text-gray-500 leading-relaxed">{s.d}</p></div>
        </div>
      ))}
    </div>
  </div>
);

const Leaderboard: React.FC = () => {
  const [users, setUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  useEffect(()=>{
    import("./lib/axios").then(({default:api})=>api.get("/users/leaderboard").then(r=>setUsers(r.data.leaderboard||[])).finally(()=>setLoading(false)));
  },[]);
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">🏆 Leaderboard</h1>
      {loading ? <div className="flex justify-center py-10"><div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"/></div>
      : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50">
              {["#","Bidder","Won","Spent"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u,i)=>(
                <tr key={u._id} className={`hover:bg-gray-50/50 ${i<3?"bg-amber-50/30":""}`}>
                  <td className="px-4 py-3 font-bold text-gray-500">{i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <img src={u.profileImage?.url} alt="" className="w-7 h-7 rounded-full object-cover"/>
                      <span className="font-medium text-gray-800">{u.userName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-700">{u.auctionsWon}</td>
                  <td className="px-4 py-3 font-semibold text-gray-700">₹{u.moneySpent?.toLocaleString()}</td>
                </tr>
              ))}
              {users.length===0&&<tr><td colSpan={4} className="text-center py-10 text-gray-400">No data yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const NotFound: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <p className="text-6xl font-bold text-gray-200 mb-4">404</p>
      <p className="text-gray-500 text-lg mb-6">Page not found</p>
      <Link to="/" className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-colors">Go Home</Link>
    </div>
  </div>
);

// ── App ────────────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector(s => s.auth);

  useEffect(() => { dispatch(fetchProfile(undefined)); }, [dispatch]);

  return (
    <Router>
      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontSize:"14px", borderRadius:"10px" }, success: { iconTheme: { primary:"#6366f1", secondary:"#fff" } } }}/>
      <Routes>
        {/* Guest only */}
        <Route path="/login" element={<GuestRoute><Layout><Login/></Layout></GuestRoute>}/>
        <Route path="/register" element={<GuestRoute><Layout><Register/></Layout></GuestRoute>}/>
        <Route path="/verify-email" element={<GuestRoute><VerifyEmail/></GuestRoute>}/>
        <Route path="/forgot-password" element={<GuestRoute><ForgotPassword/></GuestRoute>}/>

        {/* Public with layout */}
        <Route path="/" element={<Layout><Home/></Layout>}/>
        <Route path="/auctions" element={<Layout><AuctionsList/></Layout>}/>
        <Route path="/auction/item/:id" element={<Layout><AuctionDetail/></Layout>}/>
        <Route path="/how-it-works" element={<Layout><HowItWorks/></Layout>}/>
        <Route path="/leaderboard" element={<Layout><Leaderboard/></Layout>}/>

        {/* Bidder */}
        <Route path="/my-orders" element={<ProtectedRoute roles={["Bidder"]}><Layout><MyOrders/></Layout></ProtectedRoute>}/>
        <Route path="/wishlist" element={<ProtectedRoute roles={["Bidder"]}><Layout><Wishlist/></Layout></ProtectedRoute>}/>

        {/* Auctioneer */}
        <Route path="/my-auctions" element={<ProtectedRoute roles={["Auctioneer"]}><Layout><MyAuctions/></Layout></ProtectedRoute>}/>
        <Route path="/create-auction" element={<ProtectedRoute roles={["Auctioneer"]}><Layout><CreateAuction/></Layout></ProtectedRoute>}/>
        <Route path="/my-sales" element={<ProtectedRoute roles={["Auctioneer"]}><Layout><MySales/></Layout></ProtectedRoute>}/>
        <Route path="/commission" element={<ProtectedRoute roles={["Auctioneer"]}><Layout><CommissionProof/></Layout></ProtectedRoute>}/>

        {/* Shared */}
        <Route path="/profile" element={<ProtectedRoute><Layout><Profile/></Layout></ProtectedRoute>}/>

        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute roles={["Super Admin"]}><Layout><AdminDashboard/></Layout></ProtectedRoute>}/>

        {/* Fallback */}
        <Route path="*" element={<Layout><NotFound/></Layout>}/>
      </Routes>

      {/* Floating chatbot - shown when authenticated */}
      {isAuthenticated && <Chatbot/>}
    </Router>
  );
};

export default App;
