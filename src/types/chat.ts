export type MessageType =
  | "text"
  | "framework_recommendation"
  | "clarification"
  | "prompt_preview"
  | "error";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  type: MessageType;
  content: string;
  framework?: {
    id: number;
    name: string;
    reason: string;
  };
  questions?: string[];
  timestamp: number;
}

export interface ChatState {
  messages: ChatMessage[];
  threadId: string | null;
  phase: string;
  isStreaming: boolean;
}

export interface ChatRequest {
  message: string;
  threadId?: string;
  frameworkId?: number;
}

export interface ChatDoneEvent {
  threadId: string;
  phase: string;
}

export interface ChatStreamEvent {
  type: MessageType;
  content?: string;
  framework?: { id: number; name: string; reason: string };
  questions?: string[];
}
