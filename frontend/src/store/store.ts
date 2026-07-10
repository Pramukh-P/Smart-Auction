import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { authSlice, auctionSlice, notifSlice, orderSlice, bidSlice, siteRatingSlice } from "./slices";

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    auction: auctionSlice.reducer,
    notif: notifSlice.reducer,
    order: orderSlice.reducer,
    bid: bidSlice.reducer,
    siteRating: siteRatingSlice.reducer,
  },
  middleware: gd => gd({ serializableCheck: false })
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
