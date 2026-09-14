-- Migration 042: Fix Missing Full Names in Verification Requests
-- Updates verification requests that have null or empty fullName with the user's fullName or email

-- Update verification requests with missing fullName
-- Use user's fullName if available, otherwise use email username
UPDATE verification_requests vr
SET "fullName" = COALESCE(
  NULLIF(u."fullName", ''),
  SPLIT_PART(u.email, '@', 1)
)
FROM users u
WHERE vr."userId" = u.id
  AND (vr."fullName" IS NULL OR vr."fullName" = '' OR vr."fullName" = 'Unknown' OR vr."fullName" = 'Unknown User' OR vr."fullName" = 'undefined');

-- Show affected rows
SELECT 
  vr.id,
  vr."fullName" as verification_name,
  u."fullName" as user_full_name,
  u.email
FROM verification_requests vr
LEFT JOIN users u ON vr."userId" = u.id
ORDER BY vr."submittedAt" DESC
LIMIT 20;
