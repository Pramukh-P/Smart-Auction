// frontend/src/pages/home-sub-components/FeaturedAuctions.jsx
import React from "react";
import { useSelector } from "react-redux";
import Card from "@/custom-components/Card";

const FeaturedAuctions = () => {
  const { allAuctions, loading } = useSelector((state) => state.auction);

  if (loading) {
    return (
      <section className="my-10 w-full max-w-6xl mx-auto text-center">
        Loading featured auctions...
      </section>
    );
  }

  const featuredItems = allAuctions.slice(0, 8);

  return (
    <section className="my-10 w-full max-w-6xl mx-auto">
      <h3 className="text-2xl md:text-3xl font-semibold gradient-text mb-6 text-center">
        Featured Auctions
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8">
        {featuredItems.map((element) => (
          <div
            key={element._id}
            className="glass card rounded-2xl shadow-glow hover:shadow-glow-hover transition-all duration-300 p-0 bg-white/80 backdrop-blur-lg"
          >
            <Card
              title={element.title}
              imgSrc={element.image?.url}
              startTime={element.startTime}
              endTime={element.endTime}
              startingBid={element.startingBid}
              id={element._id}
            />
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturedAuctions;
