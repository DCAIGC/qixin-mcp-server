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
 * 企业搜索参数接口
 */
export interface SearchEnterpriseArgs {
  keyword: string;
  matchType?: string;
  region?: string;
  skip?: number;
}

/**
 * 企业搜索结果项
 */
export interface EnterpriseSearchItem {
  matchType: string;
  name: string;
  reg_no: string;
  start_date: string;
  oper_name: string;
  credit_no: string;
  id: string;
  matchItems: string;
  type: number;
}

/**
 * 企业搜索结果
 */
export interface EnterpriseSearchResult {
  total: number;
  num: number;
  items: EnterpriseSearchItem[];
}

/**
 * 企业联系方式参数接口
 */
export interface GetEnterpriseContactArgs {
  keyword: string;
}

/**
 * 企业联系方式信息
 */
export interface EnterpriseContactInfo {
  address: string;
  telephone: string;
  regNo: string;
  name: string;
  email: string;
  creditNo: string;
}

/**
 * 企业规模参数接口
 */
export interface GetEnterpriseSizeArgs {
  name: string;
}

/**
 * 企业规模信息
 */
export interface EnterpriseSizeInfo {
  tag_code: string;
  tag_name: string;
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
 * 被执行企业参数接口
 */
export interface GetExecutedEnterpriseArgs {
  name: string;
  skip?: number;
}

/**
 * 被执行企业信息项
 */
export interface ExecutedEnterpriseItem {
  id: string;
  case_number: string;
  status: string;
  court: string;
  case_date: string;
  amount: string;
  disabled: string;
}

/**
 * 被执行企业信息结果
 */
export interface ExecutedEnterpriseResult {
  total: number;
  items: ExecutedEnterpriseItem[];
}

/**
 * 失信被执行企业参数接口
 */
export interface GetDishonestEnterpriseArgs {
  keyword: string;
  skip?: number;
}

/**
 * 失信被执行企业信息项
 */
export interface DishonestEnterpriseItem {
  province: string;
  date: string;
  doc_number: string;
  final_duty: string;
  execution_status: string;
  case_number: string;
  amount: string;
  publish_date: string;
  court: string;
  execution_desc: string;
  disabled: string;
  oper_name: string;
  number: string;
  ex_department: string;
}

/**
 * 失信被执行企业信息结果
 */
export interface DishonestEnterpriseResult {
  total: number;
  items: DishonestEnterpriseItem[];
}

/**
 * 裁判文书列表参数接口
 */
export interface GetLegalDocumentsArgs {
  name: string;
  matchType?: 'litigant' | 'judge';
  skip?: number;
}

/**
 * 裁判文书信息项
 */
export interface LegalDocumentItem {
  id: string;
  caseno: string;
  title: string;
  submittime: string;
  court: string;
  judge: string;
  case_type: string;
  party_info: string;
  case_reason: string;
  reason_type: string;
  doc_type: string;
  judgment_type: string;
  win_or_lose: string;
  docid: string;
  source: string;
}

/**
 * 裁判文书列表结果
 */
export interface LegalDocumentsResult {
  total: number;
  num: number;
  items: LegalDocumentItem[];
}

/**
 * 三层族谱参数接口
 */
export interface GetEnterpriseGenealogy3Args {
  name: string;
}

/**
 * 三层族谱节点
 */
export interface GenealogyNode {
  node_num?: string;
  invest_count: string;
  self: {
    eid: string;
    enterprises_name: string;
    percent: string;
    amount: string;
    parent_num: string;
    regno: string;
    enterprises_id: string;
  };
  invests?: any[];
}

/**
 * 三层族谱结果
 */
export interface EnterpriseGenealogy3Result {
  node_num: string;
  share_holders: GenealogyNode[];
  invests: GenealogyNode[];
}

/**
 * 行政处罚参数接口
 */
export interface GetAdminPenaltyArgs {
  keyword: string;
  skip?: number;
}

/**
 * 行政处罚信息项
 */
export interface AdminPenaltyItem {
  type: string;
  content: string;
  date: string;
  department: string;
  amount: string;
  description: string;
  public_date: string;
  code: string;
  name: string;
  personal_name: string;
  regno: string;
  id: string;
}

/**
 * 行政处罚结果
 */
export interface AdminPenaltyResult {
  total: number;
  items: AdminPenaltyItem[];
}

/**
 * 严重违法参数接口
 */
export interface GetSeriousIllegalArgs {
  name: string;
}

/**
 * 严重违法信息项
 */
export interface SeriousIllegalItem {
  in_reason: string;
  in_date: string;
  in_department: string;
  out_date: string;
  out_reason: string;
  out_department: string;
  is_history: number;
}

/**
 * 严重违法信息结果
 */
export interface SeriousIllegalResult {
  executed_person: any[];
  tax_violation: any[];
  execution: SeriousIllegalItem[];
}

/**
 * 对外担保参数接口
 */
export interface GetGuaranteeListArgs {
  name: string;
  skip?: number;
}

/**
 * 对外担保信息项
 */
export interface GuaranteeItem {
  guarstartdate: string;
  securityname: string;
  eid: string;
  buarrelation: string;
  guareid: string;
  id: string;
  guarjine: string;
  reportdate: string;
  tradedate: string;
  noticedate: string;
  isrltrade: string;
  guarenddate: string;
  guarrelation: string;
  reporttype: string;
  buareid: string;
  guarmethod: string;
  isperform: string;
  warcontent: string;
  guardealine: string;
  currency: string;
  guarcomname: string;
  buarcomname: string;
}

/**
 * 对外担保结果
 */
export interface GuaranteeListResult {
  total: number;
  items: GuaranteeItem[];
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