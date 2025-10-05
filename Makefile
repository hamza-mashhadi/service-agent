.PHONY: build up down clean logs help

# Default target
build: copy-env up

# Copy .env.example to .env and start services
copy-env:
	@echo "Copying .env.example to .env..."
	@cp .env.example .env

# Start all services with docker-compose
up:
	@echo "Starting all services..."
	@docker-compose up -d

# Stop all services
down:
	@echo "Stopping all services..."
	@docker-compose down

#reload pods
reload:
	@echo "Reloading all services..."
	@docker compose up --force-recreate --build --wait --remove-orphans

# Stop services and remove volumes
clean:
	@echo "Stopping services and removing volumes..."
	@docker-compose down -v

# Show logs for all services
logs:
	@docker-compose logs -f

# Run tests for request-executor service
test:
	@echo "Running tests for request-executor..."
	@cd request-executor && npm install && npm test

# Run tests with coverage
test-coverage:
	@echo "Running tests with coverage for request-executor..."
	@cd request-executor && npm install && npm run test:coverage


# Show available commands
help:
	@echo "Available commands:"
	@echo "  make build  - Copy .env.example to .env and start services"
	@echo "  make up     - Start all services"
	@echo "  make down   - Stop all services"
	@echo "  make clean  - Stop services and remove volumes"
	@echo "  make logs   - Show logs for all services"
	@echo "  make test   - Run tests for request-executor"
	@echo "  make help   - Show this help message"