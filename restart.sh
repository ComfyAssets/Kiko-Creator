#!/bin/bash

# Kiko Creator Restart Script
# Usage: ./restart.sh [dev|prod]

MODE="${1:-dev}"

if [ "$MODE" != "dev" ] && [ "$MODE" != "prod" ]; then
    echo "❌ Invalid mode: $MODE"
    echo "Usage: ./restart.sh [dev|prod]"
    exit 1
fi

echo "🔄 Restarting Kiko Creator in $MODE mode..."

# Stop if running
if [ -f ".kiko-creator.pid" ]; then
    ./stop.sh
    sleep 2
fi

# Start with specified mode
./start.sh "$MODE"
