/**
 * Workspace — embeddable file management components.
 *
 * Import from this barrel to get all public workspace components:
 *
 *   import {
 *     WorkspaceEmbed,
 *     WorkspaceFilePicker,
 *     SpreadsheetEditor,
 *     RichTextEditor,
 *     FileUploadZone,
 *     UniversalViewer,
 *     useWorkspaceActions,
 *   } from "@/components/workspace";
 */

// ── Full-page components ──
export { default as UniversalViewer } from "./UniversalViewer";
export type { ViewerFileType } from "./UniversalViewer";

// ── Embeddable components ──
export { default as WorkspaceEmbed } from "./WorkspaceEmbed";
export type { EmbedMode, EditorType } from "./WorkspaceEmbed";

export { default as WorkspaceFilePicker } from "./WorkspaceFilePicker";
export type { PickedFile } from "./WorkspaceFilePicker";

// ── Editors ──
export { default as SpreadsheetEditor } from "./SpreadsheetEditor";
export { default as RichTextEditor } from "./RichTextEditor";

// ── Utility components ──
export { default as FileUploadZone } from "./FileUploadZone";

// ── O365 Integration ──
export { default as O365SyncPanel } from "./O365SyncPanel";

// ── Architecture View ──
export { default as WorkspaceArchitectureView } from "./WorkspaceArchitectureView";

// ── Setup Wizard ──
export { default as SharePointSetupWizard } from "./SharePointSetupWizard";

// ── Hooks ──
export { useWorkspaceActions } from "./useWorkspaceActions";
export type { WorkspaceActions } from "./useWorkspaceActions";
