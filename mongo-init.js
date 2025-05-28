// MongoDB initialization script для Docker
print("🔧 Initializing MongoDB for KanbanTask...")

// Переключаемся на базу данных kanbantask
const db = db.getSiblingDB("kanbantask")

// Создаем коллекции с индексами
print("📊 Creating collections and indexes...")

// Users collection
db.createCollection("users")
db.users.createIndex({ email: 1 }, { unique: true })
print("✅ Users collection created")

// Boards collection
db.createCollection("boards")
db.boards.createIndex({ owner: 1 })
db.boards.createIndex({ "members.user": 1 })
print("✅ Boards collection created")

// Columns collection
db.createCollection("columns")
db.columns.createIndex({ boardId: 1, order: 1 })
print("✅ Columns collection created")

// Tasks collection
db.createCollection("tasks")
db.tasks.createIndex({ columnId: 1, order: 1 })
db.tasks.createIndex({ boardId: 1 })
db.tasks.createIndex({ assignedTo: 1 })
db.tasks.createIndex({ dueDate: 1 })
print("✅ Tasks collection created")

// Comments collection
db.createCollection("comments")
db.comments.createIndex({ taskId: 1, createdAt: -1 })
print("✅ Comments collection created")

// Создаем тестового пользователя для демонстрации
print("👤 Creating test user...")

const bcrypt = require("bcryptjs")
const testUserPassword = bcrypt.hashSync("123456", 12)

db.users.insertOne({
  name: "Test User",
  email: "test@example.com",
  passwordHash: testUserPassword,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
})

print("✅ Test user created (email: test@example.com, password: 123456)")

print("🎉 MongoDB initialization completed successfully!")
