"use client";

import { useState } from "react";
import type { TruthReport, TruthClaim } from "@/types/analysis";

interface TruthReportPanelProps {
  report: TruthReport;
}

const riskColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  low: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  medium: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
  high: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", dot: "bg-rose-500" },
};

const riskLabels: Record<string, string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
};

const claimTypeLabels: Record<string, string> = {
  quantified_result: "量化成果",
  team_management: "团队管理",
  business_metric: "业务指标",
  technology_stack: "技术栈",
  process_improvement: "流程改进",
  award_certification: "获奖认证",
};

function ClaimCard({ claim }: { claim: TruthClaim }) {
  const [expanded, setExpanded] = useState(false);
  const colors = riskColors[claim.riskLevel];

  return (
    <div className={`rounded-2xl border ${colors.border} ${colors.bg} transition`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600">
              {claimTypeLabels[claim.claimType]}
            </span>
            <span className="text-xs font-medium text-slate-500">
              可信度 {claim.confidenceScore}%
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-800 truncate">
            {claim.originalText}
          </p>
        </div>
        <div className="ml-4 flex shrink-0 items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${colors.text}`}>
            {riskLabels[claim.riskLevel]}
          </span>
          <svg
            className={`h-5 w-5 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-200/50 px-4 pb-4 pt-3">
          {/* 可信度条 */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>可信度</span>
              <span className="font-semibold">{claim.confidenceScore}%</span>
            </div>
            <div className="h-2 rounded-full bg-white">
              <div
                className={`h-2 rounded-full transition-all duration-700 ${
                  claim.confidenceScore >= 75
                    ? "bg-emerald-500"
                    : claim.confidenceScore >= 45
                      ? "bg-amber-500"
                      : "bg-rose-500"
                }`}
                style={{ width: `${claim.confidenceScore}%` }}
              />
            </div>
          </div>

          {/* AI追问 */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-500 mb-2">AI 追问</p>
            <div className="space-y-1.5">
              {claim.verificationQuestions.map((q) => (
                <div key={q} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                  <p className="text-sm leading-6 text-slate-700">{q}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 可提交证据类型 */}
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">可提交证据类型</p>
            <div className="flex flex-wrap gap-1.5">
              {claim.evidenceType.map((e) => (
                <span key={e} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                  {e}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function TruthReportPanel({ report }: TruthReportPanelProps) {
  const [filter, setFilter] = useState<string>("all");

  const filtered =
    filter === "all"
      ? report.claims
      : report.claims.filter((c) => c.riskLevel === filter);

  return (
    <div className="space-y-5">
      {/* 总览 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-cyan-600">Layer 2</p>
            <h3 className="mt-1 text-xl font-semibold">简历真实性验证报告</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-4xl font-bold text-slate-950">{report.overallAccuracy}%</span>
            <span className="text-sm text-slate-500">准确度</span>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">{report.summary}</p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {(["low", "medium", "high"] as const).map((level) => {
            const c = riskColors[level];
            return (
              <div key={level} className={`rounded-xl border ${c.border} ${c.bg} p-3 text-center`}>
                <p className={`text-lg font-bold ${c.text}`}>{report.riskCount[level]}</p>
                <p className="text-xs text-slate-500">{riskLabels[level]}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 筛选器 */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", label: "全部声明" },
          { id: "high", label: "高风险" },
          { id: "medium", label: "中风险" },
          { id: "low", label: "低风险" },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              filter === f.id
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 声明列表 */}
      <div className="space-y-3">
        {filtered.map((claim) => (
          <ClaimCard key={claim.id} claim={claim} />
        ))}
      </div>
    </div>
  );
}
