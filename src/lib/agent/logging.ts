// Shared logging helpers for agent graph nodes.
// Uses console.log with a structured [Agent:<node>] prefix for easy grep/filter.

const TAG = "Agent";

export function log(node: string, message: string) {
  console.log(`[${TAG}:${node}] ${message}`);
}

export function logError(node: string, message: string) {
  console.error(`[${TAG}:${node}] ERROR: ${message}`);
}

/** Log structured LLM input: system prompt preview + human message section headers. */
export function logLLMInput(node: string, systemPrompt: string, humanContent: string) {
  const systemPreview = systemPrompt.replace(/\n/g, " ").slice(0, 150);
  const sections = humanContent.match(/##\s+(.+?)(?=\n|$)/g)?.map((s) => s.replace(/^##\s+/, "")) || [];
  const sectionList = sections.join(" → ");
  console.log(
    `[${TAG}:${node}] LLM Input → system(${systemPrompt.length}c): "${systemPreview}..." | human(${humanContent.length}c): [${sectionList}]`
  );
}

/** Log LLM output with sensible truncation. */
export function logLLMOutput(node: string, content: string) {
  const preview = content.length > 400 ? content.slice(0, 400) + "..." : content;
  console.log(`[${TAG}:${node}] LLM Output ← (${content.length}c) ${preview}`);
}

/** Log key state fields compactly. */
export function logState(node: string, fields: Record<string, unknown>) {
  const parts = Object.entries(fields)
    .map(([k, v]) => {
      if (v === undefined || v === null) return `${k}=${v}`;
      if (typeof v === "string") return `${k}="${truncate(v)}"`;
      if (typeof v === "boolean") return `${k}=${v}`;
      if (typeof v === "number") return `${k}=${v}`;
      if (Array.isArray(v)) return `${k}=[${v.length} items]`;
      if (typeof v === "object") return `${k}={...}`;
      return `${k}=${v}`;
    })
    .join(", ");
  console.log(`[${TAG}:${node}] State: ${parts}`);
}

export function truncate(str: string, maxLen = 120): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "...";
}
