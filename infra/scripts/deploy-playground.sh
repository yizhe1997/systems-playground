#!/bin/bash

# ==========================================================
# deploy-playground.sh
# Optional deployment script for local-build environments.
# (If using Watchtower + Docker Hub, this is not needed).
# ==========================================================

APP_DIR="/home/user/apps/systems-playground"

echo "🚀 Starting zero-downtime deployment for Systems Playground..."

# 1. Navigate to the project directory
cd "$APP_DIR" || { echo "❌ Directory $APP_DIR not found! Is the repo cloned here?"; exit 1; }

# 2. Pull the latest code from GitHub
echo "📦 Pulling latest code from Git..."
git pull origin main

# 3. Build the new Docker images in the background
echo "🏗️ Building new Docker images..."
docker compose build

# 4. Gracefully recreate only the changed containers
echo "🔄 Gracefully replacing changed containers..."
docker compose up -d

# 5. Clean up dangling images
echo "🧹 Cleaning up old unused images..."
docker image prune -f

echo "✅ Deployment complete!"