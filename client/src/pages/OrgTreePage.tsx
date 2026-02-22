import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Building2,
  Users,
  ChevronRight,
  User,
  Mail,
  Phone,
  Briefcase,
  Shield,
  Database,
  Loader2,
  FolderTree,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────
interface Department {
  id: number;
  name: string;
  name_en: string | null;
  parent_id: number | null;
  bu_code: string | null;
  sort_order: number;
  head_employee_id: string | null;
}

interface Employee {
  id: number;
  employee_id: string;
  name: string;
  department: string | null;
  position: string | null;
  bu_code: string | null;
  email: string | null;
  phone: string | null;
}

// ── BU badge colour palette ─────────────────────────────────────────────
const BU_COLORS: Record<string, { bg: string; text: string }> = {
  overseas: { bg: "bg-[#e1dfdd]", text: "text-[#323130]" },
  commercial: { bg: "bg-[#fff4ce]", text: "text-[#835b00]" },
  passenger: { bg: "bg-[#deecf9]", text: "text-[#0078d4]" },
  semiconductor: { bg: "bg-[#edebe9]", text: "text-[#605e5c]" },
  industrial: { bg: "bg-[#dff6dd]", text: "text-[#107c10]" },
};

function buBadgeClasses(buCode: string | null | undefined): string {
  if (!buCode) return "bg-[#f3f2f1] text-[#a19f9d]";
  const entry = BU_COLORS[buCode];
  if (entry) return `${entry.bg} ${entry.text}`;
  return "bg-[#deecf9] text-[#0078d4]";
}

// ── Loading skeleton ─────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-sm shadow-[0_2px_4px_rgba(0,0,0,0.04)] border border-[#edebe9] p-5"
          >
            <div className="h-4 w-24 bg-[#edebe9] rounded mb-3" />
            <div className="h-8 w-16 bg-[#edebe9] rounded" />
          </div>
        ))}
      </div>
      {/* Department card skeletons */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="bg-white rounded-sm shadow-[0_2px_4px_rgba(0,0,0,0.04)] border border-[#edebe9] p-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-[#edebe9]" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-40 bg-[#edebe9] rounded" />
              <div className="h-3 w-28 bg-[#edebe9] rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-[#f3f2f1] flex items-center justify-center mb-4">
        <FolderTree className="w-8 h-8 text-[#a19f9d]" />
      </div>
      <h3 className="text-lg font-semibold text-[#323130] mb-1">
        No Organization Data
      </h3>
      <p className="text-sm text-[#605e5c] max-w-sm">
        The departments and company_employees tables are empty. Run the Jiandaoyun
        org import seed script first, then refresh this page.
      </p>
    </div>
  );
}

// ── Error state ──────────────────────────────────────────────────────────
function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-[#fde7e9] flex items-center justify-center mb-4">
        <Shield className="w-8 h-8 text-[#a4262c]" />
      </div>
      <h3 className="text-lg font-semibold text-[#323130] mb-1">
        Failed to Load Org Data
      </h3>
      <p className="text-sm text-[#605e5c] max-w-md break-all">{message}</p>
    </div>
  );
}

// ── Department Card ──────────────────────────────────────────────────────
function DepartmentCard({
  dept,
  employees,
  expanded,
  onToggle,
}: {
  dept: Department;
  employees: Employee[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const count = employees.length;

  return (
    <div className="bg-white rounded-sm shadow-[0_2px_4px_rgba(0,0,0,0.04)] border border-[#edebe9] overflow-hidden">
      {/* Department header (clickable) */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#f3f2f1] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-[#deecf9] flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-[#0078d4]" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-[#323130]">{dept.name}</div>
            <div className="text-xs text-[#605e5c]">
              {dept.name_en ? `${dept.name_en} · ` : ""}
              {count} employee{count !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dept.bu_code && (
            <span
              className={`text-xs px-2 py-0.5 rounded-sm font-medium ${buBadgeClasses(dept.bu_code)}`}
            >
              {dept.bu_code}
            </span>
          )}
          <span className="text-xs text-[#a19f9d] tabular-nums min-w-[2ch] text-right">
            {count}
          </span>
          <ChevronRight
            className={`w-4 h-4 text-[#a19f9d] transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
          />
        </div>
      </button>

      {/* Expanded employee list */}
      {expanded && (
        <div className="border-t border-[#edebe9] divide-y divide-[#edebe9]">
          {count === 0 ? (
            <div className="px-5 py-4 text-sm text-[#a19f9d] italic">
              No employees assigned to this department
            </div>
          ) : (
            employees.map((emp) => (
              <div
                key={emp.employee_id || emp.id}
                className="px-5 py-3 flex items-center gap-4 hover:bg-[#faf9f8] transition-colors"
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-[#0078d4] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                  {emp.name ? emp.name[0] : "?"}
                </div>
                {/* Name + position */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#323130] truncate">
                    {emp.name}
                  </div>
                  {emp.position && (
                    <div className="text-xs text-[#605e5c] truncate flex items-center gap-1">
                      <Briefcase className="w-3 h-3 inline-block flex-shrink-0" />
                      {emp.position}
                    </div>
                  )}
                </div>
                {/* Employee ID */}
                <div className="text-xs text-[#a19f9d] font-mono flex-shrink-0">
                  {emp.employee_id}
                </div>
                {/* Email */}
                {emp.email && (
                  <div className="hidden lg:flex items-center gap-1 text-xs text-[#605e5c] flex-shrink-0">
                    <Mail className="w-3 h-3" />
                    <span className="truncate max-w-[180px]">{emp.email}</span>
                  </div>
                )}
                {/* Phone */}
                {emp.phone && (
                  <div className="hidden xl:flex items-center gap-1 text-xs text-[#605e5c] flex-shrink-0">
                    <Phone className="w-3 h-3" />
                    {emp.phone}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────
export default function OrgTreePage() {
  const { data, isLoading, error } = trpc.org.getOrgTree.useQuery();
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  // Group employees by department name
  const employeesByDept = useMemo(() => {
    if (!data?.employees) return new Map<string, Employee[]>();
    const map = new Map<string, Employee[]>();
    for (const emp of data.employees as unknown as Employee[]) {
      const key = emp.department || "__unassigned__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(emp);
    }
    return map;
  }, [data?.employees]);

  // Departments cast to typed array
  const departments = useMemo(
    () => (data?.departments ?? []) as unknown as Department[],
    [data?.departments],
  );

  const toggleDept = (name: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set(departments.map((d) => d.name));
    // Also include __unassigned__ if there are unassigned employees
    if (employeesByDept.has("__unassigned__")) all.add("__unassigned__");
    setExpandedDepts(all);
  };

  const collapseAll = () => {
    setExpandedDepts(new Set());
  };

  // Compute unassigned employees (department name doesn't match any dept)
  const unassignedEmployees = useMemo(() => {
    if (!data) return [];
    const deptNames = new Set(departments.map((d) => d.name));
    return (data.employees as unknown as Employee[]).filter(
      (e) => !e.department || !deptNames.has(e.department),
    );
  }, [data, departments]);

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#faf9f8]">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#323130] tracking-tight">
            Organization Tree
          </h1>
          <p className="text-sm text-[#605e5c] mt-1">
            Clean Slate Verification &mdash; Jiandaoyun Org Import
          </p>
        </div>

        {/* Loading */}
        {isLoading && <Skeleton />}

        {/* Error */}
        {error && <ErrorState message={error.message} />}

        {/* Data loaded */}
        {data && (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {/* Departments */}
              <div className="bg-white rounded-sm shadow-[0_2px_4px_rgba(0,0,0,0.04)] border border-[#edebe9] px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-[#0078d4]" />
                  <span className="text-xs font-medium text-[#605e5c] uppercase tracking-wider">
                    Departments
                  </span>
                </div>
                <div className="text-3xl font-bold text-[#323130] tabular-nums">
                  {data.summary.totalDepartments}
                </div>
              </div>
              {/* Employees */}
              <div className="bg-white rounded-sm shadow-[0_2px_4px_rgba(0,0,0,0.04)] border border-[#edebe9] px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-[#107c10]" />
                  <span className="text-xs font-medium text-[#605e5c] uppercase tracking-wider">
                    Employees
                  </span>
                </div>
                <div className="text-3xl font-bold text-[#323130] tabular-nums">
                  {data.summary.totalEmployees}
                </div>
              </div>
              {/* Data Source */}
              <div className="bg-white rounded-sm shadow-[0_2px_4px_rgba(0,0,0,0.04)] border border-[#edebe9] px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-[#8764b8]" />
                  <span className="text-xs font-medium text-[#605e5c] uppercase tracking-wider">
                    Data Source
                  </span>
                </div>
                <div className="text-lg font-semibold text-[#323130]">
                  TiDB / MySQL
                </div>
                <div className="text-xs text-[#a19f9d]">
                  departments + company_employees
                </div>
              </div>
            </div>

            {/* Empty state */}
            {departments.length === 0 && data.summary.totalEmployees === 0 && (
              <EmptyState />
            )}

            {/* Controls */}
            {departments.length > 0 && (
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-[#605e5c] uppercase tracking-wider">
                  Department Tree
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={expandAll}
                    className="text-xs px-3 py-1.5 rounded-sm border border-[#edebe9] text-[#0078d4] hover:bg-[#deecf9] transition-colors font-medium"
                  >
                    Expand All
                  </button>
                  <button
                    onClick={collapseAll}
                    className="text-xs px-3 py-1.5 rounded-sm border border-[#edebe9] text-[#605e5c] hover:bg-[#f3f2f1] transition-colors font-medium"
                  >
                    Collapse All
                  </button>
                </div>
              </div>
            )}

            {/* Department cards */}
            <div className="space-y-2">
              {departments.map((dept) => (
                <DepartmentCard
                  key={dept.id}
                  dept={dept}
                  employees={employeesByDept.get(dept.name) ?? []}
                  expanded={expandedDepts.has(dept.name)}
                  onToggle={() => toggleDept(dept.name)}
                />
              ))}

              {/* Unassigned employees section */}
              {unassignedEmployees.length > 0 && (
                <div className="bg-white rounded-sm shadow-[0_2px_4px_rgba(0,0,0,0.04)] border border-[#edebe9] overflow-hidden">
                  <button
                    onClick={() => toggleDept("__unassigned__")}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#f3f2f1] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-sm bg-[#fff4ce] flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-[#835b00]" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-[#323130]">
                          Unassigned Employees
                        </div>
                        <div className="text-xs text-[#605e5c]">
                          Department not matched &middot;{" "}
                          {unassignedEmployees.length} employee
                          {unassignedEmployees.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-sm bg-[#fff4ce] text-[#835b00] font-medium">
                        unmatched
                      </span>
                      <span className="text-xs text-[#a19f9d] tabular-nums min-w-[2ch] text-right">
                        {unassignedEmployees.length}
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 text-[#a19f9d] transition-transform duration-200 ${expandedDepts.has("__unassigned__") ? "rotate-90" : ""}`}
                      />
                    </div>
                  </button>
                  {expandedDepts.has("__unassigned__") && (
                    <div className="border-t border-[#edebe9] divide-y divide-[#edebe9]">
                      {unassignedEmployees.map((emp) => (
                        <div
                          key={emp.employee_id || emp.id}
                          className="px-5 py-3 flex items-center gap-4 hover:bg-[#faf9f8] transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-[#a19f9d] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                            {emp.name ? emp.name[0] : "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-[#323130] truncate">
                              {emp.name}
                            </div>
                            {emp.position && (
                              <div className="text-xs text-[#605e5c] truncate flex items-center gap-1">
                                <Briefcase className="w-3 h-3 inline-block flex-shrink-0" />
                                {emp.position}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-[#a19f9d] font-mono flex-shrink-0">
                            {emp.employee_id}
                          </div>
                          <div className="text-xs text-[#a19f9d] italic flex-shrink-0">
                            {emp.department || "no dept"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Verification footer */}
            {(departments.length > 0 || data.summary.totalEmployees > 0) && (
              <div className="mt-8 bg-[#dff6dd] border border-[#107c10]/20 rounded-sm px-5 py-4 flex items-start gap-3">
                <Shield className="w-5 h-5 text-[#107c10] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-[#107c10]">
                    Data Verification Summary
                  </div>
                  <p className="text-xs text-[#323130] mt-1 leading-relaxed">
                    {data.summary.totalDepartments} departments and{" "}
                    {data.summary.totalEmployees} active employees loaded from
                    the database. This data was imported from Jiandaoyun during
                    the Clean Slate org seed operation. If the numbers above
                    match your expectations, the import was successful.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
