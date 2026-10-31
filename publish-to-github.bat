@echo off
title Push KURA Arcade to GitHub
echo ===================================================
echo   KURA ARCADE // GITHUB SYNC UTILITY
echo   Architect: Bhagath Krishna.M
echo   Repo: https://github.com/bhagathkrishna57/kura-play.git
echo ===================================================
echo.

where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Git is not currently installed or not found in your system PATH.
    echo Please install Git from https://git-scm.com/download/win or use GitHub Desktop.
    echo.
    echo Once installed, run this batch file again to automatically push to:
    echo https://github.com/bhagathkrishna57/kura-play.git
    echo.
    pause
    exit /b
)

echo Initializing / verifying git repository...
if not exist ".git" (
    git init
    git branch -M main
    git remote add origin https://github.com/bhagathkrishna57/kura-play.git
)

echo Staging all files...
git add .

echo Creating commit...
git commit -m "Update KURA Arcade: Cinematic website intro, creator tribute, and zero-boredom games"

echo Pushing to main branch...
git push -u origin main

echo.
echo ===================================================
echo   SYNC COMPLETE! Your arcade is live on GitHub!
echo ===================================================
pause
