#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config, Config } from './config/index';
import { QixinApiClient } from './services/qixin-api';
import { Logger } from './utils/logger';
import { 
  GetEnterpriseBasicInfoArgs, 
  SearchEnterpriseArgs,
  GetEnterpriseContactArgs,
  GetEnterpriseSizeArgs,
  GetExecutedEnterpriseArgs,
  GetDishonestEnterpriseArgs,
  GetLegalDocumentsArgs,
  GetEnterpriseGenealogy3Args,
  GetAdminPenaltyArgs,
  GetSeriousIllegalArgs,
  GetGuaranteeListArgs,
  QixinApiError 
} from './types/index';
import { SSEServerManager } from './server/sse-server';
import { StreamableHTTPServerManager } from './server/streamable-http-server';

/**
 * 启信宝 MCP Server 类
 */
class QixinMcpServer {
  private server: Server;
  private apiClient: QixinApiClient;
  private logger: Logger;
  private sseServerManager?: SSEServerManager;
  private streamableHTTPServerManager?: StreamableHTTPServerManager;

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
        {
          name: 'search_enterprise',
          description: '企业模糊搜索',
          inputSchema: {
            type: 'object',
            properties: {
              keyword: {
                type: 'string',
                description: '企业相关关键字，输入字数大于等于2个',
              },
              matchType: {
                type: 'string',
                description: '匹配类型（可选）：partner（股东）、oper（法人）、member（高管）、contact（联系方式）、scope（经营范围）、ename（公司名称）、patent（专利）、copyright（著作权）、software（软件著作权）、trademark（商标）、domain（网址）、product（产品）',
              },
              region: {
                type: 'string',
                description: '地区编码（可选）：省/直辖市（2位）、城市（4位）、区县（6位）',
              },
              skip: {
                type: 'number',
                description: '跳过条目数（默认为0，单页返回10条数据）',
              },
            },
            required: ['keyword'],
          },
        },
        {
          name: 'get_enterprise_contact',
          description: '查询企业联系方式',
          inputSchema: {
            type: 'object',
            properties: {
              keyword: {
                type: 'string',
                description: '企业全名/注册号/统一社会信用代码',
              },
            },
            required: ['keyword'],
          },
        },
        {
          name: 'get_enterprise_size',
          description: '查询企业规模',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: '企业全名/注册号/统一社会信用代码',
              },
            },
            required: ['name'],
          },
        },
        {
          name: 'get_executed_enterprise',
          description: '查询被执行企业',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: '企业全名/注册号/统一社会信用代码',
              },
              skip: {
                type: 'number',
                description: '跳过条目数（默认为0，单页返回10条数据）',
              },
            },
            required: ['name'],
          },
        },
        {
          name: 'get_dishonest_enterprise',
          description: '查询失信被执行企业',
          inputSchema: {
            type: 'object',
            properties: {
              keyword: {
                type: 'string',
                description: '企业全名/注册号/统一社会信用代码',
              },
              skip: {
                type: 'number',
                description: '跳过条目数（默认为0，单页返回20条数据）',
              },
            },
            required: ['keyword'],
          },
        },
        {
          name: 'get_legal_documents',
          description: '查询裁判文书列表',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: '企业名称',
              },
              matchType: {
                type: 'string',
                description: '匹配类型（可选）：litigant（当事人）、judge（法官）',
              },
              skip: {
                type: 'number',
                description: '跳过条目数（默认不填返回前20条）',
              },
            },
            required: ['name'],
          },
        },
        {
          name: 'get_enterprise_genealogy3',
          description: '查询企业三层族谱',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: '企业全名/注册号/统一社会信用代码',
              },
            },
            required: ['name'],
          },
        },
        {
          name: 'get_admin_penalty',
          description: '查询行政处罚',
          inputSchema: {
            type: 'object',
            properties: {
              keyword: {
                type: 'string',
                description: '企业名称',
              },
              skip: {
                type: 'number',
                description: '跳过条目数（默认为0，单页返回20条数据）',
              },
            },
            required: ['keyword'],
          },
        },
        {
          name: 'get_serious_illegal',
          description: '查询严重违法',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: '企业全名/注册号/统一社会信用代码',
              },
            },
            required: ['name'],
          },
        },
        {
          name: 'get_guarantee_list',
          description: '查询对外担保',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: '企业全名/注册号/统一社会信用代码',
              },
              skip: {
                type: 'number',
                description: '跳过条目数（默认不填返回前20条）',
              },
            },
            required: ['name'],
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

      if (name === 'search_enterprise') {
        // 验证参数结构
        if (!args || typeof args !== 'object' || !('keyword' in args)) {
          throw new Error('Invalid arguments for search_enterprise');
        }
        return await this.handleSearchEnterprise(args as unknown as SearchEnterpriseArgs);
      }

      if (name === 'get_enterprise_contact') {
        // 验证参数结构
        if (!args || typeof args !== 'object' || !('keyword' in args)) {
          throw new Error('Invalid arguments for get_enterprise_contact');
        }
        return await this.handleGetEnterpriseContact(args as unknown as GetEnterpriseContactArgs);
      }

      if (name === 'get_enterprise_size') {
        // 验证参数结构
        if (!args || typeof args !== 'object' || !('name' in args)) {
          throw new Error('Invalid arguments for get_enterprise_size');
        }
        return await this.handleGetEnterpriseSize(args as unknown as GetEnterpriseSizeArgs);
      }

      if (name === 'get_executed_enterprise') {
        // 验证参数结构
        if (!args || typeof args !== 'object' || !('name' in args)) {
          throw new Error('Invalid arguments for get_executed_enterprise');
        }
        return await this.handleGetExecutedEnterprise(args as unknown as GetExecutedEnterpriseArgs);
      }

      if (name === 'get_dishonest_enterprise') {
        // 验证参数结构
        if (!args || typeof args !== 'object' || !('keyword' in args)) {
          throw new Error('Invalid arguments for get_dishonest_enterprise');
        }
        return await this.handleGetDishonestEnterprise(args as unknown as GetDishonestEnterpriseArgs);
      }

      if (name === 'get_legal_documents') {
        // 验证参数结构
        if (!args || typeof args !== 'object' || !('name' in args)) {
          throw new Error('Invalid arguments for get_legal_documents');
        }
        return await this.handleGetLegalDocuments(args as unknown as GetLegalDocumentsArgs);
      }

      if (name === 'get_enterprise_genealogy3') {
        // 验证参数结构
        if (!args || typeof args !== 'object' || !('name' in args)) {
          throw new Error('Invalid arguments for get_enterprise_genealogy3');
        }
        return await this.handleGetEnterpriseGenealogy3(args as unknown as GetEnterpriseGenealogy3Args);
      }

      if (name === 'get_admin_penalty') {
        // 验证参数结构
        if (!args || typeof args !== 'object' || !('keyword' in args)) {
          throw new Error('Invalid arguments for get_admin_penalty');
        }
        return await this.handleGetAdminPenalty(args as unknown as GetAdminPenaltyArgs);
      }

      if (name === 'get_serious_illegal') {
        // 验证参数结构
        if (!args || typeof args !== 'object' || !('name' in args)) {
          throw new Error('Invalid arguments for get_serious_illegal');
        }
        return await this.handleGetSeriousIllegal(args as unknown as GetSeriousIllegalArgs);
      }

      if (name === 'get_guarantee_list') {
        // 验证参数结构
        if (!args || typeof args !== 'object' || !('name' in args)) {
          throw new Error('Invalid arguments for get_guarantee_list');
        }
        return await this.handleGetGuaranteeList(args as unknown as GetGuaranteeListArgs);
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
   * 处理企业搜索
   */
  private async handleSearchEnterprise(args: SearchEnterpriseArgs) {
    this.logger.info('企业模糊搜索', { 
      keyword: args.keyword,
      matchType: args.matchType,
      region: args.region,
      skip: args.skip
    });

    try {
      // 参数验证
      if (!args.keyword || typeof args.keyword !== 'string') {
        throw new Error('keyword 参数必须是非空字符串');
      }

      // 调用 API
      const result = await this.apiClient.searchEnterprise(
        args.keyword,
        args.matchType,
        args.region,
        args.skip
      );

      this.logger.info('搜索成功', { 
        keyword: args.keyword, 
        total: result.total,
        num: result.num
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
      this.logger.error('搜索失败', error);

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
   * 处理企业联系方式查询
   */
  private async handleGetEnterpriseContact(args: GetEnterpriseContactArgs) {
    this.logger.info('查询企业联系方式', { keyword: args.keyword });

    try {
      // 参数验证
      if (!args.keyword || typeof args.keyword !== 'string') {
        throw new Error('keyword 参数必须是非空字符串');
      }

      // 调用 API
      const result = await this.apiClient.getContactInfo(args.keyword);

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
   * 处理企业规模查询
   */
  private async handleGetEnterpriseSize(args: GetEnterpriseSizeArgs) {
    this.logger.info('查询企业规模', { name: args.name });

    try {
      // 参数验证
      if (!args.name || typeof args.name !== 'string') {
        throw new Error('name 参数必须是非空字符串');
      }

      // 调用 API
      const result = await this.apiClient.getEntSize(args.name);

      this.logger.info('查询成功', { 
        name: args.name, 
        size: result.tag_name 
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
   * 处理被执行企业查询
   */
  private async handleGetExecutedEnterprise(args: GetExecutedEnterpriseArgs) {
    this.logger.info('查询被执行企业', { name: args.name, skip: args.skip });

    try {
      // 参数验证
      if (!args.name || typeof args.name !== 'string') {
        throw new Error('name 参数必须是非空字符串');
      }

      // 调用 API
      const result = await this.apiClient.getExecutedEnterprise(args.name, args.skip);

      this.logger.info('查询成功', { 
        name: args.name, 
        total: result.total,
        count: result.items?.length || 0
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
   * 处理失信被执行企业查询
   */
  private async handleGetDishonestEnterprise(args: GetDishonestEnterpriseArgs) {
    this.logger.info('查询失信被执行企业', { keyword: args.keyword, skip: args.skip });

    try {
      // 参数验证
      if (!args.keyword || typeof args.keyword !== 'string') {
        throw new Error('keyword 参数必须是非空字符串');
      }

      // 调用 API
      const result = await this.apiClient.getDishonestEnterprise(args.keyword, args.skip);

      this.logger.info('查询成功', { 
        keyword: args.keyword, 
        total: result.total,
        count: result.items?.length || 0
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
   * 处理裁判文书列表查询
   */
  private async handleGetLegalDocuments(args: GetLegalDocumentsArgs) {
    this.logger.info('查询裁判文书列表', { 
      name: args.name, 
      matchType: args.matchType,
      skip: args.skip 
    });

    try {
      // 参数验证
      if (!args.name || typeof args.name !== 'string') {
        throw new Error('name 参数必须是非空字符串');
      }

      // 调用 API
      const result = await this.apiClient.getLegalDocuments(args.name, args.matchType, args.skip);

      this.logger.info('查询成功', { 
        name: args.name, 
        total: result.total,
        num: result.num
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
   * 处理企业三层族谱查询
   */
  private async handleGetEnterpriseGenealogy3(args: GetEnterpriseGenealogy3Args) {
    this.logger.info('查询企业三层族谱', { name: args.name });

    try {
      // 参数验证
      if (!args.name || typeof args.name !== 'string') {
        throw new Error('name 参数必须是非空字符串');
      }

      // 调用 API
      const result = await this.apiClient.getEnterpriseGenealogy3(args.name);

      this.logger.info('查询成功', { 
        name: args.name, 
        node_num: result.node_num,
        share_holders_count: result.share_holders?.length || 0,
        invests_count: result.invests?.length || 0
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
   * 处理行政处罚查询
   */
  private async handleGetAdminPenalty(args: GetAdminPenaltyArgs) {
    this.logger.info('查询行政处罚', { keyword: args.keyword, skip: args.skip });

    try {
      // 参数验证
      if (!args.keyword || typeof args.keyword !== 'string') {
        throw new Error('keyword 参数必须是非空字符串');
      }

      // 调用 API
      const result = await this.apiClient.getAdminPenalty(args.keyword, args.skip);

      this.logger.info('查询成功', { 
        keyword: args.keyword, 
        total: result.total,
        count: result.items?.length || 0
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
   * 处理严重违法查询
   */
  private async handleGetSeriousIllegal(args: GetSeriousIllegalArgs) {
    this.logger.info('查询严重违法', { name: args.name });

    try {
      // 参数验证
      if (!args.name || typeof args.name !== 'string') {
        throw new Error('name 参数必须是非空字符串');
      }

      // 调用 API
      const result = await this.apiClient.getSeriousIllegal(args.name);

      this.logger.info('查询成功', { 
        name: args.name, 
        execution_count: result.execution?.length || 0
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
   * 处理对外担保查询
   */
  private async handleGetGuaranteeList(args: GetGuaranteeListArgs) {
    this.logger.info('查询对外担保', { name: args.name, skip: args.skip });

    try {
      // 参数验证
      if (!args.name || typeof args.name !== 'string') {
        throw new Error('name 参数必须是非空字符串');
      }

      // 调用 API
      const result = await this.apiClient.getGuaranteeList(args.name, args.skip);

      this.logger.info('查询成功', { 
        name: args.name, 
        total: result.total,
        count: result.items?.length || 0
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
      
      if (args.includes('--streamable-http') || process.env.MCP_STREAMABLE_HTTP === 'true') {
        // Streamable HTTP 模式
        await this.startStreamableHTTPMode();
      } else if (args.includes('--sse') || process.env.MCP_SSE === 'true') {
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
    const port = Config.getPort();
    this.logger.info(`启动 SSE 模式，端口: ${port}`);
    
    try {
      // 创建 SSE 服务器管理器
      this.sseServerManager = new SSEServerManager(this.server, port);
      
      this.logger.info(`SSE 服务器已启动，监听端口: ${port}`);
      this.logger.info('可用端点:');
      this.logger.info(`  - GET  http://localhost:${port}/mcp    - SSE 连接`);
      this.logger.info(`  - POST http://localhost:${port}/mcp    - 发送消息`);
      this.logger.info(`  - GET  http://localhost:${port}/health - 健康检查`);
      this.logger.info(`  - GET  http://localhost:${port}/       - 服务器信息`);

      // 处理进程退出信号
      this.setupGracefulShutdown();

      // 在 Windows 上防止进程立即退出
      if (process.platform === 'win32' && process.env.npm_config_user_agent?.includes('npx')) {
        // 保持进程运行
        process.stdin.resume();
      }

    } catch (error) {
      this.logger.error('启动 SSE 模式失败', error);
      throw error;
    }
  }

  /**
   * 启动 Streamable HTTP 模式
   */
  private async startStreamableHTTPMode(): Promise<void> {
    const port = Config.getPort();
    this.logger.info(`启动 Streamable HTTP 模式，端口: ${port}`);
    
    try {
      // 创建 Streamable HTTP 服务器管理器
      this.streamableHTTPServerManager = new StreamableHTTPServerManager(this.server, port);
      
      this.logger.info(`Streamable HTTP 服务器已启动，监听端口: ${port}`);
      this.logger.info('为 Dify 等平台提供流式 HTTP 响应支持');
      this.logger.info('可用端点:');
      this.logger.info(`  - POST http://localhost:${port}/stream - 发送 JSON-RPC 请求并接收流式响应`);
      this.logger.info(`  - GET  http://localhost:${port}/health - 健康检查`);
      this.logger.info(`  - GET  http://localhost:${port}/       - 服务器信息`);

      // 处理进程退出信号
      this.setupGracefulShutdown();

      // 在 Windows 上防止进程立即退出
      if (process.platform === 'win32' && process.env.npm_config_user_agent?.includes('npx')) {
        // 保持进程运行
        process.stdin.resume();
      }

    } catch (error) {
      this.logger.error('启动 Streamable HTTP 模式失败', error);
      throw error;
    }
  }

  /**
   * 设置优雅关闭
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      this.logger.info(`收到 ${signal} 信号，开始优雅关闭`);
      
      if (this.sseServerManager) {
        await this.sseServerManager.close();
      }
      
      if (this.streamableHTTPServerManager) {
        await this.streamableHTTPServerManager.close();
      }
      
      this.logger.info('服务器已关闭');
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    
    // Windows 支持
    if (process.platform === 'win32') {
      process.on('SIGBREAK', () => shutdown('SIGBREAK'));
    }
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