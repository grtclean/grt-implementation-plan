import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlayCircle } from "lucide-react";
import { useState } from "react";

interface DemoModalProps {
  toolName: string;
  type: "jiandaoyun" | "agent";
}

export default function DemoModal({ toolName, type }: DemoModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 group">
          观看演示 <PlayCircle className="w-3 h-3 group-hover:text-primary transition-colors" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{toolName} - 功能演示</DialogTitle>
          <DialogDescription>
            {type === "jiandaoyun" 
              ? "简道云低代码平台：快速搭建业务流程与数据看板" 
              : "AI Agent：基于大模型的智能业务助手"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative aspect-video bg-black/90 rounded-md overflow-hidden border border-border flex items-center justify-center group">
          {/* Simulated Video Player UI */}
          {type === "jiandaoyun" ? (
            <div className="w-full h-full p-4 flex flex-col gap-4 animate-in fade-in duration-500">
              {/* Mock Interface for JianDaoYun */}
              <div className="flex gap-4 h-full">
                <div className="w-1/4 bg-sidebar border border-border rounded-sm p-2 space-y-2">
                  <div className="h-4 w-2/3 bg-muted rounded-sm"></div>
                  <div className="h-2 w-full bg-muted/50 rounded-sm"></div>
                  <div className="h-2 w-full bg-muted/50 rounded-sm"></div>
                  <div className="h-2 w-4/5 bg-muted/50 rounded-sm"></div>
                </div>
                <div className="flex-1 bg-background border border-border rounded-sm p-4 space-y-4">
                  <div className="flex justify-between">
                    <div className="h-6 w-1/3 bg-primary/20 rounded-sm"></div>
                    <div className="h-6 w-20 bg-primary rounded-sm"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-24 bg-muted/20 rounded-sm border border-border border-dashed"></div>
                    <div className="h-24 bg-muted/20 rounded-sm border border-border border-dashed"></div>
                  </div>
                  <div className="h-32 bg-muted/10 rounded-sm border border-border"></div>
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors cursor-pointer">
                <PlayCircle className="w-16 h-16 text-white opacity-80 group-hover:scale-110 transition-transform" />
              </div>
            </div>
          ) : (
            <div className="w-full h-full p-8 flex flex-col gap-4 animate-in fade-in duration-500">
              {/* Mock Interface for AI Agent */}
              <div className="flex-1 flex flex-col gap-4 max-w-2xl mx-auto w-full">
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs">AI</div>
                  <div className="bg-muted/20 p-3 rounded-lg rounded-tl-none text-sm text-muted-foreground">
                    您好，我是您的智能销售助手。请问有什么可以帮您？
                  </div>
                </div>
                <div className="flex gap-3 items-start flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs">Me</div>
                  <div className="bg-primary/10 p-3 rounded-lg rounded-tr-none text-sm text-foreground">
                    帮我分析一下本周的销售线索质量。
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs">AI</div>
                  <div className="bg-muted/20 p-3 rounded-lg rounded-tl-none text-sm text-muted-foreground space-y-2">
                    <p>正在分析...</p>
                    <div className="h-2 w-32 bg-primary/50 rounded-full animate-pulse"></div>
                    <p>本周新增线索 12 条，其中 A 类线索 3 条，建议优先跟进 [项目A] 和 [项目B]。</p>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors cursor-pointer">
                <PlayCircle className="w-16 h-16 text-white opacity-80 group-hover:scale-110 transition-transform" />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
