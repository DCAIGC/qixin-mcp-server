# SSE模式客户端配置示例

## 🔑 认证方式

SSE模式现在支持多种方式传递API密钥，实现类似env参数的功能：

### 方法1：HTTP头部认证（推荐）

```javascript
// JavaScript客户端示例
const eventSource = new EventSource('http://localhost:3000/mcp');

// 发送POST请求时携带认证头部
async function queryWithHeaders(keyword) {
  const response = await fetch('http://localhost:3000/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Qixin-App-Key': 'your_app_key_here',
      'X-Qixin-Secret-Key': 'your_secret_key_here'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'get_enterprise_basic_info',
        arguments: { keyword }
      }
    })
  });
  return await response.json();
}
```

### 方法2：Authorization头部认证

```javascript
// Bearer Token方式
const appKey = 'your_app_key';
const secretKey = 'your_secret_key';
const token = `${appKey}:${secretKey}`;

fetch('http://localhost:3000/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(message)
});

// Basic Auth方式
const credentials = btoa(`${appKey}:${secretKey}`);
fetch('http://localhost:3000/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${credentials}`
  },
  body: JSON.stringify(message)
});
```

### 方法3：URL查询参数

```javascript
// SSE连接时传递参数
const eventSource = new EventSource(
  'http://localhost:3000/mcp?app_key=your_app_key&secret_key=your_secret_key'
);

// POST请求时传递参数
fetch('http://localhost:3000/mcp?app_key=your_app_key&secret_key=your_secret_key', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(message)
});
```

## 🔧 MCP客户端配置

### 支持HTTP的MCP客户端

```json
{
  "mcpServers": {
    "qixin-sse": {
      "url": "http://localhost:3000/mcp",
      "type": "sse",
      "headers": {
        "X-Qixin-App-Key": "your_app_key",
        "X-Qixin-Secret-Key": "your_secret_key"
      }
    }
  }
}
```

### Web应用配置

```javascript
class QixinMCPClient {
  constructor(baseUrl, appKey, secretKey) {
    this.baseUrl = baseUrl;
    this.appKey = appKey;
    this.secretKey = secretKey;
    this.eventSource = null;
  }

  connect() {
    // 建立SSE连接
    this.eventSource = new EventSource(
      `${this.baseUrl}?app_key=${this.appKey}&secret_key=${this.secretKey}`
    );
    
    this.eventSource.addEventListener('connected', (event) => {
      console.log('已连接到MCP服务器');
    });
    
    this.eventSource.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    });
  }

  async sendMessage(message) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Qixin-App-Key': this.appKey,
        'X-Qixin-Secret-Key': this.secretKey
      },
      body: JSON.stringify(message)
    });
    return await response.json();
  }

  async queryEnterprise(keyword) {
    return await this.sendMessage({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'get_enterprise_basic_info',
        arguments: { keyword }
      }
    });
  }
}

// 使用示例
const client = new QixinMCPClient(
  'http://localhost:3000/mcp',
  'your_app_key',
  'your_secret_key'
);

client.connect();
client.queryEnterprise('腾讯科技').then(result => {
  console.log('查询结果:', result);
});
```

## 🐍 Python客户端示例

```python
import requests
import json
from sseclient import SSEClient

class QixinMCPClient:
    def __init__(self, base_url, app_key, secret_key):
        self.base_url = base_url
        self.app_key = app_key
        self.secret_key = secret_key
        self.headers = {
            'X-Qixin-App-Key': app_key,
            'X-Qixin-Secret-Key': secret_key
        }

    def connect_sse(self):
        """建立SSE连接"""
        url = f"{self.base_url}?app_key={self.app_key}&secret_key={self.secret_key}"
        return SSEClient(url)

    def send_message(self, message):
        """发送POST消息"""
        response = requests.post(
            self.base_url,
            headers={**self.headers, 'Content-Type': 'application/json'},
            json=message
        )
        return response.json()

    def query_enterprise(self, keyword):
        """查询企业信息"""
        message = {
            'jsonrpc': '2.0',
            'id': 1,
            'method': 'tools/call',
            'params': {
                'name': 'get_enterprise_basic_info',
                'arguments': {'keyword': keyword}
            }
        }
        return self.send_message(message)

# 使用示例
client = QixinMCPClient(
    'http://localhost:3000/mcp',
    'your_app_key',
    'your_secret_key'
)

# 查询企业信息
result = client.query_enterprise('腾讯科技')
print('查询结果:', result)
```

## 📱 移动应用配置

### React Native示例

```javascript
import { NativeEventSource } from 'react-native-event-source';

class QixinMCPClient {
  constructor(baseUrl, appKey, secretKey) {
    this.baseUrl = baseUrl;
    this.appKey = appKey;
    this.secretKey = secretKey;
  }

  connect() {
    this.eventSource = new NativeEventSource(
      `${this.baseUrl}?app_key=${this.appKey}&secret_key=${this.secretKey}`
    );
    
    this.eventSource.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    });
  }

  async queryEnterprise(keyword) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Qixin-App-Key': this.appKey,
        'X-Qixin-Secret-Key': this.secretKey
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: 'get_enterprise_basic_info',
          arguments: { keyword }
        }
      })
    });
    return await response.json();
  }
}
```

## 🔒 安全考虑

1. **HTTPS使用**：生产环境建议使用HTTPS
2. **密钥保护**：不要在客户端代码中硬编码密钥
3. **环境变量**：在客户端应用中使用环境变量存储密钥
4. **访问控制**：考虑添加IP白名单或其他访问控制

## 🧪 测试认证功能

```bash
# 测试HTTP头部认证
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "X-Qixin-App-Key: your_app_key" \
  -H "X-Qixin-Secret-Key: your_secret_key" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_enterprise_basic_info","arguments":{"keyword":"腾讯科技"}}}'

# 测试Authorization头部认证
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_app_key:your_secret_key" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_enterprise_basic_info","arguments":{"keyword":"腾讯科技"}}}'

# 测试URL参数认证
curl -X POST "http://localhost:3000/mcp?app_key=your_app_key&secret_key=your_secret_key" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_enterprise_basic_info","arguments":{"keyword":"腾讯科技"}}}'

# 测试SSE连接认证
curl -N "http://localhost:3000/mcp?app_key=your_app_key&secret_key=your_secret_key"
``` 