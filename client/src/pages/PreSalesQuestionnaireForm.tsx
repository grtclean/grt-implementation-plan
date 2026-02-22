/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  GRT Pre-Sales Technical Questionnaire — Tablet Wizard (v2)        ║
 * ║                                                                     ║
 * ║  4-Step touch-optimized wizard for field engineers capturing        ║
 * ║  parts cleaning requirements per ISO 16232 / VDA 19.               ║
 * ║  Submits to business_trip_reports.technical_questionnaire_data.     ║
 * ║                                                                     ║
 * ║  Design language: High-tech enterprise · Dark-mode first ·         ║
 * ║  Gradient accents · 48 px touch targets · Animated transitions     ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Ruler,
  Factory,
  Loader2,
  Check,
  Info,
  Sparkles,
  ShieldCheck,
  Gauge,
  Boxes,
} from "lucide-react";
import type { TechnicalQuestionnaireData } from "../../../drizzle/oa-schema";

// ════════════════════════════════════════════════════════
// Zod Schema — per-field coercion for numeric HTML inputs
// ════════════════════════════════════════════════════════

const baseSchema = z.object({
  partName: z.string().min(1, "Part name is required"),
  partNumber: z.string().optional(),
  length: z.coerce.number().positive("Length must be > 0"),
  width: z.coerce.number().positive("Width must be > 0"),
  height: z.coerce.number().positive("Height must be > 0"),
  dimensionUnit: z.enum(["mm", "cm", "in"]).default("mm"),
  weightMin: z.coerce.number().nonnegative("Min weight must be >= 0"),
  weightMax: z.coerce.number().positive("Max weight must be > 0"),
  weightUnit: z.enum(["g", "kg"]).default("kg"),
  materials: z.array(z.enum(["steel", "aluminium", "casting", "plastics"])).min(1, "Select at least one material"),
  annualVolume: z.coerce.number().int().positive().optional().or(z.literal("")),
  coolingLubricant: z.boolean().default(false),
  chipping: z.boolean().default(false),
  indoorDirt: z.boolean().default(false),
  oilGrease: z.boolean().default(false),
  emulsion: z.boolean().default(false),
  dustParticles: z.boolean().default(false),
  burrs: z.boolean().default(false),
  contaminationOther: z.string().optional(),
  drynessLevel: z.coerce.number().int().min(0).max(4),
  partsPerDay: z.coerce.number().int().positive("Parts/day must be > 0"),
  oeePercent: z.coerce.number().min(0).max(100).optional().or(z.literal("")),
  cycleTimeSeconds: z.coerce.number().positive("Cycle time must be > 0"),
  installationSpaceM2: z.coerce.number().positive().optional().or(z.literal("")),
  specialRequirements: z.string().optional(),
});

const schema = baseSchema.refine(d => d.weightMax >= d.weightMin, {
  message: "Max weight must be >= Min weight",
  path: ["weightMax"],
});

type FormValues = z.infer<typeof baseSchema>;

// ════════════════════════════════════════════════════════
// Step Configuration
// ════════════════════════════════════════════════════════

const STEPS = [
  { label: "Parts Specs", labelZh: "零件规格", icon: Ruler, gradient: "from-blue-500 to-cyan-500" },
  { label: "Contamination", labelZh: "污染物", icon: Droplets, gradient: "from-amber-500 to-orange-500" },
  { label: "Dryness", labelZh: "干燥等级", icon: Gauge, gradient: "from-emerald-500 to-teal-500" },
  { label: "Capacity", labelZh: "产能/现场", icon: Factory, gradient: "from-violet-500 to-purple-500" },
] as const;

const STEP_FIELDS: (keyof FormValues)[][] = [
  ["partName", "length", "width", "height", "dimensionUnit", "weightMin", "weightMax", "weightUnit", "materials"],
  ["coolingLubricant", "chipping", "indoorDirt", "oilGrease", "emulsion", "dustParticles", "burrs"],
  ["drynessLevel"],
  ["partsPerDay", "cycleTimeSeconds"],
];

const DRYNESS_LEVELS = [
  {
    level: 0,
    label: "No drying requirement",
    labelDe: "Keine Trocknung",
    desc: "Parts proceed wet. Residual moisture acceptable. No drying station needed in the cleaning line.",
    icon: "💧",
    color: "border-slate-400/30 bg-slate-500/5",
    activeColor: "border-slate-400 bg-slate-500/10 ring-slate-400/40",
  },
  {
    level: 1,
    label: "Drip-dry",
    labelDe: "Abtropftrocknung",
    desc: "Natural drip-dry only. Gravity drainage. Droplets may remain in blind holes and recesses. Typical for inter-op wash.",
    icon: "🌊",
    color: "border-blue-400/30 bg-blue-500/5",
    activeColor: "border-blue-400 bg-blue-500/10 ring-blue-400/40",
  },
  {
    level: 2,
    label: "Surface dry",
    labelDe: "Oberflächentrocken",
    desc: "Visibly dry outer surfaces via hot-air or vacuum drying. Minor moisture in deep bores / capillaries tolerable. Standard for most machined parts.",
    icon: "🔥",
    color: "border-amber-400/30 bg-amber-500/5",
    activeColor: "border-amber-400 bg-amber-500/10 ring-amber-400/40",
  },
  {
    level: 3,
    label: "Thoroughly dry",
    labelDe: "Durchgetrocknet",
    desc: "Completely dry including blind holes, internal threads, and capillary gaps. Requires vacuum drying or multi-stage hot-air system.",
    icon: "♨️",
    color: "border-orange-400/30 bg-orange-500/5",
    activeColor: "border-orange-400 bg-orange-500/10 ring-orange-400/40",
  },
  {
    level: 4,
    label: "Spot-free dry",
    labelDe: "Fleckenfrei trocken",
    desc: "The part is definitely dry. Zero residual moisture. Passes blotter paper test per ISO 12937. No watermarks, stains, or mineral deposits. Required for high-precision optics, semiconductor, and medical-grade components.",
    icon: "✨",
    color: "border-emerald-400/30 bg-emerald-500/5",
    activeColor: "border-emerald-400 bg-emerald-500/10 ring-emerald-400/40",
  },
];

const MATERIALS = [
  { value: "steel" as const, label: "Steel", labelZh: "钢", icon: "🔩" },
  { value: "aluminium" as const, label: "Aluminium", labelZh: "铝", icon: "🪶" },
  { value: "casting" as const, label: "Casting", labelZh: "铸件", icon: "🏭" },
  { value: "plastics" as const, label: "Plastics", labelZh: "塑料", icon: "🧬" },
];

const CONTAMINANTS = [
  { key: "coolingLubricant" as const, label: "Cooling Lubricant", labelZh: "冷却润滑液", icon: "💦" },
  { key: "chipping" as const, label: "Chipping", labelZh: "切屑", icon: "⚙️" },
  { key: "indoorDirt" as const, label: "Indoor Dirt", labelZh: "室内灰尘", icon: "🌫️" },
  { key: "oilGrease" as const, label: "Oil & Grease", labelZh: "油脂", icon: "🛢️" },
  { key: "emulsion" as const, label: "Emulsion", labelZh: "乳化液", icon: "🧪" },
  { key: "dustParticles" as const, label: "Dust & Particles", labelZh: "粉尘颗粒", icon: "🌀" },
  { key: "burrs" as const, label: "Burrs", labelZh: "毛刺", icon: "🔪" },
];

// ════════════════════════════════════════════════════════
// Data Mapper → TechnicalQuestionnaireData
// ════════════════════════════════════════════════════════

function mapFormToTechnicalData(v: FormValues): TechnicalQuestionnaireData {
  const contaminants: string[] = [];
  if (v.coolingLubricant) contaminants.push("cooling_lubricant");
  if (v.chipping) contaminants.push("chips");
  if (v.indoorDirt) contaminants.push("indoor_dirt");
  if (v.oilGrease) contaminants.push("oil");
  if (v.emulsion) contaminants.push("emulsion");
  if (v.dustParticles) contaminants.push("dust");
  if (v.burrs) contaminants.push("burrs");
  if (v.contaminationOther) contaminants.push(v.contaminationOther);

  return {
    partName: v.partName,
    partNumber: v.partNumber || undefined,
    partDimensions: { length: v.length, width: v.width, height: v.height, unit: v.dimensionUnit },
    partWeight: { value: v.weightMax, unit: v.weightUnit },
    partMaterial: v.materials.join(", "),
    annualVolume: typeof v.annualVolume === "number" ? v.annualVolume : undefined,
    contaminantTypes: contaminants,
    dryingRequired: v.drynessLevel > 0,
    cycleTimeTarget: v.cycleTimeSeconds,
    spaceConstraints: typeof v.installationSpaceM2 === "number" ? `${v.installationSpaceM2} m²` : undefined,
    specialRequirements: v.specialRequirements || undefined,
  };
}

// ════════════════════════════════════════════════════════
// Reusable Sub-Components
// ════════════════════════════════════════════════════════

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1"><Info className="h-3 w-3" />{message}</p>;
}

function UnitSuffix({ children }: { children: string }) {
  return (
    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
      {children}
    </span>
  );
}

// ════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════

export default function PreSalesQuestionnaireForm() {
  const [step, setStep] = useState(0);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      dimensionUnit: "mm",
      weightUnit: "kg",
      materials: [],
      coolingLubricant: false,
      chipping: false,
      indoorDirt: false,
      oilGrease: false,
      emulsion: false,
      dustParticles: false,
      burrs: false,
      drynessLevel: 0,
    },
  });

  const { register, watch, setValue, trigger, handleSubmit, formState: { errors } } = form;

  const utils = trpc.useUtils();
  const submitMut = trpc.oa.createTripReport.useMutation({
    onSuccess: () => {
      toast.success("Questionnaire Submitted", {
        description: "Technical data saved to trip report successfully.",
      });
      utils.oa.listTripReports.invalidate();
      form.reset();
      setStep(0);
    },
    onError: (err) => toast.error("Submission Failed", { description: err.message }),
  });

  const goNext = async () => {
    const valid = await trigger(STEP_FIELDS[step]);
    if (valid) setStep(s => Math.min(s + 1, 3));
  };
  const goBack = () => setStep(s => Math.max(s - 1, 0));

  const onSubmit = (values: FormValues) => {
    submitMut.mutate({
      employeeId: 1,
      destination: "Pre-Sales Visit",
      technicalQuestionnaireData: mapFormToTechnicalData(values) as any,
    });
  };

  const materialsValue = watch("materials");
  const drynessValue = watch("drynessLevel");
  const progressPercent = ((step) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 flex flex-col">

      {/* ═══════════════════════════════════════════
          HEADER — Branded top bar with gradient accent
          ═══════════════════════════════════════════ */}
      <div className="relative border-b border-border/50 bg-card/80 backdrop-blur-sm">
        {/* Gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500" />

        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <ClipboardCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight flex items-center gap-2">
                Technical Questionnaire
                <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                  ISO 16232
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground">
                售前技术问卷 — Parts Cleaning & Drying Requirements
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-xs tabular-nums">
              {step + 1}/{STEPS.length}
            </Badge>
          </div>
        </div>

        {/* ── Progress bar ── */}
        <div className="h-1 bg-muted/50">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          STEP NAVIGATION — Horizontal pill stepper
          ═══════════════════════════════════════════ */}
      <div className="flex items-center gap-1.5 px-4 py-3 overflow-x-auto border-b border-border/30 bg-card/40 backdrop-blur-sm">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isComplete = i < step;
          return (
            <button
              key={i}
              type="button"
              onClick={() => i < step && setStep(i)}
              className={`
                flex items-center gap-2 px-4 min-h-[44px] rounded-full text-sm font-medium
                transition-all duration-300 whitespace-nowrap select-none
                ${isActive
                  ? `bg-gradient-to-r ${s.gradient} text-white shadow-lg shadow-primary/20`
                  : isComplete
                  ? "bg-primary/10 text-primary hover:bg-primary/15 cursor-pointer"
                  : "bg-muted/50 text-muted-foreground/60"
                }
              `}
            >
              {isComplete ? (
                <Check className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{s.labelZh}</span>
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════
          FORM CONTENT — Scrollable body
          ═══════════════════════════════════════════ */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto pb-28">
        <div className="max-w-2xl mx-auto px-4 py-6">

          {/* ═══════ Step 1 — Parts Specs ═══════ */}
          {step === 0 && (
            <div className="space-y-5">
              <SectionHeader
                icon={Ruler}
                title="Parts Specification"
                subtitle="零件规格 — Define the target part geometry, weight, and material composition."
              />

              {/* Part Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Part Name / 零件名称 <span className="text-red-400">*</span>
                </Label>
                <Input
                  {...register("partName")}
                  placeholder="e.g. Cylinder Block, Turbocharger Housing"
                  className="min-h-[52px] text-base bg-card/60 border-border/50 focus:border-primary/60 focus:ring-primary/20 placeholder:text-muted-foreground/40"
                />
                <FieldError message={errors.partName?.message} />
              </div>

              {/* Part Number */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Part Number / 零件号
                </Label>
                <Input
                  {...register("partNumber")}
                  placeholder="Optional — Customer drawing number"
                  className="min-h-[48px] bg-card/60 border-border/50 focus:border-primary/60 placeholder:text-muted-foreground/40"
                />
              </div>

              {/* Dimensions L x W x H */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Dimensions (L × W × H) <span className="text-red-400">*</span>
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["length", "width", "height"] as const).map((dim) => (
                    <div key={dim}>
                      <div className="relative">
                        <Input
                          type="number"
                          step="any"
                          {...register(dim)}
                          placeholder={dim[0].toUpperCase()}
                          className="min-h-[48px] bg-card/60 border-border/50 focus:border-primary/60 pr-12 font-mono placeholder:text-muted-foreground/40"
                        />
                        <UnitSuffix>{watch("dimensionUnit")}</UnitSuffix>
                      </div>
                      <FieldError message={errors[dim]?.message} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Dimension Unit */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Unit
                </Label>
                <div className="flex gap-2">
                  {["mm", "cm", "in"].map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setValue("dimensionUnit", u as "mm" | "cm" | "in")}
                      className={`
                        min-h-[48px] px-6 rounded-lg text-sm font-semibold uppercase tracking-wider
                        border-2 transition-all duration-200
                        ${watch("dimensionUnit") === u
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border/50 bg-card/40 text-muted-foreground hover:border-primary/30"
                        }
                      `}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weight Range */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Weight Range (Min – Max) <span className="text-red-400">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["weightMin", "weightMax"] as const).map((f) => (
                    <div key={f}>
                      <div className="relative">
                        <Input
                          type="number"
                          step="any"
                          {...register(f)}
                          placeholder={f === "weightMin" ? "Min" : "Max"}
                          className="min-h-[48px] bg-card/60 border-border/50 focus:border-primary/60 pr-12 font-mono placeholder:text-muted-foreground/40"
                        />
                        <UnitSuffix>{watch("weightUnit")}</UnitSuffix>
                      </div>
                      <FieldError message={errors[f]?.message} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Weight Unit */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Weight Unit
                </Label>
                <div className="flex gap-2">
                  {["g", "kg"].map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setValue("weightUnit", u as "g" | "kg")}
                      className={`
                        min-h-[48px] px-6 rounded-lg text-sm font-semibold uppercase tracking-wider
                        border-2 transition-all duration-200
                        ${watch("weightUnit") === u
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border/50 bg-card/40 text-muted-foreground hover:border-primary/30"
                        }
                      `}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {/* Materials Multi-Select */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Materials <span className="text-red-400">*</span>
                  <span className="ml-2 text-muted-foreground/60 normal-case font-normal">(multi-select)</span>
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {MATERIALS.map(m => {
                    const selected = materialsValue.includes(m.value);
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => {
                          const next = selected
                            ? materialsValue.filter(v => v !== m.value)
                            : [...materialsValue, m.value];
                          setValue("materials", next as any, { shouldValidate: true });
                        }}
                        className={`
                          min-h-[56px] px-4 rounded-xl text-left
                          border-2 transition-all duration-200 flex items-center gap-3
                          ${selected
                            ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                            : "border-border/50 bg-card/40 text-muted-foreground hover:border-primary/30"
                          }
                        `}
                      >
                        <span className="text-xl">{m.icon}</span>
                        <div>
                          <p className="text-sm font-semibold">{m.label}</p>
                          <p className="text-xs opacity-60">{m.labelZh}</p>
                        </div>
                        {selected && <Check className="h-4 w-4 ml-auto text-primary" />}
                      </button>
                    );
                  })}
                </div>
                <FieldError message={errors.materials?.message} />
              </div>

              {/* Annual Volume */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Annual Volume / 年产量
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    {...register("annualVolume")}
                    placeholder="Optional"
                    className="min-h-[48px] bg-card/60 border-border/50 focus:border-primary/60 pr-20 placeholder:text-muted-foreground/40"
                  />
                  <UnitSuffix>pcs/yr</UnitSuffix>
                </div>
              </div>
            </div>
          )}

          {/* ═══════ Step 2 — Contamination ═══════ */}
          {step === 1 && (
            <div className="space-y-5">
              <SectionHeader
                icon={Droplets}
                title="Contamination Profile"
                subtitle="污染物类型 — Toggle each contamination type present on incoming parts."
              />

              <div className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden divide-y divide-border/30">
                {CONTAMINANTS.map((c) => {
                  const active = watch(c.key);
                  return (
                    <label
                      key={c.key}
                      htmlFor={c.key}
                      className={`
                        flex items-center justify-between px-4 py-3.5 min-h-[56px] cursor-pointer
                        transition-colors duration-200 select-none
                        ${active ? "bg-primary/5" : "hover:bg-muted/30"}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg w-8 text-center">{c.icon}</span>
                        <div>
                          <p className="text-sm font-medium">{c.label}</p>
                          <p className="text-xs text-muted-foreground">{c.labelZh}</p>
                        </div>
                      </div>
                      <Switch
                        id={c.key}
                        checked={active}
                        onCheckedChange={(v) => setValue(c.key, v)}
                      />
                    </label>
                  );
                })}
              </div>

              {/* Other field */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Other Contaminants
                </Label>
                <Input
                  {...register("contaminationOther")}
                  placeholder="Describe other contaminants not listed above..."
                  className="min-h-[48px] bg-card/60 border-border/50 focus:border-primary/60 placeholder:text-muted-foreground/40"
                />
              </div>
            </div>
          )}

          {/* ═══════ Step 3 — Dryness Level ═══════ */}
          {step === 2 && (
            <div className="space-y-5">
              <SectionHeader
                icon={Gauge}
                title="Dryness Level"
                subtitle="干燥等级 — Select the required drying standard for the cleaned parts."
              />

              <div className="space-y-3">
                {DRYNESS_LEVELS.map(d => {
                  const isActive = drynessValue === d.level;
                  return (
                    <button
                      key={d.level}
                      type="button"
                      onClick={() => setValue("drynessLevel", d.level, { shouldValidate: true })}
                      className={`
                        w-full text-left min-h-[80px] p-4 rounded-xl border-2
                        transition-all duration-300 group relative overflow-hidden
                        ${isActive
                          ? `${d.activeColor} ring-2 shadow-lg`
                          : `${d.color} hover:border-primary/30`
                        }
                      `}
                    >
                      <div className="flex items-start gap-4">
                        {/* Level indicator */}
                        <div className={`
                          flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center
                          transition-all duration-300
                          ${isActive
                            ? "bg-gradient-to-br from-primary/30 to-primary/10"
                            : "bg-muted/50"
                          }
                        `}>
                          <span className="text-2xl">{d.icon}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`
                              font-mono text-xs px-1.5 py-0.5 rounded
                              ${isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}
                            `}>
                              L{d.level}
                            </span>
                            <p className="font-semibold text-sm">{d.label}</p>
                            <span className="text-xs text-muted-foreground italic hidden sm:inline">
                              {d.labelDe}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {d.desc}
                          </p>
                        </div>

                        {/* Selection indicator */}
                        {isActive && (
                          <div className="flex-shrink-0 mt-1">
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                              <Check className="h-3.5 w-3.5 text-primary-foreground" />
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 cursor-help">
                    <Info className="h-3.5 w-3.5" />
                    <span>Dryness levels reference VDA 19 and ISO 16232 Part 10 standards.</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-sm">
                  Level 4 (Spot-free) is the most stringent requirement, typically required for
                  semiconductor, medical, and high-precision optical components.
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* ═══════ Step 4 — Capacity & Site ═══════ */}
          {step === 3 && (
            <div className="space-y-5">
              <SectionHeader
                icon={Factory}
                title="Capacity & Site Parameters"
                subtitle="产能与现场 — Define throughput targets and facility constraints."
              />

              {/* Stat hints row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border/50 bg-card/40 p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Boxes className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">Daily Output</span>
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      {...register("partsPerDay")}
                      placeholder="e.g. 2400"
                      className="min-h-[48px] bg-background/50 border-border/30 focus:border-primary/60 pr-20 font-mono text-lg placeholder:text-muted-foreground/40"
                    />
                    <UnitSuffix>pcs/day</UnitSuffix>
                  </div>
                  <FieldError message={errors.partsPerDay?.message} />
                </div>

                <div className="rounded-lg border border-border/50 bg-card/40 p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Gauge className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">OEE Target</span>
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.1"
                      {...register("oeePercent")}
                      placeholder="e.g. 85"
                      className="min-h-[48px] bg-background/50 border-border/30 focus:border-primary/60 pr-10 font-mono text-lg placeholder:text-muted-foreground/40"
                    />
                    <UnitSuffix>%</UnitSuffix>
                  </div>
                </div>
              </div>

              {/* Cycle Time */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Cycle Time / 节拍 <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    {...register("cycleTimeSeconds")}
                    placeholder="e.g. 45"
                    className="min-h-[48px] bg-card/60 border-border/50 focus:border-primary/60 pr-20 font-mono placeholder:text-muted-foreground/40"
                  />
                  <UnitSuffix>seconds</UnitSuffix>
                </div>
                <FieldError message={errors.cycleTimeSeconds?.message} />
              </div>

              {/* Installation Space */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Available Installation Space
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    {...register("installationSpaceM2")}
                    placeholder="Optional"
                    className="min-h-[48px] bg-card/60 border-border/50 focus:border-primary/60 pr-10 font-mono placeholder:text-muted-foreground/40"
                  />
                  <UnitSuffix>m²</UnitSuffix>
                </div>
              </div>

              {/* Special Requirements */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Special Requirements / 特殊要求
                </Label>
                <Textarea
                  {...register("specialRequirements")}
                  rows={4}
                  placeholder="Cleanroom class, ESD protection, media constraints, noise limits..."
                  className="min-h-[100px] bg-card/60 border-border/50 focus:border-primary/60 placeholder:text-muted-foreground/40"
                />
              </div>

              {/* Summary preview */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-primary mb-2">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Ready to Submit</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  All four sections will be compiled into a structured technical questionnaire and
                  attached to your trip report for engineering review.
                </p>
              </div>
            </div>
          )}
        </div>
      </form>

      {/* ═══════════════════════════════════════════
          FIXED BOTTOM NAVIGATION BAR
          ═══════════════════════════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border/50 bg-card/90 backdrop-blur-xl px-4 py-3 z-20">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={goBack}
            disabled={step === 0}
            className="min-h-[48px] px-5 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>

          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`
                  h-2 rounded-full transition-all duration-300
                  ${i === step ? "w-6 bg-primary" : i < step ? "w-2 bg-primary/50" : "w-2 bg-muted"}
                `}
              />
            ))}
          </div>

          {step < 3 ? (
            <Button
              type="button"
              onClick={goNext}
              className={`min-h-[48px] px-6 bg-gradient-to-r ${STEPS[step].gradient} text-white border-0 hover:opacity-90 shadow-lg`}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={submitMut.isPending}
              className="min-h-[48px] px-6 bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0 hover:opacity-90 shadow-lg shadow-emerald-500/20"
            >
              {submitMut.isPending ? (
                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Submitting...</>
              ) : (
                <><ShieldCheck className="h-4 w-4 mr-1.5" /> Submit Questionnaire</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
