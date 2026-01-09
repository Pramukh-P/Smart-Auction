// frontend/src/pages/Dashboard/sub-components/PaymentProofs.jsx
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  deletePaymentProof,
  getSinglePaymentProofDetail,
  updatePaymentProof,
} from "@/store/slices/superAdminSlice";
import { Link } from "react-router-dom";

const PaymentProofs = () => {
  const dispatch = useDispatch();
  const { paymentProofs, singlePaymentProof } = useSelector(
    (state) => state.superAdmin
  );
  const [openDrawer, setOpenDrawer] = useState(false);

  const handlePaymentProofDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this payment proof?")) {
      dispatch(deletePaymentProof(id));
    }
  };

  const handleFetchPaymentDetail = (id) => {
    dispatch(getSinglePaymentProofDetail(id));
  };

  useEffect(() => {
    if (singlePaymentProof && Object.keys(singlePaymentProof).length > 0) {
      setOpenDrawer(true);
    }
  }, [singlePaymentProof]);

  return (
    <>
      <div className="overflow-x-auto rounded-2xl shadow-glow glass bg-white/80 backdrop-blur-lg border border-gray-200 mt-5">
        <table className="min-w-full text-left rounded-2xl border-collapse">
          <thead className="bg-gray-800 text-white rounded-t-2xl">
            <tr>
              <th className="w-1/3 py-3 px-6">User ID</th>
              <th className="w-1/3 py-3 px-6">Status</th>
              <th className="w-1/3 py-3 px-6">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-800 font-medium">
            {paymentProofs.length > 0 ? (
              paymentProofs.map((element, index) => (
                <tr
                  key={element._id}
                  className={`border-b border-gray-300 ${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  <td className="py-3 px-6 text-center">{element.userId}</td>
                  <td className="py-3 px-6 text-center">{element.status}</td>
                  <td className="flex items-center justify-center gap-4 py-3 px-6">
                    <button
                      className="bg-blue-600 text-white py-1 px-4 rounded-md shadow hover:bg-blue-700 transition duration-300"
                      onClick={() => handleFetchPaymentDetail(element._id)}
                    >
                      Update
                    </button>
                    <button
                      className="bg-red-600 text-white py-1 px-4 rounded-md shadow hover:bg-red-700 transition duration-300"
                      onClick={() => handlePaymentProofDelete(element._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="text-center py-6 text-xl text-blue-600">
                  No payment proofs are found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {openDrawer && <Drawer setOpenDrawer={setOpenDrawer} />}
    </>
  );
};

export default PaymentProofs;

export const Drawer = ({ setOpenDrawer }) => {
  const dispatch = useDispatch();
  const { singlePaymentProof, loading } = useSelector((state) => state.superAdmin);
  const [amount, setAmount] = useState(singlePaymentProof.amount || "");
  const [status, setStatus] = useState(singlePaymentProof.status || "");

  useEffect(() => {
    setAmount(singlePaymentProof.amount || "");
    setStatus(singlePaymentProof.status || "");
  }, [singlePaymentProof]);

  const handlePaymentProofUpdate = () => {
    dispatch(updatePaymentProof(singlePaymentProof._id, status, amount));
    setOpenDrawer(false);
  };

  return (
    <section
      className="fixed bottom-0 left-0 w-full h-full bg-transparent bg-opacity-70 flex items-end z-50"
      onClick={() => setOpenDrawer(false)}
    >
      <div
        className="bg-white rounded-t-3xl w-full p-8 sm:max-w-md mx-auto shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-red-600 text-3xl font-semibold text-center mb-4">
          Update Payment Proof
        </h3>
        <p className="text-gray-700 text-center mb-6">
          You can update payment status and amount.
        </p>
        <form className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-gray-700 font-semibold">User ID</label>
            <input
              type="text"
              value={singlePaymentProof.userId || ""}
              disabled
              readOnly
              className="p-3 rounded-md border border-gray-400 bg-gray-100 text-gray-600 cursor-not-allowed"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-gray-700 font-semibold">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="p-3 rounded-md border border-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 bg-transparent"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-gray-700 font-semibold">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="p-3 rounded-md border border-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 bg-transparent"
            >
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Settled">Settled</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-gray-700 font-semibold">Comment</label>
            <textarea
              rows={5}
              value={singlePaymentProof.comment || ""}
              disabled
              readOnly
              className="p-3 rounded-md border border-gray-400 bg-gray-100 text-gray-600 cursor-not-allowed"
            />
          </div>
          <div>
            <Link
              to={singlePaymentProof.proof?.url || ""}
              target="_blank"
              className="bg-red-600 block text-center py-3 rounded-md text-white font-semibold hover:bg-red-700 transition duration-300"
            >
              Payment Proof (Screenshot)
            </Link>
          </div>
          <div>
            <button
              type="button"
              className="bg-blue-600 w-full py-3 rounded-md text-white font-semibold hover:bg-blue-700 transition duration-300"
              onClick={handlePaymentProofUpdate}
              disabled={loading}
            >
              {loading ? "Updating Payment Proof..." : "Update Payment Proof"}
            </button>
          </div>
          <div>
            <button
              type="button"
              className="bg-yellow-500 w-full py-3 rounded-md text-white font-semibold hover:bg-yellow-700 transition duration-300"
              onClick={() => setOpenDrawer(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};
