"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { ConversationList } from "@/components/chat/conversation-list";
import {
  Sparkles,
  Send,
  Copy,
  Check,
  RotateCcw,
  Loader2,
  History,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  MessageSquare,
} from "lucide-react";
import { useChat, type ThreadMeta } from "@/hooks/use-chat";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/chat";

/* ═════════════════════════════════════════════════════════
   Typing Indicator
   ═════════════════════════════════════════════════════════ */
function TypingIndicator() {
  return (
    <div className="flex justify-start animate-fade-in-up">
      <div className="flex items-center gap-1.5 rounded-2xl bg-muted px-4 py-3">
        <span
          className="h-2 w-2 rounded-full bg-foreground/30 animate-typing-dot"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="h-2 w-2 rounded-full bg-foreground/30 animate-typing-dot"
          style={{ animationDelay: "200ms" }}
        />
        <span
          className="h-2 w-2 rounded-full bg-foreground/30 animate-typing-dot"
          style={{ animationDelay: "400ms" }}
        />
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   Clarification Card
   ═════════════════════════════════════════════════════════ */
function ClarificationCard({
  question,
  options,
  onAnswer,
  disabled,
}: {
  question: string;
  options: string[];
  onAnswer: (answer: string) => void;
  disabled: boolean;
}) {
  const [customInput, setCustomInput] = useState("");
  const [answered, setAnswered] = useState(false);

  const handleOptionClick = (option: string) => {
    if (answered || disabled) return;
    setAnswered(true);
    onAnswer(option);
  };

  const handleCustomSend = () => {
    const text = customInput.trim();
    if (!text || answered || disabled) return;
    setAnswered(true);
    onAnswer(text);
  };

  return (
    <div className="flex justify-start animate-fade-in-up">
      <Card className="max-w-[85%] shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <ChevronDown className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-medium">需要补充一些信息</p>
          </div>
          <p className="text-sm font-medium mb-3 leading-relaxed">{question}</p>

          {!answered && (
            <>
              {options.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleOptionClick(opt)}
                      disabled={disabled}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium
                        bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20
                        transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2 items-end">
                <div className="flex-1 relative">
                  <Textarea
                    placeholder="或输入自定义回答..."
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleCustomSend();
                      }
                    }}
                    rows={1}
                    className="min-h-[38px] max-h-24 resize-none rounded-lg pr-3 border-border/60 bg-muted/50 text-sm"
                    disabled={disabled}
                  />
                </div>
                {customInput.trim() && (
                  <Button
                    onClick={handleCustomSend}
                    disabled={disabled}
                    size="sm"
                    className="h-[38px] shrink-0 rounded-lg"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </>
          )}

          {answered && (
            <p className="text-xs text-muted-foreground mt-1">已收到回答 ✓</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   Message Bubble
   ═════════════════════════════════════════════════════════ */
function MessageBubble({
  message,
  onClarifyAnswer,
  isStreaming,
}: {
  message: ChatMessage;
  onClarifyAnswer?: (answer: string) => void;
  isStreaming?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (message.role === "user") {
    return (
      <div className="flex justify-end animate-fade-in-up">
        <div className="max-w-[75%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-primary-foreground shadow-sm">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  if (message.type === "framework_recommendation" && message.framework) {
    return (
      <div className="flex justify-start animate-fade-in-up">
        <Card className="max-w-[80%] overflow-hidden border-l-[3px] border-l-primary shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                推荐框架
              </span>
            </div>
            <h3 className="font-semibold text-base mb-1.5">
              {message.framework.name}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              {message.framework.reason}
            </p>
            {message.content && (
              <p className="text-sm text-foreground/80">{message.content}</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (message.type === "clarification" && message.question) {
    return (
      <ClarificationCard
        question={message.question}
        options={message.options || []}
        onAnswer={(answer) => onClarifyAnswer?.(answer)}
        disabled={isStreaming ?? false}
      />
    );
  }

  if (message.type === "clarification" && message.questions) {
    return (
      <div className="flex justify-start animate-fade-in-up">
        <Card className="max-w-[85%] shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <ChevronDown className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-medium">需要补充一些信息</p>
            </div>
            <ol className="space-y-2.5">
              {message.questions.map((q, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed pt-px">{q}</span>
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
      <div className="flex justify-start animate-fade-in-up">
        <Card className="max-w-[85%] overflow-hidden border-emerald-200 dark:border-emerald-800 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-900/40">
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-medium">优化后的提示词</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(message.content)}
                className="h-7 text-xs gap-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-500" /> 已复制
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> 复制
                  </>
                )}
              </Button>
            </div>
            <div className="rounded-lg bg-muted/70 p-4 text-sm leading-relaxed whitespace-pre-wrap font-mono text-foreground/85 border border-border/50">
              {message.content}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-start animate-fade-in-up">
      <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-muted px-4 py-3">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
          {message.content}
        </p>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   Welcome Screen
   ═════════════════════════════════════════════════════════ */
function WelcomeScreen({ onSend }: { onSend: (msg: string) => void }) {
  const suggestions = [
    {
      title: "产品描述优化",
      desc: "帮我写一个用于电商产品描述的提示词",
      icon: "📦",
    },
    {
      title: "代码审查助手",
      desc: "生成一个用于代码审查的 system prompt",
      icon: "🔍",
    },
    {
      title: "营销文案创作",
      desc: "创建用于社交媒体营销文案的提示词框架",
      icon: "✍️",
    },
    {
      title: "数据分析指导",
      desc: "帮我构建一个数据分析报告的提示词模板",
      icon: "📊",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-12">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-5 animate-float">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-xl font-semibold mb-2 text-foreground">
        开始优化你的提示词
      </h2>
      <p className="text-sm text-muted-foreground mb-8 text-center max-w-sm">
        描述你的需求，AI 将自动匹配最佳提示词框架并为你生成优化结果
      </p>
      <div className="grid gap-3 sm:grid-cols-2 w-full max-w-lg">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSend(s.desc)}
            className="group flex flex-col gap-1 rounded-xl border border-border/60 bg-card px-4 py-3 text-left transition-all duration-200 hover:border-primary/30 hover:shadow-sm hover:-translate-y-0.5"
          >
            <span className="text-lg">{s.icon}</span>
            <span className="text-sm font-medium group-hover:text-primary transition-colors">
              {s.title}
            </span>
            <span className="text-xs text-muted-foreground line-clamp-1">
              {s.desc}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   Collapsed Sidebar (icon strip)
   ═════════════════════════════════════════════════════════ */
function CollapsedSidebar({
  threads,
  activeThreadId,
  onSelect,
  onNew,
  onExpand,
}: {
  threads: ThreadMeta[];
  activeThreadId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onExpand: () => void;
}) {
  return (
    <div className="flex flex-col items-center h-full py-3 gap-1.5 w-full">
      {/* Expand button */}
      <button
        onClick={onExpand}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200"
        title="展开侧边栏"
      >
        <PanelLeftOpen className="h-4 w-4" />
      </button>

      {/* New conversation */}
      <button
        onClick={onNew}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200"
        title="新建对话"
      >
        <Plus className="h-4 w-4" />
      </button>

      <Separator className="w-8 my-2" />

      {/* Conversation dots */}
      <ScrollArea className="flex-1 w-full">
        <div className="flex flex-col items-center gap-1.5 py-1 px-2">
          {threads.length === 0 ? (
            <div className="flex items-center justify-center h-full py-8">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground/25" />
            </div>
          ) : (
            threads.map((t) => {
              const isActive = t.threadId === activeThreadId;
              const initial = t.title.trim().charAt(0);
              return (
                <button
                  key={t.threadId}
                  onClick={() => onSelect(t.threadId)}
                  title={t.title}
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm scale-110"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground hover:scale-105"
                  )}
                >
                  {initial}
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   Main Chat Page
   ═════════════════════════════════════════════════════════ */
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

  /* Sidebar collapse state — persist to localStorage */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("chat:sidebar-collapsed") === "true";
  });

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("chat:sidebar-collapsed", String(next));
      return next;
    });
  }, []);

  const handleSend = (msg?: string) => {
    const text = msg || input.trim();
    if (!text || isStreaming) return;
    sendMessage(text, preselectedFramework || undefined);
    setInput("");
  };

  /* Auto-scroll to bottom */
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isStreaming, messagesEndRef]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      {/* ═══ Desktop Sidebar ═══ */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border/60 bg-sidebar shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
          sidebarCollapsed ? "w-14" : "w-72"
        )}
      >
        {sidebarCollapsed ? (
          <CollapsedSidebar
            threads={threads}
            activeThreadId={activeThreadId}
            onSelect={switchThread}
            onNew={startNewThread}
            onExpand={toggleSidebar}
          />
        ) : (
          <ConversationList
            threads={threads}
            activeThreadId={activeThreadId}
            onSelect={switchThread}
            onDelete={deleteThread}
            onNew={startNewThread}
            sidebarMode={
              <button
                onClick={toggleSidebar}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-all duration-200 shrink-0"
                title="收起侧边栏"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            }
          />
        )}
      </aside>

      {/* ═══ Main Chat Area ═══ */}
      <div className="flex flex-1 flex-col h-full min-w-0 bg-background">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 bg-background/80 backdrop-blur-sm px-4 py-3 shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Desktop: sidebar toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="hidden md:inline-flex shrink-0"
              title={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>

            {/* Mobile: history sheet trigger */}
            <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  title="对话历史"
                  className="md:hidden shrink-0"
                >
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

            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <h1 className="font-semibold text-sm truncate">提示词优化</h1>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={startNewThread}
            className="text-xs shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            新对话
          </Button>
        </div>

        {/* Messages */}
        {hasMessages ? (
          <ScrollArea className="flex-1">
            <div className="space-y-5 max-w-3xl mx-auto px-4 py-6">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onClarifyAnswer={(answer) => sendMessage(answer)}
                  isStreaming={isStreaming}
                />
              ))}
              {isStreaming && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        ) : (
          <WelcomeScreen onSend={handleSend} />
        )}

        {/* Input */}
        <div className="border-t border-border/60 bg-background/80 backdrop-blur-sm p-4 shrink-0">
          <div className="max-w-3xl mx-auto flex gap-3 items-end">
            <div className="flex-1 relative">
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
                className="min-h-[46px] max-h-32 resize-none rounded-xl pr-4 border-border/60 bg-card focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all text-sm"
                disabled={isStreaming}
              />
            </div>
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || isStreaming}
              size="icon"
              className="h-[46px] w-[46px] shrink-0 rounded-xl shadow-sm transition-all duration-200 disabled:opacity-40"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground/50 text-center mt-2.5">
            Enter 发送 · Shift + Enter 换行
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
            <p className="text-sm text-muted-foreground">加载中...</p>
          </div>
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
