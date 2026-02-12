/**
 * Redis连接测试脚本
 * 用于验证Redis配置是否正确
 * 
 * 使用方法:
 * 1. 设置REDIS_URL环境变量
 * 2. 运行: node scripts/test-redis-connection.mjs
 */

import { createClient } from 'redis';

async function testRedisConnection() {
  const redisUrl = process.env.REDIS_URL;
  
  console.log('='.repeat(60));
  console.log('Redis连接测试');
  console.log('='.repeat(60));
  
  if (!redisUrl) {
    console.log('\n⚠️ 未配置REDIS_URL环境变量');
    console.log('\n配置方法:');
    console.log('1. 在Manus Settings → Secrets中添加REDIS_URL');
    console.log('2. 格式: redis://username:password@host:port');
    console.log('\n推荐的Redis服务商:');
    console.log('- Upstash: https://upstash.com (免费层可用)');
    console.log('- Redis Cloud: https://redis.com/try-free/');
    console.log('- Railway: https://railway.app');
    console.log('\n当前系统将使用内存缓存作为替代方案');
    return;
  }
  
  console.log(`\n📡 连接到: ${redisUrl.replace(/:[^:@]+@/, ':****@')}`);
  
  try {
    const client = createClient({ url: redisUrl });
    
    client.on('error', (err) => {
      console.error('❌ Redis错误:', err.message);
    });
    
    await client.connect();
    console.log('✅ Redis连接成功!');
    
    // 测试基本操作
    console.log('\n📝 测试基本操作...');
    
    // 测试SET
    const testKey = 'grt:test:connection';
    const testValue = { timestamp: Date.now(), message: 'Hello from GRT System' };
    await client.setEx(testKey, 60, JSON.stringify(testValue));
    console.log('✅ SET操作成功');
    
    // 测试GET
    const retrieved = await client.get(testKey);
    const parsed = JSON.parse(retrieved);
    console.log('✅ GET操作成功');
    console.log(`   数据: ${JSON.stringify(parsed)}`);
    
    // 测试DEL
    await client.del(testKey);
    console.log('✅ DEL操作成功');
    
    // 获取服务器信息
    const info = await client.info('server');
    const version = info.match(/redis_version:(\S+)/)?.[1] || 'unknown';
    console.log(`\n📊 Redis版本: ${version}`);
    
    // 测试性能
    console.log('\n⚡ 性能测试...');
    const iterations = 100;
    const start = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      await client.set(`grt:perf:${i}`, `value-${i}`);
    }
    
    const writeTime = Date.now() - start;
    console.log(`   写入${iterations}次: ${writeTime}ms (${(writeTime / iterations).toFixed(2)}ms/次)`);
    
    const readStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      await client.get(`grt:perf:${i}`);
    }
    
    const readTime = Date.now() - readStart;
    console.log(`   读取${iterations}次: ${readTime}ms (${(readTime / iterations).toFixed(2)}ms/次)`);
    
    // 清理测试数据
    for (let i = 0; i < iterations; i++) {
      await client.del(`grt:perf:${i}`);
    }
    
    await client.quit();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Redis配置验证完成，所有测试通过!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Redis连接失败:', error.message);
    console.log('\n可能的原因:');
    console.log('1. REDIS_URL格式不正确');
    console.log('2. Redis服务器不可达');
    console.log('3. 认证信息错误');
    console.log('4. 防火墙阻止连接');
    console.log('\n当前系统将使用内存缓存作为替代方案');
  }
}

testRedisConnection();
