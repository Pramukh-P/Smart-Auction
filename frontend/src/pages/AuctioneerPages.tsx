import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Package, Eye, Trash2, RefreshCw, Truck, CheckCircle, Upload, Sparkles, AlertCircle, Clock, DollarSign, X } from "lucide-react";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../store/store";
import { fetchMyAuctions, deleteAuction, republishAuction, clearAuctionError, clearAuctionMessage, createAuction } from "../store/slices";
import { fetchSalesOrders, shipOrder, clearOrderError, clearOrderMessage } from "../store/slices";
import { Spinner, EmptyState, OrderStatusBadge } from "../components/ui/index";
import { useCountdown, fmtCountdown } from "../hooks/index";
import { Auction, Order } from "../types";
import api from "../lib/axios";
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

const CATS = ["Electronics", "Fashion", "Furniture", "Home & Garden", "Music", "Art", "Collectibles", "Sports", "Books", "Jewelry", "Vehicles", "Other"];

// ─── AuctionRow ───────────────────────────────────────────────────────────────
const AuctionRow: React.FC<{ auction: Auction; onDelete: (id: string) => void; onRepublish: (a: Auction) => void }> = ({ auction, onDelete, onRepublish }) => {
  const cd = useCountdown(auction.endTime);
  const isLive = auction.status === "active" && new Date(auction.startTime) <= new Date();
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
      <img src={auction.image?.url} alt={auction.title} className="w-16 h-16 rounded-xl object-cover border border-gray-100 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link to={`/auction/item/${auction._id}`} className="font-semibold text-gray-800 hover:text-indigo-600 text-sm truncate block">{auction.title}</Link>
            <p className="text-xs text-gray-400">{auction.category} · {auction.condition}</p>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${isLive ? "bg-green-100 text-green-700" :
              auction.status === "active" ? "bg-amber-100 text-amber-700" :
                auction.status === "ended" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
            }`}>{isLive ? "Live" : auction.status}</span>
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          <span>Starting: ₹{auction.startingBid.toLocaleString()}</span>
          <span className="font-semibold text-gray-700">Current: ₹{(auction.currentBid || auction.startingBid).toLocaleString()}</span>
          <span>{auction.bids?.length || 0} bids</span>
          {auction.aiPricePrediction && <span className="flex items-center gap-0.5 text-indigo-500"><Sparkles size={9} /> ₹{auction.aiPricePrediction.toLocaleString()}</span>}
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
          <Clock size={11} />
          {auction.status !== "active" ? "Auction ended" : cd.isExpired ? "Ended" : isLive ? fmtCountdown(cd) : `Starts ${new Date(auction.startTime).toLocaleDateString()}`}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link to={`/auction/item/${auction._id}`} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Eye size={15} /></Link>
        {auction.status !== "active" && (
          <button onClick={() => onRepublish(auction)} className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Republish"><RefreshCw size={15} /></button>
        )}
        {(auction.bids?.length || 0) === 0 && (
          <button onClick={() => onDelete(auction._id)} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={15} /></button>
        )}
      </div>
    </div>
  );
};

// ─── My Auctions ──────────────────────────────────────────────────────────────
export const MyAuctions: React.FC = () => {
  const dispatch = useAppDispatch();
  const { myAuctions, loading, error, message } = useAppSelector(s => s.auction);
  const { user } = useAppSelector(s => s.auth);
  const [republishAuc, setRepublishAuc] = useState<Auction | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  useEffect(() => { dispatch(fetchMyAuctions(undefined)); }, [dispatch]);
  useEffect(() => { if (error) { toast.error(error); dispatch(clearAuctionError()); } }, [error]);
  useEffect(() => { if (message) { toast.success(message); dispatch(clearAuctionMessage()); dispatch(fetchMyAuctions(undefined)); setRepublishAuc(null); } }, [message]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this auction?")) return;
    dispatch(deleteAuction(id));
  };

  const handleRepublish = () => {
    if (!republishAuc || !startTime || !endTime) { toast.error("Start and end time required."); return; }
    dispatch(republishAuction({ id: republishAuc._id, data: { startTime, endTime } }));
  };

  const live = myAuctions.filter(a => a.status === "active" && new Date(a.startTime) <= new Date());
  const upcoming = myAuctions.filter(a => a.status === "active" && new Date(a.startTime) > new Date());
  const ended = myAuctions.filter(a => a.status === "ended" || a.status === "completed");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Package size={24} /> My Auctions</h1>
        <div className="flex items-center gap-3">
          <Link to="/commission" className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-gray-200 transition-colors"><DollarSign size={12} /> Commission</Link>
          <Link to="/create-auction" className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"><Plus size={16} /> Create Auction</Link>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-20"><Spinner size="h-10 w-10" /></div>
        : myAuctions.length === 0 ? <EmptyState title="No auctions yet" desc="Create your first auction to start selling" icon={<Package size={48} />} action={{ label: "Create Auction", to: "/create-auction" }} />
          : (
            <div className="space-y-6">
              {live.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">🔴 Live ({live.length})</h2>
                  <div className="space-y-3">{live.map(a => <AuctionRow key={a._id} auction={a} onDelete={handleDelete} onRepublish={setRepublishAuc} />)}</div>
                </div>
              )}
              {upcoming.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">🕐 Upcoming ({upcoming.length})</h2>
                  <div className="space-y-3">{upcoming.map(a => <AuctionRow key={a._id} auction={a} onDelete={handleDelete} onRepublish={setRepublishAuc} />)}</div>
                </div>
              )}
              {ended.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">⚫ Ended ({ended.length})</h2>
                  <div className="space-y-3">{ended.map(a => <AuctionRow key={a._id} auction={a} onDelete={handleDelete} onRepublish={setRepublishAuc} />)}</div>
                </div>
              )}
            </div>
          )}

      {/* Republish Modal */}
      {republishAuc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Republish Auction</h3>
              <button onClick={() => setRepublishAuc(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4">Set new times for <strong>{republishAuc.title}</strong></p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Time</label>
                <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End Time</label>
                <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <button onClick={handleRepublish} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-indigo-700">Republish Auction</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Create Auction ───────────────────────────────────────────────────────────
export const CreateAuction: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector(s => s.auth);
  const { loading, error, message } = useAppSelector(s => s.auction);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", category: "Electronics", condition: "Used", startingBid: "", startTime: "", endTime: "" });

  useEffect(() => { if (error) { toast.error(error); dispatch(clearAuctionError()); } }, [error]);
  useEffect(() => { if (message) { toast.success(message); dispatch(clearAuctionMessage()); navigate("/my-auctions"); } }, [message]);

  if (user?.role !== "Auctioneer") return (
    <div className="min-h-screen flex items-center justify-center">
      <EmptyState title="Auctioneers only" desc="Only auctioneers can create auctions." icon={<Package size={48} />} action={{ label: "Go Home", to: "/" }} />
    </div>
  );

  const handleImg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) { setImage(f); setPreview(URL.createObjectURL(f)); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!image) { toast.error("Item image required."); return; }
    if (!form.startingBid || Number(form.startingBid) <= 0) { toast.error("Starting bid must be greater than 0."); return; }
    if (!form.startTime || !form.endTime) { toast.error("Start and end time required."); return; }
    if (new Date(form.startTime) < new Date()) { toast.error("Start time must be in the future."); return; }
    if (new Date(form.startTime) >= new Date(form.endTime)) { toast.error("End time must be after start time."); return; }
    const d = new FormData();

    d.append("title", form.title);
    d.append("description", form.description);
    d.append("category", form.category);
    d.append("condition", form.condition);
    d.append("startingBid", form.startingBid);

    // Convert local datetime to proper ISO UTC
    d.append(
      "startTime",
      new Date(form.startTime).toISOString()
    );

    d.append(
      "endTime",
      new Date(form.endTime).toISOString()
    );

    d.append("image", image);

    dispatch(createAuction(d));
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Auction</h1>
        <p className="text-sm text-gray-500 mt-1">AI will automatically enhance your description and predict the price.</p>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        {/* Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Item Image *</label>
          <label className="cursor-pointer block">
            <div className={`border-2 border-dashed rounded-xl h-52 flex flex-col items-center justify-center transition-colors overflow-hidden ${preview ? "border-indigo-300" : "border-gray-300 hover:border-indigo-400 hover:bg-gray-50"}`}>
              {preview ? <img src={preview} alt="" className="w-full h-full object-contain p-1" /> : (
                <div className="text-center">
                  <Upload size={32} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Click to upload</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP · max 10MB</p>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" onChange={handleImg} className="hidden" />
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Vintage Leather Jacket 1970s"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Description *
            <span className="ml-2 inline-flex items-center gap-1 text-xs text-indigo-600 font-normal"><Sparkles size={10} /> AI will enhance this</span>
          </label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required rows={3} placeholder="Describe your item — condition, history, unique features..."
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category *</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Condition *</label>
            <select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              <option value="New">New</option>
              <option value="Used">Used</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Starting Bid (₹) *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
            <input type="number" value={form.startingBid} onChange={e => setForm({ ...form, startingBid: e.target.value })} required min={1} placeholder="100"
              className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Time *</label>
            <input type="datetime-local" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">End Time *</label>
            <input type="datetime-local" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-700 flex items-start gap-2">
          <Sparkles size={14} className="flex-shrink-0 mt-0.5" />
          <span>After creation, AI will automatically generate an enhanced description and price prediction. A 5% commission applies on successful sales.</span>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
          {loading ? <><Spinner size="h-4 w-4" /> Creating...</> : "Create Auction"}
        </button>
      </form>
    </div>
  );
};

// ─── My Sales ─────────────────────────────────────────────────────────────────
export const MySales: React.FC = () => {
  const dispatch = useAppDispatch();
  const { salesOrders, loading, error, message } = useAppSelector(s => s.order);
  const [selected, setSelected] = useState<Order | null>(null);
  const [shipForm, setShipForm] = useState({ courier: "", trackingId: "", notes: "" });
  const [showShip, setShowShip] = useState(false);

  useEffect(() => { dispatch(fetchSalesOrders(undefined)); }, [dispatch]);
  useEffect(() => { if (error) { toast.error(error); dispatch(clearOrderError()); } }, [error]);
  useEffect(() => { if (message) { toast.success(message); dispatch(clearOrderMessage()); dispatch(fetchSalesOrders(undefined)); setShowShip(false); } }, [message]);

  const handleShip = () => {
    if (!selected || !shipForm.courier || !shipForm.trackingId) { toast.error("Courier and tracking ID required."); return; }
    dispatch(shipOrder({ id: selected._id, data: shipForm }));
  };

  const [retrying, setRetrying] = useState<string | null>(null);
  const handleRetryPayout = async (orderId: string) => {
    setRetrying(orderId);
    try {
      await api.post(`/orders/${orderId}/retry-payout`);
      toast.success("Payout sent successfully!");
      dispatch(fetchSalesOrders(undefined));
    } catch (e: any) { toast.error(e.message); }
    finally { setRetrying(null); }
  };

  // ── Chart data: sales grouped by month ──────────────────────────────────────
  const totalReceived = salesOrders.reduce((sum, o) => sum + (o.payoutStatus === "done" ? o.payoutAmount : 0), 0);
  const totalSales = salesOrders.length;
  const paidCount = salesOrders.filter(o => o.paymentStatus === "paid").length;
  const monthly = (() => {
    const map = new Map<string, { month: string; sales: number; received: number }>();
    [...salesOrders].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).forEach(o => {
      const d = new Date(o.createdAt);
      const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      if (!map.has(key)) map.set(key, { month: key, sales: 0, received: 0 });
      const row = map.get(key)!;
      row.sales += 1;
      if (o.payoutStatus === "done") row.received += o.payoutAmount;
    });
    return Array.from(map.values());
  })();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2"><DollarSign size={24} /> My Sales</h1>

      {salesOrders.length > 0 && (
        <>
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-400 mb-1">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900">{totalSales}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-400 mb-1">Paid Orders</p>
              <p className="text-2xl font-bold text-gray-900">{paidCount}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-400 mb-1">Total Received</p>
              <p className="text-2xl font-bold text-green-600">₹{totalReceived.toLocaleString()}</p>
            </div>
          </div>
          {monthly.length > 1 && (
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Sales Over Time</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={monthly}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="sales" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Amount Received (₹)</p>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={monthly}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                    <Line type="monotone" dataKey="received" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      {loading ? <div className="flex justify-center py-20"><Spinner size="h-10 w-10" /></div>
        : salesOrders.length === 0 ? <EmptyState title="No sales yet" desc="When buyers win your auctions and pay, orders will appear here." icon={<DollarSign size={48} />} action={{ label: "My Auctions", to: "/my-auctions" }} />
          : (
            <div className="space-y-4">
              {salesOrders.map(o => {
                const auc = typeof o.auction === "object" ? o.auction as any : null;
                const winner = typeof o.winner === "object" ? o.winner as any : null;
                return (
                  <div key={o._id} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-start gap-4">
                      <img src={auc?.image?.url || o.snapshot?.auctionImage || "https://via.placeholder.com/64"} alt="" className="w-16 h-16 rounded-xl object-cover border border-gray-100 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-gray-800 text-sm">{auc?.title || o.snapshot?.auctionTitle}</h3>
                            <p className="text-xs text-gray-400">Order #{o._id.slice(-8).toUpperCase()}</p>
                            {winner && <p className="text-xs text-gray-500 mt-0.5">Buyer: {winner.userName} · {winner.email}</p>}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-gray-900">₹{o.price.toLocaleString()}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Payout: ₹{o.payoutAmount.toLocaleString()}</p>
                            <div className="flex flex-col gap-1 mt-1 items-end">
                              <OrderStatusBadge status={o.paymentStatus} />
                              <OrderStatusBadge status={o.deliveryStatus} />
                            </div>
                          </div>
                        </div>
                        {o.shipmentDetails?.trackingId && (
                          <p className="text-xs text-blue-600 mt-2 flex items-center gap-1"><Truck size={11} /> {o.shipmentDetails.courier} · {o.shipmentDetails.trackingId}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {o.paymentStatus === "paid" && o.deliveryStatus === "pending" && (
                            <button onClick={() => { setSelected(o); setShowShip(true); }}
                              className="text-xs bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1">
                              <Truck size={11} /> Mark as Shipped
                            </button>
                          )}
                          {o.payoutStatus === "done" && <span className="text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-lg flex items-center gap-1"><CheckCircle size={11} /> Payout sent ₹{o.payoutAmount.toLocaleString()}</span>}
                          {o.payoutStatus === "failed" && (
                            <div className="flex flex-col gap-1.5 w-full">
                              <span className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">{o.payoutError || "Payout failed."}</span>
                              <div className="flex gap-2">
                                <button onClick={() => handleRetryPayout(o._id)} disabled={retrying === o._id}
                                  className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center gap-1">
                                  <RefreshCw size={11} className={retrying === o._id ? "animate-spin" : ""} /> {retrying === o._id ? "Retrying..." : "Retry Payout"}
                                </button>
                                {/UPI ID/i.test(o.payoutError || "") && (
                                  <Link to="/profile" className="text-xs text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">Add UPI ID</Link>
                                )}
                              </div>
                            </div>
                          )}
                          {o.payoutStatus === "processing" && <span className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg flex items-center gap-1"><Clock size={11} /> Payout processing...</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

      {/* Ship Modal */}
      {showShip && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Mark as Shipped</h3>
              <button onClick={() => setShowShip(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Courier Name *</label>
                <input value={shipForm.courier} onChange={e => setShipForm({ ...shipForm, courier: e.target.value })} placeholder="e.g. DTDC, BlueDart, FedEx"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tracking ID *</label>
                <input value={shipForm.trackingId} onChange={e => setShipForm({ ...shipForm, trackingId: e.target.value })} placeholder="e.g. BD123456789IN"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea value={shipForm.notes} onChange={e => setShipForm({ ...shipForm, notes: e.target.value })} rows={2} placeholder="Any delivery instructions..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              <button onClick={handleShip} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-indigo-700">Confirm Shipment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Commission History (automatic) ────────────────────────────────────────────
// Commission is deducted automatically from every payout at delivery confirmation
// and sent straight to SmartAuction — there's nothing to manually pay or prove any
// more. This page just shows the auctioneer their automatic commission history.
interface CommissionEntry { _id: string; amount: number; source: string; createdAt: string; auction?: { title?: string; image?: { url?: string } } }
export const CommissionProof: React.FC = () => {
  const { user } = useAppSelector(s => s.auth);
  const [commissions, setCommissions] = useState<CommissionEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== "Auctioneer") return;
    (async () => {
      try {
        const r = await api.get("/commission/my");
        setCommissions(r.data.commissions); setTotal(r.data.total);
      } catch (e: any) { toast.error(e.message); }
      finally { setLoading(false); }
    })();
  }, [user]);

  if (!user || user.role !== "Auctioneer") return null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Commission</h1>
      <p className="text-sm text-gray-500 mb-6">Commission is deducted automatically from your payout when a sale is delivered — nothing to pay or submit manually.</p>
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
        <p className="text-sm font-semibold text-indigo-800 flex items-center gap-1.5"><CheckCircle size={14}/> Fully automatic</p>
        <p className="text-2xl font-bold text-indigo-700 mt-1">₹{total.toLocaleString()}</p>
        <p className="text-xs text-indigo-600 mt-1">Total commission (5% per sale) sent to SmartAuction so far</p>
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="h-8 w-8" /></div>
      ) : commissions.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 border border-gray-200 rounded-xl">
          <p className="text-gray-500 text-sm">No commission recorded yet — it'll show up automatically after your first completed sale.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {commissions.map(c => (
            <div key={c._id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {c.auction?.image?.url && <img src={c.auction.image.url} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0"/>}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{c.auction?.title || "Auction sale"}</p>
                  <p className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-900 flex-shrink-0">₹{c.amount.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
