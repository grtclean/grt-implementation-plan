/**
 * 简道云 API 测试脚本
 * 用于调试API连接问题
 */

import 'dotenv/config';

const API_KEY = process.env.JIANDAOYUN_API_KEY;
const CORP_ID = process.env.JIANDAOYUN_CORP_ID;
const BASE_URL = 'https://api.jiandaoyun.com/api/v5';

console.log('=== 简道云 API 测试 ===');
console.log('API Key:', API_KEY ? `${API_KEY.substring(0, 10)}...` : 'NOT SET');
console.log('Corp ID:', CORP_ID || 'NOT SET');
console.log('');

async function testAPI(endpoint, body = {}) {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`Testing: POST ${url}`);
  console.log('Body:', JSON.stringify(body));
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    console.log('Status:', response.status, response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('Response:', text.substring(0, 1000));
    
    if (text) {
      try {
        const json = JSON.parse(text);
        console.log('Parsed JSON:', JSON.stringify(json, null, 2).substring(0, 500));
      } catch (e) {
        console.log('Not valid JSON');
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
  console.log('---');
}

// 测试不同的端点
async function runTests() {
  // 测试1: 获取应用列表
  await testAPI('/app/list', {});
  
  // 测试2: 使用corp路径获取应用列表
  if (CORP_ID) {
    const corpUrl = `https://api.jiandaoyun.com/api/v5/corp/${CORP_ID}/app/list`;
    console.log(`Testing Corp URL: POST ${corpUrl}`);
    try {
      const response = await fetch(corpUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      console.log('Status:', response.status, response.statusText);
      const text = await response.text();
      console.log('Response:', text.substring(0, 500));
    } catch (error) {
      console.error('Error:', error.message);
    }
    console.log('---');
  }
}

runTests();
