"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Settings, Users, Bell, Shield, Trash2 } from "lucide-react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/lib/auth-context"

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsPageContent />
    </ProtectedRoute>
  )
}

function SettingsPageContent() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteAccount = async () => {
    if (!confirm("Вы уверены, что хотите удалить аккаунт? Это действие необратимо!")) {
      return
    }

    try {
      setIsDeleting(true)
      // TODO: Implement account deletion API
      alert("Функция удаления аккаунта будет реализована в следующей версии")
    } catch (error) {
      console.error("Error deleting account:", error)
      alert("Ошибка удаления аккаунта")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Назад
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Настройки</h1>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Общие настройки */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Общие настройки
              </CardTitle>
              <CardDescription>Основные настройки приложения</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Профиль пользователя</h4>
                  <p className="text-sm text-gray-600">Управление личными данными</p>
                </div>
                <Button variant="outline" onClick={() => router.push("/profile")}>
                  Редактировать
                </Button>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Язык интерфейса</h4>
                  <p className="text-sm text-gray-600">Русский</p>
                </div>
                <Button variant="outline" disabled>
                  Изменить
                </Button>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Тема оформления</h4>
                  <p className="text-sm text-gray-600">Светлая тема</p>
                </div>
                <Button variant="outline" disabled>
                  Изменить
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Настройки команды */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Командная работа
              </CardTitle>
              <CardDescription>Настройки совместной работы</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Приглашения в доски</h4>
                  <p className="text-sm text-gray-600">Разрешить другим пользователям приглашать вас в доски</p>
                </div>
                <Button variant="outline" disabled>
                  Включено
                </Button>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Видимость профиля</h4>
                  <p className="text-sm text-gray-600">Другие пользователи могут найти вас по email</p>
                </div>
                <Button variant="outline" disabled>
                  Включено
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Уведомления */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Уведомления
              </CardTitle>
              <CardDescription>Настройки уведомлений</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Email уведомления</h4>
                  <p className="text-sm text-gray-600">Получать уведомления на email</p>
                </div>
                <Button variant="outline" disabled>
                  Включено
                </Button>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Push уведомления</h4>
                  <p className="text-sm text-gray-600">Уведомления в браузере</p>
                </div>
                <Button variant="outline" disabled>
                  Отключено
                </Button>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Уведомления о задачах</h4>
                  <p className="text-sm text-gray-600">Уведомления о назначенных задачах</p>
                </div>
                <Button variant="outline" disabled>
                  Включено
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Безопасность */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Безопасность
              </CardTitle>
              <CardDescription>Настройки безопасности аккаунта</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Смена пароля</h4>
                  <p className="text-sm text-gray-600">Обновите пароль для безопасности</p>
                </div>
                <Button variant="outline" onClick={() => router.push("/profile")}>
                  Изменить
                </Button>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Двухфакторная аутентификация</h4>
                  <p className="text-sm text-gray-600">Дополнительная защита аккаунта</p>
                </div>
                <Button variant="outline" disabled>
                  Настроить
                </Button>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Активные сессии</h4>
                  <p className="text-sm text-gray-600">Управление активными сессиями</p>
                </div>
                <Button variant="outline" disabled>
                  Просмотреть
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Опасная зона */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="w-5 h-5" />
                Опасная зона
              </CardTitle>
              <CardDescription>Необратимые действия с аккаунтом</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-red-600">Удалить аккаунт</h4>
                  <p className="text-sm text-gray-600">
                    Полное удаление аккаунта и всех связанных данных. Это действие необратимо.
                  </p>
                </div>
                <Button variant="destructive" onClick={handleDeleteAccount} disabled={isDeleting}>
                  {isDeleting ? "Удаление..." : "Удалить"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Информация о версии */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-sm text-gray-500">
                <p>KanbanTask v1.0.0</p>
                <p>© 2024 KanbanTask Team. Все права защищены.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
