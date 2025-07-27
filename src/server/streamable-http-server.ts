import * as http from 'http';
import * as url from 'url';
import { URL } from 'url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Logger } from '../utils/logger';
import { StreamableHTTPTransport } from '../transport/streamable-http-transport';
import { 
  JSONRPCRequest, 
  JSONRPCResponse, 
  JSONRPCError 
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Streamable HTTP 服务器管理器
 * 为 Dify 等不支持 SSE 的平台提供流式 HTTP 响应
 */
export class StreamableHTTPServerManager {
  private httpServer: http.Server;
  private mcpServer: Server;
  private logger: Logger;

  constructor(mcpServer: Server, port: number = 3000) {
    this.mcpServer = mcpServer;
    this.logger = Logger.create('StreamableHTTPServerManager');
    this.httpServer = http.createServer(this.handleRequest.bind(this));
    this.httpServer.listen(port);
  }

  /**
   * 处理 HTTP 请求
   */
  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const parsedUrl = url.parse(req.url || '', true);
    const pathname = parsedUrl.pathname;
    const method = req.method?.toUpperCase();

    this.logger.info(`收到请求: ${method} ${pathname}`);

    // 处理 CORS 预检请求
    if (method === 'OPTIONS') {
      this.handleCorsOptions(res);
      return;
    }

    // 设置基本的 CORS 头
    this.setCorsHeaders(res);

    try {
      switch (pathname) {
        case '/stream':
          if (method === 'POST') {
            await this.handleStreamableRequest(req, res);
          } else {
            this.send405(res, ['POST']);
          }
          break;

        case '/health':
          this.handleHealthCheck(res);
          break;

        case '/':
          this.handleRoot(res);
          break;

        default:
          this.send404(res);
          break;
      }
    } catch (error) {
      this.logger.error('处理请求时发生错误', error);
      this.send500(res, error);
    }
  }

  /**
   * 处理流式 HTTP 请求
   */
  private async handleStreamableRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // 检查认证信息
    const authResult = this.checkAuthentication(req);
    if (!authResult.success) {
      this.logger.warn('请求认证失败', { reason: authResult.error });
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Authentication failed', 
        message: authResult.error 
      }));
      return;
    }

    let body = '';
    
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        this.logger.info('收到流式请求', { body });

        // 解析 JSON-RPC 请求
        const request: JSONRPCRequest = JSON.parse(body);

        // 设置流式响应头
        res.writeHead(200, {
          'Content-Type': 'application/x-ndjson',
          'Transfer-Encoding': 'chunked',
          'Cache-Control': 'no-cache',
          'X-Accel-Buffering': 'no'  // 禁用 nginx 缓冲
        });

        // 创建 Streamable HTTP 传输
        const transport = new StreamableHTTPTransport(res);

        // 处理请求
        try {
          // 连接到 MCP 服务器
          await this.mcpServer.connect(transport);

          // 将请求消息发送给 MCP 服务器处理
          transport.handleMessage(JSON.stringify(request));

          // 监听传输关闭
          transport.onClose(() => {
            this.logger.info('Streamable HTTP 传输已关闭');
          });

          transport.onError((error) => {
            this.logger.error('Streamable HTTP 传输错误', error);
          });

        } catch (error) {
          this.logger.error('处理 MCP 请求失败', error);
          
          const errorResponse = {
            jsonrpc: '2.0' as const,
            id: request.id ?? 0,
            error: {
              code: -32603,
              message: 'Internal error',
              data: error instanceof Error ? error.message : String(error)
            }
          };
          
          if (!res.headersSent && !res.writableEnded) {
            res.write(JSON.stringify(errorResponse) + '\n');
            res.end();
          }
        }

      } catch (error) {
        this.logger.error('解析请求失败', error);
        
        if (!res.headersSent) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON request' }));
        }
      }
    });
  }

  /**
   * 检查客户端认证信息
   */
  private checkAuthentication(req: http.IncomingMessage): { success: boolean; error?: string } {
    // 方法1: 检查HTTP头部中的API密钥
    const headerAppKey = req.headers['x-qixin-app-key'] as string;
    const headerSecretKey = req.headers['x-qixin-secret-key'] as string;
    
    // 方法2: 检查Authorization头部
    const authHeader = req.headers['authorization'] as string;
    
    // 方法3: 检查URL查询参数
    const urlObj = new URL(req.url || '', `http://${req.headers.host}`);
    const queryAppKey = urlObj.searchParams.get('app_key') || undefined;
    const querySecretKey = urlObj.searchParams.get('secret_key') || undefined;

    // 如果提供了自定义认证信息，验证它们
    if (headerAppKey && headerSecretKey) {
      if (this.validateCredentials(headerAppKey, headerSecretKey)) {
        this.logger.info('使用HTTP头部认证成功');
        return { success: true };
      } else {
        return { success: false, error: 'Invalid credentials in headers' };
      }
    }

    if (authHeader) {
      const credentials = this.parseAuthHeader(authHeader);
      if (credentials && this.validateCredentials(credentials.appKey, credentials.secretKey)) {
        this.logger.info('使用Authorization头部认证成功');
        return { success: true };
      } else {
        return { success: false, error: 'Invalid Authorization header' };
      }
    }

    if (queryAppKey && querySecretKey) {
      if (this.validateCredentials(queryAppKey, querySecretKey)) {
        this.logger.info('使用URL参数认证成功');
        return { success: true };
      } else {
        return { success: false, error: 'Invalid credentials in query parameters' };
      }
    }

    // 如果没有提供认证信息，使用服务器默认配置（向后兼容）
    this.logger.info('使用服务器默认配置');
    return { success: true };
  }

  /**
   * 验证API密钥
   */
  private validateCredentials(appKey: string, secretKey: string): boolean {
    // 基本格式验证
    if (!appKey || !secretKey || appKey.length < 10 || secretKey.length < 10) {
      return false;
    }
    
    return true;
  }

  /**
   * 解析Authorization头部
   */
  private parseAuthHeader(authHeader: string): { appKey: string; secretKey: string } | null {
    try {
      if (authHeader.startsWith('Bearer ')) {
        const credentials = authHeader.substring(7);
        const [appKey, secretKey] = credentials.split(':');
        return { appKey, secretKey };
      } else if (authHeader.startsWith('Basic ')) {
        const base64Credentials = authHeader.substring(6);
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        const [appKey, secretKey] = credentials.split(':');
        return { appKey, secretKey };
      }
    } catch (error) {
      this.logger.warn('解析Authorization头部失败', error);
    }
    return null;
  }

  /**
   * 处理健康检查
   */
  private handleHealthCheck(res: http.ServerResponse): void {
    const healthInfo = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      server: 'qixin-mcp-server',
      mode: 'streamable-http',
      version: '1.0.0'
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(healthInfo, null, 2));
  }

  /**
   * 处理根路径请求
   */
  private handleRoot(res: http.ServerResponse): void {
    const welcomeMessage = {
      message: 'Qixin MCP Server - Streamable HTTP Mode',
      description: 'This mode provides streaming HTTP responses for platforms that do not support SSE',
      endpoints: {
        stream: '/stream (POST) - Send JSON-RPC requests and receive streaming responses',
        health: '/health - Health check'
      },
      authentication: {
        methods: [
          'HTTP Headers: X-Qixin-App-Key and X-Qixin-Secret-Key',
          'Authorization Header: Bearer appkey:secretkey or Basic base64(appkey:secretkey)',
          'Query Parameters: ?app_key=xxx&secret_key=xxx'
        ]
      },
      example: {
        url: 'POST /stream',
        headers: {
          'Content-Type': 'application/json',
          'X-Qixin-App-Key': 'your_app_key',
          'X-Qixin-Secret-Key': 'your_secret_key'
        },
        body: {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'get_enterprise_basic_info',
            arguments: {
              keyword: '阿里巴巴'
            }
          }
        }
      }
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(welcomeMessage, null, 2));
  }

  /**
   * 处理 CORS 预检请求
   */
  private handleCorsOptions(res: http.ServerResponse): void {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Qixin-App-Key, X-Qixin-Secret-Key',
      'Access-Control-Max-Age': '86400',
    });
    res.end();
  }

  /**
   * 设置 CORS 头
   */
  private setCorsHeaders(res: http.ServerResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Qixin-App-Key, X-Qixin-Secret-Key');
  }

  /**
   * 发送 404 错误
   */
  private send404(res: http.ServerResponse): void {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }

  /**
   * 发送 405 错误
   */
  private send405(res: http.ServerResponse, allowedMethods: string[]): void {
    res.writeHead(405, { 
      'Content-Type': 'application/json',
      'Allow': allowedMethods.join(', ')
    });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
  }

  /**
   * 发送 500 错误
   */
  private send500(res: http.ServerResponse, error: any): void {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Internal Server Error',
      message: error?.message || 'Unknown error'
    }));
  }

  /**
   * 获取服务器端口
   */
  public getPort(): number {
    const address = this.httpServer.address();
    if (address && typeof address === 'object') {
      return address.port;
    }
    return 3000;
  }

  /**
   * 关闭服务器
   */
  public async close(): Promise<void> {
    this.logger.info('正在关闭 Streamable HTTP 服务器');

    return new Promise((resolve, reject) => {
      this.httpServer.close((error) => {
        if (error) {
          this.logger.error('关闭服务器失败', error);
          reject(error);
        } else {
          this.logger.info('Streamable HTTP 服务器已关闭');
          resolve();
        }
      });
    });
  }
}