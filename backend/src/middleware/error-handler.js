export function notFoundHandler(req, res) {
  return res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, req, res, next) {
  const isDev = process.env.NODE_ENV !== "production";

  // Prisma known request errors - don't leak DB internals
  if (err.code && err.code.startsWith("P")) {
    return res.status(400).json({
      message: "A database error occurred. Please try again."
    });
  }

  const status = err.status || err.statusCode || 500;
  const message = status < 500
    ? err.message
    : isDev
      ? err.message
      : "An unexpected error occurred.";

  return res.status(status).json({
    message,
    ...(isDev && err.stack ? { stack: err.stack } : {})
  });
}
