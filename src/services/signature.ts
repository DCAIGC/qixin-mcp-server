import * as crypto from 'crypto';
import { SignatureOptions } from '../types';

/**
 * 签名服务类
 * 负责生成启信宝 API 调用所需的签名
 */
export class SignatureService {
  /**
   * 生成签名
   * @param options 签名选项
   * @returns MD5 签名字符串
   */
  public static generateSignature(options: SignatureOptions): string {
    const { appkey, timestamp, secretKey } = options;

    // 验证参数
    this.validateSignatureParams(appkey, secretKey);

    // 拼接签名字符串：appkey + timestamp + secretKey
    const signString = `${appkey}${timestamp}${secretKey}`;

    // 生成 MD5 签名
    const hash = crypto.createHash('md5');
    hash.update(signString);
    return hash.digest('hex');
  }

  /**
   * 生成当前时间戳（毫秒）
   * @returns 时间戳
   */
  public static generateTimestamp(): number {
    return new Date().getTime();
  }

  /**
   * 验证签名参数
   * @param appkey API 密钥
   * @param secretKey 密钥
   */
  public static validateSignatureParams(appkey: string, secretKey: string): void {
    if (!appkey || typeof appkey !== 'string') {
      throw new Error('Invalid appkey: appkey must be a non-empty string');
    }

    if (!secretKey || typeof secretKey !== 'string') {
      throw new Error('Invalid secretKey: secretKey must be a non-empty string');
    }

    if (appkey.length < 10) {
      throw new Error('Invalid appkey: appkey length is too short');
    }

    if (secretKey.length < 10) {
      throw new Error('Invalid secretKey: secretKey length is too short');
    }
  }

  /**
   * 生成完整的认证头部
   * @param appkey API 密钥
   * @param secretKey 密钥
   * @returns 认证头部对象
   */
  public static generateAuthHeaders(appkey: string, secretKey: string): Record<string, string> {
    const timestamp = this.generateTimestamp();
    const sign = this.generateSignature({ appkey, timestamp, secretKey });

    return {
      'Auth-version': '2.0',
      'appkey': appkey,
      'timestamp': timestamp.toString(),
      'sign': sign,
      'Connection': 'keep-alive',
    };
  }
} 