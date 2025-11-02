#!/bin/bash

###############################################################################
# Simple Production Deployment Script
# Usage: ./deploy-simple.sh [start|stop|restart|status]
###############################################################################

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load NVM and set up Node environment
setup_node() {
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # Use Node 22 if available
    if command -v nvm &> /dev/null; then
        nvm use 22 2>/dev/null || nvm use default 2>/dev/null || true
    fi
    
    # Get the actual node path from nvm
    if [ -d "$NVM_DIR/versions/node/v22.21.1/bin" ]; then
        export PATH="$NVM_DIR/versions/node/v22.21.1/bin:$PATH"
    fi
    
    # Set npm and node commands
    NODE_CMD="$NVM_DIR/versions/node/v22.21.1/bin/node"
    NPM_CMD="$NVM_DIR/versions/node/v22.21.1/bin/npm"
    
    # Fallback to system node if nvm path doesn't exist
    if [ ! -f "$NODE_CMD" ]; then
        NODE_CMD="node"
        NPM_CMD="npm"
    fi
}

# Build and start
start() {
    # Setup Node environment
    setup_node
    
    echo "==> Using Node: $NODE_CMD"
    $NODE_CMD --version
    echo "==> Using npm: $NPM_CMD"
    $NPM_CMD --version
    echo ""
    
    echo "==> Building backend..."
    cd "$PROJECT_ROOT/backend"
    ./gradlew build -x test
    
    echo "==> Building frontend..."
    cd "$PROJECT_ROOT"
    $NPM_CMD install
    $NPM_CMD run build
    
    echo "==> Starting backend..."
    cd "$PROJECT_ROOT/backend"
    nohup ./gradlew bootRun > ../logs/backend.log 2>&1 &
    echo $! > ../pids/backend.pid
    
    echo "==> Starting frontend..."
    cd "$PROJECT_ROOT"
    nohup $NPM_CMD exec vite preview -- --port 5173 --host > logs/frontend.log 2>&1 &
    echo $! > pids/frontend.pid
    
    echo ""
    echo "✓ Services started!"
    echo "  Frontend: http://localhost:5173"
    echo "  Backend:  http://localhost:8080"
    echo ""
    echo "View logs:"
    echo "  tail -f logs/frontend.log"
    echo "  tail -f logs/backend.log"
}

# Stop services
stop() {
    echo "==> Stopping services..."
    
    if [ -f pids/backend.pid ]; then
        kill $(cat pids/backend.pid) 2>/dev/null || true
        rm pids/backend.pid
    fi
    
    if [ -f pids/frontend.pid ]; then
        kill $(cat pids/frontend.pid) 2>/dev/null || true
        rm pids/frontend.pid
    fi
    
    # Kill any remaining processes on ports
    lsof -ti:8080 | xargs kill -9 2>/dev/null || true
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    
    echo "✓ Services stopped"
}

# Restart services
restart() {
    stop
    sleep 2
    start
}

# Show status
status() {
    echo ""
    echo "Service Status:"
    echo "==============="
    
    if [ -f pids/backend.pid ] && ps -p $(cat pids/backend.pid) > /dev/null 2>&1; then
        echo "Backend:  ✓ Running (PID: $(cat pids/backend.pid))"
    else
        echo "Backend:  ✗ Stopped"
    fi
    
    if [ -f pids/frontend.pid ] && ps -p $(cat pids/frontend.pid) > /dev/null 2>&1; then
        echo "Frontend: ✓ Running (PID: $(cat pids/frontend.pid))"
    else
        echo "Frontend: ✗ Stopped"
    fi
    echo ""
}

# Create directories
mkdir -p "$PROJECT_ROOT/pids"
mkdir -p "$PROJECT_ROOT/logs"

# Main
case "${1:-start}" in
    start)   start ;;
    stop)    stop ;;
    restart) restart ;;
    status)  status ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac
