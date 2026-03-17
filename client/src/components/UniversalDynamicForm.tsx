import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Fluent Design input class ─────────────────────────────────────
// Underline-only field: no surrounding borders, subtle bottom border,
// thick blue bottom border on focus, no ring/outline.
const FLUENT_INPUT =
  "bg-gray-50 rounded-none border-0 border-b border-gray-400 shadow-none px-2 py-2 " +
  "text-sm text-[#323130] placeholder:text-[#a19f9d] transition-colors " +
  "focus:border-b-2 focus:border-[#0078d4] focus:bg-white focus:outline-none focus:ring-0 " +
  "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0";

const FLUENT_SELECT =
  "bg-gray-50 rounded-none border-0 border-b border-gray-400 shadow-none " +
  "text-sm text-[#323130] transition-colors " +
  "focus:border-b-2 focus:border-[#0078d4] focus:bg-white focus:outline-none focus:ring-0 " +
  "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0";

// ─── Field definition ────────────────────────────────────────────────

interface DynamicFormFieldDef {
  name: string;
  label: string;
  labelEn?: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "date"
    | "datetime"
    | "select"
    | "multiselect"
    | "radio"
    | "checkbox"
    | "file"
    | "user"
    | "department"
    | "address"
    | "rich_text";
  required?: boolean;
  placeholder?: string;
  defaultValue?: unknown;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    message?: string;
  };
  visibleIf?: { field: string; operator: "eq" | "neq" | "in"; value: unknown };
  gridCol?: number;
  group?: string;
  helpText?: string;
  readOnly?: boolean;
}

interface UniversalDynamicFormProps {
  fields: DynamicFormFieldDef[];
  initialValues?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  readOnly?: boolean;
  loading?: boolean;
  className?: string;
  showGroupHeaders?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function buildInitialValues(
  fields: DynamicFormFieldDef[],
  initialValues?: Record<string, unknown>,
): Record<string, unknown> {
  const vals: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.defaultValue !== undefined) {
      vals[f.name] = f.defaultValue;
    }
  }
  if (initialValues) {
    Object.assign(vals, initialValues);
  }
  return vals;
}

function isFieldVisible(
  field: DynamicFormFieldDef,
  values: Record<string, unknown>,
): boolean {
  if (!field.visibleIf) return true;
  const { field: depField, operator, value } = field.visibleIf;
  const current = values[depField];
  switch (operator) {
    case "eq":
      return current === value;
    case "neq":
      return current !== value;
    case "in":
      return Array.isArray(value) && value.includes(current);
    default:
      return true;
  }
}

function colSpanClass(gridCol?: number): string {
  const col = gridCol ?? 6;
  const map: Record<number, string> = {
    1: "col-span-12 sm:col-span-1",
    2: "col-span-12 sm:col-span-2",
    3: "col-span-12 sm:col-span-3",
    4: "col-span-12 sm:col-span-4",
    5: "col-span-12 sm:col-span-5",
    6: "col-span-12 sm:col-span-6",
    7: "col-span-12 sm:col-span-7",
    8: "col-span-12 sm:col-span-8",
    9: "col-span-12 sm:col-span-9",
    10: "col-span-12 sm:col-span-10",
    11: "col-span-12 sm:col-span-11",
    12: "col-span-12",
  };
  return map[col] || "col-span-12 sm:col-span-6";
}

function getOptionLabel(
  options: { value: string; label: string }[] | undefined,
  val: unknown,
): string {
  if (!options) return String(val ?? "");
  const opt = options.find((o) => o.value === String(val));
  return opt ? opt.label : String(val ?? "");
}

// ─── Component ───────────────────────────────────────────────────────

export default function UniversalDynamicForm(props: UniversalDynamicFormProps) {
  const {
    fields,
    initialValues,
    onSubmit,
    onCancel,
    submitLabel = "提交",
    cancelLabel = "取消",
    readOnly = false,
    loading = false,
    className,
    showGroupHeaders = true,
  } = props;

  const [values, setValues] = useState<Record<string, unknown>>(() =>
    buildInitialValues(fields, initialValues),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Group fields ──────────────────────────────────────────────────

  const grouped = useMemo(() => {
    const groups: Record<string, DynamicFormFieldDef[]> = {};
    const order: string[] = [];
    for (const f of fields) {
      const g = f.group || "基本信息";
      if (!groups[g]) {
        groups[g] = [];
        order.push(g);
      }
      groups[g].push(f);
    }
    return order.map((name) => ({ name, fields: groups[name] }));
  }, [fields]);

  // ── Value setters ─────────────────────────────────────────────────

  function setValue(name: string, val: unknown) {
    setValues((prev) => ({ ...prev, [name]: val }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }

  // ── Validation ────────────────────────────────────────────────────

  function validate(): boolean {
    const errs: Record<string, string> = {};

    for (const field of fields) {
      if (!isFieldVisible(field, values)) continue;

      const val = values[field.name];
      const strVal = val != null ? String(val) : "";

      if (field.required) {
        if (field.type === "multiselect") {
          if (!Array.isArray(val) || val.length === 0) {
            errs[field.name] = field.validation?.message || `${field.label}为必填项`;
          }
        } else if (field.type === "checkbox") {
          if (val !== true) {
            errs[field.name] = field.validation?.message || `${field.label}为必填项`;
          }
        } else if (strVal.trim() === "") {
          errs[field.name] = field.validation?.message || `${field.label}为必填项`;
        }
      }

      if (strVal.trim() === "" && !field.required) continue;

      const v = field.validation;
      if (!v) continue;

      if (field.type === "number" && strVal !== "") {
        const num = Number(strVal);
        if (v.min !== undefined && num < v.min) {
          errs[field.name] = v.message || `${field.label}不能小于${v.min}`;
        }
        if (v.max !== undefined && num > v.max) {
          errs[field.name] = v.message || `${field.label}不能大于${v.max}`;
        }
      }

      if (v.minLength !== undefined && strVal.length < v.minLength) {
        errs[field.name] = v.message || `${field.label}至少${v.minLength}个字符`;
      }
      if (v.maxLength !== undefined && strVal.length > v.maxLength) {
        errs[field.name] = v.message || `${field.label}最多${v.maxLength}个字符`;
      }

      if (v.pattern && strVal !== "") {
        try {
          const re = new RegExp(v.pattern);
          if (!re.test(strVal)) {
            errs[field.name] = v.message || `${field.label}格式不正确`;
          }
        } catch {
          // Invalid regex — skip
        }
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    if (validate()) {
      onSubmit(values);
    }
  }

  // ── Read-only value display ───────────────────────────────────────

  function renderReadOnlyValue(field: DynamicFormFieldDef) {
    const val = values[field.name];

    switch (field.type) {
      case "checkbox":
        return <span className="text-sm text-[#323130]">{val ? "是" : "否"}</span>;
      case "select":
        return (
          <span className="text-sm text-[#323130]">
            {getOptionLabel(field.options, val) || "-"}
          </span>
        );
      case "radio":
        return (
          <span className="text-sm text-[#323130]">
            {getOptionLabel(field.options, val) || "-"}
          </span>
        );
      case "multiselect": {
        const arr = Array.isArray(val) ? val : [];
        if (arr.length === 0) return <span className="text-sm text-[#a19f9d]">-</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {arr.map((v: string) => (
              <Badge key={v} variant="secondary" className="rounded-sm bg-[#deecf9] text-[#0078d4]">
                {getOptionLabel(field.options, v)}
              </Badge>
            ))}
          </div>
        );
      }
      case "date":
        return <span className="text-sm text-[#323130]">{val ? String(val) : "-"}</span>;
      case "datetime":
        return (
          <span className="text-sm text-[#323130]">
            {val ? String(val).replace("T", " ") : "-"}
          </span>
        );
      default:
        return (
          <span className="text-sm whitespace-pre-wrap text-[#323130]">
            {val != null && String(val).trim() !== "" ? String(val) : "-"}
          </span>
        );
    }
  }

  // ── Field renderer ────────────────────────────────────────────────

  function renderField(field: DynamicFormFieldDef) {
    if (!isFieldVisible(field, values)) return null;

    const isDisabled = readOnly || field.readOnly;
    const error = errors[field.name];
    const val = values[field.name];

    // Read-only mode renders plain text
    if (readOnly) {
      return (
        <div key={field.name} className={colSpanClass(field.gridCol)}>
          <Label className="text-xs font-semibold text-[#605e5c] uppercase tracking-wide">
            {field.label}
            {field.labelEn && (
              <span className="ml-1 text-[#a19f9d] normal-case tracking-normal font-normal">
                ({field.labelEn})
              </span>
            )}
          </Label>
          <div className="mt-1">{renderReadOnlyValue(field)}</div>
          {field.helpText && (
            <p className="text-xs text-[#a19f9d] mt-1">{field.helpText}</p>
          )}
        </div>
      );
    }

    return (
      <div key={field.name} className={colSpanClass(field.gridCol)}>
        <Label htmlFor={field.name} className="text-sm font-semibold text-[#323130]">
          {field.label}
          {field.required && <span className="text-[#a4262c] ml-0.5">*</span>}
          {field.labelEn && (
            <span className="ml-1 text-xs text-[#a19f9d] font-normal">
              ({field.labelEn})
            </span>
          )}
        </Label>

        <div className="mt-1.5">{renderInput(field, isDisabled!, val)}</div>

        {field.helpText && !error && (
          <p className="text-xs text-[#a19f9d] mt-1">{field.helpText}</p>
        )}
        {error && (
          <p className="text-xs text-[#a4262c] mt-1 flex items-center gap-1">
            <AlertCircle className="size-3" />
            {error}
          </p>
        )}
      </div>
    );
  }

  function renderInput(
    field: DynamicFormFieldDef,
    disabled: boolean,
    val: unknown,
  ) {
    switch (field.type) {
      case "text":
        return (
          <Input
            id={field.name}
            value={val != null ? String(val) : ""}
            onChange={(e) => setValue(field.name, e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            className={FLUENT_INPUT}
          />
        );

      case "textarea":
        return (
          <Textarea
            id={field.name}
            value={val != null ? String(val) : ""}
            onChange={(e) => setValue(field.name, e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            rows={3}
            className={FLUENT_INPUT}
          />
        );

      case "number":
        return (
          <Input
            id={field.name}
            type="number"
            value={val != null ? String(val) : ""}
            onChange={(e) => {
              const v = e.target.value;
              setValue(field.name, v === "" ? "" : Number(v));
            }}
            placeholder={field.placeholder}
            disabled={disabled}
            min={field.validation?.min}
            max={field.validation?.max}
            className={FLUENT_INPUT}
          />
        );

      case "date":
        return (
          <Input
            id={field.name}
            type="date"
            value={val != null ? String(val) : ""}
            onChange={(e) => setValue(field.name, e.target.value)}
            disabled={disabled}
            className={FLUENT_INPUT}
          />
        );

      case "datetime":
        return (
          <Input
            id={field.name}
            type="datetime-local"
            value={val != null ? String(val) : ""}
            onChange={(e) => setValue(field.name, e.target.value)}
            disabled={disabled}
            className={FLUENT_INPUT}
          />
        );

      case "select":
        return (
          <Select
            value={val != null ? String(val) : undefined}
            onValueChange={(v) => setValue(field.name, v)}
            disabled={disabled}
          >
            <SelectTrigger className={cn("w-full", FLUENT_SELECT)}>
              <SelectValue placeholder={field.placeholder || "请选择"} />
            </SelectTrigger>
            <SelectContent className="rounded-sm border-[#edebe9] shadow-lg">
              {(field.options || []).map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-[#323130] rounded-sm focus:bg-[#f3f2f1]">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "multiselect": {
        const selected: string[] = Array.isArray(val) ? (val as string[]) : [];
        return (
          <div className="space-y-2">
            {(field.options || []).map((opt) => {
              const checked = selected.includes(opt.value);
              return (
                <div key={opt.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`${field.name}-${opt.value}`}
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={(c) => {
                      if (c) {
                        setValue(field.name, [...selected, opt.value]);
                      } else {
                        setValue(
                          field.name,
                          selected.filter((v) => v !== opt.value),
                        );
                      }
                    }}
                  />
                  <Label
                    htmlFor={`${field.name}-${opt.value}`}
                    className="text-sm font-normal cursor-pointer text-[#323130]"
                  >
                    {opt.label}
                  </Label>
                </div>
              );
            })}
          </div>
        );
      }

      case "radio":
        return (
          <RadioGroup
            value={val != null ? String(val) : undefined}
            onValueChange={(v) => setValue(field.name, v)}
            disabled={disabled}
          >
            {(field.options || []).map((opt) => (
              <div key={opt.value} className="flex items-center gap-2">
                <RadioGroupItem
                  value={opt.value}
                  id={`${field.name}-${opt.value}`}
                />
                <Label
                  htmlFor={`${field.name}-${opt.value}`}
                  className="text-sm font-normal cursor-pointer text-[#323130]"
                >
                  {opt.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "checkbox":
        return (
          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id={field.name}
              checked={val === true}
              disabled={disabled}
              onCheckedChange={(c) => setValue(field.name, c === true)}
            />
            <Label
              htmlFor={field.name}
              className="text-sm font-normal cursor-pointer text-[#323130]"
            >
              {field.placeholder || field.label}
            </Label>
          </div>
        );

      case "file":
        return (
          <Input
            id={field.name}
            type="file"
            disabled={disabled}
            onChange={(e) => {
              const file = e.target.files?.[0];
              setValue(field.name, file ? file.name : "");
            }}
            className={FLUENT_INPUT}
          />
        );

      case "user":
        return (
          <Input
            id={field.name}
            value={val != null ? String(val) : ""}
            onChange={(e) => setValue(field.name, e.target.value)}
            placeholder={field.placeholder || "输入用户名或工号"}
            disabled={disabled}
            className={FLUENT_INPUT}
          />
        );

      case "department":
        return (
          <Input
            id={field.name}
            value={val != null ? String(val) : ""}
            onChange={(e) => setValue(field.name, e.target.value)}
            placeholder={field.placeholder || "输入部门名称"}
            disabled={disabled}
            className={FLUENT_INPUT}
          />
        );

      case "address":
        return (
          <Textarea
            id={field.name}
            value={val != null ? String(val) : ""}
            onChange={(e) => setValue(field.name, e.target.value)}
            placeholder={field.placeholder || "输入地址"}
            disabled={disabled}
            rows={3}
            className={FLUENT_INPUT}
          />
        );

      case "rich_text":
        return (
          <Textarea
            id={field.name}
            value={val != null ? String(val) : ""}
            onChange={(e) => setValue(field.name, e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            rows={5}
            className={FLUENT_INPUT}
          />
        );

      default:
        return (
          <Input
            id={field.name}
            value={val != null ? String(val) : ""}
            onChange={(e) => setValue(field.name, e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            className={FLUENT_INPUT}
          />
        );
    }
  }

  // ── Render ────────────────────────────────────────────────────────

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "bg-white shadow-[0_2px_4px_rgba(0,0,0,0.04)] rounded-sm p-6",
        className,
      )}
    >
      <div className="space-y-6">
        {grouped.map((group, idx) => {
          const visibleFields = group.fields.filter((f) =>
            isFieldVisible(f, values),
          );
          if (visibleFields.length === 0) return null;

          // Fluent section divider: title text + extending horizontal rule
          if (showGroupHeaders && grouped.length > 1) {
            return (
              <div key={group.name} className="space-y-4">
                {/* Section header with Fluent divider line */}
                <div className={cn("flex items-center gap-3", idx > 0 && "pt-2")}>
                  <h4 className="text-sm font-semibold text-[#323130] whitespace-nowrap">
                    {group.name}
                  </h4>
                  <div className="flex-1 h-px bg-[#edebe9]" />
                </div>
                <div className="grid grid-cols-12 gap-x-4 gap-y-5">
                  {group.fields.map((f) => renderField(f))}
                </div>
              </div>
            );
          }

          return (
            <div key={group.name} className="grid grid-cols-12 gap-x-4 gap-y-5">
              {group.fields.map((f) => renderField(f))}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {!readOnly && (
        <div className="flex items-center justify-end gap-3 mt-8 pt-5 border-t border-[#edebe9]">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="rounded-sm border-[#8a8886] text-[#323130] hover:bg-[#f3f2f1] font-semibold"
            >
              {cancelLabel}
            </Button>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="bg-[#0078d4] hover:bg-[#106ebe] rounded-sm text-white font-semibold"
          >
            {loading && <Spinner className="mr-2" />}
            {submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
}
