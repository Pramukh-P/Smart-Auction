import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/userSchema";
import ErrorHandler from "./error";

export const catchAsyncErrors = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const isAuthenticated = catchAsyncErrors(async (req: any, res: Response, next: NextFunction) => {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
  if (!token) return next(new ErrorHandler("Please login to access this resource.", 401));
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY as string) as { id: string };
  const user = await User.findById(decoded.id);
  if (!user) return next(new ErrorHandler("User not found.", 404));
  if (user.blocked) return next(new ErrorHandler("Your account is blocked.", 403));
  req.user = user;
  next();
});

export const isAuthorized = (...roles: string[]) => (req: any, res: Response, next: NextFunction) => {
  if (!roles.includes(req.user?.role)) return next(new ErrorHandler(`${req.user?.role} is not authorized.`, 403));
  next();
};

export const trackCommissionStatus = catchAsyncErrors(async (req: any, res: Response, next: NextFunction) => {
  const user = await User.findById(req.user._id);
  if (user && user.unpaidCommission > 0)
    return next(new ErrorHandler("Pay your unpaid commission before creating a new auction.", 403));
  next();
});
