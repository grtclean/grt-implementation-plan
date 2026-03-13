import { useLanguage } from "@/contexts/LanguageContext";

export default function EquipmentComplianceTracker() {
  const { t } = useLanguage();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{t("manufacturing.equipCompliance.title")}</h1>
      <p className="text-muted-foreground mt-2">{t("manufacturing.equipCompliance.comingSoon")}</p>
    </div>
  );
}
