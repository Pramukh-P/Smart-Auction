// frontend/src/pages/Dashboard/sub-components/AdminDeliveryOrders.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";
axios.defaults.withCredentials = true;

const AdminDeliveryOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null); // orderId

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        // get all paid orders, backend already filters by paymentStatus = "paid"
        const { data } = await axios.get(`${API_BASE}/order/admin/all`, {
          withCredentials: true,
        });
        const list = (data.orders || []).filter(
          (o) =>
            o.paymentStatus === "paid" &&
            o.deliveryStatus === "shipped"
        );
        list.sort(
          (a, b) =>
            new Date(b.shipmentDetails?.shippedDate || b.createdAt || 0) -
            new Date(a.shipmentDetails?.shippedDate || a.createdAt || 0)
        );
        setOrders(list);
      } catch (err) {
        console.error("Failed to fetch admin orders", err);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const confirmDelivery = async (orderId) => {
    if (
      !window.confirm(
        "Confirm delivery and release payout to auctioneer? This cannot be undone."
      )
    ) {
      return;
    }

    setProcessing(orderId);
    try {
      const { data } = await axios.put(
        `${API_BASE}/order/delivery/${orderId}`,
        {},
        { withCredentials: true }
      );
      alert(data.message || "Delivery confirmed and payout processed.");

      setOrders((prev) =>
        prev.map((o) =>
          String(o._id || o.id) === String(orderId)
            ? {
                ...o,
                deliveryStatus: "completed",
                payoutStatus: "done",
              }
            : o
        )
      );
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Failed to confirm delivery. Check server logs."
      );
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <p className="text-center py-6">Loading orders pending delivery...</p>
    );
  }

  if (!orders.length) {
    return (
      <p className="text-center py-6">
        No orders pending delivery.
      </p>
    );
  }

  return (
    <section className="page-container max-w-6xl mx-auto p-4">
      <h2 className="text-3xl font-bold mb-6 text-center">
        Orders Pending Delivery
      </h2>
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="border border-gray-300 px-4 py-2">
              Auction Title
            </th>
            <th className="border border-gray-300 px-4 py-2">Winner</th>
            <th className="border border-gray-300 px-4 py-2">
              Final Bid
            </th>
            <th className="border border-gray-300 px-4 py-2">
              Delivery Status
            </th>
            <th className="border border-gray-300 px-4 py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const key = order._id || order.id;
            const auction = order.auction;
            return (
              <tr key={key} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-2">
                  {auction?.title || "Auction"}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <div className="font-semibold">
                    {order.winner?.userName || "N/A"}
                  </div>
                  <div className="text-sm text-gray-600">
                    {order.winner?.email || "N/A"}
                  </div>
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  ₹{order.price ?? auction?.finalBidAmount ?? 0}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <div className="font-semibold">
                    {order.deliveryStatus}
                  </div>
                  <div className="text-sm text-gray-600">
                    {order.shipmentDetails ? (
                      <>
                        <div>
                          Courier:{" "}
                          {order.shipmentDetails.courier || "-"}
                        </div>
                        <div>
                          Tracking:{" "}
                          {order.shipmentDetails.trackingId || "-"}
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-500">
                        Not shipped yet
                      </span>
                    )}
                  </div>
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <button
                    className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 disabled:opacity-60"
                    onClick={() => confirmDelivery(key)}
                    disabled={processing === key}
                  >
                    {processing === key
                      ? "Processing..."
                      : "Confirm Delivery"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
};

export default AdminDeliveryOrders;
