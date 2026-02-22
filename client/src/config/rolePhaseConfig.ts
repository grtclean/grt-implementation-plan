/**
 * Role → M-Phase mapping for Project Lens dashboard filtering.
 * null = all phases visible (admin/PM/GM).
 */
export const ROLE_PHASE_FILTER: Record<string, string[] | null> = {
  bu_sales:          ["M0", "M1", "M2"],
  bu_mech:           ["M3", "M4", "M5"],
  bu_elec:           ["M3", "M4", "M5"],
  procurement_eng:   ["M4", "M5", "M6"],
  production_worker: ["M5", "M6", "M7"],
  cs_engineer:       ["M9", "M10", "M11", "M12"],
  bu_pm:   null,
  bu_gm:   null,
  admin:   null,
  director: null,
};

export const PHASE_LABELS: Record<string, { zh: string; en: string }> = {
  M0:  { zh: "项目启动", en: "Initiation" },
  M1:  { zh: "启动会",   en: "Kickoff" },
  M2:  { zh: "需求评审", en: "Req Review" },
  M3:  { zh: "方案设计", en: "Solution Design" },
  M4:  { zh: "设计评审", en: "Design Review" },
  M5:  { zh: "生产启动", en: "Production Start" },
  M6:  { zh: "生产完成", en: "Production Done" },
  M7:  { zh: "FAT验收", en: "FAT" },
  M8:  { zh: "发货准备", en: "Shipping" },
  M9:  { zh: "现场到货", en: "Site Arrival" },
  M10: { zh: "现场安装", en: "Installation" },
  M11: { zh: "SAT验收", en: "SAT" },
  M12: { zh: "项目关闭", en: "Closure" },
};
