import type { RunnableConfig } from "@langchain/core/runnables";

export type AgentWriter = (data: unknown) => void;

export type AgentRunnableConfig = RunnableConfig<{
  thread_id?: string;
  agentWriter?: AgentWriter;
}>;

export function getWriter(config?: AgentRunnableConfig): AgentWriter | undefined {
  return config?.configurable?.agentWriter;
}
