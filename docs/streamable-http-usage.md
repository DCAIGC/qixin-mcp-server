# Streamable HTTP Mode Usage Guide

## Overview

The Streamable HTTP mode provides streaming HTTP responses for platforms like Dify that don't support Server-Sent Events (SSE). This mode uses newline-delimited JSON (NDJSON) format to stream responses back to the client.

## Starting the Server

### Using npm scripts:
```bash
# Development mode with hot reload
npm run dev:streamable-http

# Production mode
npm run build
npm run start:streamable-http
```

### Using environment variables:
```bash
# Set environment variable
export MCP_STREAMABLE_HTTP=true
npm start

# Or inline
MCP_STREAMABLE_HTTP=true node dist/server.js
```

### Using command line arguments:
```bash
node dist/server.js --streamable-http
```

### Docker:
```bash
# Build with streamable HTTP mode enabled
docker build -t qixin-mcp-streamable-http .

# Run with environment variable
docker run -p 3000:3000 -e MCP_STREAMABLE_HTTP=true \
  -e QIXIN_APP_KEY=your_app_key \
  -e QIXIN_SECRET_KEY=your_secret_key \
  qixin-mcp-streamable-http
```

## API Endpoints

### 1. POST /stream - Send JSON-RPC Request

Send JSON-RPC requests and receive streaming responses in NDJSON format.

**Request:**
```http
POST /stream HTTP/1.1
Content-Type: application/json
X-Qixin-App-Key: your_app_key
X-Qixin-Secret-Key: your_secret_key

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_enterprise_basic_info",
    "arguments": {
      "keyword": "阿里巴巴"
    }
  }
}
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/x-ndjson
Transfer-Encoding: chunked
Cache-Control: no-cache

{"jsonrpc":"2.0","id":1,"result":{"content":[{"type":"text","text":"{\"name\":\"阿里巴巴\",\"credit_code\":\"91330100799655058B\"...}"}]}}
```

### 2. GET /health - Health Check

Check the server's health status.

**Request:**
```http
GET /health HTTP/1.1
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-07-27T10:00:00.000Z",
  "server": "qixin-mcp-server",
  "mode": "streamable-http",
  "version": "1.0.0"
}
```

### 3. GET / - Server Information

Get information about the server and available endpoints.

**Request:**
```http
GET / HTTP/1.1
```

**Response:**
```json
{
  "message": "Qixin MCP Server - Streamable HTTP Mode",
  "description": "This mode provides streaming HTTP responses for platforms that do not support SSE",
  "endpoints": {
    "stream": "/stream (POST) - Send JSON-RPC requests and receive streaming responses",
    "health": "/health - Health check"
  },
  "authentication": {
    "methods": [
      "HTTP Headers: X-Qixin-App-Key and X-Qixin-Secret-Key",
      "Authorization Header: Bearer appkey:secretkey or Basic base64(appkey:secretkey)",
      "Query Parameters: ?app_key=xxx&secret_key=xxx"
    ]
  }
}
```

## Authentication

The Streamable HTTP mode supports three authentication methods:

### 1. HTTP Headers (Recommended)
```http
X-Qixin-App-Key: your_app_key
X-Qixin-Secret-Key: your_secret_key
```

### 2. Authorization Header
```http
# Bearer format
Authorization: Bearer your_app_key:your_secret_key

# Basic format
Authorization: Basic base64(your_app_key:your_secret_key)
```

### 3. Query Parameters
```
POST /stream?app_key=your_app_key&secret_key=your_secret_key
```

## Integration with Dify

To integrate with Dify, follow these steps:

1. **Start the server in Streamable HTTP mode:**
   ```bash
   MCP_STREAMABLE_HTTP=true npm start
   ```

2. **Configure Dify to use the streaming endpoint:**
   - URL: `http://your-server:3000/stream`
   - Method: POST
   - Headers:
     - `Content-Type: application/json`
     - `X-Qixin-App-Key: your_app_key`
     - `X-Qixin-Secret-Key: your_secret_key`

3. **Send JSON-RPC requests in the expected format:**
   ```json
   {
     "jsonrpc": "2.0",
     "id": 1,
     "method": "tools/call",
     "params": {
       "name": "tool_name",
       "arguments": {
         // tool-specific arguments
       }
     }
   }
   ```

## Available Tools

All the same tools available in SSE mode are also available in Streamable HTTP mode:

- `get_enterprise_basic_info` - Query enterprise basic information
- `search_enterprise` - Fuzzy search for enterprises
- `get_enterprise_contact` - Get enterprise contact information
- `get_enterprise_size` - Query enterprise size classification
- `get_executed_enterprise` - Query enterprise execution cases
- `get_dishonest_enterprise` - Query dishonest enterprise information
- `get_legal_documents` - Retrieve legal judgment documents
- `get_enterprise_genealogy3` - Query three-layer enterprise relationships
- `get_admin_penalty` - Query administrative penalties
- `get_serious_illegal` - Query serious illegal activities
- `get_guarantee_list` - Query external guarantees

## Response Format

Responses are streamed back in NDJSON format (newline-delimited JSON). Each line contains a complete JSON object:

```json
{"jsonrpc":"2.0","id":1,"result":{"content":[{"type":"text","text":"..."}]}}
```

For error responses:
```json
{"jsonrpc":"2.0","id":1,"error":{"code":-32603,"message":"Internal error","data":"Error details"}}
```

## Example Client Code

### Python Example
```python
import requests
import json

url = "http://localhost:3000/stream"
headers = {
    "Content-Type": "application/json",
    "X-Qixin-App-Key": "your_app_key",
    "X-Qixin-Secret-Key": "your_secret_key"
}

request_data = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
        "name": "get_enterprise_basic_info",
        "arguments": {
            "keyword": "阿里巴巴"
        }
    }
}

response = requests.post(url, json=request_data, headers=headers, stream=True)

for line in response.iter_lines():
    if line:
        data = json.loads(line)
        print(json.dumps(data, indent=2, ensure_ascii=False))
```

### Node.js Example
```javascript
const axios = require('axios');

const url = 'http://localhost:3000/stream';
const headers = {
  'Content-Type': 'application/json',
  'X-Qixin-App-Key': 'your_app_key',
  'X-Qixin-Secret-Key': 'your_secret_key'
};

const requestData = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'get_enterprise_basic_info',
    arguments: {
      keyword: '阿里巴巴'
    }
  }
};

axios.post(url, requestData, { 
  headers,
  responseType: 'stream' 
})
.then(response => {
  response.data.on('data', chunk => {
    const lines = chunk.toString().trim().split('\n');
    lines.forEach(line => {
      if (line) {
        const data = JSON.parse(line);
        console.log(JSON.stringify(data, null, 2));
      }
    });
  });
})
.catch(error => {
  console.error('Error:', error);
});
```

## Troubleshooting

### Connection Issues
- Ensure the server is running in Streamable HTTP mode
- Check that the port (default 3000) is accessible
- Verify authentication credentials are correct

### Response Not Streaming
- Some HTTP clients buffer responses. Use streaming-capable clients
- Nginx or other proxies may buffer responses. Add `X-Accel-Buffering: no` header

### Authentication Failures
- Verify API keys are correct and properly formatted
- Check that the authentication method matches what the server expects
- Ensure credentials have proper permissions

## Performance Considerations

- Streamable HTTP mode uses chunked transfer encoding for efficient streaming
- Each request creates a new HTTP connection
- For high-frequency requests, consider connection pooling
- Response streaming reduces memory usage for large responses