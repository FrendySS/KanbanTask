import api from "./api"
import type { Board, Column, Task, Comment, Attachment, BoardMember } from "@/app/page"

// Интерфейсы для API ответов
interface BoardListItem {
  _id: string
  title: string
  description?: string
  owner: any
  members: BoardMember[]
  isPrivate: boolean
  backgroundColor?: string
  createdAt: string
  updatedAt: string
}

interface BoardResponse extends Board {
  columns: (Column & { tasks: Task[] })[]
}

// Auth Service
export const authService = {
  login: async (email: string, password: string) => {
    const response = await api.post("/auth/login", { email, password })
    return response.data
  },

  register: async (name: string, email: string, password: string) => {
    const response = await api.post("/auth/register", { name, email, password })
    return response.data
  },

  me: async () => {
    const response = await api.get("/auth/me")
    return response.data
  },
}

// Board Service
export const boardService = {
  async getBoards(): Promise<BoardListItem[]> {
    const response = await api.get("/boards")
    return response.data
  },

  async getBoard(id: string): Promise<BoardResponse> {
    const response = await api.get(`/boards/${id}`)
    return response.data
  },

  async createBoard(title: string, description?: string): Promise<BoardResponse> {
    const response = await api.post("/boards", { title, description })
    return response.data.board
  },

  async updateBoard(id: string, updates: Partial<Board>): Promise<Board> {
    const response = await api.put(`/boards/${id}`, updates)
    return response.data.board
  },

  async deleteBoard(id: string): Promise<void> {
    await api.delete(`/boards/${id}`)
  },

  async addMember(boardId: string, email: string, role = "member"): Promise<Board> {
    const response = await api.post(`/boards/${boardId}/members`, { email, role })
    return response.data.board
  },

  async removeMember(boardId: string, userId: string): Promise<Board> {
    const response = await api.delete(`/boards/${boardId}/members/${userId}`)
    return response.data.board
  },

  async updateMemberRole(boardId: string, userId: string, role: string): Promise<Board> {
    const response = await api.put(`/boards/${boardId}/members/${userId}`, { role })
    return response.data.board
  },
}

// Column Service
export const columnService = {
  async createColumn(title: string, boardId: string, color?: string): Promise<Column> {
    const response = await api.post("/columns", { title, boardId, color })
    return response.data.column
  },

  async updateColumn(id: string, updates: Partial<Column>): Promise<Column> {
    const response = await api.put(`/columns/${id}`, updates)
    return response.data.column
  },

  async deleteColumn(id: string): Promise<void> {
    await api.delete(`/columns/${id}`)
  },

  async reorderColumns(columns: { id: string; order: number }[]): Promise<void> {
    await api.put("/columns/reorder", { columns })
  },
}

// Task Service
export const taskService = {
  async getBoardTasks(boardId: string): Promise<Task[]> {
    const response = await api.get(`/tasks/board/${boardId}`)
    return response.data
  },

  async getTask(id: string): Promise<Task & { comments: Comment[] }> {
    const response = await api.get(`/tasks/${id}`)
    return response.data
  },

  async createTask(data: {
    title: string
    description?: string
    columnId: string
    assignedTo?: string
    priority?: string
    dueDate?: string
  }): Promise<Task> {
    const response = await api.post("/tasks", data)
    return response.data.task
  },

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const response = await api.put(`/tasks/${id}`, updates)
    return response.data.task
  },

  async moveTask(id: string, columnId: string, order: number): Promise<Task> {
    const response = await api.put(`/tasks/${id}/move`, { columnId, order })
    return response.data.task
  },

  async deleteTask(id: string): Promise<void> {
    await api.delete(`/tasks/${id}`)
  },

  async uploadAttachment(taskId: string, file: File): Promise<Attachment> {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("taskId", taskId)

    const response = await api.post("/attachments", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })

    return response.data.attachment
  },

  async deleteAttachment(taskId: string, attachmentId: string): Promise<void> {
    try {
      console.log("📎 Deleting attachment:", attachmentId, "from task:", taskId)
      const response = await api.delete(`/attachments/${taskId}/${attachmentId}`)
      console.log("✅ Attachment deleted successfully:", response.data)
    } catch (error: any) {
      console.error("❌ Error deleting attachment:", error.response?.data || error.message)
      throw new Error(error.response?.data?.message || "Ошибка удаления вложения")
    }
  },
}

// Comment Service
export const commentService = {
  async getComments(taskId: string): Promise<Comment[]> {
    const response = await api.get(`/comments/task/${taskId}`)
    return response.data
  },

  async createComment(taskId: string, text: string): Promise<Comment> {
    const response = await api.post("/comments", { taskId, text })
    return response.data.comment
  },

  async updateComment(id: string, text: string): Promise<Comment> {
    const response = await api.put(`/comments/${id}`, { text })
    return response.data.comment
  },

  async deleteComment(id: string): Promise<void> {
    await api.delete(`/comments/${id}`)
  },
}

// User Service
export const userService = {
  async searchUsers(email: string): Promise<{ _id: string; name: string; email: string }[]> {
    const response = await api.get(`/users/search?email=${encodeURIComponent(email)}`)
    return response.data
  },

  async getUser(id: string): Promise<{ _id: string; name: string; email: string; avatar?: string }> {
    const response = await api.get(`/users/${id}`)
    return response.data
  },

  async updateProfile(data: { name?: string; email?: string }): Promise<any> {
    const response = await api.put("/users/profile", data)
    return response.data
  },

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
    await api.put("/users/password", data)
  },
}

// Attachment Service
export const attachmentService = {
  getDownloadUrl: (attachment: Attachment): string => {
    // Если это UploadThing URL (начинается с http), возвращаем как есть
    if (attachment.url.startsWith("http")) {
      return attachment.url
    }

    // Если это относительный путь, формируем полный URL
    if (attachment.url.startsWith("/api/attachments/download/")) {
      return `${process.env.NEXT_PUBLIC_BACKEND_URL}${attachment.url}`
    }

    // Fallback для старых файлов
    return `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/attachments/download/${attachment.filename}`
  },

  // Функция для получения URL просмотра (для изображений)
  getViewUrl: (attachment: Attachment): string => {
    // Если это UploadThing URL, возвращаем как есть
    if (attachment.url.startsWith("http")) {
      return attachment.url
    }

    // Для локальных файлов используем view endpoint
    return `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/attachments/view/${attachment.filename}`
  },
}
