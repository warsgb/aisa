# 环境配置说明

## 开发环境 vs 生产环境配置

### 后端配置

后端始终保持全局 `/api` 前缀，统一所有环境���

```typescript
// backend/src/main.ts
app.setGlobalPrefix('api');
```

所有API路径格式：`http://host:3001/api/...`

### 前端配置

#### 开发环境 (Vite Dev Server)

使用 Vite 代理转发请求到后端：

```typescript
// vite.config.ts
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    // 不需要 rewrite，后端有 /api 前缀
  },
  '/ws': {
    target: 'ws://localhost:3001',
    ws: true,
  },
}
```

环境变量配置（`.env.local`）：

```bash
# 开发环境使用相对路径，由 Vite 代理处理
VITE_API_URL=/api
VITE_WS_URL=/ws
```

#### 生产环境

前端打包后部署到 nginx 等静态服务器，需要配置反向代理。

**环境变量配置（构建前设置）**：

```bash
# 生产环境：指向实际后端地址（包含 /api）
VITE_API_URL=https://your-domain.com/api
VITE_WS_URL=wss://your-domain.com
```

**nginx 配置示例**：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api {
        proxy_pass http://localhost:3001/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket 代理
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 部署步骤

### 1. 构建前端（生产环境）

```bash
# 设置生产环境变量
export VITE_API_URL=https://your-domain.com/api
export VITE_WS_URL=wss://your-domain.com

# 或创建 .env.production
cat > .env.production << EOF
VITE_API_URL=https://your-domain.com/api
VITE_WS_URL=wss://your-domain.com
EOF

# 构建
npm run build
```

### 2. 部署到生产服务器

```bash
# 复制前端构建产物到服务器
scp -r dist/* user@server:/var/www/aisa/

# 启动后端（使用 PM2）
pm2 start backend/dist/main.js --name aisa-backend
```

### 3. 配置 nginx

参见上面的 nginx 配置示例。

### 4. 配置 SSL（可选）

使用 Let's Encrypt 获取免费证书：

```bash
sudo certbot --nginx -d your-domain.com
```

## 本地开发

```bash
# 1. 启动后端
cd backend
npm run build
npm run start:prod

# 2. 启动前端（Vite 自动代理）
npm run dev
```

访问 `http://localhost:5173`，Vite 会自动将 `/api` 和 `/ws` 请求代理到后端。

## 常见问题

### Q: 开发环境连接不上后端？

A: 检查以下几点：
1. 后端是否运行在 3001 端口
2. `.env.local` 中 `VITE_API_URL` 是否为 `/api`
3. `vite.config.ts` 中代理配置是否正确

### Q: 生产环境 API 请求 404？

A: 检查以下几点：
1. 构建时 `VITE_API_URL` 是否包含 `/api` 后缀
2. nginx 配置中 `/api` 位置是否正确代理
3. 后端服务是否正常运行

### Q: WebSocket 连接失败？

A: 检查以下几点：
1. `VITE_WS_URL` 配置正确（ws:// 或 wss://）
2. nginx 配置了 `/ws` 位置升级 WebSocket
3. 后端 WebSocket 服务运行在正确端口

## 环境变量快速切换

创建不同的环境文件：

```bash
# .env.local - 本地开发
VITE_API_URL=/api
VITE_WS_URL=/ws

# .env.production - 生产环境
VITE_API_URL=https://your-domain.com/api
VITE_WS_URL=wss://your-domain.com

# .env.staging - 测试环境
VITE_API_URL=https://staging.your-domain.com/api
VITE_WS_URL=wss://staging.your-domain.com
```

构建时使用：

```bash
# 默认使用 .env.production
npm run build

# 使用特定环境
vite build --mode staging
```
