#!/bin/bash

###############################################################################
# Qwerty Learner Package Builder
# This script creates portable packages for frontend and backend
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$PROJECT_ROOT/build"
PACKAGE_DIR="$PROJECT_ROOT/packages"
VERSION=$(date +%Y%m%d_%H%M%S)

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# Setup Node environment
setup_node() {
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    if command -v nvm &> /dev/null; then
        nvm use 22 2>/dev/null || nvm use default 2>/dev/null || true
    fi
    
    if [ -d "$NVM_DIR/versions/node/v22.21.1/bin" ]; then
        export PATH="$NVM_DIR/versions/node/v22.21.1/bin:$PATH"
    fi
}

# Build backend
build_backend() {
    log_info "Building backend..."
    cd "$PROJECT_ROOT/backend"
    
    # Clean previous builds
    ./gradlew clean
    
    # Build JAR
    ./gradlew bootJar
    
    if [ ! -f "build/libs"/*.jar ]; then
        log_error "Backend JAR build failed"
        exit 1
    fi
    
    log_success "Backend built successfully"
    cd "$PROJECT_ROOT"
}

# Build frontend
build_frontend() {
    log_info "Building frontend..."
    cd "$PROJECT_ROOT"
    
    setup_node
    
    # Install dependencies
    log_info "Installing frontend dependencies..."
    npm install
    
    # Build frontend
    log_info "Building frontend with Vite..."
    if npm run build; then
        # Vite outputs to 'build' directory (configured in vite.config.ts)
        if [ ! -d "build" ] || [ -z "$(ls -A build 2>/dev/null)" ]; then
            log_error "Frontend build succeeded but build directory is missing or empty"
            exit 1
        fi
        log_success "Frontend built successfully"
    else
        log_error "Frontend build command failed"
        exit 1
    fi
}

# Package backend
package_backend() {
    log_info "Packaging backend..."
    
    local backend_pkg_dir="$PACKAGE_DIR/qwerty-learner-backend-$VERSION"
    mkdir -p "$backend_pkg_dir/lib"
    mkdir -p "$backend_pkg_dir/config"
    mkdir -p "$backend_pkg_dir/data"
    mkdir -p "$backend_pkg_dir/logs"
    
    # Copy JAR file
    cp "$PROJECT_ROOT/backend/build/libs"/*.jar "$backend_pkg_dir/lib/qwerty-learner.jar"
    
    # Copy config files
    cp "$PROJECT_ROOT/backend/src/main/resources/application.yml" "$backend_pkg_dir/config/"
    cp "$PROJECT_ROOT/backend/src/main/resources/schema.sql" "$backend_pkg_dir/config/"
    
    # Create startup script
    cat > "$backend_pkg_dir/start.sh" << 'EOF'
#!/bin/bash

###############################################################################
# Qwerty Learner Backend Startup Script
###############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JAR_FILE="$SCRIPT_DIR/lib/qwerty-learner.jar"
CONFIG_DIR="$SCRIPT_DIR/config"
DATA_DIR="$SCRIPT_DIR/data"
LOG_DIR="$SCRIPT_DIR/logs"
PID_FILE="$SCRIPT_DIR/backend.pid"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo -e "${RED}Error: Java is not installed${NC}"
    echo "Please install JDK 17 or higher"
    exit 1
fi

# Check Java version
JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | awk -F. '{print $1}')
if [ "$JAVA_VERSION" -lt 17 ]; then
    echo -e "${RED}Error: Java version must be 17 or higher${NC}"
    echo "Current version: $JAVA_VERSION"
    exit 1
fi

# Create directories
mkdir -p "$DATA_DIR"
mkdir -p "$LOG_DIR"

# Check if already running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo -e "${RED}Backend is already running (PID: $PID)${NC}"
        exit 1
    fi
fi

# Start backend
echo "Starting Qwerty Learner Backend..."
echo "Config: $CONFIG_DIR/application.yml"
echo "Data:   $DATA_DIR"
echo "Logs:   $LOG_DIR/backend.log"
echo ""

nohup java -jar "$JAR_FILE" \
    --spring.config.location="$CONFIG_DIR/application.yml" \
    --spring.datasource.url="jdbc:sqlite:$DATA_DIR/app.db" \
    > "$LOG_DIR/backend.log" 2>&1 &

echo $! > "$PID_FILE"

echo -e "${GREEN}Backend started successfully!${NC}"
echo "PID: $(cat $PID_FILE)"
echo "URL: http://localhost:8080"
echo ""
echo "View logs: tail -f $LOG_DIR/backend.log"
echo "Stop: ./stop.sh"
EOF

    # Create stop script
    cat > "$backend_pkg_dir/stop.sh" << 'EOF'
#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/backend.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "Backend is not running"
    exit 0
fi

PID=$(cat "$PID_FILE")

if ps -p "$PID" > /dev/null 2>&1; then
    echo "Stopping backend (PID: $PID)..."
    kill "$PID"
    
    # Wait for graceful shutdown
    count=0
    while ps -p "$PID" > /dev/null 2>&1 && [ $count -lt 30 ]; do
        sleep 1
        ((count++))
    done
    
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "Force killing..."
        kill -9 "$PID"
    fi
    
    rm "$PID_FILE"
    echo "Backend stopped"
else
    echo "Backend is not running"
    rm "$PID_FILE"
fi
EOF

    # Create README
    cat > "$backend_pkg_dir/README.md" << 'EOF'
# Qwerty Learner Backend

## Requirements

- Java JDK 17 or higher

## Installation

1. Extract this package to your desired location
2. Ensure Java is installed: `java -version`

## Usage

### Start Backend

```bash
./start.sh
```

The backend will start on port 8080.

### Stop Backend

```bash
./stop.sh
```

### View Logs

```bash
tail -f logs/backend.log
```

## Configuration

Edit `config/application.yml` to customize settings.

## Directory Structure

```
qwerty-learner-backend/
├── lib/                 # JAR file
├── config/              # Configuration files
├── data/                # SQLite database
├── logs/                # Log files
├── start.sh            # Startup script
├── stop.sh             # Stop script
└── README.md           # This file
```

## Default Port

- Backend API: http://localhost:8080

To change the port, edit `config/application.yml`:

```yaml
server:
  port: 8080  # Change to your desired port
```
EOF

    chmod +x "$backend_pkg_dir/start.sh"
    chmod +x "$backend_pkg_dir/stop.sh"
    
    # Create tarball
    cd "$PACKAGE_DIR"
    tar -czf "qwerty-learner-backend-$VERSION.tar.gz" "qwerty-learner-backend-$VERSION"
    
    log_success "Backend package created: packages/qwerty-learner-backend-$VERSION.tar.gz"
}

# Package frontend
package_frontend() {
    log_info "Packaging frontend..."
    
    local frontend_pkg_dir="$PACKAGE_DIR/qwerty-learner-frontend-$VERSION"
    mkdir -p "$frontend_pkg_dir/dist"
    mkdir -p "$frontend_pkg_dir/logs"
    
    # Copy built files (Vite outputs to 'build' directory)
    cp -r "$PROJECT_ROOT/build"/* "$frontend_pkg_dir/dist/"
    
    # Copy package.json (for dependencies)
    cp "$PROJECT_ROOT/package.json" "$frontend_pkg_dir/"
    
    # Create startup script
    cat > "$frontend_pkg_dir/start.sh" << 'EOF'
#!/bin/bash

###############################################################################
# Qwerty Learner Frontend Startup Script
###############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"
LOG_DIR="$SCRIPT_DIR/logs"
PID_FILE="$SCRIPT_DIR/frontend.pid"
PORT=5173

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --port)
            PORT="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js 18 or higher"
    exit 1
fi

# Check if npx is available
if ! command -v npx &> /dev/null; then
    echo -e "${RED}Error: npx is not available${NC}"
    echo "Please install npm"
    exit 1
fi

# Create directories
mkdir -p "$LOG_DIR"

# Check if already running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo -e "${RED}Frontend is already running (PID: $PID)${NC}"
        exit 1
    fi
fi

# Check if dist exists
if [ ! -d "$DIST_DIR" ]; then
    echo -e "${RED}Error: dist directory not found${NC}"
    echo "Please ensure the build files are present"
    exit 1
fi

# Start frontend
echo "Starting Qwerty Learner Frontend..."
echo "Port:  $PORT"
echo "Logs:  $LOG_DIR/frontend.log"
echo ""

cd "$SCRIPT_DIR"

# Use vite preview to serve the built files
nohup npx vite preview --port $PORT --host --outDir ./dist > "$LOG_DIR/frontend.log" 2>&1 &

echo $! > "$PID_FILE"

# Wait a moment for startup
sleep 2

if ps -p $(cat "$PID_FILE") > /dev/null 2>&1; then
    echo -e "${GREEN}Frontend started successfully!${NC}"
    echo "PID: $(cat $PID_FILE)"
    echo "URL: http://localhost:$PORT"
    echo ""
    echo "View logs: tail -f $LOG_DIR/frontend.log"
    echo "Stop: ./stop.sh"
else
    echo -e "${RED}Failed to start frontend${NC}"
    echo "Check logs: $LOG_DIR/frontend.log"
    rm "$PID_FILE"
    exit 1
fi
EOF

    # Create stop script
    cat > "$frontend_pkg_dir/stop.sh" << 'EOF'
#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/frontend.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "Frontend is not running"
    exit 0
fi

PID=$(cat "$PID_FILE")

if ps -p "$PID" > /dev/null 2>&1; then
    echo "Stopping frontend (PID: $PID)..."
    kill "$PID"
    
    # Wait for graceful shutdown
    count=0
    while ps -p "$PID" > /dev/null 2>&1 && [ $count -lt 30 ]; do
        sleep 1
        ((count++))
    done
    
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "Force killing..."
        kill -9 "$PID"
    fi
    
    rm "$PID_FILE"
    echo "Frontend stopped"
else
    echo "Frontend is not running"
    rm "$PID_FILE"
fi
EOF

    # Create README
    cat > "$frontend_pkg_dir/README.md" << 'EOF'
# Qwerty Learner Frontend

## Requirements

- Node.js 18 or higher
- npm (comes with Node.js)

## Installation

1. Extract this package to your desired location
2. Ensure Node.js is installed: `node --version`

## Usage

### Start Frontend

```bash
# Default port 5173
./start.sh

# Custom port
./start.sh --port 3000
```

### Stop Frontend

```bash
./stop.sh
```

### View Logs

```bash
tail -f logs/frontend.log
```

## Configuration

### Change Port

Use the `--port` option when starting:

```bash
./start.sh --port 3000
```

### Backend API URL

If your backend is not on localhost:8080, you need to configure the API URL.

The frontend expects the backend at `/api` path. You should use a reverse proxy (like Nginx) to route `/api` requests to your backend server.

Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
    }

    # Backend API
    location /api {
        proxy_pass http://your-backend-server:8080;
    }
}
```

## Directory Structure

```
qwerty-learner-frontend/
├── dist/               # Built frontend files
├── logs/               # Log files
├── start.sh           # Startup script
├── stop.sh            # Stop script
├── package.json       # Dependencies info
└── README.md          # This file
```

## Default Port

- Frontend: http://localhost:5173

## Notes

- The frontend is a static build served by Vite's preview server
- For production, consider using Nginx or Apache to serve the static files
- The preview server is suitable for testing the production build
EOF

    chmod +x "$frontend_pkg_dir/start.sh"
    chmod +x "$frontend_pkg_dir/stop.sh"
    
    # Create tarball
    cd "$PACKAGE_DIR"
    tar -czf "qwerty-learner-frontend-$VERSION.tar.gz" "qwerty-learner-frontend-$VERSION"
    
    log_success "Frontend package created: packages/qwerty-learner-frontend-$VERSION.tar.gz"
}

# Package full application
package_full() {
    log_info "Creating full application package..."
    
    local full_pkg_dir="$PACKAGE_DIR/qwerty-learner-full-$VERSION"
    mkdir -p "$full_pkg_dir"
    
    # Extract backend and frontend packages
    cd "$PACKAGE_DIR"
    tar -xzf "qwerty-learner-backend-$VERSION.tar.gz" -C "$full_pkg_dir"
    tar -xzf "qwerty-learner-frontend-$VERSION.tar.gz" -C "$full_pkg_dir"
    
    # Rename directories
    mv "$full_pkg_dir/qwerty-learner-backend-$VERSION" "$full_pkg_dir/backend"
    mv "$full_pkg_dir/qwerty-learner-frontend-$VERSION" "$full_pkg_dir/frontend"
    
    # Create unified startup script
    cat > "$full_pkg_dir/start-all.sh" << 'EOF'
#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting Qwerty Learner..."
echo ""

# Start backend
echo "==> Starting backend..."
cd "$SCRIPT_DIR/backend"
./start.sh
echo ""

# Wait for backend to start
sleep 5

# Start frontend
echo "==> Starting frontend..."
cd "$SCRIPT_DIR/frontend"
./start.sh
echo ""

echo "✓ All services started!"
echo ""
echo "Access the application at: http://localhost:5173"
echo ""
echo "To stop all services, run: ./stop-all.sh"
EOF

    # Create unified stop script
    cat > "$full_pkg_dir/stop-all.sh" << 'EOF'
#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Stopping Qwerty Learner..."
echo ""

# Stop frontend
echo "==> Stopping frontend..."
cd "$SCRIPT_DIR/frontend"
./stop.sh
echo ""

# Stop backend
echo "==> Stopping backend..."
cd "$SCRIPT_DIR/backend"
./stop.sh
echo ""

echo "✓ All services stopped!"
EOF

    # Create main README
    cat > "$full_pkg_dir/README.md" << 'EOF'
# Qwerty Learner - Full Package

This package contains both frontend and backend components.

## Requirements

- Java JDK 17 or higher
- Node.js 18 or higher
- npm (comes with Node.js)

## Quick Start

### 1. Install Requirements

Verify Java:
```bash
java -version
```

Verify Node.js:
```bash
node --version
npm --version
```

### 2. Start All Services

```bash
./start-all.sh
```

This will start:
- Backend on port 8080
- Frontend on port 5173

### 3. Access Application

Open your browser and go to: http://localhost:5173

### 4. Stop All Services

```bash
./stop-all.sh
```

## Individual Components

### Backend Only

```bash
cd backend
./start.sh
```

See `backend/README.md` for more details.

### Frontend Only

```bash
cd frontend
./start.sh
```

See `frontend/README.md` for more details.

## Directory Structure

```
qwerty-learner-full/
├── backend/           # Backend application
│   ├── lib/          # JAR file
│   ├── config/       # Configuration
│   ├── data/         # Database
│   ├── logs/         # Backend logs
│   ├── start.sh
│   ├── stop.sh
│   └── README.md
├── frontend/         # Frontend application
│   ├── dist/        # Built files
│   ├── logs/        # Frontend logs
│   ├── start.sh
│   ├── stop.sh
│   └── README.md
├── start-all.sh     # Start everything
├── stop-all.sh      # Stop everything
└── README.md        # This file
```

## Configuration

### Backend Port

Edit `backend/config/application.yml`:

```yaml
server:
  port: 8080
```

### Frontend Port

```bash
cd frontend
./start.sh --port 3000
```

### Database Location

The SQLite database is stored in `backend/data/app.db`.

## Logs

- Backend logs: `backend/logs/backend.log`
- Frontend logs: `frontend/logs/frontend.log`

## Troubleshooting

### Port Already in Use

Check if services are already running:

```bash
lsof -ti:8080  # Backend
lsof -ti:5173  # Frontend
```

Kill existing processes:

```bash
lsof -ti:8080 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### Cannot Connect to Backend

1. Check if backend is running: `cd backend && cat backend.pid`
2. Check backend logs: `tail -f backend/logs/backend.log`
3. Verify port: `lsof -ti:8080`

### Java Version Error

Ensure you have JDK 17 or higher:

```bash
java -version
```

### Node.js Version Error

Ensure you have Node.js 18 or higher:

```bash
node --version
```

## Production Deployment

For production use, consider:

1. **Reverse Proxy**: Use Nginx or Apache
2. **HTTPS**: Configure SSL certificates
3. **Process Manager**: Use systemd or PM2
4. **Monitoring**: Set up log monitoring
5. **Backup**: Regular database backups

Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5173;
    }

    location /api {
        proxy_pass http://localhost:8080;
    }
}
```

## Support

For issues and questions, please refer to the project documentation or create an issue on GitHub.
EOF

    chmod +x "$full_pkg_dir/start-all.sh"
    chmod +x "$full_pkg_dir/stop-all.sh"
    
    # Create tarball
    cd "$PACKAGE_DIR"
    tar -czf "qwerty-learner-full-$VERSION.tar.gz" "qwerty-learner-full-$VERSION"
    
    log_success "Full package created: packages/qwerty-learner-full-$VERSION.tar.gz"
}

# Clean up
cleanup() {
    log_info "Cleaning up temporary files..."
    
    # Remove unpacked directories, keep only tarballs
    cd "$PACKAGE_DIR"
    rm -rf qwerty-learner-backend-$VERSION
    rm -rf qwerty-learner-frontend-$VERSION
    rm -rf qwerty-learner-full-$VERSION
    
    log_success "Cleanup complete"
}

# Main build process
main() {
    log_info "Starting package build process..."
    echo ""
    
    # Clean and create directories
    rm -rf "$BUILD_DIR"
    rm -rf "$PACKAGE_DIR"
    mkdir -p "$BUILD_DIR"
    mkdir -p "$PACKAGE_DIR"
    
    # Build components
    build_backend
    echo ""
    
    build_frontend
    echo ""
    
    # Package components
    package_backend
    echo ""
    
    package_frontend
    echo ""
    
    package_full
    echo ""
    
    # Cleanup
    cleanup
    echo ""
    
    # Summary
    log_success "Build complete!"
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Packages Created${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
    echo ""
    echo "Location: $PACKAGE_DIR"
    echo ""
    ls -lh "$PACKAGE_DIR"/*.tar.gz | awk '{print "  " $9, "(" $5 ")"}'
    echo ""
    echo -e "${YELLOW}Installation:${NC}"
    echo "  1. Copy the package to target server"
    echo "  2. Extract: tar -xzf qwerty-learner-full-$VERSION.tar.gz"
    echo "  3. Run: cd qwerty-learner-full-$VERSION && ./start-all.sh"
    echo ""
}

# Run main
main
