import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw, Home, Copy, Check } from "lucide-react";
import { Component, ReactNode, ErrorInfo } from "react";
import { useState } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: "page" | "section" | "component";
  /** When any value in this array changes, the error state resets automatically.
   *  Use this instead of key={...} to avoid destroying the entire subtree. */
  resetKeys?: unknown[];
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  timestamp: Date;
  copied: boolean;
}

// 错误日志存储
const errorLogs: Array<{
  id: string;
  error: Error;
  errorInfo: ErrorInfo;
  timestamp: Date;
  level: "page" | "section" | "component";
}> = [];

// 最大保存错误数
const MAX_ERROR_LOGS = 50;

export function getErrorLogs() {
  return errorLogs;
}

export function clearErrorLogs() {
  errorLogs.length = 0;
}

export function logErrorToServer(errorLog: typeof errorLogs[0]) {
  // 可以在这里添加发送到服务器的逻辑
  console.info("[ErrorLog]", errorLog);
  
  // 如果需要发送到服务器，可以调用API
  // fetch('/api/logs/error', { method: 'POST', body: JSON.stringify(errorLog) })
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId,
      timestamp: new Date(),
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Auto-reload on chunk load failures (slow networks, DDNS timeouts)
    const isChunkError = error.message?.includes("Loading chunk") ||
      error.message?.includes("Failed to fetch dynamically imported module") ||
      error.message?.includes("error loading dynamically imported module") ||
      error.name === "ChunkLoadError";
    if (isChunkError) {
      const key = "grt_chunk_retry";
      const retries = parseInt(sessionStorage.getItem(key) || "0", 10);
      if (retries < 2) {
        sessionStorage.setItem(key, String(retries + 1));
        window.location.reload();
        return { hasError: false, error: null };
      }
      // Exhausted retries — clear flag and show error
      sessionStorage.removeItem(key);
    }
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error state when resetKeys change (avoids key={...} which destroys the tree)
    if (this.state.hasError && this.props.resetKeys && prevProps.resetKeys) {
      const changed = this.props.resetKeys.some(
        (key, i) => key !== prevProps.resetKeys![i]
      );
      if (changed) {
        this.setState({ hasError: false, error: null, errorInfo: null, copied: false });
      }
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { errorId, timestamp } = this.state;
    const { level = "component" } = this.props;

    // Debug: prominent crash logging for diagnosis
    console.error("💥 [GRT ErrorBoundary] Fatal exception caught!", {
      level,
      errorId,
      path: window.location.pathname,
      message: error.message,
      stack: error.stack,
    });
    console.error("📄 [Component Stack]", errorInfo.componentStack);

    // 保存到本地错误日志
    const errorLog = { id: errorId, error, errorInfo, timestamp, level };
    errorLogs.push(errorLog);

    // 保持错误日志数量在限制内
    if (errorLogs.length > MAX_ERROR_LOGS) {
      errorLogs.shift();
    }

    // 发送到服务器
    logErrorToServer(errorLog);

    // 调用自定义错误处理回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({ errorInfo });
  }

  handleGoHome = () => {
    window.location.href = "/";
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    });
  };

  handleCopyErrorId = () => {
    const { errorId } = this.state;
    navigator.clipboard.writeText(errorId).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  render() {
    const { hasError, error, errorInfo, errorId, copied } = this.state;
    const { level = "component", fallback } = this.props;

    if (hasError) {
      // 页面级别错误
      if (level === "page") {
        return (
          <div className="flex items-center justify-center min-h-screen p-8 bg-background">
            <div className="flex flex-col items-center w-full max-w-2xl p-8">
              <AlertTriangle
                size={48}
                className="text-destructive mb-6 flex-shrink-0"
              />

              <h2 className="text-2xl font-bold mb-2">页面加载出错</h2>
              <p className="text-muted-foreground mb-6 text-center">
                抱歉，页面加载时遇到了问题。请尝试刷新页面或返回首页。
              </p>

              <div className="w-full p-4 rounded-lg bg-muted mb-6 max-h-64 overflow-auto">
                <p className="text-xs font-mono text-muted-foreground mb-1">
                  错误ID: {errorId}
                </p>
                <p className="text-xs font-mono text-muted-foreground mb-2">
                  路径: {window.location.pathname}
                </p>
                <pre className="text-xs text-destructive whitespace-pre-wrap break-words font-bold mb-2">
                  {error?.message}
                </pre>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                  {error?.stack}
                  {"\n\n--- Component Stack ---\n"}
                  {errorInfo?.componentStack}
                </pre>
              </div>

              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => window.location.reload()}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg",
                    "bg-primary text-primary-foreground",
                    "hover:opacity-90 cursor-pointer transition-opacity"
                  )}
                >
                  <RotateCcw size={16} />
                  重新加载
                </button>
                <button
                  onClick={this.handleGoHome}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg",
                    "bg-muted text-muted-foreground",
                    "hover:bg-muted/80 cursor-pointer transition-colors"
                  )}
                >
                  <Home size={16} />
                  返回首页
                </button>
                <button
                  onClick={this.handleCopyErrorId}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg",
                    "bg-muted text-muted-foreground",
                    "hover:bg-muted/80 cursor-pointer transition-colors"
                  )}
                >
                  {copied ? (
                    <>
                      <Check size={16} />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      复制错误ID
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                错误ID: <code className="bg-muted px-2 py-1 rounded">{errorId}</code>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                如果问题持续存在，请将错误ID提供给系统管理员
              </p>
            </div>
          </div>
        );
      }

      // 部分级别或组件级别错误
      return (
        <div className="flex items-center justify-center p-6 bg-destructive/5 border border-destructive/20 rounded-lg">
          <div className="flex flex-col items-center w-full max-w-md">
            <AlertTriangle
              size={32}
              className="text-destructive mb-4 flex-shrink-0"
            />

            <h3 className="text-lg font-semibold mb-2">组件加载失败</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              此部分内容加载出错，请尝试刷新或返回。
            </p>

            {fallback && <div className="mb-4 w-full">{fallback}</div>}

            <div className="flex gap-2">
              <button
                onClick={this.handleReset}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded text-sm",
                  "bg-primary text-primary-foreground",
                  "hover:opacity-90 cursor-pointer transition-opacity"
                )}
              >
                <RotateCcw size={14} />
                重试
              </button>
              <button
                onClick={this.handleCopyErrorId}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded text-sm",
                  "bg-muted text-muted-foreground",
                  "hover:bg-muted/80 cursor-pointer transition-colors"
                )}
              >
                {copied ? (
                  <>
                    <Check size={14} />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    复制ID
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-muted-foreground mt-3">
              错误ID: <code className="bg-muted px-1 py-0.5 rounded text-xs">{errorId}</code>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
