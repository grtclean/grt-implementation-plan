import { describe, it, expect, vi, beforeEach } from "vitest";

// 模拟行动项提取逻辑
function extractActionItems(content: string): { id: string; content: string; completed: boolean }[] {
  const lines = content.split("\n");
  const actions: { id: string; content: string; completed: boolean }[] = [];
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    // 匹配 TODO: 或 Action: 开头的行
    if (trimmedLine.startsWith("TODO:") || trimmedLine.startsWith("- TODO:")) {
      const actionContent = trimmedLine.replace(/^-?\s*TODO:\s*/i, "").trim();
      if (actionContent) {
        actions.push({
          id: `action-${index}`,
          content: actionContent,
          completed: false,
        });
      }
    } else if (trimmedLine.startsWith("Action:") || trimmedLine.startsWith("- Action:")) {
      const actionContent = trimmedLine.replace(/^-?\s*Action:\s*/i, "").trim();
      if (actionContent) {
        actions.push({
          id: `action-${index}`,
          content: actionContent,
          completed: false,
        });
      }
    }
  });
  
  return actions;
}

// 模拟计时器格式化
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// 模拟议程剩余时间计算
function getAgendaRemaining(currentDuration: number, elapsedSeconds: number): number {
  const targetSeconds = currentDuration * 60;
  return Math.max(0, targetSeconds - elapsedSeconds);
}

describe("SmartMeeting - Action Item Extraction", () => {
  it("should extract TODO: items from content", () => {
    const content = `# 会议纪要
    
## 行动项
- TODO: 完成项目报告
- TODO: 联系客户确认需求
`;
    
    const actions = extractActionItems(content);
    
    expect(actions).toHaveLength(2);
    expect(actions[0].content).toBe("完成项目报告");
    expect(actions[1].content).toBe("联系客户确认需求");
    expect(actions[0].completed).toBe(false);
  });

  it("should extract Action: items from content", () => {
    const content = `# 会议纪要
    
## 行动项
- Action: 准备演示文稿
Action: 发送会议纪要给团队
`;
    
    const actions = extractActionItems(content);
    
    expect(actions).toHaveLength(2);
    expect(actions[0].content).toBe("准备演示文稿");
    expect(actions[1].content).toBe("发送会议纪要给团队");
  });

  it("should handle mixed TODO and Action items", () => {
    const content = `# 会议纪要
    
- TODO: 任务一
- Action: 任务二
- TODO: 任务三
`;
    
    const actions = extractActionItems(content);
    
    expect(actions).toHaveLength(3);
    expect(actions[0].content).toBe("任务一");
    expect(actions[1].content).toBe("任务二");
    expect(actions[2].content).toBe("任务三");
  });

  it("should return empty array when no action items found", () => {
    const content = `# 会议纪要
    
## 讨论内容
今天讨论了项目进度
`;
    
    const actions = extractActionItems(content);
    
    expect(actions).toHaveLength(0);
  });

  it("should ignore empty TODO/Action lines", () => {
    const content = `# 会议纪要
    
- TODO: 
- TODO: 有效任务
- Action: 
`;
    
    const actions = extractActionItems(content);
    
    expect(actions).toHaveLength(1);
    expect(actions[0].content).toBe("有效任务");
  });
});

describe("SmartMeeting - Timer Functions", () => {
  it("should format seconds correctly", () => {
    expect(formatTime(0)).toBe("00:00");
    expect(formatTime(30)).toBe("00:30");
    expect(formatTime(60)).toBe("01:00");
    expect(formatTime(90)).toBe("01:30");
    expect(formatTime(3661)).toBe("61:01");
  });

  it("should calculate remaining time correctly", () => {
    // 10分钟议程，已过5分钟
    expect(getAgendaRemaining(10, 300)).toBe(300); // 5分钟剩余
    
    // 5分钟议程，已过5分钟
    expect(getAgendaRemaining(5, 300)).toBe(0);
    
    // 15分钟议程，已过20分钟（超时）
    expect(getAgendaRemaining(15, 1200)).toBe(0);
  });
});

describe("SmartMeeting - Agenda Management", () => {
  it("should track agenda completion status", () => {
    const agendaItems = [
      { id: "1", title: "开场", duration: 5, completed: false },
      { id: "2", title: "讨论", duration: 15, completed: false },
      { id: "3", title: "总结", duration: 5, completed: false },
    ];
    
    // 模拟完成第一项
    agendaItems[0].completed = true;
    
    const completedCount = agendaItems.filter(a => a.completed).length;
    expect(completedCount).toBe(1);
    expect(agendaItems[0].completed).toBe(true);
    expect(agendaItems[1].completed).toBe(false);
  });

  it("should calculate total meeting duration", () => {
    const agendaItems = [
      { id: "1", title: "开场", duration: 5, completed: false },
      { id: "2", title: "讨论", duration: 15, completed: false },
      { id: "3", title: "总结", duration: 5, completed: false },
    ];
    
    const totalDuration = agendaItems.reduce((sum, item) => sum + item.duration, 0);
    expect(totalDuration).toBe(25);
  });
});
