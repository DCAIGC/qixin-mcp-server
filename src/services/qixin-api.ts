import axios, { AxiosInstance, AxiosError } from 'axios';
import { 
  EnterpriseBasicInfo, 
  EnterpriseSearchResult,
  EnterpriseContactInfo,
  EnterpriseSizeInfo,
  ExecutedEnterpriseResult,
  DishonestEnterpriseResult,
  LegalDocumentsResult,
  EnterpriseGenealogy3Result,
  AdminPenaltyResult,
  SeriousIllegalResult,
  GuaranteeListResult,
  QixinApiResponse, 
  QixinApiError 
} from '../types';
import { SignatureService } from './signature';
import { Logger } from '../utils/logger';

/**
 * 启信宝 API 客户端类
 */
export class QixinApiClient {
  private appkey: string;
  private secretKey: string;
  private baseUrl: string;
  private timeout: number;
  private maxRetries: number;
  private httpClient: AxiosInstance;
  private logger: Logger;

  constructor(appkey: string, secretKey: string, baseUrl?: string, timeout?: number, maxRetries?: number) {
    this.appkey = appkey;
    this.secretKey = secretKey;
    this.baseUrl = baseUrl || 'https://api.qixin.com/APIService';
    this.timeout = timeout || 30000;
    this.maxRetries = maxRetries || 3;
    this.logger = Logger.create('QixinApiClient');

    // 初始化 HTTP 客户端
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
    });

    // 设置请求拦截器
    this.setupInterceptors();
  }

  /**
   * 设置 Axios 拦截器
   */
  private setupInterceptors(): void {
    // 请求拦截器 - 添加认证头部
    this.httpClient.interceptors.request.use(
      (config) => {
        const authHeaders = SignatureService.generateAuthHeaders(this.appkey, this.secretKey);
        
        // 使用 Object.assign 或循环设置 headers
        Object.keys(authHeaders).forEach(key => {
          config.headers[key] = authHeaders[key];
        });
        
        this.logger.debug('发送 API 请求', {
          url: config.url,
          method: config.method,
          params: config.params,
        });

        return config;
      },
      (error) => {
        this.logger.error('请求拦截器错误', error);
        return Promise.reject(error);
      }
    );

    // 响应拦截器 - 处理响应和错误
    this.httpClient.interceptors.response.use(
      (response) => {
        this.logger.debug('收到 API 响应', {
          status: response.status,
          data: response.data,
        });
        return response;
      },
      (error) => {
        this.logger.error('响应错误', error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * 查询企业基本信息
   * @param keyword 查询关键词（企业名称、统一社会信用代码等）
   * @returns 企业基本信息
   */
  public async getBasicInfo(keyword: string): Promise<EnterpriseBasicInfo> {
    if (!keyword || keyword.trim().length === 0) {
      throw new QixinApiError('查询关键词不能为空');
    }

    const endpoint = '/enterprise/getBasicInfo';
    const params = { keyword: keyword.trim() };

    try {
      const data = await this.requestWithRetry<QixinApiResponse<EnterpriseBasicInfo>>(
        'GET',
        endpoint,
        params
      );

      if (data.status !== '200' && data.status !== 'success') {
        throw new QixinApiError(
          data.message || '查询失败',
          data.error_code,
          parseInt(data.status)
        );
      }

      if (!data.data) {
        throw new QixinApiError('未找到相关企业信息', 'NO_DATA');
      }

      return this.formatEnterpriseInfo(data.data);
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * 带重试的请求方法
   */
  private async requestWithRetry<T>(
    method: string,
    url: string,
    params?: any,
    retryCount = 0
  ): Promise<T> {
    try {
      const response = await this.httpClient.request<T>({
        method,
        url,
        params: method === 'GET' ? params : undefined,
        data: method !== 'GET' ? params : undefined,
      });

      return response.data;
    } catch (error) {
      if (retryCount < this.maxRetries && this.shouldRetry(error)) {
        this.logger.warn(`请求失败，正在重试...（第 ${retryCount + 1} 次）`, {
          url,
          error: error instanceof Error ? error.message : error,
        });

        // 指数退避
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));

        return this.requestWithRetry<T>(method, url, params, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: any): boolean {
    if (error instanceof AxiosError) {
      // 网络错误或超时
      if (!error.response || error.code === 'ECONNABORTED') {
        return true;
      }

      // 5xx 服务器错误
      if (error.response.status >= 500) {
        return true;
      }

      // 429 请求过多
      if (error.response.status === 429) {
        return true;
      }
    }

    return false;
  }

  /**
   * 格式化企业信息
   */
  private formatEnterpriseInfo(data: any): EnterpriseBasicInfo {
    // 根据实际 API 返回的字段进行映射
    return {
      name: data.name || data.entName || '',
      creditCode: data.creditCode || data.creditNo || '',
      legalPerson: data.legalPerson || data.legalPersonName || '',
      registeredCapital: data.registeredCapital || data.regCapital || '',
      establishDate: data.establishDate || data.esDate || '',
      businessStatus: data.businessStatus || data.status || '',
      businessScope: data.businessScope || data.scope || '',
      registeredAddress: data.registeredAddress || data.address || '',
      ...data, // 保留其他所有字段
    };
  }

  /**
   * 处理 API 错误
   */
  private handleApiError(error: any): never {
    if (error instanceof QixinApiError) {
      throw error;
    }

    if (error instanceof AxiosError) {
      if (error.response) {
        // 服务器返回错误响应
        const data = error.response.data as QixinApiResponse;
        throw new QixinApiError(
          data?.message || `API 请求失败: ${error.response.status}`,
          data?.error_code || 'API_ERROR',
          error.response.status
        );
      } else if (error.request) {
        // 请求已发送但没有收到响应
        throw new QixinApiError(
          '网络请求失败，请检查网络连接',
          'NETWORK_ERROR'
        );
      }
    }

    // 其他错误
    throw new QixinApiError(
      error instanceof Error ? error.message : '未知错误',
      'UNKNOWN_ERROR'
    );
  }

  /**
   * 企业模糊搜索
   * @param keyword 查询关键词
   * @param matchType 匹配类型
   * @param region 地区编码
   * @param skip 跳过条目数
   * @returns 企业搜索结果
   */
  public async searchEnterprise(
    keyword: string, 
    matchType?: string, 
    region?: string, 
    skip?: number
  ): Promise<EnterpriseSearchResult> {
    if (!keyword || keyword.trim().length < 2) {
      throw new QixinApiError('查询关键词至少需要2个字符');
    }

    // 不允许仅输入公司和有限公司
    const trimmedKeyword = keyword.trim();
    if (trimmedKeyword === '公司' || trimmedKeyword === '有限公司') {
      throw new QixinApiError('不允许仅输入"公司"或"有限公司"');
    }

    const endpoint = '/v2/search/advSearch';
    const params: any = { keyword: trimmedKeyword };
    
    if (matchType) params.matchType = matchType;
    if (region) params.region = region;
    if (skip !== undefined) params.skip = skip;

    try {
      const data = await this.requestWithRetry<QixinApiResponse<EnterpriseSearchResult>>(
        'GET',
        endpoint,
        params
      );

      if (data.status !== '200') {
        throw new QixinApiError(
          data.message || '查询失败',
          data.error_code,
          parseInt(data.status)
        );
      }

      if (!data.data) {
        throw new QixinApiError('未找到相关企业信息', 'NO_DATA');
      }

      return data.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * 查询企业联系方式
   * @param keyword 企业全名/注册号/统一社会信用代码
   * @returns 企业联系方式信息
   */
  public async getContactInfo(keyword: string): Promise<EnterpriseContactInfo> {
    if (!keyword || keyword.trim().length === 0) {
      throw new QixinApiError('查询关键词不能为空');
    }

    const endpoint = '/enterprise/getContactInfo';
    const params = { keyword: keyword.trim() };

    try {
      const data = await this.requestWithRetry<QixinApiResponse<EnterpriseContactInfo>>(
        'GET',
        endpoint,
        params
      );

      if (data.status !== '200') {
        throw new QixinApiError(
          data.message || '查询失败',
          data.error_code,
          parseInt(data.status)
        );
      }

      if (!data.data) {
        throw new QixinApiError('未找到企业联系方式信息', 'NO_DATA');
      }

      return data.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * 查询企业规模
   * @param name 企业全名/注册号/统一社会信用代码
   * @returns 企业规模信息
   */
  public async getEntSize(name: string): Promise<EnterpriseSizeInfo> {
    if (!name || name.trim().length === 0) {
      throw new QixinApiError('企业名称不能为空');
    }

    const endpoint = '/enterprise/getEntSize';
    const params = { name: name.trim() };

    try {
      const data = await this.requestWithRetry<QixinApiResponse<EnterpriseSizeInfo>>(
        'GET',
        endpoint,
        params
      );

      if (data.status !== '200') {
        throw new QixinApiError(
          data.message || '查询失败',
          data.error_code,
          parseInt(data.status)
        );
      }

      if (!data.data) {
        throw new QixinApiError('未找到企业规模信息', 'NO_DATA');
      }

      return data.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * 查询被执行企业
   * @param name 企业全名/注册号/统一社会信用代码
   * @param skip 跳过条目数
   * @returns 被执行企业信息
   */
  public async getExecutedEnterprise(name: string, skip?: number): Promise<ExecutedEnterpriseResult> {
    if (!name || name.trim().length === 0) {
      throw new QixinApiError('企业名称不能为空');
    }

    const endpoint = '/execution/getExecutedpersonListByName';
    const params: any = { name: name.trim() };
    if (skip !== undefined) params.skip = skip;

    try {
      const data = await this.requestWithRetry<QixinApiResponse<ExecutedEnterpriseResult>>(
        'GET',
        endpoint,
        params
      );

      if (data.status !== '200') {
        throw new QixinApiError(
          data.message || '查询失败',
          data.error_code,
          parseInt(data.status)
        );
      }

      if (!data.data) {
        throw new QixinApiError('未找到被执行企业信息', 'NO_DATA');
      }

      return data.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * 查询失信被执行企业
   * @param keyword 企业全名/注册号/统一社会信用代码
   * @param skip 跳过条目数
   * @returns 失信被执行企业信息
   */
  public async getDishonestEnterprise(keyword: string, skip?: number): Promise<DishonestEnterpriseResult> {
    if (!keyword || keyword.trim().length === 0) {
      throw new QixinApiError('查询关键词不能为空');
    }

    const endpoint = '/execution/getExecutionListByName';
    const params: any = { keyword: keyword.trim() };
    if (skip !== undefined) params.skip = skip;

    try {
      const data = await this.requestWithRetry<QixinApiResponse<DishonestEnterpriseResult>>(
        'GET',
        endpoint,
        params
      );

      if (data.status !== '200') {
        throw new QixinApiError(
          data.message || '查询失败',
          data.error_code,
          parseInt(data.status)
        );
      }

      if (!data.data) {
        throw new QixinApiError('未找到失信被执行企业信息', 'NO_DATA');
      }

      return data.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * 查询裁判文书列表
   * @param name 企业名称
   * @param matchType 匹配类型
   * @param skip 跳过条目数
   * @returns 裁判文书列表
   */
  public async getLegalDocuments(name: string, matchType?: 'litigant' | 'judge', skip?: number): Promise<LegalDocumentsResult> {
    if (!name || name.trim().length === 0) {
      throw new QixinApiError('企业名称不能为空');
    }

    const endpoint = '/lawsuit/getLawsuitListByName';
    const params: any = { name: name.trim() };
    if (matchType) params.matchType = matchType;
    if (skip !== undefined) params.skip = skip;

    try {
      const data = await this.requestWithRetry<QixinApiResponse<LegalDocumentsResult>>(
        'GET',
        endpoint,
        params
      );

      if (data.status !== '200') {
        throw new QixinApiError(
          data.message || '查询失败',
          data.error_code,
          parseInt(data.status)
        );
      }

      if (!data.data) {
        throw new QixinApiError('未找到裁判文书信息', 'NO_DATA');
      }

      return data.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * 查询企业三层族谱
   * @param name 企业全名/注册号/统一社会信用代码
   * @returns 企业三层族谱信息
   */
  public async getEnterpriseGenealogy3(name: string): Promise<EnterpriseGenealogy3Result> {
    if (!name || name.trim().length === 0) {
      throw new QixinApiError('企业名称不能为空');
    }

    const endpoint = '/relation/getRelationInfoByName';
    const params = { name: name.trim() };

    try {
      const data = await this.requestWithRetry<QixinApiResponse<EnterpriseGenealogy3Result>>(
        'GET',
        endpoint,
        params
      );

      if (data.status !== '200') {
        throw new QixinApiError(
          data.message || '查询失败',
          data.error_code,
          parseInt(data.status)
        );
      }

      if (!data.data) {
        throw new QixinApiError('未找到企业族谱信息', 'NO_DATA');
      }

      return data.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * 查询行政处罚
   * @param keyword 企业名称
   * @param skip 跳过条目数
   * @returns 行政处罚信息
   */
  public async getAdminPenalty(keyword: string, skip?: number): Promise<AdminPenaltyResult> {
    if (!keyword || keyword.trim().length === 0) {
      throw new QixinApiError('查询关键词不能为空');
    }

    const endpoint = '/v2/adminPunish/getAdminPunishByName';
    const params: any = { keyword: keyword.trim() };
    if (skip !== undefined) params.skip = skip;

    try {
      const data = await this.requestWithRetry<QixinApiResponse<AdminPenaltyResult>>(
        'GET',
        endpoint,
        params
      );

      if (data.status !== '200') {
        throw new QixinApiError(
          data.message || '查询失败',
          data.error_code,
          parseInt(data.status)
        );
      }

      if (!data.data) {
        throw new QixinApiError('未找到行政处罚信息', 'NO_DATA');
      }

      return data.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * 查询严重违法
   * @param name 企业全名/注册号/统一社会信用代码
   * @returns 严重违法信息
   */
  public async getSeriousIllegal(name: string): Promise<SeriousIllegalResult> {
    if (!name || name.trim().length === 0) {
      throw new QixinApiError('企业名称不能为空');
    }

    const endpoint = '/enterprise/getSeriousIllegalByName';
    const params = { name: name.trim() };

    try {
      const data = await this.requestWithRetry<QixinApiResponse<SeriousIllegalResult>>(
        'GET',
        endpoint,
        params
      );

      if (data.status !== '200') {
        throw new QixinApiError(
          data.message || '查询失败',
          data.error_code,
          parseInt(data.status)
        );
      }

      if (!data.data) {
        throw new QixinApiError('未找到严重违法信息', 'NO_DATA');
      }

      return data.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * 查询对外担保
   * @param name 企业全名/注册号/统一社会信用代码
   * @param skip 跳过条目数
   * @returns 对外担保信息
   */
  public async getGuaranteeList(name: string, skip?: number): Promise<GuaranteeListResult> {
    if (!name || name.trim().length === 0) {
      throw new QixinApiError('企业名称不能为空');
    }

    const endpoint = '/qc/getGuaranteeList';
    const params: any = { name: name.trim() };
    if (skip !== undefined) params.skip = skip;

    try {
      const data = await this.requestWithRetry<QixinApiResponse<GuaranteeListResult>>(
        'GET',
        endpoint,
        params
      );

      if (data.status !== '200') {
        throw new QixinApiError(
          data.message || '查询失败',
          data.error_code,
          parseInt(data.status)
        );
      }

      if (!data.data) {
        throw new QixinApiError('未找到对外担保信息', 'NO_DATA');
      }

      return data.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }
} 