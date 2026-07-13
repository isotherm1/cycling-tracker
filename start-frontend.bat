@echo off
echo === Cycling Tracker - Frontend ===
cd /d "%~dp0frontend"

if not exist node_modules\vite (
    echo Removing old node_modules...
    if exist node_modules rmdir /s /q node_modules
    echo Installing dependencies...
    call npm.cmd install
    if errorlevel 1 (
        echo ERROR: npm install failed
        pause
        exit /b 1
    )
    call npm.cmd approve-scripts esbuild
)

echo Starting frontend on port 5173...
echo Open browser: http://localhost:5173
echo Keep this window open.
echo.
call npm.cmd run dev
pause
