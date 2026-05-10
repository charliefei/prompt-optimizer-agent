"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { ConversationList } from "@/components/chat/conversation-list";
import { Sparkles, Send, Copy, Check, RotateCcw, Loader2, History } from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import type { ChatMessage, ChatStreamEvent } from "@/types/chat";

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

  const {
    messages,
    isStreaming,
    activeThreadId,
    threads,
    messagesEndRef,
    sendMessage,
    startNewThread,
    switchThread,
    deleteThread,
  } = useChat();

  const [input, setInput] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim(), preselectedFramework || undefined);
    setInput("");
  };

  return (
    <div className="flex flex-1 flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" title="对话历史">
                <History className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">对话历史</SheetTitle>
              <ConversationList
                threads={threads}
                activeThreadId={activeThreadId}
                onSelect={(id) => {
                  switchThread(id);
                  setHistoryOpen(false);
                }}
                onDelete={deleteThread}
                onNew={() => {
                  startNewThread();
                  setHistoryOpen(false);
                }}
              />
            </SheetContent>
          </Sheet>
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="font-semibold">提示词优化</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={startNewThread}>
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
                handleSend();
              }
            }}
            rows={1}
            className="min-h-[44px] max-h-32 resize-none"
            disabled={isStreaming}
          />
          <Button onClick={handleSend} disabled={!input.trim() || isStreaming} size="icon" className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
