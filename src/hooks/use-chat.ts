"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ChatMessage, ChatStreamEvent } from "@/types/chat";

const MSG_PREFIX = "chat:msg:";
const THREADS_KEY = "chat:threads";
const ACTIVE_KEY = "chat:active";

export interface ThreadMeta {
  threadId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  type: "text",
  content:
    "你好！我是提示词优化助手。告诉我你想要完成什么任务，我会帮你选择最合适的框架并生成优化后的提示词。\n\n你可以描述你的需求，比如：\n- \"帮我写一个营销邮件的提示词\"\n- \"我需要一个用于代码审查的提示词\"\n- \"如何让 AI 帮我做市场分析\"",
  timestamp: Date.now(),
};

function loadThreads(): ThreadMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(THREADS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveThreads(threads: ThreadMeta[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
  } catch { /* quota exceeded */ }
}

function loadMessages(threadId: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MSG_PREFIX + threadId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMessages(threadId: string, messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  // Never persist just the welcome message
  if (messages.length === 1 && messages[0].id === "welcome") return;
  try {
    localStorage.setItem(MSG_PREFIX + threadId, JSON.stringify(messages));
  } catch { /* quota exceeded */ }
}

function deleteMessages(threadId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(MSG_PREFIX + threadId);
  } catch {}
}

export function useChat() {
  const [threads, setThreads] = useState<ThreadMeta[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACTIVE_KEY);
  });
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === "undefined") return [{ ...WELCOME, timestamp: Date.now() }];
    const activeId = localStorage.getItem(ACTIVE_KEY);
    if (activeId) {
      const stored = loadMessages(activeId);
      if (stored.length > 0 && stored[0].id !== "welcome") return stored;
    }
    return [{ ...WELCOME, timestamp: Date.now() }];
  });
  const [isStreaming, setIsStreaming] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeThreadRef = useRef(activeThreadId);
  const messagesRef = useRef(messages);
  const isStreamingRef = useRef(false);
  activeThreadRef.current = activeThreadId;
  messagesRef.current = messages;

  // Load thread list on mount
  useEffect(() => {
    setThreads(loadThreads());
  }, []);

  // Persist active thread ID
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeThreadId) {
      localStorage.setItem(ACTIVE_KEY, activeThreadId);
    } else {
      localStorage.removeItem(ACTIVE_KEY);
    }
  }, [activeThreadId]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const ensureThread = useCallback(
    (title: string): string => {
      if (activeThreadRef.current) return activeThreadRef.current;
      const id = crypto.randomUUID();
      setActiveThreadId(id);
      const newThread: ThreadMeta = {
        threadId: id,
        title: title.slice(0, 50),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setThreads((prev) => {
        const next = [newThread, ...prev];
        saveThreads(next);
        return next;
      });
      return id;
    },
    []
  );

  const sendMessage = useCallback(
    async (content: string, preselectedFramework?: string) => {
      if (!content.trim() || isStreamingRef.current) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        type: "text",
        content: content.trim(),
        timestamp: Date.now(),
      };

      const accumulated = [...messagesRef.current, userMsg];
      setMessages(accumulated);
      setIsStreaming(true);
      isStreamingRef.current = true;

      const tid = ensureThread(content.trim());

      // Update thread title metadata
      setThreads((prev) => {
        const next = prev.map((t) =>
          t.threadId === tid ? { ...t, updatedAt: Date.now(), title: content.trim().slice(0, 50) } : t
        );
        saveThreads(next);
        return next;
      });

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userMsg.content,
            threadId: tid,
            frameworkId: preselectedFramework ? parseInt(preselectedFramework) : undefined,
          }),
        });

        if (!response.ok) throw new Error("Chat request failed");

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        let buffer = "";
        // Track new assistant messages for batch persistence after streaming
        const assistantMsgs: ChatMessage[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("event: ")) continue;
            if (!line.startsWith("data: ")) continue;

            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);

              if (parsed.threadId) continue; // done event

              const event = parsed as ChatStreamEvent;
              const assistantMsg: ChatMessage = {
                id: `assistant-${Date.now()}-${Math.random()}`,
                role: "assistant",
                type: event.type,
                content: event.content || "",
                framework: event.framework,
                question: event.question,
                options: event.options,
                questions: event.questions,
                timestamp: Date.now(),
              };

              assistantMsgs.push(assistantMsg);
              setMessages((prev) => [...prev, assistantMsg]);
            } catch {
              // skip malformed JSON
            }
          }
        }

        // Persist final state after streaming completes
        const finalMessages = [...accumulated, ...assistantMsgs];
        saveMessages(tid, finalMessages);
      } catch {
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          role: "assistant",
          type: "error",
          content: "抱歉，发生了错误。请检查 API 配置后重试。",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        saveMessages(tid, [...accumulated, errorMsg]);
      } finally {
        setIsStreaming(false);
        isStreamingRef.current = false;
      }
    },
    [ensureThread]
  );

  const startNewThread = useCallback(() => {
    setActiveThreadId(null);
    setMessages([{ ...WELCOME, timestamp: Date.now() }]);
  }, []);

  const switchThread = useCallback((threadId: string) => {
    const stored = loadMessages(threadId);
    if (stored.length > 0) {
      setActiveThreadId(threadId);
      setMessages(stored);
    }
  }, []);

  const deleteThread = useCallback(
    (threadId: string) => {
      deleteMessages(threadId);
      setThreads((prev) => {
        const next = prev.filter((t) => t.threadId !== threadId);
        saveThreads(next);
        return next;
      });
      if (activeThreadId === threadId || activeThreadRef.current === threadId) {
        setActiveThreadId(null);
        setMessages([{ ...WELCOME, timestamp: Date.now() }]);
      }
    },
    [activeThreadId]
  );

  // Persist on page unload as safety net
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleUnload = () => {
      const tid = activeThreadRef.current;
      if (tid) {
        saveMessages(tid, messagesRef.current);
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  return {
    messages,
    isStreaming,
    activeThreadId,
    threads,
    messagesEndRef,
    sendMessage,
    startNewThread,
    switchThread,
    deleteThread,
  };
}
