// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorBoundary, { getErrorLogs, clearErrorLogs } from "./ErrorBoundary";

// 测试用的错误组件
const ErrorThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("Test error message");
  }
  return <div>正常内容</div>;
};

describe("ErrorBoundary Component", () => {
  beforeEach(() => {
    clearErrorLogs();
    vi.clearAllMocks();
  });

  describe("基本功能", () => {
    it("应该正常渲染子组件", () => {
      render(
        <ErrorBoundary>
          <div>测试内容</div>
        </ErrorBoundary>
      );
      expect(screen.getByText("测试内容")).toBeInTheDocument();
    });

    it("应该捕获并显示错误", () => {
      render(
        <ErrorBoundary level="page">
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.getByText("页面加载出错")).toBeInTheDocument();
    });

    it("应该显示错误消息", () => {
      render(
        <ErrorBoundary level="page">
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.getByText(/Test error message/)).toBeInTheDocument();
    });
  });

  describe("错误级别", () => {
    it("页面级别错误应该显示完整错误界面", () => {
      render(
        <ErrorBoundary level="page">
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.getByText("页面加载出错")).toBeInTheDocument();
      expect(screen.getByText(/重新加载/)).toBeInTheDocument();
      expect(screen.getByText(/返回首页/)).toBeInTheDocument();
    });

    it("组件级别错误应该显示简化错误界面", () => {
      render(
        <ErrorBoundary level="component">
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.getByText("组件加载失败")).toBeInTheDocument();
      expect(screen.getByText(/此部分内容加载出错/)).toBeInTheDocument();
    });

    it("部分级别错误应该显示中等错误界面", () => {
      render(
        <ErrorBoundary level="section">
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.getByText("组件加载失败")).toBeInTheDocument();
    });
  });

  describe("错误日志", () => {
    it("应该记录错误到日志", () => {
      render(
        <ErrorBoundary level="page">
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );
      const logs = getErrorLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].error.message).toBe("Test error message");
    });

    it("应该生成唯一的错误ID", () => {
      const { rerender } = render(
        <ErrorBoundary level="page">
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );
      const firstErrorId = screen.getByText(/error-/).textContent;

      clearErrorLogs();
      rerender(
        <ErrorBoundary level="page">
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );
      const secondErrorId = screen.getByText(/error-/).textContent;

      expect(firstErrorId).not.toBe(secondErrorId);
    });

    it("应该记录错误级别", () => {
      render(
        <ErrorBoundary level="component">
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );
      const logs = getErrorLogs();
      expect(logs[0].level).toBe("component");
    });

    it("应该记录错误时间戳", () => {
      const beforeTime = new Date();
      render(
        <ErrorBoundary level="page">
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );
      const afterTime = new Date();
      const logs = getErrorLogs();
      const logTime = new Date(logs[0].timestamp);

      expect(logTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(logTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe("用户交互", () => {
    it("应该支持重新加载按钮", async () => {
      const user = userEvent.setup();
      const reloadSpy = vi.spyOn(window.location, "reload");

      render(
        <ErrorBoundary level="page">
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByText("重新加载");
      await user.click(reloadButton);

      expect(reloadSpy).toHaveBeenCalled();
      reloadSpy.mockRestore();
    });

    it("应该支持返回首页按钮", async () => {
      const user = userEvent.setup();
      const hrefSpy = vi.spyOn(window.location, "href", "set");

      render(
        <ErrorBoundary level="page">
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const homeButton = screen.getByText("返回首页");
      await user.click(homeButton);

      expect(hrefSpy).toHaveBeenCalledWith("/");
      hrefSpy.mockRestore();
    });

    it("应该支持复制错误ID", async () => {
      const user = userEvent.setup();
      const clipboardSpy = vi.spyOn(navigator.clipboard, "writeText");

      render(
        <ErrorBoundary level="page">
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const copyButton = screen.getByText("复制错误ID");
      await user.click(copyButton);

      expect(clipboardSpy).toHaveBeenCalled();
      clipboardSpy.mockRestore();
    });
  });

  describe("错误回调", () => {
    it("应该调用onError回调", () => {
      const onErrorSpy = vi.fn();

      render(
        <ErrorBoundary level="page" onError={onErrorSpy}>
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(onErrorSpy).toHaveBeenCalled();
      expect(onErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Test error message",
        }),
        expect.any(Object)
      );
    });
  });

  describe("Fallback内容", () => {
    it("应该在组件级别错误时显示fallback内容", () => {
      render(
        <ErrorBoundary level="component" fallback={<div>自定义错误内容</div>}>
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.getByText("自定义错误内容")).toBeInTheDocument();
    });
  });

  describe("错误日志管理", () => {
    it("应该限制错误日志数量", () => {
      // 创建超过MAX_ERROR_LOGS的错误
      for (let i = 0; i < 60; i++) {
        try {
          render(
            <ErrorBoundary level="page">
              <ErrorThrowingComponent shouldThrow={true} />
            </ErrorBoundary>
          );
        } catch (e) {
          // 忽略React错误
        }
      }

      const logs = getErrorLogs();
      expect(logs.length).toBeLessThanOrEqual(50); // MAX_ERROR_LOGS = 50
    });

    it("应该支持清除所有日志", () => {
      render(
        <ErrorBoundary level="page">
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      let logs = getErrorLogs();
      expect(logs.length).toBeGreaterThan(0);

      clearErrorLogs();
      logs = getErrorLogs();
      expect(logs.length).toBe(0);
    });
  });

  describe("边界情况", () => {
    it("应该处理null错误", () => {
      const NullErrorComponent = () => {
        throw null;
      };

      render(
        <ErrorBoundary level="page">
          <NullErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText("页面加载出错")).toBeInTheDocument();
    });

    it("应该处理多个嵌套的ErrorBoundary", () => {
      render(
        <ErrorBoundary level="page">
          <div>
            <ErrorBoundary level="component">
              <ErrorThrowingComponent shouldThrow={true} />
            </ErrorBoundary>
          </div>
        </ErrorBoundary>
      );

      // 应该显示组件级别的错误界面（最内层的ErrorBoundary捕获）
      expect(screen.getByText("组件加载失败")).toBeInTheDocument();
    });

    it("应该在没有错误时正常渲染", () => {
      render(
        <ErrorBoundary level="page">
          <div>测试内容</div>
        </ErrorBoundary>
      );

      expect(screen.getByText("测试内容")).toBeInTheDocument();
      expect(screen.queryByText("页面加载出错")).not.toBeInTheDocument();
    });
  });
});
