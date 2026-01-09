// frontend/src/pages/Dashboard/sub-components/AdminUserManager.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

const AdminUserManager = () => {
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState("Bidder");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchUsers = async (roleType) => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `http://localhost:5000/api/v1/superadmin/users/byrole?role=${roleType}`,
        { withCredentials: true }
      );
      setUsers(data.users || []);
    } catch (err) {
      console.error("Failed to fetch users", err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const viewUser = async (id) => {
    try {
      const { data } = await axios.get(
        `http://localhost:5000/api/v1/superadmin/user/${id}`,
        { withCredentials: true }
      );
      setSelectedUser(data);
    } catch (err) {
      alert("Failed to fetch user details");
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await axios.delete(
        `http://localhost:5000/api/v1/superadmin/user/delete/${id}`,
        {
          withCredentials: true,
        }
      );
      alert("User deleted successfully");
      setUsers((prev) => prev.filter((u) => u._id !== id));
      if (selectedUser?.user?._id === id) {
        setSelectedUser(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete user");
    }
  };

  useEffect(() => {
    fetchUsers(role);
  }, [role]);

  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-gray-500">
        Loading users...
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4">
      {/* Role tabs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">
            Manage users
          </h2>
          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[11px]">
            {role === "Bidder" ? "Bidders" : "Auctioneers"}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelectedUser(null);
              setRole("Bidder");
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              role === "Bidder"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-100 text-gray-700 border-gray-300"
            }`}
          >
            Bidders
          </button>
          <button
            onClick={() => {
              setSelectedUser(null);
              setRole("Auctioneer");
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              role === "Auctioneer"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-100 text-gray-700 border-gray-300"
            }`}
          >
            Auctioneers
          </button>
        </div>
      </div>

      {/* Users table */}
      <div className="overflow-x-auto rounded-2xl shadow-sm glass bg-white/90 backdrop-blur-lg border border-gray-200">
        <table className="min-w-full text-left border-collapse">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="py-3 px-4 text-xs font-semibold">Name</th>
              <th className="py-3 px-4 text-xs font-semibold">Email</th>
              <th className="py-3 px-4 text-xs font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-800">
            {users.length ? (
              users.map((u) => (
                <tr
                  key={u._id}
                  className="border-b border-gray-200 hover:bg-blue-50 transition-colors duration-200"
                >
                  <td className="py-3 px-4">{u.userName}</td>
                  <td className="py-3 px-4">{u.email}</td>
                  <td className="py-3 px-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => viewUser(u._id)}
                      className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs hover:bg-blue-700"
                    >
                      View
                    </button>
                    <button
                      onClick={() => deleteUser(u._id)}
                      className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={3}
                  className="text-center py-6 text-sm text-blue-600"
                >
                  No {role}s found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Selected user detail */}
      {selectedUser && (
        <div className="mt-6 p-5 bg-white rounded-2xl shadow-md border border-gray-200">
          <h3 className="text-lg font-bold mb-2 text-gray-900">
            {selectedUser.user.userName}&apos;s details
          </h3>
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Email:</span>{" "}
            {selectedUser.user.email}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Role:</span>{" "}
            {selectedUser.user.role}
          </p>

          {selectedUser.user.role === "Bidder" ? (
            // bidder block stays same as before
            <div className="mt-4 space-y-2 text-sm text-gray-800">
              <p>🎯 Auctions won: {selectedUser.stats.totalWon}</p>
              <p>💰 Amount spent: ₹{selectedUser.stats.totalSpent}</p>
              {/* unpaid list code unchanged */}
              {/* ... */}
            </div>
          ) : (
            <div className="mt-4 space-y-2 text-sm text-gray-800">
              <p>🛠️ Auctions created: {selectedUser.stats.totalCreated}</p>
              <div className="flex items-center gap-2">
                <p>
                  🚚 Unshipped (paid orders not yet delivered):{" "}
                  {selectedUser.stats.unshippedCount}
                </p>
                {selectedUser.stats.unshippedCount > 0 && (
                  <button
                    onClick={async () => {
                      try {
                        const { data } = await axios.get(
                          `http://localhost:5000/api/v1/superadmin/user/auctioneer/unshipped/${selectedUser.user._id}`,
                          { withCredentials: true }
                        );
                        setSelectedUser((prev) => ({
                          ...prev,
                          unshippedList: data.unshipped,
                        }));
                      } catch {
                        alert("Failed to fetch unshipped auctions");
                      }
                    }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View list
                  </button>
                )}
              </div>

              {selectedUser.unshippedList &&
                selectedUser.unshippedList.length > 0 && (
                  <div className="mt-3 border-t pt-3">
                    <h4 className="font-semibold text-sm mb-2">
                      Unshipped auctions
                    </h4>
                    <ul className="space-y-2 text-sm">
                      {selectedUser.unshippedList.map((a) => (
                        <li
                          key={a._id}
                          className="p-3 bg-gray-50 rounded-lg shadow-sm"
                        >
                          <div className="font-medium">{a.title}</div>
                          <div>💰 ₹{a.finalBidAmount}</div>
                          <div className="text-xs text-gray-600">
                            🏆 Winner:{" "}
                            {a.highestBidder?.userName ||
                              a.winner?.userName ||
                              "N/A"}{" "}
                            (
                            {a.highestBidder?.email ||
                              a.winner?.email ||
                              "N/A"}
                            )
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Payment: {a.paymentStatus} • Delivery:{" "}
                            {a.deliveryStatus}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminUserManager;
