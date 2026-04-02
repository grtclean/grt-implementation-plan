/**
 * 敏感数据水印组件
 * 对角线半透明水印: 用户名 + 时间戳 + "CONFIDENTIAL"
 * CSS pointer-events: none + user-select: none 防截图
 */

import React from 'react';

interface SensitiveDataWatermarkProps {
  userName: string;
  children: React.ReactNode;
  enabled?: boolean;
}

export function SensitiveDataWatermark({
  userName,
  children,
  enabled = true,
}: SensitiveDataWatermarkProps) {
  if (!enabled) {
    return <>{children}</>;
  }

  const timestamp = new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const watermarkText = `${userName} · ${timestamp} · CONFIDENTIAL`;

  return (
    <div className="relative">
      {children}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 50,
        }}
        aria-hidden="true"
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 150px,
              rgba(0, 0, 0, 0.03) 150px,
              rgba(0, 0, 0, 0.03) 151px
            )`,
          }}
        />
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute whitespace-nowrap text-xs font-mono"
            style={{
              color: 'rgba(0, 0, 0, 0.06)',
              transform: 'rotate(-35deg)',
              top: `${(i % 4) * 25 + 5}%`,
              left: `${Math.floor(i / 4) * 35 - 10}%`,
              fontSize: '11px',
              letterSpacing: '2px',
            }}
          >
            {watermarkText}
          </div>
        ))}
      </div>
    </div>
  );
}
