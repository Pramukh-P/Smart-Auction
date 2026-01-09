//frontend/src/custom-components/Drawer.jsx
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { deleteAuction, republishAuction } from "@/store/slices/auctionSlice";


const Drawer = ({ setOpenDrawer, openDrawer, id, loading }) => {
  const dispatch = useDispatch();
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);

  const handleRepublishAuction = () => {
    if (startTime && endTime && id) {
      const formData = new FormData();
      formData.append("startTime", startTime);
      formData.append("endTime", endTime);
      dispatch(republishAuction(id, formData));
    }
  };

  if (!openDrawer || !id) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setOpenDrawer(false)}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-red-600 text-3xl font-semibold text-center mb-4">
          Republish Auction
        </h3>
        <p className="text-gray-700 text-center mb-6">
          Let's republish auction with same details but new starting and ending time.
        </p>
        <form className="flex flex-col gap-6">
          {/* Start Time Picker */}
          <div className="flex flex-col gap-2">
            <label className="text-gray-700 font-semibold">Republish Auction Start Time</label>
            <DatePicker
              selected={startTime}
              onChange={(date) => setStartTime(date)}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              dateFormat={"MMMM d, yyyy h:mm aa"}
              className="text-lg py-2 bg-transparent border-b border-gray-400 focus:outline-none w-full"
              placeholderText="Select start time"
            />
          </div>
          {/* End Time Picker */}
          <div className="flex flex-col gap-2">
            <label className="text-gray-700 font-semibold">Republish Auction End Time</label>
            <DatePicker
              selected={endTime}
              onChange={(date) => setEndTime(date)}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              dateFormat={"MMMM d, yyyy h:mm aa"}
              className="text-lg py-2 bg-transparent border-b border-gray-400 focus:outline-none w-full"
              placeholderText="Select end time"
            />
          </div>
          <button
            type="button"
            className="bg-blue-600 text-white py-3 rounded-md font-semibold text-xl hover:bg-blue-700 transition"
            onClick={handleRepublishAuction}
            disabled={loading || !startTime || !endTime}
          >
            {loading ? "Republishing..." : "Republish"}
          </button>
          <button
            type="button"
            className="bg-yellow-500 text-white py-3 rounded-md font-semibold text-xl hover:bg-yellow-700 transition"
            onClick={() => setOpenDrawer(false)}
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
};

export default Drawer;
