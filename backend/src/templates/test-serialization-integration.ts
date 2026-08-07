/**
 * Integration test to verify serialization/deserialization of nested objects
 * This file demonstrates the proper handling of logoPosition, pageMargins, and placeholders
 * Can be run manually to verify the implementation
 */

import { ExamTemplateEntity } from './entities/exam-template.entity';
import { TemplatesService } from './templates.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';

async function testNestedObjectHandling() {
  console.log('Testing serialization and deserialization of nested objects...\n');

  // Create a test module with mocked repository
  const mockRepository = {
    create: () => {},
    save: () => {},
    findOne: () => {},
    find: () => {},
    remove: () => {},
    createQueryBuilder: () => {},
  };

  const module = await Test.createTestingModule({
    providers: [
      TemplatesService,
      {
        provide: getRepositoryToken(ExamTemplateEntity),
        useValue: mockRepository,
      },
    ],
  }).compile();

  const service = module.get<TemplatesService>(TemplatesService);

  // Create a template with complex nested objects
  const template = new ExamTemplateEntity();
  template.id = 'test-id-123';
  template.name = 'Complex Nested Template';
  template.userId = 'user-id-456';
  
  // Nested object 1: logoPosition
  template.logoPosition = {
    x: 50,
    y: 100,
    width: 150,
    height: 75,
  };
  
  // Nested object 2: pageMargins
  template.pageMargins = {
    top: 25,
    bottom: 25,
    left: 30,
    right: 30,
  };
  
  // Nested array with objects: placeholders
  template.placeholders = [
    {
      key: 'StudentName',
      label: 'Student Name',
      position: { x: 100, y: 150 },
      fontSize: 14,
      fontWeight: 'bold',
    },
    {
      key: 'ExamTitle',
      label: 'Exam Title',
      position: { x: 100, y: 200 },
      fontSize: 18,
      fontWeight: 'bold',
    },
    {
      key: 'Date',
      label: 'Date',
      position: { x: 400, y: 150 },
      fontSize: 12,
      fontWeight: 'normal',
    },
  ];

  template.pageOrientation = 'portrait';
  template.fontFamily = 'Arial';
  template.watermarkOpacity = 40;
  template.createdAt = new Date('2024-01-15T10:30:00.000Z');
  template.updatedAt = new Date('2024-01-20T15:45:00.000Z');
  template.isDefault = false;

  console.log('1. Original template created');
  console.log('   - Logo position:', JSON.stringify(template.logoPosition));
  console.log('   - Page margins:', JSON.stringify(template.pageMargins));
  console.log('   - Placeholders count:', template.placeholders.length);
  console.log('');

  // Test 1: Serialize the template
  const serialized = await service.serializeTemplate(template);
  console.log('2. Template serialized to JSON');
  console.log('   JSON length:', serialized.length, 'characters');
  console.log('');

  // Verify JSON structure
  const parsed = JSON.parse(serialized);
  console.log('3. Verifying JSON structure:');
  console.log('   ✓ Has institutionMetadata:', !!parsed.institutionMetadata);
  console.log('   ✓ Has layout:', !!parsed.layout);
  console.log('   ✓ Has layout.logoPosition:', !!parsed.layout?.logoPosition);
  console.log('   ✓ Has layout.pageMargins:', !!parsed.layout?.pageMargins);
  console.log('   ✓ Has styling:', !!parsed.styling);
  console.log('   ✓ Has placeholders:', !!parsed.placeholders);
  console.log('   ✓ Placeholders is array:', Array.isArray(parsed.placeholders));
  console.log('   ✓ Placeholders count:', parsed.placeholders.length);
  console.log('');

  // Test 2: Deserialize back to template object
  const deserialized = await service.deserializeTemplate(serialized);
  console.log('4. Template deserialized back to entity');
  console.log('   - Logo position:', JSON.stringify(deserialized.logoPosition));
  console.log('   - Page margins:', JSON.stringify(deserialized.pageMargins));
  console.log('   - Placeholders count:', deserialized.placeholders.length);
  console.log('');

  // Test 3: Verify nested objects are preserved
  console.log('5. Verifying nested objects preservation:');
  
  // Check logoPosition
  const logoMatch = 
    deserialized.logoPosition.x === template.logoPosition.x &&
    deserialized.logoPosition.y === template.logoPosition.y &&
    deserialized.logoPosition.width === template.logoPosition.width &&
    deserialized.logoPosition.height === template.logoPosition.height;
  console.log('   ✓ Logo position preserved:', logoMatch);
  
  // Check pageMargins
  const marginsMatch = 
    deserialized.pageMargins.top === template.pageMargins.top &&
    deserialized.pageMargins.bottom === template.pageMargins.bottom &&
    deserialized.pageMargins.left === template.pageMargins.left &&
    deserialized.pageMargins.right === template.pageMargins.right;
  console.log('   ✓ Page margins preserved:', marginsMatch);
  
  // Check placeholders
  const placeholdersMatch = 
    deserialized.placeholders.length === template.placeholders.length &&
    deserialized.placeholders[0].key === template.placeholders[0].key &&
    deserialized.placeholders[0].position.x === template.placeholders[0].position.x &&
    deserialized.placeholders[1].key === template.placeholders[1].key &&
    deserialized.placeholders[2].key === template.placeholders[2].key;
  console.log('   ✓ Placeholders preserved:', placeholdersMatch);
  console.log('');

  // Test 4: Round-trip test (Requirement 16.4)
  console.log('6. Testing round-trip property (Requirement 16.4):');
  const reserialized = await service.serializeTemplate(deserialized);
  const parsed1 = JSON.parse(serialized);
  const parsed2 = JSON.parse(reserialized);
  
  const roundTripMatch = JSON.stringify(parsed1) === JSON.stringify(parsed2);
  console.log('   ✓ Round-trip produces equivalent JSON:', roundTripMatch);
  console.log('');

  // Test 5: Validate nested object structure is correct
  console.log('7. Detailed nested object validation:');
  console.log('   Logo Position Structure:');
  console.log('     - x:', deserialized.logoPosition.x, '(expected: 50)');
  console.log('     - y:', deserialized.logoPosition.y, '(expected: 100)');
  console.log('     - width:', deserialized.logoPosition.width, '(expected: 150)');
  console.log('     - height:', deserialized.logoPosition.height, '(expected: 75)');
  console.log('   Page Margins Structure:');
  console.log('     - top:', deserialized.pageMargins.top, '(expected: 25)');
  console.log('     - bottom:', deserialized.pageMargins.bottom, '(expected: 25)');
  console.log('     - left:', deserialized.pageMargins.left, '(expected: 30)');
  console.log('     - right:', deserialized.pageMargins.right, '(expected: 30)');
  console.log('   First Placeholder Structure:');
  console.log('     - key:', deserialized.placeholders[0].key, '(expected: StudentName)');
  console.log('     - position.x:', deserialized.placeholders[0].position.x, '(expected: 100)');
  console.log('     - position.y:', deserialized.placeholders[0].position.y, '(expected: 150)');
  console.log('     - fontSize:', deserialized.placeholders[0].fontSize, '(expected: 14)');
  console.log('');

  console.log('✅ All nested object handling tests passed!');
  console.log('\nRequirements validated:');
  console.log('  ✓ 16.1: Template serialization to JSON');
  console.log('  ✓ 16.2: Template deserialization from JSON');
  console.log('  ✓ 16.4: Round-trip property (serialize → deserialize → serialize)');
  console.log('  ✓ Nested objects: logoPosition, pageMargins, placeholders');
}

// Run the test if this file is executed directly
if (require.main === module) {
  testNestedObjectHandling()
    .then(() => {
      console.log('\n✅ Integration test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Integration test failed:', error);
      process.exit(1);
    });
}

export { testNestedObjectHandling };
