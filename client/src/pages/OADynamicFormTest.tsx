import { useState } from "react";
import UniversalDynamicForm from "@/components/UniversalDynamicForm";
import FluentTable, { type FluentColumn } from "@/components/FluentTable";
import GrtEnterpriseLayout from "@/components/Layout/GrtEnterpriseLayout";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Eye, Pencil, Table2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// ── Mock External Sync Leave Request schema (请假申请) ──
// Field labels are i18n keys resolved at render time via t()

function getLeaveRequestFields(t: (k: string) => string) {
  return [
    {
      name: "leaveType",
      label: t("admin.oaTest.leaveType"),
      labelEn: "Leave Type",
      type: "select" as const,
      required: true,
      options: [
        { value: "annual", label: t("admin.oa.leaveTypeAnnual") },
        { value: "sick", label: t("admin.oa.leaveTypeSick") },
        { value: "personal", label: t("admin.oa.leaveTypePersonal") },
        { value: "maternity", label: t("admin.oa.leaveTypeMaternity") },
        { value: "paternity", label: t("admin.oa.leaveTypePaternity") },
        { value: "marriage", label: t("admin.oa.leaveTypeMarriage") },
        { value: "bereavement", label: t("admin.oa.leaveTypeBereavement") },
        { value: "compensatory", label: t("admin.oa.leaveTypeCompensatory") },
      ],
      gridCol: 6,
      group: t("admin.oaTest.grpLeaveInfo"),
    },
    {
      name: "totalDays",
      label: t("admin.oaTest.totalDays"),
      labelEn: "Total Days",
      type: "number" as const,
      required: true,
      placeholder: "输入天数",
      validation: { min: 0.5, max: 365, message: "请假天数必须在0.5~365之间" },
      gridCol: 6,
      group: t("admin.oaTest.grpLeaveInfo"),
    },
    {
      name: "startDate",
      label: t("admin.oaTest.startDate"),
      type: "date" as const,
      required: true,
      gridCol: 6,
      group: t("admin.oaTest.grpLeaveInfo"),
    },
    {
      name: "endDate",
      label: t("admin.oaTest.endDate"),
      type: "date" as const,
      required: true,
      gridCol: 6,
      group: t("admin.oaTest.grpLeaveInfo"),
    },
    {
      name: "reason",
      label: t("admin.oaTest.reason"),
      type: "textarea" as const,
      required: true,
      placeholder: "请详细说明请假原因",
      validation: { minLength: 5, message: "请假事由至少5个字符" },
      gridCol: 12,
      group: t("admin.oaTest.grpLeaveInfo"),
    },
    {
      name: "needSickNote",
      label: t("admin.oaTest.needSickNote"),
      type: "checkbox" as const,
      gridCol: 6,
      group: t("admin.oaTest.grpAdditional"),
      visibleIf: { field: "leaveType", operator: "eq" as const, value: "sick" },
      helpText: t("admin.oaTest.sickNoteHint"),
    },
    {
      name: "hospitalName",
      label: t("admin.oaTest.hospitalName"),
      type: "text" as const,
      placeholder: "就诊医院",
      gridCol: 6,
      group: t("admin.oaTest.grpAdditional"),
      visibleIf: { field: "leaveType", operator: "eq" as const, value: "sick" },
    },
    {
      name: "emergencyContact",
      label: t("admin.oaTest.emergencyContact"),
      type: "user" as const,
      gridCol: 6,
      group: t("admin.oaTest.grpAdditional"),
    },
    {
      name: "emergencyPhone",
      label: t("admin.oaTest.emergencyPhone"),
      type: "text" as const,
      placeholder: "手机号码",
      validation: { pattern: "^1[3-9]\\d{9}$", message: "请输入有效的手机号" },
      gridCol: 6,
      group: t("admin.oaTest.grpAdditional"),
    },
    {
      name: "handoverPerson",
      label: t("admin.oaTest.handoverPerson"),
      type: "user" as const,
      gridCol: 6,
      group: t("admin.oaTest.grpHandover"),
    },
    {
      name: "handoverNotes",
      label: t("admin.oaTest.handoverNotes"),
      type: "textarea" as const,
      placeholder: "请说明需要交接的工作内容",
      gridCol: 12,
      group: t("admin.oaTest.grpHandover"),
    },
    {
      name: "attachment",
      label: t("admin.oaTest.attachment"),
      type: "file" as const,
      gridCol: 12,
      group: t("admin.oaTest.grpHandover"),
      helpText: t("admin.oaTest.attachmentHint"),
    },
  ];
}

// ── Sample submitted data for read-only view ──

const SAMPLE_SUBMITTED_DATA = {
  leaveType: "sick",
  totalDays: 3,
  startDate: "2026-02-23",
  endDate: "2026-02-25",
  reason: "身体不适，需要到医院检查治疗，预计需要休息3天恢复。",
  needSickNote: true,
  hospitalName: "上海市第一人民医院",
  emergencyContact: "胡杨 (工号: GRT049)",
  emergencyPhone: "13912345678",
  handoverPerson: "吴卫成 (工号: GRT-0018)", // demo
  handoverNotes: "1. M5项目BOM审核交给吴卫成跟进\n2. 周三供应商审核会议由吴卫成代参加\n3. 质检报告本周五前提交，已完成80%",
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
  { id: "LR-2026-001", applicant: "焦斌", type: "病假", days: 3, startDate: "2026-02-23", endDate: "2026-02-25", status: "已通过" }, // demo
  { id: "LR-2026-002", applicant: "田炜钰", type: "年假", days: 5, startDate: "2026-03-01", endDate: "2026-03-05", status: "审批中" },
  { id: "LR-2026-003", applicant: "吴卫成", type: "事假", days: 1, startDate: "2026-02-28", endDate: "2026-02-28", status: "已通过" }, // demo
  { id: "LR-2026-004", applicant: "沙建梅", type: "调休", days: 0.5, startDate: "2026-02-27", endDate: "2026-02-27", status: "已通过" },
  { id: "LR-2026-005", applicant: "崔聪聪", type: "婚假", days: 10, startDate: "2026-03-10", endDate: "2026-03-19", status: "审批中" },
  { id: "LR-2026-006", applicant: "戴晓燕", type: "年假", days: 2, startDate: "2026-03-06", endDate: "2026-03-07", status: "已驳回" },
];

function getLeaveTableColumns(t: (k: string) => string): FluentColumn<LeaveRecord>[] {
  return [
    { key: "id", header: t("admin.oaTest.thId"), width: "120px" },
    { key: "applicant", header: t("admin.oaTest.thApplicant"), width: "100px" },
    { key: "type", header: t("admin.oaTest.thType"), width: "80px" },
    { key: "days", header: t("admin.oaTest.thDays"), width: "70px", render: (row) => <span>{row.days}{t("admin.oa.days")}</span> },
    { key: "startDate", header: t("admin.oaTest.thStartDate"), width: "120px" },
    { key: "endDate", header: t("admin.oaTest.thEndDate"), width: "120px" },
    {
      key: "status",
      header: t("admin.oaTest.thStatus"),
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
}

export default function OADynamicFormTest() {
  const { t } = useLanguage();
  const [submittedValues, setSubmittedValues] = useState<Record<string, unknown> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const LEAVE_REQUEST_FIELDS = getLeaveRequestFields(t);
  const LEAVE_TABLE_COLUMNS = getLeaveTableColumns(t);

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
          <h1 className="text-2xl font-semibold text-[#323130]">{t("admin.oaTest.title")}</h1>
          <p className="text-[#605e5c] mt-1 text-sm">
            {t("admin.oaTest.subtitle")}
          </p>
        </div>

        <Tabs defaultValue="edit" className="space-y-4">
          <TabsList className="bg-[#f3f2f1] rounded-sm p-0.5 h-auto">
            <TabsTrigger value="edit" className="gap-1.5 rounded-sm text-[13px] data-[state=active]:bg-white data-[state=active]:text-[#0078d4] data-[state=active]:shadow-[0_1px_2px_rgba(0,0,0,0.08)] px-4 py-1.5">
              <Pencil className="w-3.5 h-3.5" />
              {t("admin.oaTest.tabEdit")}
            </TabsTrigger>
            <TabsTrigger value="readonly" className="gap-1.5 rounded-sm text-[13px] data-[state=active]:bg-white data-[state=active]:text-[#0078d4] data-[state=active]:shadow-[0_1px_2px_rgba(0,0,0,0.08)] px-4 py-1.5">
              <Eye className="w-3.5 h-3.5" />
              {t("admin.oaTest.tabReadonly")}
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-1.5 rounded-sm text-[13px] data-[state=active]:bg-white data-[state=active]:text-[#0078d4] data-[state=active]:shadow-[0_1px_2px_rgba(0,0,0,0.08)] px-4 py-1.5">
              <Table2 className="w-3.5 h-3.5" />
              {t("admin.oaTest.tabTable")}
            </TabsTrigger>
            <TabsTrigger value="schema" className="gap-1.5 rounded-sm text-[13px] data-[state=active]:bg-white data-[state=active]:text-[#0078d4] data-[state=active]:shadow-[0_1px_2px_rgba(0,0,0,0.08)] px-4 py-1.5">
              {t("admin.oaTest.tabSchema")}
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Editable form ── */}
          <TabsContent value="edit" className="space-y-4">
            {/* Title bar above the form */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#323130]">{t("admin.oaTest.leaveRequest")}</h2>
              <span className="text-xs text-[#a19f9d] border border-[#edebe9] px-2 py-0.5 rounded-sm">LEAVE_REQUEST</span>
            </div>

            <UniversalDynamicForm
              fields={LEAVE_REQUEST_FIELDS}
              onSubmit={handleSubmit}
              onCancel={() => setSubmittedValues(null)}
              loading={isSubmitting}
              submitLabel={t("admin.oaTest.submitBtn")}
              cancelLabel={t("admin.oaTest.resetBtn")}
            />

            {submittedValues && (
              <div className="bg-[#dff6dd] rounded-sm p-4 shadow-[0_2px_4px_rgba(0,0,0,0.04)]">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-[#107c10]" />
                  <h3 className="text-sm font-semibold text-[#107c10]">{t("admin.oaTest.submitSuccess")}</h3>
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
                <h2 className="text-base font-semibold text-[#323130]">{t("admin.oaTest.leaveRequestApproved")}</h2>
                <p className="text-sm text-[#605e5c] mt-0.5">
                  {t("admin.oaTest.applicantInfo")}
                </p>
              </div>
              <Badge className="bg-[#dff6dd] text-[#107c10] border-0 rounded-sm font-semibold">{t("admin.oaTest.approved")}</Badge>
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
              <h2 className="text-base font-semibold text-[#323130]">{t("admin.oaTest.leaveRecordList")}</h2>
              <p className="text-sm text-[#605e5c] mt-0.5">{t("admin.oaTest.leaveRecordDesc")}</p>
            </div>
            <FluentTable
              columns={LEAVE_TABLE_COLUMNS}
              data={DEMO_LEAVE_DATA}
              emptyMessage={t("admin.oaTest.noRecords")}
            />
          </TabsContent>

          {/* ── Tab 4: Schema definition ── */}
          <TabsContent value="schema">
            <div className="bg-white shadow-[0_2px_4px_rgba(0,0,0,0.04)] rounded-sm">
              <div className="px-6 py-4 border-b border-[#edebe9]">
                <h2 className="text-base font-semibold text-[#323130]">
                  {t("admin.oaTest.schemaTitle")} ({LEAVE_REQUEST_FIELDS.length} {t("admin.oaTest.schemaFieldCount").replace("{count} ", "")})
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
