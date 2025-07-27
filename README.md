# 启信宝 MCP Server

基于 Model Context Protocol (MCP) 的企业信息查询服务，为 AI 助手提供全面的企业工商信息查询能力。

## 功能特性

- 🔍 **企业基本信息查询**：工商照面、联系方式、企业规模等
- 📊 **风险信息查询**：被执行、失信被执行、行政处罚、严重违法等
- 📑 **法律文书查询**：裁判文书列表、诉讼信息
- 🌐 **关系图谱查询**：企业三层族谱、对外担保信息
- 🔐 **安全认证**：使用 MD5 签名算法保证 API 调用安全
- ⚡ **高性能设计**：支持请求重试、错误处理和日志记录
- 🛠️ **多种运行模式**：支持 stdio、SSE 和 Streamable HTTP 三种运行方式
- 📦 **TypeScript 开发**：提供完整的类型定义和代码提示

## 前置要求

在使用前，您需要先获取启信宝 API 密钥：
- `QIXIN_APP_KEY`：启信宝 API Key
- `QIXIN_SECRET_KEY`：启信宝 Secret Key

## MCP 配置方式

### 1. 标准 stdio 模式

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

### 2. SSE 模式

SSE (Server-Sent Events) 模式提供 HTTP 端点用于 MCP 通信：

```bash
# 启动 SSE 服务器
MCP_SSE=true QIXIN_APP_KEY=your_app_key QIXIN_SECRET_KEY=your_secret_key npx qixin-mcp-server

# 或使用命令行参数
npx qixin-mcp-server --sse

# 自定义端口（默认 3000）
PORT=8080 MCP_SSE=true npx qixin-mcp-server
```

SSE 模式提供以下端点：
- `GET /mcp` - Server-Sent Events 连接
- `POST /mcp` - 发送 JSON-RPC 消息
- `GET /health` - 健康检查
- `GET /` - 服务器信息

### 3. Streamable HTTP 模式（适用于 Dify）

为不支持 SSE 的平台（如 Dify）提供流式 HTTP 响应：

```bash
# 启动 Streamable HTTP 服务器
MCP_STREAMABLE_HTTP=true QIXIN_APP_KEY=your_app_key QIXIN_SECRET_KEY=your_secret_key npx qixin-mcp-server

# 或使用命令行参数
npx qixin-mcp-server --streamable-http

# 自定义端口（默认 3000）
PORT=8080 MCP_STREAMABLE_HTTP=true npx qixin-mcp-server
```

Streamable HTTP 模式提供以下端点：
- `POST /stream` - 发送 JSON-RPC 请求并接收流式响应（NDJSON格式）
- `GET /health` - 健康检查
- `GET /` - 服务器信息

### 4. Docker 部署

使用 Docker Compose 部署：

```bash
# 1. 进入 docker 目录
cd docker

# 2. 复制并编辑环境变量文件
cp .env.example .env
# 编辑 .env 文件，填入您的 API 密钥

# 3. 启动服务（默认 SSE 模式）
docker-compose up -d

# 或启动 Streamable HTTP 模式
MCP_STREAMABLE_HTTP=true docker-compose up -d

# 4. 查看日志
docker-compose logs -f

# 5. 停止服务
docker-compose down
```

Docker 服务默认运行在 3000 端口，可通过环境变量配置修改。

### 可用工具

#### 1. `get_enterprise_basic_info` - 企业基本信息查询

查询企业的工商照面信息。

**参数：**
- `keyword` (string, 必需): 查询关键词（企业名称、统一社会信用代码等）

**返回数据示例：**
```json
{
  "name": "小米科技有限责任公司",
  "creditCode": "91110108551385082Q",
  "legalPerson": "雷军",
  "registeredCapital": "185000万元人民币",
  "establishDate": "2010-03-03",
  "businessStatus": "开业",
  "businessScope": "技术开发；技术转让...",
  "registeredAddress": "北京市海淀区..."
}
```

#### 2. `search_enterprise` - 企业模糊搜索

根据关键词进行企业模糊搜索。

**参数：**
- `keyword` (string, 必需): 企业相关关键字（≥2个字符）
- `matchType` (string, 可选): 匹配类型
  - `partner`: 股东
  - `oper`: 法人
  - `member`: 高管
  - `scope`: 经营范围
  - 等等
- `region` (string, 可选): 地区编码
- `skip` (number, 可选): 跳过条目数，默认0

#### 3. `get_enterprise_contact` - 企业联系方式

查询企业的联系方式信息。

**参数：**
- `keyword` (string, 必需): 企业全名/注册号/统一社会信用代码

#### 4. `get_enterprise_size` - 企业规模

查询企业规模分类（微型、小型、中型、大型）。

**参数：**
- `name` (string, 必需): 企业全名/注册号/统一社会信用代码

#### 5. `get_executed_enterprise` - 被执行企业

查询企业的被执行案件信息。

**参数：**
- `keyword` (string, 必需): 企业全名/注册号/统一社会信用代码
- `skip` (number, 可选): 跳过条目数，默认0

#### 6. `get_dishonest_enterprise` - 失信被执行企业

查询企业的失信被执行信息。

**参数：**
- `keyword` (string, 必需): 企业全名/注册号/统一社会信用代码
- `skip` (number, 可选): 跳过条目数，默认0

#### 7. `get_legal_documents` - 裁判文书列表

查询企业相关的法律文书。

**参数：**
- `keyword` (string, 必需): 企业名称
- `matchType` (string, 可选): `litigant`（当事人）或 `judge`（法官）
- `skip` (number, 可选): 跳过条目数，默认0

#### 8. `get_enterprise_genealogy3` - 企业三层族谱

查询企业的股权关系图谱（向上3层股东，向下3层投资）。

**参数：**
- `name` (string, 必需): 企业全名/注册号/统一社会信用代码

#### 9. `get_admin_penalty` - 行政处罚

查询企业的行政处罚记录。

**参数：**
- `keyword` (string, 必需): 企业名称
- `skip` (number, 可选): 跳过条目数，默认0

#### 10. `get_serious_illegal` - 严重违法

查询企业的严重违法记录。

**参数：**
- `name` (string, 必需): 企业全名/注册号/统一社会信用代码

#### 11. `get_guarantee_list` - 对外担保

查询企业的对外担保信息。

**参数：**
- `name` (string, 必需): 企业全名/注册号/统一社会信用代码
- `skip` (number, 可选): 跳过条目数，默认0

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