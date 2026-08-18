# backend/app/services/chat_service.py
"""Simple wrapper for AI 问答服务。

- 在本地开发阶段，允许 DEEPSEEK_API_KEY 为空，调用时会抛出明确错误，提示用户先配置 .env。
- 实际实现委托给 rag_service（RAG），但为了保持最小依赖，这里仅提供一个占位实现。
"""
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# 读取 DeepSeek API Key，若未设置则为 None
DEEPSEEK_API_KEY: Optional[str] = os.getenv("DEEPSEEK_API_KEY")
if not DEEPSEEK_API_KEY:
    logger.warning("DeepSeek API Key 未配置，AI 问答功能暂不可用。请在 backend/.env 中添加 DEEPSEEK_API_KEY。")

# 为保持接口统一，直接复用 rag_service 中的实现（如果已初始化）
# 这里采用延迟导入，避免循环依赖
async def generate_answer(query: str, vector_index_path: str, metadata_path: str) -> str:
    """根据查询生成答案。
    
    - 若未配置 API Key，抛出 RuntimeError，前端会展示错误提示。
    - 实际检索与生成逻辑交由 rag_service（RAG）完成。
    """
    if not DEEPSEEK_API_KEY:
        raise RuntimeError("DeepSeek API Key 未配置，请在 backend/.env 中设置 DEEPSEEK_API_KEY 后重启后端服务。")
    # 延迟导入，防止在模块加载阶段就触发缺失依赖错误
    from .rag_service import RAGService, init_rag_service, get_rag_service

    # 初始化全局 RAGService（仅第一次调用时创建）
    if not hasattr(generate_answer, "_initialized"):
        init_rag_service(
            api_key=DEEPSEEK_API_KEY,
            base_url="https://api.deepseek.com",
            model="deepseek-chat",
            top_k=5,
            similarity_threshold=0.6,
        )
        generate_answer._initialized = True
        logger.info("RAGService 已初始化")

    rag = get_rag_service()
    # 为演示，这里使用一个简化的 AskRequest dataclass（在 rag_service 中已定义）
    from .rag_service import AskRequest
    request = AskRequest(
        painting_id="demo_painting",
        question=query,
        annotation_id=None,
        agent_id="curator",
        language="zh",
    )
    # 在实际项目中会根据 vector_index_path 与 metadata_path 动态加载对应的 Store
    # 此处省略，直接使用已在 rag_service 中加载的默认 store（如果存在）
    response = await rag.ask(request)
    return response.answer
