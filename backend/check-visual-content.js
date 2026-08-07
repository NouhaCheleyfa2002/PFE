const { Client } = require('pg');
require('dotenv').config();

async function checkVisualContent() {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    database: process.env.DATABASE_NAME || 'education_db',
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Get questions with visual content
    const result = await client.query(`
      SELECT 
        id,
        question_text,
        has_visual_content,
        visual_content_type,
        visual_content_ref,
        page_number,
        created_at
      FROM exam_questions
      WHERE has_visual_content = true
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log(`\n📊 Found ${result.rows.length} questions with visual content:\n`);

    for (const row of result.rows) {
      console.log('─'.repeat(80));
      console.log(`ID: ${row.id}`);
      console.log(`Question: ${row.question_text.substring(0, 100)}...`);
      console.log(`Visual Type: ${row.visual_content_type}`);
      console.log(`Page: ${row.page_number}`);
      console.log(`Created: ${row.created_at}`);
      
      if (row.visual_content_ref) {
        try {
          const parsed = JSON.parse(row.visual_content_ref);
          console.log('\nvisualContentRef contents:');
          console.log(JSON.stringify(parsed, null, 2));
          
          if (parsed.diagrams && parsed.diagrams.length > 0) {
            console.log(`✅ Has ${parsed.diagrams.length} extracted diagrams`);
          } else if (parsed.diagramRegion) {
            console.log(`⏳ Has diagram region metadata (needs rendering)`);
            console.log(`   Region: x=${parsed.diagramRegion.x}, y=${parsed.diagramRegion.y}, w=${parsed.diagramRegion.width}, h=${parsed.diagramRegion.height}`);
            console.log(`   Confidence: ${parsed.diagramRegion.confidence}`);
          } else {
            console.log(`❌ No diagrams or diagram metadata found`);
          }
        } catch (e) {
          console.log(`❌ Failed to parse visualContentRef: ${e.message}`);
          console.log(`Raw value: ${row.visual_content_ref.substring(0, 200)}`);
        }
      } else {
        console.log('❌ visualContentRef is NULL');
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

checkVisualContent();
