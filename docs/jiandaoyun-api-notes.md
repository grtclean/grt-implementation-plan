# 简道云 API V5 文档笔记

## 认证方式
- Header: `Authorization: Bearer {api_key}`
- Content-Type: `application/json`

## 应用接口

### 获取应用列表
- **请求地址**: `POST https://api.jiandaoyun.com/api/v5/app/list`
- **请求频率**: 30 次/秒
- **请求参数**:
  - `limit` (Number, 可选): 单次取数的数据条数，1~100，默认 100
  - `skip` (Number, 可选): 需要跳过的数据条数，默认 0

- **响应内容**:
```json
{
  "apps": [
    {
      "name": "应用名称1",
      "app_id": "5d5a5bbb850a6d0604ab119"
    }
  ]
}
```

## 注意事项
1. V5版本API使用POST方法，参数放在body中
2. 不需要在URL中包含corp_id
3. API Key需要在简道云开放平台中创建，并授权相应的应用


## 通讯录接口

### 部门实体结构 (department)
| 属性 | 类型 | 含义 | 备注 |
|------|------|------|------|
| dept_no | Number | 部门编号，企业内唯一 | 不同企业之间可能存在重复 |
| name | String | 部门名称 | |
| parent_no | Number | 父部门编号 | |
| type | Number | 部门类型 | 0: 常规部门, 2: 企业互联外部部门 |
| status | Number | 部门状态 | 1: 使用中, -1: 已删除 |
| seq | number | 部门排序 | 部门在父部门内的序号 |

### 成员实体结构 (user)
| 属性 | 类型 | 含义 | 备注 |
|------|------|------|------|
| username | String | 成员编号，企业内唯一 | |
| name | String | 昵称 | |
| departments | Number[] | 成员所在部门编号列表 | |
| type | Number | 成员类型 | 0: 常规成员, 2: 企业互联外部对接人 |
| status | Number | 成员状态 | 0: 未确认, 1: 已加入 |

### 角色实体结构 (role)
| 属性 | 类型 | 含义 |
|------|------|------|
| role_no | Number | 角色编号 |
| group_no | Number | 角色组编号 |
| name | String | 角色名称 |
| type | Number | 角色类型 |
| status | Number | 角色状态 |

## 通讯录API端点

### 获取部门列表（递归）
- **请求地址**: `POST https://api.jiandaoyun.com/api/v5/corp/department/list`
- **请求参数**:
  - `dept_no` (Number, 可选): 部门编号，默认为1（根部门）
  - `has_child` (Boolean, 可选): 是否递归获取子部门

### 获取成员列表
- **请求地址**: `POST https://api.jiandaoyun.com/api/v5/corp/member/list`
- **请求参数**:
  - `dept_no` (Number, 可选): 部门编号
  - `limit` (Number, 可选): 单次取数条数
  - `skip` (Number, 可选): 跳过条数

### 获取角色列表
- **请求地址**: `POST https://api.jiandaoyun.com/api/v5/corp/role/list`


## 获取部门成员列表API

**请求地址**: `POST https://api.jiandaoyun.com/api/v5/corp/department/user/list`

**请求参数**:
| 参数 | 类型 | 是否必需 | 说明 |
|------|------|----------|------|
| dept_no | Number | 是 | 部门编号 |
| has_child | Boolean | 否 | 是否递归获取所有成员，默认false |

**响应示例**:
```json
{
  "users": [
    {
      "username": "aubrey",
      "name": "aubrey",
      "departments": [1],
      "type": 0,
      "status": 1
    }
  ]
}
```
