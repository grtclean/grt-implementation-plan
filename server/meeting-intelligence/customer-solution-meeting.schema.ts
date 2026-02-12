/**
 * 客户方案沟通确认会议数据库Schema
 * Customer Solution Meeting Database Schema
 * 
 * 支持对内/对外会议模式、客户资料上传、AI案例匹配、智能方案建议、
 * 技术资料调用、语音识别和版本迭代管理
 */

// ============================================================================
// 1. 客户方案会议表 (customer_solution_meetings)
// ============================================================================
export const customerSolutionMeetingsSchema = `
CREATE TABLE IF NOT EXISTS customer_solution_meetings (
  id VARCHAR(36) PRIMARY KEY,
  
  -- 会议基本信息
  title VARCHAR(255) NOT NULL COMMENT '会议标题',
  meeting_type ENUM('internal', 'external') NOT NULL DEFAULT 'internal' COMMENT '会议类型：对内/对外',
  meeting_mode ENUM('online', 'offline', 'hybrid') DEFAULT 'online' COMMENT '会议模式',
  status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled' COMMENT '会议状态',
  
  -- 客户信息
  customer_id VARCHAR(36) COMMENT '关联客户ID',
  customer_name VARCHAR(255) COMMENT '客户名称',
  customer_contact VARCHAR(255) COMMENT '客户联系人',
  customer_requirements TEXT COMMENT '客户需求描述',
  
  -- 清洁度要求
  cleanliness_level VARCHAR(50) COMMENT '清洁度等级要求',
  cleanliness_standard VARCHAR(100) COMMENT '清洁度标准（如ISO 16232）',
  cleanliness_details JSON COMMENT '清洁度详细要求（颗粒度、残留物等）',
  
  -- 产品信息
  product_type VARCHAR(100) COMMENT '产品类型',
  part_name VARCHAR(255) COMMENT '零件名称',
  part_material VARCHAR(100) COMMENT '零件材质',
  part_dimensions JSON COMMENT '零件尺寸（长宽高重量）',
  cycle_time INT COMMENT '节拍要求（秒）',
  loading_form VARCHAR(100) COMMENT '上下料形式',
  
  -- 会议时间
  scheduled_start DATETIME COMMENT '计划开始时间',
  scheduled_end DATETIME COMMENT '计划结束时间',
  actual_start DATETIME COMMENT '实际开始时间',
  actual_end DATETIME COMMENT '实际结束时间',
  
  -- 参与人员
  organizer_id VARCHAR(36) COMMENT '组织者ID',
  organizer_name VARCHAR(100) COMMENT '组织者姓名',
  internal_participants JSON COMMENT '内部参与人员列表',
  external_participants JSON COMMENT '外部参与人员列表（客户方）',
  
  -- AI功能状态
  ai_case_matching_enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用AI案例匹配',
  ai_solution_suggestion_enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用AI方案建议',
  ai_voice_recognition_enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用AI语音识别',
  
  -- 关联项目
  related_project_id VARCHAR(36) COMMENT '关联项目ID',
  related_opportunity_id VARCHAR(36) COMMENT '关联商机ID',
  
  -- 元数据
  created_by VARCHAR(36) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_customer_id (customer_id),
  INDEX idx_meeting_type (meeting_type),
  INDEX idx_status (status),
  INDEX idx_scheduled_start (scheduled_start),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户方案沟通确认会议';
`;

// ============================================================================
// 2. 客户资料上传表 (customer_uploads)
// ============================================================================
export const customerUploadsSchema = `
CREATE TABLE IF NOT EXISTS customer_uploads (
  id VARCHAR(36) PRIMARY KEY,
  meeting_id VARCHAR(36) NOT NULL COMMENT '关联会议ID',
  
  -- 文件信息
  file_name VARCHAR(255) NOT NULL COMMENT '文件名',
  file_type ENUM('drawing', 'cleanliness_spec', 'part_photo', 'document', 'video', 'audio', 'other') NOT NULL COMMENT '文件类型',
  file_category VARCHAR(50) COMMENT '文件分类（图纸/规格书/照片等）',
  file_url VARCHAR(500) NOT NULL COMMENT '文件URL（S3）',
  file_size BIGINT COMMENT '文件大小（字节）',
  mime_type VARCHAR(100) COMMENT 'MIME类型',
  
  -- 文件描述
  description TEXT COMMENT '文件描述',
  tags JSON COMMENT '标签列表',
  
  -- AI分析结果
  ai_analysis_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending' COMMENT 'AI分析状态',
  ai_extracted_text TEXT COMMENT 'AI提取的文本内容',
  ai_identified_specs JSON COMMENT 'AI识别的规格参数',
  ai_suggested_cases JSON COMMENT 'AI建议的相关案例',
  
  -- 版本信息
  version INT DEFAULT 1 COMMENT '文件版本',
  is_latest BOOLEAN DEFAULT TRUE COMMENT '是否最新版本',
  previous_version_id VARCHAR(36) COMMENT '上一版本ID',
  
  -- 元数据
  uploaded_by VARCHAR(36) NOT NULL,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_meeting_id (meeting_id),
  INDEX idx_file_type (file_type),
  INDEX idx_ai_analysis_status (ai_analysis_status),
  FOREIGN KEY (meeting_id) REFERENCES customer_solution_meetings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户资料上传';
`;

// ============================================================================
// 3. 案例库表 (solution_cases)
// ============================================================================
export const solutionCasesSchema = `
CREATE TABLE IF NOT EXISTS solution_cases (
  id VARCHAR(36) PRIMARY KEY,
  
  -- 案例基本信息
  case_number VARCHAR(50) UNIQUE NOT NULL COMMENT '案例编号',
  case_name VARCHAR(255) NOT NULL COMMENT '案例名称',
  case_type ENUM('standard', 'custom', 'special') DEFAULT 'standard' COMMENT '案例类型',
  case_status ENUM('draft', 'active', 'archived', 'deprecated') DEFAULT 'active' COMMENT '案例状态',
  
  -- 客户和产品信息
  customer_name VARCHAR(255) COMMENT '客户名称',
  customer_industry VARCHAR(100) COMMENT '客户行业',
  product_type VARCHAR(100) COMMENT '产品类型',
  part_category VARCHAR(100) COMMENT '零件类别',
  part_material VARCHAR(100) COMMENT '零件材质',
  
  -- 清洁度信息
  cleanliness_level VARCHAR(50) COMMENT '清洁度等级',
  cleanliness_standard VARCHAR(100) COMMENT '清洁度标准',
  cleanliness_achieved VARCHAR(50) COMMENT '实际达到的清洁度',
  
  -- 技术方案
  solution_summary TEXT COMMENT '方案摘要',
  solution_details JSON COMMENT '方案详情（工艺流程、设备配置等）',
  equipment_config JSON COMMENT '设备配置',
  process_flow JSON COMMENT '工艺流程',
  cycle_time INT COMMENT '节拍（秒）',
  
  -- 项目阶段信息
  project_phase VARCHAR(20) COMMENT '项目阶段（M0-M12）',
  project_id VARCHAR(36) COMMENT '关联项目ID',
  
  -- 工序信息
  process_steps JSON COMMENT '工序步骤（T1-T15）',
  
  -- 成功指标
  success_rate DECIMAL(5,2) COMMENT '成功率（%）',
  customer_satisfaction INT COMMENT '客户满意度（1-5）',
  delivery_on_time BOOLEAN COMMENT '是否按时交付',
  
  -- AI向量嵌入（用于相似度搜索）
  embedding_vector JSON COMMENT 'AI向量嵌入',
  embedding_model VARCHAR(50) COMMENT '嵌入模型名称',
  embedding_updated_at DATETIME COMMENT '嵌入更新时间',
  
  -- 关键词和标签
  keywords JSON COMMENT '关键词列表',
  tags JSON COMMENT '标签列表',
  
  -- 附件
  attachments JSON COMMENT '附件列表（图纸、照片、文档）',
  
  -- 元数据
  created_by VARCHAR(36) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_case_number (case_number),
  INDEX idx_case_type (case_type),
  INDEX idx_case_status (case_status),
  INDEX idx_product_type (product_type),
  INDEX idx_cleanliness_level (cleanliness_level),
  INDEX idx_project_phase (project_phase),
  FULLTEXT INDEX ft_search (case_name, solution_summary)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='解决方案案例库';
`;

// ============================================================================
// 4. 案例匹配记录表 (case_match_records)
// ============================================================================
export const caseMatchRecordsSchema = `
CREATE TABLE IF NOT EXISTS case_match_records (
  id VARCHAR(36) PRIMARY KEY,
  meeting_id VARCHAR(36) NOT NULL COMMENT '关联会议ID',
  
  -- 匹配请求
  match_request JSON NOT NULL COMMENT '匹配请求参数',
  match_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '匹配时间',
  
  -- 匹配结果
  matched_cases JSON COMMENT '匹配到的案例列表（含相似度分数）',
  total_matches INT DEFAULT 0 COMMENT '匹配案例总数',
  
  -- 相似度详情
  similarity_scores JSON COMMENT '各案例相似度分数详情',
  match_dimensions JSON COMMENT '匹配维度（清洁度、材质、工艺等）',
  
  -- AI分析
  ai_analysis TEXT COMMENT 'AI分析说明',
  ai_recommendations JSON COMMENT 'AI推荐建议',
  
  -- 用户反馈
  user_selected_cases JSON COMMENT '用户选择的案例',
  user_feedback TEXT COMMENT '用户反馈',
  feedback_rating INT COMMENT '反馈评分（1-5）',
  
  -- 元数据
  created_by VARCHAR(36) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_meeting_id (meeting_id),
  INDEX idx_match_timestamp (match_timestamp),
  FOREIGN KEY (meeting_id) REFERENCES customer_solution_meetings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='案例匹配记录';
`;

// ============================================================================
// 5. 方案版本表 (solution_versions)
// ============================================================================
export const solutionVersionsSchema = `
CREATE TABLE IF NOT EXISTS solution_versions (
  id VARCHAR(36) PRIMARY KEY,
  meeting_id VARCHAR(36) NOT NULL COMMENT '关联会议ID',
  
  -- 版本信息
  version_number INT NOT NULL COMMENT '版本号',
  version_name VARCHAR(100) COMMENT '版本名称',
  version_status ENUM('draft', 'review', 'approved', 'rejected', 'superseded') DEFAULT 'draft' COMMENT '版本状态',
  
  -- 方案内容
  solution_title VARCHAR(255) NOT NULL COMMENT '方案标题',
  solution_summary TEXT COMMENT '方案摘要',
  solution_content JSON NOT NULL COMMENT '方案详细内容',
  
  -- 技术方案
  equipment_config JSON COMMENT '设备配置',
  process_flow JSON COMMENT '工艺流程',
  process_steps JSON COMMENT '工序步骤（T1-T15）',
  
  -- 项目阶段
  project_phases JSON COMMENT '项目阶段规划（M0-M12）',
  
  -- 报价信息
  estimated_cost DECIMAL(15,2) COMMENT '预估成本',
  quoted_price DECIMAL(15,2) COMMENT '报价',
  delivery_time INT COMMENT '交付周期（天）',
  
  -- AI生成信息
  ai_generated BOOLEAN DEFAULT FALSE COMMENT '是否AI生成',
  ai_model VARCHAR(50) COMMENT 'AI模型',
  ai_prompt TEXT COMMENT 'AI提示词',
  ai_confidence DECIMAL(5,2) COMMENT 'AI置信度',
  
  -- 参考案例
  reference_cases JSON COMMENT '参考案例列表',
  
  -- 变更记录
  change_summary TEXT COMMENT '变更摘要',
  change_details JSON COMMENT '变更详情',
  previous_version_id VARCHAR(36) COMMENT '上一版本ID',
  
  -- 审批信息
  reviewer_id VARCHAR(36) COMMENT '审核人ID',
  reviewer_name VARCHAR(100) COMMENT '审核人姓名',
  review_comments TEXT COMMENT '审核意见',
  reviewed_at DATETIME COMMENT '审核时间',
  
  -- 元数据
  created_by VARCHAR(36) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_meeting_id (meeting_id),
  INDEX idx_version_number (version_number),
  INDEX idx_version_status (version_status),
  INDEX idx_created_at (created_at),
  UNIQUE KEY uk_meeting_version (meeting_id, version_number),
  FOREIGN KEY (meeting_id) REFERENCES customer_solution_meetings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='方案版本';
`;

// ============================================================================
// 6. 技术资料索引表 (technical_docs_index)
// ============================================================================
export const technicalDocsIndexSchema = `
CREATE TABLE IF NOT EXISTS technical_docs_index (
  id VARCHAR(36) PRIMARY KEY,
  
  -- 文档基本信息
  doc_number VARCHAR(50) UNIQUE NOT NULL COMMENT '文档编号',
  doc_title VARCHAR(255) NOT NULL COMMENT '文档标题',
  doc_type ENUM('process', 'equipment', 'standard', 'guide', 'template', 'case', 'other') NOT NULL COMMENT '文档类型',
  doc_category VARCHAR(100) COMMENT '文档分类',
  
  -- 项目阶段关联
  project_phase VARCHAR(20) COMMENT '项目阶段（M0-M12）',
  process_step VARCHAR(20) COMMENT '工序步骤（T1-T15）',
  
  -- 文档内容
  doc_summary TEXT COMMENT '文档摘要',
  doc_content TEXT COMMENT '文档内容（用于全文搜索）',
  doc_url VARCHAR(500) COMMENT '文档URL',
  
  -- 关键词和标签
  keywords JSON COMMENT '关键词列表',
  tags JSON COMMENT '标签列表',
  
  -- AI向量嵌入
  embedding_vector JSON COMMENT 'AI向量嵌入',
  embedding_model VARCHAR(50) COMMENT '嵌入模型名称',
  
  -- 使用统计
  view_count INT DEFAULT 0 COMMENT '查看次数',
  reference_count INT DEFAULT 0 COMMENT '引用次数',
  last_accessed_at DATETIME COMMENT '最后访问时间',
  
  -- 版本信息
  version VARCHAR(20) DEFAULT '1.0' COMMENT '文档版本',
  is_latest BOOLEAN DEFAULT TRUE COMMENT '是否最新版本',
  
  -- 元数据
  created_by VARCHAR(36) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_doc_number (doc_number),
  INDEX idx_doc_type (doc_type),
  INDEX idx_project_phase (project_phase),
  INDEX idx_process_step (process_step),
  FULLTEXT INDEX ft_doc_search (doc_title, doc_summary, doc_content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='技术资料索引';
`;

// ============================================================================
// 7. 会议语音记录表 (meeting_voice_records)
// ============================================================================
export const meetingVoiceRecordsSchema = `
CREATE TABLE IF NOT EXISTS meeting_voice_records (
  id VARCHAR(36) PRIMARY KEY,
  meeting_id VARCHAR(36) NOT NULL COMMENT '关联会议ID',
  
  -- 录音信息
  recording_url VARCHAR(500) COMMENT '录音文件URL',
  recording_duration INT COMMENT '录音时长（秒）',
  recording_format VARCHAR(20) COMMENT '录音格式',
  recording_size BIGINT COMMENT '文件大小（字节）',
  
  -- 转写信息
  transcription_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending' COMMENT '转写状态',
  transcription_text TEXT COMMENT '转写文本',
  transcription_segments JSON COMMENT '转写分段（含时间戳）',
  transcription_language VARCHAR(10) DEFAULT 'zh' COMMENT '转写语言',
  transcription_model VARCHAR(50) COMMENT '转写模型',
  
  -- 说话人识别
  speaker_diarization JSON COMMENT '说话人分离结果',
  identified_speakers JSON COMMENT '识别的说话人列表',
  
  -- AI分析
  ai_summary TEXT COMMENT 'AI生成的摘要',
  ai_key_points JSON COMMENT 'AI提取的关键点',
  ai_action_items JSON COMMENT 'AI识别的行动项',
  ai_mentioned_cases JSON COMMENT 'AI识别提到的案例',
  ai_mentioned_docs JSON COMMENT 'AI识别提到的文档',
  
  -- 元数据
  recorded_at DATETIME COMMENT '录音时间',
  transcribed_at DATETIME COMMENT '转写完成时间',
  created_by VARCHAR(36) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_meeting_id (meeting_id),
  INDEX idx_transcription_status (transcription_status),
  INDEX idx_recorded_at (recorded_at),
  FOREIGN KEY (meeting_id) REFERENCES customer_solution_meetings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会议语音记录';
`;

// ============================================================================
// 8. AI资料检索日志表 (ai_doc_retrieval_logs)
// ============================================================================
export const aiDocRetrievalLogsSchema = `
CREATE TABLE IF NOT EXISTS ai_doc_retrieval_logs (
  id VARCHAR(36) PRIMARY KEY,
  meeting_id VARCHAR(36) NOT NULL COMMENT '关联会议ID',
  
  -- 检索请求
  query_text TEXT NOT NULL COMMENT '检索查询文本',
  query_type ENUM('keyword', 'semantic', 'hybrid') DEFAULT 'hybrid' COMMENT '检索类型',
  query_filters JSON COMMENT '检索过滤条件',
  
  -- 检索结果
  retrieved_docs JSON COMMENT '检索到的文档列表',
  total_results INT DEFAULT 0 COMMENT '结果总数',
  retrieval_time_ms INT COMMENT '检索耗时（毫秒）',
  
  -- AI呈现
  ai_presentation JSON COMMENT 'AI呈现的资料组织',
  ai_highlights JSON COMMENT 'AI高亮的关键内容',
  ai_suggestions JSON COMMENT 'AI建议查看的内容',
  
  -- 用户交互
  user_viewed_docs JSON COMMENT '用户查看的文档',
  user_feedback TEXT COMMENT '用户反馈',
  
  -- 元数据
  triggered_by ENUM('manual', 'voice', 'auto') DEFAULT 'manual' COMMENT '触发方式',
  created_by VARCHAR(36) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_meeting_id (meeting_id),
  INDEX idx_query_type (query_type),
  INDEX idx_triggered_by (triggered_by),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (meeting_id) REFERENCES customer_solution_meetings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI资料检索日志';
`;

// 导出所有Schema
export const allCustomerSolutionMeetingSchemas = [
  customerSolutionMeetingsSchema,
  customerUploadsSchema,
  solutionCasesSchema,
  caseMatchRecordsSchema,
  solutionVersionsSchema,
  technicalDocsIndexSchema,
  meetingVoiceRecordsSchema,
  aiDocRetrievalLogsSchema,
];
