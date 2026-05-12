# Bugfix: LangGraph Run Lifecycle & Runtime Writer

**Date:** 2026-05-12
**Status:** Fixed

## Overview

A review of the `/api/chat` execution chain found that browser chat threads were being treated as one long-lived LangGraph checkpoint. This worked for clarification answers, but broke when the user sent a new optimization request in the same chat. The fix separates frontend chat history from backend agent run state, and moves streaming callbacks out of checkpointed state.

---

## Bug 1: New Requests in the Same Chat Reused Old Agent State

**Symptoms:**
- After one prompt optimization finished, sending a new request in the same chat reused the old checkpoint
- The new request could keep the previous `analysis`, `selectedFramework`, `frameworkDetail`, and `clarificationComplete`
- `clarify.ts` and `generate.ts` used `messages[0]` as the original request, so a later task could generate from the first task's message
- Framework matching could be skipped because `selectedFramework` already existed

**Root Cause:**

The frontend keeps one `activeThreadId` for a visible chat conversation and reuses it for every message in that chat. The backend used that same ID as LangGraph's `thread_id`, so all tasks in one chat shared the same `MemorySaver` checkpoint.

The previous route-level guard tracked initialized frontend threads:

```typescript
const initializedThreads = new Set<string>();
const isNew = !initializedThreads.has(tid);
```

That only distinguished first request vs continuation for a browser thread. It did not distinguish a clarification answer from a new task after completion.

**Fix:**

Replace `initializedThreads` with a `threadRuns` map:

```typescript
const threadRuns = new Map<string, { runId: string; awaitingClarification: boolean }>();
```

The backend now creates a separate LangGraph `runId` for each optimization task. It only reuses that `runId` while the previous graph result is waiting for clarification:

```typescript
const awaitingClarification =
  result.phase === "clarify" && result.clarificationComplete === false;

if (awaitingClarification) {
  threadRuns.set(tid, { runId, awaitingClarification: true });
} else {
  threadRuns.delete(tid);
}
```

This keeps frontend chat history intact while isolating LangGraph checkpoints per optimization run.

**Files changed:** `src/app/api/chat/route.ts`

---

## Bug 2: `clarificationComplete` Could Stay `true` on a New Question

**Symptoms:**
- The clarify node could send a clarification card but the graph still routed to `generate`
- This was possible when stale state had `clarificationComplete: true`

**Root Cause:**

When `clarifyNode` asked another question, it returned `clarificationRound`, `collectedInfo`, `lastQuestion`, and `lastOptions`, but did not explicitly return `clarificationComplete: false`.

Because `clarificationComplete` is a `LastValue` channel, any previous `true` value remained active unless overwritten.

**Fix:**

Every "ask another question" return path now explicitly writes:

```typescript
clarificationComplete: false
```

Completion paths also clear stale question state:

```typescript
lastQuestion: null,
lastOptions: null,
```

**Files changed:** `src/lib/agent/nodes/clarify.ts`

---

## Bug 3: Streaming `writer` Was Stored in Checkpointed State

**Symptoms:**
- `writer` was declared as a LangGraph state channel even though it is a function
- `MemorySaver` serializes checkpoints as JSON, so function values are dropped
- Streaming worked only because each HTTP request rewrote `writer` into graph input

**Root Cause:**

LangGraph state is checkpointed and should remain serializable. `writer` is a request-scoped runtime callback, not durable agent state.

**Fix:**

Remove `writer` from `AgentState` and pass it through LangGraph runtime config:

```typescript
configurable: {
  thread_id: runId,
  agentWriter: writer,
}
```

Add `src/lib/agent/runtime.ts`:

```typescript
export function getWriter(config?: AgentRunnableConfig): AgentWriter | undefined {
  return config?.configurable?.agentWriter;
}
```

All nodes now call `getWriter(config)` instead of `state.writer`.

**Files changed:** `state.ts`, `runtime.ts`, `graph.ts`, all active node files

---

## Bug 4: Framework Detail Error Path Did Not Stream an Error

**Symptoms:**
- If `generateNode` could not load framework markdown, it returned an error in `optimizedPrompt`
- The user received no explicit streamed error event from the failing node

**Root Cause:**

The early return path in `generateNode` logged the error but did not call the writer before returning.

**Fix:**

The error path now streams:

```typescript
writer?.({
  type: "error",
  content: "无法加载框架详情，请重试。",
});
```

**Files changed:** `src/lib/agent/nodes/generate.ts`

---

## Verification

```bash
npx tsc --noEmit
npm run build
```

Both passed.

Note: the first `npm run build` attempt inside the sandbox failed because `next/font` could not fetch Google Fonts. After allowing network access, the production build completed successfully.

`npm run lint` still enters Next.js's first-run ESLint configuration prompt, so it is not currently usable as a non-interactive verification command until ESLint config is added.

---

## Prevention Notes

1. **Frontend thread IDs are not always LangGraph run IDs** — A visible chat conversation can contain multiple independent tasks. Use a separate backend run ID when checkpointed agent state should not span the entire chat history.

2. **Resume only when the graph is actually waiting for input** — For this app, reuse a checkpoint only when `phase === "clarify"` and `clarificationComplete === false`.

3. **Runtime callbacks do not belong in checkpointed state** — Functions, streams, controllers, and request-scoped callbacks should be passed through runtime config or another non-persistent mechanism.

4. **Overwrite boolean state deliberately** — `Annotation<T>` without a reducer is `LastValue`. If a branch depends on a boolean, every relevant path should write the intended value explicitly.

5. **Keep reducer semantics in mind** — `messages` and `clarificationHistory` concatenate deltas. Avoid using those channels as task reset boundaries; isolate runs instead.
