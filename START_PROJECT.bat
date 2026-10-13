@echo off
title ApexCare - Hospital Management System (HMS)
color 0B
echo ==========================================================
echo    ApexCare - Hospital Management System (HMS)
echo    Full-Stack Node.js, Express, MySQL Platform
echo ==========================================================
echo.
echo 1. Checking Node.js environment...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH! Please install Node.js from https://nodejs.org/
    pause
    exit /b
)

echo 2. Launching Hospital Management System at http://localhost:5000 ...
start "" http://localhost:5000

echo 3. Starting backend server...
npm start
pause
