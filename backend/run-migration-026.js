const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'edushare',
  user: process.env.DATABASE_USER || 'edushare_user',
  password: process.env.DATABASE_PASSWORD || 'edushare_password',
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running migration 026-add-user-ban-restrict.sql...');
    
    const migrationPath = path.join(__dirname, 'migrations', '026-add-user-ban-restrict.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
