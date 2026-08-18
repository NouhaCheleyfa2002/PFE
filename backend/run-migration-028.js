const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const pool = new Pool({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT) || 5432,
    database: process.env.DATABASE_NAME || 'edushare',
    user: process.env.DATABASE_USER || 'edushare_user',
    password: process.env.DATABASE_PASSWORD || 'edushare_password',
  });

  try {
    console.log('🔄 Connecting to database...');
    const client = await pool.connect();
    
    console.log('✅ Connected to database');
    console.log('📝 Running migration 028: Add soft delete to ratings...');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', '028-add-soft-delete-to-ratings.sql'),
      'utf8'
    );

    await client.query(migrationSQL);
    
    console.log('✅ Migration 028 completed successfully!');
    console.log('✨ Soft delete columns added to resource_ratings table');

    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
