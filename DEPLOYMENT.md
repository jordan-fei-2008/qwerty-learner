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
     port: 8080  # 修改为你想要的端口
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

## 生产环境建议

### 1. 使用反向代理（Nginx）

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 后端 API
    location /api {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 2. 配置 HTTPS

```bash
# 使用 Let's Encrypt 自动配置
sudo certbot --nginx -d your-domain.com
```

### 3. 监控和日志

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

