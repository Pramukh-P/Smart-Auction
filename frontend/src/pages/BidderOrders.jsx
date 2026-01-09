// frontend/src/pages/BidderOrders.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import Spinner from "@/custom-components/Spinner";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5000/api/v1";

const BidderOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    // use full history endpoint, not just active
    axios
      .get(`${API_BASE}/order/my`, { withCredentials: true })
      .then((res) => {
        const list = res.data.orders || [];
        // newest first
        list.sort(
          (a, b) =>
            new Date(b.createdAt || b.paidAt || 0) -
            new Date(a.createdAt || a.paidAt || 0)
        );
        setOrders(list);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  if (!orders.length) {
    return (
      <div className="text-center text-lg mt-10 text-gray-600">
        No orders yet.
      </div>
    );
  }

  return (
    <section className="page-container pt-20 max-w-5xl mx-auto">
      <h2 className="text-3xl font-extrabold mb-8 text-center">
        My Orders
      </h2>
      <div className="overflow-x-auto rounded-2xl shadow-glow bg-white/80 backdrop-blur-lg">
        <table className="min-w-full text-left rounded-2xl border-collapse bg-white">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="py-3 px-5">Auction Title</th>
              <th className="py-3 px-5">Amount</th>
              <th className="py-3 px-5">Payment Status</th>
              <th className="py-3 px-5">Shipping</th>
              <th className="py-3 px-5">Delivery</th>
              <th className="py-3 px-5">Details</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const auction = order.auction;
              const key = order.id || order._id;
              return (
                <tr key={key} className="border-b border-gray-300">
                  <td className="py-3 px-5">
                    {auction?.title || "Auction"}
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
                          {order.shipmentDetails.courier || "NA"}
                        </div>
                        <div>
                          Tracking:{" "}
                          {order.shipmentDetails.trackingId || "NA"}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-500">
                        Not shipped yet
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-5">
                    <span
                      className={`font-bold ${
                        ["completed", "delivered"].includes(
                          order.deliveryStatus
                        )
                          ? "text-green-600"
                          : order.deliveryStatus === "shipped"
                          ? "text-blue-700"
                          : "text-yellow-600"
                      }`}
                    >
                      {order.deliveryStatus}
                    </span>
                  </td>
                  <td className="py-3 px-5">
                    <button
                      className="text-xs px-4 py-2 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
                      onClick={() =>
                        navigate(`/order/${order.id || order._id}`)
                      }
                    >
                      View Order
                    </button>
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

export default BidderOrders;
