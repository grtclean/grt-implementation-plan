/**
 * GRT智能系统架构图组件
 * 使用Mermaid渲染系统架构
 */

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

// 系统架构图Mermaid定义
const architectureDiagram = `
graph TD
    %% 用户交互层
    subgraph UserInteraction["用户交互层"]
        WebPortal["Web门户"]
        MobileApp["企业微信/钉钉集成"]
        CoachUI["AI Coach界面"]
    end

    %% 智能中枢层
    subgraph IntelligenceLayer["智能中枢 (Node.js Middleware)"]
        EventBus["事件总线"]
        CoachInterceptor["AI Coach 拦截器"]
        StateEngine["状态引擎 (XState)"]
        RAGService["RAG检索服务"]
        HRSimulator["蓝绿对抗模拟引擎"]
    end

    %% 模型服务层
    subgraph AIModels["AI 模型服务 (Google Cloud Vertex AI)"]
        GeminiPro["Gemini Pro (推理/生成)"]
        EmbeddingAPI["Gecko Embeddings (向量化)"]
        VectorDB["向量数据库"]
    end

    %% 数据持久层
    subgraph DataLayer["数据持久层"]
        JDY_API["简道云 API (业务数据)"]
        FanRuanDB["帆软数仓 (报表数据)"]
        LogDB["审计与行为日志"]
    end

    %% 数据流向
    WebPortal -- "表单提交/查询" --> EventBus
    MobileApp -- "移动端操作" --> EventBus
    EventBus -- "拦截校验" --> CoachInterceptor
    CoachInterceptor -- "语义分析" --> GeminiPro
    CoachInterceptor -- "规则检查" --> RAGService
    RAGService -- "检索向量" --> VectorDB
    EmbeddingAPI -- "向量化" --> VectorDB
    
    CoachInterceptor -- "校验通过" --> StateEngine
    StateEngine -- "状态流转" --> JDY_API
    
    HRSimulator -- "场景注入" --> EventBus
    FanRuanDB -- "绩效数据" --> HRSimulator
    
    CoachInterceptor -- "报警/建议" --> CoachUI
    StateEngine -- "状态变更" --> LogDB

    %% 样式
    classDef userLayer fill:#4a90d9,stroke:#2c5282,color:#fff
    classDef intelligenceLayer fill:#48bb78,stroke:#276749,color:#fff
    classDef aiLayer fill:#ed8936,stroke:#c05621,color:#fff
    classDef dataLayer fill:#9f7aea,stroke:#6b46c1,color:#fff

    class WebPortal,MobileApp,CoachUI userLayer
    class EventBus,CoachInterceptor,StateEngine,RAGService,HRSimulator intelligenceLayer
    class GeminiPro,EmbeddingAPI,VectorDB aiLayer
    class JDY_API,FanRuanDB,LogDB dataLayer
`;

interface SystemArchitectureDiagramProps {
  className?: string;
}

export default function SystemArchitectureDiagram({ className }: SystemArchitectureDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMermaid = async () => {
      try {
        // 动态加载Mermaid
        const mermaid = (await import('mermaid')).default;
        
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            primaryColor: '#f97316',
            primaryTextColor: '#fff',
            primaryBorderColor: '#ea580c',
            lineColor: '#6b7280',
            secondaryColor: '#1f2937',
            tertiaryColor: '#374151'
          },
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis'
          }
        });

        if (containerRef.current) {
          const { svg } = await mermaid.render('architecture-diagram', architectureDiagram);
          containerRef.current.innerHTML = svg;
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to render Mermaid diagram:', err);
        setError('架构图加载失败');
        setIsLoading(false);
      }
    };

    loadMermaid();
  }, []);

  const handleZoomIn = () => setScale(s => Math.min(s + 0.2, 2));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.2, 0.5));
  const handleReset = () => setScale(1);

  const handleDownload = () => {
    if (containerRef.current) {
      const svg = containerRef.current.querySelector('svg');
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'grt-system-architecture.svg';
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-heading">GRT智能系统架构图</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="outline" size="icon" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-96 text-destructive">
            {error}
          </div>
        )}
        <div 
          className="overflow-auto"
          style={{ 
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            transition: 'transform 0.2s ease'
          }}
        >
          <div ref={containerRef} className="min-h-[400px]" />
        </div>
        
        {/* 图例 */}
        <div className="mt-6 pt-4 border-t border-border">
          <h4 className="text-sm font-medium mb-3">图例说明</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#4a90d9]"></div>
              <span>用户交互层</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#48bb78]"></div>
              <span>智能中枢层</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#ed8936]"></div>
              <span>AI模型服务层</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#9f7aea]"></div>
              <span>数据持久层</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
