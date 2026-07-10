import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Gavel, Bell, ChevronDown, Menu, X, Search, LogOut, User, LayoutDashboard, Package, ShoppingBag, Heart, Plus } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/store";
import { logout } from "../../store/slices";
import { fetchNotifications, markAllSeen, deleteNotif } from "../../store/slices";
import { useGlobalSocket } from "../../hooks/index";
import toast from "react-hot-toast";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, authChecked } = useAppSelector(s => s.auth);
  const { notifications, unread } = useAppSelector(s => s.notif);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useGlobalSocket(user?._id);

  useEffect(() => {
    if (isAuthenticated)
      dispatch(fetchNotifications(undefined));
  }, [isAuthenticated, dispatch]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const handleLogout = async () => {
    await dispatch(logout(undefined));
    setUserOpen(false);
    navigate("/");
    toast.success("Logged out successfully.");
  };

  const handleNotifOpen = () => {
    setNotifOpen(v => !v);
    if (!notifOpen && unread > 0) dispatch(markAllSeen(undefined));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQ.trim()) { navigate(`/auctions?search=${encodeURIComponent(searchQ.trim())}`); setSearchQ(""); }
  };

  const nav = [
    { to: "/", label: "Home" },
    { to: "/auctions", label: "Auctions" },
    { to: "/how-it-works", label: "How It Works" },
  ];

  const isActive = (p: string) => location.pathname === p;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 font-bold text-xl text-indigo-600 flex-shrink-0">
              <Gavel size={22} /> SmartAuction
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-6">
              {nav.map(n => (
                <Link key={n.to} to={n.to}
                  className={`text-sm font-medium pb-0.5 transition-colors ${isActive(n.to) ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-600 hover:text-indigo-600"}`}>
                  {n.label}
                </Link>
              ))}
              {user?.role === "Super Admin" && (
                <Link to="/admin" className={`text-sm font-medium ${isActive("/admin") ? "text-indigo-600" : "text-gray-600 hover:text-indigo-600"}`}>Admin</Link>
              )}
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="hidden md:flex items-center">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-gray-100 text-sm rounded-lg border-0 outline-none focus:ring-2 focus:ring-indigo-300 w-52 placeholder:text-gray-400"
                  placeholder="Search auctions..." />
              </div>
            </form>

            {/* Right */}
            <div className="flex items-center gap-2">
              {isAuthenticated && user ? (
                <>
                  {/* Notifications */}
                  <div ref={notifRef} className="relative">
                    <button onClick={handleNotifOpen}
                      className="relative p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                      <Bell size={20} />
                      {unread > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[17px] h-[17px] flex items-center justify-center px-0.5">
                          {unread > 9 ? "9+" : unread}
                        </span>
                      )}
                    </button>
                    {notifOpen && (
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                          <h3 className="font-semibold text-gray-800 text-sm">Notifications</h3>
                          <button onClick={() => setNotifOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={15} /></button>
                        </div>
                        <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                          {notifications.length === 0
                            ? <p className="text-center text-gray-400 py-8 text-sm">All caught up! 🎉</p>
                            : notifications.map(n => (
                              <div key={n._id} className={`flex gap-2 px-4 py-3 group ${!n.seen ? "bg-indigo-50/40" : ""}`}>
                                <div className="flex-1 min-w-0">
                                  {n.link ? (
                                    <Link to={n.link} onClick={() => setNotifOpen(false)}
                                      className="text-sm text-gray-800 hover:text-indigo-600 leading-snug block">{n.message}</Link>
                                  ) : (
                                    <p className="text-sm text-gray-700 leading-snug">{n.message}</p>
                                  )}
                                  <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                                </div>
                                <button onClick={() => dispatch(deleteNotif(n._id))}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-400 transition-all flex-shrink-0">
                                  <X size={12} />
                                </button>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    )}
                  </div>

                  {/* User menu */}
                  <div ref={userRef} className="relative">
                    <button onClick={() => setUserOpen(v => !v)}
                      className="flex items-center gap-1.5 p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                      <img src={user.profileImage?.url || "https://via.placeholder.com/32"} alt={user.userName}
                        className="w-8 h-8 rounded-full object-cover border-2 border-indigo-100" />
                      <ChevronDown size={13} className="text-gray-500" />
                    </button>
                    {userOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="font-semibold text-gray-800 text-sm truncate">{user.userName}</p>
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                          <span className="inline-block mt-1 text-xs bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5">{user.role}</span>
                        </div>
                        <div className="py-1">
                          <Link to="/profile" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"><User size={14} /> Profile</Link>
                          {user.role === "Bidder" && <>
                            <Link to="/my-orders" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"><ShoppingBag size={14} /> My Orders</Link>
                            <Link to="/wishlist" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"><Heart size={14} /> Wishlist</Link>
                          </>}
                          {user.role === "Auctioneer" && <>
                            <Link to="/my-auctions" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"><Package size={14} /> My Auctions</Link>
                            <Link to="/create-auction" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"><Plus size={14} /> Create Auction</Link>
                            <Link to="/my-sales" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"><ShoppingBag size={14} /> My Sales</Link>
                          </>}
                          {user.role === "Super Admin" && (
                            <Link to="/admin" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"><LayoutDashboard size={14} /> Admin Dashboard</Link>
                          )}
                          <hr className="my-1 border-gray-100" />
                          <button onClick={handleLogout} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"><LogOut size={14} /> Sign out</button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : !authChecked ? (
                <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login" className="text-sm text-gray-600 hover:text-indigo-600 font-medium px-3 py-1.5">Login</Link>
                  <Link to="/register" className="text-sm bg-indigo-600 text-white font-medium px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors">Sign Up</Link>
                </div>
              )}
              <button className="md:hidden p-2 text-gray-600" onClick={() => setMobileOpen(v => !v)}>
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
            <form onSubmit={handleSearch} className="flex gap-2 mb-3">
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-100 text-sm rounded-lg outline-none" placeholder="Search auctions..." />
              <button type="submit" className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg"><Search size={15} /></button>
            </form>
            {nav.map(n => (
              <Link key={n.to} to={n.to} onClick={() => setMobileOpen(false)}
                className={`block py-2 text-sm font-medium ${isActive(n.to) ? "text-indigo-600" : "text-gray-700"}`}>{n.label}</Link>
            ))}
            {user?.role === "Super Admin" && <Link to="/admin" onClick={() => setMobileOpen(false)} className="block py-2 text-sm text-gray-700">Admin</Link>}
          </div>
        )}
      </nav>

      {/* Main */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 font-bold text-xl mb-3"><Gavel size={22} className="text-indigo-400" /> SmartAuction</div>
              <p className="text-gray-400 text-sm leading-relaxed">AI-powered online auction platform bringing intelligence to every bid.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-gray-200 text-sm">Quick Links</h4>
              <div className="space-y-2">
                {[{ to: "/", l: "Home" }, { to: "/auctions", l: "Auctions" }, { to: "/how-it-works", l: "How It Works" }, { to: "/leaderboard", l: "Leaderboard" }].map(({ to, l }) => (
                  <Link key={to} to={to} className="block text-sm text-gray-400 hover:text-white transition-colors">{l}</Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-gray-200 text-sm">Categories</h4>
              <div className="space-y-2">
                {["Electronics", "Fashion", "Furniture", "Art", "Collectibles", "Jewelry"].map(c => (
                  <Link key={c} to={`/auctions?category=${c}`} className="block text-sm text-gray-400 hover:text-white transition-colors">{c}</Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-gray-200 text-sm">Contact</h4>
              <div className="space-y-1.5 text-sm text-gray-400">
                <p>123 Auction Street, Suite 100</p>
                <p>San Francisco, CA 94103</p>
                <p>(555) 123-4567</p>
                <p>info@smartauction.com</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
            <p>© {new Date().getFullYear()} SmartAuction. All rights reserved.</p>
            <div className="flex gap-4">
              <Link to="/terms" className="hover:text-white">Terms</Link>
              <Link to="/privacy" className="hover:text-white">Privacy</Link>
              <Link to="/faq" className="hover:text-white">FAQ</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
