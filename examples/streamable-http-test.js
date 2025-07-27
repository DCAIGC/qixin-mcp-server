/**
 * Streamable HTTP 模式测试脚本
 */

const http = require('http');

// 配置
const config = {
  host: 'localhost',
  port: 3000,
  appKey: process.env.QIXIN_APP_KEY || 'your_app_key',
  secretKey: process.env.QIXIN_SECRET_KEY || 'your_secret_key'
};

/**
 * 发送 JSON-RPC 请求并处理流式响应
 */
function sendStreamableRequest(method, params) {
  return new Promise((resolve, reject) => {
    const requestData = JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    });

    const options = {
      hostname: config.host,
      port: config.port,
      path: '/stream',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData),
        'X-Qixin-App-Key': config.appKey,
        'X-Qixin-Secret-Key': config.secretKey
      }
    };

    const req = http.request(options, (res) => {
      console.log(`响应状态码: ${res.statusCode}`);
      console.log(`响应头:`, res.headers);
      
      let buffer = '';
      const results = [];

      res.on('data', (chunk) => {
        buffer += chunk.toString();
        
        // 处理可能的多行响应
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留最后一个不完整的行
        
        lines.forEach(line => {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              console.log('收到响应:', JSON.stringify(data, null, 2));
              results.push(data);
            } catch (error) {
              console.error('解析JSON失败:', error.message, 'Line:', line);
            }
          }
        });
      });

      res.on('end', () => {
        // 处理剩余的缓冲区数据
        if (buffer.trim()) {
          try {
            const data = JSON.parse(buffer);
            console.log('收到最终响应:', JSON.stringify(data, null, 2));
            results.push(data);
          } catch (error) {
            console.error('解析最终数据失败:', error.message);
          }
        }
        resolve(results);
      });

      res.on('error', reject);
    });

    req.on('error', reject);
    req.write(requestData);
    req.end();
  });
}

/**
 * 测试各种工具
 */
async function runTests() {
  console.log('=== Streamable HTTP 模式测试 ===\n');

  try {
    // 测试1: 查询企业基本信息
    console.log('1. 测试查询企业基本信息...');
    await sendStreamableRequest('tools/call', {
      name: 'get_enterprise_basic_info',
      arguments: {
        keyword: '阿里巴巴'
      }
    });
    console.log('\n');

    // 测试2: 企业模糊搜索
    console.log('2. 测试企业模糊搜索...');
    await sendStreamableRequest('tools/call', {
      name: 'search_enterprise',
      arguments: {
        keyword: '腾讯',
        skip: 0
      }
    });
    console.log('\n');

    // 测试3: 获取工具列表
    console.log('3. 测试获取工具列表...');
    await sendStreamableRequest('tools/list', {});
    console.log('\n');

    // 测试4: 错误处理 - 无效的工具名
    console.log('4. 测试错误处理...');
    await sendStreamableRequest('tools/call', {
      name: 'invalid_tool',
      arguments: {}
    });
    console.log('\n');

  } catch (error) {
    console.error('测试失败:', error);
  }
}

/**
 * 健康检查
 */
async function healthCheck() {
  return new Promise((resolve, reject) => {
    http.get(`http://${config.host}:${config.port}/health`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('健康检查结果:', data);
        resolve(JSON.parse(data));
      });
    }).on('error', reject);
  });
}

/**
 * 主函数
 */
async function main() {
  try {
    // 先进行健康检查
    console.log('进行健康检查...');
    const health = await healthCheck();
    
    if (health.status !== 'healthy') {
      throw new Error('服务器不健康');
    }
    
    if (health.mode !== 'streamable-http') {
      console.warn(`警告: 服务器运行在 ${health.mode} 模式，而不是 streamable-http 模式`);
    }
    
    console.log('服务器健康，开始测试...\n');
    
    // 运行测试
    await runTests();
    
  } catch (error) {
    console.error('错误:', error.message);
    process.exit(1);
  }
}

// 运行主函数
main();