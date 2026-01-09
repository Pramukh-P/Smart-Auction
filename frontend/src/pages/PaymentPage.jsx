// frontend/src/pages/PaymentPage.jsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

const NOTIF_KEY = "smart_auction_notifications";
const readNotifications = () => {
  try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || "[]"); } catch { return []; }
};
const writeNotifications = (arr) => { localStorage.setItem(NOTIF_KEY, JSON.stringify(arr || [])); };

const PaymentPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { auctionId, amount, auctionTitle, auctioneerId } = state || {};

  const handleDone = () => {
    // Add notification for bidder (self)
    const bidderNotif = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2,9)}`,
      targetUserId: state?.userId || null, // if you want target bidder, pass it in state
      type: "payment-done",
      text: `Payment done for "${auctionTitle || "an auction"}".`,
      auctionId: auctionId,
      seen: false,
      createdAt: new Date().toISOString()
    };
    // Add notification for auctioneer (received payment)
    const auctioneerNotif = {
      id: `${Date.now()+1}_${Math.random().toString(36).slice(2,9)}`,
      targetUserId: auctioneerId,
      type: "payment-received",
      text: `You received payment for "${auctionTitle || "an auction"}".`,
      auctionId: auctionId,
      seen: false,
      createdAt: new Date().toISOString()
    };

    const all = readNotifications();
    all.unshift(auctioneerNotif);
    all.unshift(bidderNotif);
    writeNotifications(all);

    // navigate back to auction item
    navigate(`/auction/${auctionId}`);
  };

  return (
    <div className="page-container pt-20 pb-10 px-5">
      <div className="max-w-xl mx-auto bg-white p-6 rounded shadow">
        <h2 className="text-2xl font-semibold mb-4">Dummy Payment</h2>
        <p>Paying for: <strong>{auctionTitle}</strong></p>
        <p>Amount: <strong>₹{amount}</strong></p>
        <div className="mt-6 flex gap-3">
          <button onClick={handleDone} className="bg-blue-600 text-white px-4 py-2 rounded">Done</button>
          <button onClick={() => navigate(-1)} className="px-4 py-2 rounded border">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
