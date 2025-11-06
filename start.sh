#!/bin/bash

# Kiko Creator Start Script
# Usage: ./start.sh [dev|prod]

# Parse mode argument (default to dev)
MODE="${1:-dev}"

if [ "$MODE" != "dev" ] && [ "$MODE" != "prod" ]; then
    echo "❌ Invalid mode: $MODE"
    echo "Usage: ./start.sh [dev|prod]"
    echo ""
    echo "  dev  - Development mode with hot reload (default)"
    echo "  prod - Production mode with optimized build"
    exit 1
fi

echo "🚀 Starting Kiko Creator in $MODE mode..."

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
    if [ -f ".env.example" ]; then
        cp .env.example .env
    else
        echo "⚠️  Warning: .env.example not found"
    fi
fi

if [ ! -f "server/.env" ]; then
    echo "⚙️  Creating server/.env from template..."
    if [ -f "server/.env.example" ]; then
        cp server/.env.example server/.env
    else
        echo "⚠️  Warning: server/.env.example not found"
    fi
fi

# Create data directory if it doesn't exist
mkdir -p data

# Save PID file location
PID_FILE=".kiko-creator.pid"
LOG_FILE="kiko-creator.log"

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

# Production mode: Build frontend first
if [ "$MODE" = "prod" ]; then
    echo "📦 Building production frontend..."
    npm run build

    if [ $? -ne 0 ]; then
        echo "❌ Frontend build failed"
        exit 1
    fi

    echo "✅ Frontend built successfully"
fi

# Start the application in background
echo "🎨 Starting servers..."

if [ "$MODE" = "dev" ]; then
    # Development mode: Vite dev server + nodemon
    nohup npm run dev:all > "$LOG_FILE" 2>&1 &
    APP_PID=$!
    FRONTEND_PORT=5173
    BACKEND_PORT=3001
else
    # Production mode: Vite preview + node
    # Note: Using same port as dev (5173) to preserve localStorage (presets, etc.)
    nohup bash -c "npm run preview & npm run server" > "$LOG_FILE" 2>&1 &
    APP_PID=$!
    FRONTEND_PORT=5173
    BACKEND_PORT=3001
fi

# Save PID
echo $APP_PID > "$PID_FILE"

# Wait for servers to start
echo "⏳ Waiting for servers to initialize..."
sleep 4

# Check if process is still running
if ps -p $APP_PID > /dev/null 2>&1; then
    echo ""
    echo "✅ Kiko Creator started successfully in $MODE mode!"
    echo ""
    echo "   Process ID: $APP_PID"
    echo "   Log file: $LOG_FILE"
    echo ""
    echo "🌐 Access URLs:"
    echo "   Local:   http://localhost:$FRONTEND_PORT"

    # Try to get network IP (portable method)
    NETWORK_IP=$(ip route get 1 2>/dev/null | awk '{print $7; exit}')
    if [ -z "$NETWORK_IP" ]; then
        # Fallback method
        NETWORK_IP=$(ip -4 addr show 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v 127.0.0.1 | head -1)
    fi
    if [ -n "$NETWORK_IP" ]; then
        echo "   Network: http://$NETWORK_IP:$FRONTEND_PORT"
    fi

    echo ""
    echo "📝 Commands:"
    echo "   View logs:   tail -f $LOG_FILE"
    echo "   Stop server: ./stop.sh"
    echo "   Restart:     ./restart.sh $MODE"
    echo "   Status:      ./status.sh"
    echo ""

    if [ "$MODE" = "dev" ]; then
        echo "💡 Development features:"
        echo "   • Hot module reload enabled"
        echo "   • Nodemon auto-restart on file changes"
    else
        echo "💡 Production features:"
        echo "   • Optimized build with minification"
        echo "   • Static file serving"
    fi
    echo ""
else
    echo "❌ Failed to start. Check $LOG_FILE for errors"
    rm "$PID_FILE"
    exit 1
fi
