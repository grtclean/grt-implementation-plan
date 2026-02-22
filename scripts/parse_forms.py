#!/usr/bin/env python3
"""
GRT M0-M12 Dynamic Form Structure ETL Parser

Reads:  data/form_structure_2026-02-17.csv
Writes: data/parsed_m_forms.json

Groups rows by (阶段, 表单ID, 表单名称), maps Chinese field types
to UniversalDynamicForm standard types, and outputs structured JSON
compatible with the oa_form_templates.fields JSONB column.

Security note: Uses csv module (no shell invocation). Called via
Node.js spawn() — never exec().
"""

import csv
import json
import os
import re
import sys
from collections import OrderedDict

# ── Paths ──────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
CSV_PATH = os.path.join(PROJECT_ROOT, "data", "form_structure_2026-02-17.csv")
OUTPUT_PATH = os.path.join(PROJECT_ROOT, "data", "parsed_m_forms.json")

# ── Chinese → English type mapping ────────────────────────────
TYPE_MAP = {
    "文本":     "text",
    "多行文本": "textarea",
    "富文本":   "rich_text",
    "数字":     "number",
    "日期":     "date",
    "日期时间": "datetime",
    "单选":     "select",
    "多选":     "multiselect",
    "复选":     "checkbox",
    "文件":     "file",
    "人员":     "user",
    "部门":     "department",
    "地址":     "address",
}

# ── Stage name mapping (Chinese → English) ────────────────────
STAGE_NAMES = {
    "M0":  "商机识别",
    "M1":  "需求确认",
    "M2":  "方案设计",
    "M3":  "立项评审",
    "M4":  "方案冻结",
    "M5":  "详细设计",
    "M6":  "采购制造",
    "M7":  "装配调试",
    "M8":  "FAT验收",
    "M9":  "发货安装",
    "M10": "现场调试",
    "M11": "SAT验收",
    "M12": "项目结项",
}

STAGE_NAMES_EN = {
    "M0":  "Opportunity Identification",
    "M1":  "Requirements Confirmation",
    "M2":  "Solution Design",
    "M3":  "Project Approval",
    "M4":  "Design Freeze",
    "M5":  "Detailed Design",
    "M6":  "Procurement & Manufacturing",
    "M7":  "Assembly & Commissioning",
    "M8":  "Factory Acceptance Test",
    "M9":  "Shipping & Installation",
    "M10": "Site Commissioning",
    "M11": "Site Acceptance Test",
    "M12": "Project Closure",
}

# ── Category assignment by stage ──────────────────────────────
STAGE_CATEGORY = {
    "M0": "general",
    "M1": "general",
    "M2": "project",
    "M3": "project",
    "M4": "project",
    "M5": "project",
    "M6": "project",
    "M7": "project",
    "M8": "project",
    "M9": "project",
    "M10": "project",
    "M11": "project",
    "M12": "project",
}

# ── Icon assignment by stage ──────────────────────────────────
STAGE_ICON = {
    "M0": "users",
    "M1": "clipboard-list",
    "M2": "pen-tool",
    "M3": "git-branch",
    "M4": "lock",
    "M5": "ruler",
    "M6": "factory",
    "M7": "wrench",
    "M8": "check-square",
    "M9": "truck",
    "M10": "settings",
    "M11": "shield-check",
    "M12": "flag",
}

# ── Color assignment by stage ─────────────────────────────────
STAGE_COLOR = {
    "M0": "blue-500",
    "M1": "cyan-500",
    "M2": "teal-500",
    "M3": "green-500",
    "M4": "emerald-600",
    "M5": "lime-500",
    "M6": "amber-500",
    "M7": "orange-500",
    "M8": "red-500",
    "M9": "purple-500",
    "M10": "violet-500",
    "M11": "indigo-500",
    "M12": "gray-600",
}


def sanitize_field_name(label: str) -> str:
    """Convert Chinese label to a valid JS field name using pinyin-style transliteration."""
    # Simple mapping for common field names
    name_map = {
        "客户名称": "customerName",
        "客户编码": "customerCode",
        "行业领域": "industry",
        "联系人":   "contactPerson",
        "联系电话": "contactPhone",
        "联系邮箱": "contactEmail",
        "客户等级": "customerLevel",
        "所属区域": "region",
        "商机名称": "opportunityName",
        "预计金额": "expectedAmount",
        "预计成交日": "expectedCloseDate",
        "商机来源": "opportunitySource",
        "商机阶段": "opportunityStage",
        "负责人":   "owner",
        "备注":     "remarks",
        "项目名称": "projectName",
        "项目编号": "projectCode",
        "项目经理": "projectManager",
        "产品类型": "productType",
        "技术要求": "technicalRequirements",
        "性能指标": "performanceMetrics",
        "工艺要求": "processRequirements",
        "交付期限": "deliveryDeadline",
        "预算范围": "budgetRange",
        "分析人":   "analyst",
        "技术方案概述": "solutionOverview",
        "关键技术难点":  "technicalChallenges",
        "技术风险等级":  "riskLevel",
        "可行性结论":    "feasibilityConclusion",
        "所需资源":      "requiredResources",
        "方案版本":      "designVersion",
        "设计人":        "designer",
        "总体方案描述":  "overallDesign",
        "机械方案":      "mechanicalDesign",
        "电气方案":      "electricalDesign",
        "软件方案":      "softwareDesign",
        "BOM初稿":       "bomDraft",
        "预计成本":      "estimatedCost",
        "报价金额":      "quotationAmount",
        "报价有效期":    "quotationValidity",
        "付款条件":      "paymentTerms",
        "交货周期":      "deliveryCycle",
        "质保条款":      "warrantyTerms",
        "合同金额":      "contractAmount",
        "毛利率":        "grossMargin",
        "技术评审结论":  "technicalReviewConclusion",
        "商务评审结论":  "businessReviewConclusion",
        "综合评审结论":  "overallReviewConclusion",
        "评审意见":      "reviewComments",
        "会议日期":      "meetingDate",
        "参会人员":      "attendees",
        "项目里程碑计划":"milestonesPlan",
        "资源分配方案":  "resourceAllocation",
        "风险识别":      "riskIdentification",
        "待办事项":      "actionItems",
        "冻结版本":      "frozenVersion",
        "冻结日期":      "freezeDate",
        "机械设计状态":  "mechDesignStatus",
        "电气设计状态":  "elecDesignStatus",
        "BOM冻结确认":   "bomFreezeConfirm",
        "遗留问题":      "openIssues",
        "确认签字":      "signatureConfirm",
        "检查日期":      "inspectionDate",
        "机械图纸完成度":"mechDrawingProgress",
        "电气图纸完成度":"elecDrawingProgress",
        "软件开发进度":  "softwareProgress",
        "FMEA完成状态":  "fmeaStatus",
        "控制计划状态":  "controlPlanStatus",
        "设计评审结论":  "designReviewConclusion",
        "BOM版本":       "bomVersion",
        "物料总数":      "totalMaterialCount",
        "采购件数量":    "purchasedPartCount",
        "自制件数量":    "inHousePartCount",
        "BOM成本合计":   "bomTotalCost",
        "审批意见":      "approvalComments",
        "工单编号":      "workOrderCode",
        "计划开始日期":  "plannedStartDate",
        "计划完成日期":  "plannedEndDate",
        "优先级":        "priority",
        "生产负责人":    "productionManager",
        "申请编号":      "requestCode",
        "物料名称":      "materialName",
        "物料编码":      "materialCode",
        "数量":          "quantity",
        "预计单价":      "estimatedUnitPrice",
        "需求日期":      "requiredDate",
        "供应商建议":    "suggestedSupplier",
        "检验编号":      "inspectionCode",
        "供应商名称":    "supplierName",
        "送检数量":      "submittedQty",
        "抽检数量":      "sampledQty",
        "合格数量":      "qualifiedQty",
        "不合格数量":    "unqualifiedQty",
        "检验结论":      "inspectionConclusion",
        "检验员":        "inspector",
        "工位编号":      "stationCode",
        "装配日期":      "assemblyDate",
        "机械装配状态":  "mechAssemblyStatus",
        "电气接线状态":  "elecWiringStatus",
        "气动/液压状态": "pneumaticStatus",
        "安全防护状态":  "safetyGuardStatus",
        "异常记录":      "anomalyLog",
        "调试日期":      "debugDate",
        "调试工程师":    "debugEngineer",
        "调试项目":      "debugItem",
        "目标参数":      "targetParams",
        "实际结果":      "actualResult",
        "是否达标":      "meetsTarget",
        "问题及处理":    "issueResolution",
        "测试开始日期":  "testStartDate",
        "测试结束日期":  "testEndDate",
        "测试负责人":    "testLead",
        "客户方代表":    "customerRepresentative",
        "测试项目清单":  "testItemList",
        "验收标准":      "acceptanceCriteria",
        "测试日期":      "testDate",
        "测试项目":      "testItem",
        "测试结果":      "testResult",
        "实测数据":      "actualData",
        "偏差说明":      "deviationNote",
        "客户签字确认":  "customerSignOff",
        "发货日期":      "shipmentDate",
        "收货地址":      "deliveryAddress",
        "运输方式":      "transportMode",
        "包装清单":      "packingList",
        "随机文件清单":  "documentList",
        "发货负责人":    "shipmentManager",
        "安装地点":      "installationSite",
        "安装团队":      "installationTeam",
        "场地要求":      "siteRequirements",
        "安全注意事项":  "safetyNotes",
        "客户方配合人":  "customerLiaison",
        "调试内容":      "debugContent",
        "调试结果":      "debugResult",
        "明日计划":      "tomorrowPlan",
        "验收日期":      "acceptanceDate",
        "客户方验收人":  "customerAcceptor",
        "我方负责人":    "ourRepresentative",
        "验收标准清单":  "acceptanceCriteriaList",
        "性能指标要求":  "performanceRequirements",
        "验收结论":      "acceptanceConclusion",
        "遗留问题及整改计划": "openIssuesAndPlan",
        "实际完成日期":  "actualEndDate",
        "实际成本":      "actualCost",
        "利润率":        "profitMargin",
        "项目总结":      "projectSummary",
        "经验教训":      "lessonsLearned",
        "改进建议":      "improvementSuggestions",
        "调查日期":      "surveyDate",
        "产品质量评分":  "qualityScore",
        "交付及时性评分":"deliveryScore",
        "服务态度评分":  "serviceScore",
        "技术支持评分":  "techSupportScore",
        "综合满意度":    "overallSatisfaction",
        "改进意见":      "improvementFeedback",
        "产品名称":      "productName",
    }

    if label in name_map:
        return name_map[label]

    # Fallback: generate camelCase from label using a counter
    clean = re.sub(r'[^\w]', '_', label)
    return f"field_{clean}"


def parse_options(options_str: str) -> list:
    """Parse '选项1/选项2/选项3' into [{value, label}] array."""
    if not options_str or not options_str.strip():
        return []
    parts = [p.strip() for p in options_str.split("/") if p.strip()]
    return [{"value": p, "label": p} for p in parts]


def map_field_type(chinese_type: str) -> str:
    """Map Chinese field type to UniversalDynamicForm type."""
    return TYPE_MAP.get(chinese_type.strip(), "text")


def main():
    if not os.path.exists(CSV_PATH):
        print(f"ERROR: CSV file not found: {CSV_PATH}", file=sys.stderr)
        sys.exit(1)

    # ── Read CSV ────────────────────────────────────────────
    forms = OrderedDict()  # key = (stage, formId) → {meta, fields}

    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            stage = row.get("阶段", "").strip()
            form_id = row.get("表单ID", "").strip()
            form_name = row.get("表单名称", "").strip()
            field_name = row.get("字段名称", "").strip()
            field_type = row.get("字段类型", "文本").strip()
            required = row.get("是否必填", "否").strip() == "是"
            options = row.get("选项值", "").strip()
            group = row.get("分组", "").strip()
            help_text = row.get("帮助文本", "").strip()

            if not stage or not form_id or not field_name:
                continue

            key = (stage, form_id)
            if key not in forms:
                forms[key] = {
                    "stage": stage,
                    "formId": form_id,
                    "formName": form_name,
                    "stageName": STAGE_NAMES.get(stage, stage),
                    "stageNameEn": STAGE_NAMES_EN.get(stage, stage),
                    "category": STAGE_CATEGORY.get(stage, "project"),
                    "icon": STAGE_ICON.get(stage, "file-text"),
                    "color": STAGE_COLOR.get(stage, "gray-500"),
                    "fields": [],
                }

            # Build field definition
            mapped_type = map_field_type(field_type)
            field_def = {
                "name": sanitize_field_name(field_name),
                "label": field_name,
                "type": mapped_type,
                "required": required,
            }

            # Add options for select/multiselect/radio
            if mapped_type in ("select", "multiselect", "radio") and options:
                field_def["options"] = parse_options(options)

            # Add group
            if group:
                field_def["group"] = group

            # Add help text
            if help_text:
                field_def["helpText"] = help_text

            # Add validation for number fields
            if mapped_type == "number":
                if "百分比" in help_text:
                    field_def["validation"] = {"min": 0, "max": 100}
                elif "1-10分" in help_text:
                    field_def["validation"] = {"min": 1, "max": 10}
                elif "单位" in help_text:
                    field_def["validation"] = {"min": 0}

            forms[key]["fields"].append(field_def)

    # ── Build output structure ──────────────────────────────
    result = {
        "version": "1.0",
        "generatedAt": "2026-02-22T00:00:00Z",
        "totalForms": len(forms),
        "totalFields": sum(len(f["fields"]) for f in forms.values()),
        "stages": [],
        "forms": [],
    }

    # Group by stage
    stages_seen = OrderedDict()
    for (stage, form_id), form_data in forms.items():
        if stage not in stages_seen:
            stages_seen[stage] = {
                "stage": stage,
                "stageName": form_data["stageName"],
                "stageNameEn": form_data["stageNameEn"],
                "formCount": 0,
                "formIds": [],
            }
        stages_seen[stage]["formCount"] += 1
        stages_seen[stage]["formIds"].append(form_id)

        # Build template code from formId (e.g., "M0-1" → "M0_1")
        template_code = form_id.replace("-", "_").upper()

        result["forms"].append({
            "templateCode": template_code,
            "templateName": form_data["formName"],
            "templateNameEn": f"{stage} {form_data['formName']}",
            "description": f"{form_data['stageName']}({stage})阶段 — {form_data['formName']}",
            "stage": stage,
            "formId": form_id,
            "category": form_data["category"],
            "icon": form_data["icon"],
            "color": form_data["color"],
            "fields": form_data["fields"],
            "fieldCount": len(form_data["fields"]),
        })

    result["stages"] = list(stages_seen.values())

    # ── Write JSON output ───────────────────────────────────
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    # ── Summary ─────────────────────────────────────────────
    print(f"[OK] Parsed {len(forms)} forms across {len(stages_seen)} stages")
    print(f"  Total fields: {result['totalFields']}")
    print(f"  Stages: {', '.join(stages_seen.keys())}")
    print(f"  Output: {OUTPUT_PATH}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
