import { useLanguage } from "@/contexts/LanguageContext";

export default function ProcessTrialWorkbench() {
  const { t } = useLanguage();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{t("manufacturing.processTrial.title")}</h1>
      <p className="text-muted-foreground mt-2">{t("manufacturing.processTrial.comingSoon")}</p>
    </div>
  );
}
