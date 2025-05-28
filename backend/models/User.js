const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      minlength: 6,
    },
    avatar: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
)

// Хеширование пароля перед сохранением
userSchema.pre("save", async function (next) {
  // Только если пароль был изменен или это новый пользователь
  if (!this.isModified("passwordHash")) return next()

  try {
    console.log("🔐 Hashing password for user:", this.email)
    const salt = await bcrypt.genSalt(12)
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt)
    console.log("✅ Password hashed successfully")
    next()
  } catch (error) {
    console.error("❌ Password hashing error:", error)
    next(error)
  }
})

// Метод для проверки пароля
userSchema.methods.comparePassword = async function (password) {
  try {
    console.log("🔍 Comparing password for user:", this.email)
    console.log("🔍 Input password:", password)
    console.log("🔍 Input password length:", password.length)
    console.log("🔍 Stored hash length:", this.passwordHash.length)
    console.log("🔍 Stored hash preview:", this.passwordHash.substring(0, 20) + "...")

    const isMatch = await bcrypt.compare(password, this.passwordHash)
    console.log("🔍 Password match result:", isMatch)

    return isMatch
  } catch (error) {
    console.error("❌ Password comparison error:", error)
    return false
  }
}

// Метод для получения публичных данных пользователя
userSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    avatar: this.avatar,
    createdAt: this.createdAt,
  }
}

module.exports = mongoose.model("User", userSchema)
