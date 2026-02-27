import { AlertTriangle, RefreshCw } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

interface QueryErrorBannerProps {
  error: { message: string } | null | undefined;
  onRetry?: () => void;
}

/**
 * Inline error banner for failed tRPC queries.
 * Renders in-page instead of crashing to ErrorBoundary or redirecting.
 * Shows error message + retry button. Renders nothing when error is null.
 */
export default function QueryErrorBanner({ error, onRetry }: QueryErrorBannerProps) {
  const { language } = useLanguage();
  const isZh = language === "zh";

  if (!error) return null;

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-4 text-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-red-700 dark:text-red-400">
            {isZh ? "数据加载异常" : "Data loading error"}
          </p>
          <p className="mt-1 text-red-600 dark:text-red-300 font-mono text-xs break-all">
            {error.message}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 inline-flex items-center gap-1.5 rounded bg-red-100 dark:bg-red-900/50 px-3 py-1 text-xs text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              {isZh ? "重新加载" : "Retry"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
