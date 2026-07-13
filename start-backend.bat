@echo off
echo === Cycling Tracker - Backend ===
cd /d "%~dp0backend"

if not exist node_modules\express (
    echo Removing old node_modules...
    if exist node_modules rmdir /s /q node_modules
    echo Installing dependencies (no native compilation needed)...
    call npm.cmd install
    if errorlevel 1 (
        echo ERROR: npm install failed. See error above.
        pause
        exit /b 1
    )
    echo Install complete.
)

echo Starting backend on port 3001...
echo Keep this window open.
echo.
call npm.cmd start
pause
