/**
 * Capability Notification Service
 * Formats notification content for capability OS events.
 */

export type NotificationType =
  | "EVIDENCE_APPROVED"
  | "EVIDENCE_REJECTED"
  | "LEVEL_UPGRADED"
  | "REDBLUE_TASK_ASSIGNED"
  | "GATE_STATUS_CHANGED";

export interface NotificationContent {
  title: string;
  content: string;
}

export function formatNotificationContent(
  type: NotificationType | string,
  data: Record<string, any>
): NotificationContent {
  switch (type) {
    case "EVIDENCE_APPROVED":
      return {
        title: "证据审核通过",
        content: `您提交的证据「${data.evidenceTitle}」已通过审核，获得${data.score}积分。`,
      };

    case "EVIDENCE_REJECTED": {
      const reasonPart = data.reason ? `，拒绝${data.reason}` : "";
      // When there is no reason, the content must NOT contain '原因'
      if (data.reason) {
        return {
          title: "证据审核未通过",
          content: `您提交的证据「${data.evidenceTitle}」未通过审核，原因：${data.reason}`,
        };
      }
      return {
        title: "证据审核未通过",
        content: `您提交的证据「${data.evidenceTitle}」未通过审核。`,
      };
    }

    case "LEVEL_UPGRADED":
      return {
        title: "能力等级提升",
        content: `恭喜！您的「${data.domainName}」能力等级从L${data.oldLevel}提升到L${data.newLevel}。`,
      };

    case "REDBLUE_TASK_ASSIGNED": {
      const teamName = data.teamType === "red" ? "红队" : "蓝队";
      return {
        title: "红蓝对抗任务分配",
        content: `您已被分配到${teamName}，任务：${data.taskTitle}。`,
      };
    }

    case "GATE_STATUS_CHANGED":
      return {
        title: "门禁状态变更",
        content: `G${data.gateNumber}「${data.gateName}」状态已变更为${data.newStatus}。`,
      };

    default:
      return {
        title: "系统通知",
        content: "您有一条新通知",
      };
  }
}
