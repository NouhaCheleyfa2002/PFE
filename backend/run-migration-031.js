/**
 * Migration Runner for 031-add-collaboration-tables.sql
 * 
 * This script runs the collaboration system database migration.
 * 
 * Usage:
 *   node run-migration-031.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  console.log('🚀 Starting Collaboration System Migration...\n');

  // Create database connection
  const pool = new Pool({
    host: process.env.DATABASE_HOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || process.env.DB_PORT || '5432'),
    database: process.env.DATABASE_NAME || process.env.DB_NAME || 'edushare',
    user: process.env.DATABASE_USER || process.env.DB_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || process.env.DB_PASSWORD || 'postgres',
  });

  try {
    // Test connection
    console.log('📡 Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '031-add-collaboration-tables.sql');
    console.log('📄 Reading migration file:', migrationPath);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error('Migration file not found: ' + migrationPath);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded\n');

    // Execute migration
    console.log('⚙️  Executing migration...\n');
    await client.query(migrationSQL);
    console.log('✅ Migration executed successfully!\n');

    // Verify tables were created
    console.log('🔍 Verifying tables...');
    const verifyQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'resource_collaborators',
        'exam_collaborators',
        'exam_sessions',
        'question_locks',
        'collaboration_comments',
        'collaboration_versions',
        'collaboration_activities'
      )
      ORDER BY table_name;
    `;
    
    const result = await client.query(verifyQuery);
    
    console.log('\n📊 Created Tables:');
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // Get table counts
    console.log('\n📈 Table Statistics:');
    for (const row of result.rows) {
      const countResult = await client.query(`SELECT COUNT(*) FROM ${row.table_name}`);
      console.log(`   ${row.table_name}: ${countResult.rows[0].count} rows`);
    }

    // Check indexes
    const indexQuery = `
      SELECT 
        tablename,
        indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename LIKE '%collaborat%'
      ORDER BY tablename, indexname;
    `;
    
    const indexes = await client.query(indexQuery);
    console.log('\n🔗 Created Indexes:');
    let currentTable = '';
    indexes.rows.forEach(row => {
      if (row.tablename !== currentTable) {
        console.log(`\n   ${row.tablename}:`);
        currentTable = row.tablename;
      }
      console.log(`     - ${row.indexname}`);
    });

    // Check views
    const viewQuery = `
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%collaborat%'
      ORDER BY table_name;
    `;
    
    const views = await client.query(viewQuery);
    if (views.rows.length > 0) {
      console.log('\n👁️  Created Views:');
      views.rows.forEach(row => {
        console.log(`   ✓ ${row.table_name}`);
      });
    }

    // Check triggers
    const triggerQuery = `
      SELECT 
        trigger_name,
        event_object_table
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      AND (event_object_table LIKE '%collaborat%' OR event_object_table = 'question_locks')
      ORDER BY event_object_table, trigger_name;
    `;
    
    const triggers = await client.query(triggerQuery);
    if (triggers.rows.length > 0) {
      console.log('\n⚡ Created Triggers:');
      let currentTriggerTable = '';
      triggers.rows.forEach(row => {
        if (row.event_object_table !== currentTriggerTable) {
          console.log(`\n   ${row.event_object_table}:`);
          currentTriggerTable = row.event_object_table;
        }
        console.log(`     - ${row.trigger_name}`);
      });
    }

    client.release();
    console.log('\n✨ Migration completed successfully!\n');
    console.log('📋 Next steps:');
    console.log('   1. Review the created tables and indexes');
    console.log('   2. Proceed to Phase 2: Backend Module Setup');
    console.log('   3. Check COLLABORATION_IMPLEMENTATION_GUIDE.md for details\n');

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error('Error:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
