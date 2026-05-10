"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface ScoreDetails {
  score: number;
  details: Record<string, { score: number; reason: string }>;
}

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
        // Try to extract name from first H1
        const h1Match = content.match(/^#\s+(.+)$/m);
        if (h1Match && !name) {
          setName(h1Match[1].replace(/\s*Framework\s*$/, "").trim());
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
      setResult({ score: 0, details: { error: { score: 0, reason: "上传失败，请重试" } } });
      setRejected(true);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">上传自定义框架</h1>
        <p className="text-muted-foreground mt-1">
          上传你自己的提示词框架，系统会自动评估质量
        </p>
      </div>

      <div className="space-y-6">
        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>框架内容</CardTitle>
            <CardDescription>上传 Markdown 文件或直接粘贴内容</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 cursor-pointer hover:border-primary/50 transition-colors"
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
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">点击上传 Markdown 文件</p>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="markdown">或直接粘贴 Markdown 内容</Label>
              <Textarea
                id="markdown"
                placeholder="# 框架名称&#10;&#10;## 概述&#10;..."
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                rows={8}
                className="font-mono text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>框架信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">框架名称</Label>
              <Input
                id="name"
                placeholder="例如：My Custom Framework"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">简要描述</Label>
              <Textarea
                id="description"
                placeholder="描述这个框架的用途和特点..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scenarios">应用场景（用顿号分隔）</Label>
              <Input
                id="scenarios"
                placeholder="例如：内容创作、代码生成、数据分析"
                value={scenarios}
                onChange={(e) => setScenarios(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Threshold */}
        <Card>
          <CardHeader>
            <CardTitle>质量阈值</CardTitle>
            <CardDescription>
              低于此分数的框架将不会被采纳（当前：{threshold[0]} 分）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Slider
              value={threshold}
              onValueChange={setThreshold}
              max={100}
              min={0}
              step={5}
            />
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>宽松 (0)</span>
              <span>严格 (100)</span>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <Button
          onClick={handleUpload}
          disabled={!markdown.trim() || isUploading}
          className="w-full"
          size="lg"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              正在评估...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              上传并评估
            </>
          )}
        </Button>

        {/* Result */}
        {result && (
          <Card className={rejected ? "border-red-200 dark:border-red-800" : "border-green-200 dark:border-green-800"}>
            <CardHeader>
              <div className="flex items-center gap-2">
                {rejected ? (
                  <XCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
                <CardTitle>
                  {rejected ? "框架未通过评估" : "框架已通过评估"}
                </CardTitle>
              </div>
              <CardDescription>
                总分：<Badge variant={rejected ? "destructive" : "default"}>{result.score}/100</Badge>
                {" "}（阈值：{threshold[0]}）
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(result.details).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{key}</span>
                      <span className="text-sm text-muted-foreground">{value.score}/25</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${value.score >= 18 ? "bg-green-500" : value.score >= 12 ? "bg-yellow-500" : "bg-red-500"}`}
                        style={{ width: `${(value.score / 25) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{value.reason}</p>
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
