"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import api from "./api"

interface User {
  _id: string
  name: string
  email: string
  avatar?: string
  createdAt: string
  updatedAt?: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (user: User) => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Проверяем авторизацию при загрузке
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("token")
        console.log("🔍 Checking token:", token ? "exists" : "not found")

        if (!token) {
          console.log("❌ No token found")
          setIsLoading(false)
          return
        }

        console.log("🔍 Validating token with backend...")
        const response = await api.get("/auth/me")
        console.log("✅ User authenticated:", response.data)
        setUser(response.data)
      } catch (error: any) {
        console.error("❌ Auth check failed:", error.response?.status, error.message)

        // Если токен недействителен, удаляем его
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.log("🗑️ Removing invalid token")
          localStorage.removeItem("token")
          localStorage.removeItem("user")
        }

        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  // Перенаправляем на логин если пользователь не авторизован
  useEffect(() => {
    if (!isLoading && !user) {
      console.log("🔄 Redirecting to login page")
      router.push("/auth/login")
    }
  }, [user, isLoading, router])

  const login = async (email: string, password: string) => {
    try {
      console.log("🔐 Attempting login for:", email)

      const response = await api.post("/auth/login", { email, password })
      console.log("✅ Login response:", response.data)

      const { token, user: userData } = response.data

      // Сохраняем токен и данные пользователя
      localStorage.setItem("token", token)
      localStorage.setItem("user", JSON.stringify(userData))
      setUser(userData)

      console.log("✅ Login successful, redirecting to home")
      router.push("/")
    } catch (error: any) {
      console.error("❌ Login error:", error.response?.data || error.message)
      const message = error.response?.data?.message || "Ошибка входа в систему"
      throw new Error(message)
    }
  }

  const register = async (name: string, email: string, password: string) => {
    try {
      console.log("📝 Attempting registration for:", email)

      const response = await api.post("/auth/register", { name, email, password })
      console.log("✅ Registration response:", response.data)

      const { token, user: userData } = response.data

      // Сохраняем токен и данные пользователя
      localStorage.setItem("token", token)
      localStorage.setItem("user", JSON.stringify(userData))
      setUser(userData)

      console.log("✅ Registration successful, redirecting to home")
      router.push("/")
    } catch (error: any) {
      console.error("❌ Registration error:", error.response?.data || error.message)
      const message = error.response?.data?.message || "Ошибка регистрации"
      throw new Error(message)
    }
  }

  const logout = () => {
    console.log("🚪 Logging out user")
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setUser(null)
    router.push("/auth/login")
  }

  const updateUser = (updatedUser: User) => {
    console.log("📝 Updating user:", updatedUser.email)
    setUser(updatedUser)
    localStorage.setItem("user", JSON.stringify(updatedUser))
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
