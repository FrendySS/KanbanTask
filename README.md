# KanbanTask - Система управления задачами

Современная система управления задачами в формате канбан-доски с real-time обновлениями.

## 🚀 Технологии

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Real-time**: Socket.io
- **Authentication**: JWT
- **File Upload**: Multer
- **Deployment**: Docker

## 📋 Функционал

- ✅ Регистрация и авторизация пользователей
- ✅ Создание и управление досками
- ✅ Drag & Drop для задач между колонками
- ✅ Real-time обновления
- ✅ Комментарии к задачам
- ✅ Загрузка файлов
- ✅ Управление участниками досок
- ✅ Приоритеты и сроки выполнения

## 🛠 Установка и запуск

### С Docker (рекомендуется)

\`\`\`bash
# Клонировать репозиторий
git clone <repository-url>
cd kanbantask

# Запустить с Docker
docker-compose up --build
\`\`\`

Приложение будет доступно:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

### Локальная разработка

\`\`\`bash
# Backend
cd backend
npm install
npm run dev

# Frontend (в новом терминале)
cd frontend
npm install
npm run dev
\`\`\`

## 🗄 База данных

Проект использует 5 основных моделей:
- **User** - пользователи
- **Board** - доски
- **Column** - колонки
- **Task** - задачи
- **Comment** - комментарии

## 🔐 Переменные окружения

### Backend (.env)
\`\`\`
PORT=5000
MONGODB_URI=mongodb://localhost:27017/kanbantask
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
\`\`\`

### Frontend (.env.local)
\`\`\`
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
\`\`\`

## 📁 Структура проекта

\`\`\`
kanbantask/
├── frontend/          # Next.js приложение
├── backend/           # Express.js API
├── docker-compose.yml # Docker конфигурация
└── README.md
\`\`\`

## 🧪 Тестирование

Для тестирования используйте тестовый аккаунт:
- Email: test@example.com
- Password: 123456
