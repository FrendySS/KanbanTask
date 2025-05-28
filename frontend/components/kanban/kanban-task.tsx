"use client"

import { useState } from "react"
import { Draggable } from "@hello-pangea/dnd"
import { Calendar, MessageSquare, Paperclip, MoreHorizontal, Edit3, Trash2, User } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { EditTaskDialog } from "./edit-task-dialog"
import type { Task } from "@/app/page"

interface KanbanTaskProps {
  task: Task
  index: number
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void
  onTaskDelete: (taskId: string) => void
  userRole: string
}

export function KanbanTask({ task, index, onTaskUpdate, onTaskDelete, userRole }: KanbanTaskProps) {
  const [isEditOpen, setIsEditOpen] = useState(false)

  const canEditTask = userRole === "owner" || userRole === "admin" || userRole === "member"
  const canDragTask = userRole === "owner" || userRole === "admin" || userRole === "member"

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "short",
    }).format(dateObj)
  }

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800"
      case "high":
        return "bg-orange-100 text-orange-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "Срочно"
      case "high":
        return "Высокий"
      case "medium":
        return "Средний"
      case "low":
        return "Низкий"
      default:
        return "Средний"
    }
  }

  return (
    <>
      <Draggable draggableId={task._id} index={index} isDragDisabled={!canDragTask}>
        {(provided, snapshot) => (
          <Card
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`cursor-pointer transition-all hover:shadow-md group ${
              snapshot.isDragging ? "shadow-lg rotate-2" : ""
            } ${!canDragTask ? "cursor-default" : ""}`}
            onClick={() => setIsEditOpen(true)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-gray-900 text-sm leading-tight">{task.title}</h4>

                {canEditTask && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setIsEditOpen(true)} className="gap-2">
                        <Edit3 className="w-4 h-4" />
                        Редактировать
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onTaskDelete(task._id)} className="gap-2 text-red-600">
                        <Trash2 className="w-4 h-4" />
                        Удалить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {task.description && <p className="text-xs text-gray-600 mb-3 line-clamp-2">{task.description}</p>}

              {/* Приоритет */}
              {task.priority && task.priority !== "medium" && (
                <Badge className={`text-xs mb-2 ${getPriorityColor(task.priority)}`}>
                  {getPriorityText(task.priority)}
                </Badge>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {task.dueDate && (
                    <Badge variant={isOverdue ? "destructive" : "secondary"} className="text-xs gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(task.dueDate)}
                    </Badge>
                  )}

                  {task.attachments && task.attachments.length > 0 && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Paperclip className="w-3 h-3" />
                      {task.attachments.length}
                    </Badge>
                  )}

                  {task.comments && task.comments.length > 0 && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {task.comments.length}
                    </Badge>
                  )}
                </div>

                {task.assignedTo && (
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs">
                      <User className="w-3 h-3" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </Draggable>

      <EditTaskDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        task={task}
        onUpdateTask={(updates) => onTaskUpdate(task._id, updates)}
        onDeleteTask={() => onTaskDelete(task._id)}
        userRole={userRole}
      />
    </>
  )
}
