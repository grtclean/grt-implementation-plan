# Bug Report v3.1.7

## 发现的Bug

### Bug 1: 死锁监控仪表板显示NaN
- **位置**: 死锁监控页面 - "检测到的死锁"卡片
- **现象**: 点击"手动检测"后，"检测到的死锁"显示为NaN
- **原因**: triggerCheck返回的cyclesDetected可能是undefined或非数字类型
- **状态**: 待修复

## 修复计划
1. 检查DeadlockMonitor.tsx中handleManualCheck函数
2. 确保正确处理triggerCheck返回值
3. 添加Number()类型转换和默认值处理
