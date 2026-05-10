"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Grid3X3, Upload, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/chat", label: "AI 对话", icon: MessageSquare },
  { href: "/frameworks", label: "框架库", icon: Grid3X3 },
  { href: "/upload", label: "上传框架", icon: Upload },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Sparkles className="h-5 w-5 text-sidebar-primary" />
        <span className="font-semibold text-sidebar-foreground">提示词优化器</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground">57+ 提示词框架</p>
        <p className="text-xs text-muted-foreground">帮助你写出更好的 AI 提示词</p>
      </div>
    </aside>
  );
}
