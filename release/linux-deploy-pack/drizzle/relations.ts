import { relations } from "drizzle-orm/relations";
import {
  testTemplates,
  testCases,
  testExecutions,
  testResults,
  aiGenerationLogs,
  projects,
  users,
} from "./schema";
import {
  plmDocuments,
  plmDocumentVersions,
  plmDesignReviews,
} from "./plm-schema";
import {
  dtAssets,
  dtRobotAssemblyNodes,
  iatfAuditLogs,
} from "./digital-twin-schema";
import {
  oaWorkflows,
  companyEventsMeetings,
  meetingAgendasActions,
  businessTripReports,
  oaLeaveBalances,
  oaAnnouncements,
} from "./oa-schema";
import {
  employeeCompetenceAssessments,
} from "./hr-competence-schema";

// ── test_templates relations ──
export const testTemplatesRelations = relations(testTemplates, ({ one, many }) => ({
  // Self-referential: version chain (child → parent)
  parentTemplate: one(testTemplates, {
    fields: [testTemplates.parentTemplateId],
    references: [testTemplates.id],
    relationName: "templateVersionChain",
  }),
  // Reverse: parent → child versions
  childVersions: many(testTemplates, {
    relationName: "templateVersionChain",
  }),
  // A template has many test cases
  cases: many(testCases),
  // A template has many executions
  executions: many(testExecutions),
  // A template has many AI generation logs
  aiGenerationLogs: many(aiGenerationLogs),
}));

// ── test_cases relations ──
export const testCasesRelations = relations(testCases, ({ one, many }) => ({
  // Each case belongs to one template
  template: one(testTemplates, {
    fields: [testCases.templateId],
    references: [testTemplates.id],
  }),
  // A case can have many results (across different executions)
  results: many(testResults),
}));

// ── test_executions relations ──
export const testExecutionsRelations = relations(testExecutions, ({ one, many }) => ({
  // Each execution is based on one template
  template: one(testTemplates, {
    fields: [testExecutions.templateId],
    references: [testTemplates.id],
  }),
  // An execution has many individual results
  results: many(testResults),
}));

// ── test_results relations ──
export const testResultsRelations = relations(testResults, ({ one, many }) => ({
  // Each result belongs to one execution
  execution: one(testExecutions, {
    fields: [testResults.executionId],
    references: [testExecutions.id],
  }),
  // Each result is for one test case
  testCase: one(testCases, {
    fields: [testResults.testCaseId],
    references: [testCases.id],
  }),
  // Self-referential: retest chain (this result retests a previous one)
  retestOfResult: one(testResults, {
    fields: [testResults.retestOf],
    references: [testResults.id],
    relationName: "retestChain",
  }),
  // Reverse: all retests that reference this result
  retests: many(testResults, {
    relationName: "retestChain",
  }),
}));

// ── ai_generation_logs relations ──
export const aiGenerationLogsRelations = relations(aiGenerationLogs, ({ one }) => ({
  // Each log may reference a template it generated/modified
  template: one(testTemplates, {
    fields: [aiGenerationLogs.templateId],
    references: [testTemplates.id],
  }),
}));

// ══════════════════════════════════════════════════════
// PLM Relations
// ══════════════════════════════════════════════════════

// ── plm_documents relations ──
export const plmDocumentsRelations = relations(plmDocuments, ({ one, many }) => ({
  // FK → projects.id
  project: one(projects, {
    fields: [plmDocuments.projectId],
    references: [projects.id],
  }),
  // FK → users.id (owner)
  owner: one(users, {
    fields: [plmDocuments.ownerUserId],
    references: [users.id],
    relationName: "plmDocOwner",
  }),
  // FK → users.id (design freeze approver)
  designFreezeByUser: one(users, {
    fields: [plmDocuments.designFreezeBy],
    references: [users.id],
    relationName: "plmDocDesignFreezeBy",
  }),
  // FK → users.id (created by)
  createdByUser: one(users, {
    fields: [plmDocuments.createdBy],
    references: [users.id],
    relationName: "plmDocCreatedBy",
  }),
  // FK → users.id (updated by)
  updatedByUser: one(users, {
    fields: [plmDocuments.updatedBy],
    references: [users.id],
    relationName: "plmDocUpdatedBy",
  }),
  // One document has many versions
  versions: many(plmDocumentVersions),
}));

// ── plm_document_versions relations ──
export const plmDocumentVersionsRelations = relations(plmDocumentVersions, ({ one, many }) => ({
  // FK → plm_documents.id
  document: one(plmDocuments, {
    fields: [plmDocumentVersions.documentId],
    references: [plmDocuments.id],
  }),
  // FK → users.id (uploader)
  uploader: one(users, {
    fields: [plmDocumentVersions.uploadedBy],
    references: [users.id],
    relationName: "plmVersionUploader",
  }),
  // Self-reference: this version was derived from sourceVersionId
  sourceVersion: one(plmDocumentVersions, {
    fields: [plmDocumentVersions.sourceVersionId],
    references: [plmDocumentVersions.id],
    relationName: "versionChain",
  }),
  // Reverse: all versions derived from this one
  derivedVersions: many(plmDocumentVersions, {
    relationName: "versionChain",
  }),
  // One version has many design reviews
  reviews: many(plmDesignReviews),
}));

// ── plm_design_reviews relations ──
export const plmDesignReviewsRelations = relations(plmDesignReviews, ({ one }) => ({
  // FK → plm_document_versions.id
  version: one(plmDocumentVersions, {
    fields: [plmDesignReviews.documentVersionId],
    references: [plmDocumentVersions.id],
  }),
  // FK → users.id (reviewer)
  reviewer: one(users, {
    fields: [plmDesignReviews.reviewerUserId],
    references: [users.id],
    relationName: "plmReviewReviewer",
  }),
  // FK → users.id (who requested the review)
  requestedByUser: one(users, {
    fields: [plmDesignReviews.requestedBy],
    references: [users.id],
    relationName: "plmReviewRequestedBy",
  }),
}));

// ══════════════════════════════════════════════════════
// Digital Twin Relations
// ══════════════════════════════════════════════════════

// ── dt_assets relations ──
export const dtAssetsRelations = relations(dtAssets, ({ one, many }) => ({
  // FK → projects.id
  project: one(projects, {
    fields: [dtAssets.projectId],
    references: [projects.id],
  }),
  // FK → users.id (owner)
  owner: one(users, {
    fields: [dtAssets.ownerUserId],
    references: [users.id],
    relationName: "dtAssetOwner",
  }),
  // FK → users.id (created by)
  createdByUser: one(users, {
    fields: [dtAssets.createdBy],
    references: [users.id],
    relationName: "dtAssetCreatedBy",
  }),
  // FK → users.id (updated by)
  updatedByUser: one(users, {
    fields: [dtAssets.updatedBy],
    references: [users.id],
    relationName: "dtAssetUpdatedBy",
  }),
  // FK → users.id (design freeze approver)
  designFreezeByUser: one(users, {
    fields: [dtAssets.designFrozenBy],
    references: [users.id],
    relationName: "dtAssetDesignFreezeBy",
  }),
  // Self-reference: version chain
  previousVersion: one(dtAssets, {
    fields: [dtAssets.previousVersionId],
    references: [dtAssets.id],
    relationName: "dtAssetVersionChain",
  }),
  newerVersions: many(dtAssets, {
    relationName: "dtAssetVersionChain",
  }),
  // One asset has many assembly nodes
  assemblyNodes: many(dtRobotAssemblyNodes),
  // One asset has many audit logs
  auditLogs: many(iatfAuditLogs),
}));

// ── dt_robot_assembly_nodes relations ──
export const dtRobotAssemblyNodesRelations = relations(dtRobotAssemblyNodes, ({ one }) => ({
  // FK → dt_assets.id
  asset: one(dtAssets, {
    fields: [dtRobotAssemblyNodes.dtAssetId],
    references: [dtAssets.id],
  }),
  // FK → users.id (created by)
  createdByUser: one(users, {
    fields: [dtRobotAssemblyNodes.createdBy],
    references: [users.id],
    relationName: "dtNodeCreatedBy",
  }),
}));

// ── iatf_audit_logs relations ──
export const iatfAuditLogsRelations = relations(iatfAuditLogs, ({ one }) => ({
  // FK → dt_assets.id
  asset: one(dtAssets, {
    fields: [iatfAuditLogs.assetId],
    references: [dtAssets.id],
  }),
  // FK → users.id (actor)
  actor: one(users, {
    fields: [iatfAuditLogs.actorId],
    references: [users.id],
    relationName: "iatfAuditActor",
  }),
}));

// ══════════════════════════════════════════════════════
// Smart OA Relations
// ══════════════════════════════════════════════════════

export const oaWorkflowsRelations = relations(oaWorkflows, ({ one }) => ({
  applicant: one(users, {
    fields: [oaWorkflows.applicantId],
    references: [users.id],
    relationName: "oaWorkflowApplicant",
  }),
  approver: one(users, {
    fields: [oaWorkflows.approverId],
    references: [users.id],
    relationName: "oaWorkflowApprover",
  }),
  linkedProject: one(projects, {
    fields: [oaWorkflows.linkedProjectId],
    references: [projects.id],
  }),
}));

export const companyEventsMeetingsRelations = relations(companyEventsMeetings, ({ one, many }) => ({
  organizer: one(users, {
    fields: [companyEventsMeetings.organizerId],
    references: [users.id],
    relationName: "meetingOrganizer",
  }),
  agendaItems: many(meetingAgendasActions),
}));

export const meetingAgendasActionsRelations = relations(meetingAgendasActions, ({ one }) => ({
  meeting: one(companyEventsMeetings, {
    fields: [meetingAgendasActions.meetingId],
    references: [companyEventsMeetings.id],
  }),
  assignee: one(users, {
    fields: [meetingAgendasActions.assignedTo],
    references: [users.id],
    relationName: "agendaAssignee",
  }),
}));

export const businessTripReportsRelations = relations(businessTripReports, ({ one }) => ({
  employee: one(users, {
    fields: [businessTripReports.employeeId],
    references: [users.id],
    relationName: "tripEmployee",
  }),
  project: one(projects, {
    fields: [businessTripReports.projectId],
    references: [projects.id],
  }),
  reviewer: one(users, {
    fields: [businessTripReports.reviewedBy],
    references: [users.id],
    relationName: "tripReviewer",
  }),
}));

export const oaLeaveBalancesRelations = relations(oaLeaveBalances, ({ one }) => ({
  employee: one(users, {
    fields: [oaLeaveBalances.employeeId],
    references: [users.id],
    relationName: "leaveBalanceEmployee",
  }),
}));

export const oaAnnouncementsRelations = relations(oaAnnouncements, ({ one }) => ({
  author: one(users, {
    fields: [oaAnnouncements.authorId],
    references: [users.id],
    relationName: "announcementAuthor",
  }),
}));

// ══════════════════════════════════════════════════════
// HR Competence Assessment Relations (flat TSDCKL)
// ══════════════════════════════════════════════════════

export const employeeCompetenceAssessmentsRelations = relations(employeeCompetenceAssessments, ({ one }) => ({
  employee: one(users, {
    fields: [employeeCompetenceAssessments.employeeId],
    references: [users.id],
    relationName: "competenceAssessmentEmployee",
  }),
}));
