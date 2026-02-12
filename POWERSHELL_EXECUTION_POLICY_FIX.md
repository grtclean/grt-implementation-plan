# PowerShell 执行策略问题解决方案

## 问题描述

运行 PowerShell 脚本时出现以下错误：

```
无法加载文件 ... 未对文件进行数字签名。无法在当前系统上运行该脚本。
```

这是因为 Windows 默认的 PowerShell 执行策略禁止运行未签名的脚本。

---

## 解决方案

### 方案 1：临时修改执行策略（推荐）

这种方法只影响当前 PowerShell 会话，最安全。

**第1步：以管理员身份打开 PowerShell**

1. 按 `Win + X`
2. 选择 "Windows PowerShell (Admin)" 或 "Terminal (Admin)"
3. 点击 "是" 确认

**第2步：查看当前执行策略**

```powershell
Get-ExecutionPolicy
```

**第3步：临时修改执行策略**

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
```

**第4步：运行脚本**

```powershell
.\CHECK_WINDOWS_ENVIRONMENT.ps1 -ExportReport
```

**说明：**
- `RemoteSigned` - 允许本地脚本运行，远程脚本需要签名
- `Scope Process` - 仅对当前会话有效，关闭 PowerShell 后恢复

---

### 方案 2：永久修改执行策略（需谨慎）

这种方法会永久改变系统设置。

**第1步：以管理员身份打开 PowerShell**

**第2步：永久修改执行策略**

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**第3步：确认修改**

当提示时，输入 `Y` 并按 Enter

```
Execution Policy Change
The execution policy helps protect you from scripts that you do not trust.
Do you want to change the execution policy? [Y] Yes [A] Yes to All [N] No [L] No to All [S] Suspend [?] Help (default is "N"): Y
```

**第4步：验证修改**

```powershell
Get-ExecutionPolicy
```

应该显示 `RemoteSigned`

**第5步：运行脚本**

```powershell
.\CHECK_WINDOWS_ENVIRONMENT.ps1 -ExportReport
```

---

### 方案 3：使用 PowerShell 绕过执行策略

如果不想修改执行策略，可以直接绕过。

**第1步：以管理员身份打开 PowerShell**

**第2步：使用 `-ExecutionPolicy` 参数运行脚本**

```powershell
powershell -ExecutionPolicy Bypass -File ".\CHECK_WINDOWS_ENVIRONMENT.ps1" -ExportReport
```

或者：

```powershell
powershell -ExecutionPolicy RemoteSigned -File ".\CHECK_WINDOWS_ENVIRONMENT.ps1" -ExportReport
```

---

### 方案 4：使用 Cmd 运行 PowerShell 脚本

如果上述方法都不工作，可以通过 Cmd 调用 PowerShell。

**第1步：打开命令提示符（Cmd）**

按 `Win + R`，输入 `cmd`，按 Enter

**第2步：运行脚本**

```cmd
powershell -ExecutionPolicy Bypass -File "CHECK_WINDOWS_ENVIRONMENT.ps1" -ExportReport
```

---

## 详细步骤指南

### 完整步骤（推荐方案 1）

**步骤 1：打开 PowerShell（管理员）**

```
1. 按 Windows + X 键
2. 选择 "Windows PowerShell (Admin)"
3. 点击 "是" 确认 UAC 提示
```

**步骤 2：导航到项目目录**

```powershell
cd D:\Projects\20260206\grt-implementation-plan
```

**步骤 3：设置执行策略**

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
```

**步骤 4：运行脚本**

```powershell
.\CHECK_WINDOWS_ENVIRONMENT.ps1 -ExportReport
```

**步骤 5：查看报告**

脚本完成后，会生成一个 `.txt` 文件，例如：
```
GRT_Environment_Report_20260206_143022.txt
```

---

## 执行策略说明

| 策略 | 说明 | 安全性 |
|------|------|--------|
| Restricted | 不允许运行任何脚本 | 最高 |
| AllSigned | 只允许运行签名的脚本 | 高 |
| RemoteSigned | 本地脚本可运行，远程需签名 | 中 |
| Unrestricted | 允许运行所有脚本 | 低 |
| Bypass | 绕过所有限制 | 最低 |

**推荐使用：RemoteSigned**

---

## 验证执行策略

**查看当前执行策略：**

```powershell
Get-ExecutionPolicy
```

**查看所有作用域的执行策略：**

```powershell
Get-ExecutionPolicy -List
```

输出示例：
```
        Scope ExecutionPolicy
        ----- ---------------
MachinePolicy       Undefined
   UserPolicy       Undefined
      Process    RemoteSigned
  CurrentUser       RemoteSigned
 LocalMachine       RemoteSigned
```

---

## 恢复默认设置

如果想恢复到默认设置：

```powershell
Set-ExecutionPolicy -ExecutionPolicy Restricted -Scope CurrentUser
```

---

## 常见问题

### Q: 修改执行策略会影响系统安全吗？

**A:** RemoteSigned 是一个安全的选择。它允许本地脚本运行，但对来自互联网的脚本仍有保护。

### Q: 为什么需要管理员权限？

**A:** 修改执行策略需要管理员权限。如果没有管理员权限，可以使用 `-Scope Process` 仅对当前会话修改。

### Q: 关闭 PowerShell 后执行策略会恢复吗？

**A:** 取决于 `-Scope` 参数：
- `Process` - 关闭后恢复
- `CurrentUser` - 永久保存
- `LocalMachine` - 永久保存（需要管理员）

### Q: 可以只对一个脚本修改执行策略吗？

**A:** 可以，使用 `-ExecutionPolicy Bypass -File` 参数只对该次运行有效。

---

## 快速参考

### 一行命令运行脚本（推荐）

```powershell
powershell -ExecutionPolicy RemoteSigned -File "CHECK_WINDOWS_ENVIRONMENT.ps1" -ExportReport
```

### 临时修改后运行

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
.\CHECK_WINDOWS_ENVIRONMENT.ps1 -ExportReport
```

### 永久修改后运行

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\CHECK_WINDOWS_ENVIRONMENT.ps1 -ExportReport
```

---

## 脚本运行成功的标志

当脚本成功运行时，您应该看到：

```
╔════════════════════════════════════════════════════════════════╗
║         GRT System - Windows 11 Environment Deep Check Script   ║
║                  Windows 11 Version                            ║
╚════════════════════════════════════════════════════════════════╝

Project Directory: D:\Projects\20260206\grt-implementation-plan

Step 1: Checking System Information...
  OS Name: Microsoft Windows 11 Pro
  OS Version: 10.0.22621
  ...
```

以及最后生成的报告文件。

---

## 获取帮助

如果仍有问题，请提供以下信息：

1. Windows 版本（运行 `winver`）
2. PowerShell 版本（运行 `$PSVersionTable.PSVersion`）
3. 当前执行策略（运行 `Get-ExecutionPolicy`）
4. 完整的错误信息

---

**祝您顺利运行诊断脚本！** 🎉
