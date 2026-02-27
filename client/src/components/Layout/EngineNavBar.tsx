/**
 * EngineNavBar — Cross-engine navigation tabs
 *
 * Horizontal tab bar linking the 4 routable engines.
 * Displayed on engine landing pages for quick switching.
 */
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import {
  User,
  Target,
  Factory,
  Briefcase,
} from "lucide-react";

const ENGINES = [
  { id: "me",        path: "/me",        icon: User,       labelZh: "千人千面",  labelEn: "My Portal",   color: "#0078D4" },
  { id: "strategy",  path: "/strategy",  icon: Target,     labelZh: "战略中枢",  labelEn: "Strategy",    color: "#4F6BED" },
  { id: "operations",path: "/operations",icon: Factory,    labelZh: "运营中枢",  labelEn: "Operations",  color: "#008272" },
  { id: "resources", path: "/resources", icon: Briefcase,  labelZh: "资源中枢",  labelEn: "Resources",   color: "#CA5010" },
] as const;

export default function EngineNavBar() {
  const [location, setLocation] = useLocation();
  const { language } = useLanguage();
  const isZh = language === "zh";

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-[#faf9f8] border border-[#edebe9] mb-4 overflow-x-auto scrollbar-hide">
      {ENGINES.map((eng) => {
        const Icon = eng.icon;
        const isActive = location === eng.path;
        return (
          <button
            key={eng.id}
            onClick={() => setLocation(eng.path)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
              isActive
                ? "bg-white shadow-sm text-[#323130] border border-[#edebe9]"
                : "text-[#605e5c] hover:text-[#323130] hover:bg-white/60"
            )}
          >
            <Icon
              className="w-3.5 h-3.5"
              style={{ color: isActive ? eng.color : undefined }}
            />
            <span>{isZh ? eng.labelZh : eng.labelEn}</span>
          </button>
        );
      })}
    </div>
  );
}
