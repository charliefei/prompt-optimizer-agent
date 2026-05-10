"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  Gauge,
} from "lucide-react";

interface ScoreDetails {
  score: number;
  details: Record<string, { score: number; reason: string }>;
}

const dimensionLabels: Record<string, string> = {
  structure: "结构完整性",
  clarity: "清晰度",
  practicality: "实用性",
  originality: "原创性",
};

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scenarios, setScenarios] = useState("");
  const [threshold, setThreshold] = useState([60]);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ScoreDetails | null>(null);
  const [rejected, setRejected] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        setMarkdown(content);
        const h1Match = content.match(/^#\s+(.+)$/m);
        if (h1Match && !name) {
          setName(
            h1Match[1].replace(/\s*Framework\s*$/, "").trim()
          );
        }
      };
      reader.readAsText(selected);
    }
  };

  const handleUpload = async () => {
    if (!markdown.trim()) return;
    setIsUploading(true);
    setResult(null);
    setRejected(false);

    try {
      const formData = new FormData();
      if (file) formData.append("file", file);
      formData.append("markdown", markdown);
      formData.append("name", name);
      formData.append("description", description);
      formData.append("scenarios", scenarios);
      formData.append("threshold", String(threshold[0]));

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setResult({ score: data.score, details: data.scoreDetails });
        setRejected(false);
      } else {
        setResult({ score: data.score, details: data.scoreDetails });
        setRejected(true);
      }
    } catch {
      setResult({
        score: 0,
        details: { error: { score: 0, reason: "上传失败，请重试" } },
      });
      setRejected(true);
    } finally {
      setIsUploading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 18) return "bg-emerald-500";
    if (score >= 12) return "bg-amber-500";
    return "bg-rose-500";
  };

  return (
    <div className="flex flex-1 flex-col p-6 max-w-3xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Upload className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">上传自定义框架</h1>
        </div>
        <p className="text-muted-foreground ml-[52px]">
          上传你自己的提示词框架，系统会自动评估质量
        </p>
      </div>

      <div className="space-y-5">
        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">框架内容</CardTitle>
            <CardDescription>
              上传 Markdown 文件或直接粘贴内容
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/60 p-8 cursor-pointer transition-all duration-200 hover:border-primary/40 hover:bg-primary/[0.02]"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.markdown,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                    <FileText className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      点击更换文件
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-3 group-hover:bg-primary/10 transition-colors">
                    <Upload className="h-6 w-6 text-muted-foreground/50 group-hover:text-primary/60 transition-colors" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    点击上传 Markdown 文件
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    支持 .md、.markdown、.txt 格式
                  </p>
                </>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="markdown" className="text-sm">
                或直接粘贴 Markdown 内容
              </Label>
              <Textarea
                id="markdown"
                placeholder="# 框架名称&#10;&#10;## 概述&#10;..."
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                rows={8}
                className="font-mono text-xs resize-y border-border/60 focus:border-primary/40"
              />
            </div>
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">框架信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm">
                框架名称
              </Label>
              <Input
                id="name"
                placeholder="例如：My Custom Framework"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-border/60 focus:border-primary/40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm">
                简要描述
              </Label>
              <Textarea
                id="description"
                placeholder="描述这个框架的用途和特点..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="resize-y border-border/60 focus:border-primary/40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scenarios" className="text-sm">
                应用场景（用顿号分隔）
              </Label>
              <Input
                id="scenarios"
                placeholder="例如：内容创作、代码生成、数据分析"
                value={scenarios}
                onChange={(e) => setScenarios(e.target.value)}
                className="border-border/60 focus:border-primary/40"
              />
            </div>
          </CardContent>
        </Card>

        {/* Threshold */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">质量阈值</CardTitle>
            <CardDescription>
              低于此分数的框架将不会被采纳
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <Slider
                value={threshold}
                onValueChange={setThreshold}
                max={100}
                min={0}
                step={5}
                className="flex-1"
              />
              <span className="text-2xl font-bold text-primary tabular-nums w-12 text-center">
                {threshold[0]}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>宽松</span>
              <span>标准</span>
              <span>严格</span>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <Button
          onClick={handleUpload}
          disabled={!markdown.trim() || isUploading}
          className="w-full h-12 rounded-xl text-base shadow-sm"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              正在评估...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              上传并评估
            </>
          )}
        </Button>

        {/* Result */}
        {result && (
          <Card
            className={
              rejected
                ? "border-rose-200 dark:border-rose-800 animate-scale-in"
                : "border-emerald-200 dark:border-emerald-800 animate-scale-in"
            }
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    rejected
                      ? "bg-rose-100 dark:bg-rose-900/30"
                      : "bg-emerald-100 dark:bg-emerald-900/30"
                  }`}
                >
                  {rejected ? (
                    <XCircle className="h-5 w-5 text-rose-500" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-base">
                    {rejected ? "框架未通过评估" : "框架已通过评估"}
                  </CardTitle>
                  <CardDescription className="mt-0.5">
                    总分{" "}
                    <Badge
                      variant={rejected ? "destructive" : "default"}
                      className="ml-1"
                    >
                      {result.score}/100
                    </Badge>
                    <span className="ml-1">（阈值：{threshold[0]}）</span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(result.details).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {dimensionLabels[key] || key}
                      </span>
                      <span className="text-sm font-semibold tabular-nums">
                        {value.score}
                        <span className="text-muted-foreground font-normal">
                          /25
                        </span>
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${getScoreColor(
                          value.score
                        )}`}
                        style={{
                          width: `${(value.score / 25) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      {value.reason}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
