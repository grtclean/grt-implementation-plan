/**
 * Server-side translation utility for GRT i18n
 * Provides serverT(key, language) for translating common server messages.
 */

type Language = 'zh' | 'en' | 'de' | 'fr';

const serverTranslations: Record<string, Record<Language, string>> = {
  // Common server messages
  "server.unauthorized": { zh: "未授权访问", en: "Unauthorized access", de: "Nicht autorisierter Zugriff", fr: "Accès non autorisé" },
  "server.notFound": { zh: "资源未找到", en: "Resource not found", de: "Ressource nicht gefunden", fr: "Ressource non trouvée" },
  "server.forbidden": { zh: "禁止访问", en: "Access forbidden", de: "Zugriff verboten", fr: "Accès interdit" },
  "server.validationError": { zh: "数据验证失败", en: "Validation failed", de: "Validierung fehlgeschlagen", fr: "Échec de la validation" },
  "server.serverError": { zh: "服务器内部错误", en: "Internal server error", de: "Interner Serverfehler", fr: "Erreur interne du serveur" },
  "server.success": { zh: "操作成功", en: "Operation successful", de: "Vorgang erfolgreich", fr: "Opération réussie" },
  "server.createSuccess": { zh: "创建成功", en: "Created successfully", de: "Erfolgreich erstellt", fr: "Créé avec succès" },
  "server.updateSuccess": { zh: "更新成功", en: "Updated successfully", de: "Erfolgreich aktualisiert", fr: "Mis à jour avec succès" },
  "server.deleteSuccess": { zh: "删除成功", en: "Deleted successfully", de: "Erfolgreich gelöscht", fr: "Supprimé avec succès" },
  "server.loginRequired": { zh: "请先登录", en: "Please login first", de: "Bitte zuerst anmelden", fr: "Veuillez vous connecter d'abord" },
  "server.permissionDenied": { zh: "权限不足", en: "Insufficient permissions", de: "Unzureichende Berechtigungen", fr: "Permissions insuffisantes" },
  "server.rateLimited": { zh: "请求过于频繁，请稍后再试", en: "Too many requests, please try again later", de: "Zu viele Anfragen, bitte versuchen Sie es später erneut", fr: "Trop de requêtes, veuillez réessayer plus tard" },
  "server.duplicateEntry": { zh: "数据重复", en: "Duplicate entry", de: "Doppelter Eintrag", fr: "Entrée en double" },
  "server.fileUploadFailed": { zh: "文件上传失败", en: "File upload failed", de: "Datei-Upload fehlgeschlagen", fr: "Échec du téléchargement du fichier" },
  "server.invalidInput": { zh: "输入参数无效", en: "Invalid input parameters", de: "Ungültige Eingabeparameter", fr: "Paramètres d'entrée invalides" },
  "server.dbError": { zh: "数据库操作失败", en: "Database operation failed", de: "Datenbankvorgang fehlgeschlagen", fr: "Échec de l'opération de base de données" },

  // ── Empowerment scheduler narrative templates ──
  "empowerment.narrativeTodayPlan": { zh: "今日作战计划", en: "Today's Battle Plan", de: "Heutiger Kampfplan", fr: "Plan de combat du jour" },
  "empowerment.narrativeOkrAlignment": { zh: "OKR 对齐", en: "OKR Alignment", de: "OKR-Ausrichtung", fr: "Alignement OKR" },
  "empowerment.narrativeKeyPriorities": { zh: "重点事项", en: "Key Priorities", de: "Hauptprioritäten", fr: "Priorités clés" },
  "empowerment.narrativeNoUrgent": { zh: "暂无紧急事项，请聚焦既定计划", en: "No urgent items — focus on your existing plan", de: "Keine dringenden Punkte — konzentrieren Sie sich auf Ihren Plan", fr: "Aucun élément urgent — concentrez-vous sur votre plan existant" },
  "empowerment.narrativeDisclaimer": { zh: "以上为 AI 自动生成的今日工作建议，请结合实际调整优先级。", en: "The above is an AI-generated daily work recommendation. Please adjust priorities based on reality.", de: "Dies ist eine KI-generierte Empfehlung. Bitte passen Sie die Prioritäten an die Realität an.", fr: "Ceci est une recommandation générée par IA. Veuillez ajuster les priorités selon la réalité." },
  "empowerment.narrativeMonthlyPanorama": { zh: "月度绩效全景", en: "Monthly Performance Panorama", de: "Monatliches Leistungspanorama", fr: "Panorama de performance mensuel" },
  "empowerment.narrativeHoursStats": { zh: "工时统计", en: "Hours Statistics", de: "Stundenstatistik", fr: "Statistiques d'heures" },
  "empowerment.narrativeHoursUnit": { zh: "小时", en: "hours", de: "Stunden", fr: "heures" },
  "empowerment.narrativeTasksCompleted": { zh: "任务完成", en: "Tasks Completed", de: "Aufgaben erledigt", fr: "Tâches terminées" },
  "empowerment.narrativeTasksUnit": { zh: "项", en: "items", de: "Punkte", fr: "éléments" },
  "empowerment.narrativeStrengths": { zh: "优势", en: "Strengths", de: "Stärken", fr: "Points forts" },
  "empowerment.narrativeImprovements": { zh: "待改善", en: "Areas for Improvement", de: "Verbesserungsbereiche", fr: "Axes d'amélioration" },
  "empowerment.narrativeTraining": { zh: "培训建议", en: "Training Recommendations", de: "Schulungsempfehlungen", fr: "Recommandations de formation" },
  "empowerment.narrativeReportDisclaimer": { zh: "本报告由系统自动生成，薪资部分需密码验证后查看。", en: "This report is auto-generated. Salary details require password verification.", de: "Dieser Bericht wird automatisch erstellt. Gehaltsdetails erfordern eine Passwortbestätigung.", fr: "Ce rapport est généré automatiquement. Les détails du salaire nécessitent une vérification par mot de passe." },
  "empowerment.analysisHoursExcellent": { zh: "月度工时充足，出勤优秀", en: "Sufficient monthly hours, excellent attendance", de: "Ausreichende Monatsstunden, hervorragende Anwesenheit", fr: "Heures mensuelles suffisantes, excellente assiduité" },
  "empowerment.analysisHoursLow": { zh: "月度工时不足，需改善出勤", en: "Monthly hours below target, attendance needs improvement", de: "Monatsstunden unter dem Ziel, Anwesenheit muss verbessert werden", fr: "Heures mensuelles insuffisantes, l'assiduité doit être améliorée" },
  "empowerment.analysisTasksEfficient": { zh: "任务产出高效", en: "High task output efficiency", de: "Hohe Aufgabeneffizienz", fr: "Haute efficacité de production de tâches" },
  "empowerment.analysisTasksLow": { zh: "任务完成量偏低", en: "Low task completion volume", de: "Geringe Aufgabenabschlussrate", fr: "Faible volume de tâches terminées" },
  "empowerment.trainingTimeManagement": { zh: "时间管理与效率提升", en: "Time Management & Efficiency", de: "Zeitmanagement & Effizienz", fr: "Gestion du temps et efficacité" },
  "empowerment.trainingReasonLowCompletion": { zh: "月度任务完成率低", en: "Low monthly task completion rate", de: "Niedrige monatliche Aufgabenabschlussrate", fr: "Faible taux de réalisation mensuel des tâches" },
  "empowerment.notifyBillGenerated": { zh: "月度绩效账单已生成", en: "Monthly performance report generated", de: "Monatlicher Leistungsbericht erstellt", fr: "Rapport de performance mensuel généré" },
  "empowerment.notifyBillContent": { zh: "已为 {count} 名员工生成 {period} 月度绩效全景账单。", en: "Generated {period} monthly performance reports for {count} employees.", de: "{period} monatliche Leistungsberichte für {count} Mitarbeiter erstellt.", fr: "Rapports de performance {period} générés pour {count} employés." },
};

export function serverT(key: string, language: Language = 'zh'): string {
  return serverTranslations[key]?.[language] || serverTranslations[key]?.['zh'] || key;
}

/** Template interpolation: replaces `{key}` placeholders in a translated string */
export function serverTpl(key: string, vars: Record<string, string | number>, language: Language = 'zh'): string {
  let text = serverT(key, language);
  for (const [k, v] of Object.entries(vars)) {
    text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return text;
}

export function resolveLanguageFromHeader(acceptLanguage: string | undefined): Language {
  if (!acceptLanguage) return 'zh';
  if (acceptLanguage.includes('de')) return 'de';
  if (acceptLanguage.includes('fr')) return 'fr';
  if (acceptLanguage.includes('en')) return 'en';
  return 'zh';
}

export type { Language };
