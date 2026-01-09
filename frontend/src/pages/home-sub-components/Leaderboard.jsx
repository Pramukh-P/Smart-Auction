// frontend/src/pages/home-sub-components/Leaderboard.jsx
import React from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

const Leaderboard = () => {
  const { leaderboard } = useSelector((state) => state.user);

  return (
    <section className="my-10 w-full max-w-6xl mx-auto px-4">
      <div className="flex flex-col md:flex-row md:gap-4 items-center mb-6 justify-center">
        <h3 className="text-3xl font-extrabold gradient-text text-center md:text-left">
          Top 10
        </h3>
        <h3 className="text-3xl font-extrabold text-blue-600 md:text-left">
          Bidders Leaderboard
        </h3>
      </div>

      <div className="overflow-x-auto rounded-2xl shadow-glow glass bg-white/80 backdrop-blur-lg border border-gray-200">
        <table className="min-w-full text-left rounded-2xl border-collapse">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="py-4 px-6">#</th>
              <th className="py-4 px-6">Profile Pic</th>
              <th className="py-4 px-6">Username</th>
              <th className="py-4 px-6">Bid Expenditure</th>
              <th className="py-4 px-6">Auctions Won</th>
            </tr>
          </thead>
          <tbody className="text-gray-800 font-medium">
            {leaderboard.slice(0, 10).map((element, index) => (
              <tr
                key={element._id}
                className="border-b border-gray-300 hover:bg-blue-50 transition-colors duration-300"
              >
                <td className="py-3 px-6 font-semibold w-8 text-center">
                  {index + 1}
                </td>
                <td className="py-3 px-6">
                  <img
                    src={element.profileImage?.url}
                    alt={element.userName || "User"}
                    className="w-12 h-12 rounded-full object-cover shadow-md"
                  />
                </td>
                <td className="py-3 px-6">{element.userName}</td>
                <td className="py-3 px-6 text-blue-600 font-semibold">
                  Rs. {element.moneySpent}
                </td>
                <td className="py-3 px-6 text-blue-600 font-semibold">
                  {element.auctionsWon}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-center">
        <Link
          to="/leaderboard"
          className="inline-block w-full max-w-xs text-center py-3 font-semibold border-2 border-blue-500 rounded-xl text-blue-600 hover:bg-blue-50 transition-colors duration-300"
        >
          Go to Leaderboard
        </Link>
      </div>
    </section>
  );
};

export default Leaderboard;
