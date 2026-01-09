// frontend/src/pages/NotFound.jsx
import React from "react";
import { Link } from "react-router-dom";

const NotFound = () => (
  <section className="page-container flex flex-col items-center justify-center min-h-screen pt-20 pb-10">
    <h1 className="text-6xl font-bold text-red-600 mb-6">404</h1>
    <h2 className="text-2xl mb-4">Page Not Found</h2>
    <p className="mb-8 text-center max-w-sm">
      Sorry, the page you are looking for does not exist.
    </p>
    <Link
      to="/"
      className="px-6 py-3 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 transition"
    >
      Back to Home
    </Link>
  </section>
);

export default NotFound;
