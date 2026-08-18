"""
AI 问答 API 路由 (RAG)
"""
import logging
from fastapi import APIRouter, HTTPException

from app.models.schemas import AskRequest, AskResponse, StandardResponse
from app.services.rag_service import get_rag_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["ask"])


@router.post("/ask", response_model=StandardResponse)
async def ask_question(request: AskRequest):
    """
    AI 检索问答接口
    根据 painting_id 加载对应知识库，结合 agent_id 选择角色模板，
    执行 RAG 检索并生成回答。
    """
    try:
        rag = get_rag_service()
        response = await rag.ask(request)
        return StandardResponse(status="success", data=response.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"RAG 问答失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI 服务异常: {str(e)[:200]}")
