#!/bin/bash
# Fix Vite configuration by setting base directory

cd /home/presales/aisa

echo "🔧 Fixing vite.config.ts..."
echo ""
echo "The problem is that Vite is trying to resolve packages from '../pkg' instead of the project directory."
echo "Adding 'base' option to fix the package resolution path."
echo ""

# Backup current config
cp vite.config.ts vite.config.ts.backup

# Add base configuration to fix the issue
cat > vite.config.ts << 'EOFCONFIG'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // 明确设置项目根目录，修复Vite无法解析包路径的问题
  base: './',

  // 明确配置服务器
  server: {
    host: '0.0.0.0',  // 监听所有接口，不限制localhost
    port: 5173,           // 明确指定端口
    strictPort: true,       // 防止自动尝试其他端口
    hmr: {
      protocol: 'ws',        // 使用WebSocket进行HMR
      host: '0.0.0.0',
      port: 24678,         // HMR WebSocket端口
      clientPort: 5173,     // 客户端连接端口
    },
  },

  // 清理预配置
  clearScreen: true,

  // 环境配置
  define: {
    'process.env.VITE_API_URL': JSON.stringify('http://localhost:3001'),
  },

  // 开发服务器优化
  optimizeDeps: {
    include: [
      'vite',
      'react',
      'react-dom',
      'react-dom/client',
      '@uiw/react-md-editor',
    ],
    exclude: [
      'node_modules/.vite',
      'node_modules/react',
    ],
  },
})
CONFIG
echo "✅ vite.config.ts updated"
echo ""
echo "🔄 Restarting frontend..."
echo ""

# 杀死所有vite进程
pkill -9 -f "vite" 2>/dev/null
sleep 2

# 清理可能的损坏依赖
rm -f node_modules/.vite/index

# 重新启动
npm run dev
EOF
chmod +x fix-vite.sh
