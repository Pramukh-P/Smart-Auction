// backend/middlewares/error.js
class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorMiddleware = (err, req, res, next) => {
  // ✅ DON'T clone - preserve original error.statusCode
  err.message = err.message || 'Internal server error.';
  err.statusCode = err.statusCode || 500;

  console.error('❌ Error details:', {
    message: err.message,
    statusCode: err.statusCode,
    stack: err.stack,
    name: err.name,
  });

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    err.message = 'Json web token is invalid. Try again.';
    err.statusCode = 401;
  }

  if (err.name === 'TokenExpiredError') {
    err.message = 'Json web token is expired. Try again.';
    err.statusCode = 401;
  }

  // Mongoose errors
  if (err.name === 'CastError') {
    err.message = `Invalid ${err.path}`;
    err.statusCode = 400;
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    err.message = `${field} already exists.`;
    err.statusCode = 400;
  }

  if (err.name === 'ValidationError') {
    err.message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
    err.statusCode = 400;
  }

  // ✅ File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    err.message = 'File size too large. Maximum 5MB.';
    err.statusCode = 400;
  }

  // ✅ Custom ErrorHandler preserves statusCode
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error.';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      name: err.name 
    }),
  });
};

export default ErrorHandler;
