// frontend/src/pages/SubmitCommission.jsx
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { postCommissionProof } from "@/store/slices/commissionSlice";

const SubmitCommission = () => {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.commission);

  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  const handleFileChange = (e) => {
    const fileObj = e.target.files[0];
    if (!fileObj) return;
    setFile(fileObj);
    setFilePreview(URL.createObjectURL(fileObj));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) {
      alert("Please upload a commission payment proof screenshot.");
      return;
    }
    const formData = new FormData();
    formData.append("amount", amount);
    formData.append("comment", comment);
    formData.append("proof", file);
    dispatch(postCommissionProof(formData));
  };

  return (
    <section className="page-container pt-20 pb-10 min-h-screen flex flex-col items-center">
      <div className="glass bg-white/80 backdrop-blur-lg rounded-3xl shadow-glow max-w-xl w-full p-8">
        <h1 className="text-red-600 text-4xl md:text-6xl font-extrabold mb-8 text-center">
          Submit Commission Payment Proof
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter payment amount in ₹"
            className="p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600 bg-transparent"
            min="1"
            step="any"
            required
          />
          <textarea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional comment"
            className="p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600 bg-transparent resize-none"
          />
          <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-md cursor-pointer hover:bg-gray-100 transition">
            {filePreview ? (
              <img
                src={filePreview}
                alt="Proof Preview"
                className="w-52 h-auto rounded-md mb-2"
              />
            ) : (
              <span className="text-gray-700 mb-2">Click or drag & drop file</span>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              required={!file}
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-3 rounded-md font-semibold text-xl transition"
          >
            {loading ? "Submitting..." : "Submit Proof"}
          </button>
        </form>
      </div>
    </section>
  );
};

export default SubmitCommission;
