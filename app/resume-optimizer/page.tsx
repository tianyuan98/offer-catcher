"use client";

import { useState, useCallback, useRef } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { ATSScoreCard } from "@/components/analysis/ATSScoreCard";
import { TruthReportPanel } from "@/components/analysis/TruthReportPanel";
import { InterviewPrepPanel } from "@/components/analysis/InterviewPrepPanel";
import { MatchAnalysisCard } from "@/components/analysis/MatchAnalysisCard";
import { AIChatPanel } from "@/components/analysis/AIChatPanel";
import { OptimizationCompare } from "@/components/analysis/OptimizationCompare";
import { runFullAnalysis, generateOptimizedTextFromChat } from "@/lib/engines/analyzer";
import { clientChatJSON } from "@/lib/client-ai";
import { extractTextFromFile } from "@/lib/pdf-extract";
import type {
  FullAnalysisResult,
  ChatMessage,
  OptimizationSuggestion,
} from "@/types/analysis";

type AnalysisState = "idle" | "analyzing" | "done";

// 分析步骤进度
type AnalysisStep = {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "failed";
};

const tabItems = [
  { id: "ats", label: "ATS 优化", icon: "📊", badge: "Layer 1" },
  { id: "truth", label: "真实性验证", icon: "🔍", badge: "Layer 2" },
  { id: "match", label: "匹配分析", icon: "🎯", badge: "" },
  { id: "interview", label: "面试准备", icon: "🎤", badge: "Layer 3" },
  { id: "optimize", label: "优化对比", icon: "✏️", badge: "" },
];

export default function ResumeOptimizerPage() {
  const [resumeName, setResumeName] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [activeTab, setActiveTab] = useState("ats");
  const [result, setResult] = useState<FullAnalysisResult | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showExport, setShowExport] = useState(false);

  // 优化建议状态管理
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(null);

  // 追踪当前引导对话已问的问题索引
  const guidedQuestionIndexRef = useRef(0);

  // 频率限制：上次分析时间戳
  const lastAnalysisTimeRef = useRef<number>(0);
  const RATE_LIMIT_MS = 30000; // 30秒冷却

  // 分析步骤进度
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([
    { id: "local", label: "ATS 格式评分与关键词提取", status: "pending" },
    { id: "suggestions", label: "生成可操作优化建议（AI）", status: "pending" },
    { id: "optimize", label: "生成优化对比版本（AI）", status: "pending" },
    { id: "match", label: "岗位匹配度多维分析（AI）", status: "pending" },
    { id: "interview", label: "面试问题库生成（AI）", status: "pending" },
    { id: "truth", label: "简历真实性验证（AI）", status: "pending" },
  ]);

  const canAnalyze = resumeText.trim().length > 0 && jdText.trim().length > 20;

  const activeSuggestion = activeSuggestionId
    ? suggestions.find((s) => s.id === activeSuggestionId) || null
    : null;

  // 生成可下载/复制的纯文本报告
  function generateReportText(): string {
    if (!result) return "";
    const lines: string[] = [
      "=== Offer捕手 · AI简历分析报告 ===",
      `生成时间：${new Date().toLocaleString("zh-CN")}`,
      `简历文件：${resumeName}`,
      "",
      "─── ATS 评分 ───",
      `综合得分：${result.atsReport.score.overall}/100`,
      "",
      "─── 岗位匹配度 ───",
      `总体匹配分：${result.matchReport.overallScore}%`,
      `投递建议：${result.matchReport.recommendation === "strong_apply" ? "强烈推荐投递" : result.matchReport.recommendation === "cautious_apply" ? "谨慎投递" : "建议完善后投递"}`,
      "",
      "优势：",
      ...(result.matchReport.strengths || []).map((s) => `  · ${s}`),
      "",
      "差距：",
      ...(result.matchReport.gaps || []).map((g) => `  · ${g}`),
      "",
      "─── 真实性验证 ───",
      `整体可信度：${result.truthReport.overallAccuracy}%`,
      result.truthReport.summary,
      "",
      "─── 面试准备 ───",
      `面试成功率预测：${result.interviewPrep.successPrediction}%`,
      "",
      "准备建议：",
      ...(result.interviewPrep.preparationTips || []).map((t) => `  · ${t}`),
      "",
      "─── 优化建议 ───",
      ...(suggestions.length > 0
        ? suggestions.map((s) => `【${s.section}】${s.description}${s.optimizedText ? `\n  → 优化结果：${s.optimizedText}` : ""}`)
        : ["（无AI优化建议）"]),
      "",
      "=== 报告结束 ===",
    ];
    return lines.join("\n");
  }

  function handleCopyReport() {
    const text = generateReportText();
    navigator.clipboard.writeText(text).then(() => {
      alert("报告已复制到剪贴板！");
    }).catch(() => {
      alert("复制失败，请手动选择文本复制。");
    });
  }

  function handleDownloadReport() {
    const text = generateReportText();
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `简历分析报告_${resumeName.replace(/\.[^.]+$/, "")}_${new Date().toLocaleDateString("zh-CN").replace(/\//g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setResumeName(file.name);
    setAnalysisState("idle");

    const result = await extractTextFromFile(file);
    if (result.error) {
      alert(result.error);
      setResumeText("");
    } else if (result.text) {
      setResumeText(result.text);
    } else {
      alert("未能从文件中提取到文本，请直接粘贴简历内容。");
      setResumeText("");
    }
  }

  function handleAnalyze() {
    if (!canAnalyze) return;

    // 频率限制检查
    const now = Date.now();
    const timeSinceLast = now - lastAnalysisTimeRef.current;
    if (timeSinceLast < RATE_LIMIT_MS && lastAnalysisTimeRef.current > 0) {
      const remaining = Math.ceil((RATE_LIMIT_MS - timeSinceLast) / 1000);
      alert(`请稍候 ${remaining} 秒后再次分析，避免请求过于频繁。`);
      return;
    }

    lastAnalysisTimeRef.current = now;
    setAnalysisState("analyzing");
    setResult(null);
    setMessages([]);
    setSuggestions([]);
    setActiveSuggestionId(null);
    setShowExport(false);

    // 重置步骤进度
    const resetSteps: AnalysisStep[] = [
      { id: "local", label: "ATS 格式评分与关键词提取", status: "running" },
      { id: "suggestions", label: "生成可操作优化建议（AI）", status: "pending" },
      { id: "optimize", label: "生成优化对比版本（AI）", status: "pending" },
      { id: "match", label: "岗位匹配度多维分析（AI）", status: "pending" },
      { id: "interview", label: "面试问题库生成（AI）", status: "pending" },
      { id: "truth", label: "简历真实性验证（AI）", status: "pending" },
    ];
    setAnalysisSteps(resetSteps);

    const updateStep = (id: string, status: AnalysisStep["status"]) => {
      setAnalysisSteps((prev) => {
        const updated = prev.map((s) => (s.id === id ? { ...s, status } : s));
        // 当前步骤完成后，自动将下一个 pending 步骤设为 running
        const nextPending = updated.find((s) => s.status === "pending");
        if (nextPending && status === "done") {
          return updated.map((s) => (s.id === nextPending.id ? { ...s, status: "running" } : s));
        }
        return updated;
      });
    };

    setTimeout(async () => {
      // 本地引擎仅做ATS关键词扫描（不会生成假数据）
      const analysisResult = runFullAnalysis(resumeText, jdText);
      updateStep("local", "done");

      // 同时发起五个 AI 请求（并行，并独立追踪进度）
      const withProgress = <T,>(promise: Promise<T | null>, stepId: string): Promise<T | null> =>
        promise.then((r) => { updateStep(stepId, r !== null ? "done" : "failed"); return r; })
               .catch(() => { updateStep(stepId, "failed"); return null; });

      const [aiSuggestions, aiOptimizedSections, aiMatchReport, aiInterviewPrep, aiTruthReport] = await Promise.all([
        // 请求1：生成可操作的优化建议（含引导问题）
        withProgress(clientChatJSON<Array<{
          id: string;
          section: string;
          description: string;
          reason: string;
          aiQuestions: string[];
        }>>(
          [
            {
              role: "system",
              content: `你是一位资深 HR 和简历优化专家。你的任务是针对简历中的具体文字，逐句诊断并给出精准优化建议。

【分析前必须完成】：
1. 从 JD 中识别目标岗位类型（技术/产品/运营/HR/销售/财务/设计等）
2. 通读简历全文，标记出具体哪几句话/哪几个模块有问题
3. 只针对该岗位类型的核心能力要求给出建议

【分析框架 - 必须按这8个维度逐一排查】：
1. 关键词匹配：JD中的硬性技能关键词是否在简历中出现
2. STAR法则：经历描述是否包含情境(S)、任务(T)、行动(A)、结果(R)
3. 量化数据：是否有"很多"、"显著提升"、"负责管理"等模糊表述
4. 动词强度：是否使用了"主导"、"推动"、"设计"、"攻克"等强动词
5. 胜任力呈现：是否有项目经验支撑JD要求的胜任力模型
6. 结构逻辑：模块顺序是否符合该岗位阅读习惯
7. ATS友好：复杂表格/图标/非标准排版是否影响机器解析
8. 表述合规：是否有"吃苦耐劳"、"性格开朗"等主观冗余描述

【错误示例 - 绝对禁止输出这类模板建议】：
- ❌ "补充项目成果的数据指标" → 没有指出哪个项目、缺什么指标
- ❌ "在技能栏突出 JD 要求的核心技能" → 没有指出技能栏具体问题
- ❌ "优化简历排版格式" → 与内容无关的泛泛而谈
- ❌ "建议增加量化描述" → 没有引用简历中的具体模糊句子

【正确示例 - 必须引用简历原文，给出具体位置】：
- ✅ "工作经历第2条『参与了XX后台管理系统开发』使用了弱动词『参与』，建议改为『主导XX系统核心模块开发，独立完成权限管理模块设计，覆盖3000+内部用户』"
- ✅ "项目经历『负责用户增长活动』中仅描述『用户量有所提升』，缺乏量化数据，建议补充『通过裂变活动实现DAU从1.2万增长至2.5万，提升108%，获客成本降低35%』"
- ✅ "技能栏缺少JD要求的『React』和『TypeScript』关键词，建议在技术栈中补充"

【绝对禁止】：
- 禁止用A岗的标准评判B岗简历
- 禁止建议非技术岗补充GitHub链接
- 禁止建议非数据岗补充数据看板经验
- 禁止凭空捏造简历中不存在的薄弱点
- 禁止输出没有引用简历原文的泛泛建议

只输出 JSON 数组，不要其他内容。`,
            },
            {
              role: "user",
              content: `【简历原文】\n${resumeText}\n\n【岗位描述JD】\n${jdText}\n\n请按以下步骤执行：\n1. 识别JD对应的岗位类型\n2. 按上述8个维度逐一扫描简历中的具体问题句子\n3. 针对每一条发现的问题，必须引用简历中的原文，并给出具体的修改建议\n4. 生成3-5条优化建议，每条建议都要具体到某句话的某个问题\n\n请严格输出 JSON 数组格式（不要有 markdown 代码块）：\n[\n  {\n    "id": "sg-1",\n    "section": "<简历中的真实板块名称，如『工作经历-XX公司』或『项目经历-XX项目』>",\n    "originalText": "<该建议对应的简历原文片段，原文引用，不得改写>",\n    "description": "<具体建议，必须引用简历原文并指出具体问题，30-50字>",\n    "reason": "<结合JD岗位类型和简历真实内容的详细分析理由，必须引用原文>",\n    "aiQuestions": ["<引导用户补充该条优化所需的新信息（如具体成果数字、实际规模等）的问题1>", "<问题2>", "<问题3>"]\n  }\n]\n\n特别注意aiQuestions：问题要引导用户提供「简历原文中没有的新信息」，不要问「你的简历里有没有量化数据」，而要问「这段经历实际产出的结果是多少（比如节省了多少时间、覆盖了多少用户）」。`,
            },
          ],
          { temperature: 0.3, maxTokens: 3000 }
        ), "suggestions"),

        // 请求2：基于真实简历内容生成优化对比
        withProgress(clientChatJSON<Array<{
          section: string;
          original: string;
          optimized: string;
          changes: string[];
          jdKeywordsAdded: string[];
        }>>(
          [
            {
              role: "system",
              content: `你是一位资深简历优化专家。

【强制要求】：
1. 先从JD中识别目标岗位类型
2. 只从简历原文中提取真实存在的模块内容作为"原始内容"
3. original字段必须一字不改地引用简历原文，不得改写、缩写或编造
4. 不得编造简历中不存在的模块（如没有"个人摘要"就不要硬造）
5. 只输出简历中真实存在的模块的优化对比
6. optimized版本必须使用STAR法则，补充量化数据，使用强动词

【优化标准 - 8项核心规则】：
1. 关键词匹配：在optimized中自然融入JD核心关键词
2. STAR法则：情境→任务→行动→结果
3. 量化数据：用具体数字替换"很多"、"显著提升"等模糊词
4. 动词升级："参与"→"主导"、"做了"→"设计并落地"
5. 胜任力呈现：每条经历都要体现JD要求的某项能力
6. 结构逻辑：信息按重要性排序
7. ATS友好：避免复杂格式，纯文本可读
8. 表述合规：删除主观形容词

只输出 JSON 数组，不要其他内容。`,
            },
            {
              role: "user",
              content: `【简历原文】\n${resumeText}\n\n【岗位描述JD】\n${jdText}\n\n请从简历中提取真实存在的模块（如工作经历、项目经历、教育背景等），为每个模块生成优化对比。\n\n要求：\n1. original必须一字不改地引用简历原文\n2. optimized必须基于原文进行针对性优化，不能凭空编造新内容\n3. 每条changes必须具体说明改了什么、为什么改\n4. jdKeywordsAdded必须列出该模块补充的JD关键词\n\n请严格输出 JSON 数组格式（不要有 markdown 代码块）：\n[\n  {\n    "section": "<简历中真实存在的板块名称，如『工作经历-XX公司』>",\n    "original": "<该板块在简历中的原始文字，一字不改地引用>",\n    "optimized": "<针对JD和岗位类型优化后的版本，使用STAR法则和量化数据>",\n    "changes": ["<具体修改点1：如『将弱动词「参与」升级为「主导」』>", "<修改点2：如『补充了量化结果：用户增长从X到Y』>"],\n    "jdKeywordsAdded": ["<补充的JD关键词1>", "<关键词2>"]\n  }\n]`,
            },
          ],
          { temperature: 0.3, maxTokens: 3500 }
        ), "optimize"),

        // 请求3：基于真实简历生成匹配分析
        withProgress(clientChatJSON<{
          overallScore: number;
          dimensions: Array<{ name: string; score: number; details: string }>;
          strengths: string[];
          gaps: string[];
          recommendation: "strong_apply" | "cautious_apply" | "not_recommended";
          recommendationReason: string;
        }>(
          [
            {
              role: "system",
              content: `你是一位专业的求职顾问。

【强制要求】：
1. 先识别JD对应的岗位类型
2. 评分维度和评语必须与该岗位类型相关，不能跨岗评价
3. strengths必须引用简历中的具体经历作为证据
4. gaps必须指出简历中真实存在的、与JD要求差距的具体方面
5. 不得编造简历中不存在的"不足"
6. 不得用不相关的岗位标准来评价

【分析维度必须按岗位类型调整】：
- 技术岗：技术栈匹配度、项目复杂度、代码质量意识、系统设计能力、学习能力
- 产品岗：用户思维、数据分析、需求分析、项目推动、文档能力
- 运营岗：数据敏感度、活动策划、用户增长、内容运营、渠道拓展
- HR岗：招聘交付、人才盘点、组织发展、员工关系、HR系统
- 销售岗：客户开发、谈判能力、业绩达成、行业资源、抗压能力
- 财务岗：财务分析、报表编制、税务合规、审计经验、成本管控
- 设计岗：设计思维、工具熟练度、作品集质量、用户研究、品牌感知

只输出JSON对象，不要其他内容。`,
            },
            {
              role: "user",
              content: `【简历原文】\n${resumeText}\n\n【岗位描述JD】\n${jdText}\n\n请先识别岗位类型，然后基于该岗位类型的核心要求分析匹配度。\n\n要求：\n1. dimensions中的每个维度名称必须与该岗位类型相关\n2. 每个维度的details必须引用简历中的具体内容作为评分依据\n3. strengths必须列出3-4条，每条都要引用简历中的具体经历\n4. gaps必须列出2-3条，每条都要指出简历中真实存在的具体差距\n5. recommendationReason必须给出基于真实分析的投递建议\n\n请严格输出JSON格式（不要markdown代码块）：\n{\n  "overallScore": <0-100>,\n  "dimensions": [\n    {"name": "<与该岗位相关的维度1>", "score": <0-100>, "details": "<基于简历真实内容的详细分析，引用原文>"},\n    {"name": "<维度2>", "score": <0-100>, "details": "<详细分析>"},\n    {"name": "<维度3>", "score": <0-100>, "details": "<详细分析>"},\n    {"name": "<维度4>", "score": <0-100>, "details": "<详细分析>"},\n    {"name": "<维度5>", "score": <0-100>, "details": "<详细分析>"}\n  ],\n  "strengths": ["<优势1：引用简历中的具体经历作为证据>", "<优势2>", "<优势3>", "<优势4>"],\n  "gaps": ["<差距1：指出简历中真实存在的具体不足>", "<差距2>", "<差距3>"],\n  "recommendation": "<strong_apply|cautious_apply|not_recommended>",\n  "recommendationReason": "<基于真实匹配分析的投递建议>"\n}`,
            },
          ],
          { temperature: 0.3, maxTokens: 2500 }
        ), "match"),

        // 请求4：基于真实简历生成面试题
        withProgress(clientChatJSON<{
          successPrediction: number;
          strengths: string[];
          weaknesses: string[];
          questions: Array<{
            id: string;
            category: "technical" | "behavioral" | "situational";
            question: string;
            difficulty: "easy" | "medium" | "hard";
            hint: string;
            suggestedAnswer: string;
          }>;
          preparationTips: string[];
        }>(
          [
            {
              role: "system",
              content: `你是一位资深面试官。

【强制要求】：
1. 先识别JD对应的岗位类型
2. 面试题必须与该岗位类型相关，不能跨岗出题
3. 不得给HR岗出技术编程题/算法题
4. 不得给非技术岗出代码/算法题
5. 每道面试题必须基于简历中的真实经历，要引用简历中的具体项目/经历
6. strengths和weaknesses必须基于简历真实内容
7. 准备建议必须针对该岗位类型

【面试题设计原则】：
- 技术岗：围绕简历中的技术栈和项目难点出技术深挖题
- 产品岗：围绕简历中的产品设计决策、数据验证、用户调研出题
- 运营岗：围绕简历中的活动案例、数据结果、用户增长策略出题
- HR岗：围绕简历中的招聘案例、员工关系处理、组织发展项目出题
- 销售岗：围绕简历中的客户案例、谈判经历、业绩达成过程出题
- 设计岗：围绕简历中的设计项目、设计思路、用户反馈出题

只输出JSON对象，不要其他内容。`,
            },
            {
              role: "user",
              content: `【简历原文】\n${resumeText}\n\n【岗位描述JD】\n${jdText}\n\n请先识别岗位类型，然后生成针对该岗位类型的面试题。\n\n要求：\n1. 每道question必须引用简历中的具体经历或项目（如"你在简历中提到『XXX项目』..."）\n2. strengths必须列出2-3条，每条引用简历中的具体亮点\n3. weaknesses必须列出2-3条，每条指出简历中可能暴露的真实短板\n4. preparationTips必须针对该岗位类型给出具体准备建议\n\n请严格输出JSON格式（不要markdown代码块）：\n{\n  "successPrediction": <0-100>,\n  "strengths": ["<亮点1：引用简历中的具体经历>", "<亮点2>", "<亮点3>"],\n  "weaknesses": ["<不足1：指出简历中可能暴露的真实短板>", "<不足2>", "<不足3>"],\n  "questions": [\n    {\n      "id": "q-1",\n      "category": "<technical|behavioral|situational>",\n      "question": "<基于简历中『具体项目/经历』的面试问题，要引用原文>",\n      "difficulty": "<easy|medium|hard>",\n      "hint": "<回答思路提示>",\n      "suggestedAnswer": "<参考答案要点>"\n    }\n  ],\n  "preparationTips": ["<针对该岗位类型的具体准备建议1>", "<建议2>", "<建议3>", "<建议4>"]\n}`,
            },
          ],
          { temperature: 0.4, maxTokens: 3000 }
        ), "interview"),

        // 请求5：基于真实简历做智能真实性验证
        withProgress(clientChatJSON<{
          overallAccuracy: number;
          summary: string;
          claims: Array<{
            id: string;
            originalText: string;
            claimType: string;
            confidenceScore: number;
            riskLevel: string;
            verificationQuestions: string[];
            evidenceType: string[];
          }>;
        }>(
          [
            {
              role: "system",
              content: `你是一位专业的简历核实专家。你的任务是识别简历中"真正值得质疑的声明"。

【第一步：识别岗位类型】
先从JD中识别目标岗位类型（技术/产品/运营/HR/销售/财务/设计等）。

【第二步：按岗位类型判断合理性】
不同岗位的"正常成就"标准完全不同：
- HR岗：招聘10-20人是正常工作量，不应质疑；员工满意度提升是正常成果
- 技术岗：独立完成复杂模块开发值得确认；开源贡献可以确认
- 运营岗：DAU增长、转化率提升等数据需确认；活动策划数量无需质疑
- 销售岗：业绩数字需确认；客户数量增长需确认
- 产品岗：用户增长数据需确认；功能上线数量无需质疑
- 财务岗：报表准确率、成本节约金额需确认
- 设计岗：作品集可以确认；设计稿数量无需质疑

【绝对禁止质疑的内容】：
1. 教育背景、学校、专业、毕业时间、学历层次
2. 实习/工作公司名称和时间段
3. 个人基本信息（姓名、联系方式等）
4. 与该岗位类型相符的正常工作成果和职责描述
5. 不需要计算方法的简单计数（如"招聘了14人"、"组织了5场活动"）
6. 正常的岗位职责描述（如"负责招聘工作"、"协助产品开发"）

【只质疑的情况 - 必须同时满足以下至少一条】：
1. 极端夸张的数据（如"提升1000%转化率"、"单月业绩1亿"）
2. 与岗位类型明显不符的技能声明（如HR岗声称"精通Kubernetes"）
3. 明显脱离学生/实习生正常能力范围的成果（如"独立完成千万级系统架构"）
4. 数据矛盾（如两个地方提到的同一数字不一致）

【证据类型必须匹配岗位】：
- 技术岗：GitHub链接、代码片段、技术文档、系统设计图
- HR岗：录用通知截图、招聘系统截图、HR系统数据、培训材料
- 运营岗：后台数据截图、活动复盘文档、投放数据报表
- 销售岗：业绩证明、合同截图、CRM系统截图
- 产品岗：产品上线截图、数据报告、PRD文档、用户调研记录
- 财务岗：报表样本、审计报告、税务申报记录
- 设计岗：作品集链接、设计稿、用户测试记录
- 不要给HR岗要GitHub链接！不要给非技术岗要代码！

只输出JSON对象，不要其他内容。`,
            },
            {
              role: "user",
              content: `【简历原文】\n${resumeText}\n\n【岗位描述JD】\n${jdText}\n\n请按以下步骤执行：\n1. 识别JD对应的岗位类型\n2. 根据该岗位类型的正常标准，逐条审视简历中的声明\n3. 只标记真正值得质疑的声明（必须满足：极端夸张、明显不符、能力范围外、数据矛盾 中至少一条）\n4. 证据类型必须与岗位类型匹配\n5. 如果简历中没有值得质疑的声明，claims设为空数组\n\n请严格输出JSON格式（不要markdown代码块）：\n{\n  "overallAccuracy": <0-100，基于该岗位正常标准的整体可信度>,\n  "summary": "<1-2句话的验证总结，说明该岗位类型的正常标准下简历可信度如何>",\n  "claims": [\n    {\n      "id": "claim-1",\n      "originalText": "<简历中的原文，必须是真实存在的>",\n      "claimType": "<quantified_result|technology_stack|team_management|business_metric|process_improvement>",\n      "confidenceScore": <0-100>,\n      "riskLevel": "<low|medium|high>",\n      "verificationQuestions": ["<合适的追问问题1>", "<问题2>"],\n      "evidenceType": ["<与该岗位匹配的证据类型1>", "<证据类型2>"]\n    }\n  ]\n}\n\n重要提醒：claims可以为空数组。不要硬找问题。只有真正可疑的才列出来。`,
            },
          ],
          { temperature: 0.2, maxTokens: 2000 }
        ), "truth"),
      ]);

      // 用 AI 生成的内容替换本地分析结果
      if (aiOptimizedSections && aiOptimizedSections.length > 0) {
        analysisResult.optimizedResume = aiOptimizedSections;
      } else {
        analysisResult.optimizedResume = [];
      }
      if (aiMatchReport) {
        analysisResult.matchReport = aiMatchReport;
      }
      if (aiInterviewPrep) {
        analysisResult.interviewPrep = {
          ...aiInterviewPrep,
          questions: aiInterviewPrep.questions || [],
          preparationTips: aiInterviewPrep.preparationTips || [],
        };
      }
      if (aiTruthReport) {
        const riskCount = { low: 0, medium: 0, high: 0 };
        const claims = aiTruthReport.claims || [];
        claims.forEach((c) => {
          const level = c.riskLevel as "low" | "medium" | "high";
          if (level in riskCount) riskCount[level]++;
        });
        analysisResult.truthReport = {
          overallAccuracy: aiTruthReport.overallAccuracy ?? 85,
          claims: claims.map((c) => ({
            ...c,
            riskLevel: c.riskLevel as "low" | "medium" | "high",
            claimType: c.claimType as "quantified_result" | "team_management" | "business_metric" | "technology_stack" | "process_improvement" | "award_certification",
          })),
          summary: aiTruthReport.summary ?? "未发现明显可疑声明。",
          riskCount,
        };
      }
      setResult(analysisResult);

      // 设置可操作的优化建议（AI失败时不fallback到本地假数据）
      if (aiSuggestions && aiSuggestions.length > 0) {
        setSuggestions(
          aiSuggestions.map((s) => ({
            ...s,
            status: "pending" as const,
            collectedInfo: [],
            optimizedText: undefined,
            relatedClaimId: undefined,
          }))
        );
      } else {
        setSuggestions([]);
      }

      setAnalysisState("done");
    }, 800);
  }

  /* ===== 核心：确认修改 → 启动引导对话 ===== */
  function handleConfirmSuggestion(suggestionId: string) {
    setActiveSuggestionId(suggestionId);
    setMessages([]);

    // 更新建议状态为 chatting
    setSuggestions((prev) =>
      prev.map((s) =>
        s.id === suggestionId ? { ...s, status: "chatting" as const, collectedInfo: [] } : s
      )
    );

    const suggestion = suggestions.find((s) => s.id === suggestionId);
    if (!suggestion) return;

    // 重置问题索引
    guidedQuestionIndexRef.current = 0;

    // AI 发送第一条引导消息
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: "assistant",
        content: `好的，我来帮你处理「${suggestion.description}」这条建议。\n\n${suggestion.aiQuestions[0]}`,
        timestamp: Date.now(),
      };
      setMessages([aiMsg]);
    }, 500);
  }

  /* ===== 核心：引导对话中的消息处理 ===== */
  const handleGuidedSend = useCallback(
    (content: string) => {
      const suggestion = suggestions.find((s) => s.id === activeSuggestionId);
      if (!suggestion) return;

      // 添加用户消息
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}-user`,
        role: "user",
        content,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // 记录收集到的信息
      const updatedCollectedInfo = [
        ...(suggestion.collectedInfo || []),
        content,
      ];
      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === activeSuggestionId
            ? { ...s, collectedInfo: updatedCollectedInfo }
            : s
        )
      );

      // 判断是否所有问题都已回答
      const nextQuestionIndex = guidedQuestionIndexRef.current + 1;

      if (nextQuestionIndex >= suggestion.aiQuestions.length) {
        // 所有问题已回答完毕，生成优化内容
        guidedQuestionIndexRef.current = nextQuestionIndex;

        setTimeout(async () => {
          const confirmMsg: ChatMessage = {
            id: `msg-${Date.now()}-ai`,
            role: "assistant",
            content: "很好，我已经收集到了足够的信息。让我根据你提供的真实经历生成优化后的描述...",
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, confirmMsg]);

          // 客户端直连 AI 生成优化文本
          let optimizedText = "";
          const aiText = await clientChatJSON<{ optimizedText: string }>(
            [
              {
                role: "system",
                content: `你是一位资深简历优化专家。根据用户提供的真实经历，生成一段专业、量化、结果导向的简历描述。

【绝对禁止规则（违反直接失败）】：
- 禁止使用"我"、"我主导"、"我负责"、"我设计"等第一人称。简历中的动词直接用第三人称结构：「主导X」「统筹X」「设计X」
- 禁止凭空捏造任何未经用户确认的数据、项目名、规模、结果
- 禁止使用"出色""卓越""高效"等主观形容词

【量化数据保留规则（重要）】：
- 原文中已经有的真实量化数字（如"200人""6版""18%"），必须保留，不得删除，不得替换为占位符
- 用户通过对话额外提供的新数字，优先使用（比如用户说实际是"800人"而不是原文的"200人"）
- 只有在原文和用户对话中都没有提供某个数字时，才用"[待补充：具体数字]"占位
- 例：原文写"调整6版材料" → 保留"6版"；原文写"200人"但用户对话说"实际800人" → 用"800人"

【优化标准 - 8项核心规则】：
1. 关键词匹配：自然融入JD相关关键词
2. STAR法则：情境→任务→行动→结果
3. 量化数据：保留原文真实数字 + 采纳对话中用户补充的新数字
4. 动词升级：主导、统筹、设计、推动、攻克、搭建（不得加"我"前缀）
5. 胜任力呈现：体现JD要求的某项核心能力
6. 结构逻辑：信息按重要性排序
7. ATS友好：纯文本可读，避免复杂格式
8. 表述合规：第三人称，客观描述，无主观评价

只输出 JSON 对象，不要任何解释文字。`,
              },
              {
                role: "user",
                content: `请根据以下信息生成优化后的简历描述：\n\n【优化建议】${suggestion.description}\n【所属板块】${suggestion.section}\n【简历原文（保留其中的真实量化数字，如人数、百分比、版本数等）】\n${suggestion.originalText || "(未提供原文)"}\n【用户在对话中额外提供的补充信息（优先采纳）】\n${updatedCollectedInfo.join("\n")}\n\n生成要求：\n1. 严格用第三人称动词开头（如"主导""统筹""设计"，绝对不能写"我主导""我设计"）\n2. 量化数据规则：原文已有的真实数字必须保留；对话中用户提供了新数字则优先采纳；两者都没有的才用[待补充：具体数字]占位\n3. 使用STAR结构\n4. 控制在50-100字\n5. 语言简洁专业\n\n请严格输出 JSON 格式：\n{\n  "optimizedText": "<优化后的描述>"\n}`,
              },
            ],
            { temperature: 0.5, maxTokens: 1000 }
          );
          optimizedText = aiText?.optimizedText || generateOptimizedTextFromChat(suggestion, updatedCollectedInfo);

          // 更新建议状态为 done
          setSuggestions((prev) =>
            prev.map((s) =>
              s.id === activeSuggestionId
                ? { ...s, status: "done" as const, optimizedText }
                : s
            )
          );

          // AI 发送生成完成消息
          const doneMsg: ChatMessage = {
            id: `msg-${Date.now()}-ai`,
            role: "assistant",
            content: `优化内容已生成！基于你提供的信息，我为你重写了「${suggestion.section}」部分。请查看下方预览，确认无误后可继续处理下一条建议。`,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, doneMsg]);
        }, 600);
      } else {
        // 还有下一个问题
        guidedQuestionIndexRef.current = nextQuestionIndex;

        setTimeout(() => {
          const aiMsg: ChatMessage = {
            id: `msg-${Date.now()}-ai`,
            role: "assistant",
            content: `收到。${suggestion.aiQuestions[nextQuestionIndex]}`,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, aiMsg]);
        }, 800);
      }
    },
    [suggestions, activeSuggestionId]
  );

  /* ===== 通用聊天发送（非引导模式） ===== */
  const handleGeneralChatSend = useCallback((content: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);

    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: "assistant",
        content: `好的，我来帮你${content}。建议先在「ATS 优化」面板中逐条确认修改建议，这样AI可以引导你补充真实数据，确保优化内容基于真实经历。`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 800);
  }, []);

  /* ===== 统一的聊天发送入口 ===== */
  const handleChatSend = useCallback(
    (content: string) => {
      if (activeSuggestionId && activeSuggestion?.status === "chatting") {
        handleGuidedSend(content);
      } else {
        handleGeneralChatSend(content);
      }
    },
    [activeSuggestionId, activeSuggestion, handleGuidedSend, handleGeneralChatSend]
  );

  /* ===== 结束当前对话，准备下一条 ===== */
  function handleEndChat() {
    setActiveSuggestionId(null);
    setMessages([]);

    // 切换到 ATS 面板继续处理
    setActiveTab("ats");
  }

  // 统计进度
  const allDone = suggestions.length > 0 && suggestions.every((s) => s.status === "done");
  const doneCount = suggestions.filter((s) => s.status === "done").length;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-5 py-5">
        {/* Header */}
        <header className="mb-5 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div>
            <p className="text-sm font-medium text-cyan-600">Offer捕手</p>
            <h1 className="mt-1 text-2xl font-semibold">简历优化官</h1>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <span className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500">
              ATS优化 · 真实性验证 · 面试准备
            </span>
            {analysisState === "done" && result && (
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {allDone ? "全部优化完成" : `分析完成 · ${doneCount}/${suggestions.length} 已优化`}
              </span>
            )}
          </div>
        </header>

        <div className="grid flex-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          {/* ===== 左侧栏 ===== */}
          <aside className="space-y-5">
            {/* 简历上传 */}
            <section className="border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold">上传简历</h2>
                <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">
                  PDF / Word / TXT
                </span>
              </div>

              <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center border border-dashed border-slate-300 bg-slate-50 px-4 text-center transition hover:border-cyan-400 hover:bg-cyan-50">
                <input type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={handleFileChange} />
                <p className="text-sm font-medium text-slate-800">
                  {resumeName ? "已选择简历" : "拖拽或点击上传"}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">支持 PDF、Word、TXT</p>
                <span className="mt-3 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white">
                  选择简历
                </span>
              </label>

              {resumeName && (
                <div className="mt-3 border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  当前文件：{resumeName}
                </div>
              )}
            </section>

            {/* JD输入 */}
            <section className="border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold">上传JD</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                  多行文本
                </span>
              </div>

              <textarea
                value={jdText}
                onChange={(e) => { setJdText(e.target.value); setAnalysisState("idle"); }}
                placeholder="请粘贴目标岗位JD，例如岗位职责、任职要求、技能要求等。"
                className="h-48 w-full resize-none border border-slate-200 bg-slate-50 p-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white"
              />

              <button
                onClick={handleAnalyze}
                disabled={!canAnalyze || analysisState === "analyzing"}
                className="mt-3 w-full rounded-full bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {analysisState === "analyzing" ? "分析中..." : "开始AI智能分析"}
              </button>

              {!canAnalyze && (
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  上传简历并输入JD后，系统将执行ATS分析、真实性验证和面试准备。
                </p>
              )}
            </section>

            {/* 分析完成后的快速导航 */}
            {analysisState === "done" && result && (
              <section className="border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold">快速总览</h2>
                <div className="space-y-2.5">
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="text-xs text-slate-500">ATS 总评分</p>
                    <p className="text-xl font-bold text-cyan-600">{result.atsReport.score.overall}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="text-xs text-slate-500">真实性准确度</p>
                    <p className="text-xl font-bold text-emerald-600">{result.truthReport.overallAccuracy}%</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="text-xs text-slate-500">岗位匹配度</p>
                    <p className="text-xl font-bold text-indigo-600">{result.matchReport.overallScore}%</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="text-xs text-slate-500">面试成功率预测</p>
                    <p className="text-xl font-bold text-amber-600">{result.interviewPrep.successPrediction}%</p>
                  </div>
                  {/* 优化进度 */}
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="text-xs text-slate-500">对话优化进度</p>
                    <p className="text-xl font-bold text-cyan-600">
                      {doneCount}<span className="text-sm font-normal text-slate-400">/{suggestions.length}</span>
                    </p>
                  </div>
                </div>
              </section>
            )}
          </aside>

          {/* ===== 主区域 ===== */}
          <section className="space-y-5">
            {/* 等待状态 */}
            {analysisState === "idle" && (
              <div className="flex min-h-[560px] items-center justify-center border border-slate-200 bg-white p-8 text-center shadow-sm">
                <div className="max-w-lg">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50">
                    <span className="text-3xl">🚀</span>
                  </div>
                  <p className="text-sm font-medium text-cyan-600">AI 智能简历分析</p>
                  <h2 className="mt-2 text-2xl font-semibold">上传简历，粘贴JD，一键启动全面分析</h2>
                  <p className="mt-4 text-sm leading-6 text-slate-500">
                    系统将依次执行五项分析：ATS格式评分、关键词匹配、
                    <span className="font-medium text-slate-700">简历真实性验证</span>、
                    岗位匹配度分析和面试准备生成。
                  </p>
                  <div className="mt-6 grid grid-cols-3 gap-3 text-left">
                    {[
                      { label: "Layer 1", desc: "ATS优化 + 对话修改", color: "border-cyan-200 bg-cyan-50" },
                      { label: "Layer 2", desc: "真实性验证", color: "border-emerald-200 bg-emerald-50" },
                      { label: "Layer 3", desc: "面试准备", color: "border-violet-200 bg-violet-50" },
                    ].map((l) => (
                      <div key={l.label} className={`rounded-xl border ${l.color} p-3`}>
                        <p className="text-xs font-semibold text-slate-500">{l.label}</p>
                        <p className="mt-0.5 text-sm font-medium text-slate-900">{l.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 加载状态 */}
            {analysisState === "analyzing" && (
              <div className="flex min-h-[560px] items-center justify-center border border-slate-200 bg-white p-8 text-center shadow-sm">
                <div className="w-full max-w-md">
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-cyan-600" />
                  <h2 className="mt-5 text-xl font-semibold">正在执行AI智能分析</h2>
                  <p className="mt-1 text-sm text-slate-500">5个分析模块并行运行，请耐心等待（约30-60秒）</p>
                  <div className="mt-6 space-y-3 text-left">
                    {analysisSteps.map((step) => (
                      <div key={step.id} className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                          {step.status === "done" && (
                            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {step.status === "failed" && (
                            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 4a8 8 0 100 16 8 8 0 000-16z" />
                            </svg>
                          )}
                          {step.status === "running" && (
                            <div className="h-4 w-4 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                          )}
                          {step.status === "pending" && (
                            <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
                          )}
                        </div>
                        <p className={`text-sm ${
                          step.status === "done" ? "text-emerald-700 font-medium" :
                          step.status === "running" ? "text-cyan-700 font-medium" :
                          step.status === "failed" ? "text-amber-600" :
                          "text-slate-400"
                        }`}>
                          {step.label}
                          {step.status === "failed" && " (将使用本地计算兜底)"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 分析完成 */}
            {analysisState === "done" && result && (
              <>
                {/* Tab 导航 */}
                <Tabs
                  items={tabItems}
                  activeId={activeTab}
                  onChange={setActiveTab}
                />

                {/* Tab 内容 */}
                {activeTab === "ats" && (
                  <ATSScoreCard
                    report={result.atsReport}
                    suggestions={suggestions}
                    onConfirmSuggestion={handleConfirmSuggestion}
                  />
                )}
                {activeTab === "truth" && <TruthReportPanel report={result.truthReport} />}
                {activeTab === "match" && <MatchAnalysisCard report={result.matchReport} />}
                {activeTab === "interview" && <InterviewPrepPanel prep={result.interviewPrep} />}
                {activeTab === "optimize" && (
                  <OptimizationCompare
                    sections={result.optimizedResume}
                    dynamicOptimizations={suggestions}
                  />
                )}

                {/* 导出区域 */}
                {showExport ? (
                  <footer className="border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                      <div>
                        <p className="text-lg font-semibold">保存分析报告</p>
                        <p className="mt-1 text-sm text-slate-500">
                          刷新页面后数据会丢失，建议立即保存报告。
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={handleCopyReport}
                          className="flex items-center gap-1.5 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium transition hover:border-cyan-400 hover:text-cyan-700"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          复制报告
                        </button>
                        <button
                          onClick={handleDownloadReport}
                          className="flex items-center gap-1.5 rounded-full bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          下载 TXT 报告
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
                      <p className="text-xs text-slate-500">
                        优化完成后，可以返回岗位匹配官重新匹配其他岗位。
                      </p>
                      <div className="flex gap-2">
                        <a
                          href="/job-matcher/"
                          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium transition hover:border-cyan-300"
                        >
                          返回岗位匹配官
                        </a>
                        <a
                          href="/"
                          className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-cyan-600"
                        >
                          回到首页
                        </a>
                      </div>
                    </div>
                  </footer>
                ) : (
                  <button
                    onClick={() => setShowExport(true)}
                    className="w-full rounded-full bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-600"
                  >
                    {allDone ? "确认优化，导出简历" : `确认优化并导出（${doneCount}/${suggestions.length} 已完成对话优化）`}
                  </button>
                )}
              </>
            )}
          </section>
        </div>

        {/* AI 对话面板（浮动） */}
        {analysisState === "done" && (
          <div className="mt-5">
            <AIChatPanel
              messages={messages}
              onSend={handleChatSend}
              activeSuggestion={activeSuggestion}
              onEndChat={activeSuggestion?.status === "done" ? handleEndChat : undefined}
            />
          </div>
        )}
      </section>
    </main>
  );
}
