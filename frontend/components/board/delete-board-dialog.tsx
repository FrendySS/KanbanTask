"use client"

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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Trash2, AlertTriangle } from "lucide-react"
import type { Board } from "@/app/page"

interface DeleteBoardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  board: Board
  onDeleteBoard: () => Promise<void>
}

export function DeleteBoardDialog({ open, onOpenChange, board, onDeleteBoard }: DeleteBoardDialogProps) {
  const [confirmText, setConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  const isConfirmValid = confirmText === board.title
  const totalTasks = board.columns?.reduce((sum, col) => sum + (col.tasks?.length || 0), 0) || 0

  const handleConfirm = async () => {
    if (!isConfirmValid) return

    try {
      setIsDeleting(true)
      await onDeleteBoard()
      onOpenChange(false)
      setConfirmText("")
    } catch (error) {
      console.error("Error deleting board:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setConfirmText("")
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="w-5 h-5" />
            Удалить доску
          </DialogTitle>
          <DialogDescription>
            Это действие нельзя отменить. Доска и все её данные будут удалены навсегда.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Внимание!</strong> Будут удалены:
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>{board.columns?.length || 0} колонок</li>
                <li>{totalTasks} задач</li>
                <li>Все комментарии и вложения</li>
                <li>История изменений</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="confirm">
              Для подтверждения введите название доски: <strong>{board.title}</strong>
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={`Введите "${board.title}"`}
              disabled={isDeleting}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isDeleting}>
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmValid || isDeleting}
            className="gap-2"
          >
            {isDeleting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {isDeleting ? "Удаление..." : "Удалить доску"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
