"use client"

import { useEffect, useRef } from "react"
import { socketService } from "@/lib/socket"
import { useAuth } from "@/lib/auth-context"

export function useSocket() {
  const { user } = useAuth()
  const socketRef = useRef(socketService)

  useEffect(() => {
    if (user && typeof window !== "undefined") {
      const token = localStorage.getItem("token")
      if (token) {
        socketRef.current.connect(token)
      }
    }

    return () => {
      socketRef.current.disconnect()
    }
  }, [user])

  return socketRef.current
}

export function useBoardSocket(boardId: string | null, onUpdate?: (data: any) => void) {
  const socket = useSocket()

  useEffect(() => {
    if (!boardId || !socket.getSocket()) return

    // Присоединяемся к комнате доски
    socket.joinBoard(boardId)

    // Подписываемся на обновления
    if (onUpdate) {
      socket.onBoardUpdate(onUpdate)
      socket.onTaskUpdate(onUpdate)
      socket.onColumnUpdate(onUpdate)
    }

    return () => {
      socket.leaveBoard(boardId)
    }
  }, [boardId, socket, onUpdate])

  return socket
}
