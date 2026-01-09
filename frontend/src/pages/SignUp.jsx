// frontend/src/pages/SignUp.jsx
import axios from "axios";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Spinner from "@/custom-components/Spinner";
import { Link } from "react-router-dom";

const API_URL = "http://localhost:5000/api/v1/user";

const SignUp = () => {
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");

  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");

  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);

  const [registerLoading, setRegisterLoading] = useState(false);

  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [userId, setUserId] = useState("");
  const [otpError, setOtpError] = useState("");
  const [registrationMessage, setRegistrationMessage] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  // Issue #2 fix: prevent flashing back to register form after verify
  const [verificationDone, setVerificationDone] = useState(false);

  const { isAuthenticated } = useSelector((state) => state.user);
  const navigateTo = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    setRegisterLoading(true);
    setRegistrationMessage("");
    setShowOtp(false);
    setOtpError("");
    setVerificationDone(false);

    const formData = new FormData();
    formData.append("userName", userName);
    formData.append("email", email);
    formData.append("phone", phone);
    formData.append("password", password);
    formData.append("address", address);
    formData.append("role", role);
    formData.append("profileImage", profileImage);

    if (role === "Auctioneer") {
      formData.append("bankAccountName", bankAccountName);
      formData.append("bankAccountNumber", bankAccountNumber);
      formData.append("bankName", bankName);
      formData.append("upiId", upiId);
      formData.append("paypalEmail", paypalEmail);
    }

    try {
      const res = await axios.post(`${API_URL}/register`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      setUserId(res.data.userId);
      setShowOtp(true);
      setRegistrationMessage(res.data.message || "OTP sent to your email. Please verify.");
    } catch (err) {
      setRegistrationMessage(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleOTPVerify = async (e) => {
    e.preventDefault();
    setOtpError("");
    setOtpLoading(true);

    try {
      const res = await axios.post(
        `${API_URL}/verify-otp`,
        { userId, otp },
        { withCredentials: true }
      );

      setRegistrationMessage(res.data.message || "Email verified. Registration complete!");
      setVerificationDone(true);

      // Issue #2 fix: go to login with email prefilled (no signup flash)
      setTimeout(() => {
        navigateTo("/login", { state: { prefillEmail: email } });
      }, 1200);
    } catch (err) {
      setOtpError(err.response?.data?.message || "OTP verification failed. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) navigateTo("/");
  }, [isAuthenticated, navigateTo]);

  const imageHandler = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setProfileImagePreview(reader.result);
      setProfileImage(file);
    };
  };

  return (
    <section className="page-container min-h-screen flex justify-center items-center pt-20 pb-10">
      <div className="glass bg-white/80 backdrop-blur-lg rounded-3xl shadow-glow max-w-4xl w-full p-8 flex flex-col gap-6 items-center">
        <h1 className="text-red-600 text-4xl md:text-6xl font-extrabold mb-4 text-center">
          Register
        </h1>

        {(registerLoading || otpLoading) && <Spinner />}

        {registrationMessage && (
          <p className="text-green-700 font-semibold text-center">{registrationMessage}</p>
        )}

        {!showOtp ? (
          <form onSubmit={handleRegister} className="w-full flex flex-col gap-8">
            {/* Personal Details */}
            <section className="flex flex-col gap-6">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Personal Details</h2>

              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 flex flex-col">
                  <label className="text-gray-600 font-medium mb-2">Full Name</label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    required
                    className="p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600 bg-transparent"
                  />
                </div>
                <div className="flex-1 flex flex-col">
                  <label className="text-gray-600 font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600 bg-transparent"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 flex flex-col">
                  <label className="text-gray-600 font-medium mb-2">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600 bg-transparent"
                  />
                </div>
                <div className="flex-1 flex flex-col">
                  <label className="text-gray-600 font-medium mb-2">Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    className="p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600 bg-transparent"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 flex flex-col">
                  <label className="text-gray-600 font-medium mb-2">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                    className="p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600 bg-transparent"
                  >
                    <option value="">Select Role</option>
                    <option value="Auctioneer">Auctioneer</option>
                    <option value="Bidder">Bidder</option>
                  </select>
                </div>
                <div className="flex-1 flex flex-col">
                  <label className="text-gray-600 font-medium mb-2">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600 bg-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <img
                  src={profileImagePreview || "imageHolder.jpg"}
                  alt="profile"
                  className="w-16 h-16 rounded-full object-cover shadow-md"
                />
                <input type="file" accept="image/*" onChange={imageHandler} required />
              </div>
            </section>

            {/* Payment Details – Auctioneer only */}
            {role === "Auctioneer" && (
              <section className="flex flex-col gap-6 w-full">
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
                  Payment Method Details
                </h2>
                <p className="text-sm text-gray-600 mb-2">
                  Fill payment details only if you are registering as an Auctioneer.
                </p>

                <div className="flex flex-col sm:flex-row gap-6">
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600 bg-transparent flex-1"
                  >
                    <option value="">Select your Bank</option>
                    <option value="SBI">SBI</option>
                    <option value="ICICI">ICICI</option>
                    <option value="HDFC">HDFC</option>
                    <option value="Canara Bank">Canara Bank</option>
                    <option value="Other">Other</option>
                  </select>

                  <input
                    type="text"
                    value={bankAccountNumber}
                    placeholder="Account Number (e.g., 123456789012)"
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    className="p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600 bg-transparent flex-1"
                  />

                  <input
                    type="text"
                    value={bankAccountName}
                    placeholder="Bank Account User Name (e.g., Rohan Kumar S)"
                    onChange={(e) => setBankAccountName(e.target.value)}
                    className="p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600 bg-transparent flex-1"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-6">
                  <input
                    type="text"
                    value={upiId}
                    placeholder="UPI ID (e.g., rohan@oksbi)"
                    onChange={(e) => setUpiId(e.target.value)}
                    className="p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600 bg-transparent flex-1"
                  />
                  <input
                    type="email"
                    value={paypalEmail}
                    placeholder="PayPal ID (e.g., rohan.payments@gmail.com)"
                    onChange={(e) => setPaypalEmail(e.target.value)}
                    className="p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600 bg-transparent flex-1"
                  />
                </div>
              </section>
            )}

            <button
              type="submit"
              disabled={registerLoading}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold w-full max-w-lg py-3 rounded-md text-xl transition mx-auto"
            >
              {registerLoading ? "Registering..." : "Register"}
            </button>

            <div className="text-xs m-auto items-center align-middle">
              Already have an account{" "}
              <Link
                to="/login"
                className="px-2 py-1 text-[13px] text-blue-600 font-semibold rounded-xl"
              >
                Login
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleOTPVerify} className="w-full flex flex-col gap-8">
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Verify Email</h2>
            <label>Enter OTP sent to your email</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              disabled={verificationDone}
              className="p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600 bg-transparent w-60 mx-auto disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={otpLoading || verificationDone}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold w-full max-w-lg py-3 rounded-md text-xl transition mx-auto"
            >
              {verificationDone ? "Verified" : "Verify OTP"}
            </button>

            {otpError && <p className="text-red-600 text-center">{otpError}</p>}

            {verificationDone && (
              <p className="text-xs text-gray-600 text-center">
                Redirecting to login…
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
};

export default SignUp;
