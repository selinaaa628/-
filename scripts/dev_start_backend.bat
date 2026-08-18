@echo off
chcp 65001 > nul
echo.
echo ============================================================
echo   Start Backend - FastAPI Dev Server (port 8000)
echo ============================================================
echo.

cd /d "%~dp0.."
cd backend

if not exist .env (
    echo [INFO] .env not found, copying from .env.example...
    copy .env.example .env
)

echo [INFO] Starting FastAPI with hot-reload...
echo [INFO] Access API docs at: http://localhost:8000/docs
echo.
uvicorn main:app --reload --host 0.0.0.0 --port 8000
