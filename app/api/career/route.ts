/**
 * ⚠️ 注意：此文件在静态导出（output: "export"）模式下【不可用】
 * 项目使用 next.config.ts 中的 output: "export"，部署为纯静态文件，
 * 服务端 API Routes 不会被执行，此文件仅保留供参考和未来迁移至服务端时使用。
 * 实际 AI 调用见 lib/client-ai.ts（客户端直连硅基流动 API）。
 *
 * app/api/career/route.ts
 * 职业探索 AI 分析接口
 * POST /api/career：根据用户信息和测评结果，生成 AI 职业方向报告
 */

import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/ai";

interface CareerAnalysisInput {
  major: string;
  degree: string;
  selectedSkills: string[];
  selectedInterests: string[];
  answers: Record<number, string>;
}

interface CareerRole {
  name: string;
  matchScore: number;
  reason: string;
  detail: string;
  requiredSkills: string[];
  growthPath: string;
}

interface CareerReport {
  summary: string;
  topRoles: CareerRole[];
  coreStrengths: string[];
  developmentAdvice: string[];
  careerLabels: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CareerAnalysisInput;
    const { major, degree, selectedSkills, selectedInterests, answers } = body;

    if (!major || !degree || selectedSkills.length === 0) {
      return NextResponse.json({ error: "请先完善基础信息" }, { status: 400 });
    }

    const answerLabels: Record<string, string> = {
      product: "产品思维",
      data: "数据分析",
      tech: "技术开发",
      creative: "创意表达",
      ops: "运营推进",
      research: "研究分析",
      marketing: "市场营销",
    };

    const answerDescriptions = Object.values(answers)
      .map((v) => answerLabels[v] || v)
      .join("、");

    const systemPrompt = `你是一位专业的大学生职业规划顾问，根据学生的专业背景、技能和兴趣，为其提供精准的职业方向建议。请基于真实的职场情况给出实用建议。`;

    const userPrompt = `请为以下大学生生成职业方向分析报告：

【个人信息】
- 专业：${major}
- 学历：${degree}
- 技能标签：${selectedSkills.join("、")}
- 兴趣方向：${selectedInterests.join("、")}
- 测评偏好：${answerDescriptions}

请严格输出以下 JSON 格式（不要有任何前缀或代码块）：
{
  "summary": "<3-4句话的职业画像总结，具体描述这个学生的特点和适合方向>",
  "careerLabels": ["<标签1，如：数据导向>", "<标签2>", "<标签3>"],
  "coreStrengths": ["<核心优势1，结合其专业和技能>", "<优势2>", "<优势3>"],
  "topRoles": [
    {
      "name": "<岗位名称>",
      "matchScore": <75-95之间的匹配分>,
      "reason": "<一句话推荐理由，结合其具体技能>",
      "detail": "<2-3句话详细说明为什么适合，包括哪些能力可以迁移>",
      "requiredSkills": ["<该岗位需要的关键技能1>", "<技能2>", "<技能3>"],
      "growthPath": "<入门→成长→进阶的职业成长路径，一句话>"
    }
  ],
  "developmentAdvice": [
    "<具体可操作的建议1，如：建议在XX时间内掌握XX>",
    "<建议2>",
    "<建议3>"
  ]
}

注意：topRoles 包含 3 个岗位，按匹配度从高到低排列，基于学生的真实背景给出差异化分析，不要给出雷同的推荐理由。`;

    try {
      const content = await chatCompletion(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        { temperature: 0.6, maxTokens: 2000 }
      );

      const cleaned = content
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      const report = JSON.parse(cleaned) as CareerReport;
      return NextResponse.json({ report });
    } catch {
      // AI 失败时 fallback
      return NextResponse.json({ report: buildFallbackReport(major, selectedSkills, selectedInterests) });
    }
  } catch {
    return NextResponse.json({ error: "分析失败，请稍后重试" }, { status: 500 });
  }
}

function buildFallbackReport(major: string, skills: string[], interests: string[]): CareerReport {
  const hasData = skills.some((s) => ["数据分析", "AI工具", "编程开发"].includes(s));
  const hasProduct = skills.some((s) => ["产品思维", "用户研究", "项目管理"].includes(s));
  const hasCreative = skills.some((s) => ["文案写作", "视觉设计", "创意表达"].includes(s));

  const roles: CareerRole[] = [];

  if (hasProduct || interests.includes("产品设计")) {
    roles.push({
      name: "产品经理",
      matchScore: 82,
      reason: "具备用户思维和跨团队协作能力，适合产品规划岗位",
      detail: "你的专业背景和技能组合适合产品经理方向，能够把握用户需求并推动产品落地。",
      requiredSkills: ["需求分析", "用户研究", "项目管理", "数据分析"],
      growthPath: "产品实习生 → 初级产品经理 → 产品经理 → 高级产品经理",
    });
  }

  if (hasData || interests.includes("数据分析")) {
    roles.push({
      name: "数据分析师",
      matchScore: 79,
      reason: "数据敏感度高，适合用分析驱动业务决策",
      detail: "你对数据分析的兴趣与技能匹配良好，数据分析师岗位需求大、成长路径清晰。",
      requiredSkills: ["SQL", "Excel", "Python", "数据可视化"],
      growthPath: "数据分析实习 → 初级分析师 → 数据分析师 → 高级分析师/数据科学家",
    });
  }

  if (hasCreative || interests.includes("内容创作")) {
    roles.push({
      name: "内容运营",
      matchScore: 75,
      reason: "具备创意表达能力，适合内容策划和运营方向",
      detail: "你的创意和表达能力在内容运营岗位有很大发挥空间，尤其适合新媒体和品牌内容。",
      requiredSkills: ["文案策划", "数据分析", "用户运营", "SEO/内容分发"],
      growthPath: "内容运营实习 → 内容专员 → 内容运营经理 → 内容总监",
    });
  }

  while (roles.length < 3) {
    roles.push({
      name: "运营专员",
      matchScore: 72,
      reason: "综合素质扎实，适合入门级运营岗位",
      detail: "运营岗位入门门槛相对较低，适合积累第一份工作经验，快速了解互联网业务。",
      requiredSkills: ["数据分析", "沟通协作", "项目管理", "用户研究"],
      growthPath: "运营实习 → 运营专员 → 运营经理 → 业务负责人",
    });
  }

  return {
    summary: `你是${major}专业的${skills.length > 0 ? `具备${skills.slice(0, 2).join("、")}技能的` : ""}同学，兴趣偏向${interests.slice(0, 2).join("和")}领域，综合能力适合互联网行业多个方向发展。`,
    careerLabels: ["综合导向", "协作推进", "持续成长"].slice(0, 3),
    coreStrengths: [
      `${major}专业背景为你提供了扎实的学科基础`,
      skills.length > 0 ? `掌握${skills.slice(0, 2).join("、")}等技能，具备基础岗位能力` : "具备快速学习新技能的潜力",
      "大学阶段积累的项目经历是重要的差异化优势",
    ],
    topRoles: roles.slice(0, 3),
    developmentAdvice: [
      "在目标岗位找一份实习，快速积累实战经验",
      `补强${skills.length > 0 ? "量化表达能力和数据意识" : "一项核心技能，如数据分析或产品思维"}`,
      "准备一份有数据支撑的简历，突出可迁移的项目经历",
    ],
  };
}
