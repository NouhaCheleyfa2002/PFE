/**
 * Script to run migration 023: Create exam_templates table
 * Usage: node run-migration-023.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  // Database connection configuration
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    database: process.env.DATABASE_NAME || 'edushare',
    user: process.env.DATABASE_USER || 'edushare_user',
    password: process.env.DATABASE_PASSWORD || 'edushare_password',
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '023-create-exam-templates-table.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration
    console.log('🔄 Executing migration...');
    await client.query(migrationSQL);
    console.log('✅ Migration 023 executed successfully!');

    // Verify table was created
    const result = await client.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'exam_templates'
      ORDER BY ordinal_position;
    `);

    if (result.rows.length > 0) {
      console.log('\n📊 Table structure verified:');
      console.log('exam_templates table columns:');
      result.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    } else {
      console.error('⚠️  Warning: Could not verify table structure');
    }

    // Verify indexes
    const indexResult = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'exam_templates';
    `);

    if (indexResult.rows.length > 0) {
      console.log('\n📇 Indexes created:');
      indexResult.rows.forEach(row => {
        console.log(`  - ${row.indexname}`);
      });
    }

    console.log('\n✨ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Load environment variables from .env file
require('dotenv').config();

// Run migration
runMigration();
