import json
import logging
from pathlib import Path
from typing import Dict, Optional

from pydantic import BaseModel

logger = logging.getLogger(__name__)


class PaintingEntry(BaseModel):
    metadata: str
    annotations: str
    tour: str
    layers: str
    image_url: Optional[str] = None
    image_pyramid: Optional[str] = None
    vector_index: Optional[str] = None
    vector_texts: Optional[str] = None
    vr_scene: Optional[str] = None


class ManifestModel(BaseModel):
    active_painting_id: str
    candidate_paintings: list
    paintings: Dict[str, PaintingEntry]


class ManifestService:
    def __init__(self, manifest_path: str):
        self.manifest_path = Path(manifest_path).resolve()
        if not self.manifest_path.exists():
            raise FileNotFoundError(f"Manifest file not found: {self.manifest_path}")
        self._load()

    def _load(self) -> None:
        with self.manifest_path.open(encoding="utf-8") as f:
            raw = json.load(f)
        # Pydantic v2 使用 model_validate；v1 使用 parse_obj
        try:
            self.manifest = ManifestModel.model_validate(raw)   # Pydantic v2
        except AttributeError:
            self.manifest = ManifestModel.parse_obj(raw)        # Pydantic v1 fallback
        logger.info(f"Manifest loaded, active painting: {self.manifest.active_painting_id}")

    # ── 基本查询 ──────────────────────────────────────────────────
    def get_active_painting_id(self) -> str:
        return self.manifest.active_painting_id

    def get_manifest(self) -> ManifestModel:
        return self.manifest

    def set_active_painting_id(self, painting_id: str) -> None:
        if painting_id not in self.manifest.paintings:
            raise KeyError(f"Painting '{painting_id}' not found in manifest")
        self.manifest.active_painting_id = painting_id
        # 保存回 manifest.json
        with self.manifest_path.open("w", encoding="utf-8") as f:
            json.dump(self.manifest.model_dump() if hasattr(self.manifest, 'model_dump') else self.manifest.dict(), f, indent=2, ensure_ascii=False)
        logger.info(f"Active painting switched to: {painting_id}")

    def get_painting_entry(self, painting_id: str) -> PaintingEntry:
        entry = self.manifest.paintings.get(painting_id)
        if not entry:
            raise KeyError(f"Painting '{painting_id}' not found in manifest")
        return entry

    # ── 路径解析 ──────────────────────────────────────────────────
    def resolve_path(self, relative_path: str) -> str:
        """将 manifest 中的相对路径转为绝对路径（以 manifest.json 所在目录为基准）"""
        if not relative_path:
            return ""
        base_dir = self.manifest_path.parent
        return str((base_dir / relative_path).resolve())

    # ── 快捷路径方法（供各 API router 使用）──────────────────────
    def get_metadata_path(self, painting_id: str) -> str:
        return self.resolve_path(self.get_painting_entry(painting_id).metadata)

    def get_annotations_path(self, painting_id: str) -> str:
        return self.resolve_path(self.get_painting_entry(painting_id).annotations)

    def get_tour_path(self, painting_id: str) -> str:
        return self.resolve_path(self.get_painting_entry(painting_id).tour)

    def get_layers_path(self, painting_id: str) -> str:
        return self.resolve_path(self.get_painting_entry(painting_id).layers)

    def get_vector_index_path(self, painting_id: str) -> str:
        entry = self.get_painting_entry(painting_id)
        return self.resolve_path(entry.vector_index or "")

    def get_vector_texts_path(self, painting_id: str) -> str:
        entry = self.get_painting_entry(painting_id)
        return self.resolve_path(entry.vector_texts or "")

    # ── 热重载 ────────────────────────────────────────────────────
    def reload(self) -> ManifestModel:
        logger.info("Reloading manifest.json ...")
        self._load()
        return self.manifest


# ── 单例 ──────────────────────────────────────────────────────────
_manifest_instance: Optional[ManifestService] = None


def init_manifest_service(manifest_path: str) -> ManifestService:
    global _manifest_instance
    _manifest_instance = ManifestService(manifest_path)
    return _manifest_instance


def get_manifest_service() -> ManifestService:
    if _manifest_instance is None:
        raise RuntimeError("ManifestService not initialized")
    return _manifest_instance
