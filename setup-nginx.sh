#!/bin/bash

###############################################################################
# Nginx Setup Script for Qwerty Learner Production
# This script helps configure Nginx as a reverse proxy
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    log_error "Please run as root (use sudo)"
    exit 1
fi

# Check if Nginx is installed
if ! command -v nginx &> /dev/null; then
    log_warning "Nginx is not installed. Installing..."
    
    # Detect OS
    if [ -f /etc/redhat-release ]; then
        # CentOS/RHEL
        yum install -y nginx
    elif [ -f /etc/debian_version ]; then
        # Ubuntu/Debian
        apt-get update
        apt-get install -y nginx
    else
        log_error "Unsupported OS. Please install Nginx manually."
        exit 1
    fi
    
    log_success "Nginx installed"
fi

# Get server IP/domain
read -p "Enter your server IP or domain (default: $(hostname -I | awk '{print $1}')): " SERVER_NAME
SERVER_NAME=${SERVER_NAME:-$(hostname -I | awk '{print $1}')}

# Create Nginx config
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="/etc/nginx/conf.d/qwerty-learner.conf"

log_info "Creating Nginx configuration..."

cat > "$CONFIG_FILE" << EOF
# Qwerty Learner - Nginx Reverse Proxy Configuration
# Auto-generated on $(date)

server {
    listen 80;
    server_name $SERVER_NAME;
    
    # Increase max body size for file uploads
    client_max_body_size 10M;
    
    # Frontend - proxy to Vite preview server
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Backend API - proxy to Spring Boot
    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

log_success "Configuration created at $CONFIG_FILE"

# Test Nginx configuration
log_info "Testing Nginx configuration..."
if nginx -t; then
    log_success "Nginx configuration is valid"
else
    log_error "Nginx configuration test failed"
    exit 1
fi

# Check if backend and frontend are running
log_info "Checking if services are running..."

BACKEND_RUNNING=false
FRONTEND_RUNNING=false

if lsof -iTCP:8080 -sTCP:LISTEN &> /dev/null || ss -ltn | grep ':8080' &> /dev/null; then
    log_success "Backend is running on port 8080"
    BACKEND_RUNNING=true
else
    log_warning "Backend is NOT running on port 8080"
fi

if lsof -iTCP:5173 -sTCP:LISTEN &> /dev/null || ss -ltn | grep ':5173' &> /dev/null; then
    log_success "Frontend is running on port 5173"
    FRONTEND_RUNNING=true
else
    log_warning "Frontend is NOT running on port 5173"
fi

if [ "$BACKEND_RUNNING" = false ] || [ "$FRONTEND_RUNNING" = false ]; then
    log_warning "Please start your services before reloading Nginx"
    echo ""
    echo "To start backend:"
    echo "  cd /path/to/qwerty-learner-backend-* && ./start.sh"
    echo ""
    echo "To start frontend:"
    echo "  cd /path/to/qwerty-learner-frontend-* && ./start.sh"
    echo ""
fi

# Reload Nginx
read -p "Reload Nginx now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Reloading Nginx..."
    systemctl reload nginx || service nginx reload
    
    # Enable Nginx on boot
    systemctl enable nginx || chkconfig nginx on
    
    log_success "Nginx reloaded successfully"
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Setup Complete!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
    echo ""
    echo "Access your application at:"
    echo "  http://$SERVER_NAME"
    echo ""
    echo "API endpoint:"
    echo "  http://$SERVER_NAME/api"
    echo ""
    echo "Useful commands:"
    echo "  - Check Nginx status: systemctl status nginx"
    echo "  - View Nginx logs: tail -f /var/log/nginx/error.log"
    echo "  - Test config: nginx -t"
    echo "  - Reload config: systemctl reload nginx"
    echo ""
fi
