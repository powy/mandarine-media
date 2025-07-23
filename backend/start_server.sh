#!/bin/bash

echo "🚀 Starting Kyool Media Server..."

# Start services
docker compose -f docker-compose.dev.yml up -d

# Wait a moment for services to start
sleep 3

# Check status
echo "📊 Service Status:"
docker compose -f docker-compose.dev.yml ps

# Quick health check
echo -e "\n🏥 Health Check:"
curl -s http://localhost:8000/health | python3 -m json.tool

echo -e "\n✅ Server ready!"
echo "📖 API Docs: http://localhost:8000/docs"
echo "🧪 Run tests: ./test_api.sh"