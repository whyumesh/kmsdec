@echo off
echo Starting voter upload...
echo This will process 3,373 voters and may take several minutes.
echo Please do not close this window.
echo.
npx tsx scripts/upload-mastersheet-voters.ts "Final Date for Input 2.0.csv"
echo.
echo Upload completed!
pause

