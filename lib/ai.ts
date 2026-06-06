/**
 * lib/ai.ts
 * 统一 AI 调用工具 —— 对接硅基流动 (SiliconFlow) 免费 API
 * 兼容 OpenAI 接口格式，支持流式和非流式输出
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// 环境变量中读取 API Key（服务端运行，安全）
const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY || "";
const SILICONFLOW_BASE_URL = "https://api.siliconflow.cn/v1";
// 使用 Qwen2.5-7B-Instruct 免费模型（硅基流动免费额度）
const DEFAULT_MODEL = "Qwen/Qwen2.5-7B-Instruct";

/**
 * 非流式 AI 调用 —— 适合分析类、一次性输出场景
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<string> {
  const {
    model = DEFAULT_MODEL,
    temperature = 0.7,
    maxTokens = 2000,
  } = options;

  if (!SILICONFLOW_API_KEY) {
    throw new Error(
      "未配置 SILICONFLOW_API_KEY，请在环境变量中设置。\n" +
      "1. 访问 https://siliconflow.cn 注册并获取免费 API Key\n" +
      "2. 在项目根目录创建 .env.local 文件，写入：SILICONFLOW_API_KEY=sk-xxx"
    );
  }

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
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "unknown error");
    throw new Error(
      `AI API 调用失败 (${response.status}): ${errorText}`
    );
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  return data.choices?.[0]?.message?.content || "";
}

/**
 * 流式 AI 调用 —— 返回 ReadableStream，适合对话类逐字输出场景
 */
export async function chatCompletionStream(
  messages: ChatMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<ReadableStream<Uint8Array>> {
  const {
    model = DEFAULT_MODEL,
    temperature = 0.7,
    maxTokens = 2000,
  } = options;

  if (!SILICONFLOW_API_KEY) {
    throw new Error("未配置 SILICONFLOW_API_KEY");
  }

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
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`AI 流式 API 调用失败 (${response.status})`);
  }

  return response.body;
}

/**
 * 解析 SSE 流，提取 AI 回复文本
 * 供前端接收流式响应时使用
 */
export function parseSSEChunk(chunk: string): string {
  const lines = chunk.split("\n");
  let result = "";
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const data = line.slice(6).trim();
      if (data === "[DONE]") break;
      try {
        const parsed = JSON.parse(data) as {
          choices: Array<{ delta: { content?: string } }>;
        };
        result += parsed.choices?.[0]?.delta?.content || "";
      } catch {
        // 忽略解析错误
      }
    }
  }
  return result;
}
