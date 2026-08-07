# Profile Module

User profile management with statistics and password change functionality.

## Features

- ✅ View profile with statistics
- ✅ Update profile information
- ✅ Change password with validation
- ✅ Calculate contribution points
- ✅ Track uploaded resources and exams

## API Endpoints

### 1. Get Profile

```http
GET /profile
Authorization: Bearer <JWT>
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "teacher",
    "university": "University of Tunis",
    "region": "Tunis",
    "specialty": "Mathematics",
    "verified": true,
    "verificationStatus": "verified",
    "bio": "Math teacher with 10 years experience",
    "avatarUrl": null,
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "stats": {
    "resourcesUploaded": 25,
    "examsCreated": 10,
    "contributionPoints": 450
  }
}
```

### 2. Update Profile

```http
PATCH /profile
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "fullName": "John Smith",
  "university": "University of Tunis",
  "region": "Tunis",
  "specialty": "Mathematics",
  "bio": "Updated bio..."
}
```

**Response:**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Smith",
    ...
  }
}
```

### 3. Change Password

```http
POST /profile/change-password
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword456",
  "confirmPassword": "NewPassword456"
}
```

**Response:**
- **204 No Content** on success
- Client should logout user after successful password change

**Validation Rules:**
- Current password must be correct
- New password must be at least 8 characters
- New password must contain uppercase, lowercase, and number
- New password must match confirmation
- New password must be different from current

## Statistics Calculation

### Contribution Points Formula

```typescript
contributionPoints = 
  (resourcesUploaded × 10) + 
  (examsCreated × 20) + 
  (totalQuestions × 5)
```

**Example:**
- 25 resources uploaded: 250 points
- 10 exams created: 200 points
- 0 questions: 0 points
- **Total: 450 points**

## Usage Example

```typescript
// In another service/controller
import { ProfileService } from '../profile/profile.service';

@Injectable()
export class SomeService {
  constructor(private profileService: ProfileService) {}

  async checkUserStats(userId: string) {
    const profile = await this.profileService.getProfile(userId);
    console.log(`User ${profile.user.fullName} has ${profile.stats.contributionPoints} points`);
  }
}
```

## Security

- All endpoints require JWT authentication
- Password hashing uses bcrypt with salt rounds = 10
- Current password verified before allowing change
- Sensitive user data (password) excluded from default queries

## Error Handling

| Status | Error | Description |
|--------|-------|-------------|
| 404 | Not Found | User doesn't exist |
| 400 | Bad Request | Validation failed or passwords don't match |
| 401 | Unauthorized | Current password incorrect |

## Testing

```bash
# Run unit tests
npm test profile.service.spec.ts

# Run integration tests
npm test profile.controller.spec.ts
```

## Database Relations

```
users ─┬─► documents (1:N)
       └─► exam_questions (indirect via documents)
```

Profile stats are calculated by:
1. Counting documents where userId matches
2. Counting documents where userId matches AND resource_type = 'exam'
3. Joining documents with exam_questions to count total questions
