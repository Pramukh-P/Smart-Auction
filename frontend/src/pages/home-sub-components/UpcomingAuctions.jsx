// frontend/src/pages/home-sub-components/UpcomingAuctions.jsx
import React from "react";
import { RiAuctionFill } from "react-icons/ri";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

const UpcomingAuctions = () => {
  const { allAuctions } = useSelector((state) => state.auction);

  const today = new Date();
  const todayString = today.toDateString();
  const auctionsStartingToday = allAuctions.filter((item) => {
    const auctionDate = new Date(item.startTime);
    return auctionDate.toDateString() === todayString;
  });

  return (
    <section className="my-10 w-full max-w-6xl mx-auto">
      <h3 className="text-2xl md:text-3xl font-semibold gradient-text mb-6 text-center">
        Auctions For Today
      </h3>
      <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Summary card for today's auctions */}
        <div className="glass rounded-2xl shadow-glow p-6 flex flex-col items-center justify-center bg-white/80 backdrop-blur-lg">
          <span className="rounded-full bg-gradient-to-r from-blue-600 to-blue-500 text-white w-fit p-4 shadow-glow mb-4">
            <RiAuctionFill className="w-7 h-7" />
          </span>
          <h3 className="text-2xl font-bold gradient-text mb-1">Auctions For</h3>
          <h3 className="text-xl font-semibold text-blue-600 mb-2">Today</h3>
          <span className="text-sm text-gray-500">
            {auctionsStartingToday.length
              ? `${auctionsStartingToday.length} auctions`
              : "No auctions today"}
          </span>
        </div>
        {/* Display up to 6 auctions in card format */}
        {auctionsStartingToday.slice(0, 6).map((element) => (
          <Link
            to={`/auction/item/${element._id}`}
            key={element._id}
            className="glass card rounded-2xl shadow-glow hover:shadow-glow-hover flex flex-col gap-3 bg-white/85 backdrop-blur-lg p-6 transition-all duration-300 animate-fade-in-up"
          >
            <div className="flex items-center gap-3 mb-2">
              <img
                src={element.image?.url}
                alt={element.title}
                className="w-16 h-16 object-cover rounded-lg shadow"
              />
              <p className="font-bold text-blue-600 text-lg truncate">
                {element.title}
              </p>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-semibold">Starting Bid:</span>
              <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-full font-bold shadow">
                Rs. {element.startingBid}
              </span>
            </div>
            <div className="flex flex-col mt-1">
              <span className="text-gray-600 font-bold">Starting Time:</span>
              <span className="text-sm text-blue-900 font-mono">{element.startTime}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default UpcomingAuctions;
