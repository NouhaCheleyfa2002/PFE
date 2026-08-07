# User Notifications Module

This module provides a complete user-facing notification system for the application.

## Features

- ✅ Create notifications for users
- ✅ Fetch user notifications (paginated)
- ✅ Mark notifications as read (individual or all)
- ✅ Get unread notification count
- ✅ Filter by unread status
- ✅ Automatic cleanup of old read notifications

## Database Schema

The `user_notifications` table includes:

- `id` - UUID primary key
- `userId` - User ID (indexed)
- `type` - Notification type (upload, rating, verification, comment, system, exam, question)
- `title` - Short title
- `message` - Full message text
- `read` - Boolean flag (indexed)
- `metadata` - JSONB for additional data
- `createdAt` - Timestamp (indexed)
- `readAt` - When marked as read

## API Endpoints

All endpoints require JWT authentication.

### GET /user-notifications
Get all notifications for the authenticated user (max 50, most recent first)

### GET /user-notifications/unread
Get only unread notifications for the authenticated user

### GET /user-notifications/unread/count
Get count of unread notifications
```json
{ "count": 5 }
```

### PATCH /user-notifications/:id/read
Mark a specific notification as read

### PATCH /user-notifications/mark-all-read
Mark all notifications as read for the authenticated user

### POST /user-notifications (Internal/Admin use)
Create a new notification
```json
{
  "userId": "uuid",
  "type": "verification",
  "title": "Profile Verified",
  "message": "Your profile has been verified successfully",
  "metadata": { "adminId": "uuid" }
}
```

## Frontend Integration

The Navbar component automatically:
- Fetches notifications on mount
- Polls for new notifications every 30 seconds
- Displays unread count badge
- Shows notification dropdown
- Marks notifications as read when clicked
- Provides "Mark all as read" functionality

## Creating Notifications

Other modules can inject `UserNotificationsService` and create notifications:

```typescript
import { UserNotificationsService } from './user-notifications/user-notifications.service';

// In your service constructor
constructor(
  private readonly notificationsService: UserNotificationsService,
) {}

// Create a notification
await this.notificationsService.create({
  userId: user.id,
  type: 'exam',
  title: 'Exam Submitted',
  message: 'Your exam has been submitted successfully',
  metadata: { examId: exam.id },
});
```

## Notification Types

- `upload` - New content uploaded
- `rating` - Content received a rating
- `verification` - Profile verification updates
- `comment` - New comments on content
- `system` - System announcements
- `exam` - Exam-related notifications
- `question` - Question bank updates

## Migration

Run the migration to create the database table:

```bash
# Windows
run-user-notifications-migration.bat

# Manual
psql -h localhost -U edushare_user -d edushare -f migrations/006-add-user-notifications.sql
```

## Cleanup

Old read notifications are automatically cleaned up. You can call the cleanup method manually:

```typescript
await this.notificationsService.deleteOldNotifications(30); // Delete read notifications older than 30 days
```

## Future Enhancements

- [ ] WebSocket support for real-time notifications
- [ ] Email notifications for important events
- [ ] Push notifications for mobile app
- [ ] Notification preferences/settings
- [ ] Batch notification creation
- [ ] Notification templates
