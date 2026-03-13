/**
 * GRT i18n — Domain-split translation modules
 *
 * Each domain file (common.ts, crm.ts, …) owns a TranslationModule with
 * { zh, en, de, fr } sub-objects.  This index merges them into the single
 * `translations` export that LanguageContext.tsx and all other consumers use.
 *
 * Adding a new domain:
 *   1.  Create `client/src/lib/i18n/<domain>.ts` exporting a TranslationModule.
 *   2.  Import it here and add it to the `modules` array.
 *   That's it — no other file needs to change.
 */

import type { Language, TranslationModule } from "./types";
export type { Language, TranslationModule } from "./types";
export { languageNames, languageFlags } from "./types";

// ── Domain modules ──────────────────────────────────────────────────
import { commonTranslations } from "./common";
import { navTranslations } from "./nav";
import { menuTranslations } from "./menu";
import { authTranslations } from "./auth";
import { crmTranslations } from "./crm";
import { projectsTranslations } from "./projects";
import { homeTranslations } from "./home";
import { hrTranslations } from "./hr";
import { financeTranslations } from "./finance";
import { adminTranslations } from "./admin";
import { manufacturingTranslations } from "./manufacturing";
import { qualityTranslations } from "./quality";
import { rndTranslations } from "./rnd";
import { supplyChainTranslations } from "./supply-chain";
import { afterSalesTranslations } from "./after-sales";
import { aiTranslations } from "./ai";
import { meetingIntelligenceTranslations } from "./meeting-intelligence";
import { workspaceTranslations } from "./workspace";
import { marketingTranslations } from "./marketing";
import { robotCleaningTranslations } from "./robot-cleaning";
import { documentGovernanceTranslations } from "./document-governance";
import { idoTranslations } from "./ido";
import { copilotTranslations } from "./copilot";
import { uiTranslations } from "./ui";
import { autoPageTranslations } from "./auto-pages";
import { adminPagesTranslations } from "./admin-pages";
import { empowermentTranslations } from "./empowerment";
import { meetingExecutiveTranslations } from "./meeting-executive";

const modules: TranslationModule[] = [
  commonTranslations,
  navTranslations,
  menuTranslations,
  authTranslations,
  crmTranslations,
  projectsTranslations,
  homeTranslations,
  hrTranslations,
  financeTranslations,
  adminTranslations,
  manufacturingTranslations,
  qualityTranslations,
  rndTranslations,
  supplyChainTranslations,
  afterSalesTranslations,
  aiTranslations,
  meetingIntelligenceTranslations,
  workspaceTranslations,
  marketingTranslations,
  robotCleaningTranslations,
  documentGovernanceTranslations,
  idoTranslations,
  copilotTranslations,
  uiTranslations,
  autoPageTranslations,
  adminPagesTranslations,
  empowermentTranslations,
  meetingExecutiveTranslations,
];

// ── Merge all modules into one translations record ──────────────────
function mergeModules(mods: TranslationModule[]): Record<Language, Record<string, string>> {
  const languages: Language[] = ["zh", "en", "de", "fr"];
  const result = {} as Record<Language, Record<string, string>>;

  for (const lang of languages) {
    result[lang] = {};
    for (const mod of mods) {
      Object.assign(result[lang], mod[lang]);
    }
  }

  return result;
}

export const translations = mergeModules(modules);
