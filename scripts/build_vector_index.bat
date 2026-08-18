@echo off
chcp 65001 > nul
echo.
echo ============================================================
echo   Build FAISS Vector Index for Ancient Painting System
echo ============================================================
echo.

cd /d "%~dp0.."

python --version > nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.10+ and add to PATH.
    pause
    exit /b 1
)

echo [Step 1/3] Installing Python dependencies...
python -m pip install -q sentence-transformers faiss-cpu numpy tqdm
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies.
    echo Please run manually: pip install sentence-transformers faiss-cpu numpy tqdm
    pause
    exit /b 1
)

echo [Step 2/3] Generating vector index...
python scripts\build_vector_index.py --metadata data/demo_painting/metadata.json --outdir data/demo_painting/vector_store
if %errorlevel% neq 0 (
    echo [ERROR] Index generation failed. See error above.
    pause
    exit /b 1
)

echo.
echo [Step 3/3] Done!
echo   Output files:
echo     data\demo_painting\vector_store\index.faiss
echo     data\demo_painting\vector_store\index_texts.json
echo.
echo Next step: run scripts\dev_start_backend.bat
echo.
pause
