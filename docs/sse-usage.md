# SSE 模式使用指南

## 概述

启信宝 MCP Server 支持 SSE (Server-Sent Events) 模式，提供基于 HTTP 的实时通信能力。SSE 模式允许客户端通过标准的 HTTP 协议与 MCP 服务器进行交互。

## 启动 SSE 模式

### 方法 1：命令行参数

```bash
# 使用 --sse 参数启动
npx qixin-mcp-server --sse

# 或者从项目目录
npm start -- --sse
```

### 方法 2：环境变量

```bash
# 设置环境变量
export MCP_SSE=true
export PORT=3000  # 可选，默认 3000

# 启动服务器
npx qixin-mcp-server
```

### 方法 3：配置文件

在 `.env` 文件中设置：

```env
MCP_SSE=true
PORT=8080
QIXIN_APP_KEY=your_app_key
QIXIN_SECRET_KEY=your_secret_key
```

## 可用端点

### 1. SSE 连接端点

```
GET /mcp
```

建立 Server-Sent Events 连接，接收 MCP 协议消息。

**响应头：**
- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `Connection: keep-alive`

**事件类型：**
- `connected`: 连接建立确认
- `message`: MCP 协议消息
- `heartbeat`: 心跳消息（每30秒）
- `close`: 连接关闭

### 2. 消息发送端点

```
POST /mcp
```

向服务器发送 JSON-RPC 消息。

**请求头：**
- `Content-Type: application/json`

**请求体示例：**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_enterprise_basic_info",
    "arguments": {
      "keyword": "腾讯科技"
    }
  }
}
```

### 3. 健康检查端点

```
GET /health
```

获取服务器健康状态和统计信息。

**响应示例：**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "activeConnections": 2,
  "server": "qixin-mcp-server",
  "version": "1.0.0"
}
```

### 4. 服务器信息端点

```
GET /
```

获取服务器基本信息和可用端点列表。

## 使用示例

### JavaScript 客户端示例

```javascript
// 建立 SSE 连接
const eventSource = new EventSource('http://localhost:3000/mcp');

// 监听连接确认
eventSource.addEventListener('connected', (event) => {
  console.log('已连接到服务器:', JSON.parse(event.data));
});

// 监听 MCP 消息
eventSource.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  console.log('收到消息:', message);
});

// 监听心跳
eventSource.addEventListener('heartbeat', (event) => {
  console.log('心跳:', JSON.parse(event.data));
});

// 发送查询请求
async function queryEnterprise(keyword) {
  const response = await fetch('http://localhost:3000/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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

// 使用示例
queryEnterprise('腾讯科技').then(result => {
  console.log('查询结果:', result);
});
```

### cURL 示例

```bash
# 健康检查
curl http://localhost:3000/health

# 发送查询请求
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_enterprise_basic_info",
      "arguments": {
        "keyword": "腾讯科技"
      }
    }
  }'

# 监听 SSE 事件
curl -N http://localhost:3000/mcp
```

## 测试 SSE 功能

项目提供了测试脚本来验证 SSE 功能：

```bash
# 启动 SSE 服务器（在一个终端中）
MCP_SSE=true npm start

# 运行测试（在另一个终端中）
node examples/sse-test.js
```

## 配置选项

| 环境变量 | 默认值 | 描述 |
|----------|---------|------|
| `MCP_SSE` | `false` | 是否启用 SSE 模式 |
| `PORT` | `3000` | SSE 服务端口 |
| `QIXIN_APP_KEY` | - | 启信宝 API Key（必需） |
| `QIXIN_SECRET_KEY` | - | 启信宝 Secret Key（必需） |

## 注意事项

1. **CORS 支持**: 服务器默认支持跨域请求，适合前端应用调用
2. **连接管理**: 服务器会自动处理连接的建立和清理
3. **心跳机制**: 每30秒发送心跳消息以保持连接活跃
4. **优雅关闭**: 支持 SIGINT/SIGTERM 信号的优雅关闭
5. **错误处理**: 提供详细的错误信息和状态码

## 故障排除

### 连接问题

```bash
# 检查服务器是否启动
curl http://localhost:3000/health

# 检查端口是否被占用
netstat -an | grep 3000
```

### 日志调试

```bash
# 启用详细日志
LOG_LEVEL=debug MCP_SSE=true npm start
```

### 常见错误

1. **端口被占用**: 更改 `PORT` 环境变量
2. **API 密钥未设置**: 检查 `QIXIN_APP_KEY` 和 `QIXIN_SECRET_KEY`
3. **CORS 错误**: 确保请求包含正确的头部信息 