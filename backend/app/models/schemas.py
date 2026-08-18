from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


# ─────────────────────────────────────────────
# 标注坐标模型
# ─────────────────────────────────────────────
class Coordinates(BaseModel):
    x: float = Field(..., ge=0.0, le=1.0, description="归一化 x 坐标（0~1）")
    y: float = Field(..., ge=0.0, le=1.0, description="归一化 y 坐标（0~1）")
    width: float = Field(..., ge=0.0, le=1.0, description="归一化宽度（0~1）")
    height: float = Field(..., ge=0.0, le=1.0, description="归一化高度（0~1）")


# ─────────────────────────────────────────────
# 画面标注模型（对应 annotations.json 条目）
# ─────────────────────────────────────────────
class Annotation(BaseModel):
    annotation_id: str = Field(..., description="标注唯一 ID")
    label: str = Field(..., description="标注标签名称")
    type: str = Field(..., description="标注类型：composition/brushwork/symbolism/historical_detail/inscription_seal/narrative")
    coordinates: Coordinates
    short_description: str = Field(..., description="简短描述")
    long_description: Optional[str] = Field(None, description="详细描述")
    related_topics: List[str] = Field(default_factory=list, description="相关主题标签")
    source_refs: List[str] = Field(default_factory=list, description="文献来源 ID 列表")


# ─────────────────────────────────────────────
# 画作元数据模型（对应 metadata.json）
# ─────────────────────────────────────────────
class PaintingMetadata(BaseModel):
    painting_id: str
    title_zh: str
    title_en: Optional[str] = None
    artist: str
    artist_en: Optional[str] = None
    dynasty: str
    dynasty_en: Optional[str] = None
    date: Optional[str] = None
    date_en: Optional[str] = None
    collection: Optional[str] = None
    collection_en: Optional[str] = None
    genre: Optional[str] = None
    genre_en: Optional[str] = None
    medium: Optional[str] = None
    dimensions: Optional[str] = None
    description: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    thumbnail_url: Optional[str] = None
    image_source: Optional[str] = None


# ─────────────────────────────────────────────
# 导览步骤模型（对应 tour.json）
# ─────────────────────────────────────────────
class ViewerCenter(BaseModel):
    x: float
    y: float


class TourStep(BaseModel):
    step_index: int
    target_annotation_id: str
    viewer_zoom: float
    viewer_center: ViewerCenter
    narration: str
    audio_url: Optional[str] = None


class Tour(BaseModel):
    tour_id: str
    title: str
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    steps: List[TourStep]


# ─────────────────────────────────────────────
# Manifest 模型（对应 manifest.json）
# ─────────────────────────────────────────────
class PaintingManifestEntry(BaseModel):
    metadata: str
    annotations: str
    tour: str
    layers: str
    image_url: Optional[str] = None
    image_pyramid: Optional[str] = None
    vector_index: Optional[str] = None
    vr_scene: Optional[str] = None


class Manifest(BaseModel):
    active_painting_id: str
    candidate_paintings: List[str] = Field(default_factory=list)
    paintings: Dict[str, PaintingManifestEntry]


# ─────────────────────────────────────────────
# API 请求 / 响应模型
# ─────────────────────────────────────────────
class AskRequest(BaseModel):
    painting_id: str = Field(..., description="画作 ID")
    agent_id: str = Field(default="curator", description="AI 角色 ID")
    question: str = Field(..., min_length=1, description="用户问题")
    annotation_id: Optional[str] = Field(None, description="当前选中的标注 ID（可选上下文）")
    language: str = Field(default="zh", description="回答语言：zh 或 en")


class Citation(BaseModel):
    source_id: str
    title: str
    relevance_score: Optional[float] = None


class AskResponse(BaseModel):
    answer: str
    citations: List[Citation] = Field(default_factory=list)
    related_annotations: List[str] = Field(default_factory=list)
    follow_up_questions: List[str] = Field(default_factory=list)
    agent_id: str
    painting_id: str


class HealthCheckResult(BaseModel):
    painting_id: str
    metadata_ok: bool
    annotations_ok: bool
    tour_ok: bool
    layers_ok: bool
    vector_store_exists: bool
    image_tiles_exists: bool
    issues: List[str] = Field(default_factory=list)


class StandardResponse(BaseModel):
    status: str
    data: Any
    message: Optional[str] = None
