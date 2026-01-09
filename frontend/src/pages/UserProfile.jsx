// frontend/src/pages/UserProfile.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, Link, useNavigate } from "react-router-dom";
import Spinner from "@/custom-components/Spinner";
import {
  updateProfile,
  fetchPublicProfile,
  rateAuctioneer,
} from "@/store/slices/userSlice";
import axios from "axios";

const ORDER_API = "http://localhost:5000/api/v1/order";
axios.defaults.withCredentials = true;

const UserProfile = () => {
  const { id } = useParams(); // optional :id for viewing others
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const {
    user,
    isAuthenticated,
    loading,
    publicProfile,
    publicProfileLoading,
  } = useSelector((state) => state.user);

  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState({
    userName: "",
    phone: "",
    address: "",
  });
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);

  const [bidderStats, setBidderStats] = useState({
    wonCount: 0,
    pendingPayment: [],
    activeDeliveries: [],
    moneySpent: 0,
  });
  const [auctioneerStats, setAuctioneerStats] = useState({
    createdCount: 0,
    pendingShipment: [],
    pendingDelivery: [],
  });

  const [ratingModal, setRatingModal] = useState({
    open: false,
    orderId: null,
    auctionTitle: "",
  });
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState("");

  const viewingOwnProfile = !id || (user && id === user._id);

  // 🔹 NO loadUser dispatch here – ProtectedRoute already ensures auth

  useEffect(() => {
    if (viewingOwnProfile && user) {
      setEditValues({
        userName: user.userName || "",
        phone: user.phone || "",
        address: user.address || "",
      });
      setProfileImagePreview(user.profileImage?.url || null);
    }
  }, [viewingOwnProfile, user]);

  useEffect(() => {
    // when viewing someone else's profile, fetch public profile
    if (id && (!viewingOwnProfile || !user)) {
      dispatch(fetchPublicProfile(id));
    }
  }, [id, viewingOwnProfile, user, dispatch]);

  // Fetch extra stats for own profile
  useEffect(() => {
    const fetchBidderData = async () => {
      if (!user || user.role !== "Bidder") return;
      try {
        const { data } = await axios.get(`${ORDER_API}/my`);
        const all = data.orders || [];
        const wonCount = all.filter(
          (o) => o.paymentStatus !== "failed"
        ).length;
        const pendingPayment = all.filter(
          (o) => o.paymentStatus === "pending"
        );
        const activeDeliveries = all.filter((o) =>
          ["pending", "shipped", "delivered"].includes(o.deliveryStatus)
        );
        const moneySpent = all.reduce(
          (sum, o) =>
            o.paymentStatus === "paid" ? sum + (o.price || 0) : sum,
          0
        );
        setBidderStats({
          wonCount,
          pendingPayment,
          activeDeliveries,
          moneySpent,
        });
      } catch {
        setBidderStats({
          wonCount: 0,
          pendingPayment: [],
          activeDeliveries: [],
          moneySpent: 0,
        });
      }
    };

    const fetchAuctioneerData = async () => {
      if (!user || user.role !== "Auctioneer") return;
      try {
        const { data } = await axios.get(`${ORDER_API}/sales`);
        const all = data.orders || [];
        const createdCount = all.length;
        const pendingShipment = all.filter(
          (o) => o.deliveryStatus === "pending"
        );
        const pendingDelivery = all.filter(
          (o) => o.deliveryStatus === "shipped"
        );
        setAuctioneerStats({
          createdCount,
          pendingShipment,
          pendingDelivery,
        });
      } catch {
        setAuctioneerStats({
          createdCount: 0,
          pendingShipment: [],
          pendingDelivery: [],
        });
      }
    };

    if (viewingOwnProfile) {
      if (user?.role === "Bidder") fetchBidderData();
      if (user?.role === "Auctioneer") fetchAuctioneerData();
    }
  }, [viewingOwnProfile, user]);

  const profileData = useMemo(() => {
    if (viewingOwnProfile) return user;
    return publicProfile;
  }, [viewingOwnProfile, user, publicProfile]);

  const handleEditToggle = () => {
    if (!viewingOwnProfile) return;
    setEditMode((prev) => !prev);
  };

  const handleEditChange = (field, value) => {
    setEditValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleProfileImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setProfileImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!viewingOwnProfile) return;

    const formData = new FormData();
    formData.append("userName", editValues.userName);
    formData.append("phone", editValues.phone);
    formData.append("address", editValues.address);
    if (profileImageFile) {
      formData.append("profileImage", profileImageFile);
    }
    await dispatch(updateProfile(formData));
    setEditMode(false);
  };

  const openRatingForOrder = (order) => {
    setRatingModal({
      open: true,
      orderId: order._id,
      auctionTitle: order.auction?.title || "Auction",
    });
    setRatingValue(5);
    setRatingComment("");
  };

  const submitRating = async () => {
    await dispatch(
      rateAuctioneer({
        orderId: ratingModal.orderId,
        rating: ratingValue,
        comment: ratingComment,
      })
    );
    setRatingModal({ open: false, orderId: null, auctionTitle: "" });
  };

  if (loading && !profileData) {
    return (
      <section className="page-container pt-20 pb-10 min-h-screen flex justify-center items-center">
        <Spinner />
      </section>
    );
  }

  if (!profileData) {
    return (
      <section className="page-container pt-20 pb-10 min-h-screen flex justify-center items-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            Profile not found
          </h2>
          <Link
            to="/"
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-md transition"
          >
            Go to Home
          </Link>
        </div>
      </section>
    );
  }

  const avgRating =
    profileData.ratingCount && profileData.ratingCount > 0
      ? (profileData.ratingSum || profileData.rating || 0) /
        profileData.ratingCount
      : profileData.rating || null;

  return (
    <section className="page-container pt-20 pb-10 min-h-screen flex flex-col gap-8">
      <div className="glass bg-white/80 backdrop-blur-lg rounded-3xl shadow-glow max-w-5xl mx-auto p-8 flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="relative">
            <img
              src={
                profileImagePreview ||
                profileData.profileImage?.url ||
                "/default-avatar.png"
              }
              alt="profile"
              className="w-28 h-28 rounded-full object-cover shadow-lg"
            />
            {viewingOwnProfile && editMode && (
              <label className="absolute bottom-0 right-0 bg-red-600 text-white text-xs px-2 py-1 rounded-full cursor-pointer">
                Change
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfileImageChange}
                />
              </label>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {profileData.userName}
            </h2>
            <p className="text-gray-600 mb-1">
              Role:{" "}
              <span className="font-semibold">{profileData.role}</span>
            </p>
            {avgRating && (
              <p className="text-yellow-600 font-semibold">
                ⭐ {avgRating.toFixed(1)} / 5 (
                {profileData.ratingCount || 0} reviews)
              </p>
            )}
            {profileData.blocked && (
              <p className="text-red-600 font-semibold mt-1">
                This user is currently blocked by admin.
              </p>
            )}
          </div>
          {viewingOwnProfile && (
            <button
              onClick={handleEditToggle}
              className="self-start md:self-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              {editMode ? "Cancel" : "Edit Profile"}
            </button>
          )}
        </div>

        {/* User Details (editable for self) */}
        <form
          onSubmit={handleSaveProfile}
          className="w-full flex flex-col gap-6"
        >
          <h3 className="text-xl font-semibold text-gray-900">
            User Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                label: "Username",
                key: "userName",
                value: viewingValue(
                  editMode,
                  editValues.userName,
                  profileData.userName
                ),
              },
              {
                label: "Email",
                key: "email",
                value: profileData.email,
                readOnly: true,
              },
              {
                label: "Phone",
                key: "phone",
                value: viewingValue(
                  editMode,
                  editValues.phone,
                  profileData.phone
                ),
              },
              {
                label: "Address",
                key: "address",
                value: viewingValue(
                  editMode,
                  editValues.address,
                  profileData.address
                ),
              },
            ].map(({ label, key, value, readOnly }) => (
              <div key={key} className="flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {label}
                </label>
                {editMode && viewingOwnProfile && !readOnly ? (
                  <input
                    type="text"
                    value={value || ""}
                    onChange={(e) => handleEditChange(key, e.target.value)}
                    className="w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600 bg-transparent"
                  />
                ) : (
                  <input
                    type="text"
                    readOnly
                    value={value || "—"}
                    className="w-full p-3 rounded-md border border-gray-300 bg-gray-100 cursor-not-allowed"
                  />
                )}
              </div>
            ))}
          </div>
          {viewingOwnProfile && editMode && (
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-md font-semibold"
              >
                Save Changes
              </button>
            </div>
          )}
        </form>

        {/* Payment Details (only visible to self + Auctioneer) */}
        {viewingOwnProfile && profileData.role === "Auctioneer" && (
          <div className="w-full">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Payment Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  label: "Bank Name",
                  value:
                    profileData.paymentMethods?.bankTransfer?.bankName ||
                    "—",
                },
                {
                  label: "Bank Account Number",
                  value:
                    profileData.paymentMethods?.bankTransfer
                      ?.bankAccountNumber || "—",
                },
                {
                  label: "Bank Account User Name",
                  value:
                    profileData.paymentMethods?.bankTransfer
                      ?.bankAccountName || "—",
                },
                {
                  label: "UPI ID",
                  value: profileData.paymentMethods?.upi?.upiId || "—",
                },
                {
                  label: "PayPal ID",
                  value:
                    profileData.paymentMethods?.paypal?.paypalEmail ||
                    "—",
                },
              ].map(({ label, value }) => (
                <div key={label}>
                  <label className="block text-sm font-medium text-gray-700">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={value}
                    readOnly
                    className="mt-1 w-full p-3 rounded-md border border-gray-300 bg-gray-100 cursor-not-allowed"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Role-specific blocks for own profile */}
        {viewingOwnProfile && profileData.role === "Bidder" && (
          <BidderSection
            stats={bidderStats}
            onPay={(order) =>
              navigate(
                `/payment?auctionId=${order.auction?._id}&amount=${order.price}`
              )
            }
            onRate={openRatingForOrder}
          />
        )}

        {viewingOwnProfile && profileData.role === "Auctioneer" && (
          <AuctioneerSection
            stats={auctioneerStats}
            onViewAuction={(order) =>
              navigate(`/auction/item/${order.auction?._id}`)
            }
          />
        )}

        {/* Minimal trust / genuineness hints when viewing someone else */}
        {!viewingOwnProfile && (
          <PublicTrustHints profile={profileData} />
        )}
      </div>

      {/* Rating modal */}
      {ratingModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-2">
              Rate Auctioneer
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Auction:{" "}
              <span className="font-semibold">
                {ratingModal.auctionTitle}
              </span>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rating (1–5)
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={ratingValue}
                onChange={(e) =>
                  setRatingValue(Number(e.target.value))
                }
                className="w-full p-2 rounded-md border border-gray-300"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comment (optional)
              </label>
              <textarea
                rows={3}
                value={ratingComment}
                onChange={(e) =>
                  setRatingComment(e.target.value)
                }
                className="w-full p-2 rounded-md border border-gray-300 resize-none"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-md border border-gray-300"
                onClick={() =>
                  setRatingModal({
                    open: false,
                    orderId: null,
                    auctionTitle: "",
                  })
                }
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
                onClick={submitRating}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay for public profile fetch */}
      {publicProfileLoading && !viewingOwnProfile && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/20 z-30">
          <Spinner />
        </div>
      )}
    </section>
  );
};

const viewingValue = (editMode, editValue, displayValue) =>
  editMode ? editValue : displayValue;

// Bidder section component
const BidderSection = ({ stats, onPay, onRate }) => {
  return (
    <div className="w-full mt-4">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">
        My Auctions Info (Bidder)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <InfoCard title="Auctions Won" value={stats.wonCount} />
        <InfoCard
          title="Pending Payments"
          value={stats.pendingPayment.length}
        />
        <InfoCard
          title="Active Deliveries"
          value={stats.activeDeliveries.length}
        />
        <InfoCard
          title="Money Spent"
          value={`₹${(stats.moneySpent || 0).toLocaleString()}`}
        />
      </div>

      {/* Pending payment list */}
      {stats.pendingPayment.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Pending Payments</h4>
          <div className="space-y-2">
            {stats.pendingPayment.map((o) => (
              <div
                key={o._id}
                className="flex justify-between items-center p-3 border rounded-lg bg-gray-50"
              >
                <div>
                  <p className="font-semibold">
                    {o.auction?.title || "Auction"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Amount: ₹{o.price}
                  </p>
                </div>
                <button
                  onClick={() => onPay(o)}
                  className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                >
                  Pay Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active deliveries list with status */}
      {stats.activeDeliveries.length > 0 && (
        <div className="mt-6">
          <h4 className="font-semibold mb-2">Delivery Status</h4>
          <div className="space-y-2">
            {stats.activeDeliveries.map((o) => (
              <div
                key={o._id}
                className="p-3 border rounded-lg bg-gray-50 flex flex-col gap-1"
              >
                <p className="font-semibold">
                  {o.auction?.title || "Auction"}
                </p>
                <p className="text-sm text-gray-600">
                  Delivery: {o.deliveryStatus}
                </p>
                {o.deliveryStatus === "completed" && !o.rating && (
                  <button
                    onClick={() => onRate(o)}
                    className="mt-1 self-start text-blue-600 text-sm hover:underline"
                  >
                    Rate Auctioneer
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Auctioneer section
const AuctioneerSection = ({ stats, onViewAuction }) => {
  return (
    <div className="w-full mt-4">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">
        My Auctions Info (Auctioneer)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <InfoCard title="Auctions Created" value={stats.createdCount} />
        <InfoCard
          title="Pending Shipment"
          value={stats.pendingShipment.length}
        />
        <InfoCard
          title="Pending Delivery"
          value={stats.pendingDelivery.length}
        />
      </div>

      {stats.pendingShipment.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Pending Shipment</h4>
          <div className="space-y-2">
            {stats.pendingShipment.map((o) => (
              <div
                key={o._id}
                className="p-3 border rounded-lg bg-gray-50 flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold">
                    {o.auction?.title || "Auction"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Winner: {o.winner?.userName || "Unknown"}
                  </p>
                </div>
                <button
                  onClick={() => onViewAuction(o)}
                  className="text-blue-600 text-sm hover:underline"
                >
                  View Auction
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.pendingDelivery.length > 0 && (
        <div className="mt-6">
          <h4 className="font-semibold mb-2">Pending Delivery</h4>
          <div className="space-y-2">
            {stats.pendingDelivery.map((o) => (
              <div
                key={o._id}
                className="p-3 border rounded-lg bg-gray-50 flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold">
                    {o.auction?.title || "Auction"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Winner: {o.winner?.userName || "Unknown"}
                  </p>
                </div>
                <button
                  onClick={() => onViewAuction(o)}
                  className="text-blue-600 text-sm hover:underline"
                >
                  View Auction
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Trust hints for viewing some other profile
const PublicTrustHints = ({ profile }) => {
  return (
    <div className="mt-4 w-full border-t pt-4">
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Activity Snapshot
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoCard
          title="Auctions Won"
          value={profile.auctionsWon || 0}
        />
        <InfoCard
          title="Money Spent"
          value={`₹${(profile.moneySpent || 0).toLocaleString()}`}
        />
        <InfoCard
          title="Auctions Created"
          value={profile.auctionsCreated || 0}
        />
      </div>
      <p className="mt-2 text-xs text-gray-500">
        This view is limited to help you understand if the user is
        active and consistent without exposing sensitive details.
      </p>
    </div>
  );
};

const InfoCard = ({ title, value, extra }) => (
  <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex flex-col gap-1">
    <span className="text-xs text-gray-500 uppercase tracking-wide">
      {title}
    </span>
    <span className="text-lg font-semibold text-gray-900">
      {value}
    </span>
    {extra && (
      <span className="text-xs text-gray-600 mt-1">{extra}</span>
    )}
  </div>
);

export default UserProfile;
