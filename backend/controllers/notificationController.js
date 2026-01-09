// backend/controllers/notificationController.js
import { Notification } from "../models/notificationSchema.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";

// Get latest notifications for the logged-in user
export const getNotifications = catchAsyncErrors(async (req, res, next) => {
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(15)
    .populate("auction");
  res.status(200).json({
    success: true,
    notifications,
  });
});

// Mark all notifications as seen for the user
export const markAsSeen = catchAsyncErrors(async (req, res, next) => {
  await Notification.updateMany(
    { user: req.user._id, seen: false },
    { $set: { seen: true } }
  );
  res.status(200).json({
    success: true,
    message: "Notifications marked as seen",
  });
});

// (Optional) Delete notifications older than limit
export const cleanupNotifications = catchAsyncErrors(async (req, res, next) => {
  const count = await Notification.countDocuments({ user: req.user._id });
  if (count > 15) {
    const toDelete = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(15);
    const ids = toDelete.map((n) => n._id);
    await Notification.deleteMany({ _id: { $in: ids } });
  }
  res.status(200).json({
    success: true,
    message: "Old notifications cleaned",
  });
});
