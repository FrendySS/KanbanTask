const mongoose = require("mongoose")

const boardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["admin", "member", "viewer"],
          default: "member",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isPrivate: {
      type: Boolean,
      default: false,
    },
    backgroundColor: {
      type: String,
      default: "#ffffff",
    },
  },
  {
    timestamps: true,
  },
)

// Индексы для оптимизации поиска
boardSchema.index({ owner: 1 })
boardSchema.index({ "members.user": 1 })

module.exports = mongoose.model("Board", boardSchema)
