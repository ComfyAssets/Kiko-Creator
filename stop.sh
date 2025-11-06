#!/bin/bash

# Kiko Creator Stop Script
echo "🛑 Stopping Kiko Creator..."

PID_FILE=".kiko-creator.pid"

# Function to kill process tree
kill_process_tree() {
    local pid=$1
    local signal=${2:-TERM}

    # Get all child processes
    local children=$(pgrep -P $pid 2>/dev/null)

    # Recursively kill children first
    for child in $children; do
        kill_process_tree $child $signal
    done

    # Kill the parent process
    if ps -p $pid > /dev/null 2>&1; then
        kill -$signal $pid 2>/dev/null
    fi
}

# Check if PID file exists
if [ ! -f "$PID_FILE" ]; then
    echo "⚠️  No PID file found. Is Kiko Creator running?"
    echo "Searching for running processes..."

    # Try to find running node processes related to kiko-creator
    PIDS=$(pgrep -f "vite.*kiko-creator|node.*index.js" 2>/dev/null | grep -v grep)

    if [ -z "$PIDS" ]; then
        echo "❌ No Kiko Creator processes found"
        exit 1
    else
        echo "Found processes: $PIDS"
        echo "Killing processes..."
        for pid in $PIDS; do
            kill_process_tree $pid
        done
        sleep 1
        echo "✅ Processes stopped"
        exit 0
    fi
fi

# Read PID from file
APP_PID=$(cat "$PID_FILE")

# Check if process is running
if ps -p $APP_PID > /dev/null 2>&1; then
    echo "Stopping process $APP_PID and its children..."

    # Try graceful shutdown first - kill entire process tree
    kill_process_tree $APP_PID TERM

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
    kill_process_tree $APP_PID KILL

    sleep 1
    if ! ps -p $APP_PID > /dev/null 2>&1; then
        echo "✅ Kiko Creator stopped (forced)"
        rm "$PID_FILE"
        exit 0
    else
        echo "❌ Failed to stop process $APP_PID"
        exit 1
    fi
else
    echo "⚠️  Process $APP_PID is not running, but searching for orphaned processes..."

    # Clean up any orphaned processes
    PIDS=$(pgrep -f "vite.*kiko-creator|node.*index.js" 2>/dev/null | grep -v grep)

    if [ -n "$PIDS" ]; then
        echo "Found orphaned processes: $PIDS"
        echo "Cleaning up..."
        for pid in $PIDS; do
            kill_process_tree $pid
        done
        sleep 1
    fi

    rm "$PID_FILE"
    echo "✅ Cleaned up"
fi
