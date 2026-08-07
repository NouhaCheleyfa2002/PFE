/**
 * Diagnostic script to check diagram extraction status
 * Run: node check-diagram-status.js
 */

const { Client } = require('pg');

async function checkDiagramStatus() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'edushare',
    user: 'edushare_user',
    password: 'edushare_password',
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // First, check what columns exist in documents table
    const columnsResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'documents'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Documents table columns:',columnsResult.rows.map(r => r.column_name).join(', '), '\n');

    // Find SVT document
    const docResult = await client.query(`
      SELECT *
      FROM documents
      WHERE title LIKE '%SVT%' OR title LIKE '%Science%'
      ORDER BY "createdAt" DESC
      LIMIT 1
    `);

    if (docResult.rows.length === 0) {
      console.log('❌ No SVT document found');
      return;
    }

    const doc = docResult.rows[0];
    console.log('📄 Document Found:');
    console.log(`   ID: ${doc.id}`);
    console.log(`   Title: ${doc.title}`);
    console.log(`   Has Storage URL: ${!!doc.storageUrl}`);
    console.log(`   Has OCR URL: ${!!doc.ocrResultUrl}\n`);

    // Check questions
    const questionsResult = await client.query(`
      SELECT 
        id,
        LEFT(question_text, 80) as question_preview,
        has_visual_content,
        visual_content_type,
        page_number,
        visual_content_ref,
        CASE
          WHEN visual_content_ref LIKE '%diagrams%' THEN true
          ELSE false
        END as has_diagram_data,
        LENGTH(visual_content_ref::text) as ref_length
      FROM exam_questions
      WHERE document_id = $1
      ORDER BY page_number
      LIMIT 20
    `, [doc.id]);

    console.log(`📝 Questions Found: ${questionsResult.rows.length}\n`);

    let withVisual = 0;
    let withDiagrams = 0;

    for (const q of questionsResult.rows) {
      if (q.has_visual_content) {
        withVisual++;
        console.log(`\n${withVisual}. "${q.question_preview}..."`);
        console.log(`   hasVisualContent: ✅ YES`);
        console.log(`   visualContentType: ${q.visual_content_type || 'null'}`);
        console.log(`   pageNumber: ${q.page_number || 'null'}`);
        console.log(`   hasDiagramData: ${q.has_diagram_data ? '✅ YES' : '❌ NO'}`);
        console.log(`   visualContentRef size: ${q.ref_length || 0} chars`);

        if (q.has_diagram_data) {
          withDiagrams++;
          // Parse to see diagram info
          try {
            const ref = JSON.parse(q.visual_content_ref);
            if (ref.diagrams && ref.diagrams[0]) {
              const imgSize = ref.diagrams[0].imageData?.length || 0;
              console.log(`   📸 Diagram extracted: ${ref.diagrams[0].width}x${ref.diagrams[0].height}, ${Math.round(imgSize/1024)}KB`);
              console.log(`   Extraction method: ${ref.extractionMethod || 'unknown'}`);
              console.log(`   AI confidence: ${ref.aiConfidence || 'unknown'}`);
            }
          } catch (e) {
            console.log(`   ⚠️  visualContentRef is not valid JSON`);
          }
        }
      }
    }

    console.log(`\n\n📊 Summary:`);
    console.log(`   Total questions: ${questionsResult.rows.length}`);
    console.log(`   With visual content flag: ${withVisual}`);
    console.log(`   With extracted diagrams: ${withDiagrams}`);
    console.log(`   Extraction success rate: ${withVisual > 0 ? Math.round((withDiagrams/withVisual) * 100) : 0}%\n`);

    if (withVisual > 0 && withDiagrams === 0) {
      console.log('❌ PROBLEM: Questions have hasVisualContent=true but NO diagrams extracted');
      console.log('   This means the backend extraction is failing.\n');
      console.log('💡 Next steps:');
      console.log('   1. Check backend logs for extraction errors');
      console.log('   2. Verify OCR data is available');
      console.log('   3. Try running: node reset-svt-document.js');
      console.log('   4. Re-upload the PDF to trigger extraction');
    } else if (withDiagrams > 0) {
      console.log('✅ SUCCESS: Diagrams are being extracted!');
      console.log(`   Success rate: ${Math.round((withDiagrams/withVisual) * 100)}%\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkDiagramStatus();
