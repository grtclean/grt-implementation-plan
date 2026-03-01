/**
 * Shared Form Validation Utilities
 *
 * Provides reusable Zod schemas, a useZodForm hook wrapper,
 * and common validation patterns for the GRT application.
 *
 * Usage:
 *   import { useZodForm, schemas } from "@/lib/form-validation";
 *
 *   const form = useZodForm({ schema: mySchema, defaultValues: { ... } });
 */
import { z } from "zod";
import { useForm, type UseFormProps, type FieldValues, type DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodType } from "zod";

// ────────────────────────────────────────────────────────────────
// Common Zod Schemas — reusable building blocks
// ────────────────────────────────────────────────────────────────

/** Non-empty trimmed string (for required text fields) */
const requiredString = (message = "This field is required") =>
  z.string().min(1, message).transform((s) => s.trim());

/** Optional string that normalizes empty to undefined */
const optionalString = () =>
  z.string().optional().transform((s) => (s?.trim() || undefined));

/** Email validation — optional by default, use .pipe(z.string().min(1)) for required */
const email = (message = "Invalid email address") =>
  z.string().email(message).or(z.literal("")).transform((s) => s || undefined);

/** Required email */
const requiredEmail = (message = "Email is required") =>
  z.string().min(1, message).email("Invalid email address");

/** China phone number (11 digits starting with 1) or empty */
const phone = (message = "Invalid phone number") =>
  z
    .string()
    .regex(/^1[3-9]\d{9}$/, message)
    .or(z.literal(""))
    .transform((s) => s || undefined);

/** Positive number (coerced from string input) */
const positiveNumber = (message = "Must be a positive number") =>
  z.coerce.number().positive(message);

/** Non-negative number (coerced from string input) */
const nonNegativeNumber = (message = "Must be >= 0") =>
  z.coerce.number().nonnegative(message);

/** Optional positive number — empty string yields undefined */
const optionalPositiveNumber = (message = "Must be a positive number") =>
  z.union([
    z.literal("").transform(() => undefined),
    z.coerce.number().positive(message),
  ]);

/** Part number — alphanumeric with dashes, typically required */
const partNumber = (message = "Part number is required") =>
  z.string().min(1, message).transform((s) => s.trim());

/** Material code — required, trimmed */
const materialCode = (message = "Material code is required") =>
  z.string().min(1, message).transform((s) => s.trim());

/** Submission level for PPAP (1-5) */
const submissionLevel = () =>
  z.enum(["1", "2", "3", "4", "5"]).default("3");

/** Severity level for quality complaints */
const severity = () =>
  z.enum(["low", "medium", "high", "critical"]).default("medium");

/** Control plan phase */
const controlPlanPhase = () =>
  z.enum(["prototype", "pre_launch", "production"]).default("prototype");

/** Control method */
const controlMethod = () =>
  z.enum(["visual", "gauge", "spc", "cmm", "test", "audit", "other"]).default("visual");

/** Characteristic type */
const characteristicType = () =>
  z.enum(["product", "process"]).default("product");

// ────────────────────────────────────────────────────────────────
// Exported schemas object — namespace for all common schemas
// ────────────────────────────────────────────────────────────────

export const schemas = {
  requiredString,
  optionalString,
  email,
  requiredEmail,
  phone,
  positiveNumber,
  nonNegativeNumber,
  optionalPositiveNumber,
  partNumber,
  materialCode,
  submissionLevel,
  severity,
  controlPlanPhase,
  controlMethod,
  characteristicType,
} as const;

// ────────────────────────────────────────────────────────────────
// useZodForm — convenience hook combining useForm + zodResolver
// ────────────────────────────────────────────────────────────────

type UseZodFormProps<T extends FieldValues> = {
  schema: ZodType<T, any, any>;
  defaultValues?: DefaultValues<T>;
} & Omit<UseFormProps<T>, "resolver" | "defaultValues">;

/**
 * Combines react-hook-form's useForm with zodResolver.
 *
 * @example
 * const form = useZodForm({
 *   schema: myZodSchema,
 *   defaultValues: { name: "", email: "" },
 * });
 *
 * // In JSX:
 * <form onSubmit={form.handleSubmit(onValid)}>
 *   <input {...form.register("name")} />
 *   {form.formState.errors.name && <p>{form.formState.errors.name.message}</p>}
 * </form>
 */
export function useZodForm<T extends FieldValues>({
  schema,
  defaultValues,
  ...rest
}: UseZodFormProps<T>) {
  return useForm<T>({
    resolver: zodResolver(schema as any),
    defaultValues,
    mode: "onBlur",
    ...rest,
  });
}

// ────────────────────────────────────────────────────────────────
// FieldError helper — renders inline error text for a field
// ────────────────────────────────────────────────────────────────

export { z } from "zod";
export { zodResolver } from "@hookform/resolvers/zod";
