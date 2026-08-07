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
      path.join(__dirname, 'migrations', '029-add-soft-delete-to-exam-questions.sql'),
      'utf8'
    );

    console.log('🚀 Running migration 029: Add soft delete to exam questions...');
    await client.query(migrationSQL);
    console.log('✅ Migration 029 completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('👋 Database connection closed');
  }
}

runMigration();
