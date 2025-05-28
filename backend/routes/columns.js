const express = require("express")
const { body, validationResult } = require("express-validator")
const Column = require("../models/Column")
const Task = require("../models/Task")
const Board = require("../models/Board")
const auth = require("../middleware/auth")

const router = express.Router()

// Создать новую колонку
router.post(
  "/",
  auth,
  [
    body("title").trim().isLength({ min: 1, max: 50 }).withMessage("Название колонки обязательно (до 50 символов)"),
    body("boardId").isMongoId().withMessage("Некорректный ID доски"),
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

      const { title, boardId, color } = req.body

      // Проверяем доступ к доске
      const board = await Board.findById(boardId)
      if (!board) {
        return res.status(404).json({ message: "Доска не найдена" })
      }

      const hasAccess =
        board.owner.toString() === req.user._id.toString() ||
        board.members.some((member) => member.user.toString() === req.user._id.toString())

      if (!hasAccess) {
        return res.status(403).json({ message: "Нет доступа к этой доске" })
      }

      // Получаем максимальный порядок
      const maxOrder = await Column.findOne({ boardId }).sort({ order: -1 }).select("order")
      const order = maxOrder ? maxOrder.order + 1 : 0

      const column = new Column({
        title,
        boardId,
        order,
        color,
      })

      await column.save()

      res.status(201).json({
        message: "Колонка успешно создана",
        column: { ...column.toObject(), tasks: [] },
      })
    } catch (error) {
      console.error("Create column error:", error)
      res.status(500).json({
        message: "Ошибка создания колонки",
        error: error.message,
      })
    }
  },
)

// Обновить колонку
router.put(
  "/:id",
  auth,
  [
    body("title").optional().trim().isLength({ min: 1, max: 50 }).withMessage("Название колонки до 50 символов"),
    body("order").optional().isInt({ min: 0 }).withMessage("Порядок должен быть положительным числом"),
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

      const column = await Column.findById(req.params.id)
      if (!column) {
        return res.status(404).json({ message: "Колонка не найдена" })
      }

      // Проверяем доступ к доске
      const board = await Board.findById(column.boardId)
      const hasAccess =
        board.owner.toString() === req.user._id.toString() ||
        board.members.some((member) => member.user.toString() === req.user._id.toString())

      if (!hasAccess) {
        return res.status(403).json({ message: "Нет доступа к этой доске" })
      }

      const { title, color, limit, order } = req.body
      const updates = {}

      if (title) updates.title = title
      if (color) updates.color = color
      if (limit !== undefined) updates.limit = limit
      if (order !== undefined) updates.order = order

      const updatedColumn = await Column.findByIdAndUpdate(req.params.id, updates, { new: true })

      res.json({
        message: "Колонка успешно обновлена",
        column: updatedColumn,
      })
    } catch (error) {
      console.error("Update column error:", error)
      res.status(500).json({
        message: "Ошибка обновления колонки",
        error: error.message,
      })
    }
  },
)

// Удалить колонку
router.delete("/:id", auth, async (req, res) => {
  try {
    const column = await Column.findById(req.params.id)
    if (!column) {
      return res.status(404).json({ message: "Колонка не найдена" })
    }

    // Проверяем доступ к доске
    const board = await Board.findById(column.boardId)
    const hasAccess =
      board.owner.toString() === req.user._id.toString() ||
      board.members.some((member) => member.user.toString() === req.user._id.toString())

    if (!hasAccess) {
      return res.status(403).json({ message: "Нет доступа к этой доске" })
    }

    // Удаляем все задачи в колонке
    await Task.deleteMany({ columnId: column._id })

    // Удаляем колонку
    await Column.findByIdAndDelete(req.params.id)

    res.json({ message: "Колонка успешно удалена" })
  } catch (error) {
    console.error("Delete column error:", error)
    res.status(500).json({
      message: "Ошибка удаления колонки",
      error: error.message,
    })
  }
})

// Изменить порядок колонок
router.put("/reorder", auth, async (req, res) => {
  try {
    const { columns } = req.body // массив { id, order }

    if (!Array.isArray(columns)) {
      return res.status(400).json({ message: "Некорректные данные для изменения порядка" })
    }

    // Проверяем доступ к доске (берем первую колонку для проверки)
    if (columns.length > 0) {
      const firstColumn = await Column.findById(columns[0].id)
      if (firstColumn) {
        const board = await Board.findById(firstColumn.boardId)
        const hasAccess =
          board.owner.toString() === req.user._id.toString() ||
          board.members.some((member) => member.user.toString() === req.user._id.toString())

        if (!hasAccess) {
          return res.status(403).json({ message: "Нет доступа к этой доске" })
        }
      }
    }

    // Обновляем порядок колонок
    const updatePromises = columns.map(({ id, order }) => Column.findByIdAndUpdate(id, { order }, { new: true }))

    await Promise.all(updatePromises)

    res.json({ message: "Порядок колонок успешно изменен" })
  } catch (error) {
    console.error("Reorder columns error:", error)
    res.status(500).json({
      message: "Ошибка изменения порядка колонок",
      error: error.message,
    })
  }
})

module.exports = router
