// frontend/src/layout/SideDrawer.jsx
import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { RiAuctionFill } from "react-icons/ri";
import { MdLeaderboard, MdDashboard } from "react-icons/md";
import { SiGooglesearchconsole } from "react-icons/si";
import { BsFillInfoSquareFill } from "react-icons/bs";
import {
  FaUserCircle,
  FaFileInvoiceDollar,
  FaEye,
  FaUser as FaUserIcon,
  FaEnvelope,
  FaUsers,
} from "react-icons/fa";
import { MdManageSearch } from "react-icons/md";
import { IoIosCreate } from "react-icons/io";
import { GiHamburgerMenu } from "react-icons/gi";
import { IoMdClose } from "react-icons/io";
import { logout } from "@/store/slices/userSlice";

const API_BASE = "http://localhost:5000/api/v1";

const SideDrawer = () => {
  const [show, setShow] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotificationsWindow, setShowNotificationsWindow] = useState(false);
  const [showMobileNotifications, setShowMobileNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unseenCount, setUnseenCount] = useState(0);

  const notifBtnRef = useRef(null);
  const notifWinRef = useRef(null);
  const userDropdownRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const { isAuthenticated, user, token } = useSelector(
    (state) => state.user || {}
  );

  // Navbar scroll effect
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch notifications from backend on auth/user change
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setNotifications([]);
      setUnseenCount(0);
      return;
    }

    fetch(`${API_BASE}/notifications`, {
      headers: {
        Authorization: `Bearer ${token || user.token || ""}`,
      },
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load notifications");
        return res.json();
      })
      .then((data) => {
        if (data.success && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
          setUnseenCount(data.notifications.filter((n) => !n.seen).length);
        }
      })
      .catch((err) => {
        console.error("Error loading notifications:", err);
      });
  }, [isAuthenticated, user, token]);

  // Close dropdowns/windows if click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        notifBtnRef.current?.contains(e.target) ||
        notifWinRef.current?.contains(e.target) ||
        userDropdownRef.current?.contains(e.target)
      )
        return;
      setShowNotificationsWindow(false);
      setShowUserDropdown(false);
      setShowMobileNotifications(false);
    };

    if (showNotificationsWindow || showUserDropdown || showMobileNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotificationsWindow, showUserDropdown, showMobileNotifications]);

  // Logout
  const handleLogout = () => {
    dispatch(logout());
    setShow(false);
    setShowUserDropdown(false);
    setShowNotificationsWindow(false);
    setShowMobileNotifications(false);
    navigate("/login");
  };

  const toggleMenu = () => setShow((old) => !old);
  const closeMenu = () => setShow(false);

  const isActiveRoute = (path) => location.pathname === path;

  // Mark notification seen on click - update backend and local state
  const handleNotificationClick = async (notif) => {
    if (!notif.seen) {
      try {
        await fetch(`${API_BASE}/notifications/seen`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token || user.token || ""}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        });
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, seen: true } : n))
        );
        setUnseenCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.error("Failed to mark notification as seen", err);
      }
    }

    if (notif.type === "overbid") {
      navigate(`/auction/item/${notif.auction}`);
    } else if (notif.type === "payment-done") {
      navigate(`/payment`);
    } else if (notif.type === "won") {
      navigate(`/auction/item/${notif.auction}?pay=true`);
    } else if (notif.type === "payment-received") {
      navigate(`/payment-details`);
    } else if (notif.type === "auction-won") {
      navigate(`/auction/item/${notif.auction}`);
    } else {
      navigate(`/auction/item/${notif.auction}`);
    }
    setShowNotificationsWindow(false);
    setShowUserDropdown(false);
    setShowMobileNotifications(false);
    closeMenu();
  };

  const NotificationWindow = ({ isMobile }) => (
    <div
      ref={notifWinRef}
      className={`fixed top-[65px] left-[70%] transform -translate-x-1/2 z-[120] py-2 transition-all shadow-xl border border-gray-200 rounded-xl max-h-80 overflow-y-auto animate-fade-in-up ${
        isMobile ? "w-[100vw]" : "w-96"
      } bg-white`}
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.1)" }}
    >
      <div className="px-4 pb-2 border-b border-gray-200">
        <p className="text-base font-semibold text-blue-600">Notifications</p>
      </div>
      {notifications.length === 0 ? (
        <div className="px-4 py-4 text-base text-gray-500">
          No notifications
        </div>
      ) : (
        notifications.map((notif) => (
          <button
            key={notif._id}
            onClick={() => handleNotificationClick(notif)}
            className={`w-[95%] text-left px-2 py-3 left-3.5 rounded-md my-2 text-base font-semibold flex items-center cursor-pointer transition-colors ${
              notif.seen
                ? "bg-white text-blue-600 border border-blue-200"
                : "bg-blue-600 text-white shadow"
            }`}
            type="button"
          >
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate">{notif.message || notif.text}</p>
                <p className="text-xs text-blue-300">
                  {new Date(notif.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  );

  const NotificationIconButton = () => (
    <button
      ref={notifBtnRef}
      className="relative flex items-center px-4 py-2 pr-3 rounded-lg bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-blue-300"
      onClick={() => {
        setShowNotificationsWindow((open) => !open);
        setShowUserDropdown(false);
        setShowMobileNotifications(false);
      }}
      aria-label="Notifications"
      type="button"
    >
      <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="currentColor" />
        <path
          d="M12 8v4M12 16h.01"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span className="ml-2 font-semibold text-black">Notifications</span>
      {unseenCount > 0 && (
        <span className="absolute -top-0.4 -right-0.6 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
          {unseenCount > 9 ? "9+" : unseenCount}
        </span>
      )}
    </button>
  );

  const MobileNotificationIconButton = () => (
    <button
      className="relative flex items-center w-full px-4 py-3 my-2 rounded-lg bg-blue-600 text-white font-semibold"
      onClick={() => {
        setShowMobileNotifications((open) => !open);
        setShowUserDropdown(false);
        setShowNotificationsWindow(false);
      }}
      aria-label="Notifications"
      type="button"
    >
      <svg className="w-5 h-5 text-blue-200" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="currentColor" />
        <path
          d="M12 8v4M12 16h.01"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span className="ml-2 font-semibold">Notifications</span>
      {unseenCount > 0 && (
        <span className="absolute top-2 right-5 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
          {unseenCount > 9 ? "9+" : unseenCount}
        </span>
      )}
    </button>
  );

  return (
    <>
      {/* Modern Header Nav */}
      <nav
        className={`navbar transition-all duration-300 ${
          isScrolled
            ? "scrolled"
            : ""
        }`}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center space-x-3 group"
              onClick={closeMenu}
            >
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300 group-hover:scale-105">
                <RiAuctionFill className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                  Smart<span className="text-blue-600">Auction</span>
                </span>
                <span className="text-xs text-gray-500 font-medium hidden lg:block">
                  Platform
                </span>
              </div>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden lg:flex items-center space-x-1 relative">
              {isAuthenticated && (
                <Link
                  to="/auctions"
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                    isActiveRoute("/auctions")
                      ? "bg-blue-600 text-black shadow-lg shadow-blue-600/25"
                      : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                  }`}
                >
                  <RiAuctionFill className="w-5 h-5" />
                  <span>Auctions</span>
                </Link>
              )}
              {isAuthenticated && (
                <Link
                  to="/leaderboard"
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                    isActiveRoute("/leaderboard")
                      ? "bg-blue-600 text-black shadow-lg shadow-blue-600/25"
                      : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                  }`}
                >
                  <MdLeaderboard className="w-5 h-5" />
                  <span>Leaderboard</span>
                </Link>
              )}

              {/* Visible for everyone: How it works & About Us */}
              <Link
                to="/how-it-works-info"
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                  isActiveRoute("/how-it-works-info")
                    ? "bg-blue-600 text-black shadow-lg shadow-blue-600/25"
                    : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                }`}
              >
                <SiGooglesearchconsole className="w-5 h-5" />
                <span>How it works</span>
              </Link>
              <Link
                to="/about"
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                  isActiveRoute("/about")
                    ? "bg-blue-600 text-black shadow-lg shadow-blue-600/25"
                    : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                }`}
              >
                <BsFillInfoSquareFill className="w-5 h-5" />
                <span>About Us</span>
              </Link>

              {/* Notifications icon/button – only when logged in */}
              {isAuthenticated && <NotificationIconButton />}
            </div>

            {/* Show notifications popup under notifications button */}
            {showNotificationsWindow && (
              <NotificationWindow isMobile={false} />
            )}

            {/* Right Section - User Menu / Auth buttons */}
            <div className="hidden lg:flex items-center space-x-4">
              {!isAuthenticated ? (
                <>
                  <Link
                    to="/login"
                    className="px-4 py-2 text-blue-600 font-semibold hover:text-blue-700 transition-colors duration-300"
                  >
                    Login
                  </Link>
                  <Link
                    to="/sign-up"
                    className="btn-primary px-6 py-2 text-sm font-semibold"
                  >
                    Sign Up
                  </Link>
                </>
              ) : (
                <div className="relative" ref={userDropdownRef}>
                  <button
                    onClick={() => {
                      setShowUserDropdown(!showUserDropdown);
                      setShowNotificationsWindow(false);
                      setShowMobileNotifications(false);
                    }}
                    className="flex items-center space-x-3 px-4 py-2 rounded-lg bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-300"
                    type="button"
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full flex items-center justify-center relative">
                      <span className="text-white font-semibold text-sm">
                        {user?.userName?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-left hidden xl:block">
                      <p className="font-semibold text-gray-900 text-sm">
                        {user?.userName}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {user?.role}
                      </p>
                    </div>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${
                        showUserDropdown ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* User Dropdown */}
                  {showUserDropdown && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 animate-fade-in-up">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="font-semibold text-gray-900">
                          {user?.userName}
                        </p>
                        <p className="text-sm text-gray-500">{user?.email}</p>
                        <p className="text-xs text-blue-600 font-medium capitalize mt-1">
                          {user?.role}
                        </p>
                      </div>
                      <Link
                        to="/me"
                        className={`flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-colors ${
                          isActiveRoute("/me")
                            ? "bg-blue-50 text-blue-600"
                            : "text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                        }`}
                        onClick={() => setShowUserDropdown(false)}
                      >
                        <FaUserIcon className="w-4 h-4" />
                        <span>Profile</span>
                      </Link>

                      {user?.role === "Auctioneer" && (
                        <>
                          <Link
                            to="/auctioneer/orders"
                            className={`flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-colors ${
                              isActiveRoute("/auctioneer/orders")
                                ? "bg-blue-50 text-blue-600"
                                : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                            }`}
                            onClick={() => setShowUserDropdown(false)}
                          >
                            <FaFileInvoiceDollar className="w-4 h-4" />
                            <span>Auction Orders</span>
                          </Link>
                          <Link
                            to="/create-auction"
                            className={`flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-colors ${
                              isActiveRoute("/create-auction")
                                ? "bg-blue-50 text-blue-600"
                                : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                            }`}
                            onClick={() => setShowUserDropdown(false)}
                          >
                            <IoIosCreate className="w-4 h-4" />
                            <span>Create Auction</span>
                          </Link>
                          <Link
                            to="/view-my-auctions"
                            className={`flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-colors ${
                              isActiveRoute("/view-my-auctions")
                                ? "bg-blue-50 text-blue-600"
                                : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                            }`}
                            onClick={() => setShowUserDropdown(false)}
                          >
                            <FaEye className="w-4 h-4" />
                            <span>View My Auctions</span>
                          </Link>
                        </>
                      )}

                      {user?.role === "Super Admin" && (
                        <>
                          <Link
                            to="/admin/orders-pending-delivery"
                            className={`flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-colors ${
                              isActiveRoute("/admin/orders-pending-delivery")
                                ? "bg-blue-50 text-blue-600"
                                : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                            }`}
                            onClick={() => setShowUserDropdown(false)}
                          >
                            <FaFileInvoiceDollar className="w-4 h-4" />
                            <span>Orders Pending Delivery</span>
                          </Link>
                          <Link
                            to="/dashboard"
                            className={`flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-colors ${
                              isActiveRoute("/dashboard")
                                ? "bg-blue-50 text-blue-600"
                                : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                            }`}
                            onClick={() => setShowUserDropdown(false)}
                          >
                            <MdDashboard className="w-4 h-4" />
                            <span>Dashboard</span>
                          </Link>
                          <Link
                            to="/Manage-Auctions"
                            className={`flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-colors ${
                              isActiveRoute("/Manage-Auctions")
                                ? "bg-blue-50 text-blue-600"
                                : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                            }`}
                            onClick={() => setShowUserDropdown(false)}
                          >
                            <MdManageSearch className="w-4 h-4" />
                            <span>Manage Auctions</span>
                          </Link>
                          <Link
                            to="/Manage-Users"
                            className={`flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-colors ${
                              isActiveRoute("/Manage-Users")
                                ? "bg-blue-50 text-blue-600"
                                : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                            }`}
                            onClick={() => setShowUserDropdown(false)}
                          >
                            <FaUsers className="w-4 h-4" />
                            <span>Manage Users</span>
                          </Link>
                        </>
                      )}

                      {user?.role === "Bidder" && (
                        <Link
                          to="/my-orders"
                          className={`flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-colors ${
                            isActiveRoute("/my-orders")
                              ? "bg-blue-50 text-blue-600"
                              : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                          }`}
                          onClick={() => setShowUserDropdown(false)}
                        >
                          <MdDashboard className="w-4 h-4" />
                          <span>My Orders</span>
                        </Link>
                      )}

                      <Link
                        to="/contact"
                        className={`flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-colors ${
                          isActiveRoute("/contact")
                            ? "bg-blue-50 text-blue-600"
                            : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                        }`}
                        onClick={() => setShowUserDropdown(false)}
                      >
                        <FaEnvelope className="w-5 h-5" />
                        <span>Contact</span>
                      </Link>

                      <div className="border-t border-gray-100 my-2" />

                      <button
                        onClick={handleLogout}
                        className="w-full text-left flex items-center space-x-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                        type="button"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <div className="lg:hidden flex items-center">
              {isAuthenticated && (
                <button
                  className="mr-3"
                  onClick={() => {
                    setShowMobileNotifications((open) => !open);
                    setShowNotificationsWindow(false);
                    setShowUserDropdown(false);
                  }}
                  aria-label="Notifications"
                  type="button"
                >
                  <FaUserCircle className="w-7 h-7 text-blue-600" />
                </button>
              )}
              <button
                className="text-gray-800 focus:outline-none"
                onClick={toggleMenu}
                aria-label="Toggle menu"
                type="button"
              >
                {show ? (
                  <IoMdClose className="w-7 h-7" />
                ) : (
                  <GiHamburgerMenu className="w-7 h-7" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile notifications window */}
      {showMobileNotifications && <NotificationWindow isMobile />}

      {/* Mobile Side Drawer */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-transform duration-300 ${
          show ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="absolute inset-0 bg-black/40" onClick={closeMenu} />
        <div className="relative w-4/5 max-w-xs h-full bg-white shadow-xl pt-16 pb-6 px-4 flex flex-col">
          {isAuthenticated && (
            <div className="mb-4 flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-lg">
                  {user?.userName?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {user?.userName}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {user?.role}
                </p>
              </div>
            </div>
          )}

          {isAuthenticated && <MobileNotificationIconButton />}

          <nav className="flex-1 space-y-1 mt-2">
            {isAuthenticated && (
              <Link
                to="/auctions"
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-semibold ${
                  isActiveRoute("/auctions")
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                }`}
                onClick={closeMenu}
              >
                <RiAuctionFill className="w-5 h-5" />
                <span>Auctions</span>
              </Link>
            )}
            {isAuthenticated && (
              <Link
                to="/leaderboard"
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-semibold ${
                  isActiveRoute("/leaderboard")
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                }`}
                onClick={closeMenu}
              >
                <MdLeaderboard className="w-5 h-5" />
                <span>Leaderboard</span>
              </Link>
            )}
            <Link
              to="/how-it-works-info"
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-semibold ${
                isActiveRoute("/how-it-works-info")
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
              }`}
              onClick={closeMenu}
            >
              <SiGooglesearchconsole className="w-5 h-5" />
              <span>How it works</span>
            </Link>
            <Link
              to="/about"
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-semibold ${
                isActiveRoute("/about")
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
              }`}
              onClick={closeMenu}
            >
              <BsFillInfoSquareFill className="w-5 h-5" />
              <span>About Us</span>
            </Link>

            {isAuthenticated && (
              <>
                <Link
                  to="/me"
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-semibold ${
                    isActiveRoute("/me")
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                  }`}
                  onClick={closeMenu}
                >
                  <FaUserIcon className="w-4 h-4" />
                  <span>Profile</span>
                </Link>

                {user?.role === "Auctioneer" && (
                  <>
                    <Link
                      to="/auctioneer/orders"
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-semibold ${
                        isActiveRoute("/auctioneer/orders")
                          ? "bg-blue-600 text-white"
                          : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                      onClick={closeMenu}
                    >
                      <FaFileInvoiceDollar className="w-4 h-4" />
                      <span>Auction Orders</span>
                    </Link>
                    <Link
                      to="/create-auction"
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-semibold ${
                        isActiveRoute("/create-auction")
                          ? "bg-blue-600 text-white"
                          : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                      onClick={closeMenu}
                    >
                      <IoIosCreate className="w-4 h-4" />
                      <span>Create Auction</span>
                    </Link>
                    <Link
                      to="/view-my-auctions"
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-semibold ${
                        isActiveRoute("/view-my-auctions")
                          ? "bg-blue-600 text-white"
                          : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                      onClick={closeMenu}
                    >
                      <FaEye className="w-4 h-4" />
                      <span>View My Auctions</span>
                    </Link>
                  </>
                )}

                {user?.role === "Super Admin" && (
                  <>
                    <Link
                      to="/admin/orders-pending-delivery"
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-semibold ${
                        isActiveRoute("/admin/orders-pending-delivery")
                          ? "bg-blue-600 text-white"
                          : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                      onClick={closeMenu}
                    >
                      <FaFileInvoiceDollar className="w-4 h-4" />
                      <span>Orders Pending Delivery</span>
                    </Link>
                    <Link
                      to="/dashboard"
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-semibold ${
                        isActiveRoute("/dashboard")
                          ? "bg-blue-600 text-white"
                          : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                      onClick={closeMenu}
                    >
                      <MdDashboard className="w-4 h-4" />
                      <span>Dashboard</span>
                    </Link>
                    <Link
                      to="/Manage-Auctions"
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-semibold ${
                        isActiveRoute("/Manage-Auctions")
                          ? "bg-blue-600 text-white"
                          : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                      onClick={closeMenu}
                    >
                      <MdManageSearch className="w-4 h-4" />
                      <span>Manage Auctions</span>
                    </Link>
                    <Link
                      to="/Manage-Users"
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-semibold ${
                        isActiveRoute("/Manage-Users")
                          ? "bg-blue-600 text-white"
                          : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                      onClick={closeMenu}
                    >
                      <FaUsers className="w-4 h-4" />
                      <span>Manage Users</span>
                    </Link>
                  </>
                )}

                {user?.role === "Bidder" && (
                  <Link
                    to="/my-orders"
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-semibold ${
                      isActiveRoute("/my-orders")
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                    }`}
                    onClick={closeMenu}
                  >
                    <MdDashboard className="w-4 h-4" />
                    <span>My Orders</span>
                  </Link>
                )}
              </>
            )}

            <Link
              to="/contact"
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-semibold ${
                isActiveRoute("/contact")
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
              }`}
              onClick={closeMenu}
            >
              <FaEnvelope className="w-4 h-4" />
              <span>Contact</span>
            </Link>
          </nav>

          {/* Mobile footer auth buttons */}
          <div className="mt-4 mb-15">
            {!isAuthenticated ? (
              <div className="flex flex-col space-y-2">
                <Link
                  to="/login"
                  className="w-full text-center px-4 py-2 rounded-lg text-blue-600 font-semibold border border-blue-200 hover:bg-blue-50"
                  onClick={closeMenu}
                >
                  Login
                </Link>
                <Link
                  to="/sign-up"
                  className="btn-primary w-full text-center px-4 py-2 font-semibold"
                  onClick={closeMenu}
                >
                  Sign Up
                </Link>
              </div>
            ) : (
              <button
                onClick={() => {
                  handleLogout();
                  closeMenu();
                }}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50"
                type="button"
              >
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SideDrawer;
