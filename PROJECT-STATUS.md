# Offer捕手 - 项目全面状态报告

> 生成时间：2026-06-05 19:25  
> 目的：让任何开发者拿到此文档即可接手项目修改

---

## 一、项目基本信息

| 项目 | 内容 |
|------|------|
| **项目名** | Offer捕手 - AI求职智能体工作台 |
| **项目路径** | `C:\Users\14824\WorkBuddy\2026-06-03-12-40-13` |
| **线上地址** | https://785e611432ec42529e3237c4c8ad3c0d.app.codebuddy.work |
| **技术栈** | Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS 4 |
| **部署方式** | 静态导出 (`output: "export"`) → CloudStudio |
| **AI服务** | 硅基流动 SiliconFlow（OpenAI兼容格式） |
| **当前模型** | `Qwen/Qwen2.5-7B-Instruct`（免费，但JSON输出不可靠） |

---

## 二、完整文件结构

```
项目根目录/
├── .env.local                          # 环境变量（API Key 为空，实际 Key 硬编码在 client-ai.ts）
├── next.config.ts                       # Next.js 配置：静态导出模式
├── package.json                         # 依赖管理
├── tsconfig.json                        # TypeScript 配置
├── postcss.config.js                    # PostCSS 配置
├── fix-static.js                        # 静态导出后处理脚本
│
├── app/
│   ├── layout.tsx                       # 根布局（zh-CN，无全局Provider/Store）
│   ├── page.tsx                         # 首页（服务端组件，3个智能体卡片入口）
│   ├── globals.css                      # 全局样式
│   │
│   ├── career-explorer/
│   │   └── page.tsx                     # 【职业探索官】1465行，纯本地计算，30题测评
│   │
│   ├── job-matcher/
│   │   └── page.tsx                     # 【岗位匹配官】456行，AI分析+本地fallback
│   │
│   ├── resume-optimizer/
│   │   └── page.tsx                     # 【简历优化官】849行，5个并行AI请求，最复杂
│   │
│   └── api/                             # ⚠️ 静态导出模式下不可用（残留代码）
│       ├── analyze/route.ts             # 岗位匹配 API
│       ├── career/route.ts              # 职业探索 API
│       └── resume/route.ts              # 简历优化 API
│
├── components/
│   ├── ui/
│   │   └── Tabs.tsx                     # 通用Tab切换组件
│   └── analysis/
│       ├── AIChatPanel.tsx              # AI对话面板（引导模式+通用聊天）
│       ├── ATSScoreCard.tsx             # ATS评分卡片（5维评分+可操作建议）
│       ├── InterviewPrepPanel.tsx       # 面试准备面板
│       ├── MatchAnalysisCard.tsx        # 匹配分析卡片
│       ├── OptimizationCompare.tsx      # 优化对比面板
│       └── TruthReportPanel.tsx         # 真实性验证面板
│
├── lib/
│   ├── ai.ts                            # 服务端AI调用（静态模式下未使用）
│   ├── client-ai.ts                     # ★ 客户端直连AI（核心文件，含硬编码API Key）
│   ├── pdf-extract.ts                   # PDF/Word文本提取（浏览器端）
│   └── engines/
│       └── analyzer.ts                  # 本地分析引擎（仅ATS关键词扫描有效）
│
├── types/
│   └── analysis.ts                      # 全局类型定义
│
└── public/
    └── pdf.worker.min.mjs               # pdfjs-dist worker文件
```

---

## 三、数据存储说明

### ⚠️ 本项目没有数据库，没有持久化存储

| 数据类型 | 存储位置 | 生命周期 | 说明 |
|----------|----------|----------|------|
| 用户上传的简历文件 | 浏览器内存（File对象） | 当前页面会话 | 刷新/关闭页面即丢失 |
| 解析后的简历文本 | React 组件 state | 当前页面会话 | 同上 |
| AI分析结果（5个维度的JSON） | React 组件 state | 当前页面会话 | 同上 |
| 对话式优化的聊天记录 | React 组件 state | 当前页面会话 | 同上 |
| 职业测评的选择和结果 | React 组件 state | 当前页面会话 | 同上 |
| API Key | `lib/client-ai.ts` 第7行硬编码 | 永久（直到代码修改） | **安全风险** |

**结论**：所有用户数据仅存在于浏览器内存中，刷新即丢失。没有用户系统、没有登录、没有数据库。

---

## 四、AI 调用架构

### 当前架构：客户端直连硅基流动 API

```
用户浏览器 → 直接调用 api.siliconflow.cn → 返回结果
             （API Key 暴露在前端代码中）
```

**为什么不走服务端**：项目使用 `output: "export"` 静态导出，没有服务端运行时，所以 `/app/api/` 下的3个路由在部署后不可用。

### 关键文件：`lib/client-ai.ts`

```typescript
const SILICONFLOW_API_KEY = "sk-zwvkbqdwwhxakhrfeljscriggtgibdxdjjedovwauqsztblg";  // 第7行
const SILICONFLOW_BASE_URL = "https://api.siliconflow.cn/v1";
const DEFAULT_MODEL = "Qwen/Qwen2.5-7B-Instruct";  // 第9行
```

- `clientChatCompletion()`：非流式调用，返回文本，45秒超时，失败返回 null
- `clientChatJSON<T>()()`：调用上面的方法，自动清理 markdown 代码块包裹，JSON.parse 返回

### AI 请求分布

| 页面 | 请求数 | 调用方式 | 模型 |
|------|--------|----------|------|
| 职业探索官 | 0 | 纯本地计算 | 不调用AI |
| 岗位匹配官 | 1 | clientChatJSON | Qwen2.5-7B |
| 简历优化官 | 5 | clientChatJSON（并行） | Qwen2.5-7B |

---

## 五、当前必须解决的问题（按优先级排序）

### 🔴 P0：模型升级 7B → 32B（影响所有AI功能）

**问题**：Qwen2.5-7B-Instruct 在复杂 JSON 输出场景下会：
- 重复循环输出（同一个建议写3-4遍）
- 拼错 JSON 字段名（`suggesion` vs `suggestion`）
- 产生非法 JSON 结构（多余的 `}}`、缺少逗号）
- 返回与 prompt 要求不符的字段名

**已验证**：Qwen2.5-32B-Instruct 在相同 prompt 下完美通过所有测试。

**修复方法**：修改 `lib/client-ai.ts` 第9行：

```typescript
// 修改前
const DEFAULT_MODEL = "Qwen/Qwen2.5-7B-Instruct";
// 修改后
const DEFAULT_MODEL = "Qwen/Qwen2.5-32B-Instruct";
```

**费用**：32B 在硅基流动上也是**免费模型**（账户余额为0仍可调用）。

---

### 🔴 P0：API Key 硬编码在前端代码中

**问题**：`lib/client-ai.ts` 第7行直接写死了 API Key，部署后任何人在浏览器 DevTools 中都能看到。

**影响**：任何人可以拿走 Key 无限调用硅基流动 API。

**长期方案**：需要一个后端代理来隐藏 Key。但当前静态导出模式没有服务端。

**短期方案**（可选）：
1. 在硅基流动后台设置 API Key 的调用频率限制和 IP 白名单
2. 或改用 Vercel/Cloudflare Workers 做代理（需要改变部署方式）

---

### 🟡 P1：AI 建议针对性不足

**现状**：已重写全部5个 prompt，增加了8项分析框架、few-shot示例、强制引用原文，但因为7B模型能力限制，效果仍不理想。

**预期**：升级到32B模型后，配合当前 prompt 改造，建议针对性应有显著提升。如果32B仍不够，需要进一步调整 prompt。

**参考目标**：https://resumeaipro.coze.site/ 的效果

---

### 🟡 P1：3个废弃 API 路由残留

**问题**：`app/api/` 目录下的3个路由（analyze/career/resume）在静态导出模式下完全不可用，但代码仍然存在，容易造成混淆。

**建议**：要么删除，要么在文件顶部加注释说明"静态模式下不可用，仅保留供参考"。

---

### 🟢 P2：无用户系统

**现状**：无登录、无注册、无用户数据持久化。所有分析结果刷新即丢失。

**影响**：用户无法保存历史分析记录，无法跨设备使用。

**建议**：未来版本考虑加入简单登录（如微信扫码）+ localStorage 或云存储。

---

### 🟢 P2：无请求限流

**现状**：任何访客都可以无限触发 AI 分析请求。简历优化官每次触发5个并行请求。

**影响**：如果网站公开传播，API 额度可能被迅速耗尽。

**建议**：前端加简单的频率限制（如每次分析间隔30秒、每天最多3次），后端代理时再加 IP 限流。

---

## 六、各页面详细状态

### 6.1 首页（app/page.tsx）

- **状态**：✅ 正常
- **功能**：展示3个智能体卡片（职业探索官、岗位匹配官、简历优化官），点击跳转
- **注意**：链接使用 `.html` 后缀（适配静态导出），如 `/career-explorer.html`

### 6.2 职业探索官（app/career-explorer/page.tsx）

- **状态**：✅ 正常
- **功能**：30道场景选择题 → 10维评分 → 职业人格标签 + 雷达图 + TOP3岗位推荐
- **技术**：纯本地计算，不调用 AI API，不依赖 clientChatJSON
- **行数**：1465行
- **已知问题**：无

### 6.3 岗位匹配官（app/job-matcher/page.tsx）

- **状态**：⚠️ AI 输出可能因7B模型不可靠
- **功能**：上传简历（PDF/Word/TXT）+ 输入JD → AI 5维度匹配分析
- **5维度**：skill / experience / keyword / industry / education
- **行数**：456行
- **AI调用**：1次 clientChatJSON
- **本地 fallback**：关键词匹配 + 简单评分（AI 失败时使用）

### 6.4 简历优化官（app/resume-optimizer/page.tsx）

- **状态**：⚠️ 核心功能，但AI输出因7B模型不可靠
- **功能**：上传简历 + JD → 5个并行AI请求 → 5个Tab面板展示 + 对话式优化
- **5个AI请求**：
  1. 优化建议（含引导问题）
  2. 优化对比（原文 vs 优化后）
  3. 匹配分析报告
  4. 面试准备问题
  5. 真实性验证报告
- **5个Tab面板**：ATS优化 / 真实性验证 / 匹配分析 / 面试准备 / 优化对比
- **对话式优化**：建议 → 确认修改 → AI引导问答 → 收集真实信息 → 生成优化文本
- **行数**：849行
- **AI调用**：5次 clientChatJSON（并行）+ 对话中额外调用

---

## 七、AI Prompt 架构（简历优化官）

### 5个 Prompt 的核心设计

| # | 功能 | temperature | maxTokens | 核心策略 |
|---|------|-------------|-----------|----------|
| 1 | 优化建议 | 0.2 | 2000 | 8维度框架 + few-shot正反示例 + 强制引用原文 |
| 2 | 优化对比 | 0.2 | 3000 | original一字不改引用简历原文 + optimized用STAR法则 |
| 3 | 匹配分析 | 0.3 | 2500 | 按岗位类型定制5个评分维度 |
| 4 | 面试准备 | 0.3 | 3500 | 每道题必须引用简历具体项目/经历 |
| 5 | 真实性验证 | 0.2 | 2500 | 4种"只质疑"情况 + 绝对禁止质疑清单 |

### 8项核心分析框架

1. 关键词匹配（ATS关键词覆盖率）
2. STAR法则（情境-任务-行动-结果完整性）
3. 量化数据（是否有数字支撑）
4. 动词强度（使用强动词还是弱动词）
5. 胜任力呈现（是否展现JD要求的能力）
6. 结构逻辑（简历模块排列是否合理）
7. ATS友好（格式是否机器可读）
8. 表述合规（是否客观真实无夸大）

---

## 八、Token 消耗估算

| 场景 | 输入 Token | 输出 Token | 总计 |
|------|-----------|-----------|------|
| 简历优化官（5请求并行） | ~6000 | ~4000-6000 | ~10000-12000 |
| 岗位匹配官（1请求） | ~2000 | ~1500 | ~3500 |
| 对话式优化（每轮） | ~2000 | ~1000 | ~3000 |

**费用**：当前使用免费模型（7B/32B均免费），实际费用为0。

---

## 九、部署流程

```bash
# 1. 构建
cd C:\Users\14824\WorkBuddy\2026-06-03-12-40-13
C:\Users\14824\.workbuddy\binaries\node\versions\22.22.2\node.exe out\index.html  # 不对，正确的是：
npx next build

# 2. 后处理（修复静态导出的深层路径问题）
node fix-static.js

# 3. 部署到 CloudStudio
# 使用 workbuddy_cloudstudio_deploy 工具
# directory: C:\Users\14824\WorkBuddy\2026-06-03-12-40-13\out
# entry: index.html
```

---

## 十、修改指南（给接手开发者）

### 最紧急：升级AI模型

1. 打开 `lib/client-ai.ts`
2. 第9行改为：`const DEFAULT_MODEL = "Qwen/Qwen2.5-32B-Instruct";`
3. 构建并重新部署

### 修改 AI Prompt

所有 AI Prompt 都在 `app/resume-optimizer/page.tsx` 中，搜索以下关键词定位：
- `优化建议` → 请求1的 prompt
- `优化对比` → 请求2的 prompt
- `匹配分析` → 请求3的 prompt
- `面试准备` → 请求4的 prompt
- `真实性验证` → 请求5的 prompt
- `对话式优化` → 对话引导的 prompt

岗位匹配官的 prompt 在 `app/job-matcher/page.tsx` 中。

### 添加新页面

1. 在 `app/` 下创建新目录和 `page.tsx`
2. 必须添加 `"use client"` 指令（因为静态导出）
3. 在首页 `app/page.tsx` 添加入口卡片
4. 链接使用 `.html` 后缀（如 `/new-page.html`）

### 修改文件解析

文件解析逻辑在 `lib/pdf-extract.ts`，支持 PDF / .docx / .txt，不支持 .doc 旧格式。

### 修改类型定义

所有类型在 `types/analysis.ts`，修改类型后需同步修改使用该类型的组件。

---

## 十一、安全风险清单

| 风险 | 等级 | 位置 | 说明 |
|------|------|------|------|
| API Key 暴露在前端 | 🔴 高 | `lib/client-ai.ts` 第7行 | 任何人可在 DevTools 看到并盗用 |
| 无用户认证 | 🟡 中 | 全局 | 任何人可无限使用 AI 功能 |
| 无请求限流 | 🟡 中 | 全局 | 可被恶意刷量 |
| 无输入校验 | 🟢 低 | 各页面 | AI 请求仅做非空校验 |
| API 路由残留 | 🟢 低 | `app/api/` | 代码存在但不可用，造成混淆 |
