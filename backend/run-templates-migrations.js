const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigrations() {
  const client = new Client({
    host: process.env.DATABASE_HOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || process.env.DB_PORT) || 5432,
    user: process.env.DATABASE_USER || process.env.DB_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || process.env.DB_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || process.env.DB_NAME || 'education_db',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Run migration 023 - Create exam_templates table
    console.log('\n📦 Running migration 023: Create exam_templates table...');
    const migration023 = fs.readFileSync(
      path.join(__dirname, 'migrations', '023-create-exam-templates-table.sql'),
      'utf8'
    );
    await client.query(migration023);
    console.log('✅ Migration 023 completed');

    // Run migration 024 - Create default template
    console.log('\n📦 Running migration 024: Create default template...');
    const migration024 = fs.readFileSync(
      path.join(__dirname, 'migrations', '024-create-default-template.sql'),
      'utf8'
    );
    await client.query(migration024);
    console.log('✅ Migration 024 completed');

    // Verify tables
    console.log('\n🔍 Verifying exam_templates table...');
    const result = await client.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'exam_templates'
      ORDER BY ordinal_position;
    `);
    
    console.log(`\nFound ${result.rows.length} columns in exam_templates table:`);
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Check for default template
    console.log('\n🔍 Checking for default template...');
    const defaultTemplate = await client.query(`
      SELECT id, name, is_default FROM exam_templates WHERE is_default = true;
    `);
    
    if (defaultTemplate.rows.length > 0) {
      console.log('✅ Default template found:');
      defaultTemplate.rows.forEach(row => {
        console.log(`  - ID: ${row.id}`);
        console.log(`  - Name: ${row.name}`);
        console.log(`  - Is Default: ${row.is_default}`);
      });
    } else {
      console.log('⚠️  No default template found');
    }

    console.log('\n✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n👋 Database connection closed');
  }
}

runMigrations();
