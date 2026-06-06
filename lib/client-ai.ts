/**
 * lib/client-ai.ts
 * 客户端直接调用硅基流动 API —— 无需服务端 API Routes
 * 静态导出（output: "export"）部署时使用
 */

const SILICONFLOW_API_KEY = "sk-zwvkbqdwwhxakhrfeljscriggtgibdxdjjedovwauqsztblg";
const SILICONFLOW_BASE_URL = "https://api.siliconflow.cn/v1";
// ✅ 已升级：32B 模型 JSON 输出更稳定，在硅基流动上仍为免费模型
const DEFAULT_MODEL = "Qwen/Qwen2.5-32B-Instruct";

export interface ClientChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * 非流式 AI 调用（客户端直连）
 * 返回 AI 回复文本，失败时返回 null
 */
export async function clientChatCompletion(
  messages: ClientChatMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<string | null> {
  const {
    model = DEFAULT_MODEL,
    temperature = 0.7,
    maxTokens = 2000,
  } = options;

  try {
    const response = await fetch(`${SILICONFLOW_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SILICONFLOW_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
      signal: AbortSignal.timeout(60000), // 32B模型略慢，超时延长到60秒
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "unknown");
      console.error(`[ClientAI] API 错误 ${response.status}:`, errText);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      console.error("[ClientAI] 请求超时（60s）");
    } else {
      console.error("[ClientAI] 请求失败:", error);
    }
    return null;
  }
}

/**
 * 尝试修复常见的 JSON 格式问题
 * 处理：markdown代码块包裹、多余大括号、截断的JSON数组/对象等
 */
function tryRepairJSON(raw: string): string {
  let s = raw.trim();

  // 去除 markdown 代码块包裹（```json ... ``` 或 ``` ... ```）
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // 去除常见的前缀文字（如 "好的，以下是JSON：\n[..."）
  const jsonStartArray = s.indexOf("[");
  const jsonStartObject = s.indexOf("{");
  if (jsonStartArray !== -1 || jsonStartObject !== -1) {
    const start = jsonStartArray === -1
      ? jsonStartObject
      : jsonStartObject === -1
        ? jsonStartArray
        : Math.min(jsonStartArray, jsonStartObject);
    if (start > 0) s = s.slice(start);
  }

  // 去除常见后缀文字（如 JSON 后面跟了解释性文字）
  // 找到最后一个 ] 或 } 并截断
  const lastBracket = Math.max(s.lastIndexOf("]"), s.lastIndexOf("}"));
  if (lastBracket !== -1 && lastBracket < s.length - 1) {
    s = s.slice(0, lastBracket + 1);
  }

  // 处理多余的闭合括号（如 "}}}" -> "}}"）
  // 尝试逐步移除末尾多余的 } 来修复
  return s;
}

/**
 * 调用 AI 并解析 JSON 返回
 * 多层容错：直接解析 → 修复后解析 → 提取部分JSON
 */
export async function clientChatJSON<T>(
  messages: ClientChatMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<T | null> {
  const content = await clientChatCompletion(messages, options);
  if (!content) return null;

  // 第一层：直接清理 markdown 代码块后解析
  try {
    const cleaned = content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    // 第一层失败，进入修复逻辑
  }

  // 第二层：使用增强修复后解析
  try {
    const repaired = tryRepairJSON(content);
    return JSON.parse(repaired) as T;
  } catch {
    // 第二层失败，尝试提取有效JSON片段
  }

  // 第三层：正则提取第一个完整的 JSON 数组或对象
  try {
    // 匹配最外层的 [...] 或 {...}
    const arrayMatch = content.match(/\[[\s\S]*\]/);
    const objectMatch = content.match(/\{[\s\S]*\}/);
    const match = arrayMatch
      ? (objectMatch ? (content.indexOf("[") < content.indexOf("{") ? arrayMatch : objectMatch) : arrayMatch)
      : objectMatch;
    if (match) {
      return JSON.parse(match[0]) as T;
    }
  } catch {
    // 全部失败
  }

  console.error("[ClientAI] JSON 解析全部失败，原始内容前300字:", content.slice(0, 300));
  return null;
}
