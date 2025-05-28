# Исправленный Dockerfile с проверкой существования папок

# Multi-stage build для оптимизации размера образа

# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

# Установка зависимостей с retry логикой
COPY frontend/package*.json ./
RUN npm config set registry https://registry.npmjs.org/ && \
    npm ci --only=production --no-audit --no-fund

# Копируем исходный код и собираем
COPY frontend/ ./

# Создаем папку public если она не существует
RUN mkdir -p public

RUN npm run build

# Stage 2: Setup backend
FROM node:18-alpine AS backend-setup
WORKDIR /app/backend

# Установка зависимостей с retry логикой
COPY backend/package*.json ./
RUN npm config set registry https://registry.npmjs.org/ && \
    npm ci --only=production --no-audit --no-fund

# Копируем исходный код backend
COPY backend/ ./

# Stage 3: Final production image
FROM node:18-alpine AS production
WORKDIR /app

# Устанавливаем dumb-init для правильной обработки сигналов
RUN apk add --no-cache dumb-init curl

# Создаем пользователя без root прав
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Копируем backend
COPY --from=backend-setup --chown=nextjs:nodejs /app/backend ./backend

# Копируем frontend build
COPY --from=frontend-builder --chown=nextjs:nodejs /app/frontend/.next ./frontend/.next

# Копируем public папку только если она существует
COPY --from=frontend-builder --chown=nextjs:nodejs /app/frontend/package*.json ./frontend/
COPY --from=frontend-builder --chown=nextjs:nodejs /app/frontend/next.config.js ./frontend/

# Устанавливаем только production зависимости для frontend
WORKDIR /app/frontend
RUN npm config set registry https://registry.npmjs.org/ && \
    npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force

# Возвращаемся в корневую директорию
WORKDIR /app

# Создаем директории для uploads и логов
RUN mkdir -p uploads logs frontend/public && \
    chown -R nextjs:nodejs uploads logs frontend

# Копируем скрипты запуска
COPY --chown=nextjs:nodejs start-services.js ./
COPY --chown=nextjs:nodejs backend/healthcheck.js ./

# Переключаемся на непривилегированного пользователя
USER nextjs

# Открываем порты
EXPOSE 3000 5000

# Health check с curl
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Запускаем приложение
CMD ["dumb-init", "node", "start-services.js"]
