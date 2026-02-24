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
};

export function serverT(key: string, language: Language = 'zh'): string {
  return serverTranslations[key]?.[language] || serverTranslations[key]?.['zh'] || key;
}

export function resolveLanguageFromHeader(acceptLanguage: string | undefined): Language {
  if (!acceptLanguage) return 'zh';
  if (acceptLanguage.includes('de')) return 'de';
  if (acceptLanguage.includes('fr')) return 'fr';
  if (acceptLanguage.includes('en')) return 'en';
  return 'zh';
}

export type { Language };
