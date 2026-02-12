import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const tables = [
  `CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    assistantType ENUM('solution', 'quotation', 'planning', 'kpi', 'personal') NOT NULL,
    title VARCHAR(200),
    status ENUM('active', 'archived', 'deleted') DEFAULT 'active' NOT NULL,
    projectId INT,
    customerId INT,
    metadata TEXT,
    messageCount INT DEFAULT 0 NOT NULL,
    lastActivityAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sessionId INT NOT NULL,
    role ENUM('user', 'assistant', 'system') NOT NULL,
    content TEXT NOT NULL,
    contentType ENUM('text', 'table', 'code', 'file') DEFAULT 'text' NOT NULL,
    metadata TEXT,
    feedback ENUM('positive', 'negative'),
    feedbackContent TEXT,
    isBookmarked BOOLEAN DEFAULT FALSE NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ai_chat_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT,
    assistantType ENUM('solution', 'quotation', 'planning', 'kpi', 'personal') NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    category VARCHAR(50),
    usageCount INT DEFAULT 0 NOT NULL,
    isPublic BOOLEAN DEFAULT FALSE NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ai_chat_exports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    sessionId INT NOT NULL,
    format ENUM('pdf', 'markdown', 'docx') NOT NULL,
    filePath VARCHAR(500),
    status ENUM('pending', 'completed', 'failed') DEFAULT 'pending' NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`
];

for (const sql of tables) {
  try {
    await connection.execute(sql);
    console.log('Created table successfully');
  } catch (err) {
    if (err.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('Table already exists, skipping');
    } else {
      console.error('Error:', err.message);
    }
  }
}

await connection.end();
console.log('All AI chat tables created successfully');
