const { Client } = require('pg');
require('dotenv').config();

async function checkColumn() {
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

    const result = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'exam_questions' 
      AND column_name = 'deleted_at'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Column "deleted_at" exists:');
      console.log(JSON.stringify(result.rows[0], null, 2));
    } else {
      console.log('❌ Column "deleted_at" does not exist');
    }

    // Also count questions
    const countResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE deleted_at IS NULL) as active,
        COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted
      FROM exam_questions
    `);
    
    console.log('\n📊 Question counts:');
    console.log(JSON.stringify(countResult.rows[0], null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkColumn();
