# Clarify Node: LLM-Generated Options + Custom Answer

**Date:** 2026-05-10
**Status:** Approved

## Overview

Enhance the LangGraph clarify node so that each clarification question includes 2-3 LLM-generated recommended options. Users can click an option to auto-answer, or type a custom response. Questions are presented one at a time (逐题提交).

## Current vs New Flow

```
CURRENT:  clarify → LLM generates N questions → frontend shows list → user types custom answer in main textarea
NEW:      clarify → LLM generates 1 question + 2-3 options → frontend shows card with buttons + custom input → user clicks option or types → auto-resume
```

## Data Model Changes

### State (`src/lib/agent/state.ts`)

Add two fields to `AgentState`:

```typescript
lastQuestion: Annotation<string | null>,    // current round's question text
lastOptions: Annotation<string[] | null>,   // current round's options
```

### Types (`src/types/chat.ts`)

```typescript
// ChatStreamEvent adds:
question?: string;       // single question (new)
options?: string[];      // recommended options (new)
// questions?: string[]  is preserved for backward compat
```

### Clarify Event Payload

```json
{
  "type": "clarification",
  "question": "你希望这个产品描述面向谁？",
  "options": ["C端消费者", "B端企业客户", "投资人"]
}
```

## Backend Changes

### Prompt (`src/lib/agent/prompts/clarify.ts`)

- Rules updated: ask exactly 1 question per round, generate 2-3 specific options
- Output format: `{ complete, question, options[], newInfo }`

### Fallback Options (`src/lib/agent/prompts/fallback-options.ts`)

New file with dimension-based preset options for when LLM parsing fails or returns empty options:

| Dimension | Preset Options |
|-----------|---------------|
| 目标明确性 | 具体可衡量的业务指标, 定性的用户感受, 流程/效率提升 |
| 目标受众 | C端普通用户, 技术专业人士, 管理层/决策者 |
| 格式要求 | 纯文本段落, Markdown格式, 结构化JSON, 分点列表 |
| 风格和语气 | 正式专业, 轻松友好, 技术性, 通俗易懂 |
| 具体示例 | 提供参考样例, 不需要样例, AI自行发挥 |

### Node Logic (`src/lib/agent/nodes/clarify.ts`)

```
1. Round 0 + no ambiguities → skip (unchanged)
2. Call LLM with new prompt → parse { complete, question, options, newInfo }
3. Parse fail or empty options → fallback to dimension presets
4. complete=true → proceed to generate (unchanged)
5. complete=false → writer sends { type:"clarification", question, options }
                   → update lastQuestion, lastOptions, clarificationRound
```

## Frontend Changes

### UI (`src/app/chat/page.tsx`)

The `MessageBubble` clarification branch is rewritten:

```
┌─────────────────────────────────────────┐
│ ⚡ 需要补充一些信息                       │
│                                         │
│ 你希望输出什么格式？                      │
│                                         │
│ [纯文本段落] [Markdown格式] [结构化JSON]  │  ← click to auto-submit
│                                         │
│ ┌─────────────────────────────────┐     │
│ │ 或输入自定义回答...              │     │  ← custom input
│ └─────────────────────────────────┘     │
│ [发送 ✉]                                │  ← only visible when typing
└─────────────────────────────────────────┘
```

**Interaction:**
1. Click option button → calls `sendMessage(optionText)` immediately
2. Type in custom input → send button appears, user edits then sends
3. After sending, the card becomes read-only (shows selected answer)
4. Each answer is a `HumanMessage` sent to `/api/chat` with the same `threadId`

### `useChat` hook

No changes needed. `sendMessage` already handles thread resume via `ensureThread`.

## Edge Cases

| Scenario | Handling |
|----------|----------|
| LLM returns empty options | Fallback to dimension presets |
| LLM JSON parse failure | Fallback to dimension presets; still fails → `complete: true` |
| User types custom answer | Same as existing flow — plain HumanMessage |
| Round 0 has no ambiguities | Skip clarify entirely (unchanged) |
| Page refresh mid-clarification | MemorySaver + localStorage restore state naturally |

## Files Touched

| File | Change |
|------|--------|
| `src/lib/agent/state.ts` | Add `lastQuestion`, `lastOptions` |
| `src/lib/agent/prompts/clarify.ts` | Single-question + options format |
| `src/lib/agent/prompts/fallback-options.ts` | New — dimension presets |
| `src/lib/agent/nodes/clarify.ts` | Parse options, fallback logic, single-question event |
| `src/types/chat.ts` | Add `question?`, `options?` to types |
| `src/app/chat/page.tsx` | Rewrite clarification message rendering |
