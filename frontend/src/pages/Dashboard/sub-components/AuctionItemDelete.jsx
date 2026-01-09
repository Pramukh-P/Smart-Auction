// frontend/src/pages/Dashboard/sub-components/AuctionItemDelete.jsx
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { deleteAuctionItem } from "@/store/slices/superAdminSlice";

const AuctionItemDelete = () => {
  const dispatch = useDispatch();
  const { allAuctions } = useSelector((state) => state.auction);

  const handleAuctionDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this auction?")) {
      dispatch(deleteAuctionItem(id));
    }
  };

  return (
    <div className="overflow-x-auto p-0 lg:p-10 rounded-2xl shadow-glow glass bg-white/80 backdrop-blur-lg border border-gray-200 mb-10">
      <table className="min-w-full text-left rounded-2xl border-collapse">
        <thead className="bg-gray-800 text-white rounded-t-2xl">
          <tr>
            <th className="py-3 px-6 w-24">Image</th>
            <th className="py-3 px-6">Title</th>
            <th className="py-3 px-6">Actions</th>
          </tr>
        </thead>
        <tbody className="text-gray-800 font-medium">
          {allAuctions.length > 0 ? (
            allAuctions.map((element) => (
              <tr
                key={element._id}
                className="border-b border-gray-300 hover:bg-blue-50 transition-colors duration-300"
              >
                <td className="py-3 px-6">
                  <img
                    src={element.image?.url}
                    alt={element.title}
                    className="w-12 h-12 object-cover rounded-lg shadow-sm"
                  />
                </td>
                <td className="py-3 px-6">{element.title}</td>
                <td className="py-3 px-6 flex space-x-4">
                  <Link
                    to={`/auction/item/${element._id}`}
                    className="bg-blue-600 text-white py-1 px-4 rounded-md shadow hover:bg-blue-700 transition duration-300"
                  >
                    View
                  </Link>
                  <button
                    className="bg-red-600 text-white py-1 px-4 rounded-md shadow hover:bg-red-700 transition duration-300"
                    onClick={() => handleAuctionDelete(element._id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="text-center py-6 text-xl text-blue-600">
                No Auctions found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AuctionItemDelete;
