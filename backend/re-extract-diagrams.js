const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'openbac',
  user: 'postgres',
  password: 'root',
});

async function reExtractDiagrams() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Get all questions with visual content that don't have diagrams yet
    const result = await client.query(`
      SELECT id, "questionText", "pageNumber", "documentId", "visualContentRef"
      FROM exam_questions
      WHERE "hasVisualContent" = true
      AND "deletedAt" IS NULL
      ORDER BY "documentId", "pageNumber", id
    `);

    console.log(`Found ${result.rows.length} questions with visual content`);

    // Group by document
    const byDocument = {};
    for (const row of result.rows) {
      if (!byDocument[row.documentId]) {
        byDocument[row.documentId] = [];
      }
      byDocument[row.documentId].push(row);
    }

    console.log(`Questions span ${Object.keys(byDocument).length} documents`);

    // For each document, update visual content ref to trigger re-extraction
    for (const [documentId, questions] of Object.entries(byDocument)) {
      console.log(`\nDocument ${documentId}: ${questions.length} questions`);
      
      for (const question of questions) {
        // Parse existing visual content
        let visualContent = {};
        if (question.visualContentRef) {
          try {
            visualContent = JSON.parse(question.visualContentRef);
          } catch {
            visualContent = { context: question.visualContentRef };
          }
        }

        // Remove old diagrams to trigger re-extraction
        delete visualContent.diagrams;
        delete visualContent.diagramCount;
        delete visualContent.diagramsExtractedAt;
        visualContent.needsReExtraction = true;

        await client.query(
          `UPDATE exam_questions SET "visualContentRef" = $1 WHERE id = $2`,
          [JSON.stringify(visualContent), question.id]
        );

        console.log(`  - Marked question ${question.id} for re-extraction: "${question.questionText.substring(0, 60)}..."`);
      }
    }

    console.log('\n✅ All questions marked for re-extraction');
    console.log('Now trigger the extraction by calling the backend endpoint or restarting the worker');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

reExtractDiagrams();
