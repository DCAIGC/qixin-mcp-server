import { ServerResponse } from 'http';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { 
  JSONRPCMessage, 
  JSONRPCRequest, 
  JSONRPCResponse,
  JSONRPCNotification 
} from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../utils/logger';

/**
 * Streamable HTTP 传输层实现
 * 用于处理流式 HTTP 响应
 */
export class StreamableHTTPTransport implements Transport {
  private res: ServerResponse;
  private logger: Logger;
  private closed: boolean = false;
  private messageHandlers: Array<(message: JSONRPCMessage) => void> = [];
  private closeHandlers: Array<() => void> = [];
  private errorHandlers: Array<(error: Error) => void> = [];

  constructor(res: ServerResponse) {
    this.res = res;
    this.logger = Logger.create('StreamableHTTPTransport');
    
    // 监听响应关闭事件
    res.on('close', () => {
      this.handleClose();
    });

    res.on('error', (error) => {
      this.handleError(error);
    });
  }

  /**
   * 启动传输（对于 HTTP 响应无需特殊操作）
   */
  async start(): Promise<void> {
    this.logger.info('Streamable HTTP 传输已启动');
  }

  /**
   * 发送消息
   */
  async send(message: JSONRPCMessage): Promise<void> {
    if (this.closed) {
      throw new Error('Transport is closed');
    }

    try {
      // 将消息序列化为 NDJSON 格式
      const line = JSON.stringify(message) + '\n';
      
      // 写入响应流
      if (!this.res.writableEnded) {
        this.res.write(line);
        this.logger.info('发送响应到客户端', { 
          messageId: 'id' in message ? message.id : 'no-id',
          method: 'method' in message ? message.method : 'response',
          hasResult: 'result' in message,
          hasError: 'error' in message
        });
        
        // 如果是响应消息（有 id 且不是通知），考虑是否结束流
        if ('id' in message && message.id !== null && !('method' in message)) {
          // 对于最终响应，稍后结束连接（允许缓冲区清空）
          setTimeout(() => {
            if (!this.res.writableEnded && !this.closed) {
              this.logger.info('结束响应流');
              this.close();
            }
          }, 100);
        }
      } else {
        this.logger.warn('响应流已结束，无法发送消息');
      }
    } catch (error) {
      this.logger.error('发送消息失败', error);
      throw error;
    }
  }

  /**
   * 处理接收到的消息（对于 HTTP 响应，通常不接收消息）
   */
  handleMessage(message: string): void {
    try {
      const parsed = JSON.parse(message) as JSONRPCMessage;
      this.logger.debug('接收到消息', { message: parsed });
      
      // 通知所有消息处理器
      for (const handler of this.messageHandlers) {
        handler(parsed);
      }
    } catch (error) {
      this.logger.error('解析消息失败', error);
      this.handleError(error as Error);
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
    this.logger.info('关闭 Streamable HTTP 传输');

    try {
      if (!this.res.writableEnded) {
        this.res.end();
      }
    } catch (error) {
      this.logger.error('关闭响应流失败', error);
    }

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

  /**
   * 处理关闭事件
   */
  private handleClose(): void {
    if (!this.closed) {
      this.closed = true;
      this.logger.info('HTTP 响应已关闭');
      
      for (const handler of this.closeHandlers) {
        handler();
      }
    }
  }

  /**
   * 处理错误事件
   */
  private handleError(error: Error): void {
    this.logger.error('传输错误', error);
    
    for (const handler of this.errorHandlers) {
      handler(error);
    }
  }

  /**
   * 检查传输是否已关闭
   */
  isClosed(): boolean {
    return this.closed;
  }
}