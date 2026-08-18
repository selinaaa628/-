/**
 * API 请求封装
 */
import axios from 'axios';
import type {
  PaintingMetadata,
  Annotation,
  Tour,
  AskRequest,
  AskResponse,
  StandardResponse,
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

export async function fetchActivePainting(): Promise<PaintingMetadata> {
  const res = await api.get<StandardResponse<PaintingMetadata>>(`/api/paintings/active?t=${Date.now()}`);
  return res.data.data;
}

/** 获取画作标注数据 */
export async function fetchAnnotations(paintingId: string): Promise<Annotation[]> {
  const res = await api.get<StandardResponse<Annotation[]>>(
    `/api/paintings/${paintingId}/annotations`
  );
  return res.data.data;
}

/** 获取导览配置 */
export async function fetchTour(paintingId: string): Promise<Tour> {
  const res = await api.get<StandardResponse<Tour>>(
    `/api/paintings/${paintingId}/tour`
  );
  return res.data.data;
}

/** AI 问答 */
export async function askQuestion(request: AskRequest): Promise<AskResponse> {
  const res = await api.post<StandardResponse<AskResponse>>('/api/ask', request);
  return res.data.data;
}

/** 数据健康检查 */
export async function healthCheck(): Promise<any> {
  const res = await api.get('/api/paintings/health/data');
  return res.data;
}

/** 热重载 manifest */
export async function reloadManifest(): Promise<any> {
  const res = await api.post('/api/manifest/reload');
  return res.data;
}

/** 获取所有画作列表 */
export async function fetchPaintingList(): Promise<any[]> {
  const res = await api.get('/api/paintings/list/all');
  return res.data.data;
}

/** 切换画作 */
export async function switchPainting(paintingId: string): Promise<void> {
  await api.post('/api/paintings/switch', { painting_id: paintingId });
}

export default api;
