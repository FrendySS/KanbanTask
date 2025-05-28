"use client"

import type React from "react"

import { useState } from "react"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { UserPlus, MoreHorizontal, Trash2, Crown } from "lucide-react"
import type { Board } from "@/app/page"
import { boardService } from "@/lib/api-services"
import { useAuth } from "@/lib/auth-context"

interface BoardMembersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  board: Board
  userRole: string
  onBoardUpdate: (board: Board) => void
}

export function BoardMembersDialog({ open, onOpenChange, board, userRole, onBoardUpdate }: BoardMembersDialogProps) {
  const { user } = useAuth()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("member")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const isOwner = typeof board.owner === "string" ? board.owner === user?._id : board.owner._id === user?._id
  const currentUserMember = board.members?.find((m) => m.user._id === user?._id)
  const isAdmin = currentUserMember?.role === "admin" || isOwner

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    try {
      setIsLoading(true)
      setError("")

      const updatedBoard = await boardService.addMember(board._id, email.trim(), role)
      onBoardUpdate(updatedBoard)
      setEmail("")
      setRole("member")
    } catch (error: any) {
      setError(error.response?.data?.message || "Ошибка добавления участника")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Удалить участника из доски?")) return

    try {
      const updatedBoard = await boardService.removeMember(board._id, userId)
      onBoardUpdate(updatedBoard)
    } catch (error: any) {
      alert(error.response?.data?.message || "Ошибка удаления участника")
    }
  }

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      const updatedBoard = await boardService.updateMemberRole(board._id, userId, newRole)
      onBoardUpdate(updatedBoard)
    } catch (error: any) {
      alert(error.response?.data?.message || "Ошибка изменения роли")
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="default">Администратор</Badge>
      case "member":
        return <Badge variant="secondary">Участник</Badge>
      case "viewer":
        return <Badge variant="outline">Наблюдатель</Badge>
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  // Функция для безопасного получения инициалов
  const getUserInitials = (name?: string, email?: string) => {
    if (name && name.trim()) {
      return name.charAt(0).toUpperCase()
    }
    if (email && email.trim()) {
      return email.charAt(0).toUpperCase()
    }
    return "?"
  }

  // Функция для безопасного получения имени пользователя
  const getUserDisplayName = (name?: string, email?: string) => {
    if (name && name.trim()) {
      return name
    }
    if (email && email.trim()) {
      return email.split("@")[0]
    }
    return "Неизвестный пользователь"
  }

  const currentUserRole = isOwner ? "owner" : currentUserMember?.role || "viewer"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Участники доски</DialogTitle>
          <DialogDescription>
            Управляйте участниками доски "{board.title}" (Ваша роль:{" "}
            {currentUserRole === "owner"
              ? "Владелец"
              : currentUserRole === "admin"
                ? "Администратор"
                : currentUserRole === "member"
                  ? "Участник"
                  : "Наблюдатель"}
            )
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Добавление участника */}
          {isAdmin && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Пригласить участника</h4>
              <form onSubmit={handleAddMember} className="space-y-3">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email пользователя</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    disabled={isLoading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="role">Роль</Label>
                  <Select value={role} onValueChange={setRole} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Наблюдатель</SelectItem>
                      <SelectItem value="member">Участник</SelectItem>
                      {isOwner && <SelectItem value="admin">Администратор</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>

                {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}

                <Button type="submit" disabled={isLoading || !email.trim()} className="w-full gap-2">
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  {isLoading ? "Добавление..." : "Пригласить"}
                </Button>
              </form>
            </div>
          )}

          {/* Список участников */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Участники ({board.members?.length || 0})</h4>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {board.members?.map((member) => (
                <div key={member.user._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback>{getUserInitials(member.user.name, member.user.email)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {getUserDisplayName(member.user.name, member.user.email)}
                        </span>
                        {board.owner === member.user._id && <Crown className="w-4 h-4 text-yellow-500" />}
                      </div>
                      <span className="text-xs text-gray-500">{member.user.email || "Нет email"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getRoleBadge(member.role)}

                    {/* Меню действий (только для админов и не для владельца) */}
                    {isAdmin && board.owner !== member.user._id && member.user._id !== user?._id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {isOwner && (
                            <>
                              <DropdownMenuItem onClick={() => handleChangeRole(member.user._id, "admin")}>
                                Сделать администратором
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleChangeRole(member.user._id, "member")}>
                                Сделать участником
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleChangeRole(member.user._id, "viewer")}>
                                Сделать наблюдателем
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleRemoveMember(member.user._id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              )) || <div className="text-center py-4 text-gray-500">Нет участников</div>}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
