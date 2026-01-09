// frontend/src/pages/OrderDetails.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Spinner from "@/custom-components/Spinner";
import { useSelector } from "react-redux";

const API_BASE = "http://localhost:5000/api/v1";

const STEP_CONFIG = [
  { key: "created", label: "Order Created" },
  { key: "payment", label: "Payment" },
  { key: "shipment", label: "Shipment" },
  { key: "delivery", label: "Delivery" },
  { key: "payout", label: "Payout" },
];

const getStepIndexFromOrder = (order) => {
  if (!order) return 0;
  if (order.payoutStatus === "done") return 4;
  if (["delivered", "completed"].includes(order.deliveryStatus)) return 3;
  if (order.deliveryStatus === "shipped") return 2;
  if (["paid", "holding"].includes(order.paymentStatus)) return 1;
  return 0;
};

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.user);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);

  const [paymentLoading, setPaymentLoading] = useState(false);

  // complaint chat state
  const [complaintText, setComplaintText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [complaintLoading, setComplaintLoading] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);

  // shipment form for auctioneer (inline)
  const [shipmentCourier, setShipmentCourier] = useState("");
  const [shipmentTracking, setShipmentTracking] = useState("");
  const [shipmentNotes, setShipmentNotes] = useState("");
  const [shipmentUpdating, setShipmentUpdating] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchOrder = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/order/${id}`, {
          withCredentials: true,
        });
        if (!isMounted) return;
        const fetched = res.data.order;
        setOrder(fetched);
        setActiveStep(getStepIndexFromOrder(fetched));

        if (fetched.shipmentDetails) {
          setShipmentCourier(fetched.shipmentDetails.courier || "");
          setShipmentTracking(fetched.shipmentDetails.trackingId || "");
          setShipmentNotes(fetched.shipmentDetails.notes || "");
        }
      } catch {
        if (!isMounted) return;
        setOrder(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchOrder();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const auction = order?.auction;
  const isProblem =
    order?.deliveryStatus === "problem" ||
    order?.complaintStatus === "open" ||
    order?.complaintStatus === "blocked";

  const stepStates = useMemo(
    () =>
      STEP_CONFIG.map((step, idx) => ({
        ...step,
        isCompleted: idx < activeStep,
        isCurrent: idx === activeStep,
      })),
    [activeStep]
  );

  const role =
    user &&
    order &&
    String(order.winner?.id || order.winner) === String(user.id)
      ? "Bidder"
      : user &&
        order &&
        String(order.auctioneer?.id || order.auctioneer) === String(user.id)
      ? "Auctioneer"
      : user?.role || "Guest";

  const canBidderPay =
    role === "Bidder" &&
    order &&
    order.paymentStatus === "pending";

  const canAuctioneerUpdateShipment =
    role === "Auctioneer" &&
    order &&
    order.paymentStatus === "paid" &&
    order.deliveryStatus === "pending";

  const paymentInfo = order?.paymentInfo || {};
  const complaintMessages = Array.isArray(order?.complaints)
    ? order.complaints
    : [];

  const refreshOrder = async () => {
    const res = await axios.get(
      `${API_BASE}/order/${order.id || order._id}`,
      { withCredentials: true }
    );
    const updated = res.data.order;
    setOrder(updated);
    setActiveStep(getStepIndexFromOrder(updated));
  };

  // ---------- Razorpay Pay Now ----------
  const handlePayNow = async () => {
    if (!order || !auction) return;
    if (!window.Razorpay) {
      alert("Razorpay script not loaded.");
      return;
    }
    setPaymentLoading(true);
    try {
      const baseAmount =
        order.price ?? auction.finalBidAmount ?? 0;
      if (!baseAmount || baseAmount <= 0) {
        alert("Invalid amount for payment.");
        setPaymentLoading(false);
        return;
      }
      const amountInPaise = Math.round(baseAmount * 100);

      const createRes = await fetch(`${API_BASE}/payment/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: amountInPaise,
          auctionId: auction.id || auction._id,
          orderId: order.id || order._id,
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok || !createData.success) {
        throw new Error(createData.message || "Failed to initiate payment.");
      }

      const razorOrder = createData.order;
      if (!razorOrder || !razorOrder.id || !razorOrder.amount) {
        throw new Error("Payment order not returned from server.");
      }

      const options = {
        key: createData.key,
        amount: razorOrder.amount,
        currency: razorOrder.currency || "INR",
        name: "SmartAuction",
        description: `Payment for ${auction.title}`,
        order_id: razorOrder.id,
        handler: async (response) => {
          try {
            const verifyRes = await fetch(
              `${API_BASE}/payment/verify-payment`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  auctionId: auction.id || auction._id,
                  orderId: order.id || order._id,
                }),
              }
            );
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              alert(
                verifyData.message ||
                  "Payment verification failed. Please contact support."
              );
              return;
            }
            const updated = verifyData.order;
            setOrder(updated);
            setActiveStep(getStepIndexFromOrder(updated));
            alert(
              "Payment successful. Amount is now on hold until delivery is completed."
            );
          } catch {
            alert("Payment verification error. Contact support.");
          } finally {
            setPaymentLoading(false);
          }
        },
        prefill: {
          email: user?.email,
          contact: user?.phone,
          name: user?.userName,
        },
        theme: { color: "#D6482B" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Payment initiation error", err);
      alert(err.message || "Payment initiation failed. Try again later.");
      setPaymentLoading(false);
    }
  };

  // ---------- Complaint APIs ----------
  const handleRaiseComplaint = async () => {
    if (!complaintText.trim() || !order) return;
    setComplaintLoading(true);
    try {
      await axios.post(
        `${API_BASE}/order/complaint`,
        {
          orderId: order.id || order._id,
          reason: complaintText.trim(),
        },
        { withCredentials: true }
      );
      setComplaintText("");
      await refreshOrder();
      alert("Complaint submitted.");
    } catch (err) {
      alert(
        err?.response?.data?.message ||
          "Failed to submit complaint. Please try again."
      );
    } finally {
      setComplaintLoading(false);
    }
  };

  const handleReplyComplaint = async () => {
    if (!replyText.trim() || !order) return;
    setReplyLoading(true);
    try {
      await axios.post(
        `${API_BASE}/order/complaint/reply`,
        {
          orderId: order.id || order._id,
          reply: replyText.trim(),
        },
        { withCredentials: true }
      );
      setReplyText("");
      await refreshOrder();
      alert("Reply posted.");
    } catch (err) {
      alert(
        err?.response?.data?.message ||
          "Failed to post reply. Please try again."
      );
    } finally {
      setReplyLoading(false);
    }
  };

  // ---------- Shipment inline update (auctioneer) ----------
  const handleUpdateShipment = async () => {
    if (!order || !shipmentCourier.trim() || !shipmentTracking.trim()) {
      alert("Please enter both courier and tracking ID.");
      return;
    }
    setShipmentUpdating(true);
    try {
      const res = await axios.put(
        `${API_BASE}/order/shipment/${order.id || order._id}`,
        {
          courier: shipmentCourier.trim(),
          trackingId: shipmentTracking.trim(),
          notes: shipmentNotes.trim(),
        },
        { withCredentials: true }
      );
      const updated = res.data.order;
      setOrder(updated);
      setActiveStep(getStepIndexFromOrder(updated));
      alert("Shipment updated and email sent to bidder with tracking details.");
    } catch (err) {
      alert(
        err?.response?.data?.message ||
          "Failed to update shipment details. Please try again."
      );
    } finally {
      setShipmentUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container pt-20 pb-10 min-h-screen flex justify-center items-center">
        <Spinner />
      </div>
    );
  }

  if (!order) {
    return (
      <section className="page-container pt-20 pb-10 min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">
          Order not found
        </h1>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-2 rounded-md bg-red-600 text-white font-semibold hover:bg-red-700 transition"
        >
          Go Back
        </button>
      </section>
    );
  }

  return (
    <section className="page-container pt-20 pb-10 min-h-screen flex flex-col items-center">
      <div className="w-full max-w-5xl glass bg-white/80 backdrop-blur-lg rounded-3xl shadow-glow p-6 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-red-600 mb-2">
              Order Details
            </h1>
            <p className="text-gray-600 text-sm">
              Order ID:{" "}
              <span className="font-mono">
                {order.id || order._id}
              </span>
            </p>
            <p className="text-gray-500 text-xs mt-1">
              You are viewing as{" "}
              <span className="font-semibold">{role}</span>.
            </p>
          </div>
          <div>
            <button
              onClick={() =>
                auction
                  ? navigate(`/auction/item/${auction.id || auction._id}`)
                  : null
              }
              disabled={!auction}
              className="px-4 py-2 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              View Auction Item
            </button>
          </div>
        </div>

        {/* Progress Stepper */}
        <div className="w-full">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Order Progress
          </h2>
          <div className="relative flex items-center">
            <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-[3px] bg-gray-200 rounded-full" />
            <div
              className="absolute inset-y-1/2 -translate-y-1/2 left-4 rounded-full h-[3px] bg-gradient-to-r from-red-500 via-orange-500 to-green-500 transition-all duration-700 ease-out"
              style={{
                width:
                  stepStates.length > 1
                    ? `${(activeStep / (stepStates.length - 1)) * 100}%`
                    : 0,
              }}
            />
            <div className="relative z-10 flex justify-between w-full px-2">
              {stepStates.map((step, idx) => (
                <div
                  key={step.key}
                  className="flex flex-col items-center text-center w-full"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-md transition-all duration-300 ${
                      step.isCompleted
                        ? "bg-green-500 text-white scale-110"
                        : step.isCurrent
                        ? "bg-red-500 text-white scale-110"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span
                    className={`mt-1 text-xs md:text-sm font-medium ${
                      step.isCurrent
                        ? "text-red-600"
                        : step.isCompleted
                        ? "text-green-600"
                        : "text-gray-500"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main info grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Auction info */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">
              Auction Information
            </h3>
            {auction?.image?.url && (
              <img
                src={auction.image.url}
                alt={auction.title}
                className="w-full max-h-80 object-cover rounded-2xl shadow-md"
              />
            )}
            <div className="space-y-2">
              <p className="text-lg font-bold text-gray-900">
                {auction?.title || "Auction item"}
              </p>
              <p className="text-gray-700 text-sm whitespace-pre-line">
                {auction?.description || "No description available."}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-semibold text-gray-700">
                    Category
                  </span>{" "}
                  <span>{auction?.category || "N/A"}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">
                    Condition
                  </span>{" "}
                  <span>{auction?.condition || "N/A"}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">
                    Start Time
                  </span>{" "}
                  <span>
                    {auction?.startTime
                      ? new Date(auction.startTime).toLocaleString()
                      : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">
                    End Time
                  </span>{" "}
                  <span>
                    {auction?.endTime
                      ? new Date(auction.endTime).toLocaleString()
                      : "N/A"}
                  </span>
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-700">
                <p>
                  <span className="font-semibold">Winner:</span>{" "}
                  {order.winner?.userName || "N/A"}
                </p>
                <p>
                  <span className="font-semibold">Auctioneer:</span>{" "}
                  {order.auctioneer?.userName || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Order status + Payment + Shipment + Complaint */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">
              Order Status
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-gray-500 text-xs uppercase tracking-wide">
                  Amount
                </p>
                <p className="text-lg font-bold text-blue-700">
                  ₹{order.price ?? auction?.finalBidAmount ?? 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-gray-500 text-xs uppercase tracking-wide">
                  Payment Status
                </p>
                <p
                  className={`text-sm font-semibold ${
                    order.paymentStatus === "paid"
                      ? "text-green-600"
                      : order.paymentStatus === "holding"
                      ? "text-yellow-600"
                      : order.paymentStatus === "failed"
                      ? "text-red-600"
                      : "text-gray-700"
                  }`}
                >
                  {order.paymentStatus}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-gray-500 text-xs uppercase tracking-wide">
                  Delivery Status
                </p>
                <p
                  className={`text-sm font-semibold ${
                    ["delivered", "completed"].includes(order.deliveryStatus)
                      ? "text-green-600"
                      : order.deliveryStatus === "shipped"
                      ? "text-blue-700"
                      : order.deliveryStatus === "problem"
                      ? "text-red-600"
                      : "text-yellow-600"
                  }`}
                >
                  {order.deliveryStatus}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-gray-500 text-xs uppercase tracking-wide">
                  Complaint Status
                </p>
                <p
                  className={`text-sm font-semibold ${
                    order.complaintStatus === "open"
                      ? "text-yellow-600"
                      : order.complaintStatus === "blocked"
                      ? "text-red-600"
                      : order.complaintStatus === "resolved"
                      ? "text-green-600"
                      : "text-gray-700"
                  }`}
                >
                  {order.complaintStatus}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-gray-500 text-xs uppercase tracking-wide">
                  Payout Status
                </p>
                <p
                  className={`text-sm font-semibold ${
                    order.payoutStatus === "done"
                      ? "text-green-600"
                      : order.payoutStatus === "processing"
                      ? "text-blue-700"
                      : order.payoutStatus === "failed"
                      ? "text-red-600"
                      : "text-gray-700"
                  }`}
                >
                  {order.payoutStatus}
                </p>
                {role === "Auctioneer" && order.paymentStatus === "paid" && (
                  <p className="text-xs text-gray-500 mt-1">
                    Payment is held by admin until delivery is completed
                    (5% commission applies).
                  </p>
                )}
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-gray-500 text-xs uppercase tracking-wide">
                  Commission
                </p>
                <p className="text-sm font-semibold text-gray-800">
                  ₹{order.commissionAmount ?? 0}{" "}
                  <span className="text-xs text-gray-500">
                    ({(order.commissionRate ?? 0.05) * 100}%)
                  </span>
                </p>
              </div>
            </div>

            {/* Payment details / Pay Now */}
            <div className="mt-4 p-4 rounded-2xl bg-gray-50 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Payment Details
              </h4>
              {["paid", "holding"].includes(order.paymentStatus) ? (
                <div className="text-sm space-y-1 text-gray-700">
                  <p>
                    <span className="font-semibold">Transaction ID:</span>{" "}
                    {paymentInfo.transactionId || "N/A"}
                  </p>
                  <p>
                    <span className="font-semibold">Paid Amount:</span>{" "}
                    ₹{paymentInfo.paidAmount ?? order.price ?? 0}
                  </p>
                  <p>
                    <span className="font-semibold">Paid Via:</span>{" "}
                    {paymentInfo.paidVia || "Razorpay (test)"}
                  </p>
                  <p>
                    <span className="font-semibold">Payer Name:</span>{" "}
                    {paymentInfo.paidByName ||
                      order.winner?.userName ||
                      "N/A"}
                  </p>
                  <p>
                    <span className="font-semibold">Paid At:</span>{" "}
                    {paymentInfo.paidAt || order.paidAt
                      ? new Date(
                          paymentInfo.paidAt || order.paidAt
                        ).toLocaleString()
                      : "N/A"}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Payment not completed yet.
                </p>
              )}
              {canBidderPay && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handlePayNow}
                    disabled={paymentLoading}
                    className="px-4 py-2 rounded-md bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {paymentLoading ? "Processing..." : "Pay Now"}
                  </button>
                  <p className="mt-1 text-xs text-gray-500">
                    Uses Razorpay test mode, same secure flow as from the
                    auction page.
                  </p>
                </div>
              )}
            </div>

            {/* Shipment */}
            <div className="mt-4 p-4 rounded-2xl bg-gray-50 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Shipment Details
              </h4>
              {order.shipmentDetails ? (
                <div className="text-sm space-y-1 text-gray-700">
                  <p>
                    <span className="font-semibold">Courier:</span>{" "}
                    {order.shipmentDetails.courier || "N/A"}
                  </p>
                  <p>
                    <span className="font-semibold">Tracking ID:</span>{" "}
                    {order.shipmentDetails.trackingId || "N/A"}
                  </p>
                  <p>
                    <span className="font-semibold">Shipped At:</span>{" "}
                    {order.shipmentDetails.shippedDate
                      ? new Date(
                          order.shipmentDetails.shippedDate
                        ).toLocaleString()
                      : "N/A"}
                  </p>
                  {order.shipmentDetails.notes && (
                    <p>
                      <span className="font-semibold">Notes:</span>{" "}
                      {order.shipmentDetails.notes}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Shipment not processed yet.
                </p>
              )}

              {canAuctioneerUpdateShipment && (
                <div className="mt-3 space-y-2 text-xs">
                  <p className="text-gray-600 font-semibold">
                    Update shipment directly from here:
                  </p>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Courier (e.g., Ekart, DTDC)"
                    value={shipmentCourier}
                    onChange={(e) => setShipmentCourier(e.target.value)}
                  />
                  <input
                    className="w-full border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Tracking ID"
                    value={shipmentTracking}
                    onChange={(e) => setShipmentTracking(e.target.value)}
                  />
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Optional notes"
                    rows={2}
                    value={shipmentNotes}
                    onChange={(e) => setShipmentNotes(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleUpdateShipment}
                    disabled={shipmentUpdating}
                    className="mt-1 px-4 py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition disabled:opacity-60"
                  >
                    {shipmentUpdating ? "Saving..." : "Update Shipment"}
                  </button>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Once updated, both you and the bidder can see shipment
                    progress, and the admin will later confirm delivery.
                  </p>
                </div>
              )}
            </div>

            {/* Complaint conversation */}
            <div className="mt-4 p-4 rounded-2xl bg-gray-50 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Order Issues Conversation
              </h4>
              {complaintMessages.length > 0 ? (
                <div className="max-h-48 overflow-y-auto mb-3 space-y-2 text-xs">
                  {complaintMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`px-3 py-2 rounded-xl ${
                        msg.role === "Bidder"
                          ? "bg-blue-50 text-blue-900"
                          : msg.role === "Auctioneer"
                          ? "bg-emerald-50 text-emerald-900"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      <div className="flex justify-between">
                        <span className="font-semibold">
                          {msg.role || "User"}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {msg.createdAt
                            ? new Date(msg.createdAt).toLocaleString()
                            : ""}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px]">{msg.message}</p>
                      {msg.replyMessage && (
                        <p className="mt-1 text-[11px] text-gray-700">
                          <span className="font-semibold">Reply:</span>{" "}
                          {msg.replyMessage}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 mb-2">
                  No complaints raised yet for this order.
                </p>
              )}

              {role === "Bidder" && (
                <div className="mt-2">
                  <textarea
                    className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red-500"
                    rows={3}
                    placeholder="Describe your problem with this order (e.g., wrong item, damaged product, delivery delay)..."
                    value={complaintText}
                    onChange={(e) => setComplaintText(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleRaiseComplaint}
                    disabled={complaintLoading || !complaintText.trim()}
                    className="mt-2 px-4 py-1.5 rounded-md bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition disabled:opacity-60"
                  >
                    {complaintLoading ? "Sending..." : "Raise Complaint"}
                  </button>
                </div>
              )}

              {role === "Auctioneer" &&
                order.complaintStatus === "open" && (
                  <div className="mt-3">
                    <textarea
                      className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      rows={3}
                      placeholder="Reply to bidder's complaint..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={handleReplyComplaint}
                      disabled={replyLoading || !replyText.trim()}
                      className="mt-2 px-4 py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition disabled:opacity-60"
                    >
                      {replyLoading ? "Posting..." : "Reply to Complaint"}
                    </button>
                  </div>
                )}

              {isProblem && (
                <div className="mt-2 p-4 rounded-2xl bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700 font-semibold">
                    There is an open issue reported on this order. Please use
                    the complaint conversation above to resolve it, or contact
                    admin if it cannot be solved.
                  </p>
                </div>
              )}
            </div>

            {/* Payout summary for auctioneer after completion */}
            {role === "Auctioneer" &&
              ["delivered", "completed"].includes(order.deliveryStatus) && (
                <div className="mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
                  <p className="font-semibold">
                    Delivery completed & payout processed.
                  </p>
                  <p className="mt-1">
                    Commission amount to admin:{" "}
                    <span className="font-bold">
                      ₹{order.commissionAmount ?? 0}
                    </span>
                    .
                  </p>
                  <p>
                    Net payout to you:{" "}
                    <span className="font-bold">
                      ₹{order.payoutAmount ?? 0}
                    </span>{" "}
                    ({(order.commissionRate ?? 0.05) * 100}% commission).
                  </p>
                  {order.payoutTxId && (
                    <p className="mt-1 text-xs text-emerald-800">
                      Payout TX ID: {order.payoutTxId}
                    </p>
                  )}
                </div>
              )}
          </div>
        </div>

        {/* Bottom actions */}
        <div className="flex flex-wrap justify-between gap-3 pt-2">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2 rounded-md border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition"
          >
            Back
          </button>
          {auction && (
            <button
              onClick={() =>
                navigate(`/auction/item/${auction.id || auction._id}`)
              }
              className="px-5 py-2 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
            >
              Go to Auction Page
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default OrderDetails;
