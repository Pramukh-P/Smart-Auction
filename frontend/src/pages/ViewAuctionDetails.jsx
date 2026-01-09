// frontend/src/pages/ViewAuctionDetails.jsx
import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAuctionDetail } from "@/store/slices/auctionSlice";
import { useParams, useNavigate } from "react-router-dom";
import Spinner from "@/custom-components/Spinner";

const ViewAuctionDetails = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { auctionDetail, loading, auctionBidders } = useSelector((state) => state.auction);
  const { user, isAuthenticated } = useSelector((state) => state.user);

  useEffect(() => {
    if (!isAuthenticated || user.role !== "Auctioneer") {
      navigate("/login");
      return;
    }
    dispatch(getAuctionDetail(id));
  }, [dispatch, id, isAuthenticated, user, navigate]);

  const sortedBidders = useMemo(() => {
    if (!Array.isArray(auctionBidders)) return [];
    return [...auctionBidders].sort((a, b) => (b.amount || 0) - (a.amount || 0));
  }, [auctionBidders]);

  if (loading) {
    return (
      <div className="page-container pt-20 pb-10 min-h-screen flex justify-center items-center">
        <Spinner />
      </div>
    );
  }

  if (!auctionDetail || !auctionDetail._id) {
    return (
      <div className="page-container pt-20 pb-10 min-h-screen flex justify-center items-center">
        <p className="text-center text-gray-700">Auction details not found.</p>
      </div>
    );
  }

  return (
    <section className="page-container pt-20 pb-10 min-h-screen max-w-5xl mx-auto">
      <h1 className="text-red-600 text-4xl md:text-6xl font-extrabold mb-12 text-center">
        Auction Details
      </h1>

      <div className="glass bg-white/80 backdrop-blur-lg rounded-3xl shadow-glow p-8">
        <h2 className="text-3xl font-bold mb-6 text-gray-900">{auctionDetail.title}</h2>

        {auctionDetail.image?.url && (
          <img
            src={auctionDetail.image.url}
            alt={auctionDetail.title}
            className="w-full max-h-96 object-cover rounded-2xl mb-6 shadow"
          />
        )}

        <p className="mb-4 whitespace-pre-line text-gray-700">{auctionDetail.description}</p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div>
            <strong>Category:</strong> {auctionDetail.category || "N/A"}
          </div>
          <div>
            <strong>Condition:</strong> {auctionDetail.condition || "N/A"}
          </div>
          <div>
            <strong>Starting Bid:</strong> ₹{auctionDetail.startingBid ?? "N/A"}
          </div>
          <div>
            <strong>Start Time:</strong> {new Date(auctionDetail.startTime).toLocaleString()}
          </div>
          <div>
            <strong>End Time:</strong> {new Date(auctionDetail.endTime).toLocaleString()}
          </div>
        </div>

        <h3 className="text-2xl font-semibold mb-4">Bidders</h3>
        {sortedBidders.length === 0 ? (
          <p>No bids yet.</p>
        ) : (
          <ul className="space-y-3 max-h-80 overflow-y-auto">
            {sortedBidders.map((bidder, i) => (
              <li
                key={bidder._id || i}
                className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg shadow-sm hover:bg-gray-100 transition"
              >
                {bidder.profileImage && (
                  <img
                    src={bidder.profileImage}
                    alt={bidder.userName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                )}
                <div className="flex-1">
                  <p className="font-semibold">{bidder.userName}</p>
                  <p className="text-gray-500 text-sm">
                    Bid: ₹{bidder.amount} | {new Date(bidder.createdAt || Date.now()).toLocaleString()}
                  </p>
                </div>
                {i === 0 && <span className="text-green-600 font-bold">Highest Bidder</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default ViewAuctionDetails;
