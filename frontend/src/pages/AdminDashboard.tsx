import React, { useEffect, useState } from "react";
import { Users, Gavel, TrendingUp, DollarSign, AlertCircle, CheckCircle, Ban, Trash2, Eye, RefreshCw, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import toast from "react-hot-toast";
import api from "../lib/axios";
import { Spinner, EmptyState, OrderStatusBadge } from "../components/ui/index";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const COLORS = ["#6366f1","#ec4899","#f59e0b","#10b981","#3b82f6","#8b5cf6"];

const Stat: React.FC<{title:string;value:string|number;icon:React.ReactNode;color:string;sub?:string}> = ({title,value,icon,color,sub}) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>{icon}</div>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    <p className="text-sm text-gray-500 mt-0.5">{title}</p>
    {sub && <p className="text-xs text-green-600 mt-1 font-medium">{sub}</p>}
  </div>
);

const AdminDashboard: React.FC = () => {
  const [tab, setTab] = useState<"overview"|"users"|"commission"|"auctions"|"complaints">("overview");
  const [stats, setStats] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [categoryStats, setCategoryStats] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [commissionTotal, setCommissionTotal] = useState(0);
  const [auctions, setAuctions] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [chatComplaints, setChatComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const r = await api.get("/admin/dashboard");
      setStats(r.data.stats);
      setRevenueData(r.data.revenueData?.map((d:any) => ({ month: MONTHS[d._id.month-1], revenue: d.total, count: d.count })).reverse() || []);
      setCategoryStats(r.data.categoryStats || []);
    } catch(e:any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const loadTab = async (t: string) => {
    try {
      if (t==="users") { const r = await api.get("/admin/users"); setUsers(r.data.users); }
      if (t==="commission") { const r = await api.get("/admin/commissions"); setCommissions(r.data.commissions); setCommissionTotal(r.data.total); }
      if (t==="auctions") { const r = await api.get("/auctions"); setAuctions(r.data.items); }
      if (t==="complaints") {
        const [r1, r2] = await Promise.all([api.get("/admin/complaints"), api.get("/admin/chat-complaints")]);
        setComplaints(r1.data.orders); setChatComplaints(r2.data.complaints);
      }
    } catch(e:any) { toast.error(e.message); }
  };

  useEffect(() => { loadDashboard(); }, []);
  useEffect(() => { loadTab(tab); }, [tab]);

  const blockUser = async (id: string) => {
    await api.patch(`/admin/users/${id}/block`).catch((e:any) => toast.error(e.message));
    toast.success("User status updated.");
    loadTab("users");
  };

  const deleteUser = async (id: string) => {
    if (!window.confirm("Delete this user permanently?")) return;
    await api.delete(`/admin/users/${id}`).catch((e:any) => toast.error(e.message));
    toast.success("User deleted."); loadTab("users");
  };

  const resolveChatComplaint = async (id: string) => {
    await api.patch(`/admin/chat-complaints/${id}/resolve`).catch((e:any) => toast.error(e.message));
    toast.success("Complaint marked resolved."); loadTab("complaints");
  };

  const deleteAuction = async (id: string) => {
    if (!window.confirm("Delete auction?")) return;
    await api.delete(`/admin/auctions/${id}`).catch((e:any) => toast.error(e.message));
    toast.success("Auction deleted."); loadTab("auctions");
  };

  const resolveComplaint = async (id: string, action: string) => {
    await api.patch(`/admin/complaints/${id}/resolve`, { action }).catch((e:any) => toast.error(e.message));
    toast.success(`Complaint ${action}.`); loadTab("complaints");
  };

  const TABS = ["overview","users","commission","auctions","complaints"] as const;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1><p className="text-sm text-gray-500">Full platform control</p></div>
        <button onClick={loadDashboard} className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 px-3 py-2 rounded-lg hover:border-indigo-300 hover:text-indigo-600 transition-colors">
          <RefreshCw size={14}/> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all capitalize ${tab===t?"bg-white text-indigo-600 shadow-sm":"text-gray-600 hover:text-gray-800"}`}>{t}</button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab==="overview" && (
        loading ? <div className="flex justify-center py-20"><Spinner size="h-10 w-10"/></div> :
        stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat title="Total Auctions" value={stats.totalAuctions} icon={<Gavel size={18} className="text-indigo-600"/>} color="bg-indigo-50" sub={`${stats.activeAuctions} active`}/>
              <Stat title="Total Users" value={stats.totalUsers} icon={<Users size={18} className="text-blue-600"/>} color="bg-blue-50"/>
              <Stat title="Total Revenue" value={`₹${(stats.totalRevenue||0).toLocaleString()}`} icon={<DollarSign size={18} className="text-green-600"/>} color="bg-green-50" sub="Commission — 100% automatic"/>
              <Stat title="Open Issues" value={(stats.openComplaints||0)+(stats.openChatComplaints||0)} icon={<AlertCircle size={18} className="text-amber-600"/>} color="bg-amber-50" sub={`${stats.openComplaints||0} orders · ${stats.openChatComplaints||0} chatbot`}/>
            </div>

            {stats.openChatComplaints > 0 && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                <AlertCircle size={16}/> {stats.openChatComplaints} issue{stats.openChatComplaints!==1?"s":""} escalated by the support chatbot.
                <button onClick={()=>setTab("complaints")} className="ml-1 underline text-xs">Review now</button>
              </div>
            )}

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Monthly Commission Revenue</h3>
                {revenueData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={revenueData}>
                      <XAxis dataKey="month" tick={{fontSize:12}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:12}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${v}`}/>
                      <Tooltip formatter={(v:any)=>[`₹${v}`,"Revenue"]}/>
                      <Bar dataKey="revenue" fill="#6366f1" radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No revenue data yet</div>}
              </div>

              <div className="space-y-4">
                {categoryStats.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="font-semibold text-gray-800 mb-3">Popular Categories</h3>
                    <div className="flex items-center gap-3">
                      <PieChart width={90} height={90}>
                        <Pie data={categoryStats.slice(0,6)} cx={40} cy={40} innerRadius={25} outerRadius={40} dataKey="count">
                          {categoryStats.slice(0,6).map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                        </Pie>
                      </PieChart>
                      <div className="space-y-1.5 flex-1">
                        {categoryStats.slice(0,5).map((c:any,i:number)=>{
                          const total = categoryStats.reduce((s:number,x:any)=>s+x.count,0);
                          return (
                            <div key={c._id} className="flex items-center gap-2 text-xs">
                              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{background:COLORS[i%COLORS.length]}}/>
                              <span className="text-gray-600 truncate flex-1">{c._id}</span>
                              <span className="text-gray-400">{Math.round((c.count/total)*100)}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      )}

      {/* USERS */}
      {tab==="users" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">All Users ({users.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Joined</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u=>(
                  <tr key={u._id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={u.profileImage?.url} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-100"/>
                        <div><p className="font-medium text-gray-800">{u.userName}</p><p className="text-xs text-gray-400">{u.email}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role==="Super Admin"?"bg-purple-100 text-purple-700":u.role==="Auctioneer"?"bg-blue-100 text-blue-700":"bg-green-100 text-green-700"}`}>{u.role}</span></td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.blocked?"bg-red-100 text-red-700":"bg-green-100 text-green-700"}`}>{u.blocked?"Blocked":"Active"}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={()=>blockUser(u._id)} className={`p-1.5 rounded-lg transition-colors ${u.blocked?"text-green-600 hover:bg-green-50":"text-amber-600 hover:bg-amber-50"}`}><Ban size={14}/></button>
                        <button onClick={()=>deleteUser(u._id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length===0 && <tr><td colSpan={5} className="text-center py-10 text-gray-400">No users found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* COMMISSION */}
      {tab==="commission" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Automatic Commission Log</h3>
            <span className="text-sm font-bold text-green-600">₹{commissionTotal.toLocaleString()} total</span>
          </div>
          <p className="px-5 py-2 text-xs text-gray-400 bg-gray-50 border-b border-gray-100">Commission is deducted automatically from each auctioneer's payout at delivery confirmation — no manual review needed.</p>
          <div className="divide-y divide-gray-100">
            {commissions.map(c=>(
              <div key={c._id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {c.auction?.image?.url && <img src={c.auction.image.url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0"/>}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{c.auction?.title || "Auction sale"}</p>
                    <p className="text-xs text-gray-400">{c.auctioneer?.userName} · {new Date(c.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-900 flex-shrink-0">₹{c.amount.toLocaleString()}</p>
              </div>
            ))}
            {commissions.length===0 && <p className="text-center py-12 text-gray-400">No commission recorded yet</p>}
          </div>
        </div>
      )}

      {/* AUCTIONS */}
      {tab==="auctions" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-800">All Auctions ({auctions.length})</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50">
                {["Item","Category","Bid","Bids","Status","Actions"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {auctions.map((a:any)=>(
                  <tr key={a._id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={a.image?.url} alt="" className="w-10 h-10 rounded-lg object-cover"/>
                        <p className="font-medium text-gray-800 max-w-[180px] truncate">{a.title}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{a.category}</td>
                    <td className="px-4 py-3 font-semibold text-gray-700">₹{(a.currentBid||a.startingBid).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500">{a.bids?.length||0}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${a.status==="active"?"bg-green-100 text-green-700":a.status==="ended"?"bg-red-100 text-red-700":"bg-blue-100 text-blue-700"}`}>{a.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <a href={`/auction/item/${a._id}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"><Eye size={14}/></a>
                        <button onClick={()=>deleteAuction(a._id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {auctions.length===0 && <tr><td colSpan={6} className="text-center py-10 text-gray-400">No auctions</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* COMPLAINTS */}
      {tab==="complaints" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-800">Chatbot-Escalated Issues ({chatComplaints.length})</h3></div>
            <div className="divide-y divide-gray-100">
              {chatComplaints.map((c:any)=>(
                <div key={c._id} className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{c.userName}</p>
                      <p className="text-xs text-gray-400">{c.email}</p>
                    </div>
                    <button onClick={()=>resolveChatComplaint(c._id)} className="text-xs text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg flex items-center gap-1 flex-shrink-0"><CheckCircle size={11}/>Mark Resolved</button>
                  </div>
                  <pre className="mt-2 bg-gray-50 border border-gray-100 rounded-lg p-3 text-xs text-gray-700 whitespace-pre-wrap font-sans">{c.details}</pre>
                  <p className="text-xs text-gray-400 mt-1">{new Date(c.createdAt).toLocaleString()}</p>
                </div>
              ))}
              {chatComplaints.length===0 && <p className="text-center py-10 text-gray-400">No chatbot escalations 🎉</p>}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-800">Open Order Complaints ({complaints.length})</h3></div>
          <div className="divide-y divide-gray-100">
            {complaints.map((o:any)=>{
              const auc = typeof o.auction==="object"?o.auction:null;
              const winner = typeof o.winner==="object"?o.winner:null;
              const auctioneer = typeof o.auctioneer==="object"?o.auctioneer:null;
              const lastComplaint = o.complaints?.[o.complaints.length-1];
              return (
                <div key={o._id} className="p-5">
                  <div className="flex items-start gap-4">
                    {auc?.image?.url && <img src={auc.image.url} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0"/>}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{auc?.title||o.snapshot?.auctionTitle}</p>
                      <div className="flex gap-4 mt-1 text-xs text-gray-500">
                        <span>Buyer: {winner?.userName}</span>
                        <span>Seller: {auctioneer?.userName}</span>
                        <span>Amount: ₹{o.price?.toLocaleString()}</span>
                      </div>
                      {lastComplaint && <div className="mt-2 bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-gray-700"><span className="font-semibold text-red-700">{lastComplaint.role}:</span> {lastComplaint.message}</div>}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {["resolved","refund","blocked"].map(action=>(
                          <button key={action} onClick={()=>resolveComplaint(o._id,action)}
                            className={`text-xs px-3 py-1.5 rounded-lg capitalize transition-colors ${action==="resolved"?"bg-green-50 text-green-700 hover:bg-green-100":action==="refund"?"bg-blue-50 text-blue-700 hover:bg-blue-100":"bg-red-50 text-red-700 hover:bg-red-100"}`}>
                            {action}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {complaints.length===0 && <p className="text-center py-12 text-gray-400">No open order complaints 🎉</p>}
          </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
