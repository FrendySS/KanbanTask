"use client"

import { useState, useEffect, useCallback } from "react"
import { useSocket } from "./use-socket"
import { boardService } from "@/lib/api-services"
import type { Board, Task, Column, Comment } from "@/app/page"

export function useRealtimeBoard(boardId: string | null) {
  const [board, setBoard] = useState<Board | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const socket = useSocket()

  // Загрузка доски
  const loadBoard = useCallback(async () => {
    if (!boardId) {
      setBoard(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError("")
      console.log("📋 Loading board:", boardId)
      const boardData = await boardService.getBoard(boardId)

      // Преобразуем данные к нужному типу
      const formattedBoard: Board = {
        ...boardData,
        columns: boardData.columns || [],
      }

      setBoard(formattedBoard)
      console.log("✅ Board loaded:", formattedBoard.title)
    } catch (error: any) {
      console.error("❌ Error loading board:", error)
      setError("Ошибка загрузки доски")
    } finally {
      setIsLoading(false)
    }
  }, [boardId])

  // Оптимистичные обновления
  const optimisticUpdateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setBoard((prevBoard) => {
      if (!prevBoard?.columns) return prevBoard

      const updatedColumns = prevBoard.columns.map((column) => ({
        ...column,
        tasks: column.tasks.map((task) => (task._id === taskId ? { ...task, ...updates } : task)),
      }))

      return { ...prevBoard, columns: updatedColumns }
    })
  }, [])

  const optimisticAddTask = useCallback((columnId: string, task: Task) => {
    setBoard((prevBoard) => {
      if (!prevBoard?.columns) return prevBoard

      const updatedColumns = prevBoard.columns.map((column) =>
        column._id === columnId ? { ...column, tasks: [...column.tasks, task] } : column,
      )

      return { ...prevBoard, columns: updatedColumns }
    })
  }, [])

  const optimisticRemoveTask = useCallback((taskId: string, columnId: string) => {
    setBoard((prevBoard) => {
      if (!prevBoard?.columns) return prevBoard

      const updatedColumns = prevBoard.columns.map((column) =>
        column._id === columnId ? { ...column, tasks: column.tasks.filter((task) => task._id !== taskId) } : column,
      )

      return { ...prevBoard, columns: updatedColumns }
    })
  }, [])

  const optimisticAddColumn = useCallback((column: Column) => {
    setBoard((prevBoard) => {
      if (!prevBoard) return prevBoard

      return {
        ...prevBoard,
        columns: [...(prevBoard.columns || []), { ...column, tasks: [] }],
      }
    })
  }, [])

  const optimisticRemoveColumn = useCallback((columnId: string) => {
    setBoard((prevBoard) => {
      if (!prevBoard?.columns) return prevBoard

      return {
        ...prevBoard,
        columns: prevBoard.columns.filter((column) => column._id !== columnId),
      }
    })
  }, [])

  const optimisticUpdateColumn = useCallback((columnId: string, updates: Partial<Column>) => {
    setBoard((prevBoard) => {
      if (!prevBoard?.columns) return prevBoard

      const updatedColumns = prevBoard.columns.map((column) =>
        column._id === columnId ? { ...column, ...updates } : column,
      )

      return { ...prevBoard, columns: updatedColumns }
    })
  }, [])

  // Подписка на real-time обновления
  useEffect(() => {
    if (!boardId || !socket.getSocket()) return

    console.log("🔌 Joining board:", boardId)
    socket.joinBoard(boardId)

    // Обработчики WebSocket событий
    const handleBoardUpdate = (data: any) => {
      console.log("📋 Real-time board update:", data)
      loadBoard() // Перезагружаем доску
    }

    const handleTaskCreated = (data: { task: Task; columnId: string }) => {
      console.log("📝 Real-time task created:", data)
      optimisticAddTask(data.columnId, data.task)
    }

    const handleTaskUpdated = (data: { task: Task }) => {
      console.log("📝 Real-time task updated:", data)
      optimisticUpdateTask(data.task._id, data.task)
    }

    const handleTaskDeleted = (data: { taskId: string; columnId: string }) => {
      console.log("📝 Real-time task deleted:", data)
      optimisticRemoveTask(data.taskId, data.columnId)
    }

    const handleTaskMoved = (data: { taskId: string; fromColumnId: string; toColumnId: string; task: Task }) => {
      console.log("📝 Real-time task moved:", data)
      // Удаляем из старой колонки
      optimisticRemoveTask(data.taskId, data.fromColumnId)
      // Добавляем в новую колонку
      optimisticAddTask(data.toColumnId, data.task)
    }

    const handleColumnCreated = (data: { column: Column }) => {
      console.log("📊 Real-time column created:", data)
      optimisticAddColumn(data.column)
    }

    const handleColumnUpdated = (data: { column: Column }) => {
      console.log("📊 Real-time column updated:", data)
      optimisticUpdateColumn(data.column._id, data.column)
    }

    const handleColumnDeleted = (data: { columnId: string }) => {
      console.log("📊 Real-time column deleted:", data)
      optimisticRemoveColumn(data.columnId)
    }

    const handleCommentAdded = (data: { taskId: string; comment: Comment }) => {
      console.log("💬 Real-time comment added:", data)
      setBoard((prevBoard) => {
        if (!prevBoard?.columns) return prevBoard

        const updatedColumns = prevBoard.columns.map((column) => ({
          ...column,
          tasks: column.tasks.map((task) => {
            if (task._id === data.taskId) {
              return {
                ...task,
                comments: [...(task.comments || []), data.comment],
              }
            }
            return task
          }),
        }))

        return { ...prevBoard, columns: updatedColumns }
      })
    }

    const handleCommentDeleted = (data: { taskId: string; commentId: string }) => {
      console.log("💬 Real-time comment deleted:", data)
      setBoard((prevBoard) => {
        if (!prevBoard?.columns) return prevBoard

        const updatedColumns = prevBoard.columns.map((column) => ({
          ...column,
          tasks: column.tasks.map((task) => {
            if (task._id === data.taskId) {
              return {
                ...task,
                comments: (task.comments || []).filter((c) => c._id !== data.commentId),
              }
            }
            return task
          }),
        }))

        return { ...prevBoard, columns: updatedColumns }
      })
    }

    // Подписываемся на события
    const socketInstance = socket.getSocket()
    if (socketInstance) {
      socketInstance.on("board-updated", handleBoardUpdate)
      socketInstance.on("task-created", handleTaskCreated)
      socketInstance.on("task-updated", handleTaskUpdated)
      socketInstance.on("task-deleted", handleTaskDeleted)
      socketInstance.on("task-moved", handleTaskMoved)
      socketInstance.on("column-created", handleColumnCreated)
      socketInstance.on("column-updated", handleColumnUpdated)
      socketInstance.on("column-deleted", handleColumnDeleted)
      socketInstance.on("comment-added", handleCommentAdded)
      socketInstance.on("comment-deleted", handleCommentDeleted)
    }

    return () => {
      console.log("🔌 Leaving board:", boardId)
      socket.leaveBoard(boardId)
      if (socketInstance) {
        socketInstance.off("board-updated", handleBoardUpdate)
        socketInstance.off("task-created", handleTaskCreated)
        socketInstance.off("task-updated", handleTaskUpdated)
        socketInstance.off("task-deleted", handleTaskDeleted)
        socketInstance.off("task-moved", handleTaskMoved)
        socketInstance.off("column-created", handleColumnCreated)
        socketInstance.off("column-updated", handleColumnUpdated)
        socketInstance.off("column-deleted", handleColumnDeleted)
        socketInstance.off("comment-added", handleCommentAdded)
        socketInstance.off("comment-deleted", handleCommentDeleted)
      }
    }
  }, [
    boardId,
    socket,
    loadBoard,
    optimisticAddTask,
    optimisticUpdateTask,
    optimisticRemoveTask,
    optimisticAddColumn,
    optimisticRemoveColumn,
    optimisticUpdateColumn,
  ])

  // Загрузка при монтировании
  useEffect(() => {
    loadBoard()
  }, [loadBoard])

  return {
    board,
    isLoading,
    error,
    setError,
    loadBoard,
    optimisticUpdateTask,
    optimisticAddTask,
    optimisticRemoveTask,
    optimisticAddColumn,
    optimisticRemoveColumn,
    optimisticUpdateColumn,
  }
}
