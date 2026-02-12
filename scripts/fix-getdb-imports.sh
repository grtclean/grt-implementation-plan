#!/bin/bash

# 批量修复脚本：将所有getDb()调用替换为requireDb()
# 并更新导入语句

PROJECT_ROOT="/home/ubuntu/grt-implementation-plan"
SERVER_DIR="$PROJECT_ROOT/server"

echo "开始批量修复getDb()调用..."

# 1. 替换所有 import { getDb } 为 import { requireDb }
find "$SERVER_DIR" -name "*.ts" ! -path "*/node_modules/*" -type f | while read file; do
  if grep -q "import.*getDb.*from.*['\"]./db['\"]" "$file"; then
    sed -i "s/import { getDb } from ['\"]\.\/db['\"];/import { requireDb } from '.\/utils\/db-helpers';/g" "$file"
    sed -i "s/import { getDb, /import { requireDb, /g" "$file"
    sed -i "s/, getDb,/, requireDb,/g" "$file"
    sed -i "s/, getDb }/,  requireDb }/g" "$file"
    echo "✓ 已更新导入: $file"
  fi
done

# 2. 替换所有 const db = await getDb(); 为 const db = await requireDb();
find "$SERVER_DIR" -name "*.ts" ! -path "*/node_modules/*" -type f | while read file; do
  if grep -q "const db = await getDb()" "$file"; then
    sed -i "s/const db = await getDb()/const db = await requireDb()/g" "$file"
    sed -i "s/const \[db\] = await getDb()/const db = await requireDb()/g" "$file"
    echo "✓ 已更新调用: $file"
  fi
done

# 3. 替换所有 await getDb() 为 await requireDb()
find "$SERVER_DIR" -name "*.ts" ! -path "*/node_modules/*" -type f | while read file; do
  if grep -q "await getDb()" "$file"; then
    sed -i "s/await getDb()/await requireDb()/g" "$file"
    echo "✓ 已更新异步调用: $file"
  fi
done

echo "批量修复完成！"
