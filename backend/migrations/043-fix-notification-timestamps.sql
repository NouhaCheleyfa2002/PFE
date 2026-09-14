-- Migration 043: Fix notification timestamps (add 1 hour to correct UTC offset)
-- The timestamps were stored in local time (UTC+1) but interpreted as UTC
-- This migration corrects them by adding 1 hour

UPDATE user_notifications
SET "createdAt" = "createdAt" + INTERVAL '1 hour'
WHERE "createdAt" < NOW();

-- Also fix readAt timestamps if they exist
UPDATE user_notifications
SET "readAt" = "readAt" + INTERVAL '1 hour'
WHERE "readAt" IS NOT NULL AND "readAt" < NOW();
