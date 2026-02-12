import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, BarChart3, Download, Radar, TrendingUp, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar as RechartsRadar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Link } from "wouter";

// 能力域配置
const DOMAINS = [
  { code: "T", name: "技术能力", fullName: "Technology", color: "#f97316" },
  { code: "S", name: "系统理解", fullName: "System Understanding", color: "#3b82f6" },
  { code: "D", name: "交付能力", fullName: "Delivery", color: "#22c55e" },
  { code: "C", name: "客户价值", fullName: "Customer Value", color: "#a855f7" },
  { code: "K", name: "知识沉淀", fullName: "Knowledge Precipitation", color: "#eab308" },
  { code: "L", name: "领导力", fullName: "Leadership/Influence", color: "#ec4899" },
];

// 模拟团队成员数据
const MOCK_TEAM_MEMBERS = [
  {
    id: "user1",
    name: "张工程师",
    role: "高级服务工程师",
    capabilities: { T: 4, S: 3, D: 4, C: 3, K: 2, L: 2 },
    totalPoints: 850,
  },
  {
    id: "user2",
    name: "李技术员",
    role: "技术支持工程师",
    capabilities: { T: 3, S: 4, D: 3, C: 4, K: 3, L: 2 },
    totalPoints: 720,
  },
  {
    id: "user3",
    name: "王专家",
    role: "技术专家",
    capabilities: { T: 5, S: 4, D: 3, C: 3, K: 4, L: 3 },
    totalPoints: 1200,
  },
  {
    id: "user4",
    name: "赵工程师",
    role: "现场服务工程师",
    capabilities: { T: 2, S: 2, D: 3, C: 3, K: 1, L: 1 },
    totalPoints: 320,
  },
  {
    id: "user5",
    name: "陈主管",
    role: "服务主管",
    capabilities: { T: 3, S: 3, D: 4, C: 4, K: 3, L: 4 },
    totalPoints: 980,
  },
];

// 团队平均能力计算
function calculateTeamAverage(members: typeof MOCK_TEAM_MEMBERS) {
  const avg: Record<string, number> = {};
  DOMAINS.forEach((d) => {
    const sum = members.reduce((acc, m) => acc + (m.capabilities[d.code as keyof typeof m.capabilities] || 0), 0);
    avg[d.code] = Math.round((sum / members.length) * 10) / 10;
  });
  return avg;
}

// 能力差距分析
function analyzeCapabilityGaps(members: typeof MOCK_TEAM_MEMBERS) {
  const gaps: Array<{
    domain: string;
    domainName: string;
    avgLevel: number;
    maxLevel: number;
    minLevel: number;
    gap: number;
    recommendation: string;
  }> = [];

  DOMAINS.forEach((d) => {
    const levels = members.map((m) => m.capabilities[d.code as keyof typeof m.capabilities] || 0);
    const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
    const max = Math.max(...levels);
    const min = Math.min(...levels);
    const gap = max - min;

    let recommendation = "";
    if (avg < 2) {
      recommendation = "团队整体能力偏弱，建议加强培训和项目实践";
    } else if (gap >= 3) {
      recommendation = "能力差距较大，建议安排导师制帮扶";
    } else if (avg >= 4) {
      recommendation = "团队能力优秀，可承担高复杂度项目";
    } else {
      recommendation = "能力分布均衡，持续积累经验";
    }

    gaps.push({
      domain: d.code,
      domainName: d.name,
      avgLevel: Math.round(avg * 10) / 10,
      maxLevel: max,
      minLevel: min,
      gap,
      recommendation,
    });
  });

  return gaps.sort((a, b) => b.gap - a.gap);
}

export default function TeamCapabilityAnalysis() {
  const { t } = useLanguage();
  const [selectedMembers, setSelectedMembers] = useState<string[]>(["user1", "user2", "user3"]);
  const [viewMode, setViewMode] = useState<"radar" | "bar" | "table">("radar");

  // 获取选中成员的数据
  const selectedMemberData = MOCK_TEAM_MEMBERS.filter((m) => selectedMembers.includes(m.id));
  const teamAverage = calculateTeamAverage(selectedMemberData);
  const capabilityGaps = analyzeCapabilityGaps(selectedMemberData);

  // 准备雷达图数据
  const radarData = DOMAINS.map((d) => {
    const data: Record<string, any> = {
      domain: d.name,
      fullMark: 5,
      teamAvg: teamAverage[d.code],
    };
    selectedMemberData.forEach((m) => {
      data[m.id] = m.capabilities[d.code as keyof typeof m.capabilities] || 0;
    });
    return data;
  });

  // 切换成员选择
  const toggleMember = (memberId: string) => {
    if (selectedMembers.includes(memberId)) {
      if (selectedMembers.length > 1) {
        setSelectedMembers(selectedMembers.filter((id) => id !== memberId));
      }
    } else {
      setSelectedMembers([...selectedMembers, memberId]);
    }
  };

  // 导出报告
  const exportReport = () => {
    const report = {
      title: "团队能力对比分析报告",
      generatedAt: new Date().toISOString(),
      members: selectedMemberData.map((m) => ({
        name: m.name,
        role: m.role,
        capabilities: m.capabilities,
        totalPoints: m.totalPoints,
      })),
      teamAverage,
      capabilityGaps,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `team-capability-report-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/capability-os">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold font-heading">团队能力对比分析</h1>
              <p className="text-muted-foreground">Team Capability Comparison Analysis</p>
            </div>
          </div>
          <Button onClick={exportReport} className="gap-2">
            <Download className="h-4 w-4" />
            导出报告
          </Button>
        </div>

        {/* 成员选择 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              选择对比成员
            </CardTitle>
            <CardDescription>点击选择要对比的团队成员（至少选择1人）</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {MOCK_TEAM_MEMBERS.map((member) => (
                <Button
                  key={member.id}
                  variant={selectedMembers.includes(member.id) ? "default" : "outline"}
                  className="gap-2"
                  onClick={() => toggleMember(member.id)}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: selectedMembers.includes(member.id)
                        ? DOMAINS[MOCK_TEAM_MEMBERS.indexOf(member) % DOMAINS.length].color
                        : "#6b7280",
                    }}
                  />
                  {member.name}
                  <span className="text-xs opacity-70">({member.role})</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 分析内容 */}
        <Tabs defaultValue="radar" className="space-y-4">
          <TabsList>
            <TabsTrigger value="radar" className="gap-2">
              <Radar className="h-4 w-4" />
              雷达图对比
            </TabsTrigger>
            <TabsTrigger value="gaps" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              差距分析
            </TabsTrigger>
            <TabsTrigger value="details" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              详细数据
            </TabsTrigger>
          </TabsList>

          {/* 雷达图对比 */}
          <TabsContent value="radar">
            <Card>
              <CardHeader>
                <CardTitle>能力雷达图对比</CardTitle>
                <CardDescription>TSDCKL六大能力域可视化对比</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[500px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#374151" />
                      <PolarAngleAxis dataKey="domain" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fill: "#6b7280" }} />
                      {selectedMemberData.map((member, index) => (
                        <RechartsRadar
                          key={member.id}
                          name={member.name}
                          dataKey={member.id}
                          stroke={DOMAINS[index % DOMAINS.length].color}
                          fill={DOMAINS[index % DOMAINS.length].color}
                          fillOpacity={0.2}
                          strokeWidth={2}
                        />
                      ))}
                      <RechartsRadar
                        name="团队平均"
                        dataKey="teamAvg"
                        stroke="#ffffff"
                        fill="#ffffff"
                        fillOpacity={0.1}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                      <Legend />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          border: "1px solid #374151",
                          borderRadius: "8px",
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 差距分析 */}
          <TabsContent value="gaps">
            <Card>
              <CardHeader>
                <CardTitle>能力差距分析</CardTitle>
                <CardDescription>识别团队能力短板和提升方向</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {capabilityGaps.map((gap) => (
                    <div
                      key={gap.domain}
                      className="p-4 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                            style={{
                              backgroundColor: DOMAINS.find((d) => d.code === gap.domain)?.color,
                            }}
                          >
                            {gap.domain}
                          </div>
                          <div>
                            <h4 className="font-semibold">{gap.domainName}</h4>
                            <p className="text-sm text-muted-foreground">
                              {DOMAINS.find((d) => d.code === gap.domain)?.fullName}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">L{gap.avgLevel}</div>
                          <div className="text-xs text-muted-foreground">团队平均</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div className="text-center p-2 rounded bg-green-500/10 border border-green-500/20">
                          <div className="text-lg font-semibold text-green-500">L{gap.maxLevel}</div>
                          <div className="text-xs text-muted-foreground">最高等级</div>
                        </div>
                        <div className="text-center p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                          <div className="text-lg font-semibold text-yellow-500">L{gap.minLevel}</div>
                          <div className="text-xs text-muted-foreground">最低等级</div>
                        </div>
                        <div className="text-center p-2 rounded bg-red-500/10 border border-red-500/20">
                          <div className="text-lg font-semibold text-red-500">{gap.gap}</div>
                          <div className="text-xs text-muted-foreground">等级差距</div>
                        </div>
                      </div>

                      <div className="p-3 rounded bg-primary/5 border border-primary/20">
                        <p className="text-sm">
                          <span className="font-medium text-primary">建议：</span>
                          {gap.recommendation}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 详细数据 */}
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>详细能力数据</CardTitle>
                <CardDescription>各成员在六大能力域的具体等级和积分</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 font-semibold">成员</th>
                        <th className="text-left p-3 font-semibold">角色</th>
                        {DOMAINS.map((d) => (
                          <th key={d.code} className="text-center p-3 font-semibold">
                            <div
                              className="inline-flex items-center justify-center w-8 h-8 rounded text-white text-sm font-bold"
                              style={{ backgroundColor: d.color }}
                            >
                              {d.code}
                            </div>
                          </th>
                        ))}
                        <th className="text-right p-3 font-semibold">总积分</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMemberData.map((member) => (
                        <tr key={member.id} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="p-3 font-medium">{member.name}</td>
                          <td className="p-3 text-muted-foreground">{member.role}</td>
                          {DOMAINS.map((d) => {
                            const level = member.capabilities[d.code as keyof typeof member.capabilities] || 0;
                            return (
                              <td key={d.code} className="text-center p-3">
                                <span
                                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                                    level >= 4
                                      ? "bg-green-500/20 text-green-500"
                                      : level >= 3
                                        ? "bg-blue-500/20 text-blue-500"
                                        : level >= 2
                                          ? "bg-yellow-500/20 text-yellow-500"
                                          : "bg-gray-500/20 text-gray-500"
                                  }`}
                                >
                                  L{level}
                                </span>
                              </td>
                            );
                          })}
                          <td className="text-right p-3 font-bold text-primary">{member.totalPoints}</td>
                        </tr>
                      ))}
                      {/* 团队平均行 */}
                      <tr className="bg-muted/30 font-semibold">
                        <td className="p-3">团队平均</td>
                        <td className="p-3 text-muted-foreground">-</td>
                        {DOMAINS.map((d) => (
                          <td key={d.code} className="text-center p-3">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary text-sm font-bold">
                              {teamAverage[d.code]}
                            </span>
                          </td>
                        ))}
                        <td className="text-right p-3 text-primary">
                          {Math.round(
                            selectedMemberData.reduce((acc, m) => acc + m.totalPoints, 0) / selectedMemberData.length
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
