// ============================================
// GRT智能系统 - PM2配置文件
// 版本: 1.0.0
// 作者: Manus AI
// ============================================

module.exports = {
  apps: [
    {
      // 应用名称
      name: 'grt-system',
      
      // 入口文件（构建后）
      script: 'dist/index.js',
      
      // 实例数量（单机建议1-2个）
      instances: 1,
      
      // 执行模式：fork或cluster
      exec_mode: 'fork',
      
      // 自动重启
      autorestart: true,
      
      // 监视文件变化（生产环境关闭）
      watch: false,
      
      // 内存超限自动重启（1GB）
      max_memory_restart: '1G',
      
      // 环境变量
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      
      // 从.env文件加载环境变量
      env_file: '.env',
      
      // 日志配置
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      
      // 重启延迟（毫秒）
      restart_delay: 1000,
      
      // 最大重启次数（超过后停止）
      max_restarts: 10,
      
      // 最小运行时间（毫秒），低于此时间重启视为异常
      min_uptime: 5000,
      
      // 优雅关闭超时（毫秒）
      kill_timeout: 5000,
      
      // 等待应用就绪的超时时间（毫秒）
      wait_ready: true,
      listen_timeout: 10000,
      
      // 进程标题
      node_args: '--title=grt-system',
      
      // 忽略监视的文件
      ignore_watch: [
        'node_modules',
        'logs',
        'backups',
        '.git',
        '*.log'
      ],
      
      // 崩溃时的行为
      exp_backoff_restart_delay: 100
    }
  ],
  
  // 部署配置（可选，用于远程部署）
  deploy: {
    production: {
      // 远程服务器用户
      user: 'deploy',
      // 远程服务器地址
      host: ['localhost'],
      // Git仓库地址
      repo: 'git@github.com:your-org/grt-implementation-plan.git',
      // 分支
      ref: 'origin/main',
      // 部署路径
      path: 'C:/Projects/grt-implementation-plan',
      // 部署后执行的命令
      'post-deploy': 'pnpm install && pnpm build && pm2 reload ecosystem.config.cjs --env production',
      // 环境变量
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};
