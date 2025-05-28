import { io, type Socket } from "socket.io-client"

class SocketService {
  private socket: Socket | null = null

  connect(token: string) {
    if (!this.socket && typeof window !== "undefined") {
      this.socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000", {
        auth: {
          token,
        },
      })
    }
    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  getSocket() {
    return this.socket
  }

  // Методы для работы с досками
  joinBoard(boardId: string) {
    this.socket?.emit("join-board", boardId)
  }

  leaveBoard(boardId: string) {
    this.socket?.emit("leave-board", boardId)
  }

  // Методы для real-time обновлений
  onBoardUpdate(callback: (data: any) => void) {
    this.socket?.on("board-updated", callback)
  }

  onTaskUpdate(callback: (data: any) => void) {
    this.socket?.on("task-updated", callback)
  }

  onColumnUpdate(callback: (data: any) => void) {
    this.socket?.on("column-updated", callback)
  }

  // Отправка обновлений
  updateTask(taskData: any) {
    this.socket?.emit("update-task", taskData)
  }

  updateColumn(columnData: any) {
    this.socket?.emit("update-column", columnData)
  }

  updateBoard(boardData: any) {
    this.socket?.emit("update-board", boardData)
  }
}

export const socketService = new SocketService()
