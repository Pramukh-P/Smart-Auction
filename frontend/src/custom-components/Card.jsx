//frontend/src/custom-components/Card.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const Card = ({ imgSrc, title, startingBid, startTime, endTime, id }) => {
  const calculateTimeLeft = () => {
    const now = new Date();
    const startDifference = new Date(startTime) - now;
    const endDifference = new Date(endTime) - now;
    let timeLeft = {};

    if (startDifference > 0) {
      timeLeft = {
        type: "Starts In:",
        days: Math.floor(startDifference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((startDifference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((startDifference / 1000 / 60) % 60),
        seconds: Math.floor((startDifference / 1000) % 60),
      };
    } else if (endDifference > 0) {
      timeLeft = {
        type: "Ends In:",
        days: Math.floor(endDifference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((endDifference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((endDifference / 1000 / 60) % 60),
        seconds: Math.floor((endDifference / 1000) % 60),
      };
    }
    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const formatTimeLeft = ({ days, hours, minutes, seconds }) => {
    const pad = (num) => String(num).padStart(2, "0");
    return `(${days} Days) ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  return (
    <Link
      to={`/auction/item/${id}`}
      // className="glass card rounded-2xl shadow-glow hover:shadow-glow-hover transition-transform transform hover:-translate-y-1 flex flex-col sm:basis-56 lg:basis-60 2xl:basis-80 bg-white/80 backdrop-blur-lg overflow-hidden"
    >
      <div className="w-full aspect-[4/3] relative overflow-hidden rounded-t-2xl shadow-inner">
        <img
          src={imgSrc}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="px-4 pt-4 pb-6 flex flex-col flex-grow">
        <h5 className="font-semibold text-lg md:text-xl group-hover:text-red-600 mb-3 truncate">
          {title}
        </h5>
        {startingBid && (
          <p className="text-gray-600 text-sm md:text-base font-light mb-1">
            Starting Bid:{" "}
            <span className="text-red-700 font-semibold ml-1">
              Rs. {startingBid}
            </span>
          </p>
        )}
        <p className="text-gray-600 text-sm md:text-base font-light mt-auto">
          {timeLeft.type}
          {Object.keys(timeLeft).length > 1 ? (
            <span className="text-green-700 font-semibold ml-1">
              {formatTimeLeft(timeLeft)}
            </span>
          ) : (
            <span className="text-yellow-400 font-semibold ml-1">Time's up!</span>
          )}
        </p>
      </div>
    </Link>
  );
};

export default Card;
