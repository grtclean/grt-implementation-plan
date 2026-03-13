/**
 * Office 365 Encrypted Email Ferry — Cross-Border Sync Dashboard
 *
 * CEO-facing UI to demonstrate the US → China data pipeline with
 * strict PII stripping via whitelist desensitization.
 *
 * Layout (Microsoft Fluent Design):
 *   1. Header: title + architecture diagram summary
 *   2. "Pending US Orders" table: shows raw data WITH PII
 *   3. Microsoft Blue action button: "Desensitize & Sync to China via Office 365"
 *   4. Green "Compliance Verification" panel: shows EXACT stripped JSON
 */
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  ShieldCheck,
  Send,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Globe,
  Server,
  ArrowRight,
  Loader2,
  FileJson,
  XCircle,
} from "lucide-react";

// ── Fluent Design tokens ───────────────────────────────────
const FLUENT_BG = "#faf9f8";
const FLUENT_CARD = "#ffffff";
const FLUENT_BORDER = "#e1dfdd";
const FLUENT_ACCENT = "#0078d4"; // Microsoft Blue
const FLUENT_SUCCESS = "#107c10";
const FLUENT_DANGER = "#d13438";
const FLUENT_SUBTLE = "#605e5c";
const FLUENT_WARN = "#ffaa44";

const QUERY_OPTS = { retry: false, refetchOnWindowFocus: false } as const;

// ── PII field definitions for visual marking ───────────────
const PII_FIELDS = new Set([
  "customer_name",
  "customer_email",
  "customer_phone",
  "unit_price",
  "total_price",
  "shipping_address",
  "payment_method",
]);

const SAFE_FIELDS = new Set(["order_id", "sku", "quantity", "specs"]);

// ── Types ──────────────────────────────────────────────────
interface DesensitizedOrder {
  order_id: string;
  sku: string;
  quantity: number;
  specs: string;
}

interface SyncResult {
  success: boolean;
  simulated: boolean;
  messageId?: string;
  desensitizedPayload: DesensitizedOrder[];
  audit: {
    totalOrders: number;
    fieldsRetained: string[];
    fieldsDropped: string[];
    timestamp: string;
  };
}

// ── Component ──────────────────────────────────────────────
export default function CrossBorderSync() {
  const { t, tpl } = useLanguage();
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch demo US orders from DB ──────────────────────
  const ordersQuery = trpc.operationsDashboard.getUSOrders.useQuery(undefined, QUERY_OPTS);
  const usOrders = (ordersQuery.data ?? []) as any[];

  // ── tRPC mutation ─────────────────────────────────────
  const dispatchMut = trpc.syncDispatch.dispatch.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setResult(data as any);
        setError(null);
        toast.success(t("admin.crossBorder.syncSuccess"));
      } else {
        setError((data as any).error || t("admin.crossBorder.syncFailed"));
      }
    },
    onError: (err) => {
      setError(err.message || "Network error");
      toast.error(t("admin.crossBorder.syncFailed"));
    },
  });

  const syncing = dispatchMut.isPending;

  const handleSync = () => {
    setError(null);
    setResult(null);
    dispatchMut.mutate({ orders: usOrders });
  };

  return (
    <div
      className="min-h-screen p-6"
      style={{
        background: FLUENT_BG,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ═══════════ HEADER ═══════════ */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: `${FLUENT_ACCENT}15` }}
              >
                <Shield className="w-5 h-5" style={{ color: FLUENT_ACCENT }} />
              </div>
              {t("admin.crossBorder.title")}
            </h1>
            <p className="text-sm mt-1" style={{ color: FLUENT_SUBTLE }}>
              {t("admin.crossBorder.subtitle")}
            </p>
          </div>
          <Badge
            variant="outline"
            className="text-xs px-3 py-1"
            style={{ borderColor: FLUENT_SUCCESS, color: FLUENT_SUCCESS }}
          >
            <Lock className="w-3 h-3 mr-1" />
            {t("admin.crossBorder.encrypted")}
          </Badge>
        </div>

        {/* ═══════════ ARCHITECTURE DIAGRAM ═══════════ */}
        <Card
          style={{
            background: FLUENT_CARD,
            border: `1px solid ${FLUENT_BORDER}`,
          }}
        >
          <CardContent className="py-4">
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 border border-blue-200">
                <Globe className="w-4 h-4 text-blue-600" />
                <div>
                  <div className="font-semibold text-blue-800">{t("admin.crossBorder.usGlobalHub")}</div>
                  <div className="text-xs text-blue-600">{t("admin.crossBorder.rawOrdersPii")}</div>
                </div>
              </div>

              <ArrowRight className="w-5 h-5" style={{ color: FLUENT_SUBTLE }} />

              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 border border-red-200">
                <ShieldCheck className="w-4 h-4 text-red-600" />
                <div>
                  <div className="font-semibold text-red-800">{t("admin.crossBorder.desensitizer")}</div>
                  <div className="text-xs text-red-600">{t("admin.crossBorder.whitelistFilter")}</div>
                </div>
              </div>

              <ArrowRight className="w-5 h-5" style={{ color: FLUENT_SUBTLE }} />

              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-50 border border-purple-200">
                <Mail className="w-4 h-4 text-purple-600" />
                <div>
                  <div className="font-semibold text-purple-800">
                    O365 SMTP
                  </div>
                  <div className="text-xs text-purple-600">
                    smtp.office365.com:587
                  </div>
                </div>
              </div>

              <ArrowRight className="w-5 h-5" style={{ color: FLUENT_SUBTLE }} />

              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 border border-green-200">
                <Server className="w-4 h-4 text-green-600" />
                <div>
                  <div className="font-semibold text-green-800">
                    {t("admin.crossBorder.chinaOnPrem")}
                  </div>
                  <div className="text-xs text-green-600">
                    cn-receive@gerrytech.com
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ═══════════ PENDING US ORDERS TABLE ═══════════ */}
        <Card
          style={{
            background: FLUENT_CARD,
            border: `1px solid ${FLUENT_BORDER}`,
          }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" style={{ color: FLUENT_WARN }} />
              {t("admin.crossBorder.rawDataPii")}
            </CardTitle>
            <p className="text-xs" style={{ color: FLUENT_SUBTLE }}>
              {t("admin.crossBorder.piiWarning")}
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    style={{
                      borderBottom: `2px solid ${FLUENT_BORDER}`,
                    }}
                  >
                    {[
                      "Order ID",
                      "Customer Name",
                      "Email",
                      "Phone",
                      "SKU",
                      "Qty",
                      "Unit Price",
                      "Total",
                      "Specs",
                    ].map((header) => {
                      const isPII = [
                        "Customer Name",
                        "Email",
                        "Phone",
                        "Unit Price",
                        "Total",
                      ].includes(header);
                      return (
                        <th
                          key={header}
                          className="py-2 px-3 text-left font-semibold text-xs"
                          style={{
                            color: isPII ? FLUENT_DANGER : FLUENT_SUBTLE,
                          }}
                        >
                          <div className="flex items-center gap-1">
                            {isPII && <EyeOff className="w-3 h-3" />}
                            {header}
                            {isPII && (
                              <span
                                className="text-xs px-1 py-0.5 rounded"
                                style={{
                                  background: `${FLUENT_DANGER}15`,
                                  color: FLUENT_DANGER,
                                  fontSize: "10px",
                                }}
                              >
                                PII
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {usOrders.map((order) => (
                    <tr
                      key={order.order_id}
                      style={{ borderBottom: `1px solid ${FLUENT_BORDER}` }}
                    >
                      <td className="py-2.5 px-3 font-mono text-xs font-medium">
                        {order.order_id}
                      </td>
                      <td
                        className="py-2.5 px-3"
                        style={{
                          background: `${FLUENT_DANGER}08`,
                          color: FLUENT_DANGER,
                        }}
                      >
                        {order.customer_name}
                      </td>
                      <td
                        className="py-2.5 px-3 text-xs"
                        style={{
                          background: `${FLUENT_DANGER}08`,
                          color: FLUENT_DANGER,
                        }}
                      >
                        {order.customer_email}
                      </td>
                      <td
                        className="py-2.5 px-3 text-xs"
                        style={{
                          background: `${FLUENT_DANGER}08`,
                          color: FLUENT_DANGER,
                        }}
                      >
                        {order.customer_phone}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs">
                        {order.sku}
                      </td>
                      <td className="py-2.5 px-3 text-center">{order.quantity}</td>
                      <td
                        className="py-2.5 px-3 font-mono"
                        style={{
                          background: `${FLUENT_DANGER}08`,
                          color: FLUENT_DANGER,
                        }}
                      >
                        ${order.unit_price.toLocaleString()}
                      </td>
                      <td
                        className="py-2.5 px-3 font-mono font-bold"
                        style={{
                          background: `${FLUENT_DANGER}08`,
                          color: FLUENT_DANGER,
                        }}
                      >
                        ${order.total_price.toLocaleString()}
                      </td>
                      <td
                        className="py-2.5 px-3 text-xs max-w-[200px] truncate"
                        title={order.specs}
                      >
                        {order.specs}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: `1px solid ${FLUENT_BORDER}` }}>
              <div className="flex items-center gap-1 text-xs">
                <span
                  className="w-3 h-3 rounded"
                  style={{ background: `${FLUENT_DANGER}15` }}
                />
                <span style={{ color: FLUENT_DANGER }}>
                  {t("admin.crossBorder.piiWillStrip")}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span
                  className="w-3 h-3 rounded"
                  style={{ background: FLUENT_CARD, border: `1px solid ${FLUENT_BORDER}` }}
                />
                <span style={{ color: FLUENT_SUBTLE }}>
                  {t("admin.crossBorder.safeWillTransmit")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ═══════════ ACTION BUTTON ═══════════ */}
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleSync}
            disabled={syncing}
            className="h-14 px-10 text-base font-semibold rounded-lg shadow-lg transition-all hover:shadow-xl"
            style={{
              background: syncing ? FLUENT_SUBTLE : FLUENT_ACCENT,
              color: "#fff",
            }}
          >
            {syncing ? (
              <Loader2 className="w-5 h-5 mr-3 animate-spin" />
            ) : (
              <Send className="w-5 h-5 mr-3" />
            )}
            {syncing
              ? t("admin.crossBorder.btnDispatching")
              : t("admin.crossBorder.btnDesensitize")}
          </Button>
        </div>

        {/* ═══════════ ERROR PANEL ═══════════ */}
        {error && (
          <Card
            style={{
              background: `${FLUENT_DANGER}08`,
              border: `1px solid ${FLUENT_DANGER}`,
            }}
          >
            <CardContent className="py-4 flex items-center gap-3">
              <XCircle className="w-5 h-5 shrink-0" style={{ color: FLUENT_DANGER }} />
              <div>
                <p className="font-semibold" style={{ color: FLUENT_DANGER }}>
                  {t("admin.crossBorder.dispatchFailed")}
                </p>
                <p className="text-sm" style={{ color: FLUENT_DANGER }}>
                  {error}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══════════ COMPLIANCE VERIFICATION PANEL ═══════════ */}
        {result && (
          <Card
            style={{
              background: `${FLUENT_SUCCESS}08`,
              border: `2px solid ${FLUENT_SUCCESS}`,
            }}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: `${FLUENT_SUCCESS}20` }}
                >
                  <ShieldCheck
                    className="w-6 h-6"
                    style={{ color: FLUENT_SUCCESS }}
                  />
                </div>
                <div>
                  <div
                    className="text-lg font-bold"
                    style={{ color: FLUENT_SUCCESS }}
                  >
                    {t("admin.crossBorder.complianceTitle")}
                  </div>
                  <div className="text-sm font-normal" style={{ color: FLUENT_SUBTLE }}>
                    {tpl("admin.crossBorder.exactPayloadDesc", {
                      action: result.simulated ? t("admin.crossBorder.preparedFor") : t("admin.crossBorder.sentVia"),
                    })}
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Dispatch metadata */}
              <div className="flex flex-wrap gap-3">
                <Badge
                  variant="outline"
                  className="text-xs"
                  style={{ borderColor: FLUENT_SUCCESS, color: FLUENT_SUCCESS }}
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {result.simulated ? "Simulated" : "Sent"} via O365
                </Badge>
                <Badge
                  variant="outline"
                  className="text-xs"
                  style={{ borderColor: FLUENT_ACCENT, color: FLUENT_ACCENT }}
                >
                  <Mail className="w-3 h-3 mr-1" />
                  To: cn-receive@gerrytech.com
                </Badge>
                <Badge
                  variant="outline"
                  className="text-xs font-mono"
                  style={{ borderColor: FLUENT_SUBTLE, color: FLUENT_SUBTLE }}
                >
                  MsgID: {result.messageId}
                </Badge>
              </div>

              {/* Audit summary */}
              <div
                className="grid grid-cols-2 gap-4 p-4 rounded-lg"
                style={{ background: FLUENT_CARD, border: `1px solid ${FLUENT_BORDER}` }}
              >
                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: FLUENT_SUCCESS }}>
                    <Eye className="w-3 h-3 inline mr-1" />
                    {t("admin.crossBorder.fieldsRetained")}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {result.audit.fieldsRetained.map((f) => (
                      <span
                        key={f}
                        className="px-2 py-0.5 rounded text-xs font-mono"
                        style={{
                          background: `${FLUENT_SUCCESS}15`,
                          color: FLUENT_SUCCESS,
                        }}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: FLUENT_DANGER }}>
                    <EyeOff className="w-3 h-3 inline mr-1" />
                    {t("admin.crossBorder.fieldsDropped")}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {result.audit.fieldsDropped.map((f) => (
                      <span
                        key={f}
                        className="px-2 py-0.5 rounded text-xs font-mono line-through"
                        style={{
                          background: `${FLUENT_DANGER}15`,
                          color: FLUENT_DANGER,
                        }}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* THE EXACT JSON PAYLOAD */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileJson className="w-4 h-4" style={{ color: FLUENT_ACCENT }} />
                  <span className="text-sm font-semibold">
                    {t("admin.crossBorder.exactPayload")}
                  </span>
                  <span className="text-xs" style={{ color: FLUENT_SUBTLE }}>
                    {t("admin.crossBorder.verifyNoFields")}
                  </span>
                </div>
                <pre
                  className="p-4 rounded-lg text-sm font-mono overflow-x-auto leading-relaxed"
                  style={{
                    background: "#1e1e1e",
                    color: "#d4d4d4",
                    border: `1px solid ${FLUENT_BORDER}`,
                  }}
                >
                  {JSON.stringify(result.desensitizedPayload, null, 2)}
                </pre>
              </div>

              {/* Verification checklist */}
              <div
                className="p-4 rounded-lg"
                style={{
                  background: `${FLUENT_SUCCESS}05`,
                  border: `1px solid ${FLUENT_SUCCESS}40`,
                }}
              >
                <div className="text-sm font-semibold mb-2" style={{ color: FLUENT_SUCCESS }}>
                  {t("admin.crossBorder.piiChecklist")}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    { label: "Customer Names", example: "John Doe, Sarah Miller..." },
                    { label: "Email Addresses", example: "john.doe@acme-corp.com..." },
                    { label: "Phone Numbers", example: "+1-555-0142..." },
                    { label: "Pricing Data", example: "$5,000, $24,600..." },
                    { label: "Shipping Addresses", example: "1234 Innovation Dr..." },
                    { label: "Payment Methods", example: "Wire Transfer, L/C..." },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <CheckCircle2
                        className="w-4 h-4 shrink-0"
                        style={{ color: FLUENT_SUCCESS }}
                      />
                      <span>
                        <strong>{item.label}</strong>{" "}
                        <span style={{ color: FLUENT_SUBTLE }}>
                          ({item.example})
                        </span>
                      </span>
                      <span
                        className="text-xs font-bold ml-auto"
                        style={{ color: FLUENT_SUCCESS }}
                      >
                        {t("admin.crossBorder.stripped")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
