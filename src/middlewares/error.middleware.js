const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500
  let message = err.message ||
    "Internal Server Error"

  // MongoDB Duplicate Key Error:
  if (err.code === 11000) {
    statusCode = 409
    const field = Object.keys(
      err.keyValue
    )[0]
    message = `${field} already exists!`
  }

  // MongoDB Validation Error:
  if (err.name === 'ValidationError') {
    statusCode = 400
    message = Object.values(err.errors)
      .map(e => e.message)
      .join(', ')
  }

  // JWT Errors:
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401
    message = "Invalid token!"
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401
    message = "Token expired! Please login again."
  }

  // Cast Error (Invalid MongoDB ID):
  if (err.name === 'CastError') {
    statusCode = 400
    message = `Invalid ${err.path}!`
  }

  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors: err.errors || [],
    ...(process.env.NODE_ENV === 'development'
      && { stack: err.stack })
  })
}

export { errorHandler }