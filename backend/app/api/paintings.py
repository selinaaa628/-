"""
画作相关 API 路由
"""
import json
import os
import logging
from typing import List

from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    PaintingMetadata, Annotation, Tour, StandardResponse, HealthCheckResult
)
from app.services.manifest_service import get_manifest_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/paintings", tags=["paintings"])


def _read_json(path: str):
    """读取 JSON 文件的通用方法"""
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"数据文件未找到: {path}")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


# ─────────────────────────────────────────────
# GET /api/paintings/active — 获取激活画作元数据
# ─────────────────────────────────────────────
@router.get("/active")
async def get_active_painting(painting_id: str = None):
    """获取当前激活画作的完整元数据"""
    svc = get_manifest_service()
    
    if painting_id and painting_id in svc.get_manifest().paintings:
        active_id = painting_id
    else:
        active_id = svc.get_active_painting_id()
        
    metadata_path = svc.get_metadata_path(active_id)
    metadata = _read_json(metadata_path)

    # 附加 manifest 中的附加路径信息
    entry = svc.get_painting_entry(active_id)
    metadata["image_url"] = entry.image_url
    metadata["image_pyramid"] = entry.image_pyramid

    return StandardResponse(status="success", data=metadata)


# ─────────────────────────────────────────────
# GET /api/paintings/{painting_id}/annotations
# ─────────────────────────────────────────────
@router.get("/{painting_id}/annotations")
async def get_annotations(painting_id: str):
    """获取指定画作的标注数据"""
    svc = get_manifest_service()
    annotations_path = svc.get_annotations_path(painting_id)
    annotations = _read_json(annotations_path)
    return StandardResponse(status="success", data=annotations)


# ─────────────────────────────────────────────
# GET /api/paintings/{painting_id}/tour
# ─────────────────────────────────────────────
@router.get("/{painting_id}/tour")
async def get_tour(painting_id: str):
    """获取指定画作的导览配置"""
    svc = get_manifest_service()
    tour_path = svc.get_tour_path(painting_id)
    tour = _read_json(tour_path)
    return StandardResponse(status="success", data=tour)


# ─────────────────────────────────────────────
# GET /api/paintings/{painting_id}/metadata
# ─────────────────────────────────────────────
@router.get("/{painting_id}/metadata")
async def get_metadata(painting_id: str):
    """获取指定画作的元数据"""
    svc = get_manifest_service()
    metadata_path = svc.get_metadata_path(painting_id)
    metadata = _read_json(metadata_path)
    return StandardResponse(status="success", data=metadata)


# ─────────────────────────────────────────────
# GET /api/paintings/list — 列出所有候选画作
# ─────────────────────────────────────────────
@router.get("/list/all")
async def list_paintings():
    """列出所有候选画作的基本信息"""
    svc = get_manifest_service()
    manifest = svc.get_manifest()
    paintings_info = []

    for pid in manifest.candidate_paintings:
        try:
            metadata_path = svc.get_metadata_path(pid)
            metadata = _read_json(metadata_path)
            paintings_info.append({
                "painting_id": pid,
                "title_zh": metadata.get("title_zh", ""),
                "artist": metadata.get("artist", ""),
                "dynasty": metadata.get("dynasty", ""),
                "thumbnail_url": metadata.get("thumbnail_url", ""),
                "is_active": pid == manifest.active_painting_id,
            })
        except Exception as e:
            paintings_info.append({
                "painting_id": pid,
                "title_zh": f"[加载失败: {pid}]",
                "error": str(e),
                "is_active": pid == manifest.active_painting_id,
            })

    return StandardResponse(status="success", data=paintings_info)


# ─────────────────────────────────────────────
# POST /api/paintings/switch — 切换当前激活画作
# ─────────────────────────────────────────────
from pydantic import BaseModel
class SwitchRequest(BaseModel):
    painting_id: str

@router.post("/switch")
async def switch_painting(req: SwitchRequest):
    """切换系统当前展示的画作"""
    svc = get_manifest_service()
    try:
        svc.set_active_painting_id(req.painting_id)
        # 顺便重新加载 RAG 服务的数据，虽然下次用到会懒加载，但提前清空比较好
        from app.services.rag_service import get_rag_service
        try:
            rag = get_rag_service()
            if req.painting_id in rag._stores:
                del rag._stores[req.painting_id]
        except Exception:
            pass
        return StandardResponse(status="success", data={"active_painting_id": req.painting_id})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─────────────────────────────────────────────
# GET /api/health/data — 数据健康检查
# ─────────────────────────────────────────────
@router.get("/health/data", response_model=StandardResponse)
async def health_check():
    """校验当前激活画作的所有数据文件完整性"""
    svc = get_manifest_service()
    painting_id = svc.get_active_painting_id()
    entry = svc.get_painting_entry(painting_id)
    issues = []

    # 校验 metadata
    metadata_ok = False
    try:
        path = svc.resolve_path(entry.metadata)
        data = _read_json(path)
        PaintingMetadata(**data)
        metadata_ok = True
    except Exception as e:
        issues.append(f"metadata.json 校验失败: {e}")

    # 校验 annotations
    annotations_ok = False
    try:
        path = svc.resolve_path(entry.annotations)
        data = _read_json(path)
        for item in data:
            Annotation(**item)
        annotations_ok = True
    except Exception as e:
        issues.append(f"annotations.json 校验失败: {e}")

    # 校验 tour
    tour_ok = False
    try:
        path = svc.resolve_path(entry.tour)
        data = _read_json(path)
        Tour(**data)
        tour_ok = True
    except Exception as e:
        issues.append(f"tour.json 校验失败: {e}")

    # 校验 layers
    layers_ok = os.path.exists(svc.resolve_path(entry.layers))
    if not layers_ok:
        issues.append("layers.json 文件不存在")

    # 校验 vector_store 目录
    vector_store_exists = False
    if entry.vector_index:
        vector_store_exists = os.path.isdir(svc.resolve_path(entry.vector_index))
        if not vector_store_exists:
            issues.append("vector_store 目录不存在")

    # 校验图片切片目录
    image_tiles_exists = False
    if entry.image_pyramid:
        image_tiles_exists = os.path.isdir(svc.resolve_path(entry.image_pyramid))
        if not image_tiles_exists:
            issues.append("tiles 图片切片目录不存在（可选）")

    result = HealthCheckResult(
        painting_id=painting_id,
        metadata_ok=metadata_ok,
        annotations_ok=annotations_ok,
        tour_ok=tour_ok,
        layers_ok=layers_ok,
        vector_store_exists=vector_store_exists,
        image_tiles_exists=image_tiles_exists,
        issues=issues,
    )

    status = "healthy" if not issues else "degraded"
    return StandardResponse(status=status, data=result.model_dump(), message=f"发现 {len(issues)} 个问题" if issues else "所有数据文件校验通过")
