/**
 * 企业基本信息接口
 */
export interface EnterpriseBasicInfo {
  name: string;                // 企业名称
  creditCode: string;          // 统一社会信用代码
  legalPerson: string;         // 法定代表人
  registeredCapital: string;   // 注册资本
  establishDate: string;       // 成立日期
  businessStatus: string;      // 经营状态
  businessScope: string;       // 经营范围
  registeredAddress: string;   // 注册地址
  [key: string]: any;          // 其他字段
}

/**
 * 启信宝 API 响应接口
 */
export interface QixinApiResponse<T = any> {
  status: string;
  message: string;
  data?: T;
  error_code?: string;
}

/**
 * 签名选项接口
 */
export interface SignatureOptions {
  appkey: string;
  timestamp: number;
  secretKey: string;
}

/**
 * 配置选项接口
 */
export interface ConfigOptions {
  appKey: string;
  secretKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * MCP 工具参数接口
 */
export interface GetEnterpriseBasicInfoArgs {
  keyword: string;
}

/**
 * 自定义错误类型
 */
export class QixinApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'QixinApiError';
  }
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
} 