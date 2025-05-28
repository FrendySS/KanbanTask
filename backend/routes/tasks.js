const express = require("express")
const { body, validationResult } = require("express-validator")
const Task = require("../models/Task")
const Column = require("../models/Column")
const Board = require("../models/Board")
const Comment = require("../models/Comment")
const auth = require("../middleware/auth")

const router = express.Router()

// Получить все задачи доски
router.get("/board/:boardId", auth, async (req, res) => {
  try {
    const { boardId } = req.params

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

    const tasks = await Task.find({ boardId })
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("columnId", "title")
      .sort({ order: 1 })

    res.json(tasks)
  } catch (error) {
    console.error("Get tasks error:", error)
    res.status(500).json({
      message: "Ошибка получения задач",
      error: error.message,
    })
  }
})

// Получить конкретную задачу
router.get("/:id", auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("columnId", "title")

    if (!task) {
      return res.status(404).json({ message: "Задача не найдена" })
    }

    // Проверяем доступ к доске
    const board = await Board.findById(task.boardId)
    const hasAccess =
      board.owner.toString() === req.user._id.toString() ||
      board.members.some((member) => member.user.toString() === req.user._id.toString())

    if (!hasAccess) {
      return res.status(403).json({ message: "Нет доступа к этой задаче" })
    }

    // Получаем комментарии
    const comments = await Comment.find({ taskId: task._id }).populate("author", "name email").sort({ createdAt: 1 })

    res.json({
      ...task.toObject(),
      comments,
    })
  } catch (error) {
    console.error("Get task error:", error)
    res.status(500).json({
      message: "Ошибка получения задачи",
      error: error.message,
    })
  }
})

// Создать новую задачу
router.post(
  "/",
  auth,
  [
    body("title").trim().isLength({ min: 1, max: 200 }).withMessage("Название задачи обязательно (до 200 символов)"),
    body("columnId").isMongoId().withMessage("Некорректный ID колонки"),
    body("description").optional().trim().isLength({ max: 2000 }).withMessage("Описание до 2000 символов"),
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

      const { title, description, columnId, assignedTo, priority, dueDate } = req.body

      // Проверяем существование колонки и доступ к доске
      const column = await Column.findById(columnId)
      if (!column) {
        return res.status(404).json({ message: "Колонка не найдена" })
      }

      const board = await Board.findById(column.boardId)
      const hasAccess =
        board.owner.toString() === req.user._id.toString() ||
        board.members.some((member) => member.user.toString() === req.user._id.toString())

      if (!hasAccess) {
        return res.status(403).json({ message: "Нет доступа к этой доске" })
      }

      // Получаем максимальный порядок в колонке
      const maxOrder = await Task.findOne({ columnId }).sort({ order: -1 }).select("order")
      const order = maxOrder ? maxOrder.order + 1 : 0

      const task = new Task({
        title,
        description,
        columnId,
        boardId: column.boardId,
        createdBy: req.user._id,
        assignedTo: assignedTo || null,
        priority: priority || "medium",
        dueDate: dueDate ? new Date(dueDate) : null,
        order,
        attachments: [], // Инициализируем пустой массив вложений
        comments: [], // Инициализируем пустой массив комментариев
      })

      await task.save()

      const populatedTask = await Task.findById(task._id)
        .populate("assignedTo", "name email")
        .populate("createdBy", "name email")
        .populate("columnId", "title")

      console.log("✅ Task created successfully:", populatedTask.title)

      res.status(201).json({
        message: "Задача успешно создана",
        task: populatedTask,
      })
    } catch (error) {
      console.error("Create task error:", error)
      res.status(500).json({
        message: "Ошибка создания задачи",
        error: error.message,
      })
    }
  },
)

// Обновить задачу
router.put(
  "/:id",
  auth,
  [
    body("title").optional().trim().isLength({ min: 1, max: 200 }).withMessage("Название задачи до 200 символов"),
    body("description").optional().trim().isLength({ max: 2000 }).withMessage("Описание до 2000 символов"),
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

      const task = await Task.findById(req.params.id)
      if (!task) {
        return res.status(404).json({ message: "Задача не найдена" })
      }

      // Проверяем доступ к доске
      const board = await Board.findById(task.boardId)
      const hasAccess =
        board.owner.toString() === req.user._id.toString() ||
        board.members.some((member) => member.user.toString() === req.user._id.toString())

      if (!hasAccess) {
        return res.status(403).json({ message: "Нет доступа к этой задаче" })
      }

      const {
        title,
        description,
        assignedTo,
        priority,
        status,
        dueDate,
        startDate,
        estimatedHours,
        actualHours,
        attachments,
      } = req.body

      const updates = {}
      if (title) updates.title = title
      if (description !== undefined) updates.description = description
      if (assignedTo !== undefined) updates.assignedTo = assignedTo
      if (priority) updates.priority = priority
      if (status) updates.status = status
      if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null
      if (startDate !== undefined) updates.startDate = startDate ? new Date(startDate) : null
      if (estimatedHours !== undefined) updates.estimatedHours = estimatedHours
      if (actualHours !== undefined) updates.actualHours = actualHours
      if (attachments !== undefined) updates.attachments = attachments

      // Если статус изменился на "done", устанавливаем дату завершения
      if (status === "done" && task.status !== "done") {
        updates.completedAt = new Date()
      } else if (status !== "done" && task.status === "done") {
        updates.completedAt = null
      }

      const updatedTask = await Task.findByIdAndUpdate(req.params.id, updates, { new: true })
        .populate("assignedTo", "name email")
        .populate("createdBy", "name email")
        .populate("columnId", "title")

      console.log("✅ Task updated successfully:", updatedTask.title)

      res.json({
        message: "Задача успешно обновлена",
        task: updatedTask,
      })
    } catch (error) {
      console.error("Update task error:", error)
      res.status(500).json({
        message: "Ошибка обновления задачи",
        error: error.message,
      })
    }
  },
)

// Переместить задачу между колонками
router.put("/:id/move", auth, async (req, res) => {
  try {
    const { columnId, order } = req.body

    console.log(`🔄 Moving task ${req.params.id} to column ${columnId} at position ${order}`)

    const task = await Task.findById(req.params.id)
    if (!task) {
      return res.status(404).json({ message: "Задача не найдена" })
    }

    // Проверяем доступ к доске
    const board = await Board.findById(task.boardId)
    const hasAccess =
      board.owner.toString() === req.user._id.toString() ||
      board.members.some((member) => member.user.toString() === req.user._id.toString())

    if (!hasAccess) {
      return res.status(403).json({ message: "Нет доступа к этой задаче" })
    }

    // Проверяем существование целевой колонки
    const targetColumn = await Column.findById(columnId)
    if (!targetColumn || targetColumn.boardId.toString() !== task.boardId.toString()) {
      return res.status(400).json({ message: "Некорректная целевая колонка" })
    }

    const oldColumnId = task.columnId.toString()
    const newColumnId = columnId.toString()

    // Если перемещаем в другую колонку
    if (oldColumnId !== newColumnId) {
      // Обновляем порядок задач в старой колонке (сдвигаем вверх)
      await Task.updateMany({ columnId: oldColumnId, order: { $gt: task.order } }, { $inc: { order: -1 } })

      // Обновляем порядок задач в новой колонке (сдвигаем вниз)
      await Task.updateMany({ columnId: newColumnId, order: { $gte: order } }, { $inc: { order: 1 } })
    } else {
      // Перемещение в той же колонке
      if (order > task.order) {
        // Перемещение вниз
        await Task.updateMany(
          { columnId: oldColumnId, order: { $gt: task.order, $lte: order } },
          { $inc: { order: -1 } },
        )
      } else if (order < task.order) {
        // Перемещение вверх
        await Task.updateMany(
          { columnId: oldColumnId, order: { $gte: order, $lt: task.order } },
          { $inc: { order: 1 } },
        )
      }
    }

    // Обновляем задачу
    task.columnId = columnId
    task.order = order
    await task.save()

    const updatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("columnId", "title")

    console.log("✅ Task moved successfully:", updatedTask.title)

    res.json({
      message: "Задача успешно перемещена",
      task: updatedTask,
    })
  } catch (error) {
    console.error("Move task error:", error)
    res.status(500).json({
      message: "Ошибка перемещения задачи",
      error: error.message,
    })
  }
})

// Удалить задачу
router.delete("/:id", auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
    if (!task) {
      return res.status(404).json({ message: "Задача не найдена" })
    }

    // Проверяем доступ к доске
    const board = await Board.findById(task.boardId)
    const hasAccess =
      board.owner.toString() === req.user._id.toString() ||
      board.members.some((member) => member.user.toString() === req.user._id.toString())

    if (!hasAccess) {
      return res.status(403).json({ message: "Нет доступа к этой задаче" })
    }

    // Удаляем комментарии к задаче
    await Comment.deleteMany({ taskId: task._id })

    // Обновляем порядок оставшихся задач в колонке
    await Task.updateMany({ columnId: task.columnId, order: { $gt: task.order } }, { $inc: { order: -1 } })

    // Удаляем задачу
    await Task.findByIdAndDelete(req.params.id)

    console.log("✅ Task deleted successfully:", task.title)

    res.json({ message: "Задача успешно удалена" })
  } catch (error) {
    console.error("Delete task error:", error)
    res.status(500).json({
      message: "Ошибка удаления задачи",
      error: error.message,
    })
  }
})

module.exports = router
