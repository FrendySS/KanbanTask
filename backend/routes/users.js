const express = require("express")
const bcrypt = require("bcryptjs")
const User = require("../models/User")
const auth = require("../middleware/auth")

const router = express.Router()

// Обновление профиля пользователя
router.put("/profile", auth, async (req, res) => {
  try {
    const { name, email } = req.body
    const userId = req.user.id

    console.log(`📝 Updating profile for user: ${userId}`)

    // Проверяем, не занят ли email другим пользователем
    if (email !== req.user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } })
      if (existingUser) {
        return res.status(400).json({ message: "Email уже используется другим пользователем" })
      }
    }

    // Обновляем пользователя
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, email },
      { new: true, runValidators: true },
    ).select("-passwordHash")

    if (!updatedUser) {
      return res.status(404).json({ message: "Пользователь не найден" })
    }

    console.log(`✅ Profile updated for user: ${updatedUser.email}`)
    res.json(updatedUser)
  } catch (error) {
    console.error("❌ Error updating profile:", error)
    res.status(500).json({ message: "Ошибка сервера" })
  }
})

// Смена пароля
router.put("/password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const userId = req.user.id

    console.log(`🔐 Changing password for user: ${userId}`)

    // Валидация входных данных
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Текущий и новый пароль обязательны" })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Новый пароль должен содержать минимум 6 символов" })
    }

    // Находим пользователя
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" })
    }

    console.log(`🔍 Found user: ${user.email}`)
    console.log(`🔍 Current password provided: ${currentPassword}`)
    console.log(`🔍 Stored hash exists: ${!!user.passwordHash}`)

    // Проверяем текущий пароль используя метод модели
    const isCurrentPasswordValid = await user.comparePassword(currentPassword)
    if (!isCurrentPasswordValid) {
      console.log(`❌ Current password invalid for user: ${user.email}`)
      return res.status(400).json({ message: "Неверный текущий пароль" })
    }

    console.log(`✅ Current password valid for user: ${user.email}`)

    // Хешируем новый пароль
    const saltRounds = 12
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds)

    console.log(`🔐 New password hashed for user: ${user.email}`)

    // Обновляем пароль
    await User.findByIdAndUpdate(userId, { passwordHash: hashedNewPassword })

    console.log(`✅ Password changed successfully for user: ${user.email}`)
    res.json({ message: "Пароль успешно изменен" })
  } catch (error) {
    console.error("❌ Error changing password:", error)
    res.status(500).json({
      message: "Ошибка сервера",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
})

// Поиск пользователей
router.get("/search", auth, async (req, res) => {
  try {
    const { q } = req.query

    if (!q || q.length < 2) {
      return res.json([])
    }

    console.log(`🔍 Searching users with query: ${q}`)

    const users = await User.find({
      $or: [{ name: { $regex: q, $options: "i" } }, { email: { $regex: q, $options: "i" } }],
      _id: { $ne: req.user.id }, // Исключаем текущего пользователя
    })
      .select("name email")
      .limit(10)

    console.log(`✅ Found ${users.length} users`)
    res.json(users)
  } catch (error) {
    console.error("❌ Error searching users:", error)
    res.status(500).json({ message: "Ошибка сервера" })
  }
})

// Получить информацию о пользователе
router.get("/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("name email avatar createdAt")

    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" })
    }

    res.json(user)
  } catch (error) {
    console.error("Get user error:", error)
    res.status(500).json({
      message: "Ошибка получения данных пользователя",
      error: error.message,
    })
  }
})

module.exports = router
