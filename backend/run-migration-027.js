const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    database: process.env.DATABASE_NAME || 'edushare',
    user: process.env.DATABASE_USER || 'edushare_user',
    password: process.env.DATABASE_PASSWORD || 'edushare_password',
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '027-add-ocr-text-and-timeline.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration 027...');
    await client.query(migrationSQL);
    console.log('✓ Migration 027 completed successfully');

  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
