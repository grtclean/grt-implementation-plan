/**
 * GRT i18n — Domain-split translation modules with lazy loading
 *
 * Core modules (common, nav, menu, auth, home, ui, copilot) load eagerly (~5K lines).
 * Domain modules (auto-pages, ai, admin, manufacturing, etc.) load lazily (~108K lines)
 * and merge into the translations object asynchronously.
 *
 * The `t()` function in LanguageContext falls back to the key if a translation
 * is not yet loaded — but since domain pages are also React.lazy(), the
 * translations always arrive before (or alongside) the page that needs them.
 */

import type { Language, TranslationModule } from "./types";
export type { Language, TranslationModule } from "./types";
export { languageNames, languageFlags } from "./types";

// ── Core modules (eager — needed for initial render) ────────────────
import { commonTranslations } from "./common";
import { navTranslations } from "./nav";
import { menuTranslations } from "./menu";
import { authTranslations } from "./auth";
import { homeTranslations } from "./home";
import { uiTranslations } from "./ui";
import { copilotTranslations } from "./copilot";

const coreModules: TranslationModule[] = [
  commonTranslations,
  navTranslations,
  menuTranslations,
  authTranslations,
  homeTranslations,
  uiTranslations,
  copilotTranslations,
];

// ── Merge helper ────────────────────────────────────────────────────
const languages: Language[] = ["zh", "en", "de", "fr"];

function mergeModules(mods: TranslationModule[]): Record<Language, Record<string, string>> {
  const result = {} as Record<Language, Record<string, string>>;
  for (const lang of languages) {
    result[lang] = {};
    for (const mod of mods) {
      Object.assign(result[lang], mod[lang]);
    }
  }
  return result;
}

function mergeInto(
  target: Record<Language, Record<string, string>>,
  mod: TranslationModule,
): void {
  for (const lang of languages) {
    if (!target[lang]) target[lang] = {};
    Object.assign(target[lang], mod[lang]);
  }
}

// ── Build initial translations from core modules ────────────────────
export const translations = mergeModules(coreModules);

// ── Lazy domain modules — loaded async, merged when ready ───────────
// Subscribers get notified when new translations are merged in,
// so LanguageContext can trigger a re-render.
type Listener = () => void;
const listeners = new Set<Listener>();
export function onTranslationsUpdated(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notifyListeners() {
  for (const fn of listeners) fn();
}

// Load a module and merge it in
function lazyLoad(importFn: () => Promise<{ default: TranslationModule } | TranslationModule | Record<string, TranslationModule>>): void {
  importFn().then((mod) => {
    // Handle various export shapes
    const translationMod: TranslationModule =
      "default" in mod ? (mod as { default: TranslationModule }).default :
      "zh" in mod ? (mod as TranslationModule) :
      Object.values(mod).find((v): v is TranslationModule => v && typeof v === "object" && "zh" in v)!;
    if (translationMod) {
      mergeInto(translations, translationMod);
      notifyListeners();
    }
  }).catch(() => {
    // Silent — translations for this domain will show keys as fallback
  });
}

// ── Kick off lazy loads immediately (parallel fetch) ────────────────
// These will resolve during/after the initial render.
// Largest modules first (most likely to be needed soonest).
lazyLoad(() => import("./auto-pages").then(m => ({ default: m.autoPageTranslations })));
lazyLoad(() => import("./admin").then(m => ({ default: m.adminTranslations })));
lazyLoad(() => import("./ai").then(m => ({ default: m.aiTranslations })));
lazyLoad(() => import("./meeting-intelligence").then(m => ({ default: m.meetingIntelligenceTranslations })));
lazyLoad(() => import("./manufacturing").then(m => ({ default: m.manufacturingTranslations })));
lazyLoad(() => import("./supply-chain").then(m => ({ default: m.supplyChainTranslations })));
lazyLoad(() => import("./hr").then(m => ({ default: m.hrTranslations })));
lazyLoad(() => import("./quality").then(m => ({ default: m.qualityTranslations })));
lazyLoad(() => import("./finance").then(m => ({ default: m.financeTranslations })));
lazyLoad(() => import("./crm").then(m => ({ default: m.crmTranslations })));
lazyLoad(() => import("./projects").then(m => ({ default: m.projectsTranslations })));
lazyLoad(() => import("./after-sales").then(m => ({ default: m.afterSalesTranslations })));
lazyLoad(() => import("./admin-pages").then(m => ({ default: m.adminPagesTranslations })));
lazyLoad(() => import("./rnd").then(m => ({ default: m.rndTranslations })));
lazyLoad(() => import("./workspace").then(m => ({ default: m.workspaceTranslations })));
lazyLoad(() => import("./marketing").then(m => ({ default: m.marketingTranslations })));
lazyLoad(() => import("./robot-cleaning").then(m => ({ default: m.robotCleaningTranslations })));
lazyLoad(() => import("./document-governance").then(m => ({ default: m.documentGovernanceTranslations })));
lazyLoad(() => import("./ido").then(m => ({ default: m.idoTranslations })));
lazyLoad(() => import("./empowerment").then(m => ({ default: m.empowermentTranslations })));
lazyLoad(() => import("./meeting-executive").then(m => ({ default: m.meetingExecutiveTranslations })));
