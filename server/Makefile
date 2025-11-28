.PHONY: build build-dev up up-dev down logs shell download-models help

help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Build production Docker image
	docker-compose build

build-dev: ## Build development Docker image
	docker-compose -f docker-compose.dev.yml build

up: ## Start production containers
	docker-compose up -d

up-dev: ## Start development containers with hot reload
	docker-compose -f docker-compose.dev.yml up

down: ## Stop containers
	docker-compose down

logs: ## View container logs
	docker-compose logs -f

shell: ## Open shell in running container
	docker-compose exec api bash

download-models: ## Download Supertonic models (run in container)
	docker-compose exec api uv run download-supertonic-models --force

