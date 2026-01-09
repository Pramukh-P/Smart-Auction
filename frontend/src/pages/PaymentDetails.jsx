// frontend/src/pages/PaymentDetails.jsx
import React from "react";
import { useParams } from "react-router-dom";

const PaymentDetails = () => {
  const { id } = useParams(); // auction id
  return (
    <div className="page-container pt-20 pb-10 px-5">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded shadow">
        <h2 className="text-2xl font-semibold mb-4">Payment Details (Dummy)</h2>
        <p><strong>Auction ID:</strong> {id}</p>
        <p><strong>Name:</strong> John Doe</p>
        <p><strong>Email:</strong> john@example.com</p>
        <p><strong>Phone:</strong> +91 9876543210</p>
        <p><strong>Address:</strong> 123 Demo Street, City</p>
        <p><strong>Amount:</strong> ₹10,000</p>
      </div>
    </div>
  );
};

export default PaymentDetails;
