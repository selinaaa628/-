import sys
import os
from fastapi import FastAPI

app = FastAPI()

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def catch_all(path: str):
    return {
        "status": "Hello from pure FastAPI",
        "sys_path": sys.path,
        "cwd": os.getcwd(),
        "files_in_root": os.listdir("."),
        "files_in_backend": os.listdir("backend") if os.path.exists("backend") else None
    }
