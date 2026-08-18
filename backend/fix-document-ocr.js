/**
 * Script to reset a document's OCR and trigger re-processing
 * Usage: node fix-document-ocr.js <document-id>
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const documentId = process.argv[2];

if (!documentId) {
  console.error('Usage: node fix-document-ocr.js <document-id>');
  process.exit(1);
}

async function fixDocument() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'edushare',
    user: 'edushare_user',
    password: 'edushare_password',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Get document info
    const result = await client.query(
      'SELECT id, title, "ocrResultUrl", status FROM documents WHERE id = $1',
      [documentId]
    );

    if (result.rows.length === 0) {
      console.error(`Document ${documentId} not found`);
      process.exit(1);
    }

    const doc = result.rows[0];
    console.log('Found document:', doc);

    if (!doc.ocrResultUrl) {
      console.log('Document has no OCR result URL, nothing to fix');
      process.exit(0);
    }

    // Delete the mock OCR file if it exists locally
    const ocrFilePath = doc.ocrResultUrl.replace('http://localhost:3000/upload/proxy/', '');
    console.log(`OCR file path: ${ocrFilePath}`);

    // Update document status back to processing to trigger re-OCR
    await client.query(
      `UPDATE documents 
       SET status = 'processing', 
           "ocrResultUrl" = NULL,
           "errorMessage" = NULL
       WHERE id = $1`,
      [documentId]
    );

    console.log('\n✅ Document reset successfully!');
    console.log('The background worker will pick it up and re-process with Azure OCR.');
    console.log('Check the backend logs to monitor progress.');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixDocument();
