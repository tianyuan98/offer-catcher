/* ===== ATS 分析类型 ===== */

export interface ATSScore {
  overall: number;       // 总分 0-100
  formatScore: number;   // 格式评分
  keywordScore: number;  // 关键词匹配评分
  structureScore: number;// 结构评分
  contentScore: number;  // 内容质量评分
}

export interface ATSKeyword {
  keyword: string;
  source: "resume" | "jd" | "both";
  priority: "high" | "medium" | "low";
  position?: string;    // 在简历中出现的位置
}

export interface ATSReport {
  score: ATSScore;
  coveredKeywords: ATSKeyword[];
  missingKeywords: ATSKeyword[];
  formatIssues: string[];
  suggestions: string[];
}

/* ===== 真实性验证类型 ===== */

export type ClaimType =
  | "quantified_result"     // 量化成果
  | "team_management"       // 团队管理
  | "business_metric"       // 业务指标
  | "technology_stack"      // 技术栈
  | "process_improvement"   // 流程改进
  | "award_certification";  // 获奖认证

export type RiskLevel = "low" | "medium" | "high";

export interface TruthClaim {
  id: string;
  originalText: string;       // 简历原文
  claimType: ClaimType;
  confidenceScore: number;   // 0-100 可信度
  riskLevel: RiskLevel;       // low(75-89) / medium(45-69) / high(15-39)
  verificationQuestions: string[]; // AI追问列表
  evidenceType: string[];     // 可提交的证据类型
  evidenceSubmitted?: EvidenceItem[];
}

export interface EvidenceItem {
  type: "link" | "document" | "screenshot" | "text";
  label: string;
  url?: string;
}

export interface TruthReport {
  overallAccuracy: number;    // 整体准确性评分
  claims: TruthClaim[];
  summary: string;
  riskCount: { low: number; medium: number; high: number };
}

/* ===== 职位匹配类型 ===== */

export interface MatchDimension {
  name: string;
  score: number;
  details: string;
}

export interface MatchReport {
  overallScore: number;
  dimensions: MatchDimension[];
  strengths: string[];
  gaps: string[];
  recommendation: "strong_apply" | "cautious_apply" | "not_recommended";
  recommendationReason: string;
}

/* ===== 面试准备类型 ===== */

export interface InterviewQuestion {
  id: string;
  category: "technical" | "behavioral" | "situational";
  question: string;
  difficulty: "easy" | "medium" | "hard";
  hint: string;
  suggestedAnswer: string;
}

export interface InterviewPrep {
  successPrediction: number;
  strengths: string[];
  weaknesses: string[];
  questions: InterviewQuestion[];
  preparationTips: string[];
}

/* ===== AI 对话类型 ===== */

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  relatedClaimId?: string;
}

/* ===== 优化建议类型（可操作） ===== */

export type SuggestionStatus = "pending" | "chatting" | "done";

export interface OptimizationSuggestion {
  id: string;
  section: string;              // 影响的模块（如"项目经历"、"个人摘要"）
  description: string;           // AI 建议描述
  reason: string;                // 为什么需要修改
  originalText?: string;         // 对应的简历原文（用于在生成时提示AI不要照搬原文数字）
  aiQuestions: string[];          // AI 需要向用户追问的问题
  status: SuggestionStatus;      // pending → chatting → done
  collectedInfo?: string[];      // 用户在对话中提供的回答
  optimizedText?: string;       // 最终生成的优化描述
  relatedClaimId?: string;       // 关联的真实性验证声明
}

/* ===== 优化对比类型 ===== */

export interface OptimizedSection {
  section: string;
  original: string;
  optimized: string;
  changes: string[];
  jdKeywordsAdded: string[];
}

/* ===== 完整分析结果（三层输出） ===== */

export interface FullAnalysisResult {
  resumeText: string;
  jdText: string;

  // Layer 1: ATS 优化
  atsReport: ATSReport;

  // Layer 2: 真实性验证
  truthReport: TruthReport;

  // Layer 3: 面试准备
  interviewPrep: InterviewPrep;

  // 匹配分析
  matchReport: MatchReport;

  // 可操作的优化建议列表
  optimizationSuggestions: OptimizationSuggestion[];

  // 优化后简历
  optimizedResume: OptimizedSection[];
}
