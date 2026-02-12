#!/bin/bash

# 简道云用户同步脚本
API_KEY="du0Hlmkgjjf4quJerQkjPftXSTfguSq0"

# 获取所有成员
curl -s -X POST "https://api.jiandaoyun.com/api/v5/corp/department/user/list" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"dept_no": 1, "has_child": true}' | jq -r '.users[] | "\(.username)|\(.name)|\(.departments | join(","))"'
