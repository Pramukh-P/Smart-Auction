// frontend/src/pages/Leaderboard.jsx
import Spinner from "@/custom-components/Spinner";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { getLeaderboard } from "@/store/slices/userSlice";

const Leaderboard = () => {
  const dispatch = useDispatch();
  const { loading, leaderboard } = useSelector((state) => state.user);
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(getLeaderboard());
  }, [dispatch]);

  // 🔹 Ensure we always work with an array
  const rows = Array.isArray(leaderboard) ? leaderboard : [];

  return (
    <section className="page-container pt-20 pb-10 min-h-screen flex flex-col">
      {loading ? (
        <div className="flex justify-center items-center flex-grow">
          <Spinner />
        </div>
      ) : (
        <>
          <h1 className="text-red-600 text-4xl md:text-6xl font-extrabold mb-8 text-center">
            Bidders Leaderboard
          </h1>

          <div className="overflow-x-auto rounded-3xl shadow-glow glass bg-white/80 backdrop-blur-lg border border-gray-200 mx-auto max-w-7xl">
            <table className="min-w-full text-left rounded-3xl border-collapse">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="py-4 px-6 w-12 text-center">#</th>
                  <th className="py-4 px-6">Profile Pic</th>
                  <th className="py-4 px-6">Username</th>
                  <th className="py-4 px-6">Bid Expenditure</th>
                  <th className="py-4 px-6">Auctions Won</th>
                </tr>
              </thead>
              <tbody className="text-gray-800 font-medium">
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-6 px-6 text-center text-gray-500"
                    >
                      No leaderboard data yet.
                    </td>
                  </tr>
                ) : (
                  rows.slice(0, 100).map((element, index) => (
                    <tr
                      key={element._id || index}
                      className="border-b border-gray-300 hover:bg-blue-50 transition-colors duration-300"
                    >
                      <td className="py-3 px-6 text-center font-semibold">
                        {index + 1}
                      </td>
                      <td className="py-3 px-6">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/profile/${element._id}`)
                          }
                          className="flex items-center"
                        >
                          <img
                            src={
                              element.profileImage?.url ||
                              "/default-avatar.png"
                            }
                            alt={element.userName}
                            className="w-12 h-12 rounded-full object-cover shadow-md"
                          />
                        </button>
                      </td>
                      <td className="py-3 px-6">{element.userName}</td>
                      <td className="py-3 px-6 text-blue-600 font-semibold">
                        Rs. {element.moneySpent}
                      </td>
                      <td className="py-3 px-6 text-blue-600 font-semibold">
                        {element.auctionsWon}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
};

export default Leaderboard;
