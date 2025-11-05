#!/bin/bash

# Kiko Creator Stop Script
echo "🛑 Stopping Kiko Creator..."

PID_FILE=".kiko-creator.pid"

# Check if PID file exists
if [ ! -f "$PID_FILE" ]; then
    echo "⚠️  No PID file found. Is Kiko Creator running?"
    echo "Searching for running processes..."

    # Try to find running node processes
    PIDS=$(pgrep -f "vite|nodemon.*kiko-creator")

    if [ -z "$PIDS" ]; then
        echo "❌ No Kiko Creator processes found"
        exit 1
    else
        echo "Found processes: $PIDS"
        echo "Killing processes..."
        kill $PIDS 2>/dev/null
        echo "✅ Processes stopped"
        exit 0
    fi
fi

# Read PID from file
APP_PID=$(cat "$PID_FILE")

# Check if process is running
if ps -p $APP_PID > /dev/null 2>&1; then
    echo "Stopping process $APP_PID..."

    # Try graceful shutdown first
    kill $APP_PID 2>/dev/null

    # Wait for process to stop
    for i in {1..10}; do
        if ! ps -p $APP_PID > /dev/null 2>&1; then
            echo "✅ Kiko Creator stopped successfully"
            rm "$PID_FILE"
            exit 0
        fi
        sleep 1
    done

    # Force kill if still running
    echo "⚠️  Graceful shutdown failed, forcing stop..."
    kill -9 $APP_PID 2>/dev/null

    if ! ps -p $APP_PID > /dev/null 2>&1; then
        echo "✅ Kiko Creator stopped (forced)"
        rm "$PID_FILE"
        exit 0
    else
        echo "❌ Failed to stop process $APP_PID"
        exit 1
    fi
else
    echo "⚠️  Process $APP_PID is not running"
    rm "$PID_FILE"
    echo "✅ Cleaned up stale PID file"
fi
