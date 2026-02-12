#!/bin/bash

# Launch Zoning Comparison App
cd "$(dirname "$0")"

echo "Starting Zoning Comparison App..."
echo "================================"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Open browser after a short delay (give servers time to start)
(sleep 3 && open http://localhost:5173) &

# Start the dev servers
npm run dev
