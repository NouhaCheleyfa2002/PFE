# Education System Module

This module provides API endpoints for managing the Tunisian education system (Primary, Basic, Secondary, and Baccalaureate levels) with dynamic subject and document type mappings.

## Features

- ✅ 14 Tunisian education levels (Primary 1-6, Basic 7-9, Secondary 1-3, Bac)
- ✅ Dynamic subjects per education level and stream
- ✅ Dynamic document types per education level
- ✅ Validation of level-subject-type combinations
- ✅ Caching for performance optimization
- ✅ RESTful API with JWT authentication

## API Endpoints

### 1. Get Education Levels

```http
GET /education/levels?stage=primary
```

**Query Parameters:**
- `stage` (optional): Filter by stage (`primary`, `basic`, `secondary`, `baccalaureate`)

**Response:**
```json
{
  "levels": [
    {
      "id": 1,
      "code": "primary_1",
      "displayName": "1st Primary Year",
      "stage": "primary",
      "orderIndex": 1
    },
    {
      "id": 2,
      "code": "primary_2",
      "displayName": "2nd Primary Year",
      "stage": "primary",
      "orderIndex": 2
    }
  ]
}
```

### 2. Get Subjects by Level

```http
GET /education/subjects?levelCode=primary_1&stream=sciences
```

**Query Parameters:**
- `levelCode` (required): Education level code (e.g., `primary_1`, `secondary_3`, `bac`)
- `stream` (optional): For secondary/bac, filter by stream (`sciences`, `economics`, `letters`, `technical`, `computer_science`)

**Response:**
```json
{
  "subjects": [
    {
      "id": 1,
      "code": "math",
      "name": "Mathematics",
      "stream": null
    },
    {
      "id": 2,
      "code": "arabic",
      "name": "Arabic",
      "stream": null
    }
  ]
}
```

### 3. Get Document Types by Level

```http
GET /education/types?levelCode=secondary_3
```

**Query Parameters:**
- `levelCode` (required): Education level code

**Response:**
```json
{
  "types": [
    {
      "id": 1,
      "code": "course_notes",
      "name": "Course Notes"
    },
    {
      "id": 2,
      "code": "qcm",
      "name": "QCM"
    },
    {
      "id": 3,
      "code": "exam",
      "name": "Exam"
    }
  ]
}
```

### 4. Validate Combination

```http
GET /education/validate?level=primary_1&subject=math&type=course_notes
```

**Query Parameters:**
- `level` (required): Education level code
- `subject` (required): Subject code
- `type` (optional): Document type code
- `stream` (optional): Stream for secondary levels

**Response (Valid):**
```json
{
  "valid": true
}
```

**Response (Invalid):**
```json
{
  "valid": false,
  "reason": "Subject 'quantum_physics' is not available for 1st Primary Year"
}
```

## Database Schema

### education_levels
```sql
id              SERIAL PRIMARY KEY
code            VARCHAR(50) UNIQUE
display_name    VARCHAR(100)
stage           ENUM('primary', 'basic', 'secondary', 'baccalaureate')
order_index     INT UNIQUE
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### subject_mappings
```sql
id                  SERIAL PRIMARY KEY
education_level_id  INT REFERENCES education_levels(id)
subject_code        VARCHAR(50)
subject_name        VARCHAR(100)
stream              VARCHAR(50) NULLABLE
is_active           BOOLEAN DEFAULT TRUE
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### type_mappings
```sql
id                  SERIAL PRIMARY KEY
education_level_id  INT REFERENCES education_levels(id)
type_code           VARCHAR(50)
type_name           VARCHAR(100)
is_active           BOOLEAN DEFAULT TRUE
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

## Caching Strategy

The module uses cache-manager to cache frequently accessed data:

- **Education Levels**: Cached for 24 hours (rarely changes)
- **Subjects by Level**: Cached for 12 hours
- **Types by Level**: Cached for 12 hours

Cache keys format:
- `education:levels:all` or `education:levels:{stage}`
- `education:subjects:{levelCode}:{stream}`
- `education:types:{levelCode}`

## Usage in Other Modules

```typescript
import { EducationSystemService } from '../education-system/education-system.service';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly educationService: EducationSystemService,
  ) {}

  async validateDocument(dto: CreateDocumentDto) {
    // Validate level-subject combination
    const validation = await this.educationService.validateCombination(
      dto.classLevel,
      dto.subject,
      dto.type,
    );

    if (!validation.valid) {
      throw new BadRequestException(validation.reason);
    }

    // Proceed with document creation...
  }
}
```

## Running Migrations

To set up the education system tables and seed data:

```bash
cd backend
run-education-system-migration.bat
```

This will:
1. Create `education_levels`, `subject_mappings`, and `type_mappings` tables
2. Seed 14 Tunisian education levels
3. Seed subjects for each level
4. Seed document types for each level
5. Create necessary indexes

## Testing

Run unit tests:
```bash
npm test education-system.service.spec.ts
```

## Education System Structure

### Primary Education (6 levels)
- 1st-6th Primary Year
- Subjects: Arabic, French, English, Mathematics, Sciences, History & Geography, Islamic Education, Civic Education, Arts & Crafts, Physical Education

### Basic Education (3 levels)
- 7th-9th Basic Education
- Includes all primary subjects plus: Physics & Chemistry, Life & Earth Sciences, Technology, Computer Science
- 9th grade adds: Economics & Management

### Secondary Education (3 levels)
- 1st-3rd Secondary
- Stream-based subjects:
  - **Sciences**: Math, Physics, Chemistry, Biology, Earth Sciences
  - **Economics**: Economics, Management, Accounting, Statistics, Math
  - **Letters**: Philosophy, Arabic Literature, French Literature, History, Geography
  - **Technical**: Technical Drawing, Electrical/Mechanical/Civil Engineering
  - **Computer Science**: Programming, Algorithms, Databases, Networks, Math
- Common subjects: Arabic, French, English, Islamic Education, Physical Education

### Baccalaureate (1 level)
- Bac
- Same stream-based structure as Secondary

## Document Types by Level

**Primary/Basic:**
- Course Notes
- Exercises
- Worksheets
- Activities

**Secondary/Bac:**
- Course Notes
- QCM
- Exercises
- Exam
- Case Study
- Presentation

## Notes

- All API endpoints require JWT authentication
- Cache can be cleared using `educationService.clearCache()`
- Inactive subjects/types (is_active=false) are filtered out automatically
- Subject/type availability is strictly enforced through validation
