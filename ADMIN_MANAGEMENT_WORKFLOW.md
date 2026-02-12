# GRT System - Admin Management Workflow Guide

## Overview

This guide provides a comprehensive workflow for system administrators to manage the GRT Intelligent System development, testing, and deployment on Windows 11 local servers. It covers development environments, version control, testing procedures, and deployment strategies.

---

## Part 1: Development Environment Setup

### 1.1 Local Development Environment

**Directory Structure:**

```
D:\Projects\20260206\grt-implementation-plan\
├── client/                 # Frontend (React 19 + Vite)
├── server/                 # Backend (Express + tRPC)
├── drizzle/               # Database schema and migrations
├── shared/                # Shared types and constants
├── storage/               # S3 storage helpers
├── .env                   # Environment variables (local)
├── .env.test              # Test environment variables
├── .env.staging           # Staging environment variables
├── .env.production        # Production environment variables
├── package.json           # Dependencies
├── pnpm-lock.yaml         # Lock file
└── README.md              # Documentation
```

### 1.2 Environment Variables Management

**Create multiple .env files for different environments:**

```bash
# Development (local)
.env

# Testing
.env.test

# Staging
.env.staging

# Production
.env.production
```

**Each .env file should contain:**

```env
# Database
DATABASE_URL=mysql://root:password@localhost:3306/grt_system

# Node Environment
NODE_ENV=development

# OAuth
VITE_APP_ID=your_app_id
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im

# API Keys
OPENAI_API_KEY=sk-your-key
GEMINI_API_KEY=your-key

# Storage
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret

# Logging
LOG_LEVEL=debug
```

### 1.3 Development Workflow

**Daily Development Cycle:**

```bash
# 1. Start development server
pnpm dev

# 2. Open browser
# http://localhost:3000

# 3. Make changes to code
# - Edit client/src/pages/
# - Edit server/routers.ts
# - Edit drizzle/schema.ts

# 4. Test changes in browser
# Hot reload should apply changes automatically

# 5. Run tests
pnpm test

# 6. Check for errors
pnpm build

# 7. Commit changes
git add .
git commit -m "feat: description of changes"
```

---

## Part 2: Version Control Strategy

### 2.1 Git Workflow

**Branch Strategy:**

```
main (production)
├── staging (pre-production testing)
├── develop (integration branch)
└── feature/* (feature branches)
    ├── feature/user-authentication
    ├── feature/ai-assistant
    └── feature/meeting-management
```

**Branch Naming Convention:**

```
feature/feature-name          # New features
bugfix/bug-description        # Bug fixes
hotfix/urgent-fix             # Production hotfixes
refactor/refactoring-name     # Code refactoring
docs/documentation-name       # Documentation updates
```

### 2.2 Commit Message Convention

```
feat: add new feature
fix: fix bug description
docs: update documentation
style: code style changes
refactor: refactor code
test: add tests
chore: maintenance tasks

Example:
feat: add AI assistant for meeting management
fix: resolve database connection timeout
docs: update admin workflow guide
```

### 2.3 Pull Request Process

1. **Create feature branch from develop:**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Make changes and commit:**
   ```bash
   git add .
   git commit -m "feat: description"
   ```

3. **Push to remote:**
   ```bash
   git push origin feature/new-feature
   ```

4. **Create Pull Request:**
   - Go to GitHub/GitLab
   - Create PR from feature branch to develop
   - Add description and testing notes
   - Request review from team members

5. **Code Review:**
   - Team members review code
   - Address feedback
   - Approve when ready

6. **Merge:**
   ```bash
   git merge feature/new-feature
   ```

---

## Part 3: Database Management

### 3.1 Schema Changes Workflow

**When modifying database schema:**

```bash
# 1. Edit schema.ts
nano drizzle/schema.ts

# 2. Generate migration
pnpm db:push

# 3. Verify migration
mysql -u root -p grt_system
SHOW TABLES;
DESCRIBE table_name;
EXIT;

# 4. Test application
pnpm dev

# 5. Commit changes
git add drizzle/
git commit -m "feat: add new table for feature"
```

### 3.2 Database Backup Strategy

**Daily Backup:**

```bash
# Create backup
mysqldump -u root -p grt_system > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
mysql -u root -p grt_system < backup_20260206_120000.sql
```

**Automated Backup Script (backup.ps1):**

```powershell
# Run daily at 2 AM
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "D:\Backups\grt_system_$timestamp.sql"

mysqldump -u root -p grt_system | Out-File -Encoding UTF8 $backupFile

# Keep only last 7 days of backups
$backupPath = "D:\Backups"
Get-ChildItem $backupPath -Filter "grt_system_*.sql" | 
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } | 
    Remove-Item
```

### 3.3 Data Migration

**When migrating data between environments:**

```bash
# Export from development
mysqldump -u root -p grt_system > dev_export.sql

# Import to testing
mysql -u root -p grt_system_test < dev_export.sql

# Verify data
mysql -u root -p grt_system_test
SELECT COUNT(*) FROM table_name;
EXIT;
```

---

## Part 4: Testing Strategy

### 4.1 Unit Testing

**Run unit tests:**

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test server/auth.logout.test.ts

# Run with coverage
pnpm test -- --coverage
```

**Test file structure:**

```typescript
// server/features.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../db';

describe('Feature Tests', () => {
  beforeEach(async () => {
    // Setup test database
  });

  afterEach(async () => {
    // Cleanup test database
  });

  it('should create new feature', async () => {
    // Test implementation
    expect(result).toBe(expected);
  });
});
```

### 4.2 Integration Testing

**Test API endpoints:**

```bash
# Using curl
curl -X GET http://localhost:3000/api/trpc/feature.getAll

# Using Postman
# 1. Import API collection
# 2. Set environment variables
# 3. Run test suite
```

### 4.3 End-to-End Testing

**Manual testing checklist:**

- [ ] User can login
- [ ] User can create new record
- [ ] User can edit record
- [ ] User can delete record
- [ ] User can search records
- [ ] AI features work correctly
- [ ] Database operations complete successfully
- [ ] Error messages display correctly
- [ ] Performance is acceptable

---

## Part 5: Deployment Pipeline

### 5.1 Development to Staging

**Promote from development to staging:**

```bash
# 1. Ensure all tests pass
pnpm test

# 2. Build application
pnpm build

# 3. Create release branch
git checkout -b release/v1.0.0

# 4. Update version
# Edit package.json: "version": "1.0.0"

# 5. Commit and tag
git add .
git commit -m "chore: release v1.0.0"
git tag v1.0.0

# 6. Push to remote
git push origin release/v1.0.0
git push origin v1.0.0

# 7. Deploy to staging
# (See deployment script below)
```

### 5.2 Staging to Production

**Promote from staging to production:**

```bash
# 1. Verify staging environment
# - Test all features in staging
# - Check performance metrics
# - Verify database integrity

# 2. Create hotfix/production branch if needed
git checkout -b hotfix/critical-fix

# 3. Merge to main
git checkout main
git merge release/v1.0.0

# 4. Deploy to production
# (See deployment script below)

# 5. Monitor production
# - Check error logs
# - Monitor performance
# - Verify user experience
```

### 5.3 Deployment Script

**Create deploy.ps1:**

```powershell
# ============================================================================
# GRT System Deployment Script
# ============================================================================

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("development", "staging", "production")]
    [string]$Environment,
    
    [Parameter(Mandatory=$false)]
    [string]$Version = "latest"
)

Write-Host "=== GRT System Deployment ===" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Version: $Version" -ForegroundColor Yellow
Write-Host ""

# Step 1: Backup current environment
Write-Host "Step 1: Creating backup..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "D:\Backups\$Environment\$timestamp"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# Backup database
mysqldump -u root -p grt_system | Out-File -Encoding UTF8 "$backupDir\database.sql"
Write-Host "✓ Database backed up" -ForegroundColor Green

# Backup application
Copy-Item -Path "D:\Projects\20260206\grt-implementation-plan" -Destination "$backupDir\app" -Recurse
Write-Host "✓ Application backed up" -ForegroundColor Green

# Step 2: Stop application
Write-Host ""
Write-Host "Step 2: Stopping application..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Write-Host "✓ Application stopped" -ForegroundColor Green

# Step 3: Pull latest code
Write-Host ""
Write-Host "Step 3: Pulling latest code..." -ForegroundColor Yellow
cd D:\Projects\20260206\grt-implementation-plan
git pull origin main
Write-Host "✓ Code updated" -ForegroundColor Green

# Step 4: Install dependencies
Write-Host ""
Write-Host "Step 4: Installing dependencies..." -ForegroundColor Yellow
pnpm install
Write-Host "✓ Dependencies installed" -ForegroundColor Green

# Step 5: Run migrations
Write-Host ""
Write-Host "Step 5: Running database migrations..." -ForegroundColor Yellow
pnpm db:push
Write-Host "✓ Migrations completed" -ForegroundColor Green

# Step 6: Build application
Write-Host ""
Write-Host "Step 6: Building application..." -ForegroundColor Yellow
pnpm build
Write-Host "✓ Build completed" -ForegroundColor Green

# Step 7: Start application
Write-Host ""
Write-Host "Step 7: Starting application..." -ForegroundColor Yellow
pnpm start &
Start-Sleep -Seconds 5
Write-Host "✓ Application started" -ForegroundColor Green

# Step 8: Verify deployment
Write-Host ""
Write-Host "Step 8: Verifying deployment..." -ForegroundColor Yellow
$response = Invoke-WebRequest -Uri "http://localhost:3000" -ErrorAction SilentlyContinue
if ($response.StatusCode -eq 200) {
    Write-Host "✓ Application is running" -ForegroundColor Green
} else {
    Write-Host "✗ Application health check failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Green
Write-Host "Backup location: $backupDir" -ForegroundColor Cyan
Write-Host "Access application: http://localhost:3000" -ForegroundColor Cyan
```

**Run deployment:**

```powershell
.\deploy.ps1 -Environment staging -Version v1.0.0
```

---

## Part 6: Monitoring and Maintenance

### 6.1 Application Monitoring

**Monitor application health:**

```bash
# Check application status
curl http://localhost:3000/health

# View application logs
tail -f logs/application.log

# Monitor system resources
Get-Process node | Select-Object Name, CPU, Memory
```

### 6.2 Database Monitoring

**Monitor database performance:**

```sql
-- Check database size
SELECT 
    table_schema,
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size in MB'
FROM information_schema.tables
GROUP BY table_schema;

-- Check slow queries
SHOW VARIABLES LIKE 'slow_query_log';
SELECT * FROM mysql.slow_log;

-- Check active connections
SHOW PROCESSLIST;
```

### 6.3 Error Logging

**Configure error logging:**

```typescript
// server/_core/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

export default logger;
```

---

## Part 7: Quick Reference Commands

### Development Commands

```bash
# Start development server
pnpm dev

# Run tests
pnpm test

# Build application
pnpm build

# Format code
pnpm format

# Check types
pnpm type-check

# Database operations
pnpm db:push        # Generate and apply migrations
pnpm db:studio      # Open Drizzle Studio
```

### Git Commands

```bash
# Clone repository
git clone <repository-url>

# Create feature branch
git checkout -b feature/name

# Commit changes
git add .
git commit -m "message"

# Push to remote
git push origin feature/name

# Create pull request
# (via GitHub/GitLab web interface)

# Merge to main
git checkout main
git merge feature/name
git push origin main
```

### Database Commands

```bash
# Connect to MySQL
mysql -u root -p grt_system

# Backup database
mysqldump -u root -p grt_system > backup.sql

# Restore database
mysql -u root -p grt_system < backup.sql

# Create new database
CREATE DATABASE grt_system;

# Grant permissions
GRANT ALL PRIVILEGES ON grt_system.* TO 'grt_admin'@'localhost';
FLUSH PRIVILEGES;
```

---

## Part 8: Troubleshooting

### Common Issues and Solutions

**Issue: Port 3000 already in use**

```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process
taskkill /PID <process_id> /F

# Or use different port
PORT=3001 pnpm dev
```

**Issue: Database connection error**

```bash
# Verify MySQL is running
mysql -u root -p

# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Verify database exists
SHOW DATABASES;
```

**Issue: Build fails**

```bash
# Clear build cache
Remove-Item -Path "dist" -Recurse -Force
Remove-Item -Path "node_modules\.vite" -Recurse -Force

# Reinstall dependencies
pnpm install

# Rebuild
pnpm build
```

---

## Part 9: Security Best Practices

### 9.1 Environment Variables

- Never commit .env files to Git
- Use .env.example as template
- Rotate API keys regularly
- Use strong database passwords

### 9.2 Database Security

- Use strong passwords for database users
- Limit database user permissions
- Regular backups
- Monitor access logs

### 9.3 Code Security

- Keep dependencies updated: `pnpm update`
- Run security audit: `pnpm audit`
- Use HTTPS in production
- Implement rate limiting
- Validate all user inputs

---

## Part 10: Performance Optimization

### 10.1 Frontend Optimization

```typescript
// Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  return <div>{data}</div>;
});

// Use useMemo for expensive calculations
const memoizedValue = useMemo(() => {
  return expensiveCalculation(a, b);
}, [a, b]);

// Use useCallback for stable function references
const memoizedCallback = useCallback(() => {
  doSomething(a, b);
}, [a, b]);
```

### 10.2 Backend Optimization

```typescript
// Use database indexes
CREATE INDEX idx_user_email ON users(email);

// Use query pagination
const users = await db.select()
  .from(users)
  .limit(10)
  .offset(0);

// Use caching
const cachedData = await redis.get('key');
if (!cachedData) {
  const data = await expensiveQuery();
  await redis.set('key', data, 3600);
}
```

### 10.3 Database Optimization

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_created_at ON orders(created_at);
CREATE INDEX idx_user_id ON orders(user_id);

-- Use EXPLAIN to analyze queries
EXPLAIN SELECT * FROM orders WHERE user_id = 1;

-- Monitor slow queries
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;
```

---

## Summary

This workflow provides a comprehensive approach to managing the GRT system development:

1. **Development** - Local development with hot reload
2. **Version Control** - Git workflow with feature branches
3. **Testing** - Unit, integration, and E2E testing
4. **Deployment** - Automated deployment with backups
5. **Monitoring** - Health checks and performance monitoring
6. **Maintenance** - Regular updates and security patches

Follow this workflow to ensure smooth, reliable system development and deployment.

---

## Contact and Support

For questions or issues, contact:
- **Admin Team:** admin@grt-system.local
- **DevOps:** devops@grt-system.local
- **Documentation:** wiki.grt-system.local
