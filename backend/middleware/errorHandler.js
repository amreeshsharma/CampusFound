/**
 * CampusFind 2.0 - Centralized Error Handling Middleware
 */

const errorHandler = (err, req, res, next) => {
  console.error('[CampusFind Error]:', err.stack || err.message);

  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;

