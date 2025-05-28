const express = require("express")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const Task = require("../models/Task")
const Board = require("../models/Board")
const auth = require("../middleware/auth")

const router = express.Router()

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || "./uploads"
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true })
    }
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: Number.parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    // Разрешенные типы файлов - расширяем список
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar|mp3|mp4|avi|json|csv|xlsx|pptx/
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "application/json",
      "text/csv",
      "application/zip",
      "application/x-rar-compressed",
      "audio/mpeg",
      "video/mp4",
      "video/x-msvideo",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ]

    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedMimeTypes.includes(file.mimetype)

    if (mimetype || extname) {
      return cb(null, true)
    } else {
      console.log("❌ Unsupported file type:", file.mimetype, path.extname(file.originalname))
      cb(new Error(`Неподдерживаемый тип файла: ${file.mimetype}`))
    }
  },
})

// Загрузить вложение к задаче
router.post("/", auth, upload.single("file"), async (req, res) => {
  try {
    const { taskId } = req.body

    if (!req.file) {
      return res.status(400).json({ message: "Файл не был загружен" })
    }

    console.log("📎 Multer upload successful:", req.file.filename)

    // Проверяем существование задачи и доступ
    const task = await Task.findById(taskId)
    if (!task) {
      return res.status(404).json({ message: "Задача не найдена" })
    }

    const board = await Board.findById(task.boardId)
    const hasAccess =
      board.owner.toString() === req.user._id.toString() ||
      board.members.some((member) => member.user.toString() === req.user._id.toString())

    if (!hasAccess) {
      return res.status(403).json({ message: "Нет доступа к этой задаче" })
    }

    // Создаем объект вложения
    const attachment = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: `/api/attachments/download/${req.file.filename}`, // Правильный путь для скачивания
      uploadedAt: new Date(),
    }

    // Добавляем вложение к задаче
    task.attachments.push(attachment)
    await task.save()

    console.log("✅ Attachment saved to task:", attachment.originalName)

    res.status(201).json({
      message: "Файл успешно загружен",
      attachment: attachment,
    })
  } catch (error) {
    console.error("Upload attachment error:", error)
    res.status(500).json({
      message: "Ошибка загрузки файла",
      error: error.message,
    })
  }
})

// Удалить вложение
router.delete("/:taskId/:attachmentId", auth, async (req, res) => {
  try {
    const { taskId, attachmentId } = req.params

    console.log("📎 Deleting attachment:", attachmentId, "from task:", taskId)

    const task = await Task.findById(taskId)
    if (!task) {
      console.log("❌ Task not found:", taskId)
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

    // Находим вложение по _id (не по индексу)
    const attachment = task.attachments.find((att) => att._id.toString() === attachmentId)
    if (!attachment) {
      console.log("❌ Attachment not found:", attachmentId)
      console.log(
        "📎 Available attachments:",
        task.attachments.map((a) => ({ id: a._id, name: a.originalName })),
      )
      return res.status(404).json({ message: "Вложение не найдено" })
    }

    console.log("✅ Found attachment:", attachment.originalName)

    // Удаляем файл с диска (только если это не внешний URL)
    if (attachment.filename && !attachment.url?.startsWith("http")) {
      const filePath = path.join(process.env.UPLOAD_PATH || "./uploads", attachment.filename)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        console.log("🗑️ File deleted from disk:", attachment.filename)
      } else {
        console.log("⚠️ File not found on disk:", filePath)
      }
    }

    // Удаляем вложение из массива задачи
    task.attachments = task.attachments.filter((att) => att._id.toString() !== attachmentId)
    await task.save()

    console.log("✅ Attachment removed from task:", attachment.originalName)

    res.json({
      message: "Вложение успешно удалено",
      deletedAttachment: {
        _id: attachment._id,
        originalName: attachment.originalName,
      },
    })
  } catch (error) {
    console.error("❌ Delete attachment error:", error)
    res.status(500).json({
      message: "Ошибка удаления вложения",
      error: error.message,
    })
  }
})

// Скачать вложение
router.get("/download/:filename", (req, res) => {
  try {
    const { filename } = req.params
    const filePath = path.join(process.env.UPLOAD_PATH || "./uploads", filename)

    console.log("📥 Download request for:", filename)
    console.log("📁 File path:", filePath)

    if (!fs.existsSync(filePath)) {
      console.log("❌ File not found:", filePath)
      return res.status(404).json({ message: "Файл не найден" })
    }

    console.log("✅ File found, sending download")

    // Устанавливаем правильные заголовки для скачивания
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    res.setHeader("Content-Type", "application/octet-stream")

    // Отправляем файл
    res.sendFile(path.resolve(filePath))
  } catch (error) {
    console.error("Download attachment error:", error)
    res.status(500).json({
      message: "Ошибка скачивания файла",
      error: error.message,
    })
  }
})

// Просмотр вложения (для изображений)
router.get("/view/:filename", (req, res) => {
  try {
    const { filename } = req.params
    const filePath = path.join(process.env.UPLOAD_PATH || "./uploads", filename)

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Файл не найден" })
    }

    // Определяем MIME тип по расширению
    const ext = path.extname(filename).toLowerCase()
    let contentType = "application/octet-stream"

    switch (ext) {
      case ".jpg":
      case ".jpeg":
        contentType = "image/jpeg"
        break
      case ".png":
        contentType = "image/png"
        break
      case ".gif":
        contentType = "image/gif"
        break
      case ".pdf":
        contentType = "application/pdf"
        break
      case ".txt":
        contentType = "text/plain"
        break
    }

    res.setHeader("Content-Type", contentType)
    res.sendFile(path.resolve(filePath))
  } catch (error) {
    console.error("View attachment error:", error)
    res.status(500).json({
      message: "Ошибка просмотра файла",
      error: error.message,
    })
  }
})

module.exports = router
