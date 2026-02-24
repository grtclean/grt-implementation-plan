import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import KioskLayout from "@/components/kiosk/KioskLayout";
import FastIdentitySwitch from "@/components/kiosk/FastIdentitySwitch";
import OperatorTaskQueue from "@/components/kiosk/OperatorTaskQueue";
import StationInspectionForm from "@/components/kiosk/StationInspectionForm";
import SOPViewer from "@/components/kiosk/SOPViewer";
import { useKioskSessionContext, KioskSessionContext } from "@/hooks/useKioskSession";

interface SelectedTask {
  id: number;
  projectId: string;
  projectCode: string;
  processCode: string;
  processName: string;
  checkpointId?: number;
}

function KioskContent() {
  const { t } = useLanguage();
  const session = useKioskSessionContext();
  const [selectedTask, setSelectedTask] = useState<SelectedTask | null>(null);
  const [taskQueueKey, setTaskQueueKey] = useState(0);

  const handleSelectTask = (task: any) => {
    setSelectedTask({
      id: task.id,
      projectId: task.projectId,
      projectCode: task.projectCode,
      processCode: task.processCode,
      processName: task.processName,
    });
  };

  const handleInspectionComplete = () => {
    setSelectedTask(null);
    // Force task queue to refresh
    setTaskQueueKey((k) => k + 1);
  };

  const handleBackToQueue = () => {
    setSelectedTask(null);
  };

  // Not identified — show identity scan overlay
  if (!session.isIdentified) {
    return <FastIdentitySwitch />;
  }

  // Identified — show task queue + SOP side panel
  return (
    <div className="flex h-full">
      {/* Left panel (60%) — Task Queue or Inspection Form */}
      <div className="w-[60%] border-r border-border flex flex-col">
        {selectedTask ? (
          <StationInspectionForm
            projectId={selectedTask.projectId}
            processCode={selectedTask.processCode}
            processName={selectedTask.processName}
            checkpointId={selectedTask.checkpointId}
            onComplete={handleInspectionComplete}
            onBack={handleBackToQueue}
          />
        ) : (
          <OperatorTaskQueue key={taskQueueKey} onSelectTask={handleSelectTask} />
        )}
      </div>

      {/* Right panel (40%) — SOP Viewer */}
      <div className="w-[40%] flex flex-col">
        {selectedTask ? (
          <SOPViewer
            projectId={selectedTask.projectId}
            processCode={selectedTask.processCode}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p className="text-sm">{t("manufacturing.kiosk.workshop.selectTaskForSOP")}</p>
              <p className="text-xs mt-1">{t("manufacturing.kiosk.workshop.sopInfo")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function KioskWorkshop() {
  return (
    <KioskLayout>
      <KioskContent />
    </KioskLayout>
  );
}
