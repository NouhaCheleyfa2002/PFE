@echo off
echo ========================================
echo Fixing Frontend Dependencies
echo ========================================
echo.

echo Step 1: Cleaning cache...
if exist .next rmdir /s /q .next
echo ✓ Cache cleaned

echo.
echo Step 2: Cleaning node_modules...
if exist node_modules rmdir /s /q node_modules
echo ✓ node_modules removed

echo.
echo Step 3: Removing package-lock.json...
if exist package-lock.json del package-lock.json
echo ✓ package-lock.json removed

echo.
echo Step 4: Installing dependencies...
echo This may take a few minutes...
call npm install
if %errorlevel% neq 0 (
    echo ✗ Installation failed!
    pause
    exit /b 1
)
echo ✓ Dependencies installed

echo.
echo Step 5: Verifying tailwindcss installation...
if exist node_modules\tailwindcss (
    echo ✓ Tailwind CSS is installed
) else (
    echo ✗ Tailwind CSS not found, installing manually...
    call npm install -D tailwindcss autoprefixer postcss
)

echo.
echo ========================================
echo Starting development server...
echo ========================================
echo.
call npm run dev
