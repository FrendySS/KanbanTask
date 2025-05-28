"use client"

import { useState } from "react"
import { Droppable } from "@hello-pangea/dnd"
import { MoreHorizontal, Plus, Trash2, Edit3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { KanbanTask } from "./kanban-task"
import { CreateTaskDialog } from "./create-task-dialog"
import { EditColumnDialog } from "./edit-column-dialog"
import type { Column, Task } from "@/app/page"
import { taskService } from "@/lib/api-services"
import { useSocket } from "@/hooks/use-socket"

interface KanbanColumnProps {
  column: Column
  onColumnUpdate: (columnId: string, updates: Partial<Column>) => void
  onColumnDelete: (columnId: string) => void
  userRole: string
  optimisticUpdateTask: (taskId: string, updates: Partial<Task>) => void
  optimisticAddTask: (columnId: string, task: Task) => void
  optimisticRemoveTask: (taskId: string, columnId: string) => void
}

export function KanbanColumn({
  column,
  onColumnUpdate,
  onColumnDelete,
  userRole,
  optimisticUpdateTask,
  optimisticAddTask,
  optimisticRemoveTask,
}: KanbanColumnProps) {
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)
  const [isEditColumnOpen, setIsEditColumnOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const socket = useSocket()

  const canEditColumn = userRole === "owner" || userRole === "admin" || userRole === "member"
  const canCreateTask = userRole === "owner" || userRole === "admin" || userRole === "member"

  const createTask = async (title: string, description: string) => {
    if (!canCreateTask) {
      alert("У вас нет прав для создания задач")
      return
    }

    try {
      setIsLoading(true)
      console.log("📝 Creating task:", title)

      const newTask = await taskService.createTask({
        title,
        description,
        columnId: column._id,
      })

      console.log("✅ Task created:", newTask.title)

      // Оптимистичное обновление UI
      optimisticAddTask(column._id, newTask)

      // Уведомляем через WebSocket
      socket.getSocket()?.emit("task-created", {
        task: newTask,
        columnId: column._id,
        boardId: column.boardId,
      })

      setIsCreateTaskOpen(false)
    } catch (error: any) {
      console.error("❌ Error creating task:", error)
      alert("Ошибка создания задачи")
    } finally {
      setIsLoading(false)
    }
  }

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      console.log("📝 Updating task:", taskId)

      // Оптимистичное обновление UI
      optimisticUpdateTask(taskId, updates)

      const updatedTask = await taskService.updateTask(taskId, updates)
      console.log("✅ Task updated:", updatedTask.title)

      // Уведомляем через WebSocket
      socket.getSocket()?.emit("task-updated", {
        task: updatedTask,
        boardId: column.boardId,
      })
    } catch (error: any) {
      console.error("❌ Error updating task:", error)
      alert("Ошибка обновления задачи")
      // В случае ошибки перезагружаем страницу
      window.location.reload()
    }
  }

  const deleteTask = async (taskId: string) => {
    try {
      console.log("📝 Deleting task:", taskId)

      // Оптимистичное обновление UI
      optimisticRemoveTask(taskId, column._id)

      await taskService.deleteTask(taskId)
      console.log("✅ Task deleted")

      // Уведомляем через WebSocket
      socket.getSocket()?.emit("task-deleted", {
        taskId,
        columnId: column._id,
        boardId: column.boardId,
      })
    } catch (error: any) {
      console.error("❌ Error deleting task:", error)
      alert("Ошибка удаления задачи")
      // В случае ошибки перезагружаем страницу
      window.location.reload()
    }
  }

  return (
    <Card className="w-80 flex-shrink-0 bg-gray-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{column.title}</h3>
            <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">{column.tasks.length}</span>
          </div>

          {canEditColumn && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditColumnOpen(true)} className="gap-2">
                  <Edit3 className="w-4 h-4" />
                  Редактировать
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onColumnDelete(column._id)} className="gap-2 text-red-600">
                  <Trash2 className="w-4 h-4" />
                  Удалить
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <Droppable droppableId={column._id} isDropDisabled={userRole === "viewer"}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`space-y-3 min-h-[200px] p-2 rounded-lg transition-colors ${
                snapshot.isDraggingOver && userRole !== "viewer"
                  ? "bg-blue-50 border-2 border-blue-200 border-dashed"
                  : ""
              }`}
            >
              {column.tasks.map((task, index) => (
                <KanbanTask
                  key={task._id}
                  task={task}
                  index={index}
                  onTaskUpdate={updateTask}
                  onTaskDelete={deleteTask}
                  userRole={userRole}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        {canCreateTask && (
          <Button
            variant="ghost"
            onClick={() => setIsCreateTaskOpen(true)}
            disabled={isLoading}
            className="w-full mt-3 gap-2 text-gray-500 hover:text-gray-700"
          >
            <Plus className="w-4 h-4" />
            {isLoading ? "Создание..." : "Добавить задачу"}
          </Button>
        )}
      </CardContent>

      <CreateTaskDialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen} onCreateTask={createTask} />

      <EditColumnDialog
        open={isEditColumnOpen}
        onOpenChange={setIsEditColumnOpen}
        column={column}
        onUpdateColumn={(updates) => onColumnUpdate(column._id, updates)}
      />
    </Card>
  )
}
