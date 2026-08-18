# backend/app/routers/painting.py
from fastapi import APIRouter, HTTPException
from pathlib import Path
import json

from app.services.manifest_service import get_manifest_service

router = APIRouter()

@router.get("/active", summary="获取当前激活的画作信息")
def get_active_painting():
    service = get_manifest_service()
    painting_id = service.get_active_painting_id()
    entry = service.get_painting_entry(painting_id)
    # 读取 metadata 文件并返回
    meta_path = Path(service.resolve_path(entry.metadata))
    if not meta_path.exists():
        raise HTTPException(status_code=404, detail="Metadata file not found")
    with meta_path.open(encoding="utf-8") as f:
        metadata = json.load(f)
    return metadata

@router.get("/{painting_id}/annotations", summary="获取指定画作的标注信息")
def get_annotations(painting_id: str):
    service = get_manifest_service()
    entry = service.get_painting_entry(painting_id)
    ann_path = Path(service.resolve_path(entry.annotations))
    if not ann_path.exists():
        raise HTTPException(status_code=404, detail="Annotations file not found")
    with ann_path.open(encoding="utf-8") as f:
        annotations = json.load(f)
    return annotations

@router.get("/{painting_id}/tour", summary="获取指定画作的导览配置")
def get_tour(painting_id: str):
    service = get_manifest_service()
    entry = service.get_painting_entry(painting_id)
    tour_path = Path(service.resolve_path(entry.tour))
    if not tour_path.exists():
        raise HTTPException(status_code=404, detail="Tour file not found")
    with tour_path.open(encoding="utf-8") as f:
        tour = json.load(f)
    return tour

@router.get("/{painting_id}/layers", summary="获取画作分层配置（用于 OpenSeadragon）")
def get_layers(painting_id: str):
    service = get_manifest_service()
    entry = service.get_painting_entry(painting_id)
    layers_path = Path(service.resolve_path(entry.layers))
    if not layers_path.exists():
        raise HTTPException(status_code=404, detail="Layers file not found")
    with layers_path.open(encoding="utf-8") as f:
        layers = json.load(f)
    return layers
