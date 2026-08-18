@echo off
chcp 65001 > nul
echo.
echo ============================================================
echo   Start Frontend - Vite Dev Server (port 5173)
echo ============================================================
echo.

cd /d "%~dp0.."
cd frontend

if not exist .env (
    echo [INFO] .env not found, copying from .env.example...
    copy .env.example .env
)

echo [INFO] Installing npm dependencies (skipped if already installed)...
call npm install

echo.
echo [INFO] Starting Vite dev server...
echo [INFO] Access app at: http://localhost:5173
echo.
call npm run dev
