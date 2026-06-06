"use client";

import { useMemo, useState } from "react";
import { clientChatJSON } from "@/lib/client-ai";
import { extractTextFromFile } from "@/lib/pdf-extract";

// ---------- 类型定义（与 API 返回结构一致） ----------
type AnalysisState = "idle" | "analyzing" | "done";

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

// ---------- 组件 ----------
export default function JobMatchPage() {
  const [resumeName, setResumeName] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [report, setReport] = useState<JobMatchReport | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showAdvice, setShowAdvice] = useState(false);

  const canAnalyze = resumeText.trim().length > 0 && jdText.trim().length > 10;

  const circleStyle = useMemo(() => {
    const score = report?.overallScore ?? 0;
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    return { circumference, offset };
  }, [report?.overallScore]);

  async function handleAnalyze() {
    if (!canAnalyze) return;

    setAnalysisState("analyzing");
    setShowDetail(false);
    setShowAdvice(false);
    setReport(null);

    // 客户端直连 AI 分析
    const aiReport = await clientChatJSON<JobMatchReport>(
      [
        {
          role: "system",
          content: "你是一位专业的求职简历分析师，专注于帮助大学生优化简历和匹配岗位。请严格按照 JSON 格式输出分析结果，不要输出任何其他内容。",
        },
        {
          role: "user",
          content: `请分析以下简历与岗位描述(JD)的匹配程度，输出详细的匹配报告。

【简历内容】
${resumeText}

【岗位描述(JD)】
${jdText}

请严格输出以下 JSON 格式（不要有任何前缀文字或 markdown 代码块）：
{
  "overallScore": <0-100的综合匹配分>,
  "verdict": "<推荐投递|建议优化后投递|谨慎投递|信息不足>",
  "dimensions": {
    "skill": { "score": <0-100>, "reason": "<技能匹配分析，30字以内>", "evidenceFromResume": ["<证据>"], "evidenceFromJD": ["<证据>"] },
    "experience": { "score": <0-100>, "reason": "<经历匹配分析，30字以内>", "evidenceFromResume": ["<证据>"], "evidenceFromJD": ["<证据>"] },
    "keyword": { "score": <0-100>, "reason": "<关键词覆盖分析，30字以内>", "evidenceFromResume": ["<证据>"], "evidenceFromJD": ["<证据>"] },
    "industry": { "score": <0-100>, "reason": "<行业理解分析，30字以内>", "evidenceFromResume": ["<证据>"], "evidenceFromJD": ["<证据>"] },
    "education": { "score": <0-100>, "reason": "<教育背景分析，30字以内>", "evidenceFromResume": ["<证据>"], "evidenceFromJD": [] }
  },
  "matchedKeywords": ["<匹配的关键词>"],
  "missingKeywords": ["<简历缺少但JD要求的关键词>"],
  "strengths": ["<简历优势1>", "<优势2>", "<优势3>"],
  "gaps": ["<不足点1>", "<不足点2>"],
  "suggestions": ["<可操作的投递建议1>", "<建议2>", "<建议3>"],
  "resumeRewriteHints": ["<简历改写提示1>", "<提示2>"]
}`,
        },
      ],
      { temperature: 0.3, maxTokens: 2000 }
    );

    if (aiReport) {
      setReport(aiReport);
      setAnalysisState("done");
    } else {
      // Fallback 本地分析
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

      setReport({
        overallScore, verdict,
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
      });
      setAnalysisState("done");
    }
  }

  // 读取上传的简历文件内容（支持 PDF / Word / TXT 等）
  async function handleResumeUpload(file: File) {
    setResumeName(file.name);
    setAnalysisState("idle");

    const result = await extractTextFromFile(file);

    if (result.error) {
      alert(result.error);
      setResumeText("");
      return;
    }

    if (result.text) {
      setResumeText(result.text);
    } else {
      alert("未能从文件中提取到文本内容，请直接粘贴简历文本。");
      setResumeText("");
    }
  }

  const keywordCoverage = report
    ? Math.round((report.matchedKeywords.length / (report.matchedKeywords.length + report.missingKeywords.length || 1)) * 100)
    : 0;

  const allJDKeywords = report
    ? [...report.matchedKeywords, ...report.missingKeywords]
    : [];

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-5 py-5">
        <header className="mb-5 flex items-center justify-between border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div>
            <p className="text-sm font-medium text-cyan-600">Offer捕手</p>
            <h1 className="mt-1 text-2xl font-semibold">岗位匹配官</h1>
          </div>
          <div className="hidden rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 md:block">
            上传简历 · 输入JD · 生成匹配报告
          </div>
        </header>

        <div className="grid flex-1 gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <section className="border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold">简历上传区域</h2>
                <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">
                  PDF / Word
                </span>
              </div>

              <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center border border-dashed border-slate-300 bg-slate-50 px-4 text-center transition hover:border-cyan-400 hover:bg-cyan-50">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      handleResumeUpload(file);
                    }
                  }}
                />
                <p className="text-sm font-medium text-slate-800">
                  {resumeName ? "已选择简历" : "拖拽或点击上传简历"}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  支持 PDF 和 Word 文件
                </p>
                <span className="mt-4 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white">
                  选择文件
                </span>
              </label>

              <div className="mt-4 border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                {resumeName ? `当前文件：${resumeName}` : "尚未上传简历"}
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  或直接粘贴简历文本
                </label>
                <textarea
                  value={resumeText}
                  onChange={(event) => {
                    const text = event.target.value;
                    setResumeText(text);
                    if (text.trim().length > 0 && !resumeName) {
                      setResumeName("手动输入");
                    } else if (text.trim().length === 0 && resumeName === "手动输入") {
                      setResumeName("");
                    }
                    setAnalysisState("idle");
                  }}
                  placeholder="或直接在此粘贴简历文本…"
                  className="h-32 w-full resize-none border border-slate-200 bg-slate-50 p-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white"
                />
              </div>
            </section>

            <section className="border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold">JD输入区域</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                  多行文本
                </span>
              </div>

              <textarea
                value={jdText}
                onChange={(event) => {
                  setJdText(event.target.value);
                  setAnalysisState("idle");
                }}
                placeholder="请粘贴目标岗位JD，例如岗位职责、任职要求、技能要求等。"
                className="h-56 w-full resize-none border border-slate-200 bg-slate-50 p-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white"
              />

              <button
                onClick={handleAnalyze}
                disabled={!canAnalyze || analysisState === "analyzing"}
                className="mt-4 w-full rounded-full bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {analysisState === "analyzing" ? "分析中..." : "开始分析"}
              </button>

              {!canAnalyze && (
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  输入简历文本并输入完整JD后，系统才会生成岗位匹配报告。
                </p>
              )}
            </section>
          </aside>

          <section className="space-y-5">
            {analysisState === "idle" && (
              <div className="flex min-h-[560px] items-center justify-center border border-slate-200 bg-white p-8 text-center shadow-sm">
                <div className="max-w-md">
                  <p className="text-sm font-medium text-cyan-600">等待分析</p>
                  <h2 className="mt-3 text-2xl font-semibold">先输入简历，再粘贴目标JD</h2>
                  <p className="mt-4 text-sm leading-6 text-slate-500">
                    岗位匹配官会在你提交材料后，依次生成综合匹配度、关键词覆盖率、优势分析、缺失能力和下一步建议。
                  </p>
                </div>
              </div>
            )}

            {analysisState === "analyzing" && (
              <div className="flex min-h-[560px] items-center justify-center border border-slate-200 bg-white p-8 text-center shadow-sm">
                <div>
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-cyan-600" />
                  <h2 className="mt-5 text-xl font-semibold">正在分析简历与JD</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    正在提取关键词、对比经历并计算岗位匹配度。
                  </p>
                </div>
              </div>
            )}

            {analysisState === "done" && report && (
              <>
                <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
                  <section className="border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-medium text-cyan-600">综合匹配度</p>
                    <h2 className="mt-1 text-xl font-semibold">匹配报告</h2>

                    <div className="mt-6 flex items-center justify-center">
                      <div className="relative h-44 w-44">
                        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
                          <circle cx="70" cy="70" r="54" stroke="#e2e8f0" strokeWidth="12" fill="none" />
                          <circle
                            cx="70"
                            cy="70"
                            r="54"
                            stroke="#0284c7"
                            strokeWidth="12"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={circleStyle.circumference}
                            strokeDashoffset={circleStyle.offset}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-4xl font-semibold">{report.overallScore}%</span>
                          <span className="mt-1 text-sm text-slate-500">匹配度</span>
                        </div>
                      </div>
                    </div>

                    <p className="mt-4 text-center text-sm font-medium text-slate-600">
                      {report.verdict === "推荐投递" && "✅ 推荐投递"}
                      {report.verdict === "建议优化后投递" && "📝 建议优化后投递"}
                      {report.verdict === "谨慎投递" && "⚠️ 谨慎投递"}
                      {report.verdict === "信息不足" && "ℹ️ 信息不足"}
                    </p>
                    {report.verdict === "建议优化后投递" && (
                      <p className="mt-2 text-center text-xs text-slate-500">
                        基础匹配，但缺少工具与量化成果证明
                      </p>
                    )}

                    <button
                      onClick={() => setShowDetail(true)}
                      className="mt-6 w-full rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-600"
                    >
                      查看详细分析
                    </button>
                  </section>

                  <section className="border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-medium text-slate-500">岗位关键词覆盖率</p>
                    <p className="mt-3 text-4xl font-semibold">{keywordCoverage}%</p>
                    <div className="mt-4 h-2 bg-slate-200">
                      <div className="h-2 bg-emerald-500" style={{ width: `${keywordCoverage}%` }} />
                    </div>

                    <div className="mt-6 flex flex-wrap gap-2">
                      {allJDKeywords.length > 0 ? (
                        allJDKeywords.map((keyword) => {
                          const isMatched = report.matchedKeywords.includes(keyword);
                          return (
                            <span
                              key={keyword}
                              className={`rounded-full border px-3 py-1 text-sm font-medium ${
                                isMatched
                                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 bg-slate-50 text-slate-400"
                              }`}
                            >
                              {keyword}
                              {!isMatched && " ✗"}
                            </span>
                          );
                        })
                      ) : (
                        <p className="text-sm text-slate-400">JD中未检测到明确的硬技能关键词</p>
                      )}
                    </div>
                  </section>
                </div>

                {showDetail && (
                  <div className="grid gap-5 md:grid-cols-2">
                    <section className="border border-slate-200 bg-white p-6 shadow-sm">
                      <h3 className="text-base font-semibold">优势分析</h3>
                      <div className="mt-4 space-y-3">
                        {report.strengths.map((item) => (
                          <div key={item} className="border-l-4 border-cyan-500 bg-slate-50 px-4 py-3">
                            <p className="text-sm leading-6 text-slate-700">{item}</p>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="border border-slate-200 bg-white p-6 shadow-sm">
                      <h3 className="text-base font-semibold">缺失能力分析</h3>
                      <div className="mt-4 space-y-3">
                        {report.gaps.map((item) => (
                          <div key={item} className="border-l-4 border-rose-500 bg-slate-50 px-4 py-3">
                            <p className="text-sm leading-6 text-slate-700">{item}</p>
                          </div>
                        ))}
                      </div>
                    </section>

                    <button
                      onClick={() => setShowAdvice(true)}
                      className="md:col-span-2 rounded-full bg-cyan-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-cyan-700"
                    >
                      生成岗位匹配建议
                    </button>
                  </div>
                )}

                {showAdvice && (
                  <section className="border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-base font-semibold">岗位匹配建议</h3>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {report.suggestions.map((item, index) => (
                        <div key={item} className="border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-semibold text-cyan-600">建议 {index + 1}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-700">{item}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {showAdvice && (
                  <footer className="border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                      <div>
                        <p className="text-lg font-semibold">下一步操作</p>
                        <p className="mt-1 text-sm text-slate-500">
                          继续到简历优化官，生成针对该岗位的优化版简历。
                        </p>
                      </div>
                      <a
                        href="/resume-optimizer/"
                        className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-cyan-600"
                      >
                        前往简历优化官
                      </a>
                    </div>
                  </footer>
                )}
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
