/**
 * 技术文档页面
 * 技术文档库、版本管理、审批流
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileText, Plus, Search, Upload, Download, FolderOpen, File, Clock } from "lucide-react";

const MOCK_DOCS = [
  { id: 1, name: "清洗工艺标准规范 V3.0", type: "标准", category: "工艺", updatedAt: "2026-02-08", author: "王工", size: "2.4MB" },
  { id: 2, name: "PLC编程规范", type: "规范", category: "电气", updatedAt: "2026-02-05", author: "陈工", size: "1.8MB" },
  { id: 3, name: "机械设计手册", type: "手册", category: "机械", updatedAt: "2026-01-20", author: "李工", size: "15.2MB" },
  { id: 4, name: "UWB定位系统接口文档", type: "接口", category: "软件", updatedAt: "2026-02-01", author: "张工", size: "890KB" },
  { id: 5, name: "质量检测标准流程", type: "流程", category: "质量", updatedAt: "2026-01-28", author: "赵工", size: "3.1MB" },
];

export default function TechDocuments() {
  const [search, setSearch] = useState("");
  const filtered = MOCK_DOCS.filter(d => !search || d.name.includes(search) || d.category.includes(search));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-primary" />技术文档</h1>
          <p className="text-muted-foreground mt-1">技术文档库 · 版本控制与知识沉淀</p>
        </div>
        <div className="flex gap-2">
          <Button><Plus className="h-4 w-4 mr-2" />新建文档</Button>
          <Button variant="outline"><Upload className="h-4 w-4 mr-2" />上传</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold">156</p><p className="text-sm text-muted-foreground">文档总数</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-blue-600">12</p><p className="text-sm text-muted-foreground">本月新增</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-amber-600">5</p><p className="text-sm text-muted-foreground">待审批</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-green-600">2.1GB</p><p className="text-sm text-muted-foreground">存储占用</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>文档列表</CardTitle>
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="搜索文档..." className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filtered.map(doc => (
              <div key={doc.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer">
                <File className="h-8 w-8 text-primary/30" />
                <div className="flex-1">
                  <p className="font-medium">{doc.name}</p>
                  <p className="text-sm text-muted-foreground">作者: {doc.author} · {doc.size}</p>
                </div>
                <Badge variant="outline">{doc.category}</Badge>
                <Badge variant="secondary">{doc.type}</Badge>
                <div className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{doc.updatedAt}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
