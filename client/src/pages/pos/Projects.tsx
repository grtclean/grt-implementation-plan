import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Plus, Search, Filter, ChevronRight } from "lucide-react";

const STAGES = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'] as const;

const stageColors: Record<string, string> = {
  M0: 'bg-gray-500', M1: 'bg-blue-500', M2: 'bg-indigo-500', M3: 'bg-purple-500',
  M4: 'bg-pink-500', M5: 'bg-red-500', M6: 'bg-orange-500', M7: 'bg-amber-500',
  M8: 'bg-yellow-500', M9: 'bg-lime-500', M10: 'bg-green-500', M11: 'bg-emerald-500', M12: 'bg-teal-500',
};

// 从currentPhase提取M阶段
const extractStage = (phase: string | undefined): string => {
  if (!phase) return 'M0';
  // 匹配 M0-M12 格式
  const match = phase.match(/M(\d+)/);
  if (match) return `M${match[1]}`;
  return 'M0';
};

export default function POSProjects() {
  const [page, setPage] = useState(1);
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // 使用project.list API（来自placeholder-routers，已验证可用）
  const { data, isLoading, error } = trpc.project.list.useQuery();
  
  // 调试日志
  console.log('[POSProjects] data:', data, 'isLoading:', isLoading, 'error:', error);

  // 根据阶段筛选数据
  const filteredItems = data?.filter((project: any) => {
    if (stageFilter === 'all') return true;
    const stage = extractStage(project.currentPhase);
    return stage === stageFilter;
  }) || [];

  // 搜索过滤
  const searchedItems = filteredItems.filter((project: any) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      project.name?.toLowerCase().includes(searchLower) ||
      project.shortName?.toLowerCase().includes(searchLower) ||
      project.id?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">项目管理</h1>
          <p className="text-muted-foreground">M0-M12 项目全生命周期管理</p>
        </div>
        <Link href="/pos/projects/new">
          <Button><Plus className="w-4 h-4 mr-2" />新建项目</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="搜索项目编号、名称..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[150px]"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="阶段筛选" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部阶段</SelectItem>
                {STAGES.map(stage => (<SelectItem key={stage} value={stage}>{stage}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>项目列表</span>
            <Badge variant="secondary">{searchedItems.length} 个项目</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              <p>加载失败: {error.message}</p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>重试</Button>
            </div>
          ) : searchedItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>项目编号</TableHead>
                  <TableHead>项目名称</TableHead>
                  <TableHead>当前阶段</TableHead>
                  <TableHead>项目经理</TableHead>
                  <TableHead>预算(万)</TableHead>
                  <TableHead>进度</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchedItems.map((project: any) => {
                  const stage = extractStage(project.currentPhase);
                  return (
                    <TableRow key={project.id}>
                      <TableCell className="font-mono text-sm">{project.shortName || project.id}</TableCell>
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell>
                        <Badge className={`${stageColors[stage] || 'bg-gray-500'} text-white`}>
                          {project.currentPhase || stage}
                        </Badge>
                      </TableCell>
                      <TableCell>{project.manager || '-'}</TableCell>
                      <TableCell>{project.budget || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full" 
                              style={{ width: `${project.progress || 0}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">{project.progress || 0}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={project.status === 'active' ? 'default' : project.status === 'completed' ? 'secondary' : 'outline'}>
                          {project.status === 'active' ? '进行中' : 
                           project.status === 'completed' ? '已完成' : 
                           project.status === 'on_hold' ? '暂停' : 
                           project.status === 'planning' ? '规划中' : project.status || '进行中'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/pos/projects/${project.id}`}>
                          <Button variant="ghost" size="sm">
                            详情 <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>暂无项目数据</p>
              <Link href="/pos/projects/new">
                <Button variant="outline" className="mt-4"><Plus className="w-4 h-4 mr-2" />创建第一个项目</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
