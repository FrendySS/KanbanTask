const express = require("express")
const { body, validationResult } = require("express-validator")
const Comment = require("../models/Comment")
const Task = require("../models/Task")
const Board = require("../models/Board")
const auth = require("../middleware/auth")

const router = express.Router()

// Получить комментарии к задаче
router.get("/task/:taskId", auth, async (req, res) => {
  try {
    const { taskId } = req.params

    console.log("📝 Getting comments for task:", taskId)

    // Проверяем существование задачи и доступ
    const task = await Task.findById(taskId)
    if (!task) {
      return res.status(404).json({ message: "Задача не найдена" })
    }

    const board = await Board.findById(task.boardId)
    const hasAccess =
      board.owner.toString() === req.user._id.toString() ||
      board.members.some((member) => member.user._id.toString() === req.user._id.toString())

    if (!hasAccess) {
      return res.status(403).json({ message: "Нет доступа к этой задаче" })
    }

    const comments = await Comment.find({ taskId }).populate("author", "name email").sort({ createdAt: 1 })

    console.log("✅ Comments found:", comments.length)
    res.json(comments)
  } catch (error) {
    console.error("Get comments error:", error)
    res.status(500).json({
      message: "Ошибка получения комментариев",
      error: error.message,
    })
  }
})

// Создать комментарий
router.post(
  "/",
  auth,
  [
    body("taskId").isMongoId().withMessage("Некорректный ID задачи"),
    body("text").trim().isLength({ min: 1, max: 1000 }).withMessage("Текст комментария обязателен (до 1000 символов)"),
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

      const { taskId, text } = req.body

      console.log("📝 Creating comment for task:", taskId, "by user:", req.user._id)

      // Проверяем существование задачи и доступ
      const task = await Task.findById(taskId)
      if (!task) {
        return res.status(404).json({ message: "Задача не найдена" })
      }

      const board = await Board.findById(task.boardId)
      const hasAccess =
        board.owner.toString() === req.user._id.toString() ||
        board.members.some((member) => member.user._id.toString() === req.user._id.toString())

      if (!hasAccess) {
        return res.status(403).json({ message: "Нет доступа к этой задаче" })
      }

      const comment = new Comment({
        taskId,
        author: req.user._id,
        text,
      })

      await comment.save()
      console.log("✅ Comment created:", comment._id)

      const populatedComment = await Comment.findById(comment._id).populate("author", "name email")

      res.status(201).json({
        message: "Комментарий успешно создан",
        comment: populatedComment,
      })
    } catch (error) {
      console.error("Create comment error:", error)
      res.status(500).json({
        message: "Ошибка создания комментария",
        error: error.message,
      })
    }
  },
)

// Обновить комментарий
router.put(
  "/:id",
  auth,
  [body("text").trim().isLength({ min: 1, max: 1000 }).withMessage("Текст комментария обязателен (до 1000 символов)")],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Ошибка валидации",
          errors: errors.array(),
        })
      }

      const comment = await Comment.findById(req.params.id)
      if (!comment) {
        return res.status(404).json({ message: "Комментарий не найден" })
      }

      // Только автор может редактировать комментарий
      if (comment.author.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Можно редактировать только свои комментарии" })
      }

      const { text } = req.body

      comment.text = text
      comment.isEdited = true
      comment.editedAt = new Date()

      await comment.save()

      const populatedComment = await Comment.findById(comment._id).populate("author", "name email")

      res.json({
        message: "Комментарий успешно обновлен",
        comment: populatedComment,
      })
    } catch (error) {
      console.error("Update comment error:", error)
      res.status(500).json({
        message: "Ошибка обновления комментария",
        error: error.message,
      })
    }
  },
)

// Удалить комментарий
router.delete("/:id", auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id)
    if (!comment) {
      return res.status(404).json({ message: "Комментарий не найден" })
    }

    // Только автор может удалить комментарий
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Можно удалять только свои комментарии" })
    }

    await Comment.findByIdAndDelete(req.params.id)

    res.json({ message: "Комментарий успешно удален" })
  } catch (error) {
    console.error("Delete comment error:", error)
    res.status(500).json({
      message: "Ошибка удаления комментария",
      error: error.message,
    })
  }
})

module.exports = router
