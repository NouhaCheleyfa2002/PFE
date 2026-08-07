const { Client } = require('pg');
require('dotenv').config();

async function fixTable() {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT) || 5432,
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'edushare',
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Drop the table
    console.log('\n🗑️  Dropping exam_templates table...');
    await client.query('DROP TABLE IF EXISTS exam_templates CASCADE;');
    console.log('✅ Table dropped');

    // Recreate it with nullable user_id
    console.log('\n📦 Recreating exam_templates table with nullable user_id...');
    await client.query(`
      CREATE TABLE exam_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        institution_name VARCHAR(255),
        institution_address TEXT,
        contact_phone VARCHAR(50),
        contact_email VARCHAR(255),
        academic_year VARCHAR(50),
        logo_url TEXT,
        logo_position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "width": 0, "height": 0}',
        footer_text TEXT,
        watermark_text TEXT,
        watermark_opacity INTEGER DEFAULT 30,
        page_margins JSONB NOT NULL DEFAULT '{"top": 20, "bottom": 20, "left": 20, "right": 20}',
        page_orientation VARCHAR(20) DEFAULT 'portrait',
        font_family VARCHAR(100) DEFAULT 'Times New Roman',
        primary_color VARCHAR(7),
        secondary_color VARCHAR(7),
        placeholders JSONB DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_default BOOLEAN DEFAULT FALSE,
        header_document_url TEXT,
        CONSTRAINT unique_user_template_name UNIQUE(user_id, name)
      );
    `);
    console.log('✅ Table created');

    // Create indexes
    console.log('\n📇 Creating indexes...');
    await client.query('CREATE INDEX idx_templates_user_id ON exam_templates(user_id);');
    await client.query('CREATE INDEX idx_templates_created_at ON exam_templates(created_at DESC);');
    await client.query('CREATE INDEX idx_templates_is_default ON exam_templates(is_default) WHERE is_default = TRUE;');
    await client.query('CREATE INDEX idx_templates_user_updated ON exam_templates(user_id, updated_at DESC);');
    console.log('✅ Indexes created');

    // Insert default template
    console.log('\n📝 Inserting default template...');
    await client.query(`
      INSERT INTO exam_templates (
        id, name, user_id, institution_name, logo_position, page_margins,
        page_orientation, font_family, primary_color, secondary_color,
        placeholders, is_default
      ) VALUES (
        '00000000-0000-0000-0000-000000000001',
        'Default Exam Template',
        NULL,
        'Educational Institution',
        '{"x": 10, "y": 10, "width": 30, "height": 20}',
        '{"top": 20, "bottom": 20, "left": 15, "right": 15}',
        'portrait',
        'Arial',
        '#0d1b3e',
        '#63b3ed',
        '[]',
        true
      );
    `);
    console.log('✅ Default template inserted');

    // Verify
    const result = await client.query('SELECT id, name, is_default FROM exam_templates WHERE is_default = true;');
    console.log('\n✅ Setup complete! Default template:');
    console.log('   ID:', result.rows[0].id);
    console.log('   Name:', result.rows[0].name);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixTable();
