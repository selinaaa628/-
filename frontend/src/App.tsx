/**
 * 中国古画智能鉴赏系统 — 主应用
 */
import { useState, useEffect, useCallback } from 'react';
import PaintingViewer from './components/PaintingViewer';
import ChatPanel from './components/ChatPanel';
import TourGuide from './components/TourGuide';
import PaintingTracker from './components/PaintingTracker';
import PaintingSelector from './components/PaintingSelector';
import OpeningDemo from './components/OpeningDemo';
import { fetchActivePainting, fetchAnnotations, fetchTour, switchPainting } from './services/api';
import type { PaintingMetadata, Annotation, Tour, TourStep } from './types/index';
import './App.css';

type ViewMode = 'appreciate' | 'track';

function App() {
  const hasSeenOpening = sessionStorage.getItem('hasSeenOpening') === 'true';
  const justSwitched = sessionStorage.getItem('justSwitched') === 'true';
  
  const [showOpening, setShowOpening] = useState(!hasSeenOpening);
  const [showSelector, setShowSelector] = useState(false);
  const [metadata, setMetadata] = useState<PaintingMetadata | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [tour, setTour] = useState<Tour | null>(null);
  const [vrConfig, setVrConfig] = useState<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('appreciate');
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [viewerZoom, setViewerZoom] = useState<{ x: number; y: number; zoom: number } | null>(null);
  const [tourActive, setTourActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (justSwitched) {
      sessionStorage.removeItem('justSwitched');
    }
  }, [justSwitched]);

  // 加载画作数据
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);


        const meta = await fetchActivePainting();
        setMetadata(meta);

        const anns = await fetchAnnotations(meta.painting_id);
        setAnnotations(anns);

        try {
          const tourData = await fetchTour(meta.painting_id);
          setTour(tourData);
        } catch {
          console.warn('导览数据加载失败');
        }

        // 加载 VR 配置
        try {
          const res = await fetch(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/static/data/${meta.painting_id}/vr_scene.json`
          );
          if (res.ok) setVrConfig(await res.json());
        } catch {
          console.warn('VR 场景配置加载失败');
        }
      } catch (err: any) {
        setError(err.message || '数据加载失败，请确认后端服务已启动');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSwitchPainting = async (newId: string) => {
    if (newId === metadata?.painting_id) {
      setShowSelector(false);
      return;
    }
    setLoading(true);
    try {
      // Instead of relying on a stateful backend, we store the choice in the frontend
      sessionStorage.setItem('activePaintingId', newId);
      sessionStorage.setItem('justSwitched', 'true');
      setShowSelector(false);
      window.location.reload();
    } catch (err) {
      console.error('切换失败', err);
      setShowSelector(false);
      setLoading(false);
    }
  };

  const handleAnnotationClick = useCallback((annotationId: string, annotation: Annotation) => {
    setSelectedAnnotation(annotation);
    setActiveAnnotationId(annotationId);
  }, []);

  const handleHighlightAnnotation = useCallback((annotationId: string, preventZoom: boolean = false) => {
    setActiveAnnotationId(annotationId);
    const ann = annotations.find((a) => a.annotation_id === annotationId);
    if (ann) {
      setSelectedAnnotation(ann);
      if (!preventZoom) {
        setViewerZoom({
          x: ann.coordinates.x + ann.coordinates.width / 2,
          y: ann.coordinates.y + ann.coordinates.height / 2,
          zoom: 3.0,
        });
      }
    }
  }, [annotations]);

  const handleTourStepChange = useCallback((step: TourStep) => {
    setViewerZoom({
      x: step.viewer_center.x,
      y: step.viewer_center.y,
      zoom: step.viewer_zoom,
    });
  }, []);

  // 获取图片 URL
  const imageUrl = (metadata as any)?.image_url || metadata?.thumbnail_url || '';

  if (showOpening) {
    return (
      <OpeningDemo 
        onComplete={() => {
          sessionStorage.setItem('hasSeenOpening', 'true');
          setShowOpening(false);
          setShowSelector(true);
        }} 
      />
    );
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-brush">
            <div className="ink-drop"></div>
            <div className="ink-drop delay-1"></div>
            <div className="ink-drop delay-2"></div>
          </div>
          <h2>古画智能鉴赏系统</h2>
          <p>正在加载画作数据...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <h2>数据加载失败</h2>
          <p>{error}</p>
          <div className="error-hint">
            <p>请确认：</p>
            <ol>
              <li>后端服务已启动 (cd backend && python main.py)</li>
              <li>data/manifest.json 文件存在</li>
              <li>画作数据文件完整</li>
            </ol>
          </div>
          <button className="retry-btn" onClick={() => window.location.reload()}>
            重新加载
          </button>
        </div>
      </div>
    );
  }

  if (showSelector) {
    return <PaintingSelector onSelect={handleSwitchPainting} />;
  }

  return (
    <div className="app">
      <audio 
        src="/琵琶吟.mp3" 
        autoPlay 
        loop 
        style={{ display: 'none' }}
      />
      {/* 顶部导航栏 */}
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">
            <span className="title-icon">❖</span>
            古画智能鉴赏
          </h1>
          {metadata && (
            <div className="painting-info-brief">
              <span className="painting-name">《{metadata.title_zh}》</span>
              <span className="painting-meta">{metadata.artist} · {metadata.dynasty}</span>
            </div>
          )}
        </div>
        <div className="header-right">
          <div className="painting-switcher" style={{ marginRight: '24px' }}>
            <button
              className="view-btn"
              onClick={() => setShowSelector(true)}
            >
              ☖ 切换画作
            </button>
          </div>
          <div className="view-switcher">
            <button
              className={`view-btn ${viewMode === 'appreciate' ? 'active' : ''}`}
              onClick={() => setViewMode('appreciate')}
            >
              ◈ AI 导览
            </button>
            <button
              className={`view-btn ${viewMode === 'track' ? 'active' : ''}`}
              onClick={() => setViewMode('track')}
            >
              ❂ 动态循迹
            </button>
          </div>
        </div>
      </header>

      {/* 画作信息卡片 */}
      {metadata && viewMode === 'appreciate' && (
        <div className="painting-info-card">
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">作者</span>
              <span className="info-value">{metadata.artist}</span>
            </div>
            <div className="info-item">
              <span className="info-label">朝代</span>
              <span className="info-value">{metadata.dynasty}</span>
            </div>
            <div className="info-item">
              <span className="info-label">年代</span>
              <span className="info-value">{metadata.date || '-'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">材质</span>
              <span className="info-value">{metadata.medium || '-'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">尺寸</span>
              <span className="info-value">{metadata.dimensions || '-'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">收藏</span>
              <span className="info-value">{metadata.collection || '-'}</span>
            </div>
          </div>
          {metadata.description && (
            <div className="info-description">{metadata.description}</div>
          )}
        </div>
      )}

      {/* 主内容区 */}
      <main className="app-main">
        {viewMode === 'appreciate' ? (
          <div className="appreciate-layout">
            {/* 左侧：导览控制器 */}
            <div className="tour-section">
              <TourGuide
                tour={tour}
                isActive={tourActive}
                onActivate={setTourActive}
                onStepChange={handleTourStepChange}
                onAnnotationHighlight={handleHighlightAnnotation}
              />
            </div>

            {/* 中间：画作浏览器 */}
            <div className="viewer-section">
              <PaintingViewer
                imageUrl={imageUrl}
                annotations={annotations}
                onAnnotationClick={handleAnnotationClick}
                zoomTo={viewerZoom}
                activeAnnotationId={activeAnnotationId}
              />
            </div>

            {/* 右侧：AI 对话面板 */}
            <div className="chat-section">
              <ChatPanel
                paintingId={metadata?.painting_id || 'demo_painting'}
                selectedAnnotation={selectedAnnotation}
                onHighlightAnnotation={handleHighlightAnnotation}
              />
            </div>
          </div>
        ) : (
          <div className="vr-layout">
            <PaintingTracker
              paintingId={metadata?.painting_id}
              imageUrl={imageUrl}
              annotations={annotations}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
