# AISA 构建问题排查指南

## ERR_CONTENT_LENGTH_MISMATCH 错误

### 错误现象

页面一直显示加载中，浏览器控制台提示：
- `Failed to load resource: net::ERR_CONTENT_LENGTH_MISMATCH`
- `detectPageLang: 6028.166015625 ms`

### 原因分析

`ERR_CONTENT_LENGTH_MISMATCH` 错误通常由以下原因导致：
1. **构建文件不完整**：`npm run build` 过程中断或文件损坏
2. **文件传输损坏**：通过 git clone 或 wget 下载时网络中断
3. **缓存问题**：CDN 或浏览器缓存了部分旧文件
4. **静态文件服务配置问题**：Vite 开发服务器或生产构建的静态文件服务异常

---

## 解决方案

### 方案1：检查构建文件

```bash
cd /opt/aisa

# 检查前端文件大小
ls -la dist/assets/*.js

# 检查是否有损坏的文件（大小为0或异常小）
find dist -name "*.js" -size -10k
```

**正常情况**：
- `dist/assets/index-*.js` 文件大小应大于 10KB
- 应该有多个 chunk 文件（通常 5 个以上）

### 方案2：清理并重新构建

```bash
cd /opt/aisa

# 清理旧构建
rm -rf dist node_modules

# 重新安装依赖
npm install

# 重新构建
npm run build

# 重启服务
pm2 restart aisa-backend
```

### 方案3：清除浏览器缓存

1. 按 `Ctrl+Shift+R` (Windows/Linux) 或 `Cmd+Shift+R` (macOS) 强制刷新
2. 或使用无痕模式访问

### 方案4：检查磁盘空间

```bash
df -h
```

确保磁盘空间充足（至少 1GB 可用空间）

### 方案5：验证构建完整性

```bash
cd /opt/aisa

# 检查前端构建
ls -la dist/index.html
ls -la dist/assets/index-*.js

# 检查后端构建
ls -la backend/dist/main.js

# 检查文件完整性
file dist/index.html
file dist/assets/index-*.js
```

---

## 预防措施

安装脚本现在会自动验证构建完整性：

1. **前端文件检查**：
   - 检查 `dist/assets/index-*.js` 文件是否存在
   - 验证文件大小是否合理（>10KB）
   - 检查 chunk 文件数量

2. **后端文件检查**：
   - 检查 `backend/dist/main.js` 文件是否存在
   - 验证文件大小是否合理（>5KB）

3. **验证失败时**：
   - 自动提示重新构建命令
   - 中断安装流程

---

## 常见问题

### Q1: 构建完成后仍然提示错误

**A**: 清除浏览器缓存并重启服务：
```bash
pm2 restart aisa-backend
pm2 reload aisa-backend
```

### Q2: npm install 过程中断

**A**: 清理缓存后重试：
```bash
npm cache clean --force
rm -rf node_modules
npm install
```

### Q3: Vite 构建卡住

**A**: 检查系统资源：
```bash
# 检查内存使用
free -h

# 检查 CPU 使用
top -bn1 | head -20
```

### Q4: 权限问题

**A**: 确保文件权限正确：
```bash
chmod -R 755 /opt/aisa/dist
chmod -R 755 /opt/aisa/backend/dist
```

---

## 联系支持

如果以上方案都无法解决问题，请提供以下信息：

1. 系统信息：`uname -a`
2. Node.js 版本：`node -v`
3. npm 版本：`npm -v`
4. 磁盘空间：`df -h`
5. 构建日志：`npm run build` 的完整输出
6. 浏览器控制台错误截图

GitHub Issues: https://github.com/warsgb/aisa/issues
