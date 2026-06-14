@echo off
echo ========================================
echo Creating exam_results table...
echo ========================================
echo.

REM Update these variables with your database credentials
set PGHOST=localhost
set PGPORT=5432
set PGDATABASE=edulakhya
set PGUSER=postgres
set PGPASSWORD=your_password

REM Run the SQL file
psql -h %PGHOST% -p %PGPORT% -U %PGUSER% -d %PGDATABASE% -f create_exam_results_table.sql

echo.
echo ========================================
echo Done! Check above for any errors.
echo ========================================
pause

