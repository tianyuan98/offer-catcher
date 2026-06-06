/**
 * ⚠️ 注意：此文件在静态导出（output: "export"）模式下【不可用】
 * 项目使用 next.config.ts 中的 output: "export"，部署为纯静态文件，
 * 服务端 API Routes 不会被执行，此文件仅保留供参考和未来迁移至服务端时使用。
 * 实际 AI 调用见 lib/client-ai.ts（客户端直连硅基流动 API）。
 *
 * app/api/resume/route.ts
 * 简历优化 AI 对话接口
 * - POST /api/resume/analyze：AI 分析简历，生成结构化优化建议
 * - POST /api/resume/chat：引导对话，收集信息后生成优化文本
 */

import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/ai";

// ========== 简历分析 + 生成优化建议 ==========

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, resumeText, jdText, suggestionId, suggestionDescription, collectedAnswers, section } =
      body as {
        action: "analyze" | "generate";
        resumeText?: string;
        jdText?: string;
        suggestionId?: string;
        suggestionDescription?: string;
        collectedAnswers?: string[];
        section?: string;
      };

    if (action === "analyze") {
      return handleAnalyze(resumeText || "", jdText || "");
    } else if (action === "generate") {
      return handleGenerate(
        suggestionId || "",
        suggestionDescription || "",
        collectedAnswers || [],
        section || ""
      );
    }

    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "请求处理失败" }, { status: 500 });
  }
}

// ---------- 分析简历，生成可操作优化建议 ----------

async function handleAnalyze(resumeText: string, jdText: string) {
  if (!resumeText.trim()) {
    return NextResponse.json({ error: "简历内容不能为空" }, { status: 400 });
  }

  const systemPrompt = `你是专业简历优化顾问，帮助大学生优化简历。请分析简历中的不足，给出具体可操作的优化建议。`;

  const userPrompt = `请分析以下简历，结合岗位JD，找出最需要优化的5个具体问题，每个问题需要通过对话收集信息才能优化。

【简历内容】
${resumeText}

【目标岗位 JD（可选）】
${jdText || "未提供，请基于简历通用质量给出建议"}

请严格输出 JSON 格式（不要有任何前缀或代码块）：
{
  "suggestions": [
    {
      "id": "s1",
      "section": "<简历模块名，如：项目经历/技能/工作经历/教育背景/自我介绍>",
      "description": "<一句话描述问题，如：项目经历缺少数据量化指标>",
      "reason": "<为什么这是问题，20字>",
      "aiQuestions": [
        "<第1个引导问题，用于收集补充信息>",
        "<第2个引导问题>",
        "<第3个引导问题（可选）>"
      ]
    }
  ]
}`;

  try {
    const content = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.5, maxTokens: 1500 }
    );

    const cleaned = content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as {
      suggestions: Array<{
        id: string;
        section: string;
        description: string;
        reason: string;
        aiQuestions: string[];
      }>;
    };

    return NextResponse.json({ suggestions: parsed.suggestions });
  } catch {
    // Fallback：返回通用建议
    return NextResponse.json({
      suggestions: [
        {
          id: "s1",
          section: "项目经历",
          description: "项目经历缺少量化数据",
          reason: "没有数字支撑，说服力不足",
          aiQuestions: [
            "你在这个项目中具体负责了哪些工作？结果如何？",
            "有没有可以量化的数据，比如用户数、提升比例、完成时间？",
            "项目中有什么你认为最值得展示的成果？",
          ],
        },
        {
          id: "s2",
          section: "技能描述",
          description: "技能只列工具名，缺少应用场景",
          reason: "缺少使用场景，无法体现实际能力",
          aiQuestions: [
            "你在哪个具体项目中用到了这些技能？",
            "用这个技能解决了什么业务问题？",
          ],
        },
        {
          id: "s3",
          section: "自我介绍",
          description: "自我介绍过于泛化，没有针对岗位定制",
          reason: "缺少与目标岗位的关联性",
          aiQuestions: [
            "你投递这个岗位最大的动机是什么？",
            "你认为自己最契合这个岗位的核心能力是什么？",
          ],
        },
      ],
    });
  }
}

// ---------- 根据对话收集的信息生成优化文本 ----------

async function handleGenerate(
  suggestionId: string,
  suggestionDescription: string,
  collectedAnswers: string[],
  section: string
) {
  const systemPrompt = `你是专业简历优化顾问。根据用户提供的真实经历信息，帮助改写简历描述，确保信息真实准确，表达专业有力。`;

  const userPrompt = `请根据以下信息，为简历的「${section}」部分生成优化后的描述文本。

【优化目标】
${suggestionDescription}

【用户提供的真实信息】
${collectedAnswers.map((a, i) => `回答${i + 1}：${a}`).join("\n")}

要求：
1. 严格基于用户提供的真实信息，不要编造数据
2. 使用「行动动词 + 具体方法 + 量化结果」结构
3. 语言简洁专业，适合简历风格
4. 输出 2-3 句话的优化描述

请直接输出优化后的简历描述文本，不要有任何前缀或解释：`;

  try {
    const optimizedText = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.6, maxTokens: 400 }
    );

    return NextResponse.json({
      suggestionId,
      optimizedText: optimizedText.trim(),
    });
  } catch {
    return NextResponse.json({
      suggestionId,
      optimizedText: `基于你提供的信息：${collectedAnswers.join("；")}，建议将相关经历重新描述为：明确说明行动目标、采用的方法，以及取得的具体成果（尽量附上数字）。`,
    });
  }
}
