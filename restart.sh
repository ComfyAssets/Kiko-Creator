#!/bin/bash

# Kiko Creator Restart Script
echo "🔄 Restarting Kiko Creator..."

# Stop if running
if [ -f ".kiko-creator.pid" ]; then
    ./stop.sh
    sleep 2
fi

# Start
./start.sh
