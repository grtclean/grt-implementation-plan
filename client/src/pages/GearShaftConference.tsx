/**
 * 齿轴行业大会 — CEO 25分钟主题演讲
 * Route: /conference/gear-shaft (STANDALONE)
 *
 * 支持两种模式：
 *   1. PPTX模式 — 嵌入/下载真实PPTX文件（优先）
 *   2. 网页模式 — 基于config的交互式幻灯片（备用）
 */

import { useState } from "react";
import IndustryConference from "@/components/IndustryConference";
import { gearShaftConfig } from "@/config/conference";
import { Download, Monitor, FileText, ExternalLink } from "lucide-react";

const PPTX_URL = "/conference-assets/gear-shaft-presentation.pptx";
const PPTX_NAME = "轴齿零部件精密清洗智能化解决方案.pptx";

export default function GearShaftConference() {
  const [mode, setMode] = useState<"pptx" | "web">("pptx");

  if (mode === "web") {
    return (
      <div className="relative">
        <div className="fixed top-4 right-4 z-50 flex gap-2">
          <button onClick={() => window.history.back()} className="bg-white/80 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg text-sm shadow-lg hover:bg-white transition-colors">← 返回</button>
          <button onClick={() => { window.location.href = "/"; }} className="bg-white/80 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg text-sm shadow-lg hover:bg-white transition-colors">⌂ 首页</button>
          <button onClick={() => { window.location.href = "/showcase-hub"; }} className="bg-white/80 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg text-sm shadow-lg hover:bg-white transition-colors">展示中枢</button>
          <button onClick={() => { window.location.href = "/showroom"; }} className="bg-white/80 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg text-sm shadow-lg hover:bg-white transition-colors">展厅</button>
          <button onClick={() => setMode("pptx")}
            className="bg-amber-600 text-white px-3 py-1.5 rounded-lg text-sm shadow-lg hover:bg-amber-700 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />PPTX模式
          </button>
        </div>
        <IndustryConference config={gearShaftConfig} />
      </div>
    );
  }

  // PPTX mode — full screen presentation viewer
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-black/30 backdrop-blur border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src="/GRTlogo.gif" alt="GRT" className="h-8 w-8" />
          <div>
            <h1 className="text-lg font-bold">齿轴零部件精密清洗智能化解决方案</h1>
            <p className="text-xs text-white/60">GRT · 杰瑞德自动化 — 齿轴行业大会演讲</p>
          </div>
          <div className="flex gap-1 ml-3">
            <button onClick={() => window.history.back()} className="px-2.5 py-1 rounded-lg text-xs bg-white/10 hover:bg-white/20 transition-colors">← 返回</button>
            <button onClick={() => { window.location.href = "/"; }} className="px-2.5 py-1 rounded-lg text-xs bg-white/10 hover:bg-white/20 transition-colors">⌂ 首页</button>
            <button onClick={() => { window.location.href = "/showcase-hub"; }} className="px-2.5 py-1 rounded-lg text-xs bg-white/10 hover:bg-white/20 transition-colors">展示中枢</button>
            <button onClick={() => { window.location.href = "/showroom"; }} className="px-2.5 py-1 rounded-lg text-xs bg-white/10 hover:bg-white/20 transition-colors">展厅</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMode("web")}
            className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors">
            <Monitor className="h-3.5 w-3.5" />网页模式
          </button>
          <a href={PPTX_URL} download={PPTX_NAME}
            className="bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors">
            <Download className="h-3.5 w-3.5" />下载PPTX
          </a>
        </div>
      </div>

      {/* Main Content — PPTX Info + Actions */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full space-y-8">
          {/* File Card */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-amber-600/20 p-4 rounded-xl">
                <FileText className="h-12 w-12 text-amber-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">{PPTX_NAME}</h2>
                <p className="text-sm text-white/60 mt-1">40.4 MB · PowerPoint 演示文稿</p>
                <p className="text-sm text-white/40 mt-1">明日验收用 · 最新版本</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <a href={PPTX_URL} download={PPTX_NAME}
                className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 rounded-xl py-4 px-6 text-lg font-medium transition-colors">
                <Download className="h-5 w-5" />下载演讲资料
              </a>
              <button onClick={() => setMode("web")}
                className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 rounded-xl py-4 px-6 text-lg font-medium transition-colors">
                <Monitor className="h-5 w-5" />在线预览版
              </button>
            </div>
          </div>

          {/* Quick Info */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">25</div>
              <div className="text-xs text-white/60 mt-1">分钟演讲</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">齿轴</div>
              <div className="text-xs text-white/60 mt-1">行业聚焦</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">VDA 19.1</div>
              <div className="text-xs text-white/60 mt-1">清洁度标准</div>
            </div>
          </div>

          {/* Instructions */}
          <div className="text-center text-sm text-white/40 space-y-1">
            <p>提示：下载PPTX后使用PowerPoint打开，支持全部动画和嵌入视频</p>
            <p>如需更新资料，请联系CTO或在 <a href="/showcase-hub" className="text-amber-400 hover:underline">展示中枢</a> 上传新版本</p>
          </div>
        </div>
      </div>
    </div>
  );
}
