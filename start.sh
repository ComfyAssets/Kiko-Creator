#!/bin/bash

# Kiko Creator Start Script
echo "🚀 Starting Kiko Creator..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "Please install Node.js 20.x or higher"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd server && npm install && cd ..
fi

# Check if .env files exist
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env from template..."
    cp .env.example .env
fi

if [ ! -f "server/.env" ]; then
    echo "⚙️  Creating server/.env from template..."
    cp server/.env.example server/.env
fi

# Create data directory if it doesn't exist
mkdir -p data

# Save PID file location
PID_FILE=".kiko-creator.pid"

# Check if already running
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p $OLD_PID > /dev/null 2>&1; then
        echo "⚠️  Kiko Creator is already running (PID: $OLD_PID)"
        echo "Run './stop.sh' first to stop the existing instance"
        exit 1
    else
        # Stale PID file, remove it
        rm "$PID_FILE"
    fi
fi

# Start the application in background
echo "🎨 Starting servers..."
nohup npm run dev:all > kiko-creator.log 2>&1 &
APP_PID=$!

# Save PID
echo $APP_PID > "$PID_FILE"

# Wait a moment for servers to start
sleep 3

# Check if process is still running
if ps -p $APP_PID > /dev/null 2>&1; then
    echo ""
    echo "✅ Kiko Creator started successfully!"
    echo ""
    echo "   Process ID: $APP_PID"
    echo "   Log file: kiko-creator.log"
    echo ""
    echo "🌐 Access URLs:"
    echo "   Local:   http://localhost:5173"
    echo "   Network: http://10.0.140.30:5173"
    echo ""
    echo "📝 View logs: tail -f kiko-creator.log"
    echo "🛑 Stop server: ./stop.sh"
    echo ""
else
    echo "❌ Failed to start. Check kiko-creator.log for errors"
    rm "$PID_FILE"
    exit 1
fi
