// frontend/src/pages/AuctioneerOrders.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import Spinner from "@/custom-components/Spinner";
import { useNavigate } from "react-router-dom";

axios.defaults.withCredentials = true;

const AuctioneerOrders = () => {
  const [myAuctions, setMyAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    axios
      .get("http://localhost:5000/api/v1/order/sales", {
        withCredentials: true,
      })
      .then((res) => {
        const list = res.data.orders || res.data.auctions || [];
        list.sort(
          (a, b) =>
            new Date(b.createdAt || b.paidAt || 0) -
            new Date(a.createdAt || a.paidAt || 0)
        );
        setMyAuctions(list);
      })
      .catch(() => setMyAuctions([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  if (!myAuctions.length) {
    return (
      <div className="text-center text-lg mt-10 text-gray-600">
        No auctions/orders to manage yet.
      </div>
    );
  }

  return (
    <section className="page-container pt-20 max-w-5xl mx-auto">
      <h2 className="text-3xl font-extrabold mb-8 text-center">
        My Auction Orders
      </h2>
      <div className="overflow-x-auto rounded-2xl shadow-glow bg-white/80 backdrop-blur-lg">
        <table className="min-w-full text-left rounded-2xl border-collapse bg-white">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="py-3 px-5">Auction Title</th>
              <th className="py-3 px-5">Winner</th>
              <th className="py-3 px-5">Final Amount</th>
              <th className="py-3 px-5">Payment</th>
              <th className="py-3 px-5">Shipment</th>
              <th className="py-3 px-5">Payout</th>
              <th className="py-3 px-5">Order</th>
            </tr>
          </thead>
          <tbody>
            {myAuctions.map((order) => {
              const key = order.id || order._id;
              const auction = order.auction;
              const orderId = order.id || order._id;

              return (
                <tr key={key} className="border-b border-gray-300">
                  <td className="py-3 px-5">
                    {auction?.title || "Auction"}
                  </td>
                  <td className="py-3 px-5">
                    <div className="font-semibold">
                      {order.winner?.userName || "-"}
                    </div>
                    <div className="text-sm text-gray-600">
                      {order.winner?.email || "-"}
                    </div>
                  </td>
                  <td className="py-3 px-5">
                    ₹{order.price ?? auction?.finalBidAmount ?? 0}
                  </td>
                  <td className="py-3 px-5">
                    <span
                      className={`font-semibold ${
                        order.paymentStatus === "paid"
                          ? "text-green-600"
                          : order.paymentStatus === "holding"
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="py-3 px-5">
                    {order.shipmentDetails &&
                    (order.shipmentDetails.courier ||
                      order.shipmentDetails.trackingId) ? (
                      <div>
                        <div>
                          Courier:{" "}
                          {order.shipmentDetails.courier || "-"}
                        </div>
                        <div>
                          Tracking:{" "}
                          {order.shipmentDetails.trackingId || "-"}
                        </div>
                        <div className="text-blue-600 text-xs font-semibold">
                          {order.deliveryStatus}
                        </div>
                      </div>
                    ) : (
                      <div className="text-blue-600 text-xs font-semibold">
                        {order.deliveryStatus || "pending"}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-5">
                    <div>
                      {order.payoutStatus === "done" ? (
                        <span className="text-green-600 font-bold">
                          Paid
                        </span>
                      ) : order.deliveryStatus === "completed" ? (
                        <span className="text-yellow-600 font-semibold">
                          Processing
                        </span>
                      ) : (
                        <span className="text-gray-600 font-semibold">
                          Pending
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      ₹{order.payoutAmount || 0}
                    </div>
                    <div className="text-xs text-gray-400">
                      Comm ₹{order.commissionAmount || 0}
                    </div>
                  </td>
                  <td className="py-3 px-5">
                    {orderId ? (
                      <button
                        onClick={() => navigate(`/order/${orderId}`)}
                        className="px-3 py-1 rounded-md bg-gray-800 text-white text-xs font-semibold hover:bg-gray-900"
                      >
                        View Order
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">
                        Order not found
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default AuctioneerOrders;
