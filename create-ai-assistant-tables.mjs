import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const tables = [
  `CREATE TABLE IF NOT EXISTS employee_ai_assistants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employeeId INT NOT NULL,
    assistantCode VARCHAR(50) NOT NULL UNIQUE,
    assistantName VARCHAR(100) NOT NULL,
    assistantType ENUM('general', 'sales', 'tech', 'pm', 'hr', 'finance', 'production', 'engineering') DEFAULT 'general',
    personalityConfig TEXT,
    knowledgeDomains TEXT,
    learningProgress TEXT,
    interactionStats TEXT,
    skillLevels TEXT,
    careerGoals TEXT,
    status ENUM('active', 'paused', 'archived') DEFAULT 'active',
    lastActiveAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS ai_assistant_interactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assistantId INT NOT NULL,
    employeeId INT NOT NULL,
    sessionId VARCHAR(100) NOT NULL,
    interactionType ENUM('task', 'question', 'feedback', 'learning', 'coaching', 'chat') DEFAULT 'chat',
    context TEXT,
    userInput TEXT,
    assistantResponse TEXT,
    feedbackScore INT,
    feedbackComment TEXT,
    learningExtracted TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS employee_skill_maps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employeeId INT NOT NULL,
    skillCategory VARCHAR(100) NOT NULL,
    skillName VARCHAR(200) NOT NULL,
    currentLevel INT DEFAULT 1,
    targetLevel INT,
    evidence TEXT,
    assessmentHistory TEXT,
    improvementPlan TEXT,
    lastAssessedAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS career_development_paths (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employeeId INT NOT NULL,
    currentRole VARCHAR(100) NOT NULL,
    targetRole VARCHAR(100) NOT NULL,
    pathType ENUM('vertical', 'horizontal', 'cross_functional') DEFAULT 'vertical',
    milestones TEXT,
    requiredSkills TEXT,
    requiredExperiences TEXT,
    progressPercentage INT DEFAULT 0,
    estimatedTimeline VARCHAR(50),
    mentorId INT,
    status ENUM('planning', 'in_progress', 'achieved', 'paused') DEFAULT 'planning',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS ai_learning_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assistantId INT NOT NULL,
    employeeId INT NOT NULL,
    learningSource ENUM('interaction', 'task', 'feedback', 'document', 'meeting') NOT NULL,
    sourceReference VARCHAR(200),
    learnedContent TEXT,
    contentCategory VARCHAR(100),
    confidenceScore DECIMAL(3,2),
    appliedCount INT DEFAULT 0,
    effectivenessScore DECIMAL(3,2),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS project_digital_twins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    projectId INT NOT NULL,
    twinCode VARCHAR(50) NOT NULL UNIQUE,
    projectType ENUM('standard', 'custom', 'service') DEFAULT 'standard',
    currentPhase VARCHAR(50),
    healthScore INT DEFAULT 100,
    progressModel TEXT,
    costModel TEXT,
    qualityModel TEXT,
    resourceModel TEXT,
    riskModel TEXT,
    deliveryModel TEXT,
    syncStatus ENUM('synced', 'pending', 'error') DEFAULT 'synced',
    lastSyncedAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS project_state_snapshots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    twinId INT NOT NULL,
    snapshotType ENUM('daily', 'weekly', 'milestone', 'manual') DEFAULT 'daily',
    snapshotData TEXT,
    deltaFromPrevious TEXT,
    keyMetrics TEXT,
    createdBy INT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS project_predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    twinId INT NOT NULL,
    predictionType ENUM('completion_date', 'cost', 'quality', 'risk') NOT NULL,
    predictionModel VARCHAR(100),
    inputData TEXT,
    predictionResult TEXT,
    confidenceLevel DECIMAL(3,2),
    actualResult TEXT,
    accuracyScore DECIMAL(3,2),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    validatedAt TIMESTAMP NULL
  )`,
  `CREATE TABLE IF NOT EXISTS project_risk_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    twinId INT NOT NULL,
    alertCode VARCHAR(50) NOT NULL UNIQUE,
    riskCategory ENUM('schedule', 'cost', 'quality', 'resource', 'scope') NOT NULL,
    severity ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium',
    description TEXT,
    triggerConditions TEXT,
    currentIndicators TEXT,
    recommendedActions TEXT,
    status ENUM('active', 'acknowledged', 'resolved', 'expired') DEFAULT 'active',
    acknowledgedBy INT,
    resolvedAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS project_optimization_suggestions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    twinId INT NOT NULL,
    suggestionType ENUM('schedule', 'cost', 'resource', 'quality', 'process') NOT NULL,
    priority ENUM('high', 'medium', 'low') DEFAULT 'medium',
    title VARCHAR(200) NOT NULL,
    description TEXT,
    expectedImpact TEXT,
    implementationEffort ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
    supportingData TEXT,
    status ENUM('pending', 'accepted', 'rejected', 'implemented') DEFAULT 'pending',
    decisionBy INT,
    decisionReason TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    decidedAt TIMESTAMP NULL
  )`,
  `CREATE TABLE IF NOT EXISTS project_knowledge_base (
    id INT AUTO_INCREMENT PRIMARY KEY,
    twinId INT,
    projectId INT,
    knowledgeType ENUM('lesson_learned', 'best_practice', 'risk_pattern', 'solution') NOT NULL,
    category VARCHAR(100),
    title VARCHAR(200) NOT NULL,
    content TEXT,
    context TEXT,
    applicability TEXT,
    useCount INT DEFAULT 0,
    rating DECIMAL(3,2),
    contributedBy INT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS ai_assistant_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    templateCode VARCHAR(50) NOT NULL UNIQUE,
    templateName VARCHAR(100) NOT NULL,
    assistantType ENUM('solution', 'quotation', 'planning', 'kpi', 'interview', 'purchase', 'general') NOT NULL,
    basePrompt TEXT,
    capabilities TEXT,
    knowledgeConfig TEXT,
    toolsConfig TEXT,
    description TEXT,
    version VARCHAR(20) DEFAULT '1.0',
    isActive BOOLEAN DEFAULT TRUE,
    createdBy INT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS ai_assistant_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sessionId VARCHAR(100) NOT NULL UNIQUE,
    assistantId INT NOT NULL,
    userId INT NOT NULL,
    title VARCHAR(200),
    context TEXT,
    messageCount INT DEFAULT 0,
    status ENUM('active', 'archived', 'deleted') DEFAULT 'active',
    lastMessageAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS ai_assistant_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sessionId VARCHAR(100) NOT NULL,
    role ENUM('user', 'assistant', 'system') NOT NULL,
    content TEXT NOT NULL,
    metadata TEXT,
    tokens INT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`
];

async function createTables() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  for (const sql of tables) {
    try {
      await connection.execute(sql);
      const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1];
      console.log('✅ Created table:', tableName);
    } catch (err) {
      console.error('❌ Error:', err.message);
    }
  }
  
  await connection.end();
  console.log('Done!');
}

createTables();
