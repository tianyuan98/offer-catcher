"use client";

import type { ATSReport, OptimizationSuggestion } from "@/types/analysis";

interface ATSScoreCardProps {
  report: ATSReport;
  suggestions?: OptimizationSuggestion[];
  onConfirmSuggestion?: (suggestionId: string) => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: "确认修改", color: "bg-cyan-600 hover:bg-cyan-700 text-white", icon: "" },
  chatting: { label: "对话中...", color: "bg-amber-50 border-amber-300 text-amber-700", icon: "💬" },
  done: { label: "已完成", color: "bg-emerald-50 border-emerald-300 text-emerald-700", icon: "✅" },
};

export function ATSScoreCard({ report, suggestions = [], onConfirmSuggestion }: ATSScoreCardProps) {
  const { score, coveredKeywords, missingKeywords, formatIssues, suggestions: atsSuggestions } = report;

  const scores = [
    { label: "总评", value: score.overall, color: "text-cyan-600", barColor: "bg-cyan-500" },
    { label: "格式", value: score.formatScore, color: "text-indigo-600", barColor: "bg-indigo-500" },
    { label: "关键词", value: score.keywordScore, color: "text-emerald-600", barColor: "bg-emerald-500" },
    { label: "结构", value: score.structureScore, color: "text-violet-600", barColor: "bg-violet-500" },
    { label: "内容", value: score.contentScore, color: "text-amber-600", barColor: "bg-amber-500" },
  ];

  const pendingCount = suggestions.filter((s) => s.status === "pending").length;
  const doneCount = suggestions.filter((s) => s.status === "done").length;

  return (
    <div className="space-y-5">
      {/* 评分网格 */}
      <div className="grid gap-4 md:grid-cols-5">
        {scores.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{s.label}</p>
            <p className={`mt-2 text-3xl font-bold ${s.color}`}>{s.value}</p>
            <div className="mt-3 h-1.5 rounded-full bg-slate-100">
              <div
                className={`h-1.5 rounded-full ${s.barColor} transition-all duration-700`}
                style={{ width: `${s.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 关键词对比 */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold">
            已覆盖关键词
            <span className="ml-2 text-sm font-normal text-emerald-600">
              {coveredKeywords.length}
            </span>
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {coveredKeywords.map((kw) => (
              <span
                key={kw.keyword}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700"
              >
                {kw.keyword}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold">
            缺失关键词
            <span className="ml-2 text-sm font-normal text-rose-600">
              {missingKeywords.length}
            </span>
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {missingKeywords.map((kw) => (
              <span
                key={kw.keyword}
                className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-sm font-medium text-rose-700"
              >
                {kw.keyword}
                {kw.priority === "high" && (
                  <span className="ml-1 text-[10px] text-rose-400">H</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 格式问题 */}
      {formatIssues.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold">格式风险</h3>
          <div className="mt-3 space-y-2">
            {formatIssues.map((issue) => (
              <div key={issue} className="border-l-4 border-amber-400 bg-amber-50 px-4 py-3">
                <p className="text-sm leading-6 text-amber-800">{issue}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI 优化建议（可操作） */}
      {suggestions.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-semibold">AI 优化建议</h3>
            <div className="flex items-center gap-2">
              {doneCount > 0 && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  {doneCount}/{suggestions.length} 已完成
                </span>
              )}
              {pendingCount > 0 && (
                <span className="rounded-full bg-cyan-50 px-2.5 py-0.5 text-xs font-medium text-cyan-700">
                  {pendingCount} 条待处理
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            点击「确认修改」启动对话，AI 将引导你补充真实信息并生成优化内容
          </p>

          <div className="space-y-3">
            {suggestions.map((sug, i) => {
              const cfg = statusConfig[sug.status];
              return (
                <div
                  key={sug.id}
                  className={`rounded-xl border p-4 transition-all ${
                    sug.status === "chatting"
                      ? "border-amber-300 bg-amber-50/50 ring-2 ring-amber-200"
                      : sug.status === "done"
                        ? "border-emerald-200 bg-emerald-50/30"
                        : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                          {sug.section}
                        </span>
                        <span className="text-xs text-slate-400">#{i + 1}</span>
                      </div>
                      {/* 简历原文 */}
                      {sug.originalText && (
                        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-100/60 p-3">
                          <p className="text-[11px] font-semibold text-slate-500 mb-1">📄 简历原文</p>
                          <p className="text-sm leading-6 text-slate-600 italic">「{sug.originalText}」</p>
                        </div>
                      )}
                      <p className="mt-2 text-sm font-medium leading-6 text-slate-900">{sug.description}</p>
                      <p className="mt-1.5 text-xs leading-5 text-slate-500">{sug.reason}</p>

                      {/* 已完成的优化结果预览 */}
                      {sug.status === "done" && sug.optimizedText && (
                        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                          <p className="text-xs font-semibold text-emerald-600 mb-1">✅ 优化后内容</p>
                          <p className="text-sm leading-6 text-slate-700">{sug.optimizedText}</p>
                        </div>
                      )}

                      {/* 对话中显示收集到的信息 */}
                      {sug.status === "chatting" && sug.collectedInfo && sug.collectedInfo.length > 0 && (
                        <div className="mt-3 rounded-lg border border-amber-200 bg-white p-3">
                          <p className="text-xs font-semibold text-amber-600 mb-1">
                            已收集 {sug.collectedInfo.length} 条信息
                          </p>
                          <div className="space-y-1">
                            {sug.collectedInfo.map((info, idx) => (
                              <p key={idx} className="text-xs text-slate-600">· {info}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="shrink-0">
                      {sug.status === "pending" && onConfirmSuggestion && (
                        <button
                          type="button"
                          onClick={() => onConfirmSuggestion(sug.id)}
                          className={`rounded-full px-4 py-2 text-sm font-medium transition ${cfg.color}`}
                        >
                          {cfg.icon} {cfg.label}
                        </button>
                      )}
                      {(sug.status === "chatting" || sug.status === "done") && (
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 待处理时展示AI会问什么 */}
                  {sug.status === "pending" && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {sug.aiQuestions.map((q, qi) => (
                        <span
                          key={qi}
                          className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-500"
                        >
                          Q{qi + 1}: {q.length > 20 ? q.slice(0, 20) + "..." : q}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 旧的ATS文字建议（保留） */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold">ATS 格式建议</h3>
        <div className="mt-3 space-y-2">
          {atsSuggestions.map((s, i) => (
            <div key={s} className="border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-cyan-600">建议 {i + 1}</p>
              <p className="mt-1.5 text-sm leading-6 text-slate-700">{s}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
