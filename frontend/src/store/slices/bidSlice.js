// frontend/src/store/slices/bidSlice.js

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

export const placeBid = createAsyncThunk(
  "bid/placeBid",
  async ({ id, amount }, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(
        `http://localhost:5000/api/v1/bid/place/${id}`,
        { amount }, // send numeric amount in body
        {
          withCredentials: true,
        }
      );
      return data;
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to place bid.";
      return rejectWithValue({ message });
    }
  }
);

const bidSlice = createSlice({
  name: "bid",
  initialState: {
    loading: false,
    error: null,
    success: false,
  },
  reducers: {
    clearBidError: (state) => {
      state.error = null;
    },
    resetBidSuccess: (state) => {
      state.success = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(placeBid.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(placeBid.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(placeBid.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to place bid.";
      });
  },
});

export const { clearBidError, resetBidSuccess } = bidSlice.actions;
export default bidSlice.reducer;
