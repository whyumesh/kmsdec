@echo off
echo Cleaning up...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo Installing dependencies...
call npm install

echo Verifying Next.js installation...
if exist node_modules\.bin\next.cmd (
    echo Next.js installed successfully!
    echo.
    echo You can now run: npm run dev
) else (
    echo Next.js installation failed. Trying alternative method...
    call npm install next react react-dom --save
)

pause


