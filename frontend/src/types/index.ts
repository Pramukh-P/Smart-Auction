export interface User {
  _id: string; userName: string; email: string;
  role: "Auctioneer" | "Bidder" | "Super Admin";
  profileImage: { public_id: string; url: string };
  address?: string; phone?: string;
  unpaidCommission: number; auctionsWon: number; moneySpent: number;
  wishlist: string[];
  verified: boolean; blocked: boolean;
  ratingCount: number; ratingSum: number;
  paymentMethods?: { bankTransfer?: { bankAccountNumber?: string; bankAccountName?: string; bankName?: string }; upi?: { upiId?: string }; paypal?: { paypalEmail?: string } };
  createdAt: string;
}

export interface BidEntry {
  userId: string; userName: string; profileImage?: string; amount: number; timestamp: string;
}

export interface Question {
  userId: string; userName: string; question: string; answer?: string; askedAt: string;
}

export interface Auction {
  _id: string; title: string; description: string;
  startingBid: number; category: string; condition: "New" | "Used";
  currentBid: number; startTime: string; endTime: string;
  status: "active" | "ended" | "completed";
  image: { public_id: string; url: string };
  createdBy: User | string; winner?: User | string | null;
  highestBidder?: User | string | null;
  highestBidderName: string; highestBidderEmail: string;
  bids: BidEntry[]; finalBidAmount: number;
  paymentStatus: "pending" | "holding" | "paid" | "failed";
  paymentDeadline?: string;
  deliveryStatus: "Pending" | "Shipped" | "Delivered" | "Completed";
  payoutReleased: boolean; commissionCalculated: boolean;
  aiDescription?: string; aiPricePrediction?: number;
  republishCount: number; questions: Question[]; createdAt: string;
}

export interface Order {
  _id: string; auction: Auction | string; auctioneer: User | string; winner: User | string;
  price: number;
  paymentStatus: "pending" | "holding" | "paid" | "failed";
  deliveryStatus: "pending" | "shipped" | "delivered" | "completed" | "problem";
  payoutStatus: "pending" | "processing" | "done" | "failed";
  commissionRate: number; commissionAmount: number; payoutAmount: number;
  payoutTxId?: string; payoutError?: string;
  complaintStatus: "none" | "open" | "resolved" | "blocked" | "refund";
  complaints: ComplaintEntry[];
  shipmentDetails?: { courier?: string; trackingId?: string; shippedDate?: string; notes?: string };
  paymentInfo?: { transactionId?: string; paidAmount?: number; paidVia?: string; paidAt?: string };
  rating?: number; ratingComment?: string;
  snapshot?: { auctionTitle?: string; auctionImage?: string; winnerName?: string; auctioneerName?: string; wonAt?: string };
  paidAt?: string; createdAt: string;
}

export interface ComplaintEntry {
  by: string; role: string; subject?: string; message?: string;
  createdAt: string; replied: boolean; replyMessage?: string;
}

export interface Notification {
  _id: string; user: string;
  auction?: { _id: string; title: string; image?: { url: string } };
  type: string; message: string; seen: boolean; link?: string; createdAt: string;
}

export interface ChatMsg { _id?: string; role: "user" | "assistant"; content: string; createdAt?: string; }

export interface SiteRating {
  _id: string; user: string;
  userSatisfaction: number; aiFeatures: number; chatbotAssistance: number;
  createdAt: string;
}

export interface AuthState { user: User | null; isAuthenticated: boolean; authChecked: boolean; loading: boolean; error: string | null; message: string | null; }
export interface AuctionState { auctions: Auction[]; myAuctions: Auction[]; auctionDetail: Auction | null; bids: BidEntry[]; categoryCounts: Record<string, number>; loading: boolean; error: string | null; message: string | null; }
export interface NotifState { notifications: Notification[]; unread: number; loading: boolean; }
export interface OrderState { orders: Order[]; salesOrders: Order[]; activeOrder: Order | null; loading: boolean; error: string | null; message: string | null; }
export interface SiteRatingState { rating: SiteRating | null; checked: boolean; loading: boolean; error: string | null; message: string | null; }

export type WsMsg =
  | { type: "bid_update"; auctionId: string; currentBid: number; highestBidderName: string; highestBidderId: string; totalBids: number; bids: BidEntry[]; endTime: string; extended: boolean }
  | { type: "auction_extended"; auctionId: string; newEndTime: string; message: string }
  | { type: "auction_ended"; auctionId: string }
  | { type: "outbid_notification"; auctionId: string; auctionTitle: string; newBid: number }
  | { type: "watcher_count"; auctionId: string; count: number }
  | { type: "new_question"; auctionId: string; question: any }
  | { type: "question_answered"; auctionId: string; questionIndex: number; answer: string }
  | { type: string; [k: string]: any };
