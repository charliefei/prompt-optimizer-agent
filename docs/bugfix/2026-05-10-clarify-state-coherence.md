# Bugfix: Clarify Node State Coherence

**Date:** 2026-05-10
**Status:** Fixed

## Overview

A cluster of bugs caused the LangGraph clarify node to lose conversational context, resulting in repeated questions, corrupted state, and unexpected pipeline restarts. The root causes spanned three layers: frontend state hydration, LangGraph state channel semantics, and LLM prompt construction.

---

## Bug 1: Clarify Node Repeated Questions (Context Coherence)

**Commit:** `132b0b6`

**Symptoms:**
- After answering a clarification question, the next question repeated the same topic
- The LLM asked about information that had already been provided
- "正在分析您的需求..." appeared on every clarification round

**Root Cause (3 sub-issues):**

1. **`route.ts` reset state on every invocation** — `phase`, `clarificationRound`, `clarificationComplete`, `collectedInfo` were seeded in `input` unconditionally, overwriting checkpointed values on continuation calls.

2. **`analyze.ts` regenerated analysis from short answers** — The analyze node always processed `messages[last]`, which during clarification is the user's brief answer (e.g., "Node.js + TypeScript"), producing garbage analysis with wrong ambiguities.

3. **`clarify.ts` fed only the last message to LLM** — The prompt used `messages[last]` as "用户原始需求" instead of `messages[0]` (the actual original request). No Q&A history was passed to the LLM.

**Fix:**
- `route.ts`: Only seed initialization fields when `!threadId` (new conversation)
- `analyze.ts`: Early-return `{ phase: "match_framework" }` when `clarificationRound > 0 && state.analysis`
- `clarify.ts`: Use `messages[0]` as original request; build Q&A history from `clarificationHistory`; include both in LLM prompt under `## 历史问答` section

**Files changed:** `route.ts`, `analyze.ts`, `clarify.ts`, `generate.ts`, `state.ts`

---

## Bug 2: `clarificationHistory` Concatenation Duplication

**Symptoms:**
- Q&A history grew with duplicate entries each round
- Round 1: `[{Q1, A1}]` — correct
- Round 2: `[{Q1, A1}, {Q1, A1}, {Q2, A2}]` — Q1 duplicated
- Round 3: 4 copies of Q1, 2 copies of Q2, 1 copy of Q3

**Root Cause:**
`clarificationHistory` uses a concatenating reducer (`(x, y) => x.concat(y)`), but the clarify node returned the **full** `qaHistory` array (all accumulated pairs) instead of only the **new** pair. Each round, the reducer appended the full history to the existing state:

```
Existing:  [{Q1, A1}]
Returned:  [{Q1, A1}, {Q2, A2}]    // full qaHistory
Reducer:   [{Q1, A1}] + [{Q1, A1}, {Q2, A2}] = [{Q1, A1}, {Q1, A1}, {Q2, A2}]
```

**Fix:**
Return only the newly recorded Q&A pair (`newQAPair`, a single-element array) in `clarificationHistory`. Keep the local `qaHistory` variable for building the LLM prompt (which needs the full history).

**Files changed:** `src/lib/agent/nodes/clarify.ts` (lines 30-41, and all 3 return paths)

**Key lesson:** When using concatenating reducers, nodes must return ONLY the delta, not the accumulated value. This is the same pattern as the `messages` channel.

---

## Bug 3: `activeThreadId` Lost on Page Remount

**Symptoms:**
- Continuing a conversation after page refresh or tab switch triggered the full pipeline (analyze → match → framework) instead of continuing clarification
- The agent asked redundant questions as if it were a new conversation

**Root Cause:**
`useState<string | null>(null)` always initialized `activeThreadId` to `null`, even when `ACTIVE_KEY` existed in localStorage. Meanwhile, `messages` were correctly loaded from localStorage using `ACTIVE_KEY`.

When the component remounted (navigation, HMR, browser tab switch):
1. `activeThreadId` = `null`
2. `messages` = loaded from localStorage (showing the existing conversation)
3. User sends follow-up → `ensureThread()` sees `activeThreadRef.current` is null
4. A **new** `threadId` is generated
5. Backend receives new `threadId` → MemorySaver has no checkpoint → full pipeline from scratch

**Fix:**
Restore `activeThreadId` from `localStorage.getItem(ACTIVE_KEY)` in the `useState` initializer, matching the pattern already used for `messages`.

**Files changed:** `src/hooks/use-chat.ts` (line 71)

---

## Bug 4: TypeError — `collectedInfo` Undefined

**Commit:** `3d094b5`

**Symptoms:**
- `TypeError: Cannot convert undefined or null to object` at `Object.entries(state.collectedInfo)`

**Root Cause:**
`MemorySaver` is an in-memory checkpointer. When the dev server restarts (or HMR recompiles the module), all checkpoints are lost. If the client sends a stale `threadId` after restart, `route.ts` treats it as a continuation (doesn't seed `collectedInfo`), but the empty checkpoint has `collectedInfo: undefined`.

**Fix:**
Add `const safeCollectedInfo = state.collectedInfo || {}` guard at the top of `clarifyNode` and use it in all 4 locations where `collectedInfo` was accessed.

**Files changed:** `src/lib/agent/nodes/clarify.ts`

---

## Bug 5: Sidebar Hydration Mismatch

**Commit:** `270b658`

**Symptoms:**
- React hydration error: "Expected server HTML to contain a matching `<div>`"
- Sidebar collapse state rendered different HTML on server vs client

**Root Cause:**
`useState(() => localStorage.getItem(...) === 'true')` read `localStorage` inside the initializer function. In Next.js, the initializer still runs during SSR (despite being wrapped in a function), producing different values server-side vs client-side.

**Fix:**
Always initialize `sidebarCollapsed` to `false` (server-safe default), then sync from `localStorage` in a `useEffect` after mount.

**Files changed:** `src/app/chat/page.tsx`

---

## Prevention Notes

1. **Concatenating reducers require delta returns** — When a state channel uses `reducer: (x, y) => x.concat(y)`, each node must return only the NEW items, not the accumulated collection. Confusing this with `LastValue` semantics causes silent duplication.

2. **MemorySaver is ephemeral** — The in-memory checkpointer loses all state on process restart or module recompilation. For production, consider `SqliteSaver` or `AsyncPostgresSaver`. Until then, the backend and frontend must handle the "empty checkpoint" case gracefully.

3. **SSR-safe state initialization** — Any `useState` initializer that reads browser APIs (`localStorage`, `sessionStorage`, `window`) must use a server-safe fallback and sync in `useEffect`. Next.js runs initializers during SSR regardless of whether they're wrapped in functions.

4. **LangGraph channel semantics** — `Annotation<T>` without a custom reducer is `LastValue` (overwrite). `Annotation<T>({ reducer })` with a custom reducer merges. When in doubt, check whether the channel uses `LastValue` or a custom reducer before deciding what to return from a node.
