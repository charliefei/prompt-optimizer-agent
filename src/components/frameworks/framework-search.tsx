"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FrameworkSearchProps {
  search: string;
  onSearchChange: (value: string) => void;
  complexity: string;
  onComplexityChange: (value: string) => void;
  domain: string;
  onDomainChange: (value: string) => void;
}

const domains = [
  "营销内容",
  "决策分析",
  "教育培训",
  "产品开发",
  "AI对话/助手",
  "写作创作",
  "图像生成",
  "快速简单任务",
  "复杂推理",
];

export function FrameworkSearch({
  search,
  onSearchChange,
  complexity,
  onComplexityChange,
  domain,
  onDomainChange,
}: FrameworkSearchProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="搜索框架名称或场景..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={complexity} onValueChange={onComplexityChange}>
        <SelectTrigger className="w-full sm:w-32">
          <SelectValue placeholder="复杂度" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部</SelectItem>
          <SelectItem value="simple">简单</SelectItem>
          <SelectItem value="medium">中等</SelectItem>
          <SelectItem value="complex">复杂</SelectItem>
        </SelectContent>
      </Select>
      <Select value={domain} onValueChange={onDomainChange}>
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder="领域" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部</SelectItem>
          {domains.map((d) => (
            <SelectItem key={d} value={d}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
