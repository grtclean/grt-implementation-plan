/**
 * Vite HMR Configuration Fix
 * 用于解决WebSocket连接失败导致的无限刷新问题
 * 
 * 这个文件包含了完整的HMR配置选项
 * 可以根据需要选择合适的配置方案
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// ============================================================================
// 方案1: 标准HMR配置（推荐用于Windows本地开发）
// ============================================================================
export const hmrConfig1 = {
  server: {
    middlewareMode: true,
    hmr: {
      host: 'localhost',
      port: 3000,
      protocol: 'ws',
    },
  },
}

// ============================================================================
// 方案2: 禁用HMR（如果方案1不工作）
// ============================================================================
export const hmrConfig2 = {
  server: {
    middlewareMode: true,
    hmr: false, // 完全禁用HMR
  },
}

// ============================================================================
// 方案3: 使用HTTP轮询代替WebSocket
// ============================================================================
export const hmrConfig3 = {
  server: {
    middlewareMode: true,
    hmr: {
      host: 'localhost',
      port: 3000,
      protocol: 'http',
    },
  },
}

// ============================================================================
// 方案4: 自动检测主机名（用于网络访问）
// ============================================================================
export const hmrConfig4 = {
  server: {
    middlewareMode: true,
    hmr: {
      protocol: 'ws',
      // 自动检测主机名，支持远程访问
    },
  },
}

// ============================================================================
// 完整的Vite配置示例（使用方案1）
// ============================================================================
export default defineConfig({
  plugins: [react()],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  
  publicDir: path.resolve(__dirname, 'client', 'public'),
  
  server: {
    middlewareMode: true,
    // HMR配置 - 解决WebSocket连接失败
    hmr: {
      host: 'localhost',
      port: 3000,
      protocol: 'ws',
    },
  },
  
  build: {
    outDir: 'dist/public',
    emptyOutDir: true,
    sourcemap: false,
  },
})

// ============================================================================
// 环境变量配置说明
// ============================================================================
/*
在 .env.local 中添加以下配置：

# Vite HMR Configuration
VITE_HMR_HOST=localhost
VITE_HMR_PORT=3000
VITE_HMR_PROTOCOL=ws

# 或者禁用HMR
VITE_HMR_DISABLED=true

# Node环境
NODE_ENV=development
*/

// ============================================================================
// 故障排除指南
// ============================================================================
/*

问题1: WebSocket connection failed: Invalid frame header
解决方案:
  1. 清除 node_modules/.vite 缓存
  2. 清除浏览器缓存
  3. 使用方案1的HMR配置
  4. 重启开发服务器

问题2: HMR连接超时
解决方案:
  1. 检查防火墙设置
  2. 确保端口3000未被占用
  3. 尝试方案3（HTTP轮询）
  4. 检查localhost解析是否正确

问题3: 无限刷新/闪烁
解决方案:
  1. 禁用HMR（方案2）
  2. 清除浏览器Cookie
  3. 使用无痕模式测试
  4. 检查OAuth配置

问题4: 白屏
解决方案:
  1. 打开浏览器开发者工具（F12）
  2. 查看Console标签页的错误信息
  3. 查看Network标签页的请求状态
  4. 检查是否有JavaScript错误

*/
