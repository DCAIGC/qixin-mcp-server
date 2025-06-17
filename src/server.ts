#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from './config/index';
import { QixinApiClient } from './services/qixin-api';
import { Logger } from './utils/logger';
import { GetEnterpriseBasicInfoArgs, QixinApiError } from './types/index';

/**
 * 启信宝 MCP Server 类
 */
class QixinMcpServer {
  private server: Server;
  private apiClient: QixinApiClient;
  private logger: Logger;

  constructor() {
    this.logger = Logger.create('QixinMcpServer');
    
    // 初始化 MCP Server
    this.server = new Server(
      {
        name: 'qixin-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // 初始化 API 客户端
    const options = config.getOptions();
    this.apiClient = new QixinApiClient(
      options.appKey,
      options.secretKey,
      options.baseUrl,
      options.timeout,
      options.maxRetries
    );

    // 设置工具处理器
    this.setupTools();
  }

  /**
   * 设置 MCP 工具定义
   */
  private setupTools(): void {
    // 注册列出工具的处理器
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_enterprise_basic_info',
          description: '查询企业基本信息',
          inputSchema: {
            type: 'object',
            properties: {
              keyword: {
                type: 'string',
                description: '查询关键词（企业名称、统一社会信用代码等）',
              },
            },
            required: ['keyword'],
          },
        },
      ],
    }));

    // 注册调用工具的处理器
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === 'get_enterprise_basic_info') {
        // 验证参数结构
        if (!args || typeof args !== 'object' || !('keyword' in args)) {
          throw new Error('Invalid arguments for get_enterprise_basic_info');
        }
        return await this.handleGetEnterpriseBasicInfo(args as unknown as GetEnterpriseBasicInfoArgs);
      }

      throw new Error(`Unknown tool: ${name}`);
    });
  }

  /**
   * 处理企业基本信息查询
   */
  private async handleGetEnterpriseBasicInfo(args: GetEnterpriseBasicInfoArgs) {
    this.logger.info('查询企业基本信息', { keyword: args.keyword });

    try {
      // 参数验证
      if (!args.keyword || typeof args.keyword !== 'string') {
        throw new Error('keyword 参数必须是非空字符串');
      }

      // 调用 API
      const result = await this.apiClient.getBasicInfo(args.keyword);

      this.logger.info('查询成功', { 
        keyword: args.keyword, 
        enterprise: result.name 
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      this.logger.error('查询失败', error);

      let errorMessage: string;
      let errorCode: string | undefined;

      if (error instanceof QixinApiError) {
        errorMessage = error.message;
        errorCode = error.code;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = '未知错误';
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: true,
              message: errorMessage,
              code: errorCode,
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * 启动服务器
   */
  public async start(): Promise<void> {
    try {
      // 验证配置
      config.getOptions();
      this.logger.info('配置验证成功');

      // 检查运行模式
      const args = process.argv.slice(2);
      
      if (args.includes('--sse') || process.env.MCP_SSE === 'true') {
        // SSE 模式
        await this.startSSEMode();
      } else {
        // 默认 stdio 模式
        await this.startStdioMode();
      }
    } catch (error) {
      this.logger.error('服务器启动失败', error);
      process.exit(1);
    }
  }

  /**
   * 启动 stdio 模式
   */
  private async startStdioMode(): Promise<void> {
    this.logger.info('启动 stdio 模式');
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    this.logger.info('MCP Server 已启动（stdio 模式）');
  }

  /**
   * 启动 SSE 模式
   */
  private async startSSEMode(): Promise<void> {
    this.logger.info('启动 SSE 模式');
    
    // 注意：MCP SDK 目前主要支持 stdio 模式
    // SSE 模式需要额外的实现，这里仅作为占位符
    this.logger.warn('SSE 模式暂未完全实现，将使用 stdio 模式');
    
    await this.startStdioMode();
  }
}

// 主入口
if (require.main === module) {
  const server = new QixinMcpServer();
  server.start().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { QixinMcpServer }; 