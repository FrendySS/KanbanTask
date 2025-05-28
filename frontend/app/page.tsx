"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/layout/navbar"
import { KanbanBoard } from "@/components/kanban/kanban-board"
import { CreateBoardDialog } from "@/components/kanban/create-board-dialog"
import { BoardMembersDialog } from "@/components/board/board-members-dialog"
import { DeleteBoardDialog } from "@/components/board/delete-board-dialog"
import { useAuth } from "@/lib/auth-context"
import { boardService } from "@/lib/api-services"
import { useRealtimeBoard } from "@/hooks/use-realtime-board"

// Интерфейсы
export interface BoardListItem {
  _id: string
  title: string
  description?: string
  owner: string | { _id: string; name: string; email: string }
  members: BoardMember[]
  isPrivate: boolean
  backgroundColor?: string
  createdAt: string
  updatedAt: string
}

export interface Board extends BoardListItem {
  columns: (Column & { tasks: Task[] })[]
}

export interface BoardMember {
  user: {
    _id: string
    name: string
    email: string
  }
  role: "owner" | "admin" | "member" | "viewer"
  joinedAt: string
}

export interface Column {
  _id: string
  title: string
  boardId: string
  order: number
  color?: string
  limit?: number
  tasks: Task[]
}

export interface Task {
  _id: string
  title: string
  description: string
  columnId: string
  boardId: string
  order: number
  priority: "low" | "medium" | "high" | "urgent"
  dueDate?: Date
  assignedTo?: string
  attachments: Attachment[]
  comments?: Comment[]
  createdAt: string
  updatedAt: string
}

export interface Comment {
  _id: string
  taskId: string
  author: {
    _id: string
    name: string
    email: string
  }
  text: string
  isEdited?: boolean
  editedAt?: string
  createdAt: string
  updatedAt: string
}

export interface Attachment {
  _id: string
  originalName: string
  filename: string
  size: number
  mimetype: string
  url: string
  uploadedAt: string
}

// Интерфейс для досок с подсчетом задач
export interface BoardWithTaskCount extends BoardListItem {
  taskCount?: number
}

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth()
  const [boardsList, setBoardsList] = useState<BoardListItem[]>([])
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null)
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false)
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false)
  const [isDeleteBoardOpen, setIsDeleteBoardOpen] = useState(false)
  const [isLoadingBoards, setIsLoadingBoards] = useState(true)

  // Используем хук для real-time обновлений активной доски
  const {
    board: activeBoard,
    isLoading: boardLoading,
    error,
    loadBoard,
    optimisticUpdateTask,
    optimisticAddTask,
    optimisticRemoveTask,
    optimisticAddColumn,
    optimisticRemoveColumn,
    optimisticUpdateColumn,
  } = useRealtimeBoard(activeBoardId)

  // Загрузка списка досок
  const loadBoards = async () => {
    if (!user) return

    try {
      setIsLoadingBoards(true)
      console.log("📋 Loading boards list...")
      const boards = await boardService.getBoards()
      console.log("✅ Boards loaded:", boards.length)
      setBoardsList(boards)

      // Если нет активной доски, выбираем первую
      if (!activeBoardId && boards.length > 0) {
        setActiveBoardId(boards[0]._id)
      }
    } catch (error) {
      console.error("❌ Error loading boards:", error)
    } finally {
      setIsLoadingBoards(false)
    }
  }

  useEffect(() => {
    if (user && !authLoading) {
      loadBoards()
    }
  }, [user, authLoading])

  // Получаем роль пользователя на активной доске
  const getUserRole = (): string => {
    if (!activeBoard || !user) return "viewer"

    const ownerId = typeof activeBoard.owner === "string" ? activeBoard.owner : activeBoard.owner?._id
    if (ownerId === user._id) return "owner"

    const member = activeBoard.members.find((m) => m.user._id === user._id)
    return member?.role || "viewer"
  }

  const handleBoardChange = (board: BoardWithTaskCount) => {
    console.log("📋 Switching to board:", board.title)
    setActiveBoardId(board._id)
  }

  const handleCreateBoard = async (title: string, description?: string) => {
    try {
      console.log("📋 Creating board:", title)
      const newBoard = await boardService.createBoard(title, description)
      console.log("✅ Board created:", newBoard.title)

      // Обновляем список досок
      await loadBoards()

      // Переключаемся на новую доску
      setActiveBoardId(newBoard._id)
      setIsCreateBoardOpen(false)
    } catch (error: any) {
      console.error("❌ Error creating board:", error)
      alert(error.response?.data?.message || "Ошибка создания доски")
    }
  }

  const handleDeleteBoard = async () => {
    if (!activeBoard) return

    try {
      console.log("🗑️ Deleting board:", activeBoard.title)
      await boardService.deleteBoard(activeBoard._id)
      console.log("✅ Board deleted successfully")

      // Обновляем список досок
      const updatedBoards = boardsList.filter((b) => b._id !== activeBoard._id)
      setBoardsList(updatedBoards)

      // Переключаемся на первую доступную доску или показываем пустое состояние
      if (updatedBoards.length > 0) {
        setActiveBoardId(updatedBoards[0]._id)
      } else {
        setActiveBoardId(null)
      }

      setIsDeleteBoardOpen(false)
    } catch (error: any) {
      console.error("❌ Error deleting board:", error)
      throw new Error(error.response?.data?.message || "Ошибка удаления доски")
    }
  }

  // Обновление доски в списке (для счетчика задач)
  const updateBoardInList = (boardId: string, updates: Partial<BoardListItem>) => {
    setBoardsList((prev) => prev.map((board) => (board._id === boardId ? { ...board, ...updates } : board)))
  }

  // Подсчет задач для отображения в навбаре
  const getBoardWithTaskCount = (boardItem: BoardListItem): BoardWithTaskCount => {
    if (boardItem._id === activeBoardId && activeBoard?.columns) {
      const taskCount = activeBoard.columns.reduce((acc, col) => acc + (col.tasks?.length || 0), 0)
      return {
        ...boardItem,
        taskCount,
      }
    }
    return {
      ...boardItem,
      taskCount: undefined, // Показываем "Загрузка..." если доска не загружена
    }
  }

  // Показываем загрузку пока проверяется авторизация
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Проверка авторизации...</p>
        </div>
      </div>
    )
  }

  // Если пользователь не авторизован, AuthContext автоматически перенаправит на логин
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        boards={boardsList.map(getBoardWithTaskCount)}
        activeBoard={activeBoard}
        onBoardChange={handleBoardChange}
        onCreateBoard={() => setIsCreateBoardOpen(true)}
        onDeleteBoard={() => setIsDeleteBoardOpen(true)}
        isLoadingBoards={isLoadingBoards}
        userRole={getUserRole()}
      />

      <main className="container mx-auto px-4 py-6">
        {isLoadingBoards ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Загрузка досок...</p>
            </div>
          </div>
        ) : boardsList.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Добро пожаловать в KanbanTask!</h2>
            <p className="text-gray-600 mb-6">Создайте свою первую доску для управления задачами</p>
            <button
              onClick={() => setIsCreateBoardOpen(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Создать доску
            </button>
          </div>
        ) : !activeBoard && boardLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Загрузка доски...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadBoard}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Попробовать снова
            </button>
          </div>
        ) : activeBoard ? (
          <div className="space-y-6">
            {/* Заголовок доски */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{activeBoard.title}</h1>
                {activeBoard.description && <p className="text-gray-600 mt-1">{activeBoard.description}</p>}
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-sm text-gray-500">
                    {activeBoard.columns?.length || 0} колонок •{" "}
                    {activeBoard.columns?.reduce((acc, col) => acc + (col.tasks?.length || 0), 0) || 0} задач(и) • Роль:{" "}
                    {getUserRole() === "owner"
                      ? "Владелец"
                      : getUserRole() === "admin"
                        ? "Администратор"
                        : getUserRole() === "member"
                          ? "Участник"
                          : "Наблюдатель"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMembersDialogOpen(true)}
                  className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Участники
                </button>
              </div>
            </div>

            {/* Канбан доска */}
            <KanbanBoard
              board={activeBoard}
              userRole={getUserRole()}
              optimisticUpdateTask={optimisticUpdateTask}
              optimisticAddTask={optimisticAddTask}
              optimisticRemoveTask={optimisticRemoveTask}
              optimisticAddColumn={optimisticAddColumn}
              optimisticRemoveColumn={optimisticRemoveColumn}
              optimisticUpdateColumn={optimisticUpdateColumn}
            />
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">Выберите доску для работы</p>
          </div>
        )}
      </main>

      {/* Диалоги */}
      <CreateBoardDialog
        open={isCreateBoardOpen}
        onOpenChange={setIsCreateBoardOpen}
        onCreateBoard={handleCreateBoard}
      />

      {activeBoard && (
        <>
          <BoardMembersDialog
            open={isMembersDialogOpen}
            onOpenChange={setIsMembersDialogOpen}
            board={activeBoard}
            userRole={getUserRole()}
            onBoardUpdate={(updates) => {
              // Обновляем активную доску
              if (activeBoard) {
                Object.assign(activeBoard, updates)
              }
              // Обновляем в списке досок
              updateBoardInList(activeBoard._id, updates)
            }}
          />

          <DeleteBoardDialog
            open={isDeleteBoardOpen}
            onOpenChange={setIsDeleteBoardOpen}
            board={activeBoard}
            onDeleteBoard={handleDeleteBoard}
          />
        </>
      )}
    </div>
  )
}
