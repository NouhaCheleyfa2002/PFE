require('dotenv').config();
const { Client } = require('pg');

async function verifyAllFixes() {
  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });

  try {
    await client.connect();
    console.log('🔍 Verifying All Fixes...\n');
    console.log('=' .repeat(60));

    // Check 1: Rating columns exist
    console.log('\n✓ Check 1: Rating Columns');
    const ratingCols = await client.query(`
      SELECT column_name 
      FROM information_schema.columns
      WHERE table_name = 'documents'
      AND column_name IN ('average_rating', 'total_ratings');
    `);
    console.log(`  Found ${ratingCols.rows.length}/2 rating columns`);
    if (ratingCols.rows.length === 2) {
      console.log('  ✅ PASS: Both rating columns exist');
    } else {
      console.log('  ❌ FAIL: Rating columns missing');
    }

    // Check 2: Documents have metadata
    console.log('\n✓ Check 2: Document Metadata');
    const nullMetadata = await client.query(`
      SELECT COUNT(*) as count
      FROM documents
      WHERE status = 'completed'
      AND (subject IS NULL OR class_level IS NULL OR resource_type IS NULL);
    `);
    const nullCount = parseInt(nullMetadata.rows[0].count);
    if (nullCount === 0) {
      console.log('  ✅ PASS: All documents have complete metadata');
    } else {
      console.log(`  ❌ FAIL: ${nullCount} documents have NULL metadata`);
    }

    // Check 3: Rating data exists
    console.log('\n✓ Check 3: Rating Data');
    const ratingData = await client.query(`
      SELECT COUNT(*) as count
      FROM documents
      WHERE status = 'completed'
      AND average_rating > 0;
    `);
    const ratedCount = parseInt(ratingData.rows[0].count);
    console.log(`  Found ${ratedCount} document(s) with ratings`);
    if (ratedCount > 0) {
      console.log('  ✅ PASS: At least one document has rating data');
    } else {
      console.log('  ⚠️  WARN: No documents have ratings yet');
    }

    // Check 4: Resource types are varied
    console.log('\n✓ Check 4: Resource Type Variety');
    const resourceTypes = await client.query(`
      SELECT resource_type, COUNT(*) as count
      FROM documents
      WHERE status = 'completed'
      GROUP BY resource_type;
    `);
    console.log('  Resource type distribution:');
    resourceTypes.rows.forEach(row => {
      console.log(`    - ${row.resource_type}: ${row.count}`);
    });
    const hasExams = resourceTypes.rows.some(r => r.resource_type === 'Exam');
    const hasCourses = resourceTypes.rows.some(r => r.resource_type === 'Course Material');
    if (hasExams && hasCourses) {
      console.log('  ✅ PASS: Both Exams and Course Materials exist');
    } else if (!hasExams) {
      console.log('  ⚠️  WARN: No Exam type documents (tabs won\'t demonstrate filtering)');
    }

    // Check 5: View/Download tracking
    console.log('\n✓ Check 5: View/Download Tracking');
    const statsData = await client.query(`
      SELECT 
        SUM(views) as total_views,
        SUM(downloads) as total_downloads
      FROM documents
      WHERE status = 'completed';
    `);
    const totalViews = parseInt(statsData.rows[0].total_views) || 0;
    const totalDownloads = parseInt(statsData.rows[0].total_downloads) || 0;
    console.log(`  Total views: ${totalViews}`);
    console.log(`  Total downloads: ${totalDownloads}`);
    if (totalViews > 0 || totalDownloads > 0) {
      console.log('  ✅ PASS: Tracking data exists');
    } else {
      console.log('  ℹ️  INFO: No views/downloads yet (new data)');
    }

    // Summary table
    console.log('\n' + '='.repeat(60));
    console.log('📊 DOCUMENT SUMMARY');
    console.log('='.repeat(60));
    
    const summary = await client.query(`
      SELECT 
        id,
        LEFT(title, 30) as title,
        resource_type,
        subject,
        class_level,
        average_rating,
        total_ratings,
        views,
        downloads
      FROM documents
      WHERE status = 'completed'
      ORDER BY "createdAt" DESC;
    `);

    console.table(summary.rows);

    console.log('\n' + '='.repeat(60));
    console.log('🎯 EXPECTED BEHAVIOR');
    console.log('='.repeat(60));
    console.log('\nLibrary Page:');
    console.log('  • "Courses & Materials" tab: Should show Course Material documents');
    console.log('  • "Exams & Assessments" tab: Should show Exam documents');
    console.log('  • Ratings: Should display stars and numeric value');
    console.log('  • Metadata: Should show Subject • Class Level (no "Unknown")');
    console.log('\nUpload Page:');
    console.log('  • Form data should persist to database');
    console.log('  • New documents should appear with correct metadata');
    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
    console.log('\n✅ Verification complete!\n');
  }
}

verifyAllFixes();
