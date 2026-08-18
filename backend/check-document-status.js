const { Client } = require('pg');

const documentId = process.argv[2] || '9a8adda0-5d83-4c54-810c-f805478d37c7';

async function checkStatus() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'edushare',
    user: 'edushare_user',
    password: 'edushare_password',
  });

  try {
    await client.connect();
    
    const result = await client.query(
      'SELECT id, title, status, "ocrResultUrl", "errorMessage" FROM documents WHERE id = $1',
      [documentId]
    );

    if (result.rows.length === 0) {
      console.log(`Document ${documentId} not found`);
    } else {
      console.log('\nDocument Status:');
      console.log(JSON.stringify(result.rows[0], null, 2));
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkStatus();
