# IO点表

> **适用范围**: 电气设计部 / PLC I/O点位分配与接线设计
> **更新频率**: 每个项目编制，调试阶段更新实际地址
> **审批流程**: 电气工程师编制 → PLC程序员确认 → 电气总工审核

## 模板

### 项目信息

| 字段 | 内容 |
|------|------|
| **项目名称** | GRT-RC300 高压清洗机器人 |
| **PLC型号** | Siemens S7-1500 CPU 1515-2 PN |
| **I/O编号** | IO-RC300-001 Rev.A |
| **编制人** | 周工 |
| **编制日期** | 2026-05-20 |

---

### 一、数字量输入 (DI) — 32点

| 序号 | 标签名(Tag) | PLC地址 | 模块/通道 | 信号类型 | 说明 | 所属区域 |
|------|------------|---------|-----------|----------|------|----------|
| 1 | DI_EStop_1 | I0.0 | DI-01/CH0 | 24VDC NPN | 急停按钮1(主操作台) | 安全 |
| 2 | DI_EStop_2 | I0.1 | DI-01/CH1 | 24VDC NPN | 急停按钮2(设备侧) | 安全 |
| 3 | DI_SafeDoor_1 | I0.2 | DI-01/CH2 | 24VDC NPN | 安全门联锁开关1 | 安全 |
| 4 | DI_SafeDoor_2 | I0.3 | DI-01/CH3 | 24VDC NPN | 安全门联锁开关2 | 安全 |
| 5 | DI_LightCurtain | I0.4 | DI-01/CH4 | 24VDC NPN | 安全光栅(上料口) | 安全 |
| 6 | DI_AutoMode | I0.5 | DI-01/CH5 | 24VDC NPN | 自动/手动模式选择 | 操作 |
| 7 | DI_CycleStart | I0.6 | DI-01/CH6 | 24VDC NPN | 循环启动按钮 | 操作 |
| 8 | DI_CycleStop | I0.7 | DI-01/CH7 | 24VDC NPN | 循环停止按钮 | 操作 |
| 9 | DI_WP_LoadPos | I1.0 | DI-02/CH0 | 24VDC NPN | 工件到位检测(上料台) | 搬运 |
| 10 | DI_WP_UnloadPos | I1.1 | DI-02/CH1 | 24VDC NPN | 工件到位检测(下料台) | 搬运 |
| 11 | DI_Gantry_HomeX | I1.2 | DI-02/CH2 | 24VDC NPN | 桁架X轴原点 | 搬运 |
| 12 | DI_Gantry_HomeY | I1.3 | DI-02/CH3 | 24VDC NPN | 桁架Y轴原点 | 搬运 |
| 13 | DI_Gantry_HomeZ | I1.4 | DI-02/CH4 | 24VDC NPN | 桁架Z轴原点 | 搬运 |
| 14 | DI_Gripper_Open | I1.5 | DI-02/CH5 | 24VDC NPN | 夹爪张开到位 | 搬运 |
| 15 | DI_Gripper_Close | I1.6 | DI-02/CH6 | 24VDC NPN | 夹爪夹紧到位 | 搬运 |
| 16 | DI_Pump1_Run | I1.7 | DI-02/CH7 | 24VDC NPN | 高压泵1运行反馈 | 清洗 |
| 17 | DI_Pump2_Run | I2.0 | DI-03/CH0 | 24VDC NPN | 高压泵2运行反馈 | 清洗 |
| 18 | DI_US_Ready | I2.1 | DI-03/CH1 | 24VDC NPN | 超声发生器就绪 | 清洗 |
| 19 | DI_VacPump_Run | I2.2 | DI-03/CH2 | 24VDC NPN | 真空泵运行反馈 | 干燥 |
| 20 | DI_Filter_Alarm | I2.3 | DI-03/CH3 | 24VDC NPN | 滤芯堵塞报警 | 循环 |
| 21 | DI_Tank1_LevelHi | I2.4 | DI-03/CH4 | 24VDC NPN | 水箱1液位高 | 循环 |
| 22 | DI_Tank1_LevelLo | I2.5 | DI-03/CH5 | 24VDC NPN | 水箱1液位低 | 循环 |
| 23 | DI_Tank2_LevelHi | I2.6 | DI-03/CH6 | 24VDC NPN | 水箱2液位高 | 循环 |
| 24 | DI_Tank2_LevelLo | I2.7 | DI-03/CH7 | 24VDC NPN | 水箱2液位低 | 循环 |
| 25 | DI_RFID_Read_OK | I3.0 | DI-04/CH0 | 24VDC NPN | RFID读取成功 | 识别 |
| 26 | DI_Conveyor_Ready | I3.1 | DI-04/CH1 | 24VDC NPN | 前工序输送线就绪 | 接口 |
| 27 | DI_MES_Trigger | I3.2 | DI-04/CH2 | 24VDC NPN | MES工单触发 | 接口 |
| 28-32 | DI_Spare_xx | I3.3-I3.7 | DI-04/CH3-7 | 24VDC NPN | **预留** | — |

### 二、数字量输出 (DO) — 24点

| 序号 | 标签名(Tag) | PLC地址 | 模块/通道 | 信号类型 | 说明 | 所属区域 |
|------|------------|---------|-----------|----------|------|----------|
| 1 | DO_Pump1_Start | Q0.0 | DO-01/CH0 | 24VDC PNP | 高压泵1启动 | 清洗 |
| 2 | DO_Pump2_Start | Q0.1 | DO-01/CH1 | 24VDC PNP | 高压泵2启动 | 清洗 |
| 3 | DO_US_Enable | Q0.2 | DO-01/CH2 | 24VDC PNP | 超声波使能 | 清洗 |
| 4 | DO_VacPump_Start | Q0.3 | DO-01/CH3 | 24VDC PNP | 真空泵启动 | 干燥 |
| 5 | DO_Gripper_Open | Q0.4 | DO-01/CH4 | 24VDC PNP | 夹爪张开电磁阀 | 搬运 |
| 6 | DO_Gripper_Close | Q0.5 | DO-01/CH5 | 24VDC PNP | 夹爪夹紧电磁阀 | 搬运 |
| 7 | DO_Valve_RoughWash | Q0.6 | DO-01/CH6 | 24VDC PNP | 粗洗工位进水阀 | 清洗 |
| 8 | DO_Valve_FineWash | Q0.7 | DO-01/CH7 | 24VDC PNP | 精洗工位进水阀 | 清洗 |
| 9 | DO_Valve_Rinse | Q1.0 | DO-02/CH0 | 24VDC PNP | 漂洗进水阀 | 清洗 |
| 10 | DO_Valve_Drain | Q1.1 | DO-02/CH1 | 24VDC PNP | 排水阀 | 循环 |
| 11 | DO_Heater_Enable | Q1.2 | DO-02/CH2 | 24VDC PNP | 加热器使能 | 循环 |
| 12 | DO_Filter_Flush | Q1.3 | DO-02/CH3 | 24VDC PNP | 滤芯反冲洗 | 循环 |
| 13 | DO_Lamp_Green | Q1.4 | DO-02/CH4 | 24VDC PNP | 三色灯-绿(运行) | 指示 |
| 14 | DO_Lamp_Yellow | Q1.5 | DO-02/CH5 | 24VDC PNP | 三色灯-黄(报警) | 指示 |
| 15 | DO_Lamp_Red | Q1.6 | DO-02/CH6 | 24VDC PNP | 三色灯-红(故障) | 指示 |
| 16 | DO_Buzzer | Q1.7 | DO-02/CH7 | 24VDC PNP | 蜂鸣器 | 指示 |
| 17 | DO_Conveyor_Done | Q2.0 | DO-03/CH0 | 24VDC PNP | 完成信号(给输送线) | 接口 |
| 18 | DO_MES_Complete | Q2.1 | DO-03/CH1 | 24VDC PNP | 工单完成反馈(给MES) | 接口 |
| 19-24 | DO_Spare_xx | Q2.2-Q2.7 | DO-03/CH2-7 | 24VDC PNP | **预留** | — |

### 三、模拟量输入 (AI) — 8通道

| 序号 | 标签名(Tag) | PLC地址 | 模块/通道 | 信号类型 | 量程 | 单位 | 说明 |
|------|------------|---------|-----------|----------|------|------|------|
| 1 | AI_Pressure_Pump1 | IW64 | AI-01/CH0 | 4-20mA | 0-700bar | bar | 高压泵1出口压力 |
| 2 | AI_Pressure_Pump2 | IW66 | AI-01/CH1 | 4-20mA | 0-700bar | bar | 高压泵2出口压力 |
| 3 | AI_Temp_Tank1 | IW68 | AI-01/CH2 | 4-20mA | 0-100℃ | ℃ | 水箱1温度 |
| 4 | AI_Temp_Tank2 | IW70 | AI-01/CH3 | 4-20mA | 0-100℃ | ℃ | 水箱2温度 |
| 5 | AI_Flow_MainLine | IW72 | AI-01/CH4 | 4-20mA | 0-100L/min | L/min | 主管路流量 |
| 6 | AI_Vacuum_Pressure | IW74 | AI-01/CH5 | 4-20mA | 0-1013mbar | mbar | 真空腔绝对压力 |
| 7 | AI_pH_Value | IW76 | AI-01/CH6 | 4-20mA | 0-14pH | pH | 清洗液pH值 |
| 8 | AI_Conductivity | IW78 | AI-01/CH7 | 4-20mA | 0-200μS/cm | μS/cm | 漂洗水电导率 |

### 四、模拟量输出 (AO) — 4通道

| 序号 | 标签名(Tag) | PLC地址 | 模块/通道 | 信号类型 | 量程 | 单位 | 说明 |
|------|------------|---------|-----------|----------|------|------|------|
| 1 | AO_VFD_Pump1_Speed | QW64 | AO-01/CH0 | 4-20mA | 0-50Hz | Hz | 高压泵1变频器频率 |
| 2 | AO_VFD_Pump2_Speed | QW66 | AO-01/CH1 | 4-20mA | 0-50Hz | Hz | 高压泵2变频器频率 |
| 3 | AO_Heater_Power | QW68 | AO-01/CH2 | 4-20mA | 0-100% | % | 加热器功率设定 |
| 4 | AO_Spare | QW70 | AO-01/CH3 | 4-20mA | — | — | **预留** |

### 五、I/O统计

| 类型 | 已用 | 预留 | 总计 | 使用率 | 余量 |
|------|------|------|------|--------|------|
| DI (数字输入) | 27 | 5 | 32 | 84% | 16% |
| DO (数字输出) | 18 | 6 | 24 | 75% | 25% |
| AI (模拟输入) | 8 | 0 | 8 | 100% | 0% |
| AO (模拟输出) | 3 | 1 | 4 | 75% | 25% |
| **合计** | **56** | **12** | **68** | **82%** | **18%** |

> 注：I/O余量≥15%满足设计规范要求（实际18%）

## 使用说明

1. I/O点表在电气详细设计阶段(M3)编制完成
2. 标签名命名规则：[类型]_[区域/功能]_[编号]，全英文大驼峰
3. PLC地址分配需与PLC程序员确认，避免地址冲突
4. 预留点位在调试阶段可按需分配，但需更新本表
5. 安全相关I/O(DI_EStop/DI_SafeDoor等)必须连接安全PLC模块
6. 模拟量信号统一采用4-20mA(抗干扰优于0-10V)
7. I/O点表与EPLAN项目文件同步维护，存档在PLM`/plm`中
