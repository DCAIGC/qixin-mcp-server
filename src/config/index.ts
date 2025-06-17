import * as dotenv from 'dotenv';
import { ConfigOptions, ConfigError } from '../types';

// 加载环境变量
dotenv.config();

/**
 * 配置管理类
 */
export class Config {
  private static instance: Config;
  private options: ConfigOptions;

  private constructor() {
    this.options = this.loadConfig();
    this.validateConfig();
  }

  /**
   * 获取配置实例（单例模式）
   */
  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  /**
   * 加载配置
   */
  private loadConfig(): ConfigOptions {
    const options: ConfigOptions = {
      appKey: process.env.QIXIN_APP_KEY || '',
      secretKey: process.env.QIXIN_SECRET_KEY || '',
      baseUrl: process.env.QIXIN_BASE_URL || 'https://api.qixin.com/APIService',
      timeout: parseInt(process.env.QIXIN_TIMEOUT || '30000', 10),
      maxRetries: parseInt(process.env.QIXIN_MAX_RETRIES || '3', 10),
    };

    return options;
  }

  /**
   * 验证配置
   */
  private validateConfig(): void {
    const { appKey, secretKey } = this.options;

    if (!appKey || !secretKey) {
      throw new ConfigError(
        '缺少必要的环境变量配置。请设置 QIXIN_APP_KEY 和 QIXIN_SECRET_KEY 环境变量。'
      );
    }

    if (appKey.length < 10) {
      throw new ConfigError('QIXIN_APP_KEY 格式不正确');
    }

    if (secretKey.length < 10) {
      throw new ConfigError('QIXIN_SECRET_KEY 格式不正确');
    }

    if (!this.options.timeout || this.options.timeout < 1000 || this.options.timeout > 60000) {
      throw new ConfigError('超时时间应在 1-60 秒之间');
    }

    if (this.options.maxRetries === undefined || this.options.maxRetries < 0 || this.options.maxRetries > 10) {
      throw new ConfigError('最大重试次数应在 0-10 次之间');
    }
  }

  /**
   * 获取配置选项
   */
  public getOptions(): Readonly<ConfigOptions> {
    return Object.freeze({ ...this.options });
  }

  /**
   * 获取 App Key
   */
  public getAppKey(): string {
    return this.options.appKey;
  }

  /**
   * 获取 Secret Key
   */
  public getSecretKey(): string {
    return this.options.secretKey;
  }

  /**
   * 获取基础 URL
   */
  public getBaseUrl(): string {
    return this.options.baseUrl || 'https://api.qixin.com/APIService';
  }

  /**
   * 获取超时时间
   */
  public getTimeout(): number {
    return this.options.timeout || 30000;
  }

  /**
   * 获取最大重试次数
   */
  public getMaxRetries(): number {
    return this.options.maxRetries || 3;
  }

  /**
   * 获取 SSE 服务端口
   */
  public static getPort(): number {
    return parseInt(process.env.PORT || '3000', 10);
  }
}

// 导出默认配置实例
export const config = Config.getInstance(); 