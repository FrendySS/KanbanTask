# Обновленный Makefile с дополнительными командами

.PHONY: help build up down logs clean restart status pull dev

# Показать справку
help:
	@echo "🐳 KanbanTask Docker Commands:"
	@echo ""
	@echo "  pull      - Загрузить необходимые образы"
	@echo "  build     - Собрать Docker образы"
	@echo "  up        - Запустить все сервисы"
	@echo "  down      - Остановить все сервисы"
	@echo "  logs      - Показать логи"
	@echo "  clean     - Очистить все данные"
	@echo "  restart   - Перезапустить сервисы"
	@echo "  status    - Показать статус сервисов"
	@echo "  dev       - Запустить в режиме разработки"
	@echo ""

# Загрузить образы
pull:
	@echo "📥 Pulling required images..."
	docker pull mongo:7.0
	docker pull node:18-alpine
	docker pull nginx:alpine

# Собрать образы
build:
	@echo "🔨 Building Docker images..."
	docker-compose build --no-cache

# Запустить сервисы
up:
	@echo "🚀 Starting KanbanTask services..."
	docker-compose up -d
	@echo "✅ Services started!"
	@echo "🌐 Frontend: http://localhost:3000"
	@echo "🔌 Backend: http://localhost:5000"

# Запустить в режиме разработки (с логами)
dev:
	@echo "🚀 Starting KanbanTask in development mode..."
	docker-compose up

# Остановить сервисы
down:
	@echo "📴 Stopping services..."
	docker-compose down

# Показать логи
logs:
	docker-compose logs -f

# Очистить все данные
clean:
	@echo "🧹 Cleaning up..."
	docker-compose down -v
	docker system prune -f
	docker volume prune -f

# Перезапустить сервисы
restart:
	@echo "🔄 Restarting services..."
	docker-compose restart

# Показать статус
status:
	@echo "📊 Service status:"
	docker-compose ps
	@echo ""
	@echo "📊 Docker images:"
	docker images | grep -E "(kanban|mongo|node|nginx)"
	@echo ""
	@echo "📊 Docker volumes:"
	docker volume ls | grep kanban
