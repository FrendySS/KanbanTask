const errorHandler = (err, req, res, next) => {
  console.error("Error:", err)

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((error) => ({
      field: error.path,
      message: error.message,
    }))
    return res.status(400).json({
      message: "Ошибка валидации данных",
      errors,
    })
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    return res.status(400).json({
      message: `${field} уже существует`,
    })
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      message: "Недействительный токен",
    })
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      message: "Токен истек",
    })
  }

  // Mongoose CastError
  if (err.name === "CastError") {
    return res.status(400).json({
      message: "Некорректный ID",
    })
  }

  // Default error
  res.status(err.status || 500).json({
    message: err.message || "Внутренняя ошибка сервера",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  })
}

module.exports = errorHandler
