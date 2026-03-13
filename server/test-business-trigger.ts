/**
 * 业务触发器测试脚本
 * 模拟项目阶段变更，测试自动通知发送到钉钉群
 */

import crypto from 'crypto';

// 钉钉配置（从环境变量读取，禁止硬编码）
const DINGTALK_WEBHOOK_URL = process.env.DINGTALK_WEBHOOK_URL ?? '';
const DINGTALK_SECRET = process.env.DINGTALK_WEBHOOK_SECRET ?? '';
const DINGTALK_KEYWORD = '1';

// 创建钉钉签名
function createSignature(timestamp: number, secret: string): string {
  const stringToSign = `${timestamp}\n${secret}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(stringToSign);
  return hmac.digest('base64');
}

// 模拟项目阶段变更数据
const mockProjectGateChange = {
  projectId: 'PRJ-2026-001',
  projectName: 'GRT智能清洗设备项目',
  previousGate: 'M3',
  previousGateName: '方案设计',
  currentGate: 'M4',
  currentGateName: '详细设计',
  changedBy: '孙国祥',
  changedAt: new Date().toISOString(),
  reviewResult: '通过',
  reviewComments: '方案设计评审通过，进入详细设计阶段',
};

// 模拟成本预警数据
const mockCostAlert = {
  projectId: 'PRJ-2026-001',
  projectName: 'GRT智能清洗设备项目',
  budgetTotal: 500000,
  actualCost: 425000,
  usageRate: 85,
  alertLevel: 'warning',
  threshold: 80,
  message: '项目成本已达预算的85%，请关注成本控制',
};

async function testProjectGateChangeTrigger() {
  console.log('\n📋 测试项目阶段变更触发器...');
  console.log('   项目:', mockProjectGateChange.projectName);
  console.log('   阶段变更:', `${mockProjectGateChange.previousGate}(${mockProjectGateChange.previousGateName}) → ${mockProjectGateChange.currentGate}(${mockProjectGateChange.currentGateName})`);
  
  const timestamp = Date.now();
  const sign = createSignature(timestamp, DINGTALK_SECRET);
  
  const message = {
    msgtype: 'markdown',
    markdown: {
      title: `🚀 项目阶段变更通知 - ${DINGTALK_KEYWORD}`,
      text: `### 🚀 项目阶段变更通知

**项目名称**: ${mockProjectGateChange.projectName}

**阶段变更**: ${mockProjectGateChange.previousGate}(${mockProjectGateChange.previousGateName}) → ${mockProjectGateChange.currentGate}(${mockProjectGateChange.currentGateName})

**评审结果**: ${mockProjectGateChange.reviewResult}

**评审意见**: ${mockProjectGateChange.reviewComments}

**操作人**: ${mockProjectGateChange.changedBy}

**变更时间**: ${new Date(mockProjectGateChange.changedAt).toLocaleString('zh-CN')}

---
*GRT智能系统自动通知 - ${DINGTALK_KEYWORD}*`,
    },
  };
  
  const url = `${DINGTALK_WEBHOOK_URL}&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    
    const result = await response.json();
    
    if (result.errcode === 0) {
      console.log('✅ 项目阶段变更通知发送成功！');
      return true;
    } else {
      console.log('❌ 发送失败:', result.errmsg);
      return false;
    }
  } catch (error) {
    console.log('❌ 发送异常:', error);
    return false;
  }
}

async function testCostAlertTrigger() {
  console.log('\n💰 测试成本预警触发器...');
  console.log('   项目:', mockCostAlert.projectName);
  console.log('   预算使用率:', `${mockCostAlert.usageRate}%`);
  console.log('   预警级别:', mockCostAlert.alertLevel);
  
  const timestamp = Date.now();
  const sign = createSignature(timestamp, DINGTALK_SECRET);
  
  const alertEmoji = mockCostAlert.alertLevel === 'critical' ? '🚨' : '⚠️';
  
  const message = {
    msgtype: 'markdown',
    markdown: {
      title: `${alertEmoji} 成本预警 - ${DINGTALK_KEYWORD}`,
      text: `### ${alertEmoji} 成本预警通知

**项目名称**: ${mockCostAlert.projectName}

**预算总额**: ¥${mockCostAlert.budgetTotal.toLocaleString()}

**实际成本**: ¥${mockCostAlert.actualCost.toLocaleString()}

**使用率**: ${mockCostAlert.usageRate}%

**预警阈值**: ${mockCostAlert.threshold}%

**预警信息**: ${mockCostAlert.message}

---
*GRT智能系统成本预警 - ${DINGTALK_KEYWORD}*`,
    },
  };
  
  const url = `${DINGTALK_WEBHOOK_URL}&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    
    const result = await response.json();
    
    if (result.errcode === 0) {
      console.log('✅ 成本预警通知发送成功！');
      return true;
    } else {
      console.log('❌ 发送失败:', result.errmsg);
      return false;
    }
  } catch (error) {
    console.log('❌ 发送异常:', error);
    return false;
  }
}

async function main() {
  console.log('🔔 开始测试业务触发器...\n');
  console.log('=' .repeat(50));
  
  // 测试项目阶段变更触发器
  const gateResult = await testProjectGateChangeTrigger();
  
  // 等待2秒避免频率限制
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 测试成本预警触发器
  const costResult = await testCostAlertTrigger();
  
  console.log('\n' + '=' .repeat(50));
  console.log('\n📊 测试结果汇总:');
  console.log(`   项目阶段变更通知: ${gateResult ? '✅ 成功' : '❌ 失败'}`);
  console.log(`   成本预警通知: ${costResult ? '✅ 成功' : '❌ 失败'}`);
  
  if (gateResult && costResult) {
    console.log('\n🎉 所有业务触发器测试通过！');
    console.log('   请检查钉钉群是否收到以下消息:');
    console.log('   1. 项目阶段变更通知 (M3→M4)');
    console.log('   2. 成本预警通知 (85%使用率)');
  }
}

main().catch(console.error);
