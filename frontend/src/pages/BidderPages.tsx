import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Package, Heart, Star, AlertCircle, CheckCircle, Truck, Upload, User, Settings, Award, DollarSign, X, Gavel } from "lucide-react";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../store/store";
import { fetchMyOrders, fetchOrderById, confirmDelivery, raiseComplaint, submitRating, verifyPayment, createRazorpayOrder, clearOrderError, clearOrderMessage } from "../store/slices";
import {
  updateProfile,
  toggleWishlist,
  clearError,
  clearMessage
} from "../store/slices";
import { Order, Auction } from "../types";
import { Spinner, EmptyState, OrderStatusBadge } from "../components/ui/index";
import api from "../lib/axios";

// ─── My Orders ────────────────────────────────────────────────────────────────
export const MyOrders: React.FC = () => {
  const dispatch = useAppDispatch();
  const { orders, loading, error, message } = useAppSelector(s => s.order);
  const [selected, setSelected] = useState<Order|null>(null);
  const [complaintForm, setComplaintForm] = useState({ subject:"", message:"" });
  const [ratingForm, setRatingForm] = useState({ rating: 5, comment:"" });
  const [showComplaint, setShowComplaint] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => { dispatch(fetchMyOrders(undefined)); }, [dispatch]);
  useEffect(() => { if (error) { toast.error(error); dispatch(clearOrderError()); } }, [error]);
  useEffect(() => { if (message) { toast.success(message); dispatch(clearOrderMessage()); dispatch(fetchMyOrders(undefined)); } }, [message]);

  const handlePay = async (order: Order) => {
    setPayLoading(true);
    try {
      const auc = order.auction as Auction;
      const res = await dispatch(createRazorpayOrder({ amount: order.price, currency:"INR" })).unwrap();
      if (res.simulated) {
        await dispatch(verifyPayment({ orderId: order._id, auctionId: typeof auc==="string"?auc:auc._id })).unwrap();
        toast.success("Payment completed (simulated)!");
        dispatch(fetchMyOrders(undefined));
        return;
      }
      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) { toast.error("Razorpay not loaded. Refresh the page."); return; }
      const rzp = new Razorpay({
        key: res.key, amount: res.order.amount, currency: "INR",
        name: "SmartAuction", description: `Payment for ${typeof auc==="object"?auc.title:"auction"}`,
        order_id: res.order.id,
        handler: async (response: any) => {
          await dispatch(verifyPayment({ orderId: order._id, auctionId: typeof auc==="string"?auc:auc._id, ...response })).unwrap();
          toast.success("Payment successful!"); dispatch(fetchMyOrders(undefined));
        },
        theme: { color: "#6366f1" }
      });
      rzp.open();
    } catch(e:any) { toast.error(e.message||"Payment failed."); }
    finally { setPayLoading(false); }
  };

  const handleConfirmDelivery = async (orderId: string) => {
    if (!window.confirm("Confirm that you received this item?")) return;
    await dispatch(confirmDelivery(orderId)).unwrap().catch(e=>toast.error(e));
  };

  const handleComplaint = async () => {
    if (!selected||!complaintForm.message) return;
    dispatch(raiseComplaint({ id: selected._id, data: complaintForm }));
    setShowComplaint(false); setComplaintForm({subject:"",message:""});
  };

  const handleRating = async () => {
    if (!selected) return;
    dispatch(submitRating({ id: selected._id, data: ratingForm }));
    setShowRating(false);
  };

  const getOrderAuction = (o: Order) => typeof o.auction==="object" ? o.auction as Auction : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2"><ShoppingBag size={24}/> My Orders</h1>
      {loading ? <div className="flex justify-center py-20"><Spinner size="h-10 w-10"/></div>
      : orders.length===0 ? <EmptyState title="No orders yet" desc="Win an auction to see your orders here" icon={<ShoppingBag size={48}/>} action={{label:"Browse Auctions",to:"/auctions"}}/>
      : (
        <div className="space-y-4">
          {orders.map(o => {
            const auc = getOrderAuction(o);
            const auctioneer = typeof o.auctioneer==="object" ? o.auctioneer as any : null;
            return (
              <div key={o._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <img src={auc?.image?.url||o.snapshot?.auctionImage||"https://via.placeholder.com/80"} alt="" className="w-20 h-20 rounded-xl object-cover border border-gray-100"/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-gray-800 truncate">{auc?.title||o.snapshot?.auctionTitle||"Auction Item"}</h3>
                          <p className="text-xs text-gray-400 mt-0.5">Order #{o._id.slice(-8).toUpperCase()} · {new Date(o.createdAt).toLocaleDateString()}</p>
                          {auctioneer && <p className="text-xs text-gray-500 mt-0.5">Seller: {auctioneer.userName}</p>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-gray-900">₹{o.price.toLocaleString()}</p>
                          <div className="flex flex-col gap-1 mt-1">
                            <OrderStatusBadge status={o.paymentStatus}/>
                            <OrderStatusBadge status={o.deliveryStatus}/>
                          </div>
                        </div>
                      </div>

                      {o.shipmentDetails?.trackingId && (
                        <div className="mt-2 flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-1.5 text-xs text-blue-700">
                          <Truck size={12}/> {o.shipmentDetails.courier} · Tracking: {o.shipmentDetails.trackingId}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {o.paymentStatus==="pending" && (
                          <button onClick={()=>handlePay(o)} disabled={payLoading}
                            className="text-xs bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60">
                            {payLoading?"Processing...":"💳 Pay Now"}
                          </button>
                        )}
                        {o.paymentStatus==="paid" && o.deliveryStatus==="shipped" && (
                          <button onClick={()=>handleConfirmDelivery(o._id)}
                            className="text-xs bg-green-600 text-white px-4 py-1.5 rounded-lg hover:bg-green-700 transition-colors">
                            <CheckCircle size={11} className="inline mr-1"/>Confirm Delivery
                          </button>
                        )}
                        {o.deliveryStatus==="completed" && !o.rating && (
                          <button onClick={()=>{setSelected(o);setShowRating(true);}}
                            className="text-xs bg-amber-500 text-white px-4 py-1.5 rounded-lg hover:bg-amber-600 transition-colors">
                            <Star size={11} className="inline mr-1"/>Rate Seller
                          </button>
                        )}
                        {o.paymentStatus==="paid" && o.complaintStatus==="none" && (
                          <button onClick={()=>{setSelected(o);setShowComplaint(true);}}
                            className="text-xs border border-red-300 text-red-600 px-4 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                            <AlertCircle size={11} className="inline mr-1"/>Raise Complaint
                          </button>
                        )}
                        {o.complaintStatus!=="none" && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg capitalize">Complaint: {o.complaintStatus}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Complaint Modal */}
      {showComplaint && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Raise Complaint</h3>
              <button onClick={()=>setShowComplaint(false)}><X size={18} className="text-gray-400"/></button>
            </div>
            <div className="space-y-3">
              <input value={complaintForm.subject} onChange={e=>setComplaintForm({...complaintForm,subject:e.target.value})} placeholder="Subject (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"/>
              <textarea value={complaintForm.message} onChange={e=>setComplaintForm({...complaintForm,message:e.target.value})} rows={3} placeholder="Describe your issue..." required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"/>
              <button onClick={handleComplaint} className="w-full bg-red-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-red-700">Submit Complaint</button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRating && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Rate Seller</h3>
              <button onClick={()=>setShowRating(false)}><X size={18} className="text-gray-400"/></button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Rating</p>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(n=>(
                    <button key={n} onClick={()=>setRatingForm({...ratingForm,rating:n})}
                      className={`text-2xl transition-transform hover:scale-110 ${ratingForm.rating>=n?"text-amber-400":"text-gray-200"}`}>★</button>
                  ))}
                </div>
              </div>
              <textarea value={ratingForm.comment} onChange={e=>setRatingForm({...ratingForm,comment:e.target.value})} rows={3} placeholder="Leave a review (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"/>
              <button onClick={handleRating} className="w-full bg-amber-500 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-amber-600">Submit Rating</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Wishlist ─────────────────────────────────────────────────────────────────
export const Wishlist: React.FC = () => {
  const dispatch = useAppDispatch();
  const [wishlist, setWishlist] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAppSelector(s => s.auth);

  useEffect(() => {
    api.get("/users/wishlist").then(r => { setWishlist(r.data.wishlist||[]); }).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  const handleRemove = async (auctionId: string) => {
    dispatch(toggleWishlist(auctionId));
    setWishlist(prev => prev.filter(a => a._id !== auctionId));
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="h-10 w-10"/></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2"><Heart size={24}/> My Wishlist</h1>
      {wishlist.length===0 ? (
        <EmptyState title="Wishlist is empty" desc="Save auctions to watch them later" icon={<Heart size={48}/>} action={{label:"Browse Auctions",to:"/auctions"}}/>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {wishlist.map(auc => (
            <div key={auc._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative">
                <Link to={`/auction/item/${auc._id}`}>
                  <img src={auc.image?.url} alt={auc.title} className="w-full h-40 object-cover"/>
                </Link>
                <button onClick={()=>handleRemove(auc._id)} className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center text-red-400 hover:text-red-600 shadow-sm transition-colors">
                  <X size={14}/>
                </button>
              </div>
              <div className="p-3">
                <Link to={`/auction/item/${auc._id}`} className="font-semibold text-gray-800 text-sm hover:text-indigo-600 line-clamp-1 block">{auc.title}</Link>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm font-bold text-gray-900">₹{(auc.currentBid||auc.startingBid).toLocaleString()}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${auc.status==="active"?"bg-green-100 text-green-700":"bg-gray-100 text-gray-500"}`}>{auc.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Profile ──────────────────────────────────────────────────────────────────
export const Profile: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user, loading, error, message } = useAppSelector(s => s.auth);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ userName:"", phone:"", address:"", upiId:"", bankAccountNumber:"", bankName:"" });
  const [imgFile, setImgFile] = useState<File|null>(null);
  const [preview, setPreview] = useState<string|null>(null);

  useEffect(() => {
    if (user) setForm({ userName:user.userName||"", phone:user.phone||"", address:user.address||"",
      upiId:user.paymentMethods?.upi?.upiId||"", bankAccountNumber:user.paymentMethods?.bankTransfer?.bankAccountNumber||"", bankName:user.paymentMethods?.bankTransfer?.bankName||"" });
  }, [user]);
  useEffect(() => { if (error) { toast.error(error); dispatch(clearError()); } }, [error]);
  useEffect(() => { if (message) { toast.success(message); dispatch(clearMessage()); setEditing(false); } }, [message]);

  if (!user) return null;
  const avgRating = user.ratingCount>0 ? (user.ratingSum/user.ratingCount).toFixed(1) : "—";

  const handleSave = () => {
    const d = new FormData();
    d.append("userName", form.userName); d.append("phone", form.phone); d.append("address", form.address);
    d.append("paymentMethods", JSON.stringify({ upi:{upiId:form.upiId}, bankTransfer:{bankAccountNumber:form.bankAccountNumber,bankName:form.bankName} }));
    if (imgFile) d.append("profileImage", imgFile);
    dispatch(updateProfile(d));
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img src={preview||user.profileImage?.url} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-white/40"/>
              {editing && (
                <label className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-full flex items-center justify-center cursor-pointer shadow-lg">
                  <Upload size={13} className="text-indigo-600"/>
                  <input type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f){setImgFile(f);setPreview(URL.createObjectURL(f));}}}/>
                </label>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{user.userName}</h2>
              <p className="text-white/70 text-sm">{user.email}</p>
              <span className="inline-block mt-1 text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{user.role}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
          {[[user.auctionsWon,"Won"],[`₹${user.moneySpent?.toLocaleString()||0}`,"Spent"],[avgRating,"Rating"],[user.unpaidCommission>0?`₹${user.unpaidCommission}`:"₹0","Commission"]].map(([v,l])=>(
            <div key={String(l)} className="px-4 py-3 text-center">
              <p className="text-base font-bold text-gray-900">{v}</p>
              <p className="text-xs text-gray-500">{l}</p>
            </div>
          ))}
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[{k:"userName",l:"Username"},{k:"phone",l:"Phone"}].map(({k,l})=>(
              <div key={k}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{l}</label>
                {editing ? <input value={(form as any)[k]} onChange={e=>setForm({...form,[k]:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"/> : <p className="text-sm text-gray-800">{(user as any)[k]||"—"}</p>}
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
            {editing ? <input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"/> : <p className="text-sm text-gray-800">{user.address||"—"}</p>}
          </div>
          {(user.role==="Auctioneer"||user.role==="Bidder") && editing && (
            <div className="border border-gray-100 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment Methods (for payouts)</p>
              {[{k:"upiId",l:"UPI ID",p:"yourname@upi"},{k:"bankAccountNumber",l:"Bank Account Number",p:"Account number"},{k:"bankName",l:"Bank Name",p:"Bank name"}].map(({k,l,p})=>(
                <div key={k}>
                  <label className="block text-xs text-gray-500 mb-1">{l}</label>
                  <input value={(form as any)[k]} onChange={e=>setForm({...form,[k]:e.target.value})} placeholder={p} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500"/>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            {editing ? (
              <>
                <button onClick={handleSave} disabled={loading} className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60">{loading?"Saving...":"Save Changes"}</button>
                <button onClick={()=>{setEditing(false);setPreview(null);setImgFile(null);}} className="border border-gray-300 text-gray-600 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50">Cancel</button>
              </>
            ) : (
              <button onClick={()=>setEditing(true)} className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2"><Settings size={14}/> Edit Profile</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
