const express = require("express")
const cors = require("cors")
const mongoose = require("mongoose")
const http = require("http")
const socketIo = require("socket.io")
const jwt = require("jsonwebtoken")
const path = require("path")
require("dotenv").config()

const authRoutes = require("./routes/auth")
const boardRoutes = require("./routes/boards")
const taskRoutes = require("./routes/tasks")
const userRoutes = require("./routes/users")
const columnRoutes = require("./routes/columns")
const commentRoutes = require("./routes/comments")
const attachmentRoutes = require("./routes/attachments")
const errorHandler = require("./middleware/errorHandler")

const app = express()
const server = http.createServer(app)

// Security middleware
// app.use(
//   helmet({
//     crossOriginResourcePolicy: { policy: "cross-origin" },
//   }),
// )

// Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 1000,
//   message: "Too many requests from this IP, please try again later.",
// })
// app.use("/api/", limiter)

// Socket.io настройка
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
})

// CORS настройка
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
)

// Body parsing middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Статические файлы для вложений
app.use("/attachments", express.static(path.join(__dirname, process.env.UPLOAD_PATH || "./uploads")))

// Подключение к MongoDB с исправленными настройками
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/kanbantask", {
      // Убираем deprecated опции
    })
    console.log("✅ Connected to MongoDB")
  } catch (error) {
    console.error("❌ MongoDB connection error:", error)
    process.exit(1)
  }
}

connectDB()

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/boards", boardRoutes)
app.use("/api/tasks", taskRoutes)
app.use("/api/users", userRoutes)
app.use("/api/columns", columnRoutes)
app.use("/api/comments", commentRoutes)
app.use("/api/attachments", attachmentRoutes)

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "KanbanTask Backend is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  })
})

// Socket.io авторизация
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token
    if (!token) {
      return next(new Error("No token provided"))
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key")
    socket.userId = decoded.userId
    next()
  } catch (err) {
    console.error("Socket authentication error:", err.message)
    next(new Error("Authentication error"))
  }
})

// Socket.io обработчики
io.on("connection", (socket) => {
  console.log(`👤 User ${socket.userId} connected`)

  socket.on("join-board", (boardId) => {
    socket.join(`board-${boardId}`)
    console.log(`📋 User ${socket.userId} joined board ${boardId}`)
  })

  socket.on("leave-board", (boardId) => {
    socket.leave(`board-${boardId}`)
    console.log(`📋 User ${socket.userId} left board ${boardId}`)
  })

  socket.on("task-created", (data) => {
    socket.to(`board-${data.boardId}`).emit("task-created", data)
    console.log(`📝 Task created in board ${data.boardId}`)
  })

  socket.on("task-updated", (data) => {
    socket.to(`board-${data.boardId}`).emit("task-updated", data)
    console.log(`📝 Task updated in board ${data.boardId}`)
  })

  socket.on("task-deleted", (data) => {
    socket.to(`board-${data.boardId}`).emit("task-deleted", data)
    console.log(`📝 Task deleted in board ${data.boardId}`)
  })

  socket.on("task-moved", (data) => {
    socket.to(`board-${data.boardId}`).emit("task-moved", data)
    console.log(`📝 Task moved in board ${data.boardId}`)
  })

  socket.on("comment-added", (data) => {
    socket.to(`board-${data.boardId}`).emit("comment-added", data)
    console.log(`💬 Comment added in board ${data.boardId}`)
  })

  socket.on("comment-deleted", (data) => {
    socket.to(`board-${data.boardId}`).emit("comment-deleted", data)
    console.log(`💬 Comment deleted in board ${data.boardId}`)
  })

  socket.on("column-created", (data) => {
    socket.to(`board-${data.boardId}`).emit("column-created", data)
    console.log(`📊 Column created in board ${data.boardId}`)
  })

  socket.on("column-updated", (data) => {
    socket.to(`board-${data.boardId}`).emit("column-updated", data)
    console.log(`📊 Column updated in board ${data.boardId}`)
  })

  socket.on("column-deleted", (data) => {
    socket.to(`board-${data.boardId}`).emit("column-deleted", data)
    console.log(`📊 Column deleted in board ${data.boardId}`)
  })

  socket.on("disconnect", () => {
    console.log(`👤 User ${socket.userId} disconnected`)
  })
})

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
  })
})

// Error handling middleware
app.use(errorHandler)

const PORT = process.env.PORT || 5000

server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`)
  console.log(`📡 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:3000"}`)
})

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully")
  server.close(() => {
    console.log("Process terminated")
  })
})

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully")
  server.close(() => {
    console.log("Process terminated")
  })
})

module.exports = { app, io }
