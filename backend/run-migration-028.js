const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = new Pool({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    database: process.env.DATABASE_NAME || 'edushare',
    user: process.env.DATABASE_USER || 'edushare_user',
    password: process.env.DATABASE_PASSWORD || 'edushare_password',
  });

  try {
    console.log('Running migration 028: Add soft delete to ratings...');

    // Read SQL file
    const sqlPath = path.join(__dirname, 'migrations', '028-add-soft-delete-to-ratings.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute migration
    await pool.query(sql);

    console.log('✓ Migration 028 completed successfully');
    console.log('✓ Added soft delete columns to resource_ratings table');
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
