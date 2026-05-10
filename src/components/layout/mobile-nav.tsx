"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Grid3X3, Upload, Sparkles, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";

const navItems = [
  { href: "/chat", label: "AI 对话", icon: MessageSquare },
  { href: "/frameworks", label: "框架库", icon: Grid3X3 },
  { href: "/upload", label: "上传框架", icon: Upload },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex md:hidden items-center h-14 border-b px-4">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-14 items-center gap-2 border-b px-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <SheetTitle className="font-semibold">提示词优化器</SheetTitle>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
      <div className="flex items-center gap-2 ml-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="font-semibold text-sm">提示词优化器</span>
      </div>
    </div>
  );
}
