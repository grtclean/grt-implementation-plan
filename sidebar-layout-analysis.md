# 侧边栏布局问题分析

## 当前结构

```
NavContent (div.flex.flex-col.h-full)
├── Logo区域 (flex-shrink-0)
├── 当前位置指示器 (无flex-shrink-0)
├── 展开/收起按钮 (flex-shrink-0)
├── nav (flex-1 min-h-0 overflow-y-auto) ← 可滚动区域
│   ├── 收藏菜单
│   ├── 最近访问
│   ├── 菜单组列表
│   ├── FeedbackDialog
│   └── 返回顶部按钮
└── 底部主题切换按钮 (flex-shrink-0, p-4)
```

## 问题分析

1. **底部区域占用固定高度** - `div.p-4` 包含主题切换按钮，占用了约60px高度
2. **当前位置指示器没有flex-shrink-0** - 可能导致布局计算问题
3. **nav元素的flex-1 + min-h-0应该可以工作** - 但可能被父容器的h-full限制

## 解决方案

1. 移除底部主题切换按钮区域，或将其放入nav内部
2. 确保所有固定区域都有flex-shrink-0
3. 检查父容器aside的高度是否正确设置为h-screen
