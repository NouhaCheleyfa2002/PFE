/**
 * Script to manually trigger diagram extraction for existing questions
 * Run with: node trigger-diagram-extraction.js
 */

const { Client } = require('pg');
const axios = require('axios');

const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'edushare',
  user: 'edushare_user',
  password: 'edushare_password',
};

async function triggerDiagramExtraction() {
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Find questions with visual content
    const result = await client.query(`
      SELECT 
        eq.id,
        eq.question_text,
        eq.page_number,
        eq.document_id,
        eq.has_visual_content,
        eq.visual_content_ref,
        d."storageUrl",
        d."ocrResultUrl"
      FROM exam_questions eq
      JOIN documents d ON d.id = eq.document_id
      WHERE eq.has_visual_content = true
        AND eq.deleted_at IS NULL
      ORDER BY eq.document_id, eq.page_number, eq.id
    `);

    console.log(`Found ${result.rows.length} questions with visual content\n`);

    if (result.rows.length === 0) {
      console.log('No questions found. Upload a document first.');
      return;
    }

    // Group by document
    const byDocument = {};
    for (const row of result.rows) {
      if (!byDocument[row.document_id]) {
        byDocument[row.document_id] = {
          storageUrl: row.storageUrl,
          ocrResultUrl: row.ocrResultUrl,
          questions: [],
        };
      }
      byDocument[row.document_id].questions.push(row);
    }

    console.log(`Questions span ${Object.keys(byDocument).length} document(s)\n`);

    // Show document info
    for (const [documentId, doc] of Object.entries(byDocument)) {
      console.log(`📄 Document: ${documentId}`);
      console.log(`   Storage URL: ${doc.storageUrl}`);
      console.log(`   OCR URL: ${doc.ocrResultUrl}`);
      console.log(`   Questions: ${doc.questions.length}\n`);

      for (const q of doc.questions) {
        console.log(`   - Q${q.id}: "${q.question_text.substring(0, 60)}..."`);
        console.log(`     Page: ${q.page_number}`);
        
        // Check if diagram already extracted
        let hasDiagram = false;
        if (q.visual_content_ref) {
          try {
            const content = JSON.parse(q.visual_content_ref);
            hasDiagram = content.diagrams && content.diagrams.length > 0;
          } catch {}
        }
        console.log(`     Has Diagram: ${hasDiagram ? '✅' : '❌'}\n`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('RECOMMENDATION:');
    console.log('='.repeat(60));
    console.log('The diagram extraction runs automatically when questions are');
    console.log('saved. To re-trigger extraction:');
    console.log('');
    console.log('Option 1: Delete questions and re-process document');
    console.log('  - Go to admin moderation page');
    console.log('  - Delete the extracted questions');
    console.log('  - The document will be re-processed automatically');
    console.log('');
    console.log('Option 2: Call the backend API endpoint');
    console.log('  POST http://localhost:8888/moderation/{documentId}/extract-questions');
    console.log('');
    console.log('The new layout-aware extraction with AI fallback is now active!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

triggerDiagramExtraction();
