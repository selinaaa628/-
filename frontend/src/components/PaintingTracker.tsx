import React, { useEffect, useRef, useState } from 'react';
import type { Annotation } from '../types';

interface PaintingTrackerProps {
  paintingId?: string;
  imageUrl?: string; 
  annotations?: Annotation[];
}

const PaintingTracker: React.FC<PaintingTrackerProps> = ({ paintingId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 }); // percentages

  const isGuifei = paintingId === 'qy_guifei';
  const isGaoshan = paintingId === 'qy_gaoshan';
  
  let videoSrc = '/琵琶动画.mp4';
  let bgSrc = '/琵琶动画灰底.jpg';
  
  if (isGuifei) {
    videoSrc = '/晓妆动画.mp4';
    bgSrc = '/晓妆动画灰底.jpg';
  } else if (isGaoshan) {
    videoSrc = '/流水动画.mp4';
    bgSrc = '/流水动画灰底.jpg';
  }

  // 1. Video Autoplay Logic
  useEffect(() => {
    // Try to auto-play when component mounts
    if (videoRef.current) {
      videoRef.current.play().catch(e => console.warn("Video autoplay prevented", e));
    }
  }, []);

  // 2. Web-Native Flashlight Effect (CSS Mask)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    
    setMousePos({ x, y });
  };

  return (
    <div 
      className="tracker-container" 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onTouchMove={handleMouseMove}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--color-bg)',
        overflow: 'hidden',
        cursor: 'crosshair',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Blurred Background Layer to replace black edges */}
      <div 
        style={{
          position: 'absolute',
          top: '-5%',
          left: '-5%',
          width: '110%',
          height: '110%',
          backgroundImage: `url(${bgSrc})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(30px) opacity(0.6)',
          zIndex: 0,
          pointerEvents: 'none'
        }}
      />



      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {/* 底层（彩色层）： 对应动画mp4 */}
        <video
          key={videoSrc}
          ref={videoRef}
          src={videoSrc}
          loop
          muted // Muted to ensure autoplay works on video, we have separate background music
          playsInline
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            pointerEvents: 'none'
          }}
        />

        {/* 顶层（灰度遮罩层）： 覆盖在最上方的灰底 */}
        <div
          className="tracker-grayscale-overlay"
          key={bgSrc}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: `url(${bgSrc})`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            // CSS Masking: Erase the circle at the mouse position to reveal the video underneath.
            // Radius 200px, sharp transition (0% to 85% is fully clear, 85% to 100% is the edge fade)
            WebkitMaskImage: `radial-gradient(circle 200px at ${mousePos.x}% ${mousePos.y}%, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 85%, rgba(0,0,0,1) 100%)`,
            maskImage: `radial-gradient(circle 200px at ${mousePos.x}% ${mousePos.y}%, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 85%, rgba(0,0,0,1) 100%)`,
            pointerEvents: 'none' // Let mouse events pass through to the container
          }}
        />
      </div>
      
      {/* Instructions */}
      <div style={{
        position: 'absolute',
        bottom: 30,
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#EAE5D9',
        fontFamily: 'var(--font-family-serif)',
        textShadow: '0 2px 4px rgba(0,0,0,0.8)',
        letterSpacing: '0.1em',
        pointerEvents: 'none',
        background: 'rgba(0,0,0,0.3)',
        padding: '8px 16px',
        borderRadius: '4px'
      }}>
        移动鼠标，循迹探幽
      </div>
    </div>
  );
};

export default PaintingTracker;
