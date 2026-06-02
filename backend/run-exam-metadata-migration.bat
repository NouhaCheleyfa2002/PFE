@echo off
echo ========================================
echo Exam Metadata Migration Script
echo ========================================
echo.
echo This script will add exam metadata fields to the documents table:
echo - title (VARCHAR 500)
echo - level (VARCHAR 100)
echo - subject (VARCHAR 100)
echo - year (INTEGER)
echo.
echo Press Ctrl+C to cancel or
pause

echo.
echo Running migration...
echo.

docker exec -i edushare-postgres psql -U edushare_user -d edushare < add-exam-metadata.sql

echo.
echo ========================================
echo Migration Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Restart your backend: npm run start:dev
echo 2. Upload a new exam PDF
echo 3. The system will automatically extract metadata
echo 4. Test the new API endpoints:
echo    - GET /exams
echo    - GET /exams?level=bac-info
echo    - GET /exams/:id
echo.
pause
