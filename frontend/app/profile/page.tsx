"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, User, Lock, Save } from "lucide-react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/lib/auth-context"
import { userService } from "@/lib/api-services"

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfilePageContent />
    </ProtectedRoute>
  )
}

function ProfilePageContent() {
  const { user, updateUser } = useAuth()
  const router = useRouter()

  // Состояние для профиля
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  // Состояние для смены пароля
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email)
    }
  }, [user])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setMessage("")

    try {
      const updatedUser = await userService.updateProfile({ name, email })
      updateUser(updatedUser)
      setMessage("Профиль успешно обновлен")
    } catch (error: any) {
      setError(error.response?.data?.message || "Ошибка обновления профиля")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsPasswordLoading(true)
    setError("")
    setMessage("")

    if (newPassword !== confirmPassword) {
      setError("Новые пароли не совпадают")
      setIsPasswordLoading(false)
      return
    }

    if (newPassword.length < 6) {
      setError("Новый пароль должен содержать минимум 6 символов")
      setIsPasswordLoading(false)
      return
    }

    try {
      await userService.changePassword({
        currentPassword,
        newPassword,
      })

      setMessage("Пароль успешно изменен")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error: any) {
      setError(error.response?.data?.message || "Ошибка смены пароля")
    } finally {
      setIsPasswordLoading(false)
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
          <h1 className="text-3xl font-bold text-gray-900">Профиль пользователя</h1>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Сообщения */}
          {message && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">{message}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Основная информация */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Основная информация
              </CardTitle>
              <CardDescription>Обновите свои личные данные</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Имя</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ваше имя"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    disabled={isLoading}
                  />
                </div>

                <Button type="submit" disabled={isLoading} className="gap-2">
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isLoading ? "Сохранение..." : "Сохранить изменения"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Separator />

          {/* Смена пароля */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Смена пароля
              </CardTitle>
              <CardDescription>Обновите свой пароль для безопасности</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Текущий пароль</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Введите текущий пароль"
                    required
                    disabled={isPasswordLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Новый пароль</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Введите новый пароль"
                    required
                    minLength={6}
                    disabled={isPasswordLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Подтвердите новый пароль</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Повторите новый пароль"
                    required
                    disabled={isPasswordLoading}
                  />
                </div>

                <Button type="submit" disabled={isPasswordLoading} className="gap-2">
                  {isPasswordLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  {isPasswordLoading ? "Изменение..." : "Изменить пароль"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Информация об аккаунте */}
          <Card>
            <CardHeader>
              <CardTitle>Информация об аккаунте</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">ID пользователя:</span>
                <span className="font-mono text-sm">{user?._id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Дата регистрации:</span>
                <span>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString("ru-RU") : "—"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
