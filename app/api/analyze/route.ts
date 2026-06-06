import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/ai";

// ========== 类型定义 ==========

type MatchDimension = {
  score: number;
  reason: string;
  evidenceFromResume: string[];
  evidenceFromJD: string[];
};

type JobMatchReport = {
  overallScore: number;
  verdict: "推荐投递" | "谨慎投递" | "建议优化后投递" | "信息不足";
  dimensions: {
    skill: MatchDimension;
    experience: MatchDimension;
    keyword: MatchDimension;
    industry: MatchDimension;
    education: MatchDimension;
  };
  matchedKeywords: string[];
  missingKeywords: string[];
  strengths: string[];
  gaps: string[];
  suggestions: string[];
  resumeRewriteHints: string[];
};

// ========== AI 分析函数 ==========

async function analyzeWithAI(resumeText: string, jdText: string): Promise<JobMatchReport> {
  const systemPrompt = `你是一位专业的求职简历分析师，专注于帮助大学生优化简历和匹配岗位。
请严格按照 JSON 格式输出分析结果，不要输出任何其他内容。`;

  const userPrompt = `请分析以下简历与岗位描述(JD)的匹配程度，输出详细的匹配报告。

【简历内容】
${resumeText}

【岗位描述(JD)】
${jdText}

请严格输出以下 JSON 格式（不要有任何前缀文字或 markdown 代码块）：
{
  "overallScore": <0-100的综合匹配分>,
  "verdict": "<推荐投递|建议优化后投递|谨慎投递|信息不足>",
  "dimensions": {
    "skill": {
      "score": <0-100>,
      "reason": "<技能匹配分析，30字以内>",
      "evidenceFromResume": ["<简历中的技能证据1>", "<证据2>"],
      "evidenceFromJD": ["<JD要求的技能1>", "<技能2>"]
    },
    "experience": {
      "score": <0-100>,
      "reason": "<经历匹配分析，30字以内>",
      "evidenceFromResume": ["<简历中的经历片段1>"],
      "evidenceFromJD": ["<JD要求的经历1>"]
    },
    "keyword": {
      "score": <0-100>,
      "reason": "<关键词覆盖分析，30字以内>",
      "evidenceFromResume": ["<简历中的关键词1>", "<关键词2>"],
      "evidenceFromJD": ["<JD中的关键词1>", "<关键词2>"]
    },
    "industry": {
      "score": <0-100>,
      "reason": "<行业理解分析，30字以内>",
      "evidenceFromResume": ["<简历中的行业词1>"],
      "evidenceFromJD": ["<JD中的行业词1>"]
    },
    "education": {
      "score": <0-100>,
      "reason": "<教育背景分析，30字以内>",
      "evidenceFromResume": ["<学历信息>"],
      "evidenceFromJD": []
    }
  },
  "matchedKeywords": ["<匹配的技能/关键词1>", "<关键词2>"],
  "missingKeywords": ["<简历缺少但JD要求的关键词1>", "<关键词2>"],
  "strengths": ["<简历优势1，引用具体内容>", "<优势2>", "<优势3>"],
  "gaps": ["<不足点1，引用JD具体要求>", "<不足点2>"],
  "suggestions": ["<可操作的投递建议1>", "<建议2>", "<建议3>"],
  "resumeRewriteHints": ["<简历改写提示1>", "<提示2>"]
}`;

  const content = await chatCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.3, maxTokens: 2000 }
  );

  // 清理可能的 markdown 代码块包裹
  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned) as JobMatchReport;
  return parsed;
}

// ========== 本地 fallback 分析（无 API Key 时使用） ==========

function analyzeLocally(resumeText: string, jdText: string): JobMatchReport {
  const lower = resumeText.toLowerCase();
  const jdLower = jdText.toLowerCase();

  const skillBank = ["sql", "python", "excel", "数据分析", "tableau", "figma", "axure", "项目管理", "用户研究"];
  const matchedSkills = skillBank.filter((s) => lower.includes(s) && jdLower.includes(s));
  const missingSkills = skillBank.filter((s) => !lower.includes(s) && jdLower.includes(s));

  const hasProjects = lower.includes("实习") || lower.includes("项目");
  const expScore = hasProjects ? 70 : 40;
  const skillScore = matchedSkills.length > 0 ? Math.min(90, matchedSkills.length * 20 + 30) : 30;
  const overallScore = Math.round(skillScore * 0.3 + expScore * 0.3 + 50 * 0.4);

  let verdict: JobMatchReport["verdict"] = "建议优化后投递";
  if (overallScore >= 75) verdict = "推荐投递";
  else if (overallScore < 50) verdict = "谨慎投递";

  return {
    overallScore,
    verdict,
    dimensions: {
      skill: { score: skillScore, reason: `匹配技能 ${matchedSkills.length} 项`, evidenceFromResume: matchedSkills, evidenceFromJD: matchedSkills },
      experience: { score: expScore, reason: hasProjects ? "有项目/实习经历" : "经历不明确", evidenceFromResume: [], evidenceFromJD: [] },
      keyword: { score: 50, reason: "基础关键词匹配", evidenceFromResume: [], evidenceFromJD: [] },
      industry: { score: 50, reason: "行业匹配一般", evidenceFromResume: [], evidenceFromJD: [] },
      education: { score: 60, reason: "教育背景基本符合", evidenceFromResume: [], evidenceFromJD: [] },
    },
    matchedKeywords: matchedSkills,
    missingKeywords: missingSkills,
    strengths: ["简历基本结构完整", "有相关技能描述"],
    gaps: missingSkills.length > 0 ? [`缺少 JD 要求的技能：${missingSkills.join("、")}`] : ["建议补充量化成果"],
    suggestions: ["补充项目成果的数据指标", "在技能栏突出 JD 要求的核心技能"],
    resumeRewriteHints: ["采用「行动 + 方法 + 量化结果」三段式改写每条经历"],
  };
}

// ========== API 路由 ==========

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resumeText, jdText } = body as { resumeText?: string; jdText?: string };

    if (!resumeText || !resumeText.trim()) {
      return NextResponse.json({ error: "简历内容不能为空" }, { status: 400 });
    }
    if (!jdText || !jdText.trim()) {
      return NextResponse.json({ error: "JD 内容不能为空" }, { status: 400 });
    }

    let report: JobMatchReport;

    try {
      // 优先用 AI 分析
      report = await analyzeWithAI(resumeText, jdText);
    } catch (aiError) {
      // AI 调用失败（无 Key 或网络问题）时 fallback 到本地规则引擎
      console.warn("AI 分析失败，使用本地引擎 fallback:", aiError);
      report = analyzeLocally(resumeText, jdText);
    }

    return NextResponse.json({ report });
  } catch {
    return NextResponse.json({ error: "分析失败，请稍后重试" }, { status: 500 });
  }
}
