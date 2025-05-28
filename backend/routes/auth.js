const express = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { body, validationResult } = require("express-validator")
const User = require("../models/User")
const auth = require("../middleware/auth")

const router = express.Router()

// Регистрация
router.post(
  "/register",
  [
    body("name").trim().isLength({ min: 2, max: 50 }).withMessage("Имя должно быть от 2 до 50 символов"),
    body("email").isEmail().normalizeEmail().withMessage("Некорректный email"),
    body("password").isLength({ min: 6 }).withMessage("Пароль должен быть минимум 6 символов"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Ошибка валидации",
          errors: errors.array(),
        })
      }

      const { name, email, password } = req.body

      console.log("📝 Registration attempt for:", email)

      // Проверяем, существует ли пользователь
      const existingUser = await User.findOne({ email })
      if (existingUser) {
        console.log("❌ User already exists:", email)
        return res.status(400).json({
          message: "Пользователь с таким email уже существует",
        })
      }

      // Хешируем пароль
      const saltRounds = 12
      const passwordHash = await bcrypt.hash(password, saltRounds)

      // Создаем пользователя
      const user = new User({
        name,
        email,
        passwordHash,
      })

      await user.save()
      console.log("✅ User created:", email)

      // Создаем JWT токен
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      })

      res.status(201).json({
        message: "Пользователь успешно зарегистрирован",
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
        },
      })
    } catch (error) {
      console.error("Registration error:", error)
      res.status(500).json({
        message: "Ошибка сервера при регистрации",
        error: error.message,
      })
    }
  },
)

// Вход
router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail().withMessage("Некорректный email"),
    body("password").exists().withMessage("Пароль обязателен"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Ошибка валидации",
          errors: errors.array(),
        })
      }

      const { email, password } = req.body

      console.log("🔐 Login attempt for:", email)
      console.log("🔍 Login data - Email:", email, "Password length:", password.length)

      // Находим пользователя
      const user = await User.findOne({ email })
      if (!user) {
        console.log("❌ User not found:", email)
        return res.status(401).json({
          message: "Неверный email или пароль",
        })
      }

      console.log("✅ User found:", email)
      console.log("🔍 User active status:", user.isActive)

      // Проверяем, активен ли пользователь
      if (!user.isActive) {
        console.log("❌ User is not active:", email)
        return res.status(401).json({
          message: "Аккаунт заблокирован",
        })
      }

      // Проверяем пароль
      console.log("🔍 Comparing password for user:", email)
      console.log("🔍 Input password length:", password.length)
      console.log("🔍 Stored hash length:", user.passwordHash.length)

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
      console.log("🔍 Password match result:", isPasswordValid)

      if (!isPasswordValid) {
        console.log("❌ Invalid password for user:", email)
        return res.status(401).json({
          message: "Неверный email или пароль",
        })
      }

      console.log("✅ Password valid for user:", email)

      // Обновляем время последнего входа
      user.lastLoginAt = new Date()
      await user.save()

      // Создаем JWT токен
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      })

      console.log("✅ Login successful for user:", email)

      res.json({
        message: "Вход выполнен успешно",
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
        },
      })
    } catch (error) {
      console.error("Login error:", error)
      res.status(500).json({
        message: "Ошибка сервера при входе",
        error: error.message,
      })
    }
  },
)

// Получение текущего пользователя
router.get("/me", auth, async (req, res) => {
  try {
    console.log("🔍 Getting current user:", req.user._id)

    const user = await User.findById(req.user._id).select("-passwordHash")
    if (!user) {
      console.log("❌ User not found in /me:", req.user._id)
      return res.status(404).json({ message: "Пользователь не найден" })
    }

    console.log("✅ Current user found:", user.email)

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      createdAt: user.createdAt,
    })
  } catch (error) {
    console.error("Get current user error:", error)
    res.status(500).json({
      message: "Ошибка получения данных пользователя",
      error: error.message,
    })
  }
})

// Обновление профиля
router.put(
  "/profile",
  auth,
  [
    body("name").optional().trim().isLength({ min: 2, max: 50 }).withMessage("Имя должно быть от 2 до 50 символов"),
    body("email").optional().isEmail().normalizeEmail().withMessage("Некорректный email"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Ошибка валидации",
          errors: errors.array(),
        })
      }

      const { name, email } = req.body
      const updates = {}

      if (name) updates.name = name
      if (email) {
        // Проверяем, не занят ли email
        const existingUser = await User.findOne({ email, _id: { $ne: req.user._id } })
        if (existingUser) {
          return res.status(400).json({
            message: "Пользователь с таким email уже существует",
          })
        }
        updates.email = email
      }

      const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select("-passwordHash")

      res.json({
        message: "Профиль успешно обновлен",
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        },
      })
    } catch (error) {
      console.error("Update profile error:", error)
      res.status(500).json({
        message: "Ошибка обновления профиля",
        error: error.message,
      })
    }
  },
)

// Смена пароля
router.put(
  "/change-password",
  auth,
  [
    body("currentPassword").exists().withMessage("Текущий пароль обязателен"),
    body("newPassword").isLength({ min: 6 }).withMessage("Новый пароль должен быть минимум 6 символов"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Ошибка валидации",
          errors: errors.array(),
        })
      }

      const { currentPassword, newPassword } = req.body

      const user = await User.findById(req.user._id)
      if (!user) {
        return res.status(404).json({ message: "Пользователь не найден" })
      }

      // Проверяем текущий пароль
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash)
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          message: "Неверный текущий пароль",
        })
      }

      // Хешируем новый пароль
      const saltRounds = 12
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds)

      // Обновляем пароль
      user.passwordHash = newPasswordHash
      await user.save()

      res.json({
        message: "Пароль успешно изменен",
      })
    } catch (error) {
      console.error("Change password error:", error)
      res.status(500).json({
        message: "Ошибка смены пароля",
        error: error.message,
      })
    }
  },
)

module.exports = router
