# PLC选型矩阵

> **适用范围**: 电气设计部 / PLC控制系统选型决策
> **更新频率**: 年度更新，新品发布时补充
> **审批流程**: 电气工程师提出选型建议 → 电气总工审核 → CTO批准(非标选型)

## 模板

### 一、PLC平台对比矩阵

| 对比维度 | Siemens S7-1500 | Rockwell ControlLogix | Mitsubishi iQ-R | Beckhoff TwinCAT |
|----------|----------------|-----------------------|-----------------|-------------------|
| **CPU型号** | CPU 1515-2 PN | 1756-L81E | R16CPU | CX5140 |
| **程序内存** | 500KB | 3MB | 800KB | 取决于PC |
| **扫描周期(典型)** | 1ms | 1ms | 0.98ms | 0.1ms |
| **本体I/O** | 0(需扩展) | 0(需扩展) | 0(需扩展) | 0(需扩展) |
| **最大I/O点数** | 8,192 | 128,000 | 4,096 | 65,536 |
| **Profinet** | ✅ 原生 | ✅ 需模块 | ✅ 需模块 | ✅ EtherCAT |
| **OPC-UA Server** | ✅ 内置 | ✅ 内置 | ✅ 内置 | ✅ 内置 |
| **EtherCAT** | ❌ | ❌ | ❌ | ✅ 原生 |
| **运动控制轴数** | 32轴 | 256轴 | 16轴 | 256轴 |
| **安全PLC** | F-CPU内置 | GuardLogix | SIL2内置 | TwinSAFE |
| **安全等级** | SIL 3 / PLe | SIL 3 / PLe | SIL 2 / PLd | SIL 3 / PLe |
| **编程软件** | TIA Portal V18 | Studio 5000 | GX Works3 | TwinCAT 3 XAE |
| **编程语言** | LAD/FBD/SCL/STL/GRAPH | LAD/FBD/ST/SFC | LAD/FBD/ST/SFC | ST/FBD/LAD/CFC |
| **仿真功能** | PLCSIM Advanced | Emulate 5000 | GX Simulator | 内置仿真 |
| **HMI配套** | TP/KP/Unified | PanelView | GOT2000 | CP系列 |
| **远程维护** | Sinema RC | Stratix | GX Remote | ADS路由 |
| **工程师熟悉度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **市场占有率(中国)** | ~35% | ~15% | ~20% | ~8% |
| **CPU单价(元)** | 18,000 | 45,000 | 12,000 | 22,000 |
| **总系统成本(估)** | 中 | 高 | 低 | 中高 |
| **交期(周)** | 2-3 | 3-4 | 1-2 | 2-3 |

### 二、GRT标准选型推荐

| 应用场景 | 推荐平台 | 推荐CPU | 理由 |
|----------|----------|---------|------|
| 汽车清洗设备(国内) | **Siemens S7-1500** | CPU 1515-2 PN | 团队熟悉度高，客户指定率70%，OPC-UA原生支持 |
| 汽车清洗设备(海外) | **Siemens S7-1500** | CPU 1516-3 PN/DP | 全球服务网络，CE认证简便 |
| 半导体清洗设备 | **Beckhoff TwinCAT** | CX5140 | 超高速扫描0.1ms，适合精密控制 |
| 低成本小型设备 | **Mitsubishi iQ-R** | R16CPU | 成本最低，适合标准化产品 |
| 大型联线系统 | **Rockwell ControlLogix** | 1756-L81E | 美系客户指定(GM/Ford)，大规模I/O |
| 高速运动控制 | **Beckhoff TwinCAT** | CX5140 | EtherCAT原生，运动同步精度最高 |

### 三、伺服系统配套选型

| PLC平台 | 推荐伺服 | 型号系列 | 通讯协议 | 兼容性 | 成本 |
|---------|----------|----------|----------|--------|------|
| Siemens S7-1500 | Siemens SINAMICS | V90 / S120 | Profinet IRT | ⭐⭐⭐⭐⭐ | 中 |
| Rockwell ControlLogix | Allen-Bradley Kinetix | 5700 | EtherNet/IP CIP Motion | ⭐⭐⭐⭐⭐ | 高 |
| Mitsubishi iQ-R | Mitsubishi | MR-J5 | SSCNET III/H | ⭐⭐⭐⭐⭐ | 低 |
| Beckhoff TwinCAT | Beckhoff | AX5000 | EtherCAT | ⭐⭐⭐⭐⭐ | 中高 |
| Siemens S7-1500 | 汇川 | IS620P | Profinet | ⭐⭐⭐⭐ | 低(国产替代) |

### 四、HMI配套选型

| PLC平台 | HMI型号 | 尺寸 | 分辨率 | 协议 | 单价(元) | 推荐 |
|---------|---------|------|--------|------|----------|------|
| Siemens | TP700 Comfort | 7寸 | 800×480 | Profinet | 5,500 | 小型设备 |
| Siemens | TP1200 Comfort | 12寸 | 1280×800 | Profinet | 12,000 | 标准配置 |
| Siemens | TP1500 Comfort | 15寸 | 1366×768 | Profinet | 18,000 | 大型设备 |
| Siemens | Unified Comfort 15 | 15寸 | 1920×1080 | Profinet/OPC-UA | 22,000 | 高端/数字孪生 |
| Mitsubishi | GOT2107 | 7寸 | 800×480 | Ethernet | 3,500 | 低成本方案 |
| Beckhoff | CP2912 | 12寸 | 1280×800 | EtherCAT | 8,000 | TwinCAT方案 |

### 五、选型决策流程

```
客户是否指定品牌?
├── 是 → 按客户要求选型
└── 否 → 检查应用场景
        ├── 汽车清洗(国内外) → Siemens S7-1500
        ├── 半导体精密控制 → Beckhoff TwinCAT
        ├── 低成本标准产品 → Mitsubishi iQ-R
        ├── 美系客户/大规模联线 → Rockwell ControlLogix
        └── 不确定 → 默认 Siemens S7-1500
```

### 六、成本对比 (典型RC300配置)

| 组件 | Siemens方案(元) | Rockwell方案(元) | Mitsubishi方案(元) |
|------|----------------|------------------|-------------------|
| CPU | 18,000 | 45,000 | 12,000 |
| I/O模块(160点) | 28,000 | 35,000 | 18,000 |
| 安全模块 | 12,000 | 18,000 | 8,000 |
| HMI 15寸 | 18,000 | 22,000 | 8,000 |
| 伺服(6轴) | 48,000 | 72,000 | 36,000 |
| 编程软件许可 | 8,000 | 12,000 | 5,000 |
| **合计** | **132,000** | **204,000** | **87,000** |
| **相对比例** | 100% | 155% | 66% |

## 使用说明

1. PLC选型在项目M1阶段确定，影响后续全部电气设计
2. 客户指定品牌时无需走选型评审流程
3. 非标准平台选型(如Beckhoff/Rockwell)需电气总工批准
4. 选型结论记录在项目设计方案中，关联到系统`/design-engine`
5. 本矩阵数据由电气设计部每年1月更新价格和参数
6. 国产替代方案(如汇川伺服)需先完成内部测试验证再推广
