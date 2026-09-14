-- Migration 044: Fix timestamp columns to use TIMESTAMP WITH TIME ZONE
-- This ensures PostgreSQL stores and returns timestamps in UTC properly

ALTER TABLE user_notifications 
  ALTER COLUMN "createdAt" TYPE TIMESTAMP WITH TIME ZONE USING "createdAt" AT TIME ZONE 'Europe/London';

ALTER TABLE user_notifications 
  ALTER COLUMN "readAt" TYPE TIMESTAMP WITH TIME ZONE USING "readAt" AT TIME ZONE 'Europe/London';
