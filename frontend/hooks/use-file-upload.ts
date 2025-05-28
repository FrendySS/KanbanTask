"use client"

import { useState } from "react"
import type { Attachment } from "@/app/page"
import { taskService } from "@/lib/api-services"

export function useFileUpload(taskId: string) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadFile = async (file: File): Promise<Attachment | null> => {
    try {
      setIsUploading(true)
      setError(null)

      const attachment = await taskService.uploadAttachment(taskId, file)
      return attachment
    } catch (err: any) {
      setError(err.message || "Ошибка загрузки файла")
      return null
    } finally {
      setIsUploading(false)
    }
  }

  return {
    uploadFile,
    isUploading,
    error,
  }
}
