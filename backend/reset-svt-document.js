const { Client } = require('pg');

const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'edushare',
  user: 'edushare_user',
  password: 'edushare_password',
};

const SVT_DOCUMENT_ID = 'e4d96e27-b2fb-470f-9055-f01e56474326';

async function resetDocument() {
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Delete questions
    const deleteResult = await client.query(`
      DELETE FROM exam_questions 
      WHERE document_id = $1
      RETURNING id
    `, [SVT_DOCUMENT_ID]);

    console.log(`🗑️  Deleted ${deleteResult.rowCount} questions\n`);

    // Set document to 'completed' so it can be re-processed
    await client.query(`
      UPDATE documents 
      SET status = 'completed'
      WHERE id = $1
    `, [SVT_DOCUMENT_ID]);

    console.log('✅ Document reset complete!\n');
    console.log('════════════════════════════════════════════════════');
    console.log('NEXT STEPS:');
    console.log('════════════════════════════════════════════════════');
    console.log('1. Go to the frontend');
    console.log('2. Navigate to the document page');
    console.log('3. Click "Extract Questions" or trigger re-processing');
    console.log('');
    console.log('The NEW AI prompt will:');
    console.log('✓ Analyze if questions are self-contained');
    console.log('✓ Capture COMPLETE diagrams with all labels/arrows');
    console.log('✓ Exclude surrounding text');
    console.log('✓ Match Document 1/Document 2 correctly');
    console.log('✓ Handle R1, R2, R3 symbolic references');
    console.log('════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

resetDocument();
