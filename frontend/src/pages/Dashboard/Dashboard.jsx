// frontend/src/pages/Dashboard/Dashboard.jsx

import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  clearAllSuperAdminSliceErrors,
  getAllPaymentProofs,
  getAllUsers,
  getMonthlyRevenue,
} from "@/store/slices/superAdminSlice";
import Spinner from "@/custom-components/Spinner";
import PaymentGraph from "./sub-components/PaymentGraph";
import BiddersAuctioneersGraph from "./sub-components/BiddersAuctioneersGraph";
import AdminUserManager from "./sub-components/AdminUserManager";
import AuctionItemDelete from "./sub-components/AuctionItemDelete";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const dispatch = useDispatch();
  const { loading, monthlyRevenue, totalAuctioneers, totalBidders } =
    useSelector((state) => state.superAdmin);
  const { user, isAuthenticated } = useSelector((state) => state.user);
  const navigateTo = useNavigate();

  useEffect(() => {
    dispatch(getMonthlyRevenue());
    dispatch(getAllUsers());
    dispatch(getAllPaymentProofs());
    dispatch(clearAllSuperAdminSliceErrors());
  }, [dispatch]);

  useEffect(() => {
    if (!isAuthenticated || user.role !== "Super Admin") {
      navigateTo("/");
    }
  }, [isAuthenticated, user, navigateTo]);

  if (loading) {
    return (
      <div className="page-container pt-20 pb-10 min-h-screen flex justify-center items-center">
        <Spinner />
      </div>
    );
  }

  // Simple derived metrics from redux data
  const totalRevenue =
    Array.isArray(monthlyRevenue) && monthlyRevenue.length
      ? monthlyRevenue.reduce(
          (sum, v) => sum + (Number(v) || 0),
          0
        )
      : 0;

  const totalBiddersYear =
    Array.isArray(totalBidders) && totalBidders.length
      ? totalBidders.reduce((sum, v) => sum + (Number(v) || 0), 0)
      : 0;

  const totalAuctioneersYear =
    Array.isArray(totalAuctioneers) && totalAuctioneers.length
      ? totalAuctioneers.reduce((sum, v) => sum + (Number(v) || 0), 0)
      : 0;

  return (
    <section className="page-container pt-20 pb-10 min-h-screen flex flex-col gap-8 max-w-7xl mx-auto">
      {/* Header + overview row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
            Admin Analytics
          </h1>
          <p className="text-sm text-gray-500">
            Monitor platform health, user growth, and payments at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-semibold">
            {user?.userName?.[0]?.toUpperCase() || "A"}
          </span>
          <div className="flex flex-col">
            <span className="font-semibold text-gray-800">
              {user?.userName} (Super Admin)
            </span>
            <span className="text-[11px] text-gray-500">
              You have full access to platform controls and insights.
            </span>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-4 bg-white/90 backdrop-blur-lg border border-gray-200 flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-gray-500">
            Total revenue (this year)
          </span>
          <span className="text-2xl font-extrabold text-blue-600">
            ₹{totalRevenue.toLocaleString()}
          </span>
          <p className="text-[11px] text-gray-500">
            Sum of monthly payment amounts recorded in the system.
          </p>
        </div>
        <div className="glass rounded-2xl p-4 bg-white/90 backdrop-blur-lg border border-gray-200 flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-gray-500">
            Bidders registered (YTD)
          </span>
          <span className="text-2xl font-extrabold text-emerald-600">
            {totalBiddersYear.toLocaleString()}
          </span>
          <p className="text-[11px] text-gray-500">
            Aggregate bidders across all months in the current dataset.
          </p>
        </div>
        <div className="glass rounded-2xl p-4 bg-white/90 backdrop-blur-lg border border-gray-200 flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-gray-500">
            Auctioneers registered (YTD)
          </span>
          <span className="text-2xl font-extrabold text-indigo-600">
            {totalAuctioneersYear.toLocaleString()}
          </span>
          <p className="text-[11px] text-gray-500">
            Aggregate auctioneers across all months in the current dataset.
          </p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass bg-white/90 backdrop-blur-lg rounded-2xl shadow-md p-4 md:p-6 border border-gray-200 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-900 text-lg font-semibold">
              Monthly revenue
            </h3>
            <span className="text-[11px] text-gray-500">
              Track payments received per month
            </span>
          </div>
          <div className="h-80 w-full">
            <PaymentGraph />
          </div>
        </div>

        <div className="glass bg-white/90 backdrop-blur-lg rounded-2xl shadow-md p-4 md:p-6 border border-gray-200 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-900 text-lg font-semibold">
              User growth
            </h3>
            <span className="text-[11px] text-gray-500">
              Bidders vs Auctioneers by month
            </span>
          </div>
          <div className="h-80 w-full">
            <BiddersAuctioneersGraph />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Dashboard;
