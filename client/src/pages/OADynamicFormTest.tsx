import { useState } from "react";
import UniversalDynamicForm from "@/components/UniversalDynamicForm";
import FluentTable, { type FluentColumn } from "@/components/FluentTable";
import GrtEnterpriseLayout from "@/components/Layout/GrtEnterpriseLayout";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Eye, Pencil, Table2 } from "lucide-react";

// ── Mock Jiandaoyun Leave Request schema (请假申请) ──

const LEAVE_REQUEST_FIELDS = [
  {
    name: "leaveType",
    label: "请假类型",
    labelEn: "Leave Type",
    type: "select" as const,
    required: true,
    options: [
      { value: "annual", label: "年假" },
      { value: "sick", label: "病假" },
      { value: "personal", label: "事假" },
      { value: "maternity", label: "产假" },
      { value: "paternity", label: "陪产假" },
      { value: "marriage", label: "婚假" },
      { value: "bereavement", label: "丧假" },
      { value: "compensatory", label: "调休" },
    ],
    gridCol: 6,
    group: "请假信息",
  },
  {
    name: "totalDays",
    label: "请假天数",
    labelEn: "Total Days",
    type: "number" as const,
    required: true,
    placeholder: "输入天数",
    validation: { min: 0.5, max: 365, message: "请假天数必须在0.5~365之间" },
    gridCol: 6,
    group: "请假信息",
  },
  {
    name: "startDate",
    label: "开始日期",
    type: "date" as const,
    required: true,
    gridCol: 6,
    group: "请假信息",
  },
  {
    name: "endDate",
    label: "结束日期",
    type: "date" as const,
    required: true,
    gridCol: 6,
    group: "请假信息",
  },
  {
    name: "reason",
    label: "请假事由",
    type: "textarea" as const,
    required: true,
    placeholder: "请详细说明请假原因",
    validation: { minLength: 5, message: "请假事由至少5个字符" },
    gridCol: 12,
    group: "请假信息",
  },
  {
    name: "needSickNote",
    label: "是否需要病假证明",
    type: "checkbox" as const,
    gridCol: 6,
    group: "附加信息",
    visibleIf: { field: "leaveType", operator: "eq" as const, value: "sick" },
    helpText: "病假超过3天需提供医院证明",
  },
  {
    name: "hospitalName",
    label: "医院名称",
    type: "text" as const,
    placeholder: "就诊医院",
    gridCol: 6,
    group: "附加信息",
    visibleIf: { field: "leaveType", operator: "eq" as const, value: "sick" },
  },
  {
    name: "emergencyContact",
    label: "紧急联系人",
    type: "user" as const,
    gridCol: 6,
    group: "附加信息",
  },
  {
    name: "emergencyPhone",
    label: "紧急联系电话",
    type: "text" as const,
    placeholder: "手机号码",
    validation: { pattern: "^1[3-9]\\d{9}$", message: "请输入有效的手机号" },
    gridCol: 6,
    group: "附加信息",
  },
  {
    name: "handoverPerson",
    label: "工作交接人",
    type: "user" as const,
    gridCol: 6,
    group: "工作交接",
  },
  {
    name: "handoverNotes",
    label: "交接事项说明",
    type: "textarea" as const,
    placeholder: "请说明需要交接的工作内容",
    gridCol: 12,
    group: "工作交接",
  },
  {
    name: "attachment",
    label: "附件上传",
    type: "file" as const,
    gridCol: 12,
    group: "工作交接",
    helpText: "支持上传病假证明、审批单等文件",
  },
];

// ── Sample submitted data for read-only view ──

const SAMPLE_SUBMITTED_DATA = {
  leaveType: "sick",
  totalDays: 3,
  startDate: "2026-02-23",
  endDate: "2026-02-25",
  reason: "身体不适，需要到医院检查治疗，预计需要休息3天恢复。",
  needSickNote: true,
  hospitalName: "上海市第一人民医院",
  emergencyContact: "李明 (工号: GRT-0042)",
  emergencyPhone: "13912345678",
  handoverPerson: "张伟 (工号: GRT-0018)",
  handoverNotes: "1. M5项目BOM审核交给张伟跟进\n2. 周三供应商审核会议由张伟代参加\n3. 质检报告本周五前提交，已完成80%",
  attachment: "病假证明_20260223.pdf",
};

// ── FluentTable demo data ──

interface LeaveRecord {
  id: string;
  applicant: string;
  type: string;
  days: number;
  startDate: string;
  endDate: string;
  status: string;
  [key: string]: unknown;
}

const DEMO_LEAVE_DATA: LeaveRecord[] = [
  { id: "LR-2026-001", applicant: "王小明", type: "病假", days: 3, startDate: "2026-02-23", endDate: "2026-02-25", status: "已通过" },
  { id: "LR-2026-002", applicant: "李芳", type: "年假", days: 5, startDate: "2026-03-01", endDate: "2026-03-05", status: "审批中" },
  { id: "LR-2026-003", applicant: "张伟", type: "事假", days: 1, startDate: "2026-02-28", endDate: "2026-02-28", status: "已通过" },
  { id: "LR-2026-004", applicant: "陈静", type: "调休", days: 0.5, startDate: "2026-02-27", endDate: "2026-02-27", status: "已通过" },
  { id: "LR-2026-005", applicant: "刘强", type: "婚假", days: 10, startDate: "2026-03-10", endDate: "2026-03-19", status: "审批中" },
  { id: "LR-2026-006", applicant: "赵丽", type: "年假", days: 2, startDate: "2026-03-06", endDate: "2026-03-07", status: "已驳回" },
];

const LEAVE_TABLE_COLUMNS: FluentColumn<LeaveRecord>[] = [
  { key: "id", header: "单号", width: "120px" },
  { key: "applicant", header: "申请人", width: "100px" },
  { key: "type", header: "类型", width: "80px" },
  { key: "days", header: "天数", width: "70px", render: (row) => <span>{row.days}天</span> },
  { key: "startDate", header: "开始日期", width: "120px" },
  { key: "endDate", header: "结束日期", width: "120px" },
  {
    key: "status",
    header: "状态",
    width: "100px",
    render: (row) => {
      const colors: Record<string, string> = {
        "已通过": "bg-[#dff6dd] text-[#107c10]",
        "审批中": "bg-[#deecf9] text-[#0078d4]",
        "已驳回": "bg-[#fde7e9] text-[#a4262c]",
      };
      return (
        <span className={`inline-flex px-2 py-0.5 rounded-sm text-xs font-semibold ${colors[row.status] || "bg-[#f3f2f1] text-[#605e5c]"}`}>
          {row.status}
        </span>
      );
    },
  },
];

export default function OADynamicFormTest() {
  const [submittedValues, setSubmittedValues] = useState<Record<string, unknown> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (values: Record<string, unknown>) => {
    setIsSubmitting(true);
    setTimeout(() => {
      setSubmittedValues(values);
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <GrtEnterpriseLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-semibold text-[#323130]">OA 动态表单测试</h1>
          <p className="text-[#605e5c] mt-1 text-sm">
            UniversalDynamicForm 组件测试页 — 模拟简道云请假申请表单
          </p>
        </div>

        <Tabs defaultValue="edit" className="space-y-4">
          <TabsList className="bg-[#f3f2f1] rounded-sm p-0.5 h-auto">
            <TabsTrigger value="edit" className="gap-1.5 rounded-sm text-[13px] data-[state=active]:bg-white data-[state=active]:text-[#0078d4] data-[state=active]:shadow-[0_1px_2px_rgba(0,0,0,0.08)] px-4 py-1.5">
              <Pencil className="w-3.5 h-3.5" />
              填写模式
            </TabsTrigger>
            <TabsTrigger value="readonly" className="gap-1.5 rounded-sm text-[13px] data-[state=active]:bg-white data-[state=active]:text-[#0078d4] data-[state=active]:shadow-[0_1px_2px_rgba(0,0,0,0.08)] px-4 py-1.5">
              <Eye className="w-3.5 h-3.5" />
              只读模式
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-1.5 rounded-sm text-[13px] data-[state=active]:bg-white data-[state=active]:text-[#0078d4] data-[state=active]:shadow-[0_1px_2px_rgba(0,0,0,0.08)] px-4 py-1.5">
              <Table2 className="w-3.5 h-3.5" />
              请假记录
            </TabsTrigger>
            <TabsTrigger value="schema" className="gap-1.5 rounded-sm text-[13px] data-[state=active]:bg-white data-[state=active]:text-[#0078d4] data-[state=active]:shadow-[0_1px_2px_rgba(0,0,0,0.08)] px-4 py-1.5">
              Schema定义
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Editable form ── */}
          <TabsContent value="edit" className="space-y-4">
            {/* Title bar above the form */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#323130]">请假申请</h2>
              <span className="text-xs text-[#a19f9d] border border-[#edebe9] px-2 py-0.5 rounded-sm">LEAVE_REQUEST</span>
            </div>

            <UniversalDynamicForm
              fields={LEAVE_REQUEST_FIELDS}
              onSubmit={handleSubmit}
              onCancel={() => setSubmittedValues(null)}
              loading={isSubmitting}
              submitLabel="提交申请"
              cancelLabel="重置"
            />

            {submittedValues && (
              <div className="bg-[#dff6dd] rounded-sm p-4 shadow-[0_2px_4px_rgba(0,0,0,0.04)]">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-[#107c10]" />
                  <h3 className="text-sm font-semibold text-[#107c10]">提交成功 — 表单数据</h3>
                </div>
                <pre className="text-xs bg-white rounded-sm border border-[#edebe9] p-3 overflow-auto max-h-80 text-[#323130]">
                  {JSON.stringify(submittedValues, null, 2)}
                </pre>
              </div>
            )}
          </TabsContent>

          {/* ── Tab 2: Read-only view ── */}
          <TabsContent value="readonly">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-[#323130]">请假申请 — 已审批</h2>
                <p className="text-sm text-[#605e5c] mt-0.5">
                  申请人: 王小明 | 提交时间: 2026-02-22 09:30
                </p>
              </div>
              <Badge className="bg-[#dff6dd] text-[#107c10] border-0 rounded-sm font-semibold">已通过</Badge>
            </div>

            <UniversalDynamicForm
              fields={LEAVE_REQUEST_FIELDS}
              initialValues={SAMPLE_SUBMITTED_DATA}
              onSubmit={() => {}}
              readOnly
            />
          </TabsContent>

          {/* ── Tab 3: FluentTable demo ── */}
          <TabsContent value="table" className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-[#323130]">请假记录列表</h2>
              <p className="text-sm text-[#605e5c] mt-0.5">SharePoint Lists 风格数据表格 (FluentTable)</p>
            </div>
            <FluentTable
              columns={LEAVE_TABLE_COLUMNS}
              data={DEMO_LEAVE_DATA}
              emptyMessage="暂无请假记录"
            />
          </TabsContent>

          {/* ── Tab 4: Schema definition ── */}
          <TabsContent value="schema">
            <div className="bg-white shadow-[0_2px_4px_rgba(0,0,0,0.04)] rounded-sm">
              <div className="px-6 py-4 border-b border-[#edebe9]">
                <h2 className="text-base font-semibold text-[#323130]">
                  表单Schema定义 ({LEAVE_REQUEST_FIELDS.length} 个字段)
                </h2>
              </div>
              <div className="p-6">
                <pre className="text-xs bg-[#faf9f8] rounded-sm border border-[#edebe9] p-4 overflow-auto max-h-[600px] text-[#323130]">
                  {JSON.stringify(LEAVE_REQUEST_FIELDS, null, 2)}
                </pre>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </GrtEnterpriseLayout>
  );
}
