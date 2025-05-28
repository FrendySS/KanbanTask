const express = require("express")
const { body, validationResult } = require("express-validator")
const Board = require("../models/Board")
const Column = require("../models/Column")
const Task = require("../models/Task")
const User = require("../models/User")
const auth = require("../middleware/auth")

const router = express.Router()

// Получить все доски пользователя (только свои и где участник)
router.get("/", auth, async (req, res) => {
  try {
    const boards = await Board.find({
      $or: [{ owner: req.user._id }, { "members.user": req.user._id }],
    })
      .populate("owner", "name email")
      .populate("members.user", "name email")
      .sort({ updatedAt: -1 })

    res.json(boards)
  } catch (error) {
    console.error("Get boards error:", error)
    res.status(500).json({
      message: "Ошибка получения досок",
      error: error.message,
    })
  }
})

// Получить конкретную доску с колонками и задачами
router.get("/:id", auth, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id)
      .populate("owner", "name email")
      .populate("members.user", "name email")

    if (!board) {
      return res.status(404).json({ message: "Доска не найдена" })
    }

    // Проверяем доступ
    const hasAccess =
      board.owner._id.toString() === req.user._id.toString() ||
      board.members.some((member) => member.user._id.toString() === req.user._id.toString())

    if (!hasAccess) {
      return res.status(403).json({ message: "Нет доступа к этой доске" })
    }

    // Получаем колонки с задачами
    const columns = await Column.find({ boardId: board._id }).sort({ order: 1 })

    const columnsWithTasks = await Promise.all(
      columns.map(async (column) => {
        const tasks = await Task.find({ columnId: column._id })
          .populate("assignedTo", "name email")
          .populate("createdBy", "name email")
          .sort({ order: 1 })

        return {
          ...column.toObject(),
          tasks,
        }
      }),
    )

    res.json({
      ...board.toObject(),
      columns: columnsWithTasks,
    })
  } catch (error) {
    console.error("Get board error:", error)
    res.status(500).json({
      message: "Ошибка получения доски",
      error: error.message,
    })
  }
})

// Создать новую доску
router.post(
  "/",
  auth,
  [body("title").trim().isLength({ min: 1, max: 100 }).withMessage("Название доски обязательно (до 100 символов)")],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Ошибка валидации",
          errors: errors.array(),
        })
      }

      const { title, description } = req.body

      // Создаем доску
      const board = new Board({
        title,
        description,
        owner: req.user._id,
        members: [
          {
            user: req.user._id,
            role: "admin",
          },
        ],
      })

      await board.save()

      // Создаем стандартные колонки
      const defaultColumns = [
        { title: "К выполнению", order: 0 },
        { title: "В процессе", order: 1 },
        { title: "Выполнено", order: 2 },
      ]

      const columns = await Promise.all(
        defaultColumns.map(async (col) => {
          const column = new Column({
            title: col.title,
            boardId: board._id,
            order: col.order,
          })
          return await column.save()
        }),
      )

      // Получаем созданную доску с популяцией
      const populatedBoard = await Board.findById(board._id)
        .populate("owner", "name email")
        .populate("members.user", "name email")

      res.status(201).json({
        message: "Доска успешно создана",
        board: {
          ...populatedBoard.toObject(),
          columns: columns.map((col) => ({ ...col.toObject(), tasks: [] })),
        },
      })
    } catch (error) {
      console.error("Create board error:", error)
      res.status(500).json({
        message: "Ошибка создания доски",
        error: error.message,
      })
    }
  },
)

// Обновить доску
router.put(
  "/:id",
  auth,
  [
    body("title").optional().trim().isLength({ min: 1, max: 100 }).withMessage("Название доски до 100 символов"),
    body("description").optional().trim().isLength({ max: 500 }).withMessage("Описание до 500 символов"),
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

      const board = await Board.findById(req.params.id)

      if (!board) {
        return res.status(404).json({ message: "Доска не найдена" })
      }

      // Проверяем права (только владелец или админ)
      const isOwner = board.owner.toString() === req.user._id.toString()
      const isAdmin = board.members.some(
        (member) => member.user.toString() === req.user._id.toString() && member.role === "admin",
      )

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: "Нет прав для редактирования доски" })
      }

      const { title, description, backgroundColor } = req.body
      const updates = {}

      if (title) updates.title = title
      if (description !== undefined) updates.description = description
      if (backgroundColor) updates.backgroundColor = backgroundColor

      const updatedBoard = await Board.findByIdAndUpdate(req.params.id, updates, { new: true })
        .populate("owner", "name email")
        .populate("members.user", "name email")

      res.json({
        message: "Доска успешно обновлена",
        board: updatedBoard,
      })
    } catch (error) {
      console.error("Update board error:", error)
      res.status(500).json({
        message: "Ошибка обновления доски",
        error: error.message,
      })
    }
  },
)

// Удалить доску
router.delete("/:id", auth, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id)

    if (!board) {
      return res.status(404).json({ message: "Доска не найдена" })
    }

    // Только владелец может удалить доску
    if (board.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Только владелец может удалить доску" })
    }

    // Удаляем все связанные данные
    await Task.deleteMany({ boardId: board._id })
    await Column.deleteMany({ boardId: board._id })
    await Board.findByIdAndDelete(req.params.id)

    console.log(`🗑️ Board ${board.title} deleted by user ${req.user._id}`)
    res.json({ message: "Доска успешно удалена" })
  } catch (error) {
    console.error("Delete board error:", error)
    res.status(500).json({
      message: "Ошибка удаления доски",
      error: error.message,
    })
  }
})

// Добавить участника к доске
router.post("/:id/members", auth, async (req, res) => {
  try {
    const { email, role = "member" } = req.body
    const board = await Board.findById(req.params.id)

    if (!board) {
      return res.status(404).json({ message: "Доска не найдена" })
    }

    // Проверяем права
    const isOwner = board.owner.toString() === req.user._id.toString()
    const isAdmin = board.members.some(
      (member) => member.user.toString() === req.user._id.toString() && member.role === "admin",
    )

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Нет прав для добавления участников" })
    }

    // Находим пользователя по email
    const userToAdd = await User.findOne({ email })

    if (!userToAdd) {
      return res.status(404).json({ message: "Пользователь не найден" })
    }

    // Проверяем, не является ли уже участником
    const isAlreadyMember = board.members.some((member) => member.user.toString() === userToAdd._id.toString())

    if (isAlreadyMember) {
      return res.status(400).json({ message: "Пользователь уже является участником доски" })
    }

    // Добавляем участника
    board.members.push({
      user: userToAdd._id,
      role,
    })

    await board.save()

    const updatedBoard = await Board.findById(board._id)
      .populate("owner", "name email")
      .populate("members.user", "name email")

    res.json({
      message: "Участник успешно добавлен",
      board: updatedBoard,
    })
  } catch (error) {
    console.error("Add member error:", error)
    res.status(500).json({
      message: "Ошибка добавления участника",
      error: error.message,
    })
  }
})

// Удалить участника из доски
router.delete("/:id/members/:userId", auth, async (req, res) => {
  try {
    const { id: boardId, userId } = req.params
    const board = await Board.findById(boardId)

    if (!board) {
      return res.status(404).json({ message: "Доска не найдена" })
    }

    // Проверяем права (только владелец или админ)
    const isOwner = board.owner.toString() === req.user._id.toString()
    const isAdmin = board.members.some(
      (member) => member.user.toString() === req.user._id.toString() && member.role === "admin",
    )

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Нет прав для удаления участников" })
    }

    // Нельзя удалить владельца
    if (board.owner.toString() === userId) {
      return res.status(400).json({ message: "Нельзя удалить владельца доски" })
    }

    // Удаляем участника
    board.members = board.members.filter((member) => member.user.toString() !== userId)
    await board.save()

    const updatedBoard = await Board.findById(board._id)
      .populate("owner", "name email")
      .populate("members.user", "name email")

    res.json({
      message: "Участник успешно удален",
      board: updatedBoard,
    })
  } catch (error) {
    console.error("Remove member error:", error)
    res.status(500).json({
      message: "Ошибка удаления участника",
      error: error.message,
    })
  }
})

// Изменить роль участника
router.put("/:id/members/:userId", auth, async (req, res) => {
  try {
    const { id: boardId, userId } = req.params
    const { role } = req.body
    const board = await Board.findById(boardId)

    if (!board) {
      return res.status(404).json({ message: "Доска не найдена" })
    }

    // Только владелец может изменять роли
    if (board.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Только владелец может изменять роли участников" })
    }

    // Нельзя изменить роль владельца
    if (board.owner.toString() === userId) {
      return res.status(400).json({ message: "Нельзя изменить роль владельца доски" })
    }

    // Находим и обновляем участника
    const memberIndex = board.members.findIndex((member) => member.user.toString() === userId)
    if (memberIndex === -1) {
      return res.status(404).json({ message: "Участник не найден" })
    }

    board.members[memberIndex].role = role
    await board.save()

    const updatedBoard = await Board.findById(board._id)
      .populate("owner", "name email")
      .populate("members.user", "name email")

    res.json({
      message: "Роль участника успешно изменена",
      board: updatedBoard,
    })
  } catch (error) {
    console.error("Update member role error:", error)
    res.status(500).json({
      message: "Ошибка изменения роли участника",
      error: error.message,
    })
  }
})

module.exports = router
