# AISA Backend Dockerfile
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 安装 openssl (用于生成密钥等)
RUN apk add --no-cache openssl

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建 TypeScript
RUN npm run build

# 创建必要的目录
RUN mkdir -p uploads logs

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动应用
CMD ["node", "dist/main.js"]
