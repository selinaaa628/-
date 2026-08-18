import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.services.manifest_service import init_manifest_service, get_manifest_service
from app.routers import painting, chat

app = FastAPI(title="中国古画鉴赏系统后端", version="0.1.0")

# CORS - 允许前端调用
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化 manifest 服务（路径相对于项目根目录）
init_manifest_service("data/manifest.json")

# 挂载路由
app.include_router(painting.router, prefix="/api/painting", tags=["painting"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])

if __name__ == "__main__":
    # 开发模式下直接运行 uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
