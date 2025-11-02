#!/bin/bash

###############################################################################
# Qwerty Learner Production Deployment Script (PM2 Version)
# This script uses PM2 for better process management
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT"

# Load NVM if available
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use Node 22 if available
if command -v nvm &> /dev/null; then
    nvm use 22 2>/dev/null || nvm use default 2>/dev/null || true
fi

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if PM2 is installed
check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        log_error "PM2 is not installed. Installing globally..."
        npm install -g pm2
    fi
}

# Build backend
build_backend() {
    log_info "Building backend..."
    cd "$BACKEND_DIR"
    ./gradlew build -x test
    log_success "Backend built successfully"
    cd "$PROJECT_ROOT"
}

# Build frontend
build_frontend() {
    log_info "Building frontend..."
    cd "$FRONTEND_DIR"
    
    if [ ! -d "node_modules" ]; then
        log_info "Installing dependencies..."
        npm install
    fi
    
    npm run build
    log_success "Frontend built successfully"
    cd "$PROJECT_ROOT"
}

# Start services with PM2
start_all() {
    check_pm2
    
    log_info "Building applications..."
    build_backend
    build_frontend
    
    log_info "Starting services with PM2..."
    
    # Start backend
    cd "$BACKEND_DIR"
    pm2 start ./gradlew --name qwerty-backend --interpreter bash -- bootRun
    cd "$PROJECT_ROOT"
    
    # Start frontend
    pm2 start npm --name qwerty-frontend -- run preview -- --port 5173 --host
    
    # Save PM2 configuration
    pm2 save
    
    log_success "All services started!"
    pm2 list
}

# Stop services
stop_all() {
    check_pm2
    log_info "Stopping services..."
    pm2 stop qwerty-backend qwerty-frontend
    log_success "Services stopped"
}

# Restart services
restart_all() {
    check_pm2
    log_info "Restarting services..."
    pm2 restart qwerty-backend qwerty-frontend
    log_success "Services restarted"
}

# Show status
show_status() {
    check_pm2
    pm2 list
}

# Show logs
show_logs() {
    check_pm2
    if [ -z "$1" ]; then
        pm2 logs
    else
        pm2 logs "qwerty-$1"
    fi
}

# Delete services
delete_all() {
    check_pm2
    log_info "Deleting services from PM2..."
    pm2 delete qwerty-backend qwerty-frontend 2>/dev/null || true
    pm2 save
    log_success "Services deleted"
}

case "${1:-}" in
    start)
        start_all
        ;;
    stop)
        stop_all
        ;;
    restart)
        restart_all
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "${2:-}"
        ;;
    delete)
        delete_all
        ;;
    *)
        cat << EOF
Usage: $0 {start|stop|restart|status|logs|delete}

Commands:
    start       Build and start services
    stop        Stop services
    restart     Restart services
    status      Show service status
    logs        Show logs (usage: $0 logs [backend|frontend])
    delete      Remove services from PM2

Examples:
    $0 start                    # Start all services
    $0 logs backend             # View backend logs
    $0 status                   # Check status

EOF
        exit 1
        ;;
esac
