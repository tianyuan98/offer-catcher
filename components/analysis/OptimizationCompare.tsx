"use client";

import type { OptimizedSection, OptimizationSuggestion } from "@/types/analysis";

interface OptimizationCompareProps {
  sections: OptimizedSection[];
  dynamicOptimizations?: OptimizationSuggestion[];
}

export function OptimizationCompare({
  sections,
  dynamicOptimizations = [],
}: OptimizationCompareProps) {
  const doneSuggestions = dynamicOptimizations.filter((s) => s.status === "done" && s.optimizedText);

  // 不做 section 名合并（避免同名section互相覆盖），对话优化结果全部单独展示
  const mergedSections = sections;

  // 所有对话优化建议独立展示（不按section名合并）
  const standaloneSuggestions = doneSuggestions;

  return (
    <div className="space-y-5">
      {/* 总览 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">优化后简历预览</h3>
            <p className="mt-1 text-xs text-slate-500">
              以下为AI根据JD定制重写后的各模块内容
            </p>
          </div>
          {doneSuggestions.length > 0 && (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              {doneSuggestions.length} 处来自对话的真实优化
            </span>
          )}
        </div>
      </div>

      {/* 原始优化内容 */}
      <div className="space-y-4">
        {mergedSections.map((sec, idx) => {
          return (
            <div
              key={`${sec.section}-${idx}`}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition"
            >
              {/* 模块标题 */}
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
                <h4 className="text-sm font-semibold text-slate-900">
                  {idx + 1}. {sec.section}
                </h4>
                <span className="rounded-full bg-cyan-50 px-2.5 py-0.5 text-xs font-medium text-cyan-700">
                  {sec.changes.length} 处修改
                </span>
              </div>

              {/* 对比内容 */}
              <div className="grid md:grid-cols-2 divide-x divide-slate-200">
                <div className="p-4">
                  <p className="text-xs font-semibold text-slate-400 mb-2">原始内容</p>
                  <p className="text-sm leading-6 text-slate-500">{sec.original}</p>
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold mb-2 text-cyan-600">优化后</p>
                  <p className="text-sm leading-6 text-slate-800">{sec.optimized}</p>
                </div>
              </div>

              {/* 修改要点 */}
              <div className="border-t border-slate-200 px-5 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {sec.changes.map((c) => {
                    const isDynamic = c.includes("对话优化");
                    return (
                      <span
                        key={c}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          isDynamic
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-cyan-50 text-cyan-700"
                        }`}
                      >
                        {c}
                      </span>
                    );
                  })}
                  {sec.jdKeywordsAdded.map((kw) => (
                    <span key={kw} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                      +{kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {/* 单独展示的动态建议 */}
        {standaloneSuggestions.length > 0 && (
          <>
            {standaloneSuggestions.map((sug) => (
              <div
                key={sug.id}
                className="rounded-2xl border border-emerald-300 bg-white shadow-sm overflow-hidden ring-2 ring-emerald-100"
              >
                <div className="flex items-center justify-between border-b border-slate-200 bg-emerald-50 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-900">{sug.section}</h4>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                      对话优化
                    </span>
                  </div>
                  <span className="text-xs text-emerald-600">新增内容</span>
                </div>
                <div className="p-5">
                  <p className="text-xs text-slate-500 mb-2">原始描述</p>
                  <p className="text-sm text-slate-400 italic mb-4">{sug.description}</p>
                  <p className="text-xs font-semibold text-emerald-600 mb-2">基于真实对话生成的优化内容</p>
                  <p className="text-sm leading-6 text-slate-800">{sug.optimizedText}</p>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* 提示信息 */}
      {doneSuggestions.length > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-800">
            ✅ 以上标有「对话优化」的内容均基于你在AI对话中提供的真实经历和数据生成，
            确保信息的真实性和可信度。
          </p>
          <p className="mt-1 text-xs text-emerald-600">
            面试中遇到相关追问时，请以对话中提供的真实情况作为回答依据。
          </p>
        </div>
      )}
    </div>
  );
}
