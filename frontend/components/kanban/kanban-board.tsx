"use client"

import { useState, useCallback } from "react"
import { DragDropContext, type DropResult } from "@hello-pangea/dnd"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { KanbanColumn } from "./kanban-column"
import { CreateColumnDialog } from "./create-column-dialog"
import type { Board, Column, Task } from "@/app/page"
import { taskService, columnService } from "@/lib/api-services"
import { useSocket } from "@/hooks/use-socket"

interface KanbanBoardProps {
  board: Board
  userRole: string
  optimisticUpdateTask: (taskId: string, updates: Partial<Task>) => void
  optimisticAddTask: (columnId: string, task: Task) => void
  optimisticRemoveTask: (taskId: string, columnId: string) => void
  optimisticAddColumn: (column: Column) => void
  optimisticRemoveColumn: (columnId: string) => void
  optimisticUpdateColumn: (columnId: string, updates: Partial<Column>) => void
}

export function KanbanBoard({
  board,
  userRole,
  optimisticUpdateTask,
  optimisticAddTask,
  optimisticRemoveTask,
  optimisticAddColumn,
  optimisticRemoveColumn,
  optimisticUpdateColumn,
}: KanbanBoardProps) {
  const [isCreateColumnOpen, setIsCreateColumnOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const socket = useSocket()

  const canEditBoard = userRole === "owner" || userRole === "admin" || userRole === "member"
  const canDragTasks = userRole !== "viewer"

  console.log("🎯 KanbanBoard props:", {
    boardTitle: board.title,
    columnsCount: board.columns?.length || 0,
    userRole,
    canEditBoard,
  })

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      if (!result.destination || !canDragTasks) return

      const { source, destination, draggableId } = result

      // Если задача осталась в том же месте
      if (source.droppableId === destination.droppableId && source.index === destination.index) {
        return
      }

      try {
        console.log("🔄 Moving task:", draggableId, "to column:", destination.droppableId)

        // Находим задачу
        const sourceColumn = board.columns?.find((col) => col._id === source.droppableId)
        const task = sourceColumn?.tasks.find((t) => t._id === draggableId)

        if (!task) {
          console.error("❌ Task not found:", draggableId)
          return
        }

        // Оптимистичное обновление UI
        if (source.droppableId !== destination.droppableId) {
          // Перемещение между колонками
          optimisticRemoveTask(draggableId, source.droppableId)
          optimisticAddTask(destination.droppableId, { ...task, columnId: destination.droppableId })
        } else {
          // Изменение порядка в той же колонке
          optimisticUpdateTask(draggableId, { order: destination.index })
        }

        // Отправляем запрос на сервер
        const updatedTask = await taskService.moveTask(draggableId, destination.droppableId, destination.index)
        console.log("✅ Task moved successfully:", updatedTask.title)

        // Уведомляем через WebSocket
        socket.getSocket()?.emit("task-moved", {
          taskId: draggableId,
          fromColumnId: source.droppableId,
          toColumnId: destination.droppableId,
          task: updatedTask,
          boardId: board._id,
        })
      } catch (error: any) {
        console.error("❌ Error moving task:", error)
        alert("Ошибка перемещения задачи")
        // В случае ошибки перезагружаем страницу
        window.location.reload()
      }
    },
    [board, canDragTasks, optimisticUpdateTask, optimisticAddTask, optimisticRemoveTask, socket],
  )

  const createColumn = async (title: string, color?: string) => {
    if (!canEditBoard) {
      alert("У вас нет прав для создания колонок")
      return
    }

    try {
      setIsLoading(true)
      console.log("📊 Creating column:", title)

      const newColumn = await columnService.createColumn(title, board._id, color)
      console.log("✅ Column created:", newColumn.title)

      // Оптимистичное обновление UI
      optimisticAddColumn(newColumn)

      // Уведомляем через WebSocket
      socket.getSocket()?.emit("column-created", {
        column: newColumn,
        boardId: board._id,
      })

      setIsCreateColumnOpen(false)
    } catch (error: any) {
      console.error("❌ Error creating column:", error)
      alert("Ошибка создания колонки")
    } finally {
      setIsLoading(false)
    }
  }

  const updateColumn = async (columnId: string, updates: Partial<Column>) => {
    if (!canEditBoard) {
      alert("У вас нет прав для редактирования колонок")
      return
    }

    try {
      console.log("📊 Updating column:", columnId)

      // Оптимистичное обновление UI
      optimisticUpdateColumn(columnId, updates)

      const updatedColumn = await columnService.updateColumn(columnId, updates)
      console.log("✅ Column updated:", updatedColumn.title)

      // Уведомляем через WebSocket
      socket.getSocket()?.emit("column-updated", {
        column: updatedColumn,
        boardId: board._id,
      })
    } catch (error: any) {
      console.error("❌ Error updating column:", error)
      alert("Ошибка обновления колонки")
      // В случае ошибки перезагружаем страницу
      window.location.reload()
    }
  }

  const deleteColumn = async (columnId: string) => {
    if (!canEditBoard) {
      alert("У вас нет прав для удаления колонок")
      return
    }

    const column = board.columns?.find((col) => col._id === columnId)
    if (!column) return

    const hasTasksMessage =
      column.tasks.length > 0
        ? `\n\nВ колонке "${column.title}" есть ${column.tasks.length} задач(и). Они будут удалены безвозвратно.`
        : ""

    if (!confirm(`Вы уверены, что хотите удалить колонку "${column.title}"?${hasTasksMessage}`)) {
      return
    }

    try {
      console.log("📊 Deleting column:", columnId)

      // Оптимистичное обновление UI
      optimisticRemoveColumn(columnId)

      await columnService.deleteColumn(columnId)
      console.log("✅ Column deleted")

      // Уведомляем через WebSocket
      socket.getSocket()?.emit("column-deleted", {
        columnId,
        boardId: board._id,
      })
    } catch (error: any) {
      console.error("❌ Error deleting column:", error)
      alert("Ошибка удаления колонки")
      // В случае ошибки перезагружаем страницу
      window.location.reload()
    }
  }

  if (!board) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Загрузка доски...</p>
        </div>
      </div>
    )
  }

  if (!board.columns || board.columns.length === 0) {
    return (
      <div className="h-full">
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Нет колонок</h3>
            <p className="text-gray-600 mb-4">Создайте первую колонку для начала работы</p>
            {canEditBoard && (
              <Button onClick={() => setIsCreateColumnOpen(true)} disabled={isLoading} className="gap-2">
                <Plus className="w-4 h-4" />
                {isLoading ? "Создание..." : "Создать колонку"}
              </Button>
            )}
          </div>
        </div>

        <CreateColumnDialog
          open={isCreateColumnOpen}
          onOpenChange={setIsCreateColumnOpen}
          onCreateColumn={createColumn}
        />
      </div>
    )
  }

  return (
    <div className="h-full">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-6">
          {board.columns.map((column) => (
            <KanbanColumn
              key={column._id}
              column={column}
              onColumnUpdate={updateColumn}
              onColumnDelete={deleteColumn}
              userRole={userRole}
              optimisticUpdateTask={optimisticUpdateTask}
              optimisticAddTask={optimisticAddTask}
              optimisticRemoveTask={optimisticRemoveTask}
            />
          ))}

          {canEditBoard && (
            <div className="w-80 flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => setIsCreateColumnOpen(true)}
                disabled={isLoading}
                className="w-full h-12 border-dashed border-2 border-gray-300 hover:border-gray-400 gap-2"
              >
                <Plus className="w-4 h-4" />
                {isLoading ? "Создание..." : "Добавить колонку"}
              </Button>
            </div>
          )}
        </div>
      </DragDropContext>

      <CreateColumnDialog
        open={isCreateColumnOpen}
        onOpenChange={setIsCreateColumnOpen}
        onCreateColumn={createColumn}
      />
    </div>
  )
}
