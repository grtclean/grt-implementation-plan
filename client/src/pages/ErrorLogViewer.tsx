import { getErrorLogs, clearErrorLogs } from "@/components/ErrorBoundary";
import { PageHeader } from "@/components/grt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { AlertTriangle, Trash2, Download, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";

interface ErrorLog {
  id: string;
  error: Error;
  errorInfo: { componentStack: string };
  timestamp: Date;
  level: "page" | "section" | "component";
}

export default function ErrorLogViewer() {
  const { t, tpl } = useLanguage();
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);

  const refreshLogs = () => {
    setLogs([...getErrorLogs()] as ErrorLog[]);
  };

  const handleClearLogs = () => {
    if (confirm(t("admin.errorLog.confirmClear"))) {
      clearErrorLogs();
      setLogs([]);
      setSelectedLog(null);
    }
  };

  const handleDownloadLogs = () => {
    const logsData = logs.map((log) => ({
      id: log.id,
      error: log.error.message,
      stack: log.error.stack,
      componentStack: log.errorInfo.componentStack,
      timestamp: log.timestamp.toISOString(),
      level: log.level,
    }));

    const dataStr = JSON.stringify(logsData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `error-logs-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    refreshLogs();
    const interval = setInterval(() => {
      const current = getErrorLogs();
      setLogs(prev => current.length !== prev.length ? [...current] as ErrorLog[] : prev);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
      <div className="space-y-6">
        <PageHeader
          icon={AlertTriangle}
          title={t("admin.errorLog.title")}
          description={t("admin.errorLog.description")}
          actions={
            <div className="flex gap-2">
              <Button
                onClick={refreshLogs}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw size={16} />
                {t("admin.errorLog.refresh")}
              </Button>
              <Button
                onClick={handleDownloadLogs}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                disabled={logs.length === 0}
              >
                <Download size={16} />
                {t("admin.errorLog.downloadLogs")}
              </Button>
              <Button
                onClick={handleClearLogs}
                variant="destructive"
                size="sm"
                className="flex items-center gap-2"
                disabled={logs.length === 0}
              >
                <Trash2 size={16} />
                {t("admin.errorLog.clearLogs")}
              </Button>
            </div>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t("admin.errorLog.totalErrors")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{logs.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t("admin.errorLog.pageErrors")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {logs.filter((l) => l.level === "page").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t("admin.errorLog.sectionErrors")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {logs.filter((l) => l.level === "section").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t("admin.errorLog.componentErrors")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {logs.filter((l) => l.level === "component").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-6">
          {/* Error List */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>{t("admin.errorLog.errorList")}</CardTitle>
              <CardDescription>{tpl("admin.errorLog.errorCount", { count: logs.length })}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t("admin.errorLog.noErrors")}
                </p>
              ) : (
                logs.map((log) => (
                  <button
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedLog?.id === log.id
                        ? "bg-primary/10 border-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          log.level === "page"
                            ? "bg-destructive"
                            : log.level === "section"
                              ? "bg-yellow-600"
                              : "bg-blue-600"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {log.error.message || "Unknown Error"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {log.level}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Error Details */}
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>{t("admin.errorLog.errorDetails")}</CardTitle>
              {selectedLog && (
                <CardDescription>
                  ID: {selectedLog.id}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {selectedLog ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">{t("admin.errorLog.errorMessage")}</h4>
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-sm font-mono break-words">
                        {selectedLog.error.message}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-2">{t("admin.errorLog.stackTrace")}</h4>
                    <div className="bg-muted p-3 rounded-lg max-h-40 overflow-y-auto">
                      <pre className="text-xs font-mono break-words whitespace-pre-wrap">
                        {selectedLog.error.stack}
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-2">{t("admin.errorLog.componentStack")}</h4>
                    <div className="bg-muted p-3 rounded-lg max-h-40 overflow-y-auto">
                      <pre className="text-xs font-mono break-words whitespace-pre-wrap">
                        {selectedLog.errorInfo.componentStack}
                      </pre>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">{t("admin.errorLog.errorLevel")}</p>
                      <p className="font-semibold capitalize">{selectedLog.level}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t("admin.errorLog.occurredAt")}</p>
                      <p className="font-semibold">
                        {new Date(selectedLog.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t("admin.errorLog.selectError")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
  );
}
