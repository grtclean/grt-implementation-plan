/**
 * 组织架构管理页面
 * 部门管理、岗位管理、组织树
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Users, ChevronRight, ChevronDown, Settings, User } from "lucide-react";

interface OrgNode {
  name: string;
  type: "company" | "bu" | "dept" | "team";
  headcount: number;
  leader: string;
  children?: OrgNode[];
}

const ORG_TREE: OrgNode = {
  name: "GRT集团", type: "company", headcount: 140, leader: "CEO",
  children: [
    { name: "BU1 海外事业部", type: "bu", headcount: 25, leader: "张总", children: [
      { name: "海外销售组", type: "team", headcount: 8, leader: "王经理" },
      { name: "海外技术组", type: "team", headcount: 12, leader: "李经理" },
      { name: "海外服务组", type: "team", headcount: 5, leader: "赵经理" },
    ]},
    { name: "BU2 商用车事业部", type: "bu", headcount: 28, leader: "李总", children: [
      { name: "商用车设计组", type: "team", headcount: 15, leader: "陈经理" },
      { name: "商用车销售组", type: "team", headcount: 8, leader: "周经理" },
    ]},
    { name: "BU3 乘用车事业部", type: "bu", headcount: 32, leader: "王总" },
    { name: "BU4 半导体事业部", type: "bu", headcount: 20, leader: "陈总" },
    { name: "BU5 工业通用事业部", type: "bu", headcount: 15, leader: "刘总" },
    { name: "人力资源部", type: "dept", headcount: 12, leader: "孙经理" },
    { name: "财务部", type: "dept", headcount: 8, leader: "钱经理" },
  ],
};

function OrgNodeComponent({ node, depth = 0 }: { node: OrgNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = node.children && node.children.length > 0;
  const typeColors = { company: "bg-red-100 text-red-700", bu: "bg-blue-100 text-blue-700", dept: "bg-green-100 text-green-700", team: "bg-gray-100 text-gray-700" };
  const typeLabels = { company: "集团", bu: "事业部", dept: "部门", team: "团队" };

  return (
    <div>
      <div className="flex items-center gap-2 p-2 rounded hover:bg-accent/50 cursor-pointer" style={{ paddingLeft: `${depth * 24 + 8}px` }} onClick={() => hasChildren && setExpanded(!expanded)}>
        {hasChildren ? (expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />) : <span className="w-4" />}
        <Building2 className="h-4 w-4 text-primary" />
        <span className="font-medium">{node.name}</span>
        <Badge className={typeColors[node.type]}>{typeLabels[node.type]}</Badge>
        <span className="text-sm text-muted-foreground ml-auto"><Users className="inline h-3 w-3 mr-1" />{node.headcount}人 · {node.leader}</span>
      </div>
      {expanded && hasChildren && node.children!.map((child, i) => (
        <OrgNodeComponent key={i} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function OrganizationManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6 text-primary" />组织架构</h1>
          <p className="text-muted-foreground mt-1">组织管理 · 部门岗位 · 人员配置</p>
        </div>
        <div className="flex gap-2">
          <Button><Plus className="h-4 w-4 mr-2" />新建部门</Button>
          <Button variant="outline"><Settings className="h-4 w-4 mr-2" />岗位管理</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold">5</p><p className="text-sm text-muted-foreground">事业部</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold">12</p><p className="text-sm text-muted-foreground">部门/团队</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold">140</p><p className="text-sm text-muted-foreground">总人数</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold text-primary">28</p><p className="text-sm text-muted-foreground">岗位类型</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>组织树</CardTitle></CardHeader>
        <CardContent>
          <OrgNodeComponent node={ORG_TREE} />
        </CardContent>
      </Card>
    </div>
  );
}
