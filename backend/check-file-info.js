const { Client } = require('pg');

async function checkFileInfo() {
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
      'SELECT "storageUrl", "fileSize", "mimeType", "originalFileName" FROM documents WHERE id = $1',
      ['9a8adda0-5d83-4c54-810c-f805478d37c7']
    );

    console.log('File Info:');
    console.log(result.rows[0]);
    console.log(`\nFile size: ${(result.rows[0].fileSize / 1024 / 1024).toFixed(2)} MB`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkFileInfo();
