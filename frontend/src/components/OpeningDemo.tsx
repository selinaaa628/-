import React, { useState, useEffect } from 'react';
import './OpeningDemo.css';

interface OpeningDemoProps {
  onComplete: () => void;
}

const OpeningDemo: React.FC<OpeningDemoProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [showText, setShowText] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // 图片飞入的动画间隔，越来越快
    const timings = [1500, 1200, 900, 600, 400, 300];
    
    if (step < 6) {
      const timer = setTimeout(() => {
        setStep(step + 1);
      }, timings[step]);
      return () => clearTimeout(timer);
    } else if (step === 6 && !showText) {
      // 拼合完成后等待 1s，展示水墨文字
      const timer = setTimeout(() => {
        setShowText(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showText && !isFadingOut) {
      // 假设文字展示 3 秒后整个组件淡出
      const timer = setTimeout(() => {
        setIsFadingOut(true);
      }, 3500);
      return () => clearTimeout(timer);
    } else if (isFadingOut) {
      // 等待 1s 淡出动画结束，触发 onComplete 进入选画界面
      const timer = setTimeout(() => {
        onComplete();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [step, showText, isFadingOut, onComplete]);

  // 计算当前的镜头跟随效果
  let cameraTransform = 'scale(1)';
  if (step < 6) {
    const isLeft = step % 2 === 0;
    // 模拟镜头稍微向即将飞入的侧边平移放大
    cameraTransform = `scale(1.05) translateX(${isLeft ? '2%' : '-2%'})`;
  } else {
    // 所有拼完后，全图居中
    cameraTransform = 'scale(1) translateX(0)';
  }

  const pieces = [1, 2, 3, 4, 5, 6];

  return (
    <div className={`opening-overlay ${isFadingOut ? 'fade-out' : ''}`}>
      {/* 背景使用虚化的南华秋水原图 */}
      <div className="opening-blur-bg" style={{ backgroundImage: 'url(/opening/南华秋水.jpg)' }}></div>
      
      <div className="opening-scene-wrapper">
        <div className="opening-scene" style={{ transform: cameraTransform }}>
          <img src="/opening/背景.png" className="opening-base-bg" alt="背景" />
          
          {pieces.map((p, index) => {
            const isLeft = index % 2 === 0; // 1,3,5 从左 (index 0,2,4)，2,4,6 从右 (index 1,3,5)
            const isVisible = step > index;
            let translateClass = '';
            if (!isVisible) {
              translateClass = isLeft ? 'off-left' : 'off-right';
            }
            
            // CSS transition 速度应与 setTimeout 匹配
            const durationMs = [1500, 1200, 900, 600, 400, 300][index] || 300;

            return (
              <img
                key={p}
                src={`/opening/${p}.png`}
                className={`opening-piece ${translateClass}`}
                style={{ transitionDuration: `${durationMs}ms` }}
                alt={`piece-${p}`}
              />
            );
          })}
        </div>
      </div>

      {showText && (
        <div className="opening-text-container">
          {['人', '物', '故', '事', '图', '册'].map((char, i) => (
            <span key={i} className="ink-char" style={{ animationDelay: `${i * 0.3}s` }}>
              {char}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default OpeningDemo;
