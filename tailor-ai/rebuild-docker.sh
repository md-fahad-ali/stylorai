#!/bin/bash

# Development Docker Rebuild Script
# This script rebuilds and restarts your Docker containers

echo "🔄 Rebuilding Docker containers..."
docker compose down
docker compose up -d --build

echo "✅ Docker containers rebuilt and started!"
echo "📝 Viewing logs (press Ctrl+C to exit)..."
docker compose logs -f app
