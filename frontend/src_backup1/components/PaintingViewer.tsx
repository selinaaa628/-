// src/components/PaintingViewer.tsx
import OpenSeadragon from 'openseadragon';
import { useEffect, useRef } from 'react';
import type { Annotation } from '../types';

interface Props {
  imageUrl: string;
  annotations: Annotation[];
  onAnnotationClick: (id: string, annotation: Annotation) => void;
  zoomTo?: { x: number; y: number; zoom: number } | null;
  activeAnnotationId: string | null;
}

export default function PaintingViewer({ imageUrl, annotations, onAnnotationClick, zoomTo, activeAnnotationId }: Props) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const osdRef = useRef<any>(null);

  // 初始化 OpenSeadragon
  useEffect(() => {
    if (!viewerRef.current || !imageUrl) return;
    
    osdRef.current = OpenSeadragon({
      element: viewerRef.current,
      prefixUrl: 'https://openseadragon.github.io/openseadragon/images/',
      tileSources: {
        type: 'image',
        url: imageUrl,
        buildPyramid: false
      },
      showNavigator: true,
    });
    return () => osdRef.current?.destroy();
  }, [imageUrl]);

  // 处理放大/定位
  useEffect(() => {
    if (!osdRef.current || !zoomTo) return;
    const { x, y, zoom } = zoomTo;
    const viewport = osdRef.current.viewport;
    // OpenSeadragon 使用相对坐标 (0‑1)
    viewport.panTo(new OpenSeadragon.Point(x, y), true);
    viewport.zoomTo(zoom, null, true);
  }, [zoomTo]);

  // 绘制热点标注
  useEffect(() => {
    if (!osdRef.current) return;
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.pointerEvents = 'none';
    osdRef.current.addOverlay({
      element: overlay,
      location: new OpenSeadragon.Rect(0, 0, 1, 1),
    });
    const draw = () => {
      const ctx = overlay.getContext?.('2d');
      if (!ctx) return;
      const w = overlay.clientWidth;
      const h = overlay.clientHeight;
      ctx.clearRect(0, 0, w, h);
      annotations.forEach((ann) => {
        const { x, y, width, height } = ann.coordinates;
        ctx.strokeStyle = ann.annotation_id === activeAnnotationId ? 'hsl(30,80%,55%)' : 'rgba(255,255,255,0.6)';
        ctx.lineWidth = ann.annotation_id === activeAnnotationId ? 3 : 2;
        ctx.strokeRect(x * w, y * h, width * w, height * h);
      });
    };
    const update = () => {
      draw();
    };
    osdRef.current.addHandler('animation', update);
    osdRef.current.addHandler('open', update);
    return () => {
      osdRef.current?.removeHandler('animation', update);
      osdRef.current?.removeHandler('open', update);
    };
  }, [annotations, activeAnnotationId]);

  // 点击检测
  useEffect(() => {
    const handler = (event: any) => {
      const viewport = osdRef.current.viewport;
      const webPoint = event.position;
      const imagePoint = viewport.pointFromPixel(webPoint);
      const { x, y } = imagePoint;
      // 遍历注解找出命中区域（简单 bbox 检测）
      for (const ann of annotations) {
        const { x: ax, y: ay, width, height } = ann.coordinates;
        if (x >= ax && x <= ax + width && y >= ay && y <= ay + height) {
          onAnnotationClick(ann.annotation_id, ann);
          break;
        }
      }
    };
    osdRef.current?.addHandler('canvas-click', handler);
    return () => {
      osdRef.current?.removeHandler('canvas-click', handler);
    };
  }, [annotations, onAnnotationClick]);

  return <div ref={viewerRef} className="painting-viewer" style={{ width: '100%', height: '100%' }} />;
}
