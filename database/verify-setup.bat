@echo off
echo ========================================
echo Verifying Exam Results Setup...
echo ========================================
echo.

REM Update these variables with your database credentials
set PGHOST=localhost
set PGPORT=5432
set PGDATABASE=edulakhya
set PGUSER=postgres
set PGPASSWORD=your_password

REM Run the verification script
psql -h %PGHOST% -p %PGPORT% -U %PGUSER% -d %PGDATABASE% -f verify_exam_results_setup.sql

echo.
echo ========================================
echo Verification Complete!
echo ========================================
pause

























































