const { spawn } = require("child_process")
const path = require("path")

console.log("🚀 Starting KanbanTask services...")
console.log("📅 Started at:", new Date().toISOString())

// Переменные окружения
const NODE_ENV = process.env.NODE_ENV || "development"
const FRONTEND_PORT = process.env.FRONTEND_PORT || 3000
const BACKEND_PORT = process.env.PORT || 5000

console.log(`🌍 Environment: ${NODE_ENV}`)
console.log(`🔗 Frontend will run on port: ${FRONTEND_PORT}`)
console.log(`🔗 Backend will run on port: ${BACKEND_PORT}`)

// Функция для логирования с префиксом
const logWithPrefix = (prefix, data) => {
  const timestamp = new Date().toISOString()
  const message = data.toString().trim()
  if (message) {
    console.log(`[${timestamp}] [${prefix}] ${message}`)
  }
}

// Функция ожидания
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Запуск backend с задержкой для MongoDB
const startBackend = async () => {
  console.log("⏳ Waiting for MongoDB to be ready...")
  await sleep(10000) // Ждем 10 секунд для MongoDB

  console.log("🔧 Starting backend server...")
  const backend = spawn("node", ["backend/server.js"], {
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      NODE_ENV: NODE_ENV,
      PORT: BACKEND_PORT,
    },
  })

  backend.stdout.on("data", (data) => {
    logWithPrefix("BACKEND", data)
  })

  backend.stderr.on("data", (data) => {
    logWithPrefix("BACKEND-ERR", data)
  })

  backend.on("exit", (code, signal) => {
    console.log(`❌ Backend process exited with code ${code} and signal ${signal}`)
    if (code !== 0) {
      process.exit(code || 1)
    }
  })

  backend.on("error", (error) => {
    console.error("❌ Backend process error:", error)
    process.exit(1)
  })

  return backend
}

// Запуск frontend с задержкой для backend
const startFrontend = async () => {
  console.log("⏳ Waiting for backend to be ready...")
  await sleep(15000) // Ждем 15 секунд для backend

  console.log("🎨 Starting frontend server...")
  const frontend = spawn("npm", ["start"], {
    cwd: path.join(__dirname, "frontend"),
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      NODE_ENV: NODE_ENV,
      PORT: FRONTEND_PORT,
    },
  })

  frontend.stdout.on("data", (data) => {
    logWithPrefix("FRONTEND", data)
  })

  frontend.stderr.on("data", (data) => {
    logWithPrefix("FRONTEND-ERR", data)
  })

  frontend.on("exit", (code, signal) => {
    console.log(`❌ Frontend process exited with code ${code} and signal ${signal}`)
    if (code !== 0) {
      process.exit(code || 1)
    }
  })

  frontend.on("error", (error) => {
    console.error("❌ Frontend process error:", error)
    process.exit(1)
  })

  return frontend
}

// Запуск сервисов
let backend, frontend

const startServices = async () => {
  try {
    backend = await startBackend()
    frontend = await startFrontend()

    // Логирование успешного запуска
    setTimeout(() => {
      console.log("✅ Both services should be running now!")
      console.log(`🌐 Frontend: http://localhost:${FRONTEND_PORT}`)
      console.log(`🔌 Backend API: http://localhost:${BACKEND_PORT}`)
      console.log(`🏥 Health Check: http://localhost:${BACKEND_PORT}/api/health`)
    }, 5000)
  } catch (error) {
    console.error("❌ Error starting services:", error)
    process.exit(1)
  }
}

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`📴 Received ${signal}, shutting down gracefully...`)

  if (backend) backend.kill("SIGTERM")
  if (frontend) frontend.kill("SIGTERM")

  setTimeout(() => {
    console.log("⏰ Force killing processes...")
    if (backend) backend.kill("SIGKILL")
    if (frontend) frontend.kill("SIGKILL")
    process.exit(0)
  }, 10000)
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))

// Запуск
startServices()
