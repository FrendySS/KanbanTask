import axios from "axios"

// Создаем экземпляр axios с правильным базовым URL
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
})

// Интерцептор для добавления токена авторизации
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Интерцептор для обработки ответов
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    console.error("API Error:", error.response?.data || error.message)

    // Если токен недействителен, очищаем localStorage и перенаправляем на логин
    if (error.response?.status === 401) {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      if (typeof window !== "undefined" && !window.location.pathname.includes("/auth/")) {
        window.location.href = "/auth/login"
      }
    }

    return Promise.reject(error)
  },
)

export default api
