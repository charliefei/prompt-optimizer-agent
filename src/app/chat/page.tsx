"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, Copy, Check, RotateCcw, Loader2 } from "lucide-react";
import type { ChatMessage, ChatStreamEvent, ChatDoneEvent } from "@/types/chat";

function MessageBubble({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-primary px-4 py-2.5 text-primary-foreground">
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        </div>
      </div>
    );
  }

  // Assistant message
  if (message.type === "framework_recommendation" && message.framework) {
    return (
      <div className="flex justify-start">
        <Card className="max-w-[80%] border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">推荐框架</span>
            </div>
            <h3 className="font-semibold text-lg mb-1">{message.framework.name}</h3>
            <p className="text-sm text-muted-foreground mb-3">{message.framework.reason}</p>
            {message.content && <p className="text-sm">{message.content}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (message.type === "clarification" && message.questions) {
    return (
      <div className="flex justify-start">
        <Card className="max-w-[85%]">
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-3">我需要了解更多信息：</p>
            <ol className="space-y-2">
              {message.questions.map((q, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Badge variant="secondary" className="mt-0.5 shrink-0">{i + 1}</Badge>
                  <span>{q}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (message.type === "prompt_preview") {
    return (
      <div className="flex justify-start">
        <Card className="max-w-[85%] border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">优化后的提示词</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(message.content)}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="rounded-lg bg-muted p-4 text-sm whitespace-pre-wrap">{message.content}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default text message
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-2xl bg-muted px-4 py-2.5">
        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
      </div>
    </div>
  );
}

function ChatPageContent() {
  const searchParams = useSearchParams();
  const preselectedFramework = searchParams.get("frameworkId");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Add welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          type: "text",
          content: "你好！我是提示词优化助手。告诉我你想要完成什么任务，我会帮你选择最合适的框架并生成优化后的提示词。\n\n你可以描述你的需求，比如：\n- \"帮我写一个营销邮件的提示词\"\n- \"我需要一个用于代码审查的提示词\"\n- \"如何让 AI 帮我做市场分析\"",
          timestamp: Date.now(),
        },
      ]);
    }
  }, [messages.length]);

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      type: "text",
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          threadId: threadId || undefined,
          frameworkId: preselectedFramework ? parseInt(preselectedFramework) : undefined,
        }),
      });

      if (!response.ok) throw new Error("Chat request failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            const event = line.slice(7);
            // Next line should be data
          } else if (line.startsWith("data: ")) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);

              if (parsed.threadId) {
                // This is a done event
                setThreadId(parsed.threadId);
                continue;
              }

              const event = parsed as ChatStreamEvent;
              const assistantMsg: ChatMessage = {
                id: `assistant-${Date.now()}-${Math.random()}`,
                role: "assistant",
                type: event.type,
                content: event.content || "",
                framework: event.framework,
                questions: event.questions,
                timestamp: Date.now(),
              };

              setMessages((prev) => [...prev, assistantMsg]);
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          type: "error",
          content: "抱歉，发生了错误。请检查 API 配置后重试。",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  const resetChat = () => {
    setMessages([]);
    setThreadId(null);
    setInput("");
  };

  return (
    <div className="flex flex-1 flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="font-semibold">提示词优化</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={resetChat}>
          <RotateCcw className="h-4 w-4 mr-1" />
          新对话
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isStreaming && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-muted px-4 py-2.5">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Textarea
            placeholder="描述你的需求，例如：帮我写一个用于产品描述的提示词..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            rows={1}
            className="min-h-[44px] max-h-32 resize-none"
            disabled={isStreaming}
          />
          <Button onClick={sendMessage} disabled={!input.trim() || isStreaming} size="icon" className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <ChatPageContent />
    </Suspense>
  );
}
