import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getLLM } from "@/lib/llm/client";
import { PRESENT_SYSTEM_PROMPT } from "../prompts/present";
import { log, logLLMInput, logLLMOutput, logState } from "../logging";
import type { FrameworkMatch } from "../state";
import { getWriter, type AgentRunnableConfig } from "../runtime";

export async function presentNode(state: {
  selectedFramework: FrameworkMatch | null;
  optimizedPrompt: string | null;
  collectedInfo: Record<string, string>;
}, config?: AgentRunnableConfig) {
  const llm = getLLM();
  const writer = getWriter(config);

  logState("present", {
    hasOptimizedPrompt: state.optimizedPrompt !== null,
    promptLen: state.optimizedPrompt?.length ?? 0,
    frameworkName: state.selectedFramework?.name || null,
    collectedInfoKeys: Object.keys(state.collectedInfo || {}).length,
  });

  if (!state.optimizedPrompt) {
    log("present", "No optimized prompt, showing error → done");
    writer?.({
      type: "text",
      content: "未能生成提示词，请重新描述您的需求。",
    });
    return { phase: "done" };
  }

  const collectedInfoStr = Object.entries(state.collectedInfo)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n");

  const humanContent = `## 使用的框架\n\n${state.selectedFramework?.name || "未知"}\n\n## 优化后的提示词\n\n${state.optimizedPrompt}\n\n## 收集到的信息\n\n${collectedInfoStr || "无"}\n\n请向用户展示结果并给出使用建议。`;

  logLLMInput("present", PRESENT_SYSTEM_PROMPT, humanContent);

  const response = await llm.invoke([
    new SystemMessage(PRESENT_SYSTEM_PROMPT),
    new HumanMessage(humanContent),
  ]);

  const presentation = typeof response.content === "string" ? response.content : String(response.content);
  logLLMOutput("present", presentation);

  writer?.({
    type: "text",
    content: presentation,
  });

  log("present", `Presentation complete (${presentation.length} chars) → done`);
  return { phase: "done" };
}
