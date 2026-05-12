import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

export interface Analysis {
  taskType: string;
  complexity: "simple" | "medium" | "complex";
  domain: string;
  keyRequirements: string[];
  ambiguities: string[];
}

export interface FrameworkMatch {
  id: number;
  name: string;
  reason: string;
}

export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
  phase: Annotation<string>,
  analysis: Annotation<Analysis | null>,
  selectedFramework: Annotation<FrameworkMatch | null>,
  frameworkDetail: Annotation<string | null>,
  clarificationRound: Annotation<number>,
  clarificationComplete: Annotation<boolean>,
  collectedInfo: Annotation<Record<string, string>>,
  clarificationHistory: Annotation<Array<{question: string; answer: string}>>({
    reducer: (x, y) => x.concat(y),
  }),
  lastQuestion: Annotation<string | null>,
  lastOptions: Annotation<string[] | null>,
  optimizedPrompt: Annotation<string | null>,
});
