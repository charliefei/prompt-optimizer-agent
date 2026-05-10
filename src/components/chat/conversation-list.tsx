"use client";

import { MessageSquare, Trash2, Plus, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ThreadMeta } from "@/hooks/use-chat";

interface ConversationListProps {
  threads: ThreadMeta[];
  activeThreadId: string | null;
  onSelect: (threadId: string) => void;
  onDelete: (threadId: string) => void;
  onNew: () => void;
}

export function ConversationList({
  threads,
  activeThreadId,
  onSelect,
  onDelete,
  onNew,
}: ConversationListProps) {
  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-sidebar-border">
        <span className="text-sm font-semibold text-sidebar-foreground">
          对话历史
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNew}
          title="新建对话"
          className="h-8 w-8 hover:bg-sidebar-accent"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sidebar-accent mb-3">
              <MessagesSquare className="h-5 w-5 text-sidebar-foreground/30" />
            </div>
            <p className="text-sm font-medium text-sidebar-foreground/50">
              暂无历史对话
            </p>
            <p className="text-xs text-sidebar-foreground/30 mt-1">
              开始一段新的对话吧
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {threads.map((t) => {
              const isActive = t.threadId === activeThreadId;
              return (
                <div
                  key={t.threadId}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-all duration-200",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                  onClick={() => onSelect(t.threadId)}
                >
                  <MessageSquare
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      isActive
                        ? "text-sidebar-primary-foreground/70"
                        : "text-sidebar-foreground/30 group-hover:text-sidebar-foreground/50"
                    )}
                  />
                  <span className="flex-1 truncate">{t.title}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-6 w-6 shrink-0 transition-all duration-200",
                      isActive
                        ? "opacity-70 hover:opacity-100 hover:bg-sidebar-primary-foreground/10"
                        : "opacity-0 group-hover:opacity-100 hover:bg-sidebar-accent-foreground/10"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(t.threadId);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-4 py-3">
        <p className="text-xs text-sidebar-foreground/30 text-center">
          {threads.length} 个对话
        </p>
      </div>
    </div>
  );
}
