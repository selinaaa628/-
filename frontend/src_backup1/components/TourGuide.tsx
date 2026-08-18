/**
 * TourGuide — 导览控制器
 * 分步叙事 / 联动 PaintingViewer 缩放 / 进度指示
 */
import { useState, useEffect } from 'react';
import type { Tour, TourStep } from '../types';

interface TourGuideProps {
  tour: Tour | null;
  isActive: boolean;
  onActivate: (active: boolean) => void;
  onStepChange: (step: TourStep) => void;
  onAnnotationHighlight: (annotationId: string) => void;
}

export default function TourGuide({
  tour,
  isActive,
  onActivate,
  onStepChange,
  onAnnotationHighlight,
}: TourGuideProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);

  const steps = tour?.steps || [];
  const currentStep = steps[currentStepIndex];

  // 自动播放
  useEffect(() => {
    if (!autoPlay || !isActive || !currentStep) return;
    const timer = setTimeout(() => {
      if (currentStepIndex < steps.length - 1) {
        goToStep(currentStepIndex + 1);
      } else {
        setAutoPlay(false);
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [autoPlay, currentStepIndex, isActive]);

  const goToStep = (index: number) => {
    if (index < 0 || index >= steps.length) return;
    setCurrentStepIndex(index);
    const step = steps[index] as any; // any to bypass strict type checking for extra fields
    onStepChange(step);
    if (step.target_annotation_id || step.linked_annotation_id) {
      onAnnotationHighlight(step.target_annotation_id || step.linked_annotation_id);
    }
  };

  const startTour = () => {
    onActivate(true);
    setCurrentStepIndex(0);
    if (steps.length > 0) {
      const step = steps[0] as any;
      onStepChange(step);
      if (step.target_annotation_id || step.linked_annotation_id) {
        onAnnotationHighlight(step.target_annotation_id || step.linked_annotation_id);
      }
    }
  };

  const stopTour = () => {
    onActivate(false);
    setAutoPlay(false);
  };

  if (!tour) return null;

  const currentStepAny = currentStep as any;

  return (
    <div className={`tour-guide ${isActive ? 'active' : ''}`}>
      {!isActive ? (
        <button className="tour-start-btn" onClick={startTour}>
          <span className="tour-icon">🎬</span>
          <span>开始导览：{tour.title || '画作导览'}</span>
          {tour.duration_minutes && (
            <span className="tour-duration">约{tour.duration_minutes}分钟</span>
          )}
        </button>
      ) : (
        <div className="tour-player">
          {/* 进度条 */}
          <div className="tour-progress">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`progress-dot ${i === currentStepIndex ? 'current' : i < currentStepIndex ? 'done' : ''}`}
                onClick={() => goToStep(i)}
                title={`第 ${i + 1} 步`}
              />
            ))}
          </div>

          {/* 叙事内容 */}
          <div className="tour-narration">
            <div className="narration-step" style={{ marginBottom: '8px', fontSize: '13px', color: '#999' }}>
              第 {currentStepIndex + 1} / {steps.length} 步
            </div>
            {currentStepAny?.title && (
              <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#e2a35d' }}>
                {currentStepAny.title}
              </h3>
            )}
            <div className="narration-text" style={{ fontSize: '15px', lineHeight: '1.6', color: '#eee' }}>
              {currentStepAny?.narration || currentStepAny?.description}
            </div>
          </div>

          {/* 控制按钮 */}
          <div className="tour-controls">
            <button
              className="tour-ctrl-btn"
              onClick={() => goToStep(currentStepIndex - 1)}
              disabled={currentStepIndex === 0}
            >
              ◀ 上一步
            </button>
            <button
              className={`tour-ctrl-btn ${autoPlay ? 'playing' : ''}`}
              onClick={() => setAutoPlay(!autoPlay)}
            >
              {autoPlay ? '⏸ 暂停' : '▶ 自动'}
            </button>
            <button
              className="tour-ctrl-btn"
              onClick={() => goToStep(currentStepIndex + 1)}
              disabled={currentStepIndex === steps.length - 1}
            >
              下一步 ▶
            </button>
            <button className="tour-ctrl-btn stop" onClick={stopTour}>
              ✕ 退出
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
