"use client";

import { useState, useRef, useEffect } from "react";
import type { ChatMessage, OptimizationSuggestion } from "@/types/analysis";

interface AIChatPanelProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  disabled?: boolean;
  activeSuggestion?: OptimizationSuggestion | null;
  onEndChat?: () => void;
}

const stageLabels: Record<number, string> = {
  0: "AI 正在分析建议...",
  1: "AI 追问 1/3：了解基本情况",
  2: "AI 追问 2/3：深入获取细节",
  3: "AI 追问 3/3：补充关键数据",
  4: "AI 正在生成优化内容...",
  5: "优化完成！",
};

export function AIChatPanel({
  messages,
  onSend,
  disabled,
  activeSuggestion,
  onEndChat,
}: AIChatPanelProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const isGuided = !!activeSuggestion;
  const isCompleted = activeSuggestion?.status === "done";
  const totalQuestions = activeSuggestion?.aiQuestions?.length || 0;
  const collectedCount = activeSuggestion?.collectedInfo?.length || 0;
  const currentStage = isCompleted
    ? 5
    : activeSuggestion?.status === "chatting"
      ? Math.min(collectedCount + 1, totalQuestions)
      : 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    const text = input.trim();
    if (!text || disabled) return;
    onSend(text);
    setInput("");
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-cyan-600 flex items-center justify-center text-sm text-white font-bold">
            AI
          </div>
          <div>
            <p className="text-sm font-semibold">
              {isGuided ? "AI 对话式优化" : "AI 简历优化助手"}
            </p>
            <p className="text-xs text-slate-500">
              {isGuided ? `正在处理：${activeSuggestion.section} - ${activeSuggestion.description.slice(0, 15)}...` : "对话式逐段优化"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isGuided && (
            <>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                isCompleted
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}>
                {stageLabels[currentStage] || "进行中"}
              </span>
              {isCompleted && onEndChat && (
                <button
                  type="button"
                  onClick={onEndChat}
                  className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:border-cyan-300 transition"
                >
                  继续下一条
                </button>
              )}
            </>
          )}
          {!isGuided && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              在线
            </span>
          )}
        </div>
      </div>

      {/* 引导模式下：进度条 */}
      {isGuided && !isCompleted && (
        <div className="border-b border-slate-100 px-5 py-2.5 bg-slate-50">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-medium text-slate-600">
              对话进度：{collectedCount}/{totalQuestions} 个问题已回答
            </p>
            <p className="text-xs text-slate-400">
              {collectedCount >= totalQuestions ? "即将生成优化内容..." : `还需回答 ${totalQuestions - collectedCount} 个问题`}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {activeSuggestion.aiQuestions.map((_, qi) => (
              <div key={qi} className="flex-1">
                <div className={`h-1.5 rounded-full transition-all duration-500 ${
                  qi < collectedCount
                    ? "bg-emerald-500"
                    : qi === collectedCount
                      ? "bg-cyan-500 animate-pulse"
                      : "bg-slate-200"
                }`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "420px" }}>
        {!isGuided && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <span className="text-2xl">💬</span>
            </div>
            <p className="text-sm font-medium text-slate-700">AI 对话式简历优化</p>
            <p className="mt-1 text-xs text-slate-500 max-w-[260px]">
              在ATS优化面板中点击「确认修改」，AI将引导你补充真实信息并生成优化内容。
              你也可以直接输入问题。
            </p>
          </div>
        )}

        {isGuided && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="h-12 w-12 rounded-full bg-cyan-50 flex items-center justify-center mb-3">
              <span className="text-2xl">🎯</span>
            </div>
            <p className="text-sm font-medium text-slate-700">开始对话式优化</p>
            <p className="mt-2 text-xs text-slate-500 max-w-[260px]">
              AI 会依次向你提出 {totalQuestions} 个问题，帮助你补充真实细节。
              完成后自动生成优化内容。
            </p>
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left max-w-[280px]">
              <p className="text-xs font-semibold text-amber-700">当前建议</p>
              <p className="mt-1 text-xs text-amber-800">{activeSuggestion.description}</p>
              {activeSuggestion.originalText && (
                <div className="mt-2 rounded border border-amber-200/60 bg-white px-2.5 py-1.5">
                  <p className="text-[10px] font-semibold text-slate-400 mb-0.5">📄 简历原文</p>
                  <p className="text-xs text-slate-600 italic">「{activeSuggestion.originalText}」</p>
                </div>
              )}
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                  isUser
                    ? "bg-slate-950 text-white"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                <p>{msg.content}</p>
                {msg.relatedClaimId && (
                  <p className="mt-1.5 text-[10px] opacity-60">
                    关联声明：{msg.relatedClaimId}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* 完成状态展示 */}
        {isGuided && isCompleted && activeSuggestion.optimizedText && (
          <div className="border-t border-slate-200 p-4 bg-emerald-50/50">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-semibold text-emerald-700">对话优化结果</p>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                已确认
              </span>
            </div>
            {activeSuggestion.originalText && (
              <div className="rounded-lg border border-slate-200 bg-white p-3 mb-2">
                <p className="text-[11px] font-semibold text-slate-400 mb-1">📄 简历原文</p>
                <p className="text-sm leading-6 text-slate-500 italic">「{activeSuggestion.originalText}」</p>
              </div>
            )}
            <div className="rounded-lg border border-emerald-200 bg-white p-3">
              <p className="text-[11px] font-semibold text-emerald-600 mb-1">✅ 优化后</p>
              <p className="text-sm leading-6 text-slate-800">{activeSuggestion.optimizedText}</p>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              该优化内容已自动同步到「优化对比」面板，基于你提供的真实信息生成。
            </p>
          </div>
        )}

      {/* 输入区 */}
      <div className="border-t border-slate-200 p-4">
        {isGuided && !isCompleted && (
          <div className="mb-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2">
            <p className="text-xs text-cyan-700">
              💡 当前建议：{activeSuggestion.description}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={
              isGuided && !isCompleted
                ? "输入你的真实经历和数据..."
                : "输入你想优化的方向或问题..."
            }
            disabled={disabled || isCompleted}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={disabled || !input.trim() || isCompleted}
            className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            发送
          </button>
        </div>

        {/* 快捷回复（引导模式） */}
        {!isGuided && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {["帮我优化项目描述", "补充SQL相关经历", "量化我的成果", "调整简历结构"].map((hint) => (
              <button
                key={hint}
                type="button"
                onClick={() => {
                  if (!disabled) onSend(hint);
                }}
                disabled={disabled}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 transition hover:border-cyan-300 hover:bg-cyan-50 disabled:opacity-50"
              >
                {hint}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
