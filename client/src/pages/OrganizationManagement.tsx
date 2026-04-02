/**
 * 组织架构管理页面 — 从 grt_employees 表 + supervisor_id 实时渲染
 */
import { useState, useMemo } from "react";
import { PageHeader, StatCard } from "@/components/grt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, ChevronRight, ChevronDown, User, Briefcase, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface OrgEmployee {
  id: number;
  employee_id: string;
  name: string;
  department: string | null;
  supervisor_id: number | null;
  supervisor_name: string | null;
  is_active: number;
}

interface TreeNode {
  emp: OrgEmployee;
  children: TreeNode[];
}

function buildTree(employees: OrgEmployee[]): TreeNode[] {
  const map = new Map<number, TreeNode>();
  const roots: TreeNode[] = [];

  for (const emp of employees) {
    map.set(emp.id, { emp, children: [] });
  }

  for (const emp of employees) {
    const node = map.get(emp.id)!;
    if (emp.supervisor_id && map.has(emp.supervisor_id)) {
      map.get(emp.supervisor_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

const DEPT_COLORS: Record<string, string> = {
  "总裁办": "bg-red-500/10 text-red-400 border-red-500/30",
  "AI数智部": "bg-purple-500/10 text-purple-400 border-purple-500/30",
  "财务部": "bg-amber-500/10 text-amber-400 border-amber-500/30",
  "人事行政部": "bg-pink-500/10 text-pink-400 border-pink-500/30",
  "事业一部": "bg-blue-500/10 text-blue-400 border-blue-500/30",
  "事业二部": "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  "事业三部": "bg-green-500/10 text-green-400 border-green-500/30",
  "事业四部": "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  "事业十部": "bg-orange-500/10 text-orange-400 border-orange-500/30",
};

function OrgNodeComponent({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const deptColor = DEPT_COLORS[node.emp.department || ""] || "bg-muted text-muted-foreground";

  // 递归计算总下属数
  const totalDescendants = useMemo(() => {
    function count(n: TreeNode): number {
      return n.children.reduce((sum, c) => sum + 1 + count(c), 0);
    }
    return count(node);
  }, [node]);

  return (
    <div>
      <div
        className="flex items-center gap-2 p-2 rounded hover:bg-accent/50 cursor-pointer transition-colors"
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <User className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="font-medium">{node.emp.name}</span>
        <span className="text-xs font-mono text-muted-foreground">{node.emp.employee_id}</span>
        {node.emp.department && (
          <Badge variant="outline" className={`text-[10px] ${deptColor}`}>
            {node.emp.department}
          </Badge>
        )}
        {hasChildren && (
          <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
            <Users className="h-3 w-3" />{node.children.length} 直接下属
            {totalDescendants > node.children.length && (
              <span className="text-[10px]">({totalDescendants} 总计)</span>
            )}
          </span>
        )}
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children
            .sort((a, b) => b.children.length - a.children.length || a.emp.name.localeCompare(b.emp.name))
            .map((child) => (
              <OrgNodeComponent key={child.emp.id} node={child} depth={depth + 1} />
            ))}
        </div>
      )}
    </div>
  );
}

export default function OrganizationManagement() {
  // 从 DB 查询组织关系
  const { data: orgData, isLoading } = trpc.org.getOrgTree.useQuery();

  // 同时查 grt_employees 的完整上下级关系
  const { data: hierarchyData } = (trpc as any).org?.getHierarchy?.useQuery?.() ?? { data: null };

  // 构建组织树 — 优先用 hierarchy（含 supervisor），降级用 orgData
  const employees: OrgEmployee[] = useMemo(() => {
    if (hierarchyData?.employees) return hierarchyData.employees;

    // 降级方案：从 orgData 构建无 supervisor 关系的列表
    if (orgData?.employees) {
      return orgData.employees.map((e: any) => ({
        id: e.id,
        employee_id: e.employee_id || `EMP-${e.id}`,
        name: e.name,
        department: e.department,
        supervisor_id: null,
        supervisor_name: null,
        is_active: 1,
      }));
    }
    return [];
  }, [hierarchyData, orgData]);

  const tree = useMemo(() => buildTree(employees), [employees]);

  // 统计
  const departments = useMemo(() => {
    const depts = new Set(employees.map(e => e.department).filter(Boolean));
    return depts.size;
  }, [employees]);

  const totalEmployees = employees.length;
  const buCount = useMemo(() => {
    const bus = new Set(employees.map(e => e.department).filter(d => d?.startsWith("事业")));
    return bus.size;
  }, [employees]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Building2}
        title="组织架构"
        description="从 grt_employees 表实时渲染 · supervisor_id 上下级关系"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="事业部" value={buCount} iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard icon={Users} label="部门" value={departments} iconColor="text-blue-500" iconBg="bg-blue-500/10" />
        <StatCard icon={User} label="总人数" value={totalEmployees} iconColor="text-green-500" iconBg="bg-green-500/10" />
        <StatCard icon={Briefcase} label="有上级" value={employees.filter(e => e.supervisor_id).length} iconColor="text-purple-500" iconBg="bg-purple-500/10" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            组织树
            <Badge variant="outline" className="text-xs font-normal">实时数据 · grt_employees</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : tree.length > 0 ? (
            tree.map((root) => (
              <OrgNodeComponent key={root.emp.id} node={root} depth={0} />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              暂无组织数据。请先运行 seed-org-hierarchy.ts 种入上下级关系。
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
