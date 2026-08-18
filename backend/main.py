"""
中国古画智能鉴赏系统 — FastAPI 后端入口
"""
import os
import logging
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

from app.api import paintings, ask
from app.services.manifest_service import init_manifest_service, get_manifest_service
from app.services.rag_service import init_rag_service

# 日志配置
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

# 项目根目录（backend 的上一级）
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
MANIFEST_PATH = DATA_DIR / "manifest.json"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：启动时初始化服务"""
    logger.info("=" * 60)
    logger.info("🏛️  中国古画智能鉴赏系统 后端启动中...")
    logger.info(f"📁 项目根目录: {PROJECT_ROOT}")
    logger.info(f"📁 数据目录: {DATA_DIR}")

    # 1. 初始化 Manifest 服务
    try:
        manifest_svc = init_manifest_service(str(MANIFEST_PATH))
        active_id = manifest_svc.get_active_painting_id()
        logger.info(f"✅ Manifest 加载成功，当前激活画作: {active_id}")
    except Exception as e:
        logger.error(f"❌ Manifest 加载失败: {e}")
        raise

    # 2. 初始化 RAG 服务
    api_key = os.getenv("DEEPSEEK_API_KEY", "")
    base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    model = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
    top_k = int(os.getenv("RAG_TOP_K", "5"))
    threshold = float(os.getenv("RAG_SIMILARITY_THRESHOLD", "0.6"))

    rag_svc = init_rag_service(
        api_key=api_key,
        base_url=base_url,
        model=model,
        top_k=top_k,
        similarity_threshold=threshold,
    )

    # 3. 加载 Agent 配置
    agents_path = str(DATA_DIR / "agents" / "agents.json")
    rag_svc.load_agents(agents_path)

    # 4. 预加载当前激活画作的知识库
    try:
        entry = manifest_svc.get_painting_entry(active_id)
        vector_index_file = manifest_svc.resolve_path(entry.vector_index or "")
        vector_path = os.path.dirname(vector_index_file) if vector_index_file else ""
        annotations_path = manifest_svc.resolve_path(entry.annotations)
        rag_svc.load_vector_store(active_id, vector_path, annotations_path)
        logger.info(f"✅ 画作 '{active_id}' 知识库已预加载")
    except Exception as e:
        logger.warning(f"⚠️ 知识库预加载失败（可降级运行）: {e}")

    if not api_key or api_key == "your_deepseek_api_key_here":
        logger.warning("⚠️ DEEPSEEK_API_KEY 未配置，AI 问答功能将不可用")

    logger.info("✅ 后端服务启动完成")
    logger.info("=" * 60)

    yield

    logger.info("🛑 后端服务关闭")


# 创建 FastAPI 应用
app = FastAPI(
    title="中国古画智能鉴赏系统 API",
    description="提供古画元数据查询、标注数据、导览配置与 AI 智能问答服务",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS 配置（开发环境允许前端访问，生产环境允许 Vercel 域名）
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:3000"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件挂载 — 让前端可以通过 /static/data/... 访问画作图片
if DATA_DIR.exists():
    app.mount("/static/data", StaticFiles(directory=str(DATA_DIR)), name="data_static")

# 注册路由
app.include_router(paintings.router)
app.include_router(ask.router)


@app.get("/")
async def root():
    return {"message": "中国古画智能鉴赏系统 API", "version": "1.0.0", "docs": "/docs"}


@app.post("/api/manifest/reload")
async def reload_manifest():
    """热重载 manifest.json（支持热插拔画作）"""
    svc = get_manifest_service()
    manifest = svc.reload()
    return {"status": "success", "active_painting_id": manifest.active_painting_id, "paintings": list(manifest.paintings.keys())}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("RELOAD", "true").lower() == "true",
    )
