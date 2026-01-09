//backend/middlewares/auth.js
import { User } from "../models/userSchema.js";
import jwt from "jsonwebtoken";
import ErrorHandler from "./error.js";
import { catchAsyncErrors } from "./catchAsyncErrors.js";

export const isAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    // ✅ FIXED: 401 (not 400) for missing token
    return next(new ErrorHandler("User not authenticated.", 401));
  }

  // ✅ FIXED: JWT_SECRET_KEY (matches .env)
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  const user = await User.findById(decoded.id);
  
  if (!user) {
    return next(new ErrorHandler("User not found.", 404));
  }
  
  if (user.blocked) {
    return next(new ErrorHandler("Your account is blocked by admin.", 403));
  }
  
  req.user = user;
  next();
});

export const isAuthorized = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHandler(
          `${req.user.role} not allowed to access this resource.`,
          403
        )
      );
    }
    next();
  };
};
