#!/bin/bash

###############################################################################
# Qwerty Learner Production Deployment Script
# This script builds and starts both frontend and backend services
###############################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT"
PID_DIR="$PROJECT_ROOT/pids"
LOG_DIR="$PROJECT_ROOT/logs"

BACKEND_PORT=8080
FRONTEND_PORT=5173

# Load NVM if available
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use Node 22 if available
if command -v nvm &> /dev/null; then
    nvm use 22 2>/dev/null || nvm use default 2>/dev/null || true
fi

# Create necessary directories
mkdir -p "$PID_DIR"
mkdir -p "$LOG_DIR"

###############################################################################
# Helper Functions
###############################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if a process is running
is_running() {
    local pid_file=$1
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

# Stop a process
stop_process() {
    local name=$1
    local pid_file=$2
    
    if is_running "$pid_file"; then
        local pid=$(cat "$pid_file")
        log_info "Stopping $name (PID: $pid)..."
        kill "$pid" 2>/dev/null || true
        
        # Wait for graceful shutdown
        local count=0
        while ps -p "$pid" > /dev/null 2>&1 && [ $count -lt 30 ]; do
            sleep 1
            ((count++))
        done
        
        # Force kill if still running
        if ps -p "$pid" > /dev/null 2>&1; then
            log_warning "Force killing $name..."
            kill -9 "$pid" 2>/dev/null || true
        fi
        
        rm -f "$pid_file"
        log_success "$name stopped"
    else
        log_info "$name is not running"
    fi
}

# Check if port is in use
check_port() {
    local port=$1
    if lsof -ti:$port > /dev/null 2>&1; then
        return 0
    fi
    return 1
}

# Kill process using a port
kill_port() {
    local port=$1
    log_warning "Killing process on port $port..."
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    sleep 2
}

###############################################################################
# Backend Functions
###############################################################################

build_backend() {
    log_info "Building backend..."
    cd "$BACKEND_DIR"
    
    if [ ! -f "./gradlew" ]; then
        log_error "Gradle wrapper not found in $BACKEND_DIR"
        exit 1
    fi
    
    ./gradlew build -x test
    
    if [ $? -eq 0 ]; then
        log_success "Backend build completed"
    else
        log_error "Backend build failed"
        exit 1
    fi
    
    cd "$PROJECT_ROOT"
}

start_backend() {
    local pid_file="$PID_DIR/backend.pid"
    
    if is_running "$pid_file"; then
        log_warning "Backend is already running"
        return
    fi
    
    # Check if port is in use
    if check_port $BACKEND_PORT; then
        log_warning "Port $BACKEND_PORT is in use"
        kill_port $BACKEND_PORT
    fi
    
    log_info "Starting backend on port $BACKEND_PORT..."
    cd "$BACKEND_DIR"
    
    # Start backend in background
    nohup ./gradlew bootRun > "$LOG_DIR/backend.log" 2>&1 &
    local pid=$!
    echo $pid > "$pid_file"
    
    # Wait for backend to start
    log_info "Waiting for backend to start..."
    local count=0
    while [ $count -lt 60 ]; do
        if curl -s "http://localhost:$BACKEND_PORT/api/health" > /dev/null 2>&1; then
            log_success "Backend started successfully (PID: $pid)"
            cd "$PROJECT_ROOT"
            return 0
        fi
        sleep 2
        ((count++))
    done
    
    log_error "Backend failed to start within 60 seconds"
    log_info "Check logs at: $LOG_DIR/backend.log"
    cd "$PROJECT_ROOT"
    exit 1
}

stop_backend() {
    stop_process "Backend" "$PID_DIR/backend.pid"
}

###############################################################################
# Frontend Functions
###############################################################################

build_frontend() {
    log_info "Building frontend..."
    cd "$FRONTEND_DIR"
    
    # Check if node is available
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log_info "Installing frontend dependencies..."
        npm install
    fi
    
    # Build frontend for production
    log_info "Building frontend for production..."
    npm run build
    
    if [ $? -eq 0 ]; then
        log_success "Frontend build completed"
    else
        log_error "Frontend build failed"
        exit 1
    fi
    
    cd "$PROJECT_ROOT"
}

start_frontend() {
    local pid_file="$PID_DIR/frontend.pid"
    
    if is_running "$pid_file"; then
        log_warning "Frontend is already running"
        return
    fi
    
    # Check if port is in use
    if check_port $FRONTEND_PORT; then
        log_warning "Port $FRONTEND_PORT is in use"
        kill_port $FRONTEND_PORT
    fi
    
    log_info "Starting frontend on port $FRONTEND_PORT..."
    cd "$FRONTEND_DIR"
    
    # Start frontend preview server in background
    nohup npx vite preview --port $FRONTEND_PORT --host > "$LOG_DIR/frontend.log" 2>&1 &
    local pid=$!
    echo $pid > "$pid_file"
    
    # Wait for frontend to start
    log_info "Waiting for frontend to start..."
    sleep 5
    
    if is_running "$pid_file"; then
        log_success "Frontend started successfully (PID: $pid)"
        log_info "Frontend URL: http://localhost:$FRONTEND_PORT"
    else
        log_error "Frontend failed to start"
        log_info "Check logs at: $LOG_DIR/frontend.log"
        exit 1
    fi
    
    cd "$PROJECT_ROOT"
}

stop_frontend() {
    stop_process "Frontend" "$PID_DIR/frontend.pid"
}

###############################################################################
# Main Functions
###############################################################################

start_all() {
    log_info "Starting Qwerty Learner services..."
    echo ""
    
    # Start backend first
    build_backend
    start_backend
    echo ""
    
    # Then start frontend
    build_frontend
    start_frontend
    echo ""
    
    log_success "All services started successfully!"
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Qwerty Learner is running!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  ${BLUE}Frontend:${NC}  http://localhost:$FRONTEND_PORT"
    echo -e "  ${BLUE}Backend:${NC}   http://localhost:$BACKEND_PORT"
    echo ""
    echo -e "  ${YELLOW}Logs:${NC}"
    echo -e "    Frontend: $LOG_DIR/frontend.log"
    echo -e "    Backend:  $LOG_DIR/backend.log"
    echo ""
    echo -e "  ${YELLOW}To stop:${NC} $0 stop"
    echo ""
}

stop_all() {
    log_info "Stopping all services..."
    echo ""
    
    stop_frontend
    stop_backend
    echo ""
    
    log_success "All services stopped"
}

restart_all() {
    log_info "Restarting all services..."
    stop_all
    sleep 2
    start_all
}

status_all() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Service Status${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo ""
    
    # Backend status
    if is_running "$PID_DIR/backend.pid"; then
        local pid=$(cat "$PID_DIR/backend.pid")
        echo -e "  Backend:  ${GREEN}Running${NC} (PID: $pid, Port: $BACKEND_PORT)"
    else
        echo -e "  Backend:  ${RED}Stopped${NC}"
    fi
    
    # Frontend status
    if is_running "$PID_DIR/frontend.pid"; then
        local pid=$(cat "$PID_DIR/frontend.pid")
        echo -e "  Frontend: ${GREEN}Running${NC} (PID: $pid, Port: $FRONTEND_PORT)"
    else
        echo -e "  Frontend: ${RED}Stopped${NC}"
    fi
    
    echo ""
}

show_logs() {
    local service=$1
    
    if [ "$service" = "backend" ]; then
        tail -f "$LOG_DIR/backend.log"
    elif [ "$service" = "frontend" ]; then
        tail -f "$LOG_DIR/frontend.log"
    else
        log_error "Invalid service: $service"
        echo "Usage: $0 logs [backend|frontend]"
        exit 1
    fi
}

show_usage() {
    cat << EOF
Usage: $0 {start|stop|restart|status|logs|help}

Commands:
    start       Build and start all services
    stop        Stop all services
    restart     Restart all services
    status      Show service status
    logs        Show logs (usage: $0 logs [backend|frontend])
    help        Show this help message

Configuration:
    Backend Port:  $BACKEND_PORT
    Frontend Port: $FRONTEND_PORT
    PID Directory: $PID_DIR
    Log Directory: $LOG_DIR

Examples:
    $0 start                    # Start all services
    $0 stop                     # Stop all services
    $0 status                   # Check service status
    $0 logs backend             # View backend logs
    $0 logs frontend            # View frontend logs

EOF
}

###############################################################################
# Main Script
###############################################################################

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
        status_all
        ;;
    logs)
        show_logs "${2:-}"
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        log_error "Invalid command: ${1:-}"
        echo ""
        show_usage
        exit 1
        ;;
esac
