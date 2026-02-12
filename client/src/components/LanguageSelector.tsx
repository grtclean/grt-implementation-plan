import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";
import { Globe, Check } from "lucide-react";
import { type Language } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface LanguageSelectorProps {
  variant?: "default" | "compact" | "header";
  className?: string;
}

export default function LanguageSelector({ variant = "default", className = "" }: LanguageSelectorProps) {
  const { language, setLanguage, languageNames, languageFlags, availableLanguages, t, isChanging } = useLanguage();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleLanguageChange = (lang: Language) => {
    if (lang === language) return;
    setIsAnimating(true);
    setLanguage(lang);
    // Reset animation after transition
    setTimeout(() => setIsAnimating(false), 400);
  };

  if (variant === "compact") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`h-8 px-2 ${className}`}
          >
            <span className={cn(
              "text-base mr-1 transition-transform duration-300",
              isAnimating && "lang-flag-animate"
            )}>{languageFlags[language]}</span>
            <span className="text-xs font-medium">{language.toUpperCase()}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[140px] lang-switcher-dropdown">
          {availableLanguages.map((lang) => (
            <DropdownMenuItem
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className="cursor-pointer flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <span className="text-base">{languageFlags[lang]}</span>
                <span>{languageNames[lang]}</span>
              </span>
              {language === lang && <Check className="w-4 h-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === "header") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={`border-border/50 bg-background/50 backdrop-blur-sm hover:bg-accent ${className}`}
          >
            <Globe className="w-4 h-4 mr-2" />
            <span className={cn(
              "text-base mr-1 transition-transform duration-300",
              isAnimating && "lang-flag-animate"
            )}>{languageFlags[language]}</span>
            <span className="font-medium">{languageNames[language]}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[160px] lang-switcher-dropdown">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            {t("language.select")}
          </div>
          {availableLanguages.map((lang) => (
            <DropdownMenuItem
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className="cursor-pointer flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <span className="text-base">{languageFlags[lang]}</span>
                <span>{languageNames[lang]}</span>
              </span>
              {language === lang && <Check className="w-4 h-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Default variant
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`flex-1 border-sidebar-border bg-sidebar hover:bg-sidebar-accent text-sidebar-foreground ${className}`}
        >
          <Globe className="w-4 h-4 mr-2" />
          <span className={cn(
            "text-base mr-1 transition-transform duration-300",
            isAnimating && "lang-flag-animate"
          )}>{languageFlags[language]}</span>
          <span>{language.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[160px] lang-switcher-dropdown">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {t("language.select")}
        </div>
        {availableLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => handleLanguageChange(lang)}
            className="cursor-pointer flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <span className="text-base">{languageFlags[lang]}</span>
              <span>{languageNames[lang]}</span>
            </span>
            {language === lang && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
