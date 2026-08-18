// ─────────────────────────────────────────────
// TypeScript 类型定义（与后端 Pydantic Schema 对齐）
// ─────────────────────────────────────────────

export interface Coordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Annotation {
  annotation_id: string;
  label: string;
  type: AnnotationType;
  coordinates: Coordinates;
  short_description: string;
  long_description?: string;
  related_topics: string[];
  source_refs: string[];
}

export type AnnotationType =
  | 'composition'
  | 'brushwork'
  | 'symbolism'
  | 'historical_detail'
  | 'inscription_seal'
  | 'narrative';

/** 标注类型 → 颜色映射 */
export const ANNOTATION_COLORS: Record<AnnotationType, string> = {
  composition: '#4A90D9',
  brushwork: '#2ECC71',
  symbolism: '#9B59B6',
  historical_detail: '#E67E22',
  inscription_seal: '#E74C3C',
  narrative: '#F1C40F',
};

/** 标注类型中文名 */
export const ANNOTATION_TYPE_LABELS: Record<AnnotationType, string> = {
  composition: '构图',
  brushwork: '笔墨技法',
  symbolism: '意象象征',
  historical_detail: '历史细节',
  inscription_seal: '题跋印章',
  narrative: '叙事场景',
};

export interface PaintingMetadata {
  painting_id: string;
  title_zh: string;
  title_en?: string;
  artist: string;
  artist_en?: string;
  dynasty: string;
  dynasty_en?: string;
  date?: string;
  collection?: string;
  genre?: string;
  medium?: string;
  dimensions?: string;
  description?: string;
  tags?: string[];
  thumbnail_url?: string;
  image_url?: string;
  image_source?: string;
}

export interface ViewerCenter {
  x: number;
  y: number;
}

export interface TourStep {
  step_index: number;
  target_annotation_id: string;
  viewer_zoom: number;
  viewer_center: ViewerCenter;
  narration: string;
  audio_url?: string;
}

export interface Tour {
  tour_id: string;
  title: string;
  description?: string;
  duration_minutes?: number;
  steps: TourStep[];
}

export interface AskRequest {
  painting_id: string;
  agent_id: string;
  question: string;
  annotation_id?: string;
  language: string;
}

export interface Citation {
  source_id: string;
  title: string;
  relevance_score?: number;
}

export interface AskResponse {
  answer: string;
  citations: Citation[];
  related_annotations: string[];
  follow_up_questions: string[];
  agent_id: string;
  painting_id: string;
}

export interface AgentInfo {
  agent_id: string;
  name: string;
  name_en: string;
  avatar: string;
  persona: string;
}

export interface StandardResponse<T = any> {
  status: string;
  data: T;
  message?: string;
}
