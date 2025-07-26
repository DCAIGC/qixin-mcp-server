import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { EventEmitter } from 'events';
import * as http from 'http';

/**
 * SSE 传输类
 * 实现基于 Server-Sent Events 的 MCP 协议传输层
 */
export class SSETransport extends EventEmitter implements Transport {
  private response: http.ServerResponse;
  private closed = false;

  constructor(response: http.ServerResponse) {
    super();
    this.response = response;
    this.setupSSE();
  }

  /**
   * 设置 SSE 连接
   */
  private setupSSE(): void {
    // 设置 SSE 响应头
    this.response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });

    // 发送初始连接事件
    this.response.write('event: connected\n');
    this.response.write('data: {"type": "connected"}\n\n');

    // 监听客户端断开连接
    this.response.on('close', () => {
      this.handleClose();
    });

    this.response.on('error', (error) => {
      this.emit('error', error);
    });

    // 定期发送心跳以保持连接
    const heartbeat = setInterval(() => {
      if (this.closed) {
        clearInterval(heartbeat);
        return;
      }
      this.sendHeartbeat();
    }, 30000); // 每30秒发送一次心跳
  }

  /**
   * 发送心跳消息
   */
  private sendHeartbeat(): void {
    if (!this.closed) {
      this.response.write('event: heartbeat\n');
      this.response.write('data: {"type": "heartbeat", "timestamp": ' + Date.now() + '}\n\n');
    }
  }

  /**
   * 启动传输层
   */
  async start(): Promise<void> {
    // SSE 传输在构造函数中已经启动，这里不需要额外操作
    this.emit('connect');
  }

  /**
   * 发送 JSON-RPC 消息
   */
  async send(message: JSONRPCMessage): Promise<void> {
    if (this.closed) {
      throw new Error('Transport is closed');
    }

    try {
      const data = JSON.stringify(message);
      this.response.write('event: message\n');
      this.response.write(`data: ${data}\n\n`);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 关闭传输连接
   */
  async close(): Promise<void> {
    if (this.closed) {
      return;
    }

    this.closed = true;
    
    try {
      // 发送关闭事件
      this.response.write('event: close\n');
      this.response.write('data: {"type": "close"}\n\n');
      
      // 关闭响应流
      this.response.end();
    } catch {
      // 忽略关闭时的错误
    }

    this.emit('close');
  }

  /**
   * 处理连接关闭
   */
  private handleClose(): void {
    if (!this.closed) {
      this.closed = true;
      this.emit('close');
    }
  }

  /**
   * 处理来自客户端的消息
   * 注意：SSE 是单向的，所以这里不会接收到消息
   * 如果需要双向通信，客户端需要通过其他方式（如 POST 请求）发送消息
   */
  handleMessage(message: string): void {
    try {
      const jsonMessage = JSON.parse(message) as JSONRPCMessage;
      this.emit('message', jsonMessage);
    } catch {
      this.emit('error', new Error(`Invalid JSON message: ${message}`));
    }
  }

  /**
   * 获取连接状态
   */
  get isClosed(): boolean {
    return this.closed;
  }
} 