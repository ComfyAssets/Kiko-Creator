#!/bin/bash

# Kiko Creator Status Script
echo "📊 Kiko Creator Status"
echo "======================="

PID_FILE=".kiko-creator.pid"

# Check PID file
if [ ! -f "$PID_FILE" ]; then
    echo "Status: ❌ Not running (no PID file)"
    exit 0
fi

APP_PID=$(cat "$PID_FILE")

# Check if process is running
if ps -p $APP_PID > /dev/null 2>&1; then
    echo "Status: ✅ Running"
    echo "PID: $APP_PID"
    echo ""

    # Get process info
    echo "Process Info:"
    ps -p $APP_PID -o pid,ppid,%cpu,%mem,etime,cmd
    echo ""

    # Check if ports are listening
    echo "Network Status:"
    if command -v ss &> /dev/null; then
        echo "Port 3000 (Backend):"
        ss -tlnp | grep ":3000" || echo "  Not listening"
        echo "Port 5173 (Frontend):"
        ss -tlnp | grep ":5173" || echo "  Not listening"
    elif command -v netstat &> /dev/null; then
        echo "Port 3000 (Backend):"
        netstat -tlnp 2>/dev/null | grep ":3000" || echo "  Not listening"
        echo "Port 5173 (Frontend):"
        netstat -tlnp 2>/dev/null | grep ":5173" || echo "  Not listening"
    fi
    echo ""

    # Show last log lines
    if [ -f "kiko-creator.log" ]; then
        echo "Recent Logs (last 10 lines):"
        tail -n 10 kiko-creator.log
    fi
else
    echo "Status: ⚠️  Not running (stale PID file)"
    echo "Stale PID: $APP_PID"
    rm "$PID_FILE"
    echo "Cleaned up stale PID file"
fi
