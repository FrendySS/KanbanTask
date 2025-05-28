"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Trash2, Paperclip, MessageSquare, User, Upload, Download, X, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Task, Comment, Attachment } from "@/app/page"
import { taskService, commentService, attachmentService } from "@/lib/api-services"
import { useAuth } from "@/lib/auth-context"
import { useSocket } from "@/hooks/use-socket"
import { useFileUpload } from "@/hooks/use-file-upload"

interface EditTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task
  onUpdateTask: (updates: Partial<Task>) => void
  onDeleteTask: () => void
  userRole: string
}

export function EditTaskDialog({
  open,
  onOpenChange,
  task,
  onUpdateTask,
  onDeleteTask,
  userRole,
}: EditTaskDialogProps) {
  const { user } = useAuth()
  const socket = useSocket()
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">(task.priority || "medium")
  const [dueDate, setDueDate] = useState(task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "")

  // Состояние для комментариев
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [isAddingComment, setIsAddingComment] = useState(false)

  // Состояние для вложений
  const [attachments, setAttachments] = useState<Attachment[]>(task.attachments || [])
  const [isUploading, setIsUploading] = useState(false)

  const { uploadFile, isUploading: isUploadingFile, error: uploadError } = useFileUpload(task._id)

  const canEditTask = userRole === "owner" || userRole === "admin" || userRole === "member"
  const canDeleteTask = userRole === "owner" || userRole === "admin" || userRole === "member"

  useEffect(() => {
    setTitle(task.title)
    setDescription(task.description)
    setPriority(task.priority || "medium")
    setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "")
    setAttachments(task.attachments || [])

    if (open) {
      loadComments()
    }
  }, [task, open])

  // Подписка на real-time обновления комментариев
  useEffect(() => {
    if (!open || !socket.getSocket()) return

    const handleCommentAdded = (data: { taskId: string; comment: Comment }) => {
      if (data.taskId === task._id) {
        setComments((prev) => [...prev, data.comment])
      }
    }

    const handleCommentDeleted = (data: { taskId: string; commentId: string }) => {
      if (data.taskId === task._id) {
        setComments((prev) => prev.filter((c) => c._id !== data.commentId))
      }
    }

    socket.getSocket()?.on("comment-added", handleCommentAdded)
    socket.getSocket()?.on("comment-deleted", handleCommentDeleted)

    return () => {
      socket.getSocket()?.off("comment-added", handleCommentAdded)
      socket.getSocket()?.off("comment-deleted", handleCommentDeleted)
    }
  }, [open, socket, task._id])

  const loadComments = async () => {
    try {
      setIsLoadingComments(true)
      console.log("💬 Loading comments for task:", task._id)
      const commentsData = await commentService.getComments(task._id)
      console.log("✅ Comments loaded:", commentsData.length)
      setComments(commentsData)
    } catch (error) {
      console.error("❌ Error loading comments:", error)
    } finally {
      setIsLoadingComments(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEditTask) {
      alert("У вас нет прав для редактирования задач")
      return
    }

    if (title.trim()) {
      try {
        const updates = {
          title: title.trim(),
          description: description.trim(),
          priority,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          attachments,
        }

        // Мгновенное обновление UI
        onUpdateTask(updates)
        onOpenChange(false)
      } catch (error) {
        console.error("Error updating task:", error)
        alert("Ошибка обновления задачи")
      }
    }
  }

  const handleDelete = async () => {
    if (!canDeleteTask) {
      alert("У вас нет прав для удаления задач")
      return
    }

    if (confirm("Вы уверены, что хотите удалить эту задачу?")) {
      try {
        onDeleteTask()
        onOpenChange(false)
      } catch (error) {
        console.error("Error deleting task:", error)
        alert("Ошибка удаления задачи")
      }
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEditTask) {
      alert("У вас нет прав для загрузки файлов")
      return
    }

    const file = e.target.files?.[0]
    if (!file) return

    // Проверяем размер файла на клиенте
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      alert("Файл слишком большой. Максимальный размер: 5MB")
      e.target.value = ""
      return
    }

    try {
      setIsUploading(true)
      console.log("📎 Uploading file:", file.name, "Type:", file.type, "Size:", file.size)

      const attachment = await uploadFile(file)
      console.log("✅ Upload successful:", attachment?.originalName)

      if (!attachment) {
        throw new Error("Не удалось загрузить файл")
      }

      const newAttachments = [...attachments, attachment]
      setAttachments(newAttachments)

      // Мгновенное обновление задачи
      onUpdateTask({ attachments: newAttachments })
    } catch (error: any) {
      console.error("❌ Error uploading file:", error)
      const errorMessage = error.response?.data?.message || error.message || "Ошибка загрузки файла"
      alert(errorMessage)
    } finally {
      setIsUploading(false)
      // Сбрасываем input
      e.target.value = ""
    }
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!canEditTask) {
      alert("У вас нет прав для удаления вложений")
      return
    }

    if (!confirm("Удалить вложение?")) return

    try {
      console.log("📎 Deleting attachment:", attachmentId)

      await taskService.deleteAttachment(task._id, attachmentId)
      console.log("✅ Attachment deleted")

      const newAttachments = attachments.filter((att) => att._id !== attachmentId)
      setAttachments(newAttachments)

      // Мгновенное обновление задачи
      onUpdateTask({ attachments: newAttachments })
    } catch (error: any) {
      console.error("❌ Error deleting attachment:", error)
      alert(error.response?.data?.message || "Ошибка удаления вложения")
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    try {
      setIsAddingComment(true)
      console.log("💬 Adding comment:", newComment.trim())

      const comment = await commentService.createComment(task._id, newComment.trim())
      console.log("✅ Comment added:", comment._id)

      // Мгновенное обновление UI
      setComments([...comments, comment])
      setNewComment("")

      // Уведомляем через WebSocket
      socket.getSocket()?.emit("comment-added", {
        taskId: task._id,
        comment,
        boardId: task.boardId,
      })
    } catch (error: any) {
      console.error("❌ Error adding comment:", error)
      alert(error.response?.data?.message || "Ошибка добавления комментария")
    } finally {
      setIsAddingComment(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Удалить комментарий?")) return

    try {
      console.log("💬 Deleting comment:", commentId)

      await commentService.deleteComment(commentId)
      console.log("✅ Comment deleted")

      // Мгновенное обновление UI
      setComments(comments.filter((c) => c._id !== commentId))

      // Уведомляем через WebSocket
      socket.getSocket()?.emit("comment-deleted", {
        taskId: task._id,
        commentId,
        boardId: task.boardId,
      })
    } catch (error: any) {
      console.error("❌ Error deleting comment:", error)
      alert(error.response?.data?.message || "Ошибка удаления комментария")
    }
  }

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date))
  }

  const getFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const handlePriorityChange = (value: string) => {
    setPriority(value as "low" | "medium" | "high" | "urgent")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {canEditTask ? "Редактировать задачу" : "Просмотр задачи"}
            {userRole === "viewer" && <span className="text-sm text-gray-500 ml-2">(только просмотр)</span>}
          </DialogTitle>
          <DialogDescription>
            {canEditTask ? "Измените детали задачи, добавьте вложения и комментарии." : "Просмотр деталей задачи."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            {/* Основная информация */}
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Название задачи</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Введите название задачи..."
                  disabled={!canEditTask}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Введите описание задачи..."
                  rows={3}
                  disabled={!canEditTask}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="priority">Приоритет</Label>
                  <Select value={priority} onValueChange={handlePriorityChange} disabled={!canEditTask}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Низкий</SelectItem>
                      <SelectItem value="medium">Средний</SelectItem>
                      <SelectItem value="high">Высокий</SelectItem>
                      <SelectItem value="urgent">Срочный</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="dueDate">Срок выполнения</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    disabled={!canEditTask}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Вложения */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">Вложения</span>
                  <Badge variant="secondary">{attachments.length}</Badge>
                </div>
                {canEditTask && (
                  <div className="relative">
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isUploading}
                      accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.zip,.rar,.json,.csv,.xlsx,.pptx,.mp3,.mp4,.avi"
                    />
                    <Button type="button" variant="outline" size="sm" disabled={isUploading}>
                      {isUploading ? (
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {isUploading ? "Загрузка..." : "Загрузить"}
                    </Button>
                  </div>
                )}
              </div>

              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div key={attachment._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">{attachment.originalName}</p>
                          <p className="text-xs text-gray-500">{getFileSize(attachment.size)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(attachmentService.getDownloadUrl(attachment), "_blank")}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        {canEditTask && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAttachment(attachment._id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Комментарии */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Комментарии</span>
                <Badge variant="secondary">{comments.length}</Badge>
              </div>

              {/* Форма добавления комментария */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs">
                    {user?.name?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 flex gap-2">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Добавить комментарий..."
                    disabled={isAddingComment}
                  />
                  <Button type="submit" size="sm" disabled={isAddingComment || !newComment.trim()}>
                    {isAddingComment ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </form>

              {/* Список комментариев */}
              {isLoadingComments ? (
                <div className="flex justify-center py-4">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                </div>
              ) : comments.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {comments.map((comment) => (
                    <div key={comment._id} className="flex gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {comment.author.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{comment.author.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
                              {comment.author._id === user?._id && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteComment(comment._id)}
                                  className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-700">{comment.text}</p>
                          {comment.isEdited && <span className="text-xs text-gray-400 italic">изменено</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Комментариев пока нет</p>
              )}
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            {canDeleteTask && (
              <Button type="button" variant="destructive" onClick={handleDelete} className="gap-2">
                <Trash2 className="w-4 h-4" />
                Удалить
              </Button>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {canEditTask ? "Отмена" : "Закрыть"}
              </Button>
              {canEditTask && (
                <Button type="submit" disabled={!title.trim()}>
                  Сохранить
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
