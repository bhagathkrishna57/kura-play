@echo off
title KURA Cyber-Arcade Server // Architect: Bhagath Krishna.M
echo ========================================================
echo   ⚡ STARTING KURA ARCADE SERVER (Node.js)
echo   Global Leaderboards ^& Pilot Authentication Engine
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Node.js not detected in system PATH.
    echo Please make sure Node.js is installed.
    pause
    exit /b
)

echo Starting server on http://localhost:3000...
start "" "http://localhost:3000"
node "%~dp0server.js"
pause
