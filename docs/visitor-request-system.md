# GRT客户来访申请与批准系统 v2.6.0

## 概述

本文档定义客户来访申请系统的完整业务流程、数据模型、审批规则和国际化配置。

---

## 第一部分：业务流程

### 来访流程图

```
申请者提交申请
    ↓
系统自动验证（国家/工厂规则）
    ↓
分配给联系人
    ↓
联系人审核
    ├─ 批准 → 生成来访证 → 发送确认邮件
    ├─ 拒绝 → 通知申请者 → 流程结束
    └─ 需要上级审批 → 转发给上级主管
        ↓
    上级主管审核
    ├─ 批准 → 生成来访证 → 发送确认邮件
    └─ 拒绝 → 通知申请者 → 流程结束
    ↓
申请者收到来访证
    ↓
来访日期到达
    ↓
前台验证来访证
    ├─ 验证成功 → 允许进入
    └─ 验证失败 → 拒绝进入
    ↓
来访记录生成
```

---

## 第二部分：数据模型

### 1. 来访申请表（VisitorRequest）

```typescript
interface VisitorRequest {
  // 基础信息
  id: string;                    // 申请ID
  requestNumber: string;         // 申请编号（自动生成）
  status: 'draft' | 'submitted' | 'pending_approval' | 'approved' | 'rejected' | 'visited' | 'cancelled';
  
  // 申请者信息
  applicantName: string;         // 申请者姓名
  applicantIdNumber: string;     // 申请者ID号
  applicantEmail: string;        // 申请者邮箱
  applicantPhone: string;        // 申请者电话
  applicantCompany: string;      // 申请者公司
  applicantDepartment: string;   // 申请者部门
  
  // 来访信息
  visitPurpose: string;          // 来访目的
  visitDate: Date;               // 来访日期
  visitTime: string;             // 来访时间（HH:MM-HH:MM）
  estimatedDuration: number;     // 预计停留时间（分钟）
  
  // 工厂/地点信息
  factoryId: string;             // 工厂ID
  factoryName: string;           // 工厂名称
  factoryLocation: string;       // 工厂位置
  country: string;               // 国家代码（CN/US/DE等）
  
  // 来访范围
  visitAreas: string[];          // 来访区域（办公室/车间/仓库等）
  requiresFactoryAccess: boolean; // 是否需要进车间
  requiresSecurityPass: boolean;  // 是否需要安全证件
  
  // 联系人信息
  contactPersonId: string;       // 联系人ID
  contactPersonName: string;     // 联系人名称
  contactPersonEmail: string;    // 联系人邮箱
  contactPersonPhone: string;    // 联系人电话
  
  // 上级主管信息（如需要）
  supervisorId?: string;         // 上级主管ID
  supervisorName?: string;       // 上级主管名称
  supervisorEmail?: string;      // 上级主管邮箱
  
  // 审批信息
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;           // 批准人ID
  approvalDate?: Date;           // 批准日期
  approvalReason?: string;       // 批准原因
  rejectionReason?: string;      // 拒绝原因
  
  // 来访证信息
  visitorPassId?: string;        // 来访证ID
  visitorPassCode?: string;      // 来访证编码
  visitorPassQrCode?: string;    // 来访证二维码
  
  // 时间戳
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
  cancelledAt?: Date;
  visitedAt?: Date;
}
```

### 2. 来访证表（VisitorPass）

```typescript
interface VisitorPass {
  // 基础信息
  id: string;
  passCode: string;              // 来访证编码
  qrCode: string;                // 二维码
  
  // 关联信息
  requestId: string;             // 关联的申请ID
  visitorName: string;           // 访客姓名
  visitorIdNumber: string;       // 访客ID号
  
  // 有效期
  validFrom: Date;               // 有效期开始
  validTo: Date;                 // 有效期结束
  
  // 访问权限
  accessAreas: string[];         // 允许访问的区域
  factoryAccess: boolean;        // 是否允许进车间
  
  // 状态
  status: 'active' | 'used' | 'expired' | 'revoked';
  
  // 时间戳
  createdAt: Date;
  usedAt?: Date;
}
```

### 3. 来访记录表（VisitorLog）

```typescript
interface VisitorLog {
  // 基础信息
  id: string;
  passId: string;                // 来访证ID
  requestId: string;             // 申请ID
  
  // 访客信息
  visitorName: string;
  visitorIdNumber: string;
  
  // 进出记录
  checkInTime: Date;             // 进入时间
  checkOutTime?: Date;           // 离开时间
  duration?: number;             // 停留时间（分钟）
  
  // 访问信息
  accessedAreas: string[];       // 实际访问的区域
  accompaniedBy?: string;        // 陪同人员
  
  // 异常记录
  incidents?: string;            // 事件记录
  
  // 时间戳
  createdAt: Date;
}
```

### 4. 工厂规则表（FactoryRules）

```typescript
interface FactoryRules {
  // 基础信息
  id: string;
  factoryId: string;
  factoryName: string;
  country: string;
  
  // 审批规则
  requiresApproval: boolean;     // 是否需要审批
  requiresSupervisorApproval: boolean; // 是否需要上级审批
  approvalThresholdDays: number; // 审批时间阈值（天）
  
  // 访问规则
  allowFactoryAccess: boolean;   // 是否允许进车间
  requiresSecurityPass: boolean; // 是否需要安全证件
  requiresTraining: boolean;     // 是否需要培训
  
  // 时间规则
  businessHoursOnly: boolean;    // 仅工作时间
  workingHours: {
    start: string;               // HH:MM
    end: string;                 // HH:MM
  };
  allowedDays: number[];         // 允许的工作日（0=周日，1=周一等）
  
  // 黑名单规则
  blacklistEnabled: boolean;     // 是否启用黑名单
  
  // 特殊规则
  specialRules?: string;         // 特殊规则描述
  
  // 时间戳
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 第三部分：国际化规则配置

### 中国（China）规则

```json
{
  "country": "CN",
  "factoryRules": {
    "requiresApproval": true,
    "requiresSupervisorApproval": false,
    "approvalThresholdDays": 1,
    "allowFactoryAccess": true,
    "requiresSecurityPass": false,
    "requiresTraining": false,
    "businessHoursOnly": true,
    "workingHours": {
      "start": "08:00",
      "end": "18:00"
    },
    "allowedDays": [1, 2, 3, 4, 5],
    "blacklistEnabled": true,
    "specialRules": "需要提前1天提交申请"
  },
  "requiredFields": [
    "applicantName",
    "applicantIdNumber",
    "visitPurpose",
    "visitDate",
    "contactPersonId"
  ],
  "validationRules": {
    "minAdvanceNotice": 1,        // 最少提前通知天数
    "maxVisitDuration": 480,      // 最长停留时间（分钟）
    "idNumberFormat": "^\\d{18}$" // 身份证号格式
  }
}
```

### 美国（United States）规则

```json
{
  "country": "US",
  "factoryRules": {
    "requiresApproval": true,
    "requiresSupervisorApproval": true,
    "approvalThresholdDays": 3,
    "allowFactoryAccess": true,
    "requiresSecurityPass": true,
    "requiresTraining": true,
    "businessHoursOnly": true,
    "workingHours": {
      "start": "07:00",
      "end": "17:00"
    },
    "allowedDays": [1, 2, 3, 4, 5],
    "blacklistEnabled": true,
    "specialRules": "需要进行安全培训，需要上级主管批准"
  },
  "requiredFields": [
    "applicantName",
    "applicantIdNumber",
    "applicantCompany",
    "visitPurpose",
    "visitDate",
    "contactPersonId",
    "supervisorId"
  ],
  "validationRules": {
    "minAdvanceNotice": 3,
    "maxVisitDuration": 240,
    "idNumberFormat": "^\\d{3}-\\d{2}-\\d{4}$" // SSN格式
  }
}
```

### 欧洲（Europe）规则

```json
{
  "country": "EU",
  "factoryRules": {
    "requiresApproval": true,
    "requiresSupervisorApproval": true,
    "approvalThresholdDays": 5,
    "allowFactoryAccess": true,
    "requiresSecurityPass": true,
    "requiresTraining": true,
    "businessHoursOnly": true,
    "workingHours": {
      "start": "08:00",
      "end": "17:00"
    },
    "allowedDays": [1, 2, 3, 4, 5],
    "blacklistEnabled": true,
    "specialRules": "需要GDPR合规审查，需要上级主管批准"
  },
  "requiredFields": [
    "applicantName",
    "applicantIdNumber",
    "applicantCompany",
    "applicantEmail",
    "visitPurpose",
    "visitDate",
    "contactPersonId",
    "supervisorId"
  ],
  "validationRules": {
    "minAdvanceNotice": 5,
    "maxVisitDuration": 180,
    "gdprCompliance": true,
    "dataProtectionNotice": "访客数据将按照GDPR规定处理"
  }
}
```

---

## 第四部分：审批流程规则

### 自动审批规则

```typescript
interface AutoApprovalRule {
  // 规则条件
  country: string;
  visitPurpose: string;          // 来访目的
  applicantCompany?: string;     // 申请者公司
  factoryAccess: boolean;        // 是否需要进车间
  
  // 审批规则
  autoApprove: boolean;          // 是否自动批准
  requiresContactPersonApproval: boolean;
  requiresSupervisorApproval: boolean;
  approvalTimeoutDays: number;   // 审批超时天数
  
  // 通知规则
  notifyContactPerson: boolean;
  notifySupervisor: boolean;
  notifySecurityTeam: boolean;
}

// 示例：中国办公室访问自动批准
const chinaOfficeAutoApprove: AutoApprovalRule = {
  country: 'CN',
  visitPurpose: '商务访问',
  factoryAccess: false,
  autoApprove: true,
  requiresContactPersonApproval: true,
  requiresSupervisorApproval: false,
  approvalTimeoutDays: 1,
  notifyContactPerson: true,
  notifySupervisor: false,
  notifySecurityTeam: false
};

// 示例：美国工厂访问需要上级审批
const usFactoryApproval: AutoApprovalRule = {
  country: 'US',
  visitPurpose: '工厂参观',
  factoryAccess: true,
  autoApprove: false,
  requiresContactPersonApproval: true,
  requiresSupervisorApproval: true,
  approvalTimeoutDays: 3,
  notifyContactPerson: true,
  notifySupervisor: true,
  notifySecurityTeam: true
};
```

---

## 第五部分：API端点设计

### 1. 提交来访申请

```
POST /api/visitor-requests
Content-Type: application/json

{
  "applicantName": "张三",
  "applicantIdNumber": "110101199003071234",
  "applicantEmail": "zhangsan@example.com",
  "applicantPhone": "13800138000",
  "applicantCompany": "ABC公司",
  "visitPurpose": "商务洽谈",
  "visitDate": "2026-02-15",
  "visitTime": "09:00-11:00",
  "factoryId": "factory_001",
  "country": "CN",
  "visitAreas": ["office", "conference_room"],
  "requiresFactoryAccess": false,
  "contactPersonId": "user_001"
}

Response: 201 Created
{
  "id": "req_001",
  "requestNumber": "VR-20260130-001",
  "status": "submitted",
  "createdAt": "2026-01-30T10:00:00Z"
}
```

### 2. 获取待审批申请列表

```
GET /api/visitor-requests/pending-approval?factoryId=factory_001

Response: 200 OK
{
  "data": [
    {
      "id": "req_001",
      "requestNumber": "VR-20260130-001",
      "applicantName": "张三",
      "visitDate": "2026-02-15",
      "visitPurpose": "商务洽谈",
      "status": "pending_approval",
      "requiresSupervisorApproval": false
    }
  ],
  "total": 1
}
```

### 3. 批准来访申请

```
POST /api/visitor-requests/:id/approve
Content-Type: application/json

{
  "approvalReason": "批准访问"
}

Response: 200 OK
{
  "id": "req_001",
  "status": "approved",
  "visitorPassId": "pass_001",
  "visitorPassCode": "VR-20260130-001-ABC123"
}
```

### 4. 拒绝来访申请

```
POST /api/visitor-requests/:id/reject
Content-Type: application/json

{
  "rejectionReason": "不符合访问条件"
}

Response: 200 OK
{
  "id": "req_001",
  "status": "rejected",
  "rejectionReason": "不符合访问条件"
}
```

### 5. 验证来访证

```
POST /api/visitor-passes/verify
Content-Type: application/json

{
  "passCode": "VR-20260130-001-ABC123"
}

Response: 200 OK
{
  "valid": true,
  "visitorName": "张三",
  "validFrom": "2026-02-15T09:00:00Z",
  "validTo": "2026-02-15T11:00:00Z",
  "accessAreas": ["office", "conference_room"],
  "factoryAccess": false
}
```

---

## 第六部分：前端表单设计

### 来访申请表单

```typescript
interface VisitorRequestForm {
  // 申请者信息
  applicantName: string;         // 必填
  applicantIdNumber: string;     // 必填
  applicantEmail: string;        // 必填
  applicantPhone: string;        // 必填
  applicantCompany: string;      // 可选
  applicantDepartment: string;   // 可选
  
  // 来访信息
  visitPurpose: string;          // 必填（下拉选择）
  visitDate: Date;               // 必填
  visitTime: string;             // 必填（时间范围选择）
  estimatedDuration: number;     // 必填
  
  // 工厂信息
  factoryId: string;             // 必填（下拉选择）
  visitAreas: string[];          // 必填（多选）
  requiresFactoryAccess: boolean; // 必填
  
  // 联系人
  contactPersonId: string;       // 必填（下拉选择）
  
  // 备注
  remarks: string;               // 可选
}
```

### 表单验证规则

```typescript
const validationRules = {
  applicantName: {
    required: true,
    minLength: 2,
    maxLength: 50
  },
  applicantIdNumber: {
    required: true,
    pattern: '^\\d{18}$' // 中国身份证
  },
  applicantEmail: {
    required: true,
    pattern: '^[^@]+@[^@]+\\.[^@]+$'
  },
  visitDate: {
    required: true,
    minDate: 'today',
    maxDate: '+30days'
  },
  estimatedDuration: {
    required: true,
    min: 30,
    max: 480
  }
};
```

---

## 第七部分：实现检查清单

- [ ] 创建VisitorRequest表
- [ ] 创建VisitorPass表
- [ ] 创建VisitorLog表
- [ ] 创建FactoryRules表
- [ ] 实现来访申请API
- [ ] 实现审批流程API
- [ ] 实现来访证生成
- [ ] 实现来访证验证
- [ ] 实现前端申请表单
- [ ] 实现前端审批界面
- [ ] 实现前端来访证查看
- [ ] 实现邮件通知
- [ ] 实现国际化规则
- [ ] 实现黑名单检查
- [ ] 编写单元测试
- [ ] 编写集成测试

---

**版本历史：**
- v2.6.0 - 初始版本（2026-01-30）
