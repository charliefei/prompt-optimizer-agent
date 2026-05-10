"use client";

import { MessageSquare, Trash2, Plus } from "lucide-react";
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
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-3 border-b">
        <span className="text-sm font-medium">对话历史</span>
        <Button variant="ghost" size="icon" onClick={onNew} title="新建对话">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        {threads.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-muted-foreground">暂无历史对话</p>
        ) : (
          <div className="p-2 space-y-1">
            {threads.map((t) => (
              <div
                key={t.threadId}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors",
                  t.threadId === activeThreadId
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50 text-muted-foreground"
                )}
                onClick={() => onSelect(t.threadId)}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 truncate">{t.title}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(t.threadId);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
