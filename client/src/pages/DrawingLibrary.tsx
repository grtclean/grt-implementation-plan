import { useLanguage } from "@/contexts/LanguageContext";

export default function DrawingLibrary() {
  const { t } = useLanguage();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{t("rnd.drawings.title")}</h1>
      <p className="text-muted-foreground mt-2">{t("rnd.drawings.comingSoon")}</p>
    </div>
  );
}
