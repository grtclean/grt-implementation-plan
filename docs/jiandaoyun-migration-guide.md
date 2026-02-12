# 简道云数据迁移到NocoBase完整指南

> **版本**: 1.0  
> **更新日期**: 2026-01-18  
> **作者**: Manus AI

---

## 概述

本文档详细说明如何将简道云（JianDaoYun）中的用户、表单、数据和工作流程迁移到NocoBase系统。迁移过程分为四个主要阶段：数据导出、数据转换、数据导入和验证测试。

---

## 1. 迁移范围

### 1.1 迁移内容

| 数据类型 | 简道云来源 | NocoBase目标 | 迁移方式 |
|----------|------------|--------------|----------|
| **用户账户** | 企业成员列表 | 用户表 | API自动 |
| **部门结构** | 组织架构 | 部门表 | API自动 |
| **角色权限** | 角色设置 | 角色表 | 手动配置 |
| **应用结构** | 应用列表 | 数据表集合 | API自动 |
| **表单字段** | 表单设计 | 字段定义 | API自动 |
| **表单数据** | 数据条目 | 数据记录 | API自动 |
| **工作流程** | 流程设计 | 工作流 | 手动重建 |
| **仪表盘** | 数据报表 | 仪表盘 | 手动重建 |

### 1.2 不迁移内容

由于系统架构差异，以下内容需要在NocoBase中重新配置：

- 复杂的流程分支逻辑（需要在NocoBase工作流中重建）
- 自定义打印模板（需要重新设计）
- 第三方集成配置（需要重新对接）

---

## 2. 准备工作

### 2.1 获取简道云API凭据

1. 登录简道云管理后台：https://www.jiandaoyun.com
2. 进入 **管理后台** > **开放平台** > **API管理**
3. 如果没有API Key，点击"创建API Key"
4. 记录以下信息：

```
企业ID (Corp ID): _______________
API Key: _______________
```

### 2.2 确认API权限

确保API Key具有以下权限：
- ✅ 读取企业成员
- ✅ 读取组织架构
- ✅ 读取应用列表
- ✅ 读取表单结构
- ✅ 读取表单数据

### 2.3 准备NocoBase环境

确保NocoBase已按照部署指南完成安装，并且：
- 管理员账户已创建
- 数据库连接正常
- API服务可访问

---

## 3. 用户和组织迁移

### 3.1 用户数据结构映射

| 简道云字段 | NocoBase字段 | 说明 |
|------------|--------------|------|
| `_id` | `external_id` | 外部ID，用于关联 |
| `name` | `nickname` | 用户昵称 |
| `username` | `username` | 登录用户名 |
| `email` | `email` | 邮箱地址 |
| `mobile` | `phone` | 手机号码 |
| `dept_ids` | `department_id` | 所属部门 |
| `status` | `status` | 账户状态 |

### 3.2 用户迁移脚本

创建文件 `migrate-users.ps1`：

```powershell
# 用户迁移脚本
param(
    [Parameter(Mandatory=$true)]
    [string]$JdyCorpId,
    
    [Parameter(Mandatory=$true)]
    [string]$JdyApiKey,
    
    [string]$NocoBaseUrl = "http://localhost:13000",
    [string]$NocoBaseToken = ""
)

$ErrorActionPreference = "Stop"

Write-Host "=== 简道云用户迁移工具 ===" -ForegroundColor Cyan

# 简道云API基础URL
$jdyBaseUrl = "https://api.jiandaoyun.com/api/v5"

# 请求头
$jdyHeaders = @{
    "Authorization" = "Bearer $JdyApiKey"
    "Content-Type" = "application/json"
}

# 步骤1: 获取部门列表
Write-Host "`n[1/3] 获取部门列表..." -ForegroundColor Yellow
try {
    $deptResponse = Invoke-RestMethod -Uri "$jdyBaseUrl/corp/$JdyCorpId/departments" -Headers $jdyHeaders -Method Get
    $departments = $deptResponse.data
    Write-Host "  找到 $($departments.Count) 个部门" -ForegroundColor Green
    
    # 保存部门数据
    $departments | ConvertTo-Json -Depth 10 | Out-File "departments.json" -Encoding UTF8
} catch {
    Write-Host "  获取部门失败: $_" -ForegroundColor Red
    $departments = @()
}

# 步骤2: 获取用户列表
Write-Host "`n[2/3] 获取用户列表..." -ForegroundColor Yellow
try {
    $usersResponse = Invoke-RestMethod -Uri "$jdyBaseUrl/corp/$JdyCorpId/members" -Headers $jdyHeaders -Method Get
    $users = $usersResponse.data
    Write-Host "  找到 $($users.Count) 个用户" -ForegroundColor Green
    
    # 保存用户数据
    $users | ConvertTo-Json -Depth 10 | Out-File "users.json" -Encoding UTF8
} catch {
    Write-Host "  获取用户失败: $_" -ForegroundColor Red
    $users = @()
}

# 步骤3: 转换为NocoBase格式
Write-Host "`n[3/3] 转换数据格式..." -ForegroundColor Yellow

$nocobaseUsers = @()
foreach ($user in $users) {
    $nocobaseUser = @{
        external_id = $user._id
        nickname = $user.name
        username = if ($user.username) { $user.username } else { $user.mobile }
        email = $user.email
        phone = $user.mobile
        status = if ($user.status -eq 1) { "active" } else { "inactive" }
        source = "jiandaoyun"
        imported_at = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
    }
    $nocobaseUsers += $nocobaseUser
}

# 保存转换后的数据
$nocobaseUsers | ConvertTo-Json -Depth 10 | Out-File "nocobase-users.json" -Encoding UTF8

Write-Host "`n=== 迁移数据准备完成 ===" -ForegroundColor Cyan
Write-Host "生成文件:"
Write-Host "  - departments.json ($($departments.Count) 个部门)"
Write-Host "  - users.json ($($users.Count) 个用户)"
Write-Host "  - nocobase-users.json (转换后的用户数据)"
Write-Host "`n下一步: 在NocoBase中导入 nocobase-users.json"
```

### 3.3 执行用户迁移

```powershell
.\migrate-users.ps1 -JdyCorpId "YOUR_CORP_ID" -JdyApiKey "YOUR_API_KEY"
```

---

## 4. 表单和数据迁移

### 4.1 表单结构映射

简道云表单字段类型与NocoBase字段类型的对应关系：

| 简道云字段类型 | NocoBase字段类型 | 备注 |
|----------------|------------------|------|
| `text` | `string` | 单行文本 |
| `textarea` | `text` | 多行文本 |
| `number` | `float` / `integer` | 数字 |
| `date` | `date` / `datetime` | 日期 |
| `radiogroup` | `radioGroup` | 单选 |
| `checkboxgroup` | `checkboxGroup` | 多选 |
| `combo` | `select` | 下拉选择 |
| `user` | `belongsTo` | 成员选择 |
| `dept` | `belongsTo` | 部门选择 |
| `subform` | `hasMany` | 子表单 |
| `attachment` | `attachment` | 附件 |

### 4.2 表单迁移脚本

创建文件 `migrate-forms.ps1`：

```powershell
# 表单迁移脚本
param(
    [Parameter(Mandatory=$true)]
    [string]$JdyCorpId,
    
    [Parameter(Mandatory=$true)]
    [string]$JdyApiKey
)

$ErrorActionPreference = "Stop"

Write-Host "=== 简道云表单迁移工具 ===" -ForegroundColor Cyan

$jdyBaseUrl = "https://api.jiandaoyun.com/api/v5"
$jdyHeaders = @{
    "Authorization" = "Bearer $JdyApiKey"
    "Content-Type" = "application/json"
}

# 步骤1: 获取应用列表
Write-Host "`n[1/4] 获取应用列表..." -ForegroundColor Yellow
$appsResponse = Invoke-RestMethod -Uri "$jdyBaseUrl/corp/$JdyCorpId/apps" -Headers $jdyHeaders -Method Get
$apps = $appsResponse.data
Write-Host "  找到 $($apps.Count) 个应用" -ForegroundColor Green

# 步骤2: 获取每个应用的表单
Write-Host "`n[2/4] 获取表单列表..." -ForegroundColor Yellow
$allForms = @()
foreach ($app in $apps) {
    try {
        $formsResponse = Invoke-RestMethod -Uri "$jdyBaseUrl/app/$($app._id)/entry_forms" -Headers $jdyHeaders -Method Get
        foreach ($form in $formsResponse.data) {
            $allForms += @{
                app_id = $app._id
                app_name = $app.name
                form_id = $form._id
                form_name = $form.name
            }
        }
        Write-Host "  - $($app.name): $($formsResponse.data.Count) 个表单" -ForegroundColor Gray
    } catch {
        Write-Host "  - $($app.name): 获取失败" -ForegroundColor Red
    }
}

# 步骤3: 获取表单字段
Write-Host "`n[3/4] 获取表单字段..." -ForegroundColor Yellow
$formDetails = @()
foreach ($form in $allForms) {
    try {
        $widgetsResponse = Invoke-RestMethod -Uri "$jdyBaseUrl/app/$($form.app_id)/entry/$($form.form_id)/widgets" -Headers $jdyHeaders -Method Get
        $formDetails += @{
            app_id = $form.app_id
            app_name = $form.app_name
            form_id = $form.form_id
            form_name = $form.form_name
            fields = $widgetsResponse.data
        }
        Write-Host "  - $($form.form_name): $($widgetsResponse.data.Count) 个字段" -ForegroundColor Gray
    } catch {
        Write-Host "  - $($form.form_name): 获取字段失败" -ForegroundColor Red
    }
}

# 步骤4: 转换为NocoBase格式
Write-Host "`n[4/4] 转换为NocoBase格式..." -ForegroundColor Yellow

$nocobaseCollections = @()
foreach ($form in $formDetails) {
    $fields = @()
    foreach ($widget in $form.fields) {
        $field = @{
            name = $widget.name
            type = switch ($widget.type) {
                "text" { "string" }
                "textarea" { "text" }
                "number" { "float" }
                "date" { "date" }
                "datetime" { "datetime" }
                "radiogroup" { "radioGroup" }
                "checkboxgroup" { "checkboxGroup" }
                "combo" { "select" }
                default { "string" }
            }
            title = $widget.label
            required = $widget.required
        }
        $fields += $field
    }
    
    $collection = @{
        name = "jdy_$($form.form_id -replace '-', '_')"
        title = "$($form.app_name) - $($form.form_name)"
        fields = $fields
        source = "jiandaoyun"
        original_app = $form.app_name
        original_form = $form.form_name
    }
    $nocobaseCollections += $collection
}

# 保存结果
$formDetails | ConvertTo-Json -Depth 10 | Out-File "jiandaoyun-forms.json" -Encoding UTF8
$nocobaseCollections | ConvertTo-Json -Depth 10 | Out-File "nocobase-collections.json" -Encoding UTF8

Write-Host "`n=== 表单迁移数据准备完成 ===" -ForegroundColor Cyan
Write-Host "生成文件:"
Write-Host "  - jiandaoyun-forms.json (原始表单数据)"
Write-Host "  - nocobase-collections.json (转换后的集合定义)"
```

### 4.3 数据迁移脚本

创建文件 `migrate-data.ps1`：

```powershell
# 数据迁移脚本
param(
    [Parameter(Mandatory=$true)]
    [string]$JdyCorpId,
    
    [Parameter(Mandatory=$true)]
    [string]$JdyApiKey,
    
    [Parameter(Mandatory=$true)]
    [string]$AppId,
    
    [Parameter(Mandatory=$true)]
    [string]$FormId,
    
    [int]$Limit = 100
)

$ErrorActionPreference = "Stop"

Write-Host "=== 简道云数据迁移工具 ===" -ForegroundColor Cyan
Write-Host "应用ID: $AppId"
Write-Host "表单ID: $FormId"

$jdyBaseUrl = "https://api.jiandaoyun.com/api/v5"
$jdyHeaders = @{
    "Authorization" = "Bearer $JdyApiKey"
    "Content-Type" = "application/json"
}

# 获取表单数据
Write-Host "`n获取表单数据..." -ForegroundColor Yellow

$allData = @()
$dataId = $null
$hasMore = $true

while ($hasMore) {
    $body = @{
        limit = $Limit
    }
    if ($dataId) {
        $body.data_id = $dataId
    }
    
    try {
        $response = Invoke-RestMethod -Uri "$jdyBaseUrl/app/$AppId/entry/$FormId/data" -Headers $jdyHeaders -Method Post -Body ($body | ConvertTo-Json)
        $allData += $response.data
        
        if ($response.data.Count -lt $Limit) {
            $hasMore = $false
        } else {
            $dataId = $response.data[-1]._id
        }
        
        Write-Host "  已获取 $($allData.Count) 条数据..." -ForegroundColor Gray
    } catch {
        Write-Host "  获取数据失败: $_" -ForegroundColor Red
        $hasMore = $false
    }
}

# 保存数据
$outputFile = "data_${AppId}_${FormId}.json"
$allData | ConvertTo-Json -Depth 10 | Out-File $outputFile -Encoding UTF8

Write-Host "`n=== 数据导出完成 ===" -ForegroundColor Cyan
Write-Host "共导出 $($allData.Count) 条数据到 $outputFile"
```

---

## 5. 工作流程迁移

### 5.1 流程迁移策略

由于简道云和NocoBase的工作流引擎架构不同，流程需要手动重建。以下是迁移策略：

| 简道云流程类型 | NocoBase实现方式 |
|----------------|------------------|
| 审批流程 | 工作流 + 审批节点 |
| 数据联动 | 工作流 + 数据操作节点 |
| 定时任务 | 工作流 + 定时触发器 |
| 消息通知 | 工作流 + 通知节点 |

### 5.2 流程导出脚本

创建文件 `export-workflows.ps1`：

```powershell
# 工作流导出脚本（用于参考重建）
param(
    [Parameter(Mandatory=$true)]
    [string]$JdyCorpId,
    
    [Parameter(Mandatory=$true)]
    [string]$JdyApiKey
)

Write-Host "=== 简道云工作流导出工具 ===" -ForegroundColor Cyan

$jdyBaseUrl = "https://api.jiandaoyun.com/api/v5"
$jdyHeaders = @{
    "Authorization" = "Bearer $JdyApiKey"
    "Content-Type" = "application/json"
}

# 获取应用列表
$appsResponse = Invoke-RestMethod -Uri "$jdyBaseUrl/corp/$JdyCorpId/apps" -Headers $jdyHeaders -Method Get

$workflowSummary = @()
foreach ($app in $appsResponse.data) {
    # 注意：简道云API可能不直接提供工作流详情
    # 这里生成一个参考文档
    $workflowSummary += @{
        app_id = $app._id
        app_name = $app.name
        note = "请在简道云管理后台手动查看此应用的流程设计"
    }
}

$workflowSummary | ConvertTo-Json -Depth 5 | Out-File "workflow-reference.json" -Encoding UTF8

Write-Host "`n=== 导出完成 ===" -ForegroundColor Cyan
Write-Host "请参考 workflow-reference.json 在NocoBase中重建工作流"
Write-Host "`n建议步骤:"
Write-Host "1. 登录简道云，截图或记录每个应用的流程设计"
Write-Host "2. 在NocoBase中创建对应的工作流"
Write-Host "3. 配置触发条件和执行节点"
```

---

## 6. 迁移执行清单

### 6.1 执行顺序

按以下顺序执行迁移脚本：

```powershell
# 1. 迁移用户和部门
.\migrate-users.ps1 -JdyCorpId "YOUR_CORP_ID" -JdyApiKey "YOUR_API_KEY"

# 2. 迁移表单结构
.\migrate-forms.ps1 -JdyCorpId "YOUR_CORP_ID" -JdyApiKey "YOUR_API_KEY"

# 3. 迁移表单数据（对每个表单执行）
.\migrate-data.ps1 -JdyCorpId "YOUR_CORP_ID" -JdyApiKey "YOUR_API_KEY" -AppId "APP_ID" -FormId "FORM_ID"

# 4. 导出工作流参考
.\export-workflows.ps1 -JdyCorpId "YOUR_CORP_ID" -JdyApiKey "YOUR_API_KEY"
```

### 6.2 验证清单

迁移完成后，请验证以下内容：

- [ ] 所有用户已导入NocoBase
- [ ] 部门结构正确
- [ ] 所有表单已创建
- [ ] 表单字段类型正确
- [ ] 数据记录数量一致
- [ ] 关联关系正确
- [ ] 工作流已重建并测试

---

## 7. 常见问题

### Q1: API调用返回401错误

**原因**: API Key无效或已过期

**解决**: 在简道云管理后台重新生成API Key

### Q2: 数据导出不完整

**原因**: API有分页限制

**解决**: 脚本已处理分页，如仍有问题，检查网络连接

### Q3: 字段类型转换错误

**原因**: 简道云和NocoBase字段类型不完全对应

**解决**: 手动调整nocobase-collections.json中的字段类型

---

## 参考资料

1. [简道云API文档](https://hc.jiandaoyun.com/open/12049)
2. [NocoBase数据表文档](https://docs.nocobase.com/manual/data-modeling)
3. [NocoBase工作流文档](https://docs.nocobase.com/manual/workflow)
