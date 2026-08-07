const { Client } = require('pg');

const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'edushare',
  user: 'edushare_user',
  password: 'edushare_password',
};

const DOCUMENT_ID = 'e4d96e27-b2fb-470f-9055-f01e56474326'; // SVT document

async function deleteAndReextract() {
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Delete existing questions
    const deleteResult = await client.query(`
      DELETE FROM exam_questions 
      WHERE document_id = $1
      RETURNING id
    `, [DOCUMENT_ID]);

    console.log(`🗑️  Deleted ${deleteResult.rowCount} questions\n`);

    // Update document status to trigger re-processing
    await client.query(`
      UPDATE documents 
      SET status = 'processing'
      WHERE id = $1
    `, [DOCUMENT_ID]);

    console.log('✅ Document status updated to "processing"');
    console.log('📝 The document worker will pick it up and re-extract questions');
    console.log('🎨 The new layout-aware diagram extraction will run automatically\n');
    console.log('👀 Watch the backend logs for: "📸 Starting layout-aware diagram extraction"');
    console.log('');
    console.log('Then refresh the questions page to see the results!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

deleteAndReextract();
