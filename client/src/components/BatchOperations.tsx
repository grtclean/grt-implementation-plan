import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

export interface BatchAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
}

export interface BatchOperationsProps {
  selectedCount: number;
  onBatchAction: (action: string) => void;
  actions: BatchAction[];
}

export default function BatchOperations({ selectedCount, onBatchAction, actions }: BatchOperationsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t shadow-lg">
      <div className="container mx-auto flex items-center justify-between py-3 px-4">
        <span className="text-sm font-medium">
          已选择 {selectedCount} 项
        </span>
        <div className="flex items-center gap-2">
          {actions.map(action => {
            const IconComp = action.icon;
            return (
              <Button
                key={action.id}
                size="sm"
                variant={action.variant || "outline"}
                onClick={() => onBatchAction(action.id)}
              >
                {IconComp && <IconComp className="w-4 h-4 mr-1" />}
                {action.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
