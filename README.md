# 提示词优化器 — AI Prompt Optimizer

基于 **Next.js 15 + LangGraph** 构建的智能提示词优化助手。通过 57 种经过验证的提示工程框架，自动分析用户需求、匹配最佳框架、消除歧义并生成高质量优化提示词。同时可作为 Claude Code 的 `/prompt-optimizer` 技能使用。

## 功能特性

- **智能框架匹配** — 输入任务描述，Agent 自动分析任务类型、复杂度和领域，从 57 个框架中匹配最佳方案
- **交互式澄清** — 对模糊需求主动提问 2-3 个关键问题，确保提示词精准契合目标
- **实时流式输出** — 基于 SSE 的流式响应，逐步展示分析、匹配和生成过程
- **框架知识库** — 浏览、搜索全部 57 个框架的详细文档，包含构成要素、优缺点和最佳实践
- **自定义框架上传** — 支持上传 markdown 格式的个人框架，自动评分与集成
- **对话历史管理** — 多会话支持，本地存储会话记录

## 技术栈

| 类型 | 技术 |
|------|------|
| 框架 | Next.js 15 (App Router) + React 19 + TypeScript |
| AI 编排 | LangGraph (StateGraph + MemorySaver) |
| LLM | OpenAI API（兼容任意 OpenAI 格式接口） |
| 样式 | Tailwind CSS 4 + Radix UI |
| 解析 | marked + Zod |

## 快速开始

### 环境要求

- Node.js 18+
- OpenAI API Key（或其他兼容 API）

### 安装与运行

```bash
# 1. 安装依赖
npm install

# 2. 创建 .env.local 并填入配置（参见下方环境变量表）

# 3. 启动开发服务器
npm run dev

# 4. 打开浏览器访问 http://localhost:3000
```

### 环境变量

| 变量 | 默认值 | 必填 | 说明 |
|------|--------|------|------|
| `OPENAI_API_KEY` | — | ✅ | API 密钥 |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | ❌ | 兼容 OpenAI 格式的 API 地址 |
| `OPENAI_MODEL` | `gpt-4o-mini` | ❌ | 使用的模型名称 |

## 项目架构

### Agent 管道（LangGraph 状态图）

```
START → analyze → matchFramework → loadFramework → clarify → generate → present → END
                                                       ↑
                                                       └── 信息不足时暂停，等待用户输入后继续
```

| 节点 | 职责 |
|------|------|
| **analyze** | 提取任务类型、复杂度、领域、关键需求、歧义点 |
| **matchFramework** | 对 57 个框架加权评分，选择最佳匹配 |
| **loadFramework** | 加载选中框架的完整 markdown 文档 |
| **clarify** | 若存在歧义，生成 2-3 个澄清问题；无歧义则跳过 |
| **generate** | 填充框架模板，生成优化后的提示词 |
| **present** | 格式化最终结果，附带使用建议 |

### 框架匹配算法

加权评分机制（`match-framework-tool.ts`）：

- 场景重叠：每个匹配 +30 分
- 复杂度匹配：+20 分
- 领域匹配：+25 分
- 任务类型关键词匹配：每个 +15 分

> **添加新框架**：在 `prompt-optimizer/references/frameworks/` 中创建 `{NN}_Name_Framework.md`（遵循 `## 概述`、`## 框架构成`、`## 详细说明`、`## 优点`、`## 缺点`、`## 最佳实践` 结构），然后在 `Frameworks_Summary.md` 中新增对应行即可。

### 页面路由

| 路由 | 说明 |
|------|------|
| `/` | 自动重定向到 `/chat` |
| `/chat` | 主界面——与 Agent 对话，逐步优化提示词 |
| `/frameworks` | 浏览全部 57 个框架，支持搜索过滤 |
| `/frameworks/[id]` | 框架详情页，含构成要素、优缺点、示例 |
| `/upload` | 上传自定义框架（markdown 格式） |

### API 路由

| 路由 | 说明 |
|------|------|
| `POST /api/chat` | SSE 流式接口，驱动 Agent 对话 |
| `GET /api/frameworks` | 获取框架列表 |
| `GET /api/frameworks/[id]` | 获取单个框架详情 |
| `POST /api/upload` | 上传自定义框架并评分 |

## 项目结构

```
prompt-optimizer-agent/
├── src/
│   ├── app/                        # Next.js App Router 页面
│   │   ├── api/chat/route.ts       # SSE 聊天接口
│   │   ├── api/frameworks/         # 框架查询 API
│   │   ├── api/upload/route.ts     # 框架上传 API
│   │   ├── chat/page.tsx           # 主聊天页面
│   │   ├── frameworks/             # 框架浏览页面
│   │   └── upload/page.tsx         # 上传页面
│   ├── components/ui/              # Radix UI 组件封装
│   ├── hooks/                      # useChat、useFrameworks
│   ├── types/                      # TypeScript 类型定义
│   └── lib/
│       ├── agent/
│       │   ├── graph.ts            # 状态图定义（含 loadFramework 内联节点）
│       │   ├── state.ts            # 状态结构（Annotation.Root）
│       │   ├── logging.ts          # 结构化日志工具
│       │   ├── nodes/              # 5 个节点实现
│       │   ├── tools/              # 框架评分与匹配工具
│       │   └── prompts/            # 各节点的 LLM 提示词
│       ├── frameworks/
│       │   ├── loader.ts           # 框架文件解析与缓存
│       │   └── user-store.ts       # 自定义框架持久化
│       ├── llm/client.ts           # LLM 客户端单例
│       └── utils.ts                # cn() 工具函数
├── prompt-optimizer/               # Claude Code 技能模块
│   ├── SKILL.md                    # 技能定义
│   └── references/frameworks/      # 57 个框架 markdown 文档（中文）
├── docs/bugfix/                    # Bug 修复记录
├── data/user-frameworks/           # 用户上传的自定义框架存储
├── next.config.ts
├── postcss.config.mjs
└── package.json
```

## LangGraph 架构要点

- 状态通过 `Annotation.Root` 定义，使用 `MemorySaver` 做检查点持久化
- **澄清节点暂停执行**：`clarify` 节点发送问题后结束执行，前端发送携带相同 `threadId` 的新请求恢复
- 所有节点通过 `writer` 回调推送 SSE 事件（`text`、`framework_recommendation`、`clarification`、`prompt_preview`、`error`）
- 所有节点使用 `[Agent:<node>]` 前缀的结构化日志，可通过 `grep` 过滤调试
- `@langchain/*` 包在 `next.config.ts` 中配置为 `serverExternalPackages`，避免被 webpack 打包

## 作为 Claude Code 技能使用

本项目同时是一个 Claude Code 技能。在 Claude Code 中直接输入 `/prompt-optimizer` 即可触发，Agent 将按照 SKILL.md 中定义的 6 步流程手动执行框架匹配和提示词优化。
