# GRT System - Admin Dashboard Setup Guide

## Quick Start for System Administrators

This guide helps administrators quickly set up and manage the GRT system on Windows 11 local servers.

---

## 1. Initial Setup (First Time Only)

### 1.1 Prerequisites

- Windows 11 Pro or Enterprise
- Node.js 18+ and pnpm
- MySQL 8.0+
- Git
- Visual Studio Code (optional but recommended)

### 1.2 Clone and Setup

```bash
# Clone repository
git clone <repository-url> D:\Projects\grt-implementation-plan
cd D:\Projects\grt-implementation-plan

# Install dependencies
pnpm install

# Create .env file
copy .env.example .env

# Edit .env with your settings
# DATABASE_URL=mysql://root:password@localhost:3306/grt_system
# OPENAI_API_KEY=sk-your-key
# etc.

# Create database
mysql -u root -p
CREATE DATABASE grt_system;
EXIT;

# Run migrations
pnpm db:push

# Start development server
pnpm dev
```

### 1.3 Verify Installation

```bash
# Check if server is running
curl http://localhost:3000

# Check if database is connected
mysql -u root -p grt_system
SHOW TABLES;
EXIT;

# Run tests
pnpm test
```

---

## 2. Daily Admin Tasks

### 2.1 Morning Checklist

```bash
# 1. Start development server
pnpm dev

# 2. Check system health
curl http://localhost:3000/health

# 3. Verify database
mysql -u root -p grt_system
SELECT COUNT(*) FROM users;
EXIT;

# 4. Check error logs
tail -f logs/error.log
```

### 2.2 Backup Database

```bash
# Create daily backup
mysqldump -u root -p grt_system > D:\Backups\grt_$(date +%Y%m%d).sql

# Or use automated backup script
.\backup.ps1
```

### 2.3 Monitor Performance

```bash
# Check application memory usage
Get-Process node | Select-Object Name, CPU, Memory

# Check database connections
mysql -u root -p
SHOW PROCESSLIST;
EXIT;

# Check disk space
Get-Volume
```

### 2.4 Evening Checklist

```bash
# 1. Commit any changes
git add .
git commit -m "chore: end of day commit"

# 2. Push to remote
git push origin develop

# 3. Verify no errors
pnpm test

# 4. Create backup
.\backup.ps1

# 5. Stop development server (if needed)
# Press Ctrl + C in terminal
```

---

## 3. Feature Development Workflow

### 3.1 Add New Feature

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Update schema if needed
# Edit drizzle/schema.ts

# 3. Generate migration
pnpm db:push

# 4. Implement backend
# Edit server/routers.ts

# 5. Implement frontend
# Edit client/src/pages/

# 6. Test changes
pnpm test

# 7. Commit and push
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# 8. Create pull request
# (via GitHub/GitLab)
```

### 3.2 Fix Bug

```bash
# 1. Create bugfix branch
git checkout -b bugfix/bug-description

# 2. Locate and fix bug
# Edit relevant files

# 3. Test fix
pnpm test

# 4. Commit and push
git add .
git commit -m "fix: bug description"
git push origin bugfix/bug-description

# 5. Create pull request
```

### 3.3 Deploy to Staging

```bash
# 1. Merge to staging branch
git checkout staging
git merge feature/new-feature

# 2. Run full test suite
pnpm test

# 3. Build application
pnpm build

# 4. Deploy using script
.\deploy.ps1 -Environment staging

# 5. Test in staging environment
# http://staging.grt-system.local

# 6. Verify all features work
```

### 3.4 Deploy to Production

```bash
# 1. Merge to main branch
git checkout main
git merge staging

# 2. Tag release
git tag v1.0.0
git push origin v1.0.0

# 3. Create backup
.\backup.ps1

# 4. Deploy using script
.\deploy.ps1 -Environment production

# 5. Monitor production
# Check error logs
# Monitor performance
# Verify user experience
```

---

## 4. Database Management

### 4.1 View Database Status

```bash
# Connect to MySQL
mysql -u root -p grt_system

# View all tables
SHOW TABLES;

# View table structure
DESCRIBE users;

# View data
SELECT * FROM users LIMIT 10;

# View database size
SELECT 
    table_schema,
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size in MB'
FROM information_schema.tables
WHERE table_schema = 'grt_system'
GROUP BY table_schema;

# Exit
EXIT;
```

### 4.2 Backup and Restore

```bash
# Create backup
mysqldump -u root -p grt_system > backup.sql

# Restore from backup
mysql -u root -p grt_system < backup.sql

# Verify restoration
mysql -u root -p grt_system
SELECT COUNT(*) FROM users;
EXIT;
```

### 4.3 Manage Users and Permissions

```bash
# Connect to MySQL
mysql -u root -p

# Create new user
CREATE USER 'grt_user'@'localhost' IDENTIFIED BY 'password';

# Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON grt_system.* TO 'grt_user'@'localhost';

# View user permissions
SHOW GRANTS FOR 'grt_user'@'localhost';

# Revoke permissions
REVOKE ALL PRIVILEGES ON grt_system.* FROM 'grt_user'@'localhost';

# Delete user
DROP USER 'grt_user'@'localhost';

# Flush privileges
FLUSH PRIVILEGES;

# Exit
EXIT;
```

---

## 5. Troubleshooting

### 5.1 Application Won't Start

```bash
# Check if port is in use
netstat -ano | findstr :3000

# Kill process using port
taskkill /PID <process_id> /F

# Clear cache
Remove-Item -Path "dist" -Recurse -Force
Remove-Item -Path "node_modules\.vite" -Recurse -Force

# Reinstall and start
pnpm install
pnpm dev
```

### 5.2 Database Connection Error

```bash
# Verify MySQL is running
mysql -u root -p

# Check DATABASE_URL in .env
type .env | findstr DATABASE_URL

# Test connection
mysql -u root -p -h localhost -D grt_system

# Check MySQL logs
# C:\ProgramData\MySQL\MySQL Server 8.0\Data\<hostname>.err
```

### 5.3 Migration Failed

```bash
# View migration status
mysql -u root -p grt_system
SELECT * FROM __drizzle_migrations__;
EXIT;

# Rollback migration
# Delete latest migration file in drizzle/migrations/

# Clear migration records
mysql -u root -p grt_system
TRUNCATE TABLE __drizzle_migrations__;
EXIT;

# Retry migration
pnpm db:push
```

### 5.4 Build Errors

```bash
# Check TypeScript errors
pnpm type-check

# View build output
pnpm build

# Clear build cache
Remove-Item -Path "dist" -Recurse -Force

# Rebuild
pnpm build
```

---

## 6. Admin Commands Reference

### Quick Commands

```bash
# Start server
pnpm dev

# Build
pnpm build

# Test
pnpm test

# Database
pnpm db:push

# Format code
pnpm format

# Check types
pnpm type-check

# View logs
tail -f logs/error.log

# Git status
git status

# Git log
git log --oneline -10
```

### PowerShell Commands

```powershell
# Create backup
.\backup.ps1

# Deploy
.\deploy.ps1 -Environment staging

# Fix migration
.\FIX_MIGRATION_SYNC.ps1

# Check environment
.\QUICK_ENVIRONMENT_CHECK.ps1
```

---

## 7. Emergency Procedures

### 7.1 System Down

```bash
# 1. Check if application is running
Get-Process node

# 2. Check if MySQL is running
Get-Service MySQL80

# 3. Check error logs
type logs\error.log

# 4. Restart application
# Kill existing process
Get-Process node | Stop-Process -Force

# Start new process
pnpm dev

# 5. Verify system is back
curl http://localhost:3000
```

### 7.2 Data Corruption

```bash
# 1. Stop application
Get-Process node | Stop-Process -Force

# 2. Restore from backup
mysql -u root -p grt_system < backup_20260206.sql

# 3. Verify data integrity
mysql -u root -p grt_system
SELECT COUNT(*) FROM users;
EXIT;

# 4. Restart application
pnpm dev

# 5. Monitor for issues
tail -f logs/error.log
```

### 7.3 Security Breach

```bash
# 1. Stop application immediately
Get-Process node | Stop-Process -Force

# 2. Change database passwords
mysql -u root -p
ALTER USER 'grt_admin'@'localhost' IDENTIFIED BY 'new_strong_password';
FLUSH PRIVILEGES;
EXIT;

# 3. Update .env with new password
# Edit .env file

# 4. Review access logs
type logs\access.log

# 5. Restart application
pnpm dev

# 6. Monitor closely
tail -f logs/error.log
```

---

## 8. Maintenance Schedule

### Daily
- [ ] Check system health
- [ ] Monitor error logs
- [ ] Create backup
- [ ] Verify database integrity

### Weekly
- [ ] Review performance metrics
- [ ] Update dependencies: `pnpm update`
- [ ] Run security audit: `pnpm audit`
- [ ] Clean up old backups

### Monthly
- [ ] Full system review
- [ ] Update documentation
- [ ] Performance optimization
- [ ] Security review

### Quarterly
- [ ] Major version updates
- [ ] Database optimization
- [ ] Capacity planning
- [ ] Disaster recovery drill

---

## 9. Documentation Links

- [Admin Workflow Guide](./ADMIN_MANAGEMENT_WORKFLOW.md)
- [Environment Setup](./ENVIRONMENT_ANALYSIS_REPORT.md)
- [Database Guide](./DB_PUSH_TROUBLESHOOTING.md)
- [Python Setup](./FIX_PIP_NOT_FOUND.md)
- [PowerShell Setup](./POWERSHELL_EXECUTION_POLICY_FIX.md)

---

## 10. Contact Information

- **Admin Email:** admin@grt-system.local
- **Support:** support@grt-system.local
- **Documentation:** wiki.grt-system.local
- **Issue Tracker:** issues.grt-system.local

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-06 | Initial admin dashboard setup guide |

---

**Last Updated:** 2026-02-06  
**Next Review:** 2026-03-06
