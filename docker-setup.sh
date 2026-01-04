#!/bin/bash

# HAPIE Docker Setup Script

echo "=================================================="
echo "HAPIE - Docker Setup"
echo "=================================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

echo "✓ Docker is running"

# Build and start services
echo ""
echo "Building Docker images..."
docker-compose build

echo ""
echo "Starting HAPIE services..."
docker-compose up -d

echo ""
echo "Waiting for backend to be ready..."
sleep 5

# Check if backend is healthy
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✓ Backend is running at http://localhost:8000"
else
    echo "⚠ Backend may still be starting. Check logs with: docker-compose logs backend"
fi

echo ""
echo "=================================================="
echo "HAPIE is running!"
echo "=================================================="
echo ""
echo "Backend API: http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "Useful commands:"
echo "  View logs:        docker-compose logs -f backend"
echo "  Stop services:    docker-compose down"
echo "  Restart:          docker-compose restart"
echo "  Shell access:     docker-compose exec backend bash"
echo ""
echo "To setup base model, run:"
echo "  docker-compose exec backend python setup.py"
echo ""
