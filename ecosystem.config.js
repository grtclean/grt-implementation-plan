/**
 * PM2 生态系统配置文件
 * 用于Windows原生部署和Linux服务器部署
 * 
 * 使用方法:
 * - 启动: pm2 start ecosystem.config.js
 * - 停止: pm2 stop ecosystem.config.js
 * - 重启: pm2 restart ecosystem.config.js
 * - 删除: pm2 delete ecosystem.config.js
 * - 监控: pm2 monit
 * - 日志: pm2 logs
 * - 保存状态: pm2 save
 * - 恢复状态: pm2 resurrect
 */

module.exports = {
  apps: [
    {
      // ==================== 主应用配置 ====================
      name: "grt-app",
      script: "dist/index.js", // 编译后的入口文件
      cwd: process.env.PROJECT_ROOT || ".",
      
      // 环境变量
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 3000,
        DATABASE_URL: process.env.DATABASE_URL || "mysql://root:password@localhost:3306/grt",
        JWT_SECRET: process.env.JWT_SECRET || "your-secret-key",
        VITE_APP_ID: process.env.VITE_APP_ID,
        OAUTH_SERVER_URL: process.env.OAUTH_SERVER_URL,
        VITE_OAUTH_PORTAL_URL: process.env.VITE_OAUTH_PORTAL_URL,
        BUILT_IN_FORGE_API_URL: process.env.BUILT_IN_FORGE_API_URL,
        BUILT_IN_FORGE_API_KEY: process.env.BUILT_IN_FORGE_API_KEY,
      },
      
      // 进程管理
      instances: process.env.NODE_ENV === "production" ? "max" : 1,
      exec_mode: "cluster",
      max_memory_restart: "1G",
      
      // 日志配置
      output: "./logs/pm2-out.log",
      error: "./logs/pm2-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      
      // 重启策略
      restart_delay: 4000, // 4秒后重启
      max_restarts: 10,
      min_uptime: "10s",
      
      // 监听文件变化（开发模式）
      watch: process.env.NODE_ENV === "development" ? ["src", "server"] : false,
      ignore_watch: ["node_modules", "dist", "logs", ".git"],
      watch_delay: 1000,
      
      // 优雅关闭
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // 自动启动
      autorestart: true,
      
      // 其他选项
      merge_logs: true,
      time: true,
    },
    
    // ==================== 数据库备份服务 ====================
    {
      name: "grt-backup",
      script: "scripts/backup-scheduler.js",
      cwd: process.env.PROJECT_ROOT || ".",
      
      env: {
        NODE_ENV: "production",
        BACKUP_INTERVAL: "0 2 * * *", // 每天凌晨2点
        BACKUP_DIR: process.env.BACKUP_DIR || "./backups",
        DATABASE_URL: process.env.DATABASE_URL,
      },
      
      instances: 1,
      exec_mode: "fork",
      
      output: "./logs/backup-out.log",
      error: "./logs/backup-error.log",
      
      autorestart: true,
      max_restarts: 5,
      min_uptime: "10s",
    },
    
    // ==================== 监控和告警服务 ====================
    {
      name: "grt-monitor",
      script: "scripts/monitoring-service.js",
      cwd: process.env.PROJECT_ROOT || ".",
      
      env: {
        NODE_ENV: "production",
        MONITOR_INTERVAL: 60000, // 每60秒检查一次
        ALERT_EMAIL: process.env.ALERT_EMAIL || "admin@company.com",
        CPU_THRESHOLD: 80,
        MEMORY_THRESHOLD: 85,
        DISK_THRESHOLD: 90,
      },
      
      instances: 1,
      exec_mode: "fork",
      
      output: "./logs/monitor-out.log",
      error: "./logs/monitor-error.log",
      
      autorestart: true,
      max_restarts: 5,
    },
  ],
  
  // ==================== 集群配置 ====================
  deploy: {
    production: {
      user: "deploy",
      host: "production-server.com",
      ref: "origin/main",
      repo: "https://github.com/your-org/grt-implementation-plan.git",
      path: "/var/www/grt-app",
      "post-deploy": "npm install && npm run build && pm2 reload ecosystem.config.js --env production",
    },
    
    staging: {
      user: "deploy",
      host: "staging-server.com",
      ref: "origin/develop",
      repo: "https://github.com/your-org/grt-implementation-plan.git",
      path: "/var/www/grt-app-staging",
      "post-deploy": "npm install && npm run build && pm2 reload ecosystem.config.js --env staging",
    },
  },
};
