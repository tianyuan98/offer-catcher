"use client";

import { useState } from "react";
import type { InterviewPrep } from "@/types/analysis";

interface InterviewPrepPanelProps {
  prep: InterviewPrep;
}

const categoryLabels: Record<string, { label: string; color: string }> = {
  technical: { label: "技术问题", color: "bg-indigo-100 text-indigo-700" },
  behavioral: { label: "行为面试", color: "bg-cyan-100 text-cyan-700" },
  situational: { label: "情景模拟", color: "bg-violet-100 text-violet-700" },
};

const difficultyLabels: Record<string, { label: string; color: string }> = {
  easy: { label: "基础", color: "text-emerald-600" },
  medium: { label: "中等", color: "text-amber-600" },
  hard: { label: "进阶", color: "text-rose-600" },
};

export function InterviewPrepPanel({ prep }: InterviewPrepPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filtered =
    categoryFilter === "all"
      ? prep.questions
      : prep.questions.filter((q) => q.category === categoryFilter);

  return (
    <div className="space-y-5">
      {/* 总览 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-cyan-600">Layer 3</p>
            <h3 className="mt-1 text-xl font-semibold">面试准备指南</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-4xl font-bold text-slate-950">{prep.successPrediction}%</span>
            <span className="text-sm text-slate-500">成功率预测</span>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-700">你的优势</p>
            <div className="mt-2 space-y-1.5">
              {prep.strengths.map((s) => (
                <p key={s} className="text-sm leading-6 text-emerald-800">+ {s}</p>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-semibold text-rose-700">需要准备的方面</p>
            <div className="mt-2 space-y-1.5">
              {prep.weaknesses.map((w) => (
                <p key={w} className="text-sm leading-6 text-rose-800">! {w}</p>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 准备技巧 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold">面试准备技巧</h3>
        <div className="mt-3 space-y-2">
          {prep.preparationTips.map((tip) => (
            <div key={tip} className="border-l-4 border-cyan-400 bg-cyan-50/50 px-4 py-3">
              <p className="text-sm leading-6 text-slate-700">{tip}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 问题库 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold">面试问题库</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { id: "all", label: "全部" },
            { id: "technical", label: "技术问题" },
            { id: "behavioral", label: "行为面试" },
            { id: "situational", label: "情景模拟" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setCategoryFilter(f.id)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                categoryFilter === f.id
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {filtered.map((q) => {
            const cat = categoryLabels[q.category];
            const diff = difficultyLabels[q.difficulty];
            const expanded = expandedId === q.id;

            return (
              <div key={q.id} className="rounded-2xl border border-slate-200 p-4">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : q.id)}
                  className="flex w-full items-start justify-between text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cat.color}`}>
                        {cat.label}
                      </span>
                      <span className={`text-xs font-medium ${diff.color}`}>
                        {diff.label}
                      </span>
                    </div>
                    <p className="text-sm font-medium leading-6 text-slate-900">{q.question}</p>
                    {q.hint && !expanded && (
                      <p className="mt-1 text-xs text-slate-500">提示：{q.hint}</p>
                    )}
                  </div>
                  <svg
                    className={`ml-3 h-5 w-5 shrink-0 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expanded && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold text-cyan-600 mb-1.5">参考回答思路</p>
                    <p className="text-sm leading-6 text-slate-700">{q.suggestedAnswer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
