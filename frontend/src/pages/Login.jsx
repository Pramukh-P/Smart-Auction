// frontend/src/pages/Login.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  clearUserError,
  login,
  resendVerificationOtp,
  verifyEmailOtp,
} from "@/store/slices/userSlice";
import { useLocation, useNavigate, Link } from "react-router-dom";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    loading,
    isAuthenticated,
    error,
    otpLoading,
    otpMessage,
    otpError,
    otpUserId,
  } = useSelector((state) => state.user);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // show/hide
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Forgot-password states (kept)
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState("request");
  const [fpOtp, setFpOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [fpLoading, setFpLoading] = useState(false);
  const [fpMessage, setFpMessage] = useState("");
  const [fpError, setFpError] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // Email verification panel on Login (Issue #3 fix)
  const [showVerifyEmailPanel, setShowVerifyEmailPanel] = useState(false);
  const [verifyOtp, setVerifyOtp] = useState("");
  const [verifyUserId, setVerifyUserId] = useState("");

  const normalizedErrorMessage = useMemo(() => {
    if (!error) return "";
    if (typeof error === "string") return error;
    return error.message || "Login failed";
  }, [error]);

  useEffect(() => {
    dispatch(clearUserError());
    // prefill from signup redirect (Issue #2 fix)
    const prefill = location.state?.prefillEmail;
    if (prefill) setEmail(prefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const redirect = location.state?.from || "/";
      navigate(redirect, { replace: true });
    }
  }, [isAuthenticated, location.state, navigate]);

  // When backend says "needsVerification", show verify panel (Issue #3 fix)
  useEffect(() => {
    if (error?.needsVerification) {
      setShowVerifyEmailPanel(true);
      setVerifyUserId(error.userId || "");
      if (error.email) setEmail(error.email);
    }
  }, [error]);

  // If resend OTP thunk returns userId, store it
  useEffect(() => {
    if (otpUserId) setVerifyUserId(otpUserId);
  }, [otpUserId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(clearUserError());
    if (!email || !password) return;
    dispatch(login({ email, password }));
  };

  // Forgot-password helpers
  const resetForgotState = () => {
    setForgotStep("request");
    setFpOtp("");
    setNewPassword("");
    setConfirmNewPassword("");
    setFpLoading(false);
    setFpMessage("");
    setFpError("");
  };

  const toggleForgot = () => {
    setShowForgot((prev) => !prev);
    resetForgotState();
  };

  // STEP 1: Send OTP
  const handleSendFpOtp = async () => {
    if (!email) {
      setFpError("Please enter your registered email first.");
      return;
    }
    setFpLoading(true);
    setFpMessage("");
    setFpError("");

    try {
      const res = await fetch("http://localhost:5000/api/v1/auth/forgot-password/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      setFpMessage("OTP sent to your email. Please check your inbox/spam.");
      setForgotStep("verify");
    } catch (err) {
      setFpError(err.message);
    } finally {
      setFpLoading(false);
    }
  };

  // STEP 2: Verify OTP
  const handleVerifyFpOtp = async () => {
    if (!fpOtp) {
      setFpError("Please enter the OTP sent to your email.");
      return;
    }

    setFpLoading(true);
    setFpMessage("");
    setFpError("");

    try {
      const res = await fetch("http://localhost:5000/api/v1/auth/forgot-password/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: fpOtp }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      setFpMessage("OTP verified successfully. You can now reset your password.");
      setForgotStep("reset");
    } catch (err) {
      setFpError(err.message);
    } finally {
      setFpLoading(false);
    }
  };

  // STEP 3: Reset Password
  const handleResetPassword = async () => {
    if (!newPassword || !confirmNewPassword) {
      setFpError("Please enter your new password.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setFpError("Passwords do not match.");
      return;
    }

    setFpLoading(true);
    setFpMessage("");
    setFpError("");

    try {
      const res = await fetch("http://localhost:5000/api/v1/auth/forgot-password/reset", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: fpOtp, newPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      setFpMessage("Password reset successful. You can now log in.");
      resetForgotState();
      setShowForgot(false);
      setPassword("");
    } catch (err) {
      setFpError(err.message);
    } finally {
      setFpLoading(false);
    }
  };

  // Email verification from login (Issue #3 fix)
  const handleResendVerificationOtp = () => {
    dispatch(clearUserError());
    if (!email) return;
    dispatch(resendVerificationOtp({ email }));
  };

  const handleVerifyEmailOtp = async () => {
    dispatch(clearUserError());
    if (!verifyUserId || !verifyOtp) return;
    const action = await dispatch(verifyEmailOtp({ userId: verifyUserId, otp: verifyOtp }));
    if (verifyEmailOtp.fulfilled.match(action)) {
      // Verified: keep on login and allow password entry, no signup flash (Issue #2/#3 fix)
      setShowVerifyEmailPanel(false);
      setVerifyOtp("");
    }
  };

  return (
    <section className="page-container pt-20 pb-10 min-h-screen flex justify-center items-center bg-gradient-to-br from-gray-50 via-blue-50 to-white">
      <div className="glass bg-white/80 backdrop-blur-lg rounded-3xl shadow-glow max-w-md w-full p-8">
        <h2 className="text-red-600 text-3xl font-semibold mb-2 text-center">Login</h2>

        {normalizedErrorMessage && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
            {normalizedErrorMessage}
          </div>
        )}

        {showVerifyEmailPanel && (
          <div className="mb-5 border border-blue-200 bg-blue-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Verify your email</h3>
            <p className="text-xs text-blue-800 mb-3">
              Email is not verified. Resend OTP and verify here to enable login.
            </p>

            {otpMessage && <p className="text-xs text-green-700 mb-2">{otpMessage}</p>}
            {otpError && <p className="text-xs text-red-700 mb-2">{otpError}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                disabled={otpLoading || !email}
                onClick={handleResendVerificationOtp}
                className="flex-1 py-2 rounded-md text-xs font-semibold bg-blue-600 text-white disabled:opacity-60"
              >
                {otpLoading ? "Sending..." : "Resend OTP"}
              </button>
            </div>

            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={verifyOtp}
                onChange={(e) => setVerifyOtp(e.target.value)}
                placeholder="Enter OTP"
                className="flex-1 p-2 rounded-md border border-gray-300 text-sm"
              />
              <button
                type="button"
                disabled={otpLoading || !verifyUserId || !verifyOtp}
                onClick={handleVerifyEmailOtp}
                className="px-4 py-2 rounded-md text-xs font-semibold bg-green-600 text-white disabled:opacity-60"
              >
                {otpLoading ? "..." : "Verify"}
              </button>
            </div>
          </div>
        )}

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          {/* EMAIL */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">Email</label>
            <input
              type="email"
              className="p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600"
              placeholder="Enter your registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          {/* PASSWORD */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">Password</label>
            <div className="relative w-full">
              <input
                type={showLoginPassword ? "text" : "password"}
                className="p-3 pr-16 rounded-md w-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowLoginPassword((prev) => !prev)}
              >
                {showLoginPassword ? "hide" : "show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-3 rounded-md font-semibold text-lg transition"
          >
            {loading ? "Logging in…" : "Login"}
          </button>

          <div className="text-xs mt-2 text-center text-gray-600">
            Don't have an account?{" "}
            <Link to="/sign-up" className="text-blue-600 font-semibold hover:underline">
              Sign Up
            </Link>
            <br />
            <button
              type="button"
              className="text-xs text-blue-600 hover:text-blue-700 hover:underline mt-1"
              onClick={toggleForgot}
            >
              {showForgot ? "Close forgot password" : "Forgot password?"}
            </button>
          </div>
        </form>

        {/* FORGOT PASSWORD PANEL */}
        {showForgot && (
          <div className="mt-6 border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Reset your password</h3>
            <p className="text-sm text-blue-600 font-semibold">Enter your email above</p>

            {fpMessage && <p className="text-xs text-green-600 mb-2">{fpMessage}</p>}
            {fpError && <p className="text-xs text-red-600 mb-2">{fpError}</p>}

            <div className="flex flex-col gap-3">
              {forgotStep === "request" && (
                <button
                  type="button"
                  disabled={fpLoading || !email}
                  onClick={handleSendFpOtp}
                  className="w-full py-2 rounded-md text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition"
                >
                  {fpLoading ? "Sending OTP..." : "Send OTP"}
                </button>
              )}

              {forgotStep === "verify" && (
                <>
                  <input
                    type="text"
                    className="p-2 rounded-md border border-gray-300"
                    placeholder="Enter OTP"
                    value={fpOtp}
                    onChange={(e) => setFpOtp(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleVerifyFpOtp}
                    disabled={fpLoading || !fpOtp}
                    className="w-full py-2 rounded-md text-sm font-semibold bg-blue-600 text-white"
                  >
                    {fpLoading ? "Verifying..." : "Verify OTP"}
                  </button>
                </>
              )}

              {forgotStep === "reset" && (
                <>
                  <div className="relative w-full">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      className="p-2 pr-16 rounded-md border border-gray-300 w-full"
                      placeholder="New password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                    >
                      {showNewPassword ? "hide" : "show"}
                    </button>
                  </div>

                  <div className="relative w-full">
                    <input
                      type={showConfirmNewPassword ? "text" : "password"}
                      className="p-2 pr-16 rounded-md border border-gray-300 w-full"
                      placeholder="Confirm new password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowConfirmNewPassword((prev) => !prev)}
                    >
                      {showConfirmNewPassword ? "hide" : "show"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={
                      fpLoading ||
                      !newPassword ||
                      !confirmNewPassword ||
                      newPassword !== confirmNewPassword
                    }
                    className="w-full py-2 rounded-md text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 transition"
                  >
                    {fpLoading ? "Updating…" : "Reset Password"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Login;
