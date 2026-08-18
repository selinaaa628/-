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
    
    const applyZoom = () => {
      const { x, y, zoom } = zoomTo;
      const viewport = osdRef.current.viewport;
      
      try {
        const item = osdRef.current.world.getItemAt(0);
        if (item) {
          // x, y 是 0-1 的绝对百分比，需要映射到图像的实际像素，再转为 OSD 的视口相对坐标
          const size = item.getContentSize();
          const vpPoint = viewport.imageToViewportCoordinates(x * size.x, y * size.y);
          viewport.panTo(vpPoint, true);
          viewport.zoomTo(zoom, null, true);
          return;
        }
      } catch (e) {
        console.warn("Could not get image bounds", e);
      }
      
      // Fallback if something went completely wrong (not recommended but safe)
      viewport.panTo(new OpenSeadragon.Point(x, y), true);
      viewport.zoomTo(zoom, null, true);
    };

    if (osdRef.current.world && osdRef.current.world.getItemAt(0)) {
      applyZoom();
    } else {
      // 图像可能还没加载完，监听 open 事件后再执行
      osdRef.current.addOnceHandler('open', applyZoom);
    }
  }, [zoomTo]);

  // 绘制热点标注
  useEffect(() => {
    if (!osdRef.current || !osdRef.current.world) return;
    
    const overlay = document.createElement('canvas');
    overlay.style.position = 'absolute';
    overlay.style.pointerEvents = 'none';
    
    // 我们需要在图片加载完成后添加 overlay
    const addCanvasOverlay = () => {
      const item = osdRef.current.world.getItemAt(0);
      if (!item) return;
      const bounds = item.getBounds();
      osdRef.current.addOverlay({
        element: overlay,
        location: bounds,
      });
    };

    if (osdRef.current.world.getItemAt(0)) {
      addCanvasOverlay();
    } else {
      osdRef.current.addOnceHandler('open', addCanvasOverlay);
    }

    const draw = () => {
      const ctx = overlay.getContext('2d');
      if (!ctx) return;
      
      // 更新 canvas 内部像素分辨率以匹配显示大小，避免模糊
      const rect = overlay.getBoundingClientRect();
      if (overlay.width !== rect.width || overlay.height !== rect.height) {
        overlay.width = rect.width;
        overlay.height = rect.height;
      }
      
      const w = overlay.width;
      const h = overlay.height;
      ctx.clearRect(0, 0, w, h);
      
      annotations.forEach((ann) => {
        // 用户要求隐藏画面的方框，取消绘制
        // const { x, y, width, height } = ann.coordinates;
        // ctx.strokeStyle = ann.annotation_id === activeAnnotationId ? 'hsl(30,80%,55%)' : 'rgba(255,255,255,0.6)';
        // ctx.lineWidth = ann.annotation_id === activeAnnotationId ? 3 : 2;
        // ctx.strokeRect(x * w, y * h, width * w, height * h);
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
