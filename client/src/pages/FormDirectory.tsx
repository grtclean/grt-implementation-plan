/**
 * /form-directory — Failsafe Landing Page
 *
 * Zero dependencies: no tRPC, no DB, no CSV.
 * Proves the route is alive so the CEO can click and see blue.
 */
import { useLanguage } from "@/contexts/LanguageContext";

export default function FormDirectory() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#0078d4] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4 tracking-tight">
          {t("admin.formDir.title")}
        </h1>
        <p className="text-xl text-blue-100">
          {t("admin.formDir.subtitle")}
        </p>
      </div>
    </div>
  );
}
