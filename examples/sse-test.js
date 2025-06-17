#!/usr/bin/env node

/**
 * SSE 模式测试脚本
 * 用于验证启信宝 MCP Server 的 SSE 功能
 */

const http = require('http');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 10000; // 10秒超时

console.log(`🚀 开始测试 SSE 模式: ${SERVER_URL}`);

/**
 * 测试健康检查端点
 */
async function testHealthCheck() {
  console.log('\n📋 测试健康检查端点...');
  
  return new Promise((resolve, reject) => {
    const req = http.get(`${SERVER_URL}/health`, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('✅ 健康检查成功:', result);
          resolve(result);
        } catch (error) {
          console.error('❌ 健康检查失败 - 响应格式错误:', error.message);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ 健康检查请求失败:', error.message);
      reject(error);
    });
    
    req.setTimeout(5000, () => {
      console.error('❌ 健康检查超时');
      req.destroy();
      reject(new Error('Health check timeout'));
    });
  });
}

/**
 * 测试服务器信息端点
 */
async function testServerInfo() {
  console.log('\n📋 测试服务器信息端点...');
  
  return new Promise((resolve, reject) => {
    const req = http.get(`${SERVER_URL}/`, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('✅ 服务器信息获取成功:', result);
          resolve(result);
        } catch (error) {
          console.error('❌ 服务器信息获取失败 - 响应格式错误:', error.message);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ 服务器信息请求失败:', error.message);
      reject(error);
    });
    
    req.setTimeout(5000, () => {
      console.error('❌ 服务器信息请求超时');
      req.destroy();
      reject(new Error('Server info timeout'));
    });
  });
}

/**
 * 测试 SSE 连接
 */
async function testSSEConnection() {
  console.log('\n📋 测试 SSE 连接...');
  
  return new Promise((resolve, reject) => {
    const req = http.get(`${SERVER_URL}/mcp`, (res) => {
      console.log(`SSE 连接状态码: ${res.statusCode}`);
      console.log('SSE 响应头:', res.headers);
      
      if (res.statusCode !== 200) {
        reject(new Error(`SSE connection failed with status ${res.statusCode}`));
        return;
      }
      
      let eventCount = 0;
      let receivedConnected = false;
      
      res.on('data', (chunk) => {
        const data = chunk.toString();
        console.log('📨 收到 SSE 数据:', data.trim());
        
        // 解析 SSE 事件
        const lines = data.split('\n');
        for (const line of lines) {
          if (line.startsWith('event: connected')) {
            receivedConnected = true;
            console.log('✅ 收到连接确认事件');
          } else if (line.startsWith('event: heartbeat')) {
            console.log('💓 收到心跳事件');
          }
        }
        
        eventCount++;
        
        // 收到连接确认后就认为测试成功
        if (receivedConnected) {
          setTimeout(() => {
            req.destroy();
            console.log(`✅ SSE 连接测试成功，收到 ${eventCount} 个事件`);
            resolve({ eventCount, receivedConnected });
          }, 1000);
        }
      });
      
      res.on('error', (error) => {
        console.error('❌ SSE 连接错误:', error.message);
        reject(error);
      });
      
      res.on('end', () => {
        console.log('📤 SSE 连接已结束');
        if (!receivedConnected) {
          reject(new Error('SSE connection ended without receiving connected event'));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ SSE 连接请求失败:', error.message);
      reject(error);
    });
    
    req.setTimeout(TEST_TIMEOUT, () => {
      console.error('❌ SSE 连接测试超时');
      req.destroy();
      reject(new Error('SSE connection timeout'));
    });
  });
}

/**
 * 运行所有测试
 */
async function runTests() {
  console.log('📊 开始 SSE 模式功能测试\n');
  
  const results = {
    healthCheck: false,
    serverInfo: false,
    sseConnection: false
  };
  
  try {
    // 测试健康检查
    await testHealthCheck();
    results.healthCheck = true;
  } catch (error) {
    console.error('健康检查测试失败:', error.message);
  }
  
  try {
    // 测试服务器信息
    await testServerInfo();
    results.serverInfo = true;
  } catch (error) {
    console.error('服务器信息测试失败:', error.message);
  }
  
  try {
    // 测试 SSE 连接
    await testSSEConnection();
    results.sseConnection = true;
  } catch (error) {
    console.error('SSE 连接测试失败:', error.message);
  }
  
  // 输出测试结果摘要
  console.log('\n📊 测试结果摘要:');
  console.log(`  健康检查: ${results.healthCheck ? '✅ 通过' : '❌ 失败'}`);
  console.log(`  服务器信息: ${results.serverInfo ? '✅ 通过' : '❌ 失败'}`);
  console.log(`  SSE 连接: ${results.sseConnection ? '✅ 通过' : '❌ 失败'}`);
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log(`\n总体结果: ${passedTests}/${totalTests} 测试通过`);
  
  if (passedTests === totalTests) {
    console.log('🎉 所有测试通过！SSE 模式运行正常。');
    process.exit(0);
  } else {
    console.log('⚠️  部分测试失败，请检查服务器状态。');
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  runTests().catch((error) => {
    console.error('💥 测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  testHealthCheck,
  testServerInfo,
  testSSEConnection,
  runTests
}; 