"use client";

import type { MatchReport } from "@/types/analysis";

interface MatchAnalysisCardProps {
  report: MatchReport;
}

const recColors: Record<string, { bg: string; text: string; border: string; label: string }> = {
  strong_apply: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    label: "推荐投递",
  },
  cautious_apply: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    label: "谨慎投递",
  },
  not_recommended: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    label: "暂不建议",
  },
};

export function MatchAnalysisCard({ report }: MatchAnalysisCardProps) {
  const rec = recColors[report.recommendation];

  return (
    <div className="space-y-5">
      {/* 总览 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-cyan-600">岗位匹配度</p>
            <h3 className="mt-1 text-xl font-semibold">匹配分析报告</h3>
          </div>
          <span className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${rec.border} ${rec.bg} ${rec.text}`}>
            {rec.label}
          </span>
        </div>

        {/* 环形进度 */}
        <div className="mt-6 flex justify-center">
          <div className="relative h-36 w-36">
            <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
              <circle cx="70" cy="70" r="54" stroke="#e2e8f0" strokeWidth="12" fill="none" />
              <circle
                cx="70" cy="70" r="54"
                stroke="#0891b2"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 54}
                strokeDashoffset={2 * Math.PI * 54 * (1 - report.overallScore / 100)}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold">{report.overallScore}%</span>
              <span className="text-sm text-slate-500">综合匹配</span>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 p-4">
          <p className="text-sm leading-6 text-slate-600">{report.recommendationReason}</p>
        </div>
      </div>

      {/* 分项维度 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold">分项匹配度</h3>
        <div className="mt-3 space-y-3">
          {report.dimensions.map((d) => (
            <div key={d.name} className="rounded-xl border border-slate-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">{d.name}</span>
                <span className={`text-lg font-bold ${d.score >= 75 ? "text-emerald-600" : d.score >= 50 ? "text-amber-600" : "text-rose-600"}`}>
                  {d.score}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100">
                <div
                  className={`h-1.5 rounded-full transition-all duration-700 ${
                    d.score >= 75 ? "bg-emerald-500" : d.score >= 50 ? "bg-amber-500" : "bg-rose-500"
                  }`}
                  style={{ width: `${d.score}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">{d.details}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 优势 + 缺失 */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold">优势项</h3>
          <div className="mt-3 space-y-2">
            {report.strengths.map((s) => (
              <div key={s} className="border-l-4 border-cyan-500 bg-slate-50 px-4 py-3">
                <p className="text-sm leading-6 text-slate-700">{s}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold">缺失项</h3>
          <div className="mt-3 space-y-2">
            {report.gaps.map((g) => (
              <div key={g} className="border-l-4 border-rose-500 bg-slate-50 px-4 py-3">
                <p className="text-sm leading-6 text-slate-700">{g}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
