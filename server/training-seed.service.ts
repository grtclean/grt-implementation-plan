import { requireDb } from "./db";
import { trainingPlans, trainingParticipants, trainingAssessments, trainingCertificates } from "../drizzle/schema";

// 培训类型
const trainingTypes = ['internal', 'external', 'online', 'certification'] as const;
const trainingCategories = ['technical', 'management', 'safety', 'quality', 'compliance'] as const;
const trainingStatuses = ['draft', 'planned', 'in_progress', 'completed', 'cancelled'] as const;

// 培训名称模板
const trainingNameTemplates = [
  { name: "超声波清洗设备操作培训", category: "technical", type: "internal" },
  { name: "高压喷淋系统维护培训", category: "technical", type: "internal" },
  { name: "ISO9001质量管理体系培训", category: "quality", type: "external" },
  { name: "安全生产规范培训", category: "safety", type: "internal" },
  { name: "项目管理PMP认证培训", category: "management", type: "certification" },
  { name: "客户服务技能提升培训", category: "management", type: "online" },
  { name: "新员工入职培训", category: "compliance", type: "internal" },
  { name: "设备故障诊断与排除培训", category: "technical", type: "internal" },
  { name: "精益生产管理培训", category: "management", type: "external" },
  { name: "环保法规合规培训", category: "compliance", type: "online" },
  { name: "焊接工艺技能培训", category: "technical", type: "internal" },
  { name: "电气安全操作培训", category: "safety", type: "internal" },
  { name: "CRM系统使用培训", category: "technical", type: "online" },
  { name: "团队领导力培训", category: "management", type: "external" },
  { name: "产品知识培训", category: "technical", type: "internal" },
];

// 生成随机日期
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// 生成培训代码
function generateTrainingCode(index: number): string {
  const year = new Date().getFullYear();
  return `TR-${year}-${String(index + 1).padStart(4, '0')}`;
}

// 生成证书编号
function generateCertificateNo(trainingId: number, participantIndex: number): string {
  const year = new Date().getFullYear();
  return `CERT-${year}-${String(trainingId).padStart(4, '0')}-${String(participantIndex + 1).padStart(3, '0')}`;
}

export interface SeedTrainingResult {
  success: boolean;
  trainingsCreated: number;
  participantsCreated: number;
  assessmentsCreated: number;
  certificatesCreated: number;
  message: string;
}

export async function seedTrainingData(): Promise<SeedTrainingResult> {
  const db = await requireDb();
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const threeMonthsLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  
  let trainingsCreated = 0;
  let participantsCreated = 0;
  let assessmentsCreated = 0;
  let certificatesCreated = 0;

  try {
    // 创建培训计划
    for (let i = 0; i < trainingNameTemplates.length; i++) {
      const template = trainingNameTemplates[i];
      const code = generateTrainingCode(i);
      
      // 随机选择状态
      let status: typeof trainingStatuses[number];
      const rand = Math.random();
      if (rand < 0.3) {
        status = 'completed';
      } else if (rand < 0.5) {
        status = 'in_progress';
      } else if (rand < 0.7) {
        status = 'planned';
      } else if (rand < 0.9) {
        status = 'draft';
      } else {
        status = 'cancelled';
      }
      
      // 根据状态设置日期
      let plannedStartDate: Date;
      let plannedEndDate: Date;
      let actualStartDate: Date | null = null;
      let actualEndDate: Date | null = null;
      
      if (status === 'completed') {
        plannedStartDate = randomDate(threeMonthsAgo, new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
        plannedEndDate = new Date(plannedStartDate.getTime() + (1 + Math.floor(Math.random() * 5)) * 24 * 60 * 60 * 1000);
        actualStartDate = plannedStartDate;
        actualEndDate = plannedEndDate;
      } else if (status === 'in_progress') {
        plannedStartDate = randomDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), now);
        plannedEndDate = new Date(plannedStartDate.getTime() + (3 + Math.floor(Math.random() * 7)) * 24 * 60 * 60 * 1000);
        actualStartDate = plannedStartDate;
      } else {
        plannedStartDate = randomDate(now, threeMonthsLater);
        plannedEndDate = new Date(plannedStartDate.getTime() + (1 + Math.floor(Math.random() * 5)) * 24 * 60 * 60 * 1000);
      }
      
      const durationHours = 4 + Math.floor(Math.random() * 20);
      const maxParticipants = 10 + Math.floor(Math.random() * 30);
      const budget = (5000 + Math.floor(Math.random() * 15000)) * 100; // 5000-20000元
      const actualCost = status === 'completed' ? Math.floor(budget * (0.8 + Math.random() * 0.3)) : null;
      
      const [training] = await db.insert(trainingPlans).values({
        name: template.name,
        code,
        type: template.type as any,
        category: template.category as any,
        description: `${template.name}的详细描述。本培训旨在提升员工的专业技能和工作效率。`,
        objectives: `1. 掌握${template.name.replace('培训', '')}的核心知识\n2. 能够独立完成相关工作任务\n3. 提高工作效率和质量`,
        trainerId: Math.random() > 0.5 ? Math.floor(Math.random() * 10) + 1 : null,
        externalTrainer: template.type === 'external' ? '外部讲师' + (i + 1) : null,
        trainingOrg: template.type === 'external' ? '专业培训机构' : null,
        plannedStartDate: plannedStartDate.toISOString().slice(0, 19).replace('T', ' '),
        plannedEndDate: plannedEndDate.toISOString().slice(0, 19).replace('T', ' '),
        actualStartDate: actualStartDate ? actualStartDate.toISOString().slice(0, 19).replace('T', ' ') : null,
        actualEndDate: actualEndDate ? actualEndDate.toISOString().slice(0, 19).replace('T', ' ') : null,
        durationHours,
        location: template.type === 'online' ? '线上' : '培训室' + (Math.floor(Math.random() * 3) + 1),
        budget,
        actualCost,
        maxParticipants,
        status: status as any,
        materialsUrl: status !== 'draft' ? `/materials/training-${code}.pdf` : null,
        assessmentMethod: '考试 + 实操评估',
      } as any).returning();
      
      trainingsCreated++;
      
      // 为已完成和进行中的培训添加参与者
      if (status === 'completed' || status === 'in_progress') {
        const participantCount = Math.min(maxParticipants, 5 + Math.floor(Math.random() * 10));
        
        for (let j = 0; j < participantCount; j++) {
          const attendanceStatus = status === 'completed' 
            ? (Math.random() > 0.1 ? 'attended' : 'absent')
            : 'unknown';
          
          const score = status === 'completed' && attendanceStatus === 'attended'
            ? 60 + Math.floor(Math.random() * 40)
            : null;
          
          const passed = score !== null ? (score >= 60 ? 1 : 0) : null;
          
          const [participant] = await db.insert(trainingParticipants).values({
            trainingId: training.id,
            userId: j + 1, // 使用模拟用户ID
            registrationStatus: 'confirmed',
            attendanceStatus: attendanceStatus as any,
            score,
            passed,
            feedbackRating: status === 'completed' && attendanceStatus === 'attended'
              ? 3 + Math.floor(Math.random() * 3)
              : null,
            feedback: status === 'completed' && attendanceStatus === 'attended' && Math.random() > 0.5
              ? '培训内容很实用，讲师讲解清晰。'
              : null,
          } as any).returning();
          
          participantsCreated++;
          
          // 为已完成的培训添加证书
          if (status === 'completed' && passed === 1 && Math.random() > 0.3) {
            const certificateNo = generateCertificateNo(training.id, j);
            const issueDate = actualEndDate || plannedEndDate;
            const expiryDate = new Date(issueDate.getTime() + 365 * 24 * 60 * 60 * 1000); // 一年后过期
            
            await db.insert(trainingCertificates).values({
              trainingId: training.id,
              participantId: participant.id,
              certificateNo,
              name: `${template.name}结业证书`,
              issueDate: issueDate.toISOString().slice(0, 19).replace('T', ' '),
              expiryDate: expiryDate.toISOString().slice(0, 19).replace('T', ' '),
              status: 'active',
              fileUrl: `/certificates/${certificateNo}.pdf`,
            });
            
            certificatesCreated++;
          }
        }
      }
      
      // 为培训添加评估
      if (status !== 'draft' && status !== 'cancelled') {
        await db.insert(trainingAssessments).values({
          trainingId: training.id,
          assessmentType: Math.random() > 0.5 ? 'quiz' : 'practical',
          name: `${template.name}考核`,
          description: `针对${template.name}的知识和技能考核`,
          totalScore: 100,
          passingScore: 60,
          questions: JSON.stringify([
            { id: 1, question: '问题1', type: 'choice', options: ['A', 'B', 'C', 'D'], answer: 'A' },
            { id: 2, question: '问题2', type: 'choice', options: ['A', 'B', 'C', 'D'], answer: 'B' },
            { id: 3, question: '问题3', type: 'text', answer: '' },
          ]),
          status: status === 'completed' ? 'archived' : 'active',
        });
        
        assessmentsCreated++;
      }
    }
    
    return {
      success: true,
      trainingsCreated,
      participantsCreated,
      assessmentsCreated,
      certificatesCreated,
      message: `成功创建 ${trainingsCreated} 个培训计划，${participantsCreated} 个参与者记录，${assessmentsCreated} 个评估，${certificatesCreated} 个证书`,
    };
  } catch (error) {
    console.error('Seed training data error:', error);
    return {
      success: false,
      trainingsCreated,
      participantsCreated,
      assessmentsCreated,
      certificatesCreated,
      message: `创建培训数据时出错: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// 清除所有培训测试数据
export async function clearTrainingData(): Promise<{ success: boolean; message: string }> {
  try {
    const db = await requireDb();
    // 按照外键依赖顺序删除
    await db.delete(trainingCertificates);
    await db.delete(trainingParticipants);
    await db.delete(trainingAssessments);
    await db.delete(trainingPlans);
    
    return {
      success: true,
      message: '成功清除所有培训数据',
    };
  } catch (error) {
    console.error('Clear training data error:', error);
    return {
      success: false,
      message: `清除培训数据时出错: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// 获取培训统计
export async function getTrainingStats() {
  try {
    const db = await requireDb();
    const trainings = await db.select().from(trainingPlans);
    const participants = await db.select().from(trainingParticipants);
    const certificates = await db.select().from(trainingCertificates);
    
    const stats = {
      totalTrainings: trainings.length,
      completedTrainings: trainings.filter(t => t.status === 'completed').length,
      inProgressTrainings: trainings.filter(t => t.status === 'in_progress').length,
      plannedTrainings: trainings.filter(t => t.status === 'planned').length,
      draftTrainings: trainings.filter(t => t.status === 'draft').length,
      cancelledTrainings: trainings.filter(t => t.status === 'cancelled').length,
      totalParticipants: participants.length,
      attendedParticipants: participants.filter(p => p.attendanceStatus === 'attended').length,
      totalCertificates: certificates.length,
      activeCertificates: certificates.filter(c => c.status === 'active').length,
      byType: {
        internal: trainings.filter(t => t.type === 'internal').length,
        external: trainings.filter(t => t.type === 'external').length,
        online: trainings.filter(t => t.type === 'online').length,
        certification: trainings.filter(t => t.type === 'certification').length,
      },
      byCategory: {
        technical: trainings.filter(t => t.category === 'technical').length,
        management: trainings.filter(t => t.category === 'management').length,
        safety: trainings.filter(t => t.category === 'safety').length,
        quality: trainings.filter(t => t.category === 'quality').length,
        compliance: trainings.filter(t => t.category === 'compliance').length,
      },
    };
    
    return stats;
  } catch (error) {
    console.error('Get training stats error:', error);
    return {
      totalTrainings: 0,
      completedTrainings: 0,
      inProgressTrainings: 0,
      plannedTrainings: 0,
      draftTrainings: 0,
      cancelledTrainings: 0,
      totalParticipants: 0,
      attendedParticipants: 0,
      totalCertificates: 0,
      activeCertificates: 0,
      byType: { internal: 0, external: 0, online: 0, certification: 0 },
      byCategory: { technical: 0, management: 0, safety: 0, quality: 0, compliance: 0 },
    };
  }
}
