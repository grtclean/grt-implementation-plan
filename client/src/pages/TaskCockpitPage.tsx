/**
 * Task Cockpit Page — wraps TaskCockpit with project selector.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import TaskCockpit from "@/components/TaskCockpit";
import { LayoutDashboard } from "lucide-react";

export default function TaskCockpitPage() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const { data: projects, isLoading } = trpc.project.listByRole.useQuery({ limit: 50 });

  // Auto-select first project when data loads
  useEffect(() => {
    if (!selectedProjectId && projects && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-6 h-6 text-indigo-500" />
          <h1 className="text-2xl font-bold">
            {isEn ? "Task Cockpit" : "任务驾驶舱"}
          </h1>
        </div>

        {/* Project Selector */}
        <div className="w-72">
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select
              value={selectedProjectId?.toString() ?? ""}
              onValueChange={(v) => setSelectedProjectId(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder={isEn ? "Select a project..." : "选择项目..."} />
              </SelectTrigger>
              <SelectContent>
                {(projects ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.projectCode ? `${p.projectCode} — ` : ""}{p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {selectedProjectId ? (
        <TaskCockpit projectId={selectedProjectId} />
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {isEn ? "Select a project to view tasks" : "请选择一个项目以查看任务"}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
