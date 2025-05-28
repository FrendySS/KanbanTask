const mongoose = require("mongoose")

const columnSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    color: {
      type: String,
      default: "#f3f4f6",
    },
    limit: {
      type: Number,
      default: null, // null означает без лимита
    },
  },
  {
    timestamps: true,
  },
)

// Индексы
columnSchema.index({ boardId: 1, order: 1 })

module.exports = mongoose.model("Column", columnSchema)
