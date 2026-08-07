const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', '030-add-visual-content-to-questions.sql'),
      'utf8'
    );

    console.log('🚀 Running migration 030: Add visual content support to questions...');
    await client.query(migrationSQL);
    console.log('✅ Migration 030 completed successfully!');
    
    // Count questions with visual references
    const countResult = await client.query(`
      SELECT COUNT(*) as total_questions,
             COUNT(*) FILTER (WHERE has_visual_content = TRUE) as with_visuals
      FROM exam_questions
      WHERE deleted_at IS NULL
    `);
    
    console.log('\n📊 Question statistics:');
    console.log(`   Total questions: ${countResult.rows[0].total_questions}`);
    console.log(`   With visual content: ${countResult.rows[0].with_visuals}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n👋 Database connection closed');
  }
}

runMigration();
