# 启信宝工商照面信息查询 MCP Server

基于 Model Context Protocol (MCP) 的企业工商信息查询服务，为 AI 助手提供实时的企业基本信息查询能力。

## 功能特性

- 🔍 企业基本信息查询：支持通过企业名称、统一社会信用代码等关键词查询
- 🔐 安全的 API 认证：使用 MD5 签名算法保证 API 调用安全
- ⚡ 高性能设计：支持请求重试、错误处理和日志记录
- 🛠️ 多种运行模式：支持 stdio 和 SSE 两种运行方式
- 📦 TypeScript 开发：提供完整的类型定义和代码提示

## 快速开始

### 1. 安装

```bash
# 克隆项目
git clone <repository-url>
cd qixin-mcp-server

# 安装依赖
npm install

# 构建项目
npm run build
```

### 2. 配置

复制环境变量示例文件并配置您的 API 密钥：

```bash
cp env.example .env
```

编辑 `.env` 文件，填入您的启信宝 API 密钥：

```env
QIXIN_APP_KEY=your_app_key_here
QIXIN_SECRET_KEY=your_secret_key_here
```

### 3. 运行

#### NPX 方式（推荐）

```bash
npx qixin-mcp-server
```

#### 直接运行

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

#### SSE 模式

```bash
# 通过命令行参数
npx qixin-mcp-server --sse

# 或通过环境变量
MCP_SSE=true npx qixin-mcp-server

# 使用自定义端口
PORT=8080 MCP_SSE=true npx qixin-mcp-server
```

SSE 模式提供以下端点：
- `GET /mcp` - Server-Sent Events 连接
- `POST /mcp` - 发送 JSON-RPC 消息
- `GET /health` - 健康检查
- `GET /` - 服务器信息

详细使用方法请参考 [SSE 使用指南](docs/sse-usage.md)。

## 使用方法

### 在 AI 客户端中配置

在支持 MCP 协议的 AI 客户端（如 Claude Desktop）中添加以下配置：

```json
{
  "mcpServers": {
    "qixin": {
      "command": "npx",
      "args": ["qixin-mcp-server"],
      "env": {
        "QIXIN_APP_KEY": "your_app_key",
        "QIXIN_SECRET_KEY": "your_secret_key"
      }
    }
  }
}
```

### 可用工具

#### `get_enterprise_basic_info`

查询企业基本信息。

**参数：**
- `keyword` (string, 必需): 查询关键词（企业名称、统一社会信用代码等）

**返回数据：**
- `name`: 企业名称
- `creditCode`: 统一社会信用代码
- `legalPerson`: 法定代表人
- `registeredCapital`: 注册资本
- `establishDate`: 成立日期
- `businessStatus`: 经营状态
- `businessScope`: 经营范围
- `registeredAddress`: 注册地址
- 其他工商照面信息

## 环境变量

| 变量名 | 必需 | 默认值 | 描述 |
|--------|------|--------|------|
| `QIXIN_APP_KEY` | 是 | - | 启信宝 API Key |
| `QIXIN_SECRET_KEY` | 是 | - | 启信宝 Secret Key |
| `QIXIN_BASE_URL` | 否 | `https://api.qixin.com/APIService` | API 基础 URL |
| `QIXIN_TIMEOUT` | 否 | `30000` | 请求超时时间（毫秒） |
| `QIXIN_MAX_RETRIES` | 否 | `3` | 最大重试次数 |
| `LOG_LEVEL` | 否 | `info` | 日志级别 |
| `PORT` | 否 | `3000` | SSE 模式端口 |
| `MCP_SSE` | 否 | `false` | 是否启用 SSE 模式 |

## 开发

```bash
# 开发模式（支持热重载）
npm run dev

# 运行测试
npm test

# 代码检查
npm run lint

# 代码格式化
npm run format
```

## 项目结构

```
qixin-mcp-server/
├── src/
│   ├── config/          # 配置管理
│   ├── services/        # 业务服务
│   │   ├── signature.ts # 签名服务
│   │   └── qixin-api.ts # API 客户端
│   ├── types/           # 类型定义
│   ├── utils/           # 工具函数
│   └── server.ts        # 主服务器
├── docs/                # 文档
│   ├── prd.md          # 产品需求文档
│   └── plan.md         # 开发计划
├── tests/              # 测试文件
└── dist/               # 构建输出

```

## 故障排除

### 常见问题

1. **环境变量未设置**
   - 错误信息：`缺少必要的环境变量配置`
   - 解决方法：确保已正确设置 `QIXIN_APP_KEY` 和 `QIXIN_SECRET_KEY`

2. **API 调用失败**
   - 检查网络连接
   - 验证 API 密钥是否正确
   - 查看日志获取详细错误信息

3. **构建失败**
   - 确保 Node.js 版本 >= 18.0.0
   - 删除 `node_modules` 并重新安装依赖

### 日志调试

通过设置环境变量启用详细日志：

```bash
LOG_LEVEL=debug npx qixin-mcp-server
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 相关链接

- [MCP 协议文档](https://modelcontextprotocol.io/)
- [启信宝 API 文档](https://www.qixin.com/api) 