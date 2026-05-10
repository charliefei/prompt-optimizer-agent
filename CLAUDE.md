# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development

```bash
npm run dev       # Start Next.js dev server
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```

## Environment

Create `.env.local` at the project root with:

| Variable | Default | Required |
|----------|---------|----------|
| `OPENAI_API_KEY` | — | Yes |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | No |
| `OPENAI_MODEL` | `gpt-4o-mini` | No |

## Architecture

This is a **Next.js 15 App Router** application with **LangGraph** that implements a prompt optimization agent. The agent helps users write better AI prompts by matching their task to one of 57 proven prompt engineering frameworks.

### Core Pipeline (LangGraph State Machine)

The agent runs a 6-node state graph defined in `src/lib/agent/graph.ts`:

```
START → analyze → matchFramework → loadFramework → clarify → generate → present → END
                                                       ↑
                                                       └── (if incomplete, pauses for user input)
```

- **analyze** — Extracts task type, complexity, domain, requirements, ambiguities from user input via LLM
- **matchFramework** — Scores all 57 frameworks against the analysis, selects the best match
- **loadFramework** — Loads the full markdown detail of the selected framework
- **clarify** — If ambiguities exist, asks the user 2-3 clarifying questions; repeats until complete or exits early if 0 ambiguities. Uses conditional edge: proceeds to generate when `clarificationComplete` is true, otherwise ends
- **generate** — Fills the framework template with user requirements and collected info to produce an optimized prompt
- **present** — Formats the final result with usage suggestions

State is defined in `src/lib/agent/state.ts` using LangGraph's `Annotation.Root`. Conversation state is persisted across requests via LangGraph's `MemorySaver`.

### Streamed I/O

The `/api/chat` route creates an SSE stream. All nodes receive a `writer` callback in state that pushes typed events (`text`, `framework_recommendation`, `clarification`, `prompt_preview`, `error`) to the frontend. The frontend `useChat` hook reads the SSE stream and appends messages to local state.

When the clarify node sends questions, the agent ends execution. The frontend resumes by sending a new request with the same `threadId` (see Gotchas).

### Framework System

57 frameworks live as markdown files in `prompt-optimizer/references/frameworks/`. Each file follows a consistent structure: `## 概述`, `## 框架构成` (table), `## 详细说明` (H3 sections), `## 优点`, `## 缺点`, `## 最佳实践`.

- `src/lib/frameworks/loader.ts` — Parses the summary table (`Frameworks_Summary.md`) and individual framework markdown files. Both are cached in memory after first read. The summary table format is `| 序号 | 名称 | 应用场景 |`.
- `src/lib/frameworks/user-store.ts` — Persists user-uploaded custom frameworks as JSON files in `data/user-frameworks/`. Uses Node.js `fs` (server-only).
- Framework matching (`src/lib/agent/tools/match-framework-tool.ts`) uses a weighted scoring algorithm: scenario overlap (30pts each), complexity match (20pts), domain match (25pts), task-type keyword match (15pts each).

### LLM Configuration

`src/lib/llm/client.ts` exposes a singleton `ChatOpenAI` instance (see Environment section above for required vars).

### Frontend

- **`/chat`** — Main interface. Sidebar shows conversation threads (stored in localStorage). Messages include typed events beyond plain text: framework recommendations (clickable badges), clarification question lists, and prompt previews.
- **`/frameworks`** — Browse/search all 57 frameworks. Individual framework detail pages at `/frameworks/[id]`.
- **`/upload`** — Upload custom frameworks (markdown format). The backend scores them on structure, clarity, practicality, and originality.
- UI components in `src/components/ui/` are Radix UI primitives wrapped with Tailwind CSS (no shadcn).
- `src/lib/utils.ts` exports `cn()` — a `clsx` + `tailwind-merge` utility for class name merging.
- Path alias `@/*` maps to `./src/*`.

### Important Patterns

- The `prompt-optimizer/` directory also serves as a Claude Code skill (`SKILL.md` in that directory defines the `/prompt-optimizer` slash command).
- Frontend chat state uses `localStorage` with prefix `chat:msg:` for messages and `chat:threads` / `chat:active` for thread metadata.
- The `ThreadMeta.title` is derived from the first user message, truncated to 50 characters.

## Gotchas

- The clarify node pauses the agent and sends questions; the frontend must send a **new HTTP request** with the same `threadId` to resume — LangGraph's `MemorySaver` restores the checkpoint. The user's answer goes in as a new `HumanMessage`.
- User-uploaded frameworks are scored 0-100; the `/api/upload` endpoint rejects those below the threshold (default 60, configurable via `threshold` form field).
- Framework markdown files in `prompt-optimizer/references/frameworks/` must follow a specific structure (`## 概述`, `## 框架构成` as table, `## 详细说明`, `## 优点`, `## 缺点`, `## 最佳实践`) — the parser depends on these exact H2 headings.
- `@langchain/*` packages are listed in `next.config.ts` as `serverExternalPackages` — removing them will break the agent at runtime.
