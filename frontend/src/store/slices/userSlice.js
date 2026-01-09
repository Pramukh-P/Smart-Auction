// frontend/src/store/slices/userSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = "http://localhost:5000/api/v1/user";
const ORDER_API = "http://localhost:5000/api/v1/order";

axios.defaults.withCredentials = true;

// Restore user from localStorage
let storedUser = null;
if (typeof window !== "undefined") {
  try {
    const raw = localStorage.getItem("smartAuctionUser");
    storedUser = raw ? JSON.parse(raw) : null;
  } catch {
    storedUser = null;
  }
}

// ✅ Login
export const login = createAsyncThunk(
  "user/login",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(`${API_URL}/login`, { email, password });
      return data.user;
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;

      // support special unverified payload from backend
      if (status === 403 && data?.needsVerification) {
        return rejectWithValue({
          message: data.message || "Email not verified.",
          status,
          needsVerification: true,
          userId: data.userId,
          email: data.email,
        });
      }

      return rejectWithValue({
        message: data?.message || "Failed to login",
        status: status || 0,
      });
    }
  }
);

// ✅ Resend verification OTP (requires route POST /api/v1/user/resend-otp)
export const resendVerificationOtp = createAsyncThunk(
  "user/resendVerificationOtp",
  async ({ email }, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(`${API_URL}/resend-otp`, { email });
      return data; // {success, message, userId}
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to resend OTP");
    }
  }
);

// ✅ Verify email OTP (reuse existing /verify-otp)
export const verifyEmailOtp = createAsyncThunk(
  "user/verifyEmailOtp",
  async ({ userId, otp }, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(`${API_URL}/verify-otp`, { userId, otp });
      return data; // {success, message}
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "OTP verification failed");
    }
  }
);

// ✅ Logout
export const logout = createAsyncThunk("user/logout", async (_, { rejectWithValue }) => {
  try {
    await axios.get(`${API_URL}/logout`);
    return true;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to logout");
  }
});

// ✅ Update profile
export const updateProfile = createAsyncThunk(
  "user/updateProfile",
  async (formData, { rejectWithValue }) => {
    try {
      const { data } = await axios.put(`${API_URL}/me`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data.user;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update profile");
    }
  }
);

// ✅ Fetch public profile
export const fetchPublicProfile = createAsyncThunk(
  "user/fetchPublicProfile",
  async (userId, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(`${API_URL}/public/${userId}`);
      return data.profile;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch profile");
    }
  }
);

// ✅ Rate auctioneer
export const rateAuctioneer = createAsyncThunk(
  "user/rateAuctioneer",
  async ({ orderId, rating, comment }, { rejectWithValue }) => {
    try {
      await axios.post(`${ORDER_API}/rate`, { orderId, rating, comment });
      return { orderId, rating, comment };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to submit rating");
    }
  }
);

// ✅ Leaderboard
export const getLeaderboard = createAsyncThunk(
  "user/getLeaderboard",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(`${API_URL}/leaderboard`, { withCredentials: true });
      return data.leaderboard || [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch leaderboard");
    }
  }
);

const initialState = {
  user: storedUser,
  isAuthenticated: !!storedUser,
  loading: false,

  // IMPORTANT: error is now an object OR null
  // { message, status, needsVerification?, userId?, email? }
  error: null,

  // For OTP resend/verify flows
  otpLoading: false,
  otpMessage: null,
  otpError: null,
  otpUserId: null,

  leaderboard: [],
  leaderboardLoading: false,

  publicProfile: null,
  publicProfileLoading: false,
  publicProfileError: null,

  ratingSubmitting: false,
  ratingError: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    logoutSuccess(state) {
      state.user = null;
      state.isAuthenticated = false;
      if (typeof window !== "undefined") localStorage.removeItem("smartAuctionUser");
    },
    clearUserError(state) {
      state.error = null;
      state.ratingError = null;
      state.publicProfileError = null;
      state.otpError = null;
      state.otpMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // LOGIN
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload;

        try {
          if (typeof window !== "undefined") {
            localStorage.setItem("smartAuctionUser", JSON.stringify(action.payload));
          }
        } catch {
          // ignore
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;

        // normalize error
        if (typeof action.payload === "string") {
          state.error = { message: action.payload, status: 0 };
        } else {
          state.error = action.payload || { message: "Login failed", status: 0 };
        }
      })

      // RESEND OTP
      .addCase(resendVerificationOtp.pending, (state) => {
        state.otpLoading = true;
        state.otpError = null;
        state.otpMessage = null;
      })
      .addCase(resendVerificationOtp.fulfilled, (state, action) => {
        state.otpLoading = false;
        state.otpMessage = action.payload?.message || "OTP sent.";
        state.otpUserId = action.payload?.userId || null;
      })
      .addCase(resendVerificationOtp.rejected, (state, action) => {
        state.otpLoading = false;
        state.otpError = action.payload || "Failed to resend OTP";
      })

      // VERIFY OTP
      .addCase(verifyEmailOtp.pending, (state) => {
        state.otpLoading = true;
        state.otpError = null;
        state.otpMessage = null;
      })
      .addCase(verifyEmailOtp.fulfilled, (state, action) => {
        state.otpLoading = false;
        state.otpMessage = action.payload?.message || "Email verified.";
      })
      .addCase(verifyEmailOtp.rejected, (state, action) => {
        state.otpLoading = false;
        state.otpError = action.payload || "OTP verification failed";
      })

      // LOGOUT
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.loading = false;
        if (typeof window !== "undefined") localStorage.removeItem("smartAuctionUser");
      })
      .addCase(logout.rejected, (state, action) => {
        state.error = { message: action.payload || "Failed to logout", status: 0 };
      })

      // LEADERBOARD
      .addCase(getLeaderboard.pending, (state) => {
        state.leaderboardLoading = true;
      })
      .addCase(getLeaderboard.fulfilled, (state, action) => {
        state.leaderboardLoading = false;
        state.leaderboard = action.payload;
      })
      .addCase(getLeaderboard.rejected, (state, action) => {
        state.leaderboardLoading = false;
        state.error = { message: action.payload || "Failed to fetch leaderboard", status: 0 };
        state.leaderboard = [];
      })

      // UPDATE PROFILE
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;

        try {
          if (typeof window !== "undefined") {
            localStorage.setItem("smartAuctionUser", JSON.stringify(action.payload));
          }
        } catch {
          // ignore
        }
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = { message: action.payload || "Failed to update profile", status: 0 };
      })

      // PUBLIC PROFILE
      .addCase(fetchPublicProfile.pending, (state) => {
        state.publicProfileLoading = true;
        state.publicProfileError = null;
      })
      .addCase(fetchPublicProfile.fulfilled, (state, action) => {
        state.publicProfileLoading = false;
        state.publicProfile = action.payload;
      })
      .addCase(fetchPublicProfile.rejected, (state, action) => {
        state.publicProfileLoading = false;
        state.publicProfileError = action.payload || "Failed to fetch profile";
      })

      // RATING
      .addCase(rateAuctioneer.pending, (state) => {
        state.ratingSubmitting = true;
        state.ratingError = null;
      })
      .addCase(rateAuctioneer.fulfilled, (state) => {
        state.ratingSubmitting = false;
      })
      .addCase(rateAuctioneer.rejected, (state, action) => {
        state.ratingSubmitting = false;
        state.ratingError = action.payload || "Failed to submit rating";
      });
  },
});

export const { logoutSuccess, clearUserError } = userSlice.actions;
export default userSlice.reducer;
