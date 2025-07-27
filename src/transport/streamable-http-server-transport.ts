import { ServerResponse, IncomingMessage } from 'http';
import { randomUUID } from 'crypto';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { 
  JSONRPCMessage, 
  JSONRPCRequest, 
  JSONRPCResponse,
  JSONRPCNotification
} from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../utils/logger';

/**
 * Streamable HTTP Server Transport
 * 实现 MCP SDK 的 Transport 接口，用于处理 HTTP 请求
 */
export class StreamableHTTPServerTransport implements Transport {
  private logger: Logger;
  private closed: boolean = false;
  private messageHandlers: Array<(message: JSONRPCMessage) => void> = [];
  private closeHandlers: Array<() => void> = [];
  private errorHandlers: Array<(error: Error) => void> = [];
  public sessionId?: string;
  
  constructor(private options?: {
    sessionIdGenerator?: () => string;
    onsessioninitialized?: (sessionId: string) => void;
  }) {
    this.logger = Logger.create('StreamableHTTPServerTransport');
  }

  /**
   * 启动传输
   */
  async start(): Promise<void> {
    this.logger.info('Streamable HTTP Server 传输已启动');
  }

  /**
   * 发送消息
   */
  async send(message: JSONRPCMessage): Promise<void> {
    // 在 handleRequest 中会直接写入响应，这里不需要实现
    this.logger.debug('send 方法被调用', { message });
  }

  /**
   * 处理 HTTP 请求
   */
  async handleRequest(
    req: IncomingMessage, 
    res: ServerResponse, 
    body?: JSONRPCRequest
  ): Promise<void> {
    try {
      // 如果是 POST 请求并且有 body
      if (req.method === 'POST' && body) {
        this.logger.info('处理 POST 请求', { 
          method: body.method,
          id: body.id 
        });

        // 检查是否是初始化请求
        if (body.method === 'initialize' && this.options?.sessionIdGenerator) {
          this.sessionId = this.options.sessionIdGenerator();
          this.logger.info('生成会话 ID', { sessionId: this.sessionId });
          
          // 设置响应头
          res.setHeader('MCP-Session-Id', this.sessionId);
          
          if (this.options.onsessioninitialized) {
            this.options.onsessioninitialized(this.sessionId);
          }
        }

        // 创建一个 Promise 来等待响应
        const responsePromise = new Promise<JSONRPCResponse>((resolve) => {
          // 临时添加一个消息处理器来捕获响应
          const tempHandler = (message: JSONRPCMessage) => {
            if ('id' in message && message.id === body.id) {
              // 找到对应的响应
              resolve(message as JSONRPCResponse);
              // 移除临时处理器
              const index = this.messageHandlers.indexOf(tempHandler);
              if (index > -1) {
                this.messageHandlers.splice(index, 1);
              }
            }
          };
          this.messageHandlers.push(tempHandler);
        });

        // 通知所有消息处理器（MCP 服务器）
        for (const handler of this.messageHandlers) {
          handler(body);
        }

        // 等待响应（设置超时）
        const timeout = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 30000)
        );

        try {
          const response = await Promise.race([responsePromise, timeout]);
          
          // 发送响应
          if (!res.headersSent) {
            res.writeHead(200, {
              'Content-Type': 'application/x-ndjson',
              'Transfer-Encoding': 'chunked',
              'Cache-Control': 'no-cache',
              'X-Accel-Buffering': 'no'
            });
          }

          // 写入响应
          res.write(JSON.stringify(response) + '\n');
          res.end();
          
          this.logger.info('响应已发送', { 
            id: response.id,
            hasResult: 'result' in response,
            hasError: 'error' in response
          });

        } catch (error) {
          this.logger.error('等待响应超时', error);
          
          if (!res.headersSent) {
            res.writeHead(200, {
              'Content-Type': 'application/json'
            });
          }
          
          const errorResponse = {
            jsonrpc: '2.0' as const,
            id: body.id ?? null,
            error: {
              code: -32603,
              message: 'Internal error: Request timeout'
            }
          };
          
          res.write(JSON.stringify(errorResponse) + '\n');
          res.end();
        }

      } else {
        // 处理其他类型的请求（如 GET 用于 SSE）
        this.logger.warn('不支持的请求方法', { method: req.method });
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32000,
            message: 'Method not allowed'
          }
        }));
      }

    } catch (error) {
      this.logger.error('处理请求失败', error);
      
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32603,
            message: 'Internal server error'
          }
        }));
      }
    }
  }

  /**
   * 关闭传输
   */
  async close(): Promise<void> {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.logger.info('关闭 Streamable HTTP Server 传输');

    // 通知所有关闭处理器
    for (const handler of this.closeHandlers) {
      handler();
    }
  }

  /**
   * 监听消息事件
   */
  onMessage(handler: (message: JSONRPCMessage) => void): void {
    this.messageHandlers.push(handler);
  }

  /**
   * 监听关闭事件
   */
  onClose(handler: () => void): void {
    this.closeHandlers.push(handler);
  }

  /**
   * 监听错误事件
   */
  onError(handler: (error: Error) => void): void {
    this.errorHandlers.push(handler);
  }
}