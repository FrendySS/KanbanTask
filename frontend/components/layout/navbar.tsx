"use client"
import * as React from "react"
import { ChevronDown, Plus, Settings, User, LogOut, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Board, BoardWithTaskCount } from "@/app/page"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

interface NavbarProps {
  boards: BoardWithTaskCount[]
  activeBoard: Board | null
  onBoardChange: (board: BoardWithTaskCount) => void
  onCreateBoard: () => void
  onDeleteBoard?: () => void
  isLoadingBoards: boolean
  userRole?: string
}

export function Navbar({
  boards,
  activeBoard,
  onBoardChange,
  onCreateBoard,
  onDeleteBoard,
  isLoadingBoards,
  userRole,
}: NavbarProps) {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    console.log("🚪 Navbar logout clicked")
    logout()
  }

  // Безопасная проверка владельца доски
  const isOwner = React.useMemo(() => {
    if (!activeBoard || !user) return false

    const ownerId = typeof activeBoard.owner === "string" ? activeBoard.owner : activeBoard.owner?._id

    return ownerId === user._id
  }, [activeBoard, user])

  const canDeleteBoard = isOwner && activeBoard && onDeleteBoard

  console.log("🔍 Navbar debug:", {
    activeBoard: activeBoard?.title,
    userRole,
    isOwner,
    canDeleteBoard,
    activeBoardOwner: activeBoard?.owner,
    userId: user?._id,
  })

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <span className="text-xl font-bold text-gray-900">KanbanTask</span>
          </div>

          {activeBoard && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  {activeBoard.title}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <div className="px-2 py-1.5 text-sm font-medium text-gray-700">Ваши доски</div>
                <DropdownMenuSeparator />
                {isLoadingBoards ? (
                  <div className="px-2 py-4 text-center">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto" />
                  </div>
                ) : (
                  boards.map((board) => (
                    <DropdownMenuItem
                      key={board._id}
                      onClick={() => onBoardChange(board)}
                      className={activeBoard._id === board._id ? "bg-blue-50" : ""}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{board.title}</span>
                        <span className="text-xs text-gray-500">
                          {board.taskCount !== undefined ? `${board.taskCount} задач(и)` : "Загрузка..."}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onCreateBoard} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Создать новую доску
                </DropdownMenuItem>
                {canDeleteBoard && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onDeleteBoard} className="gap-2 text-red-600 focus:text-red-600">
                      <Trash2 className="w-4 h-4" />
                      Удалить доску
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/settings")}>
            <Settings className="w-4 h-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={user?.avatar || "/placeholder.svg"} />
                  <AvatarFallback>{user?.name?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline">{user?.name}</span>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-2 py-1.5 text-sm text-gray-500">{user?.email}</div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                <User className="w-4 h-4 mr-2" />
                Профиль
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings className="w-4 h-4 mr-2" />
                Настройки
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  )
}
