# 首页重构计划：根据设计图实现高保真 UI

## 背景
根据 proto/index.png 设计图，需要重构当前首页以匹配新设计。当前实现功能完整，但视觉设计上需要更贴近设计图的现代简洁风格。

## 设计分析

### 视觉元素识别
- **主色调**: #1677FF (蓝色)
- **背景色**: #F5F7FA (浅灰)
- **卡片背景**: #FFFFFF (白色)
- **侧边栏**: #1E293B (深蓝灰)
- **文字**: #333333 (深色), #666666 (中灰), #999999 (浅灰)
- **圆角**: 12px (rounded-xl), 8px (rounded-lg)
- **阴影**: 轻阴影 (shadow-sm)
- **图标**: Lucide React

### 布局结构
- 顶部：客户选择器 + 技能筛选
- 中间：LTC横向流程节点（8个节点）
- 底部：历史交互时间线
- 响应式断点: md:, lg:

## 实现方案

### 1. 修改 HomePage.tsx

**文件**: `/Users/leo/home/aisa/src/pages/home/HomePage.tsx`

重新设计页面布局：
- 移除顶部大标题区域，改为更紧凑的设计
- 客户选择器改为下拉触发式
- 优化各区域的间距和内边距
- 统一卡片样式

### 2. 可选组件优化

如需更好视觉匹配，可调整以下组件：
- `LtcProcessTimeline.tsx` - 优化节点卡片样式
- `InteractionTimeline.tsx` - 优化时间线样式
- `SkillCard.tsx` - 优化技能卡片样式

### 3. 保持不变
- 所有业务逻辑
- API 调用
- 状态管理
- 技能执行弹窗

## 关键修改点

```tsx
// 新布局结构示例
<div className="min-h-screen bg-[#F5F7FA]">
  {/* 顶部导航区域 */}
  <div className="bg-white border-b border-gray-100 px-6 py-4">
    <div className="flex items-center justify-between">
      {/* 客户选择器 */}
      <CustomerSearchSelect ... />

      {/* 技能筛选 */}
      <SkillFilterToggle ... />
    </div>
  </div>

  {/* LTC 流程区 */}
  <div className="p-6">
    <LtcProcessTimeline ... />
  </div>

  {/* 历史记录区 */}
  <div className="p-6 pt-0">
    <InteractionTimeline ... />
  </div>
</div>
```

## 验证方式

1. 启动开发服务器: `npm run dev`
2. 访问首页，验证：
   - 页面布局是否符合设计图
   - 客户选择功能正常
   - LTC 节点横向滚动正常
   - 技能筛选功能正常
   - 历史记录显示正常
   - 技能执行弹窗正常
3. 测试响应式布局（移动端/平板/桌面）

## 依赖
- Lucide React 图标库（已安装）
- Tailwind CSS（已配置）
- Zustand（已使用）
