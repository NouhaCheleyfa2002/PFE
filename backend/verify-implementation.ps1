Write-Host "=== QUESTION BANK IMPLEMENTATION VERIFICATION ===" -ForegroundColor Cyan
Write-Host ""

# Check migration file
Write-Host "[1/4] Checking migration file..." -ForegroundColor Yellow
if (Test-Path "migrations\029-add-soft-delete-to-exam-questions.sql") {
    Write-Host "  [OK] Migration file exists" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Migration file NOT found" -ForegroundColor Red
}

# Check backend build
Write-Host ""
Write-Host "[2/4] Building backend..." -ForegroundColor Yellow
$buildResult = npm run build 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Backend builds successfully" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Backend build failed" -ForegroundColor Red
}

# Check database column
Write-Host ""
Write-Host "[3/4] Verifying database column..." -ForegroundColor Yellow
$dbResult = node check-deleted-at-column.js 2>&1
$dbOutput = $dbResult | Out-String
if ($dbOutput -match "deleted_at") {
    Write-Host "  [OK] deleted_at column exists" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Database column check failed" -ForegroundColor Red
}

# Check key files
Write-Host ""
Write-Host "[4/4] Checking modified files..." -ForegroundColor Yellow

$file1 = "src\exam-pipeline\exam-pipeline.controller.ts"
if (Test-Path $file1) {
    Write-Host "  [OK] $file1" -ForegroundColor Green
}

$file2 = "src\exam-pipeline\exam-pipeline.service.ts"
if (Test-Path $file2) {
    Write-Host "  [OK] $file2" -ForegroundColor Green
}

$file3 = "src\exam-pipeline\entities\exam-question.entity.ts"
if (Test-Path $file3) {
    Write-Host "  [OK] $file3" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== VERIFICATION COMPLETE ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Start backend: npm run start:dev" -ForegroundColor White
Write-Host "2. Start frontend in another terminal" -ForegroundColor White
Write-Host "3. Navigate to question bank page" -ForegroundColor White
Write-Host "4. Test edit and delete features" -ForegroundColor White
Write-Host ""
