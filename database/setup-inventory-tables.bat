@echo off
echo ================================================
echo Setting up Inventory Management Database Tables
echo ================================================
echo.

REM Get database credentials from .env file in super-admin app
set ENV_FILE=..\apps\super-admin\.env.local

if exist %ENV_FILE% (
    echo Found environment file: %ENV_FILE%
    for /f "tokens=1,2 delims==" %%a in ('findstr /r "^DATABASE_URL=" %ENV_FILE%') do set DATABASE_URL=%%b
    echo Using database from .env.local
) else (
    echo .env.local file not found at %ENV_FILE%
    echo.
    echo Please enter your database connection string:
    echo Format: postgresql://username:password@localhost:5432/database_name
    set /p DATABASE_URL="DATABASE_URL: "
)

if "%DATABASE_URL%"=="" (
    echo ERROR: Database URL not provided
    pause
    exit /b 1
)

echo.
echo Running SQL script: create_inventory_tables.sql
echo.

psql "%DATABASE_URL%" -f create_inventory_tables.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================================
    echo SUCCESS! Inventory tables created successfully
    echo ================================================
    echo.
    echo Tables created:
    echo   - inventory_categories
    echo   - inventory_items  
    echo   - inventory_sales
    echo   - inventory_transactions
    echo.
    echo Default categories added:
    echo   - Uniforms
    echo   - Footwear
    echo   - Books
    echo   - Stationery
    echo   - Bags
    echo   - Sports
    echo.
    echo You can now:
    echo   1. Start the inventory-admin app: cd apps/inventory-admin ^&^& npm run dev
    echo   2. Upload the sample CSV with 50 items
    echo   3. Start managing your inventory!
    echo.
) else (
    echo.
    echo ================================================
    echo ERROR: Failed to create inventory tables
    echo ================================================
    echo.
    echo Troubleshooting:
    echo   1. Make sure PostgreSQL is running
    echo   2. Check database credentials in .env.local
    echo   3. Ensure you have permission to create tables
    echo   4. Run: psql "%DATABASE_URL%" to test connection
    echo.
)

pause

























































