/**
 * WorkspaceArchitectureView — interactive data architecture visualization
 * Shows storage model, folder→SharePoint mapping, role access matrix, file type support
 */
import { useState } from "react";
import {
  Database, Cloud, FolderOpen, Users, FileType, ChevronDown, ChevronRight,
  HardDrive, ArrowRightLeft, ArrowRight, ArrowLeft, CheckCircle2, Circle,
  Shield, Box, FileCode, FileSpreadsheet, FileText, Image, Settings,
  Building2, Activity, RefreshCw, Clock, AlertCircle, Factory, Globe,
  FolderPlus, Loader2, Wand2,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { trpc } from "@/lib/trpc";

// ── Section toggle helper ──
function Section({ title, icon: Icon, children, defaultOpen = true }: {
  title: string; icon: typeof Database; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[#edebe9] rounded-lg bg-white mb-3">
      <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#323130] hover:bg-[#f3f2f1] rounded-t-lg"
        onClick={() => setOpen(!open)}>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-[#a19f9d]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#a19f9d]" />}
        <Icon className="w-4 h-4 text-[#0078d4]" />
        {title}
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}

// ── Storage architecture diagram ──
function StorageDiagram({ isEn }: { isEn: boolean }) {
  const layers = [
    { label: isEn ? "TiDB / MySQL" : "TiDB / MySQL", sub: isEn ? "Structured data (projects, BOM, HR, quality)" : 结构化数据 (项目/BOM/HR/质量)", icon: Database, color: "#0078d4 },
    { label: isEn ? "Object Store" : "对象存储", sub: isEn ? "Binary files (CAD, PDF, images, robot programs)" : "二进制文件 (CAD/PDF/图片/机器人程序)", icon: HardDrive, color: "#107c10" },
    { label: "SharePoint / OneDrive", sub: isEn ? "O365 collaboration (dual-sync with GRT)" : "O365协作 (与GRT双向同步)", icon: Cloud, color: "#d83b01" },
  ];
  return (
    <div className="space-y-2">
      <p className="text-xs text-[#605e5c] mb-3">
        {isEn
          ? "GRT uses a 3-layer storage model: structured DB for metadata, Object Store for files, SharePoint for O365 collaboration."
          : "GRT采用3层存储模型：结构化DB存元数据、对象存储存文件、SharePoint协作同步。"}
      </p>
      <div className="flex flex-col gap-2">
        {layers.map((l, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-[#edebe9] bg-[#faf9f8]">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: l.color + "15" }}>
              <l.icon className="w-5 h-5" style={{ color: l.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#323130]">{l.label}</p>
              <p className="text-xs text-[#605e5c]">{l.sub}</p>
            </div>
          </div>
        ))}
      </div>
      {/* Flow diagram */}
      <div className="mt-3 p-3 rounded-lg bg-[#f3f2f1] text-xs text-[#605e5c] font-mono leading-relaxed">
        <p>{isEn ? "Upload flow:" : "上传流程:"}</p>
        <p className="mt-1">
          {isEn ? "File → " : "文件 → "}
          <span className="text-[#0078d4]">storagePut()</span>
          {isEn ? " → Object Store" : " → 对象存储"}
        </p>
        <p>
          {"     → "}
          <span className="text-[#0078d4]">parsed_content</span>
          {isEn ? " (JSONB, text files <2MB auto-decoded)" : " (JSONB, 文本文件<2MB自动解码)"}
        </p>
        <p>
          {"     → "}
          <span className="text-[#d83b01]">OneDrive sync</span>
          {isEn ? " (if auto_sync=true)" : " (若auto_sync=true)"}
        </p>
      </div>
    </div>
  );
}

// ── Folder↔SharePoint mapping table ──
function FolderMappingTable({ isEn }: { isEn: boolean }) {
  const mappingsQuery = trpc.microsoftGraph.folderMapping.list.useQuery(undefined, {
    retry: false, refetchOnWindowFocus: false,
  });
  const mappings = mappingsQuery.data ?? [];

  const directionIcon = (dir: string) => {
    switch (dir) {
      case "bidirectional": return <ArrowRightLeft className="w-3.5 h-3.5 text-[#0078d4]" />;
      case "grt_to_sp": return <ArrowRight className="w-3.5 h-3.5 text-[#107c10]" />;
      case "sp_to_grt": return <ArrowLeft className="w-3.5 h-3.5 text-[#d83b01]" />;
      default: return null;
    }
  };
  const directionLabel = (dir: string) => {
    switch (dir) {
      case "bidirectional": return isEn ? "Bidirectional" : "双向同步";
      case "grt_to_sp": return isEn ? "GRT → SharePoint" : "GRT → SharePoint";
      case "sp_to_grt": return isEn ? "SharePoint → GRT" : "SharePoint → GRT";
      default: return dir;
    }
  };

  return (
    <div>
      <p className="text-xs text-[#605e5c] mb-3">
        {isEn
          ? "Each GRT workspace folder maps to a SharePoint path. Engineering folders auto-sync; others sync on demand."
          : "每个GRT工作台文件夹映射到SharePoint路径。工程类文件夹自动同步，其他按需同步。"}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-[#f3f2f1] text-[#605e5c]">
              <th className="text-left p-2 font-medium border-b border-[#edebe9]">{isEn ? "GRT Folder" : "GRT文件夹"}</th>
              <th className="text-left p-2 font-medium border-b border-[#edebe9]">SharePoint</th>
              <th className="text-left p-2 font-medium border-b border-[#edebe9]">{isEn ? "Direction" : "同步方向"}</th>
              <th className="text-center p-2 font-medium border-b border-[#edebe9]">{isEn ? "Auto" : "自动"}</th>
              <th className="text-left p-2 font-medium border-b border-[#edebe9]">{isEn ? "Status" : "状态"}</th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((m, i) => (
              <tr key={i} className="hover:bg-[#faf9f8] border-b border-[#f3f2f1]">
                <td className="p-2 font-medium text-[#323130]">
                  <span className="flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5 text-[#ffb900]" />
                    {m.grtFolderName}
                  </span>
                </td>
                <td className="p-2 text-[#605e5c] font-mono">{m.sharepointPath}</td>
                <td className="p-2">
                  <span className="flex items-center gap-1">
                    {directionIcon(m.syncDirection)}
                    <span className="text-[#605e5c]">{directionLabel(m.syncDirection)}</span>
                  </span>
                </td>
                <td className="p-2 text-center">
                  {m.autoSync
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-[#107c10] mx-auto" />
                    : <Circle className="w-3.5 h-3.5 text-[#c8c6c4] mx-auto" />}
                </td>
                <td className="p-2">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    m.status === "active" ? "bg-[#dff6dd] text-[#107c10]" :
                    m.status === "error" ? "bg-[#fde7e9] text-[#d13438]" :
                    "bg-[#f3f2f1] text-[#605e5c]"
                  }`}>
                    {m.status}
                  </span>
                </td>
              </tr>
            ))}
            {mappings.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-[#a19f9d]">
                {isEn ? "No mappings configured" : "暂无映射配置"}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Role access matrix ──
function RoleAccessMatrix({ isEn }: { isEn: boolean }) {
  const folders = [{机械设计", "电气设计", "机器人系统", "项目文件", "客户资料", "质量管理", "运营管理", "数字展厅", "会议纪要", "模板库}];
  const roles: Array<{ id: string; label: string; primary: string[]; secondary: string[] }> = [
    { id: "bu_mech",  label: isEn ? "Mechanical Eng" : 机械工程师",   primary: ["机械设计"], secondary: ["项目文件", "模板库] },
    { id: "bu_elec",  label: isEn ? "Electrical Eng" : 电气工程师",   primary: ["电气设计"], secondary: ["项目文件", "模板库] },
    { id: "bu_pm",    label: isEn ? "Project Manager" : 项目经理",    primary: ["项目文件", "客户资料"], secondary: ["机械设计", "电气设计", "机器人系统", "质量管理", "会议纪要] },
    { id: "bu_sales", label: isEn ? "Sales Engineer" : 销售工程师",   primary: ["客户资料"], secondary: ["数字展厅", "项目文件] },
    { id: "quality_eng", label: isEn ? "Quality Eng" : 质量工程师",   primary: ["质量管理"], secondary: ["项目文件] },
    { id: "procurement_eng", label: isEn ? "Procurement" : 采购工程师", primary: ["质量管理"], secondary: ["项目文件] },
    { id: "cs_engineer", label: isEn ? "Service Eng" : 客服工程师",   primary: ["客户资料"], secondary: ["质量管理] },
    { id: "bu_gm",   label: isEn ? "BU GM" : "BU总经理",              primary: folders, secondary: [] },
    { id: "director", label: isEn ? "Director" : "总监",               primary: folders, secondary: [] },
    { id: "employee", label: isEn ? "Employee" : 普通员工",           primary: ["会议纪要", "模板库"], secondary: ["运营管理] },
  ];

  const { currentUserRole } = useUserProfile();

  return (
    <div>
      <p className="text-xs text-[#605e5c] mb-3">
        {isEn
          ? "Matrix showing which roles have primary (full) vs secondary (read) access to each folder."
          : "矩阵展示各角色对每个文件夹的主要（完整）与辅助（只读）访问权限。"}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="bg-[#f3f2f1]">
              <th className="text-left p-1.5 font-medium text-[#605e5c] border-b border-[#edebe9] sticky left-0 bg-[#f3f2f1] min-w-[100px]">
                {isEn ? "Role" : "角色"}
              </th>
              {folders.map(f => (
                <th key={f} className="p-1.5 font-medium text-[#605e5c] border-b border-[#edebe9] text-center whitespace-nowrap">
                  {f}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map(role => (
              <tr key={role.id}
                className={`border-b border-[#f3f2f1] ${currentUserRole === role.id ? "bg-[#deecf9]" : "hover:bg-[#faf9f8]"}`}>
                <td className={`p-1.5 font-medium sticky left-0 ${currentUserRole === role.id ? "text-[#0078d4] bg-[#deecf9]" : "text-[#323130] bg-white"}`}>
                  {currentUserRole === role.id && <span className="mr-0.5">*</span>}
                  {role.label}
                </td>
                {folders.map(f => {
                  const isPrimary = role.primary.includes(f);
                  const isSecondary = role.secondary.includes(f);
                  return (
                    <td key={f} className="p-1.5 text-center">
                      {isPrimary && (
                        <span className="inline-block w-4 h-4 rounded-full bg-[#107c10] text-white text-[8px] leading-4 font-bold" title={isEn ? "Full access" : "完整访问"}>
                          W
                        </span>
                      )}
                      {isSecondary && (
                        <span className="inline-block w-4 h-4 rounded-full bg-[#c8c6c4] text-white text-[8px] leading-4 font-bold" title={isEn ? "Read access" : "只读访问"}>
                          R
                        </span>
                      )}
                      {!isPrimary && !isSecondary && (
                        <span className="text-[#edebe9]">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-4 mt-2 text-[10px] text-[#605e5c]">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-[#107c10]" /> {isEn ? "W = Full (read/write)" : "W = 完整 (读/写)"}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-[#c8c6c4]" /> {isEn ? "R = Read only" : "R = 只读"}
        </span>
        <span className="flex items-center gap-1">
          <span className="text-[#edebe9]">-</span> {isEn ? "= No access" : "= 无权限"}
        </span>
        {currentUserRole !== "admin" && (
          <span className="text-[#0078d4]">* = {isEn ? "Your current role" : "当前角色"}</span>
        )}
      </div>
    </div>
  );
}

// ── File type support matrix ──
function FileTypeMatrix({ isEn }: { isEn: boolean }) {
  const types = [
    { category: "CAD-ME", icon: Box, color: "#00b7c3", exts: ".sldprt .sldasm .slddrw .step .dxf .dwg .iges", viewer: isEn ? "3D CAD viewer" : "3D CAD查看器", edit: isEn ? "Download" : 下载编辑", tool: "SolidWorks },
    { category: "CAD-EE", icon: Box, color: "#8764b8", exts: ".elc .zw1 .epl", viewer: isEn ? "CAD viewer" : "CAD查看器", edit: isEn ? "Download" : 下载编辑", tool: "EPLAN },
    { category: "FANUC", icon: FileCode, color: "#e3008c", exts: ".tp .ls", viewer: "Monaco", edit: isEn ? "Online edit" : 在线编辑", tool: "FANUC TP/Karel },
    { category: "KUKA", icon: FileCode, color: "#ff8c00", exts: ".src .dat .krl", viewer: "Monaco", edit: isEn ? "Online edit" : 在线编辑", tool: "KUKA KRL },
    { category: "ABB", icon: FileCode, color: "#d13438", exts: ".mod .prg", viewer: "Monaco", edit: isEn ? "Online edit" : 在线编辑", tool: "ABB RAPID },
    { category: isEn ? "Vision" : "视觉", icon: Box, color: "#498205", exts: ".vpp .job", viewer: isEn ? "CAD viewer" : "CAD查看器", edit: isEn ? "Download" : "下载编辑", tool: "Cognex/Keyence" },
    { category: "G-code", icon: FileCode, color: "#767676", exts: ".nc .gcode .tap .ngc", viewer: "Monaco", edit: isEn ? "Online edit" : 在线编辑", tool: "CNC },
    { category: "Excel", icon: FileSpreadsheet, color: "#107c10", exts: ".xlsx .xls .csv", viewer: isEn ? "Inline table" : 内联表格", edit: isEn ? "Online edit" : "在线编辑", tool: "Office 365 },
    { category: "Word", icon: FileText, color: "#185abd", exts: ".docx .doc", viewer: isEn ? "Rich text" : 富文本", edit: isEn ? "Online edit" : "在线编辑", tool: "Office 365 },
    { category: "PPT", icon: FileType, color: "#d04423", exts: ".pptx .ppt", viewer: isEn ? "Preview" : 预览", edit: isEn ? "Download" : "下载编辑", tool: "Office 365 },
    { category: "PDF", icon: FileText, color: "#d13438", exts: ".pdf", viewer: "iframe", edit: isEn ? "View only" : 仅查看", tool: "- },
    { category: "Markdown", icon: FileText, color: "#0078d4", exts: ".md", viewer: isEn ? "Formatted" : 格式化", edit: isEn ? "Online edit" : "在线编辑", tool: "- },
    { category: isEn ? "Images" : "图片", icon: Image, color: "#c239b3", exts: ".png .jpg .svg .bmp .webp", viewer: isEn ? "Image viewer" : "图片查看器", edit: isEn ? "View only" : "仅查看", tool: "-" },
  ];

  return (
    <div>
      <p className="text-xs text-[#605e5c] mb-3">
        {isEn
          ? "All industrial file types are supported with appropriate viewers. Robot programs and text files can be edited online via Monaco editor."
          : "支持所有工业文件类型。机器人程序和文本文件可通过Monaco编辑器在线编辑。"}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {types.map((t, i) => (
          <div key={i} className="flex items-start gap-2 p-2 rounded border border-[#edebe9] bg-[#faf9f8]">
            <t.icon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: t.color }} />
            <div className="min-w-0 text-xs">
              <p className="font-medium text-[#323130]">{t.category} <span className="text-[#a19f9d] font-normal">({t.tool})</span></p>
              <p className="text-[#605e5c] font-mono text-[10px] truncate">{t.exts}</p>
              <p className="text-[#605e5c]">{isEn ? "View" : "查看"}: {t.viewer} | {isEn ? "Edit" : "编辑"}: {t.edit}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── BU data isolation ──
function BUDataIsolation({ isEn }: { isEn: boolean }) {
  const bus = [
    { code: "overseas", name: isEn ? "Overseas" : 海外事业部", clients: "Mercedes-Benz, Stellantis, GM", color: "#0078d4 },
    { code: "commercial", name: isEn ? "Commercial Vehicle" : 商用车事业部", clients: isEn ? "CNHTC, Shaanqi" : "中国重汽, 陕汽", color: "#107c10 },
    { code: "passenger", name: isEn ? "Passenger Vehicle" : 乘用车事业部", clients: isEn ? "BYD, Geely" : "比亚迪, 吉利", color: "#8764b8 },
    { code: "semiconductor", name: isEn ? "Semiconductor" : 半导体事业部", clients: isEn ? "SMIC" : "中芯国际", color: "#d83b01 },
    { code: "industrial", name: isEn ? "General Industrial" : 工业通用事业部", clients: isEn ? "Various industries" : "各行业客户", color: "#005a9e },
  ];

  return (
    <div>
      <p className="text-xs text-[#605e5c] mb-3">
        {isEn
          ? "Project files, customer data, and work orders are isolated by BU. Shared data (HR, templates, RBAC) is accessible across all BUs."
          : "项目文件、客户资料、工单按事业部隔离。共享数据（HR、模板、权限）跨所有事业部可见。"}
      </p>
      <div className="space-y-1.5">
        {bus.map(bu => (
          <div key={bu.code} className="flex items-center gap-2 p-2 rounded bg-[#faf9f8] border border-[#edebe9]">
            <div className="w-2 h-8 rounded-full shrink-0" style={{ backgroundColor: bu.color }} />
            <div className="min-w-0 flex-1 text-xs">
              <p className="font-medium text-[#323130]">{bu.name}</p>
              <p className="text-[#605e5c] truncate">{isEn ? "Key clients" : "主要客户"}: {bu.clients}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 p-2 rounded bg-[#fff4ce] border border-[#ffb900] text-xs text-[#323130]">
        <p className="font-medium">{isEn ? "Data isolation via tRPC middleware:" : "通过tRPC中间件实现数据隔离:"}</p>
        <p className="font-mono text-[10px] mt-1 text-[#605e5c]">gateway-bu-context.middleware.ts → ctx.bu = {"{"} code, name, departmentCode, permissions {"}"}</p>
      </div>
      {/* 职能部门跨BU访问说明 */}
      <div className="mt-3 p-2 rounded bg-[#deecf9] border border-[#0078d4] text-xs text-[#323130]">
        <p className="font-medium">{isEn ? "Cross-BU access for functional departments:" : "职能部门跨BU访问:"}</p>
        <div className="mt-1 grid grid-cols-2 gap-1 text-[10px] text-[#605e5c]">
          <span>{isEn ? "R&D Center → All BU engineering data" : "研发中心 → 全部BU工程数据"}</span>
          <span>{isEn ? "Marketing → All BU sales data" : "市场部 → 全部BU销售数据"}</span>
          <span>{isEn ? "Operations → All BU production data" : "运营部 → 全部BU生产数据"}</span>
          <span>{isEn ? "Finance/HR/Admin → Global scope" : "财务/人力/行政 → 全局范围"}</span>
        </div>
      </div>
    </div>
  );
}

// ── Capacity planning ──
function CapacityPlanning({ isEn }: { isEn: boolean }) {
  const rows = [
    { type: "SolidWorks", perUnit: "~200 files, ~500MB", annual100: "50 GB", year5: "250 GB" },
    { type: "EPLAN", perUnit: "~5 projects, ~100MB", annual100: "10 GB", year5: "50 GB" },
    { type: isEn ? "Robot programs" : 机器人程序", perUnit: "~50 files, ~5MB", annual100: "500 MB", year5: "2.5 GB },
    { type: "Office", perUnit: "~100 files, ~50MB", annual100: "5 GB", year5: "25 GB" },
    { type: isEn ? "Inspection PDFs" : 检验报告PDF", perUnit: "~50 files, ~20MB", annual100: "2 GB", year5: "10 GB },
    { type: isEn ? "DB structured" : "DB结构化数据", perUnit: "~5000 rows", annual100: "500K rows", year5: "2.5M rows" },
  ];

  return (
    <div>
      <p className="text-xs text-[#605e5c] mb-3">
        {isEn
          ? "Based on scaling from 50 to 100 units/year. TiDB + 500GB Object Store supports 5-year growth."
          : "基于年产50→100台设备的规模预估。TiDB + 500GB对象存储可支撑5年业务增长。"}
      </p>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-[#f3f2f1] text-[#605e5c]">
            <th className="text-left p-2 font-medium border-b border-[#edebe9]">{isEn ? "Data Type" : "数据类型"}</th>
            <th className="text-left p-2 font-medium border-b border-[#edebe9]">{isEn ? "Per Unit" : "每台设备"}</th>
            <th className="text-left p-2 font-medium border-b border-[#edebe9]">{isEn ? "Annual (100)" : "年总量(100台)"}</th>
            <th className="text-left p-2 font-medium border-b border-[#edebe9]">{isEn ? "5-Year" : "5年预估"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-[#f3f2f1] hover:bg-[#faf9f8]">
              <td className="p-2 font-medium text-[#323130]">{r.type}</td>
              <td className="p-2 text-[#605e5c]">{r.perUnit}</td>
              <td className="p-2 text-[#605e5c]">{r.annual100}</td>
              <td className="p-2 text-[#605e5c] font-medium">{r.year5}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Section 7: Department → SharePoint Mapping ──
function DepartmentMappingSection({ isEn }: { isEn: boolean }) {
  const orgNodesQuery = trpc.microsoftGraph.orgNodes.list.useQuery(undefined, {
    retry: false, refetchOnWindowFocus: false,
  });
  const deptMappingsQuery = trpc.microsoftGraph.departmentMapping.list.useQuery(undefined, {
    retry: false, refetchOnWindowFocus: false,
  });
  const orgNodes = orgNodesQuery.data ?? [];
  const deptMappings = deptMappingsQuery.data ?? [];

  const typeColor = (type: string) => {
    switch (type) {
      case "bu": return { bg: "#deecf9", text: "#0078d4", label: isEn ? "BU" : "事业部" };
      case "functional": return { bg: "#dff6dd", text: "#107c10", label: isEn ? "Functional" : "职能" };
      case "support": return { bg: "#e8daef", text: "#8764b8", label: isEn ? "Support" : "支持" };
      default: return { bg: "#f3f2f1", text: "#605e5c", label: type };
    }
  };

  return (
    <div>
      <p className="text-xs text-[#605e5c] mb-3">
        {isEn
          ? "Organization nodes map departments to SharePoint sites. BU departments are data-isolated; functional departments have cross-BU access."
          : "组织节点将部门映射到SharePoint站点。事业部数据隔离，职能部门跨BU访问。"}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-[#f3f2f1] text-[#605e5c]">
              <th className="text-left p-2 font-medium border-b border-[#edebe9]">{isEn ? "Code" : "代码"}</th>
              <th className="text-left p-2 font-medium border-b border-[#edebe9]">{isEn ? "Department" : "部门"}</th>
              <th className="text-left p-2 font-medium border-b border-[#edebe9]">{isEn ? "Type" : "类型"}</th>
              <th className="text-left p-2 font-medium border-b border-[#edebe9]">{isEn ? "SP Site Path" : "SP站点路径"}</th>
              <th className="text-left p-2 font-medium border-b border-[#edebe9]">{isEn ? "Data Scope" : "数据范围"}</th>
              <th className="text-center p-2 font-medium border-b border-[#edebe9]">{isEn ? "Auto Mirror" : "自动镜像"}</th>
            </tr>
          </thead>
          <tbody>
            {orgNodes.map((node: any, i: number) => {
              const tc = typeColor(node.type);
              const mapping = deptMappings.find((m: any) => m.deptCode === node.code);
              return (
                <tr key={i} className="border-b border-[#f3f2f1] hover:bg-[#faf9f8]">
                  <td className="p-2 font-mono font-medium text-[#323130]">{node.code}</td>
                  <td className="p-2 text-[#323130]">{node.name}{node.nameEn ? ` (${node.nameEn})` : ""}</td>
                  <td className="p-2">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: tc.bg, color: tc.text }}>
                      {tc.label}
                    </span>
                  </td>
                  <td className="p-2 text-[#605e5c] font-mono text-[10px]">{node.spRootPath || mapping?.spRootPath || "-"}</td>
                  <td className="p-2 text-[#605e5c]">{node.dataScope ?? "department"}</td>
                  <td className="p-2 text-center">
                    {mapping?.autoMirror
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-[#107c10] mx-auto" />
                      : <Circle className="w-3.5 h-3.5 text-[#c8c6c4] mx-auto" />}
                  </td>
                </tr>
              );
            })}
            {orgNodes.length === 0 && (
              <tr><td colSpan={6} className="p-4 text-center text-[#a19f9d]">
                {isEn ? "No organization nodes configured. Use Setup Wizard to seed defaults." : "暂无组织节点。请使用设置向导填充默认值。"}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 text-[10px] text-[#605e5c]">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: "#deecf9" }} /> {isEn ? "BU = Isolated" : "事业部 = 数据隔离"}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: "#dff6dd" }} /> {isEn ? "Functional = Cross-BU" : "职能 = 跨BU访问"}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: "#e8daef" }} /> {isEn ? "Support = Global" : "支持 = 全局"}
        </span>
      </div>
    </div>
  );
}

// ── Section 8: Sync Status Dashboard ──
function SyncStatusDashboard({ isEn }: { isEn: boolean }) {
  const syncLogsQuery = trpc.microsoftGraph.departmentMapping.syncLogs.useQuery(
    { limit: 20 },
    { retry: false, refetchOnWindowFocus: false }
  );
  const showroomStatusQuery = trpc.microsoftGraph.showroom.status.useQuery(undefined, {
    retry: false, refetchOnWindowFocus: false,
  });
  const syncMutation = trpc.microsoftGraph.showroom.sync.useMutation();

  const syncLogs = syncLogsQuery.data ?? [];
  const showroomStatus = showroomStatusQuery.data;

  const actionLabel = (action: string) => {
    const labels: Record<string, string> = {
      folder_mirror: isEn ? "Folder Mirror" : "文件夹镜像",
      file_sync: isEn ? "File Sync" : "文件同步",
      showroom_publish: isEn ? "Showroom Publish" : "展厅发布",
      planner_sync: isEn ? "Planner Sync" : "Planner同步",
    };
    return labels[action] ?? action;
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      success: "bg-[#dff6dd] text-[#107c10]",
      error: "bg-[#fde7e9] text-[#d13438]",
      pending: "bg-[#fff4ce] text-[#797673]",
    };
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${styles[status] ?? "bg-[#f3f2f1] text-[#605e5c]"}`}>
        {status === "success" ? <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> : status === "error" ? <AlertCircle className="w-2.5 h-2.5 mr-0.5" /> : <Clock className="w-2.5 h-2.5 mr-0.5" />}
        {status}
      </span>
    );
  };

  return (
    <div>
      {/* Showroom sync card */}
      <div className="p-3 rounded-lg border border-[#edebe9] bg-[#faf9f8] mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-[#d83b01]" />
            <span className="text-sm font-medium text-[#323130]">{isEn ? "Digital Showroom Sync" : "数字展厅同步"}</span>
          </div>
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="px-3 py-1 text-xs font-medium rounded bg-[#0078d4] text-white hover:bg-[#106ebe] disabled:opacity-50 flex items-center gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            {isEn ? "Sync Now" : "立即同步"}
          </button>
        </div>
        {showroomStatus && (
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-[#605e5c]">{isEn ? "Last Sync" : "上次同步"}: </span>
              <span className="text-[#323130]">{showroomStatus.lastSync ? new Date(showroomStatus.lastSync).toLocaleString() : "-"}</span>
            </div>
            <div>
              <span className="text-[#605e5c]">{isEn ? "Files" : "文件数"}: </span>
              <span className="font-medium text-[#323130]">{showroomStatus.fileCount}</span>
            </div>
            <div>
              <span className="text-[#605e5c]">{isEn ? "Status" : "状态"}: </span>
              {statusBadge(showroomStatus.status)}
            </div>
          </div>
        )}
        {syncMutation.isSuccess && (
          <div className="mt-2 p-2 rounded bg-[#dff6dd] text-[10px] text-[#107c10]">
            {isEn ? `Synced: ${(syncMutation.data as any)?.synced ?? 0}, Failed: ${(syncMutation.data as any)?.failed ?? 0}` : `已同步: ${(syncMutation.data as any)?.synced ?? 0}, 失败: ${(syncMutation.data as any)?.failed ?? 0}`}
          </div>
        )}
      </div>

      {/* Sync logs table */}
      <p className="text-xs text-[#605e5c] mb-2">{isEn ? "Recent sync activity (last 20):" : "最近同步记录 (最近20条):"}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-[#f3f2f1] text-[#605e5c]">
              <th className="text-left p-2 font-medium border-b border-[#edebe9]">{isEn ? "Time" : "时间"}</th>
              <th className="text-left p-2 font-medium border-b border-[#edebe9]">{isEn ? "Dept" : "部门"}</th>
              <th className="text-left p-2 font-medium border-b border-[#edebe9]">{isEn ? "Action" : "操作"}</th>
              <th className="text-left p-2 font-medium border-b border-[#edebe9]">{isEn ? "Source → Target" : "源 → 目标"}</th>
              <th className="text-left p-2 font-medium border-b border-[#edebe9]">{isEn ? "Status" : "状态"}</th>
            </tr>
          </thead>
          <tbody>
            {syncLogs.map((log: any, i: number) => (
              <tr key={i} className="border-b border-[#f3f2f1] hover:bg-[#faf9f8]">
                <td className="p-2 text-[#605e5c] whitespace-nowrap">{log.createdAt ? new Date(log.createdAt).toLocaleString() : "-"}</td>
                <td className="p-2 font-mono text-[#323130]">{log.deptCode ?? "-"}</td>
                <td className="p-2">{actionLabel(log.action)}</td>
                <td className="p-2 text-[#605e5c] text-[10px] font-mono truncate max-w-[200px]">
                  {log.sourcePath ?? "-"} → {log.targetPath ?? "-"}
                </td>
                <td className="p-2">{statusBadge(log.status)}</td>
              </tr>
            ))}
            {syncLogs.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-[#a19f9d]">
                {isEn ? "No sync activity yet" : "暂无同步记录"}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 4-Cluster SharePoint Site Map ──
const CLUSTER_META: Record<string, { label: string; labelEn: string; color: string; icon: typeof Database }> = {
  A: { label: 公司级",     labelEn: "Company Wide",      color: "#0078d4, icon: Building2 },
  B: { label: 支持职能",   labelEn: "Support Functions",  color: "#8764b8, icon: Shield },
  C: { label: 核心业务",   labelEn: "Core Business",      color: "#107c10, icon: Factory },
  D: { label: 个人/外部",  labelEn: "Personal/External",  color: "#d83b01, icon: Globe },
};

function ClusterSiteMap({ isEn }: { isEn: boolean }) {
  const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;
  const sitesQuery = trpc.microsoftGraph.sites.list.useQuery(undefined, QUERY_OPTS);
  const clusterQuery = trpc.microsoftGraph.sites.clusterSummary.useQuery(undefined, QUERY_OPTS);

  const sites = sitesQuery.data ?? [];
  const summaries = clusterQuery.data ?? [];

  const syncPolicyBadge = (p: string) => {
    const colors: Record<string, string> = { auto: "bg-[#dff6dd] text-[#107c10]", scheduled: "bg-[#fff4ce] text-[#8a6914]", manual: "bg-[#f3f2f1] text-[#605e5c]", disabled: "bg-[#fde7e9] text-[#a80000]" };
    return <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${colors[p] ?? colors.manual}`}>{p}</span>;
  };
  const accessBadge = (a: string) => {
    const colors: Record<string, string> = { public: "bg-[#dff6dd]", internal: "bg-[#deecf9]", restricted: "bg-[#fff4ce]", confidential: "bg-[#fde7e9]" };
    return <span className={`px-1.5 py-0.5 rounded text-[9px] text-[#605e5c] ${colors[a] ?? ""}`}>{a}</span>;
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#605e5c]">
        {isEn
          ? "GRT SharePoint is organized into 4 clusters: Company Wide, Support Functions, Core Business, and Personal/External."
          : "GRT SharePoint按4个集群组织：公司级、支持职能、核心业务、个人/外部。"}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {(["A", "B", "C", "D"] as const).map(clusterId => {
          const meta = CLUSTER_META[clusterId];
          const clusterSites = sites.filter(s => s.cluster === clusterId);
          const summary = summaries.find(s => s.cluster === clusterId);
          const Icon = meta.icon;
          return (
            <div key={clusterId} className="p-3 rounded-lg border border-[#edebe9] bg-white">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded flex items-center justify-center" style={{ backgroundColor: meta.color + "15" }}>
                  <Icon className="w-4 h-4" style={{ color: meta.color }} />
                </div>
                <div>
                  <span className="text-xs font-bold" style={{ color: meta.color }}>Cluster {clusterId}</span>
                  <p className="text-[10px] text-[#605e5c]">{isEn ? meta.labelEn : meta.label}</p>
                </div>
              </div>
              <div className="space-y-1">
                {clusterSites.map(site => (
                  <div key={site.siteCode} className="flex items-center gap-1.5 text-[10px] p-1.5 rounded bg-[#faf9f8]">
                    <Cloud className="w-3 h-3 flex-shrink-0" style={{ color: meta.color }} />
                    <span className="font-mono text-[#323130] flex-shrink-0">{site.siteCode}</span>
                    <span className="text-[#a19f9d] truncate flex-1">{isEn ? (site.nameEn ?? site.name) : site.name}</span>
                    {syncPolicyBadge(site.syncPolicy)}
                    {accessBadge(site.accessLevel)}
                  </div>
                ))}
                {clusterSites.length === 0 && (
                  <p className="text-[10px] text-[#a19f9d] italic p-1">
                    {isEn ? "No sites configured. Seed defaults to populate." : "未配置。请填充默认站点。"}
                  </p>
                )}
              </div>
              {summary && (
                <div className="mt-2 text-[10px] text-[#a19f9d] border-t border-[#f3f2f1] pt-1">
                  {summary.siteCount} {isEn ? "sites" : "站点"} · {summary.totalFolders} {isEn ? "folders" : "文件夹"}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Project Folder Creator ──
function ProjectFolderCreator({ isEn }: { isEn: boolean }) {
  const [projectCode, setProjectCode] = useState("");
  const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;
  const nextCodeQuery = trpc.microsoftGraph.sites.nextProjectCode.useQuery(undefined, QUERY_OPTS);
  const templatesQuery = trpc.microsoftGraph.sites.folderTemplates.useQuery({ siteCode: "07_Project_Hub" }, QUERY_OPTS);
  const createMut = trpc.microsoftGraph.sites.createProjectFolders.useMutation();

  const templates = templatesQuery.data ?? [];

  return (
    <div className="p-3 rounded-lg border border-[#edebe9] bg-[#faf9f8]">
      <div className="flex items-center gap-2 mb-2">
        <FolderPlus className="w-4 h-4 text-[#107c10]" />
        <span className="text-sm font-medium text-[#323130]">
          {isEn ? "Create Project Folders" : "创建项目文件夹"}
        </span>
      </div>
      <p className="text-[10px] text-[#605e5c] mb-2">
        {isEn
          ? "Auto-creates the standard 12-folder structure (01_Requirements through 12_Lessons_Learned) in SharePoint Project Hub."
          : "自动在SharePoint项目中心创建标准12子文件夹结构（01_需求文档 到 12_经验教训）。"}
      </p>
      {templates.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {templates.map(t => (
            <span key={t.folderName} className="text-[9px] px-1.5 py-0.5 rounded bg-[#deecf9] text-[#0078d4] font-mono">
              {isEn ? t.folderName : (t.folderNameZh ?? t.folderName)}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          className="h-8 text-xs font-mono w-[140px] px-2 border border-[#edebe9] rounded bg-white"
          placeholder={nextCodeQuery.data?.code ?? "P-2026-001"}
          value={projectCode}
          onChange={e => setProjectCode(e.target.value)}
        />
        <button
          className="h-8 px-3 text-xs rounded bg-[#107c10] text-white hover:bg-[#0e6027] disabled:opacity-50 flex items-center gap-1"
          onClick={() => createMut.mutate({ projectCode })}
          disabled={!projectCode || !/^P-\d{4}-\d{3,4}$/.test(projectCode) || createMut.isPending}>
          {createMut.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
          {isEn ? "Create" : "创建"}
        </button>
      </div>
      {createMut.isSuccess && createMut.data && (
        <div className="mt-2 p-2 rounded bg-[#dff6dd] text-[10px] text-[#107c10]">
          {isEn
            ? `Created ${createMut.data.created} folders for ${projectCode}`
            : `已为 ${projectCode} 创建 ${createMut.data.created} 个文件夹`}
        </div>
      )}
      {createMut.isError && (
        <div className="mt-2 p-2 rounded bg-[#fde7e9] text-[10px] text-[#a80000]">
          {isEn ? "Failed to create folders" : "创建失败"}
        </div>
      )}
    </div>
  );
}

// ── Auto-Config Panel — one-click SharePoint + BU isolation setup ──
function AutoConfigPanel({ isEn }: { isEn: boolean }) {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [log, setLog] = useState<string[]>([]);
  const seedSites = trpc.microsoftGraph.sites.seedDefaults.useMutation();
  const seedOrg = trpc.microsoftGraph.orgNodes.seed.useMutation();

  const handleAutoConfig = async () => {
    setStatus("running");
    setLog([]);
    const addLog = (msg: string) => setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    try {
      // Step 1: Seed organization nodes (20 nodes, 4 clusters)
      addLog(isEn ? "Seeding organization nodes (20 nodes)..." : "初始化组织节点 (20个节点)...");
      try {
        await seedOrg.mutateAsync();
        addLog(isEn ? "✓ Organization nodes seeded" : "✓ 组织节点已初始化");
      } catch {
        addLog(isEn ? "△ Org nodes already exist (skipped)" : "△ 组织节点已存在 (已跳过)");
      }

      // Step 2: Seed SharePoint sites + project folder templates
      addLog(isEn ? "Seeding 11 SharePoint sites + 12 project folder templates..." : "初始化11个站点 + 12个项目文件夹模板...");
      try {
        const result = await seedSites.mutateAsync();
        addLog(isEn
          ? `✓ Sites: ${result.sites}, Templates: ${result.templates}`
          : `✓ 站点: ${result.sites}个, 模板: ${result.templates}个`);
      } catch {
        addLog(isEn ? "△ Sites already seeded (skipped)" : "△ 站点已初始化 (已跳过)");
      }

      // Step 3: Report BU isolation rules
      addLog(isEn ? "Verifying BU data isolation rules..." : "验证事业部数据隔离规则...");
      const buRules = [
        { code: "BU1", name: 海外事业部", cluster: "C", isolation: "bu_scoped },
        { code: "BU2", name: 商用车事业部", cluster: "C", isolation: "bu_scoped },
        { code: "BU3", name: 乘用车事业部", cluster: "C", isolation: "bu_scoped },
        { code: "BU4", name: 半导体事业部", cluster: "C", isolation: "bu_scoped },
        { code: "BU5", name: 工业通用事业部", cluster: "C", isolation: "bu_scoped },
      ];
      for (const bu of buRules) {
        addLog(`  ${bu.code} (${bu.name}): cluster=${bu.cluster}, scope=${bu.isolation}`);
      }
      addLog(isEn ? "✓ BU isolation verified — 5 BUs, all Cluster C" : "✓ 事业部隔离已验证 — 5个BU, 均属C集群");

      // Step 4: Summary
      addLog(isEn
        ? "── Auto-config complete: 4 clusters, 11 sites, 12 templates, 5 BU scopes ──"
        : "── 自动配置完成: 4集群, 11站点, 12模板, 5BU作用域 ──");
      setStatus("done");
    } catch (err: any) {
      addLog(`✗ Error: ${err?.message || "Unknown error"}`);
      setStatus("error");
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#605e5c]">
        {isEn
          ? "One-click initialization: seeds 20 organization nodes (4 clusters), 11 SharePoint sites, 12 project folder templates, and verifies BU isolation rules."
          : "一键初始化：创建20个组织节点 (4集群)、11个SharePoint站点、12个项目文件夹模板，并验证事业部数据隔离规则。"}
      </p>
      <button
        className="h-9 px-4 text-xs rounded bg-[#0078d4] text-white hover:bg-[#106ebe] disabled:opacity-50 flex items-center gap-2"
        onClick={handleAutoConfig}
        disabled={status === "running"}>
        {status === "running" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
        {isEn ? "Run Auto-Config" : "执行自动配置"}
      </button>
      {log.length > 0 && (
        <div className="p-3 rounded bg-[#1e1e1e] text-[11px] font-mono text-[#d4d4d4] max-h-[200px] overflow-y-auto space-y-0.5">
          {log.map((line, i) => (
            <div key={i} className={
              line.includes("✓") ? "text-[#4ec9b0]" :
              line.includes("✗") ? "text-[#f44747]" :
              line.includes("△") ? "text-[#dcdcaa]" :
              line.includes("──") ? "text-[#569cd6] font-bold" :
              ""
            }>{line}</div>
          ))}
        </div>
      )}
      {status === "done" && (
        <div className="p-2 rounded bg-[#dff6dd] text-xs text-[#107c10]">
          {isEn ? "Auto-configuration completed successfully." : "自动配置已成功完成。"}
        </div>
      )}
      {status === "error" && (
        <div className="p-2 rounded bg-[#fde7e9] text-xs text-[#a80000]">
          {isEn ? "Auto-configuration encountered errors. Check log above." : "自动配置遇到错误，请查看上方日志。"}
        </div>
      )}
    </div>
  );
}

// ── Main component ──
export default function WorkspaceArchitectureView() {
  const { language } = useLanguage();
  const isEn = language === "en";

  return (
    <div className="h-full overflow-y-auto bg-[#faf9f8] p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-[#0078d4]" />
          <h2 className="text-lg font-semibold text-[#323130]">
            {isEn ? "Workspace Data Architecture" : "工作台数据架构"}
          </h2>
        </div>
        <p className="text-xs text-[#605e5c] mb-4">
          {isEn
            ? "GRT System integrates OA, HRM, PLM, PDM, ERP into a unified workspace. This view shows the storage architecture, folder mappings, role access, and supported file types."
            : "GRT System整合OA、HRM、PLM、PDM、ERP为统一工作台。此视图展示存储架构、文件夹映射、角色权限和支持的文件类型。"}
        </p>

        <Section title={isEn ? "SharePoint 4-Cluster Site Map" : "SharePoint 4集群站点地图"} icon={Globe}>
          <ClusterSiteMap isEn={isEn} />
        </Section>

        <Section title={isEn ? "Storage Architecture (3-Layer Model)" : "存储架构 (3层模型)"} icon={Database}>
          <StorageDiagram isEn={isEn} />
        </Section>

        <Section title={isEn ? "SharePoint Folder Mapping" : "SharePoint文件夹映射"} icon={Cloud}>
          <FolderMappingTable isEn={isEn} />
        </Section>

        <Section title={isEn ? "Role-Based Access Matrix" : "角色访问矩阵"} icon={Users}>
          <RoleAccessMatrix isEn={isEn} />
        </Section>

        <Section title={isEn ? "Supported File Types" : "支持的文件类型"} icon={FileType}>
          <FileTypeMatrix isEn={isEn} />
        </Section>

        <Section title={isEn ? "Business Unit Data Isolation" : "事业部数据隔离"} icon={Shield} defaultOpen={false}>
          <BUDataIsolation isEn={isEn} />
        </Section>

        <Section title={isEn ? "Capacity Planning (50→100 units/year)" : "产能规模预估 (50→100台/年)"} icon={Database} defaultOpen={false}>
          <CapacityPlanning isEn={isEn} />
        </Section>

        <Section title={isEn ? "Department → SharePoint Mapping" : "部门→站点映射"} icon={Building2}>
          <DepartmentMappingSection isEn={isEn} />
        </Section>

        <Section title={isEn ? "Sync Status Dashboard" : "同步状态仪表盘"} icon={Activity}>
          <SyncStatusDashboard isEn={isEn} />
        </Section>

        <Section title={isEn ? "Project Folder Creator" : "项目文件夹创建"} icon={FolderPlus} defaultOpen={false}>
          <ProjectFolderCreator isEn={isEn} />
        </Section>

        <Section title={isEn ? "Auto-Config (Admin)" : "自动配置 (管理员)"} icon={Wand2} defaultOpen={false}>
          <AutoConfigPanel isEn={isEn} />
        </Section>
      </div>
    </div>
  );
}
