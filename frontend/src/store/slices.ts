import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "../lib/axios";
import { AuthState, AuctionState, NotifState, OrderState, SiteRatingState } from "../types";

// ── AUTH ─────────────────────────────────────────────────────────────────────
const authInit: AuthState = { user: null, isAuthenticated: false, authChecked: false, loading: false, error: null, message: null };

const at = (
  name: string,
  url: string,
  method: "get" | "post" | "put" | "delete" = "post"
) =>
  createAsyncThunk(
    `auth/${name}`,
    async (data: any = undefined, { rejectWithValue }) => {
      try { const r = method === "get" ? await api.get(url) : await api[method](url, data); return r.data; }
      catch (e: any) { return rejectWithValue(e.message); }
    });

export const register = at("register", "/users/register");
export const verifyOTP = at("verifyOTP", "/users/verify-otp");
export const resendOTP = at("resendOTP", "/users/resend-otp");
export const login = at("login", "/users/login");
export const logout = at("logout", "/users/logout", "get");
export const fetchProfile = at("me", "/users/me", "get");
export const updateProfile = at("update", "/users/me", "put");
export const forgotPassword = at("forgot", "/users/forgot-password");
export const resetPassword = at("reset", "/users/reset-password");
export const toggleWishlist = createAsyncThunk("auth/wishlist", async (id: string, { rejectWithValue }) => {
  try { const r = await api.post(`/users/wishlist/${id}`); return r.data; } catch (e: any) { return rejectWithValue(e.message); }
});

export const authSlice = createSlice({
  name: "auth", initialState: authInit,
  reducers: { clearError: s => { s.error = null; }, clearMessage: s => { s.message = null; } },
  extraReducers: b => {
    const pend = (s: AuthState) => { s.loading = true; s.error = null; };
    const rej = (s: AuthState, a: PayloadAction<any>) => { s.loading = false; s.error = a.payload; };
    b.addCase(register.pending, pend).addCase(register.fulfilled, (s, a) => { s.loading = false; s.message = a.payload.message; }).addCase(register.rejected, rej);
    b.addCase(verifyOTP.pending, pend).addCase(verifyOTP.fulfilled, (s, a) => { s.loading = false; s.isAuthenticated = true; s.user = a.payload.user; s.message = a.payload.message; }).addCase(verifyOTP.rejected, rej);
    b.addCase(resendOTP.pending, pend).addCase(resendOTP.fulfilled, (s, a) => { s.loading = false; s.message = a.payload.message; }).addCase(resendOTP.rejected, rej);
    b.addCase(login.pending, pend).addCase(login.fulfilled, (s, a) => { s.loading = false; s.isAuthenticated = true; s.user = a.payload.user; s.message = a.payload.message; }).addCase(login.rejected, rej);
    b.addCase(logout.fulfilled, () => ({ ...authInit, authChecked: true })).addCase(logout.rejected, () => ({ ...authInit, authChecked: true }));
    b.addCase(fetchProfile.pending, pend).addCase(fetchProfile.fulfilled, (s, a) => { s.loading = false; s.isAuthenticated = true; s.user = a.payload.user; s.authChecked = true; }).addCase(fetchProfile.rejected, s => { s.loading = false; s.isAuthenticated = false; s.user = null; s.authChecked = true; });
    b.addCase(updateProfile.pending, pend).addCase(updateProfile.fulfilled, (s, a) => { s.loading = false; s.user = a.payload.user; s.message = a.payload.message; }).addCase(updateProfile.rejected, rej);
    b.addCase(forgotPassword.pending, pend).addCase(forgotPassword.fulfilled, (s, a) => { s.loading = false; s.message = a.payload.message; }).addCase(forgotPassword.rejected, rej);
    b.addCase(resetPassword.pending, pend).addCase(resetPassword.fulfilled, (s, a) => { s.loading = false; s.message = a.payload.message; }).addCase(resetPassword.rejected, rej);
    b.addCase(toggleWishlist.fulfilled, (s, a) => { if (s.user) { if (a.payload.action === "added") s.user.wishlist.push(a.meta.arg); else s.user.wishlist = s.user.wishlist.filter(id => id !== a.meta.arg); } });
  }
});
export const { clearError, clearMessage } = authSlice.actions;

// ── AUCTION ───────────────────────────────────────────────────────────────────
const aucInit: AuctionState = { auctions: [], myAuctions: [], auctionDetail: null, bids: [], categoryCounts: { All: 0 }, loading: false, error: null, message: null };

export const fetchAuctions = createAsyncThunk("auction/all", async (params: any = {}, { rejectWithValue }) => {
  try { const r = await api.get("/auctions", { params }); return r.data; } catch (e: any) { return rejectWithValue(e.message); }
});
// Independent of the currently-selected category filter, so sidebar counts stay
// accurate for every category (see getCategoryCounts on the backend).
export const fetchCategoryCounts = createAsyncThunk("auction/categoryCounts", async (params: any = {}, { rejectWithValue }) => {
  try { const r = await api.get("/auctions/meta/category-counts", { params }); return r.data; } catch (e: any) { return rejectWithValue(e.message); }
});
export const fetchAuction = createAsyncThunk("auction/one", async (id: string, { rejectWithValue }) => {
  try { const r = await api.get(`/auctions/${id}`); return r.data; } catch (e: any) { return rejectWithValue(e.message); }
});
export const fetchMyAuctions = createAsyncThunk("auction/mine", async (_, { rejectWithValue }) => {
  try { const r = await api.get("/auctions/auctioneer/my"); return r.data; } catch (e: any) { return rejectWithValue(e.message); }
});
export const createAuction = createAsyncThunk("auction/create", async (data: FormData, { rejectWithValue }) => {
  try { const r = await api.post("/auctions", data); return r.data; } catch (e: any) { return rejectWithValue(e.message); }
});
export const deleteAuction = createAsyncThunk("auction/delete", async (id: string, { rejectWithValue }) => {
  try { const r = await api.delete(`/auctions/${id}`); return { ...r.data, id }; } catch (e: any) { return rejectWithValue(e.message); }
});
export const republishAuction = createAsyncThunk("auction/republish", async ({ id, data }: any, { rejectWithValue }) => {
  try { const r = await api.put(`/auctions/${id}/republish`, data); return r.data; } catch (e: any) { return rejectWithValue(e.message); }
});
export const submitQuestion = createAsyncThunk("auction/question", async ({ id, question }: any, { rejectWithValue }) => {
  try { const r = await api.post(`/auctions/${id}/question`, { question }); return r.data; } catch (e: any) { return rejectWithValue(e.message); }
});
export const submitAnswer = createAsyncThunk("auction/answer", async ({ id, questionIndex, answer }: any, { rejectWithValue }) => {
  try { const r = await api.post(`/auctions/${id}/answer`, { questionIndex, answer }); return r.data; } catch (e: any) { return rejectWithValue(e.message); }
});

export const auctionSlice = createSlice({
  name: "auction", initialState: aucInit,
  reducers: {
    clearAuctionError: s => { s.error = null; },
    clearAuctionMessage: s => { s.message = null; },
    resetDetail: s => { s.auctionDetail = null; s.bids = []; },
    wsUpdateBid: (s, a: PayloadAction<any>) => {
      const { auctionId, currentBid, highestBidderName, bids, endTime } = a.payload;
      if (s.auctionDetail && s.auctionDetail._id === auctionId) {
        s.auctionDetail.currentBid = currentBid;
        s.auctionDetail.highestBidderName = highestBidderName;
        s.auctionDetail.endTime = endTime;
      }
      const a2 = s.auctions.find(x => x._id === auctionId); if (a2) a2.currentBid = currentBid;
    },
    wsExtendTime: (s, a: PayloadAction<any>) => {
      if (s.auctionDetail && s.auctionDetail._id === a.payload.auctionId) s.auctionDetail.endTime = a.payload.newEndTime;
    },
    wsNewQuestion: (s, a: PayloadAction<any>) => {
      if (s.auctionDetail && s.auctionDetail._id === a.payload.auctionId) s.auctionDetail.questions.push(a.payload.question);
    },
    wsAnswered: (s, a: PayloadAction<any>) => {
      if (s.auctionDetail && s.auctionDetail._id === a.payload.auctionId) {
        const q = s.auctionDetail.questions[a.payload.questionIndex];
        if (q) q.answer = a.payload.answer;
      }
    }
  },
  extraReducers: b => {
    const pend = (s: AuctionState) => { s.loading = true; s.error = null; };
    const rej = (s: AuctionState, a: PayloadAction<any>) => { s.loading = false; s.error = a.payload; };
    b.addCase(fetchAuctions.pending, pend).addCase(fetchAuctions.fulfilled, (s, a) => { s.loading = false; s.auctions = a.payload.items; }).addCase(fetchAuctions.rejected, rej);
    b.addCase(fetchCategoryCounts.fulfilled, (s, a) => { s.categoryCounts = a.payload.counts; });
    b.addCase(fetchAuction.pending, pend).addCase(fetchAuction.fulfilled, (s, a) => { s.loading = false; s.auctionDetail = a.payload.auction; s.bids = a.payload.bidders || []; }).addCase(fetchAuction.rejected, rej);
    b.addCase(fetchMyAuctions.pending, pend).addCase(fetchMyAuctions.fulfilled, (s, a) => { s.loading = false; s.myAuctions = a.payload.auctions; }).addCase(fetchMyAuctions.rejected, rej);
    b.addCase(createAuction.pending, pend).addCase(createAuction.fulfilled, (s, a) => { s.loading = false; s.message = a.payload.message; if (a.payload.auction) s.auctions.unshift(a.payload.auction); }).addCase(createAuction.rejected, rej);
    b.addCase(deleteAuction.pending, pend).addCase(deleteAuction.fulfilled, (s, a) => { s.loading = false; s.message = a.payload.message; s.myAuctions = s.myAuctions.filter(x => x._id !== a.payload.id); s.auctions = s.auctions.filter(x => x._id !== a.payload.id); }).addCase(deleteAuction.rejected, rej);
    b.addCase(republishAuction.pending, pend).addCase(republishAuction.fulfilled, (s, a) => { s.loading = false; s.message = a.payload.message; }).addCase(republishAuction.rejected, rej);
    b.addCase(submitQuestion.fulfilled, (s, a) => { if (s.auctionDetail) s.auctionDetail.questions = a.payload.questions; });
    b.addCase(submitAnswer.fulfilled, (s, a) => { if (s.auctionDetail) s.auctionDetail.questions = a.payload.questions; });
  }
});
export const { clearAuctionError, clearAuctionMessage, resetDetail, wsUpdateBid, wsExtendTime, wsNewQuestion, wsAnswered } = auctionSlice.actions;

// ── NOTIFICATION ──────────────────────────────────────────────────────────────
const notifInit: NotifState = { notifications: [], unread: 0, loading: false };
export const fetchNotifications = createAsyncThunk("notif/all", async (_, { rejectWithValue }) => {
  try { const r = await api.get("/notifications"); return r.data; } catch (e: any) { return rejectWithValue(e.message); }
});
export const markAllSeen = createAsyncThunk("notif/seen", async (_, { rejectWithValue }) => {
  try { const r = await api.put("/notifications/seen"); return r.data; } catch (e: any) { return rejectWithValue(e.message); }
});
export const deleteNotif = createAsyncThunk("notif/delete", async (id: string, { rejectWithValue }) => {
  try { await api.delete(`/notifications/${id}`); return id; } catch (e: any) { return rejectWithValue(e.message); }
});
export const notifSlice = createSlice({
  name: "notif", initialState: notifInit,
  reducers: { addWsNotif: (s, a: PayloadAction<any>) => { s.notifications.unshift(a.payload); s.unread++; } },
  extraReducers: b => {
    b.addCase(fetchNotifications.pending, s => { s.loading = true; });
    b.addCase(fetchNotifications.fulfilled, (s, a) => { s.loading = false; s.notifications = a.payload.notifications; s.unread = a.payload.unread; });
    b.addCase(fetchNotifications.rejected, s => { s.loading = false; });
    b.addCase(markAllSeen.fulfilled, s => { s.notifications = s.notifications.map(n => ({ ...n, seen: true })); s.unread = 0; });
    b.addCase(deleteNotif.fulfilled, (s, a) => { s.notifications = s.notifications.filter(n => n._id !== a.payload); });
  }
});
export const { addWsNotif } = notifSlice.actions;

// ── ORDER ─────────────────────────────────────────────────────────────────────
const orderInit: OrderState = { orders: [], salesOrders: [], activeOrder: null, loading: false, error: null, message: null };
const ot = (name: string, fn: (arg: any) => Promise<any>) => createAsyncThunk(`order/${name}`, async (arg: any, { rejectWithValue }) => {
  try { return (await fn(arg)).data; } catch (e: any) { return rejectWithValue(e.message); }
});
export const fetchMyOrders = ot("my", () => api.get("/orders/my"));
export const fetchSalesOrders = ot("sales", () => api.get("/orders/sales"));
export const fetchOrderById = ot("one", (id: string) => api.get(`/orders/${id}`));
export const shipOrder = ot("ship", ({ id, data }: any) => api.put(`/orders/${id}/ship`, data));
export const confirmDelivery = ot("deliver", (id: string) => api.put(`/orders/${id}/deliver`));
export const raiseComplaint = ot("complaint", ({ id, data }: any) => api.post(`/orders/${id}/complaint`, data));
export const submitRating = ot("rate", ({ id, data }: any) => api.post(`/orders/${id}/rate`, data));
export const createRazorpayOrder = ot("rzpCreate", (data: any) => api.post("/orders/payment/create", data));
export const verifyPayment = ot("rzpVerify", (data: any) => api.post("/orders/payment/verify", data));

export const orderSlice = createSlice({
  name: "order", initialState: orderInit,
  reducers: { clearOrderError: s => { s.error = null; }, clearOrderMessage: s => { s.message = null; } },
  extraReducers: b => {
    const pend = (s: OrderState) => { s.loading = true; s.error = null; };
    const rej = (s: OrderState, a: PayloadAction<any>) => { s.loading = false; s.error = a.payload; };
    const ok = (key: keyof OrderState) => (s: OrderState, a: PayloadAction<any>) => {
      s.loading = false; if (key === "orders") s.orders = a.payload.orders;
      else if (key === "salesOrders") s.salesOrders = a.payload.orders;
      else if (key === "activeOrder") s.activeOrder = a.payload.order;
      if (a.payload.message) s.message = a.payload.message;
    };
    b.addCase(fetchMyOrders.pending, pend).addCase(fetchMyOrders.fulfilled, ok("orders")).addCase(fetchMyOrders.rejected, rej);
    b.addCase(fetchSalesOrders.pending, pend).addCase(fetchSalesOrders.fulfilled, ok("salesOrders")).addCase(fetchSalesOrders.rejected, rej);
    b.addCase(fetchOrderById.pending, pend).addCase(fetchOrderById.fulfilled, ok("activeOrder")).addCase(fetchOrderById.rejected, rej);
    b.addCase(shipOrder.pending, pend).addCase(shipOrder.fulfilled, ok("activeOrder")).addCase(shipOrder.rejected, rej);
    b.addCase(confirmDelivery.pending, pend).addCase(confirmDelivery.fulfilled, ok("activeOrder")).addCase(confirmDelivery.rejected, rej);
    b.addCase(raiseComplaint.pending, pend).addCase(raiseComplaint.fulfilled, (s, a) => { s.loading = false; s.message = a.payload.message; }).addCase(raiseComplaint.rejected, rej);
    b.addCase(submitRating.pending, pend).addCase(submitRating.fulfilled, (s, a) => { s.loading = false; s.message = a.payload.message; }).addCase(submitRating.rejected, rej);
    b.addCase(verifyPayment.pending, pend).addCase(verifyPayment.fulfilled, ok("activeOrder")).addCase(verifyPayment.rejected, rej);
  }
});
export const { clearOrderError, clearOrderMessage } = orderSlice.actions;

// ── BID ───────────────────────────────────────────────────────────────────────
export const placeBid = createAsyncThunk("bid/place", async ({ id, amount }: { id: string; amount: number }, { rejectWithValue }) => {
  try { const r = await api.post(`/bids/${id}`, { amount }); return r.data; } catch (e: any) { return rejectWithValue(e.message); }
});
export const bidSlice = createSlice({
  name: "bid", initialState: { loading: false, error: null as string | null, message: null as string | null },
  reducers: { clearBidError: s => { s.error = null; }, clearBidMessage: s => { s.message = null; } },
  extraReducers: b => {
    b.addCase(placeBid.pending, s => { s.loading = true; s.error = null; });
    b.addCase(placeBid.fulfilled, (s, a) => { s.loading = false; s.message = a.payload.message; });
    b.addCase(placeBid.rejected, (s, a: PayloadAction<any>) => { s.loading = false; s.error = a.payload; });
  }
});
export const { clearBidError, clearBidMessage } = bidSlice.actions;

// ── SITE RATING ───────────────────────────────────────────────────────────────
// Platform-wide rating (User Satisfaction / AI Features / Chatbot Assistance),
// one submission per account. Shown on the Home page for logged-in users.
const siteRatingInit: SiteRatingState = { rating: null, checked: false, loading: false, error: null, message: null };

export const fetchMySiteRating = createAsyncThunk("siteRating/mine", async (_, { rejectWithValue }) => {
  try { const r = await api.get("/site-rating/me"); return r.data; } catch (e: any) { return rejectWithValue(e.message); }
});
export const submitSiteRating = createAsyncThunk(
  "siteRating/submit",
  async (data: { userSatisfaction: number; aiFeatures: number; chatbotAssistance: number }, { rejectWithValue }) => {
    try { const r = await api.post("/site-rating", data); return r.data; } catch (e: any) { return rejectWithValue(e.message); }
  }
);

export const siteRatingSlice = createSlice({
  name: "siteRating", initialState: siteRatingInit,
  reducers: { clearSiteRatingError: s => { s.error = null; }, clearSiteRatingMessage: s => { s.message = null; } },
  extraReducers: b => {
    b.addCase(fetchMySiteRating.fulfilled, (s, a) => { s.rating = a.payload.rating; s.checked = true; });
    b.addCase(fetchMySiteRating.rejected, s => { s.checked = true; });
    b.addCase(submitSiteRating.pending, s => { s.loading = true; s.error = null; });
    b.addCase(submitSiteRating.fulfilled, (s, a) => { s.loading = false; s.rating = a.payload.rating; s.message = a.payload.message; });
    b.addCase(submitSiteRating.rejected, (s, a: PayloadAction<any>) => { s.loading = false; s.error = a.payload; });
  }
});
export const { clearSiteRatingError, clearSiteRatingMessage } = siteRatingSlice.actions;
