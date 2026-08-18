import sys
import os
import traceback

root_dir = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, root_dir)
sys.path.insert(0, os.path.join(root_dir, "backend"))

try:
    from backend.main import app
except Exception as e:
    from fastapi import FastAPI
    app = FastAPI()
    
    error_msg = traceback.format_exc()
    
    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
    async def catch_all(path: str):
        return {
            "error": "Failed to load backend.main",
            "traceback": error_msg,
            "sys_path": sys.path,
            "cwd": os.getcwd(),
            "files_in_root": os.listdir("."),
            "files_in_backend": os.listdir("backend") if os.path.exists("backend") else None
        }
