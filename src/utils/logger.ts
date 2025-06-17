import { LogLevel } from '../types';

/**
 * 日志记录器类
 */
export class Logger {
  private static logLevel: LogLevel = LogLevel.INFO;
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  /**
   * 设置全局日志级别
   */
  public static setLogLevel(level: LogLevel): void {
    Logger.logLevel = level;
  }

  /**
   * 格式化日志消息
   */
  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const contextStr = this.context ? `[${this.context}]` : '';
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `${timestamp} [${level.toUpperCase()}] ${contextStr} ${message}${dataStr}`;
  }

  /**
   * 检查是否应该记录该级别的日志
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(Logger.logLevel);
    const targetLevelIndex = levels.indexOf(level);
    return targetLevelIndex >= currentLevelIndex;
  }

  /**
   * 脱敏处理敏感信息
   */
  private sanitizeData(data: any): any {
    if (!data) return data;

    const sensitiveKeys = ['appkey', 'secretKey', 'sign', 'password', 'token'];
    const sanitized = { ...data };

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.includes(key.toLowerCase())) {
        sanitized[key] = this.maskValue(sanitized[key]);
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * 掩码处理值
   */
  private maskValue(value: any): string {
    if (!value) return '';
    const str = String(value);
    if (str.length <= 8) return '****';
    return str.substring(0, 4) + '****' + str.substring(str.length - 4);
  }

  /**
   * 调试日志
   */
  public debug(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const sanitizedData = this.sanitizeData(data);
      console.log(this.formatMessage(LogLevel.DEBUG, message, sanitizedData));
    }
  }

  /**
   * 信息日志
   */
  public info(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const sanitizedData = this.sanitizeData(data);
      console.log(this.formatMessage(LogLevel.INFO, message, sanitizedData));
    }
  }

  /**
   * 警告日志
   */
  public warn(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const sanitizedData = this.sanitizeData(data);
      console.warn(this.formatMessage(LogLevel.WARN, message, sanitizedData));
    }
  }

  /**
   * 错误日志
   */
  public error(message: string, error?: Error | any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorData = error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error as any),
      } : error;
      const sanitizedData = this.sanitizeData(errorData);
      console.error(this.formatMessage(LogLevel.ERROR, message, sanitizedData));
    }
  }

  /**
   * 创建带上下文的日志记录器
   */
  public static create(context: string): Logger {
    return new Logger(context);
  }
}

// 设置默认日志级别（从环境变量读取）
const envLogLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
if (envLogLevel && Object.values(LogLevel).includes(envLogLevel)) {
  Logger.setLogLevel(envLogLevel);
} 