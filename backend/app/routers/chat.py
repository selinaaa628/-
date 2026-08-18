# backend/app/routers/chat.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
import os
import json
from app.services.manifest_service import get_manifest_service
from app.services.chat_service import generate_answer

router = APIRouter()

class ChatRequest(BaseModel):
    painting_id: str
    user_query: str
    # optional: include annotation context

@router.post("/ask", summary="基于画作和检索结果的智能问答")
async def ask_chat(request: ChatRequest):
    # Load painting entry to get vector index path
    service = get_manifest_service()
    entry = service.get_painting_entry(request.painting_id)
    if not entry.vector_index:
        raise HTTPException(status_code=400, detail="Vector index 未配置，无法进行 RAG")
    try:
        answer = await generate_answer(
            query=request.user_query,
            vector_index_path=service.resolve_path(entry.vector_index),
            metadata_path=service.resolve_path(entry.metadata),
        )
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
