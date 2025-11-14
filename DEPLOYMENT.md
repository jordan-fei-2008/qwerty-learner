# Qwerty Learner 生产部署指南

本项目提供了三种部署方式，您可以根据需求选择：

## 方式一：简单脚本部署（推荐快速测试）

**特点**：最简单，适合快速部署和测试

### 使用方法

```bash
# 启动服务（自动构建）
./deploy-simple.sh start

# 停止服务
./deploy-simple.sh stop

# 重启服务
./deploy-simple.sh restart

# 查看状态
./deploy-simple.sh status

# 查看日志
tail -f logs/backend.log
tail -f logs/frontend.log
```

### 访问地址

- 前端：http://localhost:5173
- 后端：http://localhost:8080

---

## 方式二：完整脚本部署（推荐生产环境）

**特点**：功能完整，日志管理好，适合生产环境

### 使用方法

```bash
# 启动服务
./deploy.sh start

# 停止服务
./deploy.sh stop

# 重启服务
./deploy.sh restart

# 查看状态
./deploy.sh status

# 查看后端日志
./deploy.sh logs backend

# 查看前端日志
./deploy.sh logs frontend

# 查看帮助
./deploy.sh help
```

### 功能

- ✅ 自动检测端口占用
- ✅ 优雅关闭进程
- ✅ 完整的日志管理
- ✅ 进程健康检查
- ✅ 彩色输出

---

## 方式三：PM2 部署（推荐专业生产）

**特点**：使用 PM2 进程管理器，最适合生产环境

### 安装 PM2

```bash
npm install -g pm2
```

### 使用配置文件部署

```bash
# 构建应用
cd backend && ./gradlew build -x test && cd ..
npm install && npm run build

# 使用 PM2 配置文件启动
pm2 start ecosystem.config.json

# 或使用简化脚本
./deploy-pm2.sh start

# 查看状态
pm2 list

# 查看日志
pm2 logs

# 查看特定服务日志
pm2 logs qwerty-backend
pm2 logs qwerty-frontend

# 停止服务
pm2 stop all
# 或
./deploy-pm2.sh stop

# 重启服务
pm2 restart all
# 或
./deploy-pm2.sh restart

# 监控服务
pm2 monit

# 设置开机自启
pm2 startup
pm2 save

# 删除服务
pm2 delete all
# 或
./deploy-pm2.sh delete
```

### PM2 优势

- ✅ 自动重启（崩溃恢复）
- ✅ 日志管理和轮转
- ✅ 监控和性能指标
- ✅ 集群模式支持
- ✅ 开机自启
- ✅ 零停机重载

---

## 环境要求

### 必需

- **Java**: JDK 17 或更高版本
- **Node.js**: v18 或更高版本
- **Gradle**: 通过项目内置的 gradlew

### 可选

- **PM2**: 用于方式三部署（`npm install -g pm2`）

---

## 目录结构

```
qwerty-learner/
├── backend/              # 后端 Spring Boot 项目
│   └── gradlew          # Gradle 包装器
├── src/                 # 前端源代码
├── dist/                # 前端构建产物
├── logs/                # 日志文件目录
│   ├── backend.log      # 后端日志
│   ├── frontend.log     # 前端日志
│   ├── backend-out.log  # PM2 后端输出
│   └── frontend-out.log # PM2 前端输出
├── pids/                # 进程 PID 文件
│   ├── backend.pid
│   └── frontend.pid
├── deploy.sh            # 完整部署脚本
├── deploy-pm2.sh        # PM2 部署脚本
├── deploy-simple.sh     # 简单部署脚本
└── ecosystem.config.json # PM2 配置文件
```

---

## 端口配置

默认端口：

- **后端**：8080
- **前端**：5173

### 修改端口

1. **后端端口**：编辑 `backend/src/main/resources/application.yml`

   ```yaml
   server:
     port: 8080 # 修改为你想要的端口
   ```

2. **前端端口**：编辑部署脚本中的 `--port 5173`

---

## 常见问题

### 1. 端口被占用

```bash
# 查看占用端口的进程
lsof -ti:8080
lsof -ti:5173

# 杀死进程
lsof -ti:8080 | xargs kill -9
lsof -ti:5173 | xargs kill -9

# 或使用部署脚本自动处理
./deploy.sh start  # 会自动清理端口
```

### 2. 后端启动失败

```bash
# 查看后端日志
tail -f logs/backend.log
# 或
./deploy.sh logs backend

# 常见原因：
# - Java 版本不兼容（需要 JDK 17+）
# - 端口被占用
# - 数据库连接失败
```

### 3. 前端构建失败

```bash
# 清理并重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 重新构建
npm run build
```

### 4. PM2 服务无法启动

```bash
# 查看 PM2 日志
pm2 logs

# 删除并重新启动
pm2 delete all
pm2 start ecosystem.config.json

# 重置 PM2
pm2 kill
pm2 resurrect
```

---

## 生产环境部署（重要！）

### ⚠️ 必须配置反向代理

**问题：** 前端（5173）和后端（8080）运行在不同端口，前端无法直接访问后端 API 会导致 404 错误。

**解决：** 使用 Nginx 作为统一入口，将 `/api` 请求路由到后端。

### 方法 1：自动安装脚本（推荐）

```bash
# 1. 复制脚本到服务器
scp setup-nginx.sh root@your-server:/tmp/

# 2. 在服务器上运行
ssh root@your-server
cd /tmp
sudo ./setup-nginx.sh
```

脚本会自动安装 Nginx、创建配置、测试并重载。

### 方法 2：手动配置 Nginx

#### 安装 Nginx

**Ubuntu/Debian:**

```bash
sudo apt-get update && sudo apt-get install -y nginx
```

**CentOS/RHEL:**

```bash
sudo yum install -y nginx
```

#### 创建配置文件

创建 `/etc/nginx/conf.d/qwerty-learner.conf`：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 或 IP 地址

    client_max_body_size 10M;

    # 前端
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 后端 API
    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

#### 重载 Nginx

```bash
# 测试配置
sudo nginx -t

# 重载
sudo systemctl reload nginx
sudo systemctl enable nginx
```

#### 开放防火墙端口

**Ubuntu (ufw):**

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

**CentOS (firewalld):**

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

**云服务器：** 在安全组规则中开放 80 端口

### 验证配置

```bash
# 访问前端（现在通过 80 端口，不再使用 5173）
curl http://your-server/

# 测试 API（关键：确保 /api 路由工作）
curl http://your-server/api/health
```

**重要：** 配置 Nginx 后，用户应该访问 `http://your-server`（80 端口），而不是 `http://your-server:5173`。

---

## 配置 HTTPS（可选但推荐）

```bash
# 安装 Certbot
sudo apt-get install certbot python3-certbot-nginx  # Ubuntu/Debian
sudo yum install certbot python3-certbot-nginx      # CentOS/RHEL

# 自动配置 HTTPS
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 使用 systemd 管理服务（推荐）

比启动脚本更可靠，支持自动重启、开机自启。

### 后端 Service

创建 `/etc/systemd/system/qwerty-backend.service`：

```ini
[Unit]
Description=Qwerty Learner Backend
After=network.target

[Service]
Type=simple
User=qwerty
WorkingDirectory=/opt/qwerty-learner/backend
ExecStart=/usr/bin/java -jar /opt/qwerty-learner/backend/lib/qwerty-learner.jar \
  --spring.config.location=/opt/qwerty-learner/backend/config/application.yml \
  --spring.datasource.url=jdbc:sqlite:/opt/qwerty-learner/backend/data/app.db
StandardOutput=append:/opt/qwerty-learner/backend/logs/backend.log
StandardError=append:/opt/qwerty-learner/backend/logs/backend.log
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 前端 Service

创建 `/etc/systemd/system/qwerty-frontend.service`：

```ini
[Unit]
Description=Qwerty Learner Frontend
After=network.target

[Service]
Type=simple
User=qwerty
WorkingDirectory=/opt/qwerty-learner/frontend
ExecStart=/usr/bin/npx vite preview --port 5173 --host --outDir ./dist
StandardOutput=append:/opt/qwerty-learner/frontend/logs/frontend.log
StandardError=append:/opt/qwerty-learner/frontend/logs/frontend.log
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 启用服务

```bash
# 重载 systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start qwerty-backend qwerty-frontend

# 开机自启
sudo systemctl enable qwerty-backend qwerty-frontend

# 查看状态
sudo systemctl status qwerty-backend
sudo systemctl status qwerty-frontend
```

---

## 监控和日志

```bash
# 使用 PM2 监控
pm2 monit

# 配置日志轮转
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 4. 数据备份

```bash
# 备份数据库
cp backend/data/app.db backend/data/app.db.backup.$(date +%Y%m%d_%H%M%S)

# 定时备份（添加到 crontab）
0 2 * * * /path/to/backup-script.sh
```

---

## 更新部署

```bash
# 拉取最新代码
git pull origin main

# 重新部署
./deploy.sh restart
# 或
pm2 restart all
```

---

## 支持

如有问题，请查看：

- 日志文件：`logs/` 目录
- GitHub Issues
- 项目文档
