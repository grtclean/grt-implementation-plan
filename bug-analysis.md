# ProjectGate Bug分析

## 错误信息
```
TypeError: gateReviews?.filter is not a function
```

## 原因分析
1. `trpc.projectGate.getGateReviews.useQuery({})` 返回的数据结构是 `{ reviews: [] }`
2. 但代码中直接使用 `gateReviews?.filter()` 尝试对对象调用filter方法
3. 正确应该是 `gateReviews?.reviews?.filter()` 或者后端返回数组

## 相同问题的模块
需要检查所有使用类似模式的页面：
- 后端返回 `{ xxx: [] }` 对象
- 前端直接对返回值调用 `.filter()` 或其他数组方法

## 修复方案
1. 修改前端代码，正确访问嵌套属性
2. 或修改后端返回格式为数组
