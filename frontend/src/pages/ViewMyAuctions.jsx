// frontend/src/pages/ViewMyAuctions.jsx
import CardTwo from "@/custom-components/CardTwo";
import Spinner from "@/custom-components/Spinner";
import { getMyAuctionItems } from "@/store/slices/auctionSlice";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Drawer from "@/custom-components/Drawer";

const ViewMyAuctions = () => {
  const { myAuctions, loading } = useSelector((state) => state.auction);
  const { user, isAuthenticated } = useSelector((state) => state.user);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [drawerAuctionId, setDrawerAuctionId] = React.useState(null);

  const dispatch = useDispatch();
  const navigateTo = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || user.role !== "Auctioneer") {
      navigateTo("/login");
    } else {
      dispatch(getMyAuctionItems());
    }
  }, [dispatch, isAuthenticated, user, navigateTo]);

  return (
    <section className="page-container pt-20 pb-10 min-h-screen flex flex-col">
      <h1 className="text-red-600 text-4xl md:text-6xl font-extrabold mb-10 text-center">
        My Auctions
      </h1>
      {loading ? (
        <div className="flex justify-center items-center flex-grow">
          <Spinner />
        </div>
      ) : myAuctions.length > 0 ? (
        <div className="flex flex-wrap gap-8 justify-center">
          {myAuctions.map((auction) => (
            <CardTwo
              key={auction._id}
              id={auction._id}
              title={auction.title}
              startingBid={auction.startingBid}
              startTime={auction.startTime}
              endTime={auction.endTime}
              imgSrc={auction.image?.url}
              onRepublish={() => {
                setDrawerAuctionId(auction._id);
                setDrawerOpen(true);
              }}
            />
          ))}
          <Drawer
            id={drawerAuctionId}
            openDrawer={drawerOpen}
            setOpenDrawer={setDrawerOpen}
            loading={loading}
          />
        </div>
      ) : (
        <h3 className="text-gray-600 text-2xl font-semibold text-center mt-16">
          You have not posted any auction.
        </h3>
      )}
    </section>
  );
};

export default ViewMyAuctions;
