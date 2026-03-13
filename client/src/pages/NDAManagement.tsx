import { useLanguage } from "@/contexts/LanguageContext";

export default function NDAManagement() {
  const { t } = useLanguage();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{t("hr.nda.title")}</h1>
      <p className="text-muted-foreground mt-2">{t("hr.nda.comingSoon")}</p>
    </div>
  );
}
