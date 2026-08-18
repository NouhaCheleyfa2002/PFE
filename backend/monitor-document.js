const { Client } = require('pg');

const documentId = process.argv[2] || '9a8adda0-5d83-4c54-810c-f805478d37c7';
const maxChecks = parseInt(process.argv[3]) || 30;
const intervalSeconds = 5;

async function monitorDocument() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'edushare',
    user: 'edushare_user',
    password: 'edushare_password',
  });

  try {
    await client.connect();
    console.log(`Monitoring document ${documentId}...`);
    console.log(`Will check every ${intervalSeconds} seconds, max ${maxChecks} times\n`);

    for (let i = 0; i < maxChecks; i++) {
      const result = await client.query(
        'SELECT id, title, status, "ocrResultUrl", "errorMessage", "updatedAt" FROM documents WHERE id = $1',
        [documentId]
      );

      if (result.rows.length === 0) {
        console.log(`Document ${documentId} not found`);
        break;
      }

      const doc = result.rows[0];
      const timestamp = new Date().toLocaleTimeString();
      
      console.log(`[${timestamp}] Check ${i + 1}/${maxChecks}:`);
      console.log(`  Status: ${doc.status}`);
      console.log(`  OCR URL: ${doc.ocrResultUrl ? 'Generated ✓' : 'Pending...'}`);
      if (doc.errorMessage) {
        console.log(`  Error: ${doc.errorMessage}`);
      }
      
      if (doc.status === 'completed' && doc.ocrResultUrl) {
        console.log('\n✅ Document processing COMPLETED!');
        console.log('You can now use the document chat feature.\n');
        break;
      }
      
      if (doc.status === 'failed') {
        console.log('\n❌ Document processing FAILED!');
        console.log(`Error: ${doc.errorMessage}\n`);
        break;
      }

      if (i < maxChecks - 1) {
        await new Promise(resolve => setTimeout(resolve, intervalSeconds * 1000));
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

monitorDocument();
