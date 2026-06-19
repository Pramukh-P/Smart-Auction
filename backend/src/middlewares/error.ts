import { Request, Response, NextFunction } from "express";

class ErrorHandler extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const errorMiddleware = (err: any, _req: Request, res: Response, _next: NextFunction): void => {
  err.message = err.message || "Internal server error.";
  err.statusCode = err.statusCode || 500;
  if (err.name === "JsonWebTokenError") { err.message = "Invalid token. Please login again."; err.statusCode = 401; }
  if (err.name === "TokenExpiredError") { err.message = "Token expired. Please login again."; err.statusCode = 401; }
  if (err.name === "CastError") { err.message = `Invalid ${err.path}`; err.statusCode = 400; }
  const errorMessage = err.errors ? Object.values(err.errors).map((e: any) => e.message).join(" ") : err.message;
  res.status(err.statusCode).json({ success: false, message: errorMessage });
};

export default ErrorHandler;
