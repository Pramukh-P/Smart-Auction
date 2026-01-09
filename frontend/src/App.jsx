// frontend/src/App.jsx
import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import SideDrawer from "./layout/SideDrawer";
import Home from "./pages/Home";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import UserProfile from "./pages/UserProfile";
import AuctionItem from "./pages/AuctionItem";
import Leaderboard from "./pages/Leaderboard";
import Auctions from "./pages/Auctions";
import CreateAuction from "./pages/CreateAuction";
import ViewMyAuctions from "./pages/ViewMyAuctions";
import ViewAuctionDetails from "./pages/ViewAuctionDetails";
import Dashboard from "./pages/Dashboard/Dashboard";
import ManageAuction from "./pages/Dashboard/sub-components/AuctionItemDelete";
import ManageUser from "./pages/Dashboard/sub-components/AdminUserManager";
import Contact from "./pages/Contact";
import PaymentPage from "./pages/PaymentPage";
import PaymentDetails from "./pages/PaymentDetails";
import AdminDeliveryOrders from "./pages/Dashboard/sub-components/AdminDeliveryOrders";
import BidderOrders from "./pages/BidderOrders";
import AuctioneerOrders from "./pages/AuctioneerOrders";
import SubmitCommission from "./pages/SubmitCommission";
import HowItWorks from "./pages/HowItWorks";
import About from "./pages/About";
import ChatWidget from "./components/ChatWidget";
import NotFound from "./pages/NotFound";
import OrderDetails from "./pages/OrderDetails";

import { getAllAuctionItems } from "@/store/slices/auctionSlice";

const App = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, user, loading: userLoading } = useSelector(
    (state) => state.user
  );

  useEffect(() => {
    dispatch(getAllAuctionItems());
  }, [dispatch]);

  const ProtectedRoute = ({ children, roles }) => {
    if (userLoading) {
      return (
        <div className="flex justify-center items-center min-h-screen text-xl">
          Loading...
        </div>
      );
    }
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    if (roles && !roles.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
    return children;
  };

  return (
    <div className="app-container">
      <div className="app-root">
        <SideDrawer />
        <main className="page-container">
          <Routes>
            <Route path="/" element={<Home />} />

            {/* Auth Routes */}
            <Route
              path="/sign-up"
              element={isAuthenticated ? <Navigate to="/" /> : <SignUp />}
            />
            <Route
              path="/login"
              element={isAuthenticated ? <Navigate to="/" /> : <Login />}
            />

            {/* Public Pages */}
            <Route path="/how-it-works-info" element={<HowItWorks />} />
            <Route path="/about" element={<About />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/auctions" element={<Auctions />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/auction/item/:id" element={<AuctionItem />} />

            {/* Order details */}
            <Route
              path="/order/:id"
              element={
                <ProtectedRoute
                  roles={["Bidder", "Auctioneer", "Super Admin"]}
                >
                  <OrderDetails />
                </ProtectedRoute>
              }
            />

            {/* Profile Routes */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              }
            />
            <Route path="/profile/:id" element={<UserProfile />} />
            <Route
              path="/me"
              element={
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              }
            />

            {/* Bidder Routes */}
            <Route
              path="/my-orders"
              element={
                <ProtectedRoute roles={["Bidder"]}>
                  <BidderOrders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment"
              element={
                <ProtectedRoute roles={["Bidder"]}>
                  <PaymentPage />
                </ProtectedRoute>
              }
            />

            {/* Auctioneer Routes */}
            <Route
              path="/submit-commission"
              element={
                <ProtectedRoute roles={["Auctioneer"]}>
                  <SubmitCommission />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-auction"
              element={
                <ProtectedRoute roles={["Auctioneer"]}>
                  <CreateAuction />
                </ProtectedRoute>
              }
            />
            <Route
              path="/view-my-auctions"
              element={
                <ProtectedRoute roles={["Auctioneer"]}>
                  <ViewMyAuctions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/auctioneer/orders"
              element={
                <ProtectedRoute roles={["Auctioneer"]}>
                  <AuctioneerOrders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/auction/details/:id"
              element={
                <ProtectedRoute roles={["Auctioneer"]}>
                  <ViewAuctionDetails />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute roles={["Super Admin"]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/Manage-Auctions"
              element={
                <ProtectedRoute roles={["Super Admin"]}>
                  <ManageAuction />
                </ProtectedRoute>
              }
            />
            <Route
              path="/Manage-Users"
              element={
                <ProtectedRoute roles={["Super Admin"]}>
                  <ManageUser />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/orders-pending-delivery"
              element={
                <ProtectedRoute roles={["Super Admin"]}>
                  <AdminDeliveryOrders />
                </ProtectedRoute>
              }
            />

            {/* Payment Details */}
            <Route
              path="/payment-details"
              element={
                <ProtectedRoute roles={["Auctioneer", "Super Admin"]}>
                  <PaymentDetails />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        <ToastContainer
          position="top-right"
          autoClose={4000}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          className="toast-container"
          toastClassName="bg-white text-black shadow-lg rounded-lg p-3 w-[70vw] max-w-[400px] md:w-[300px]"
          bodyClassName="toast-body text-sm md:text-base"
          progressClassName="toast-progress"
        />
        <ChatWidget />
      </div>
    </div>
  );
};

export default App;
