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
import { Textarea } from "@/components/ui/textarea"

interface CreateBoardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateBoard: (title: string, description?: string) => void
}

export function CreateBoardDialog({ open, onOpenChange, onCreateBoard }: CreateBoardDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim()) {
      onCreateBoard(title.trim(), description.trim() || undefined)
      setTitle("")
      setDescription("")
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Создать новую доску</DialogTitle>
          <DialogDescription>Создайте новую канбан-доску для управления задачами.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Название доски</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Введите название доски..."
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Описание (необязательно)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Краткое описание доски..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              Создать доску
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
