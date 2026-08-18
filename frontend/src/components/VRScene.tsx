/**
 * VRScene — 3D 虚拟展厅组件
 * 使用 Three.js 渲染，支持 WebXR 降级为鼠标/键盘漫游，再降级为 2D 静态预览
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import type { Annotation } from '../types';
import { ANNOTATION_COLORS } from '../types';
import type { AnnotationType } from '../types';

interface VRSceneConfig {
  painting_panel: {
    width: number;
    height: number;
    center: { x: number; y: number; z: number };
    frame_color: string;
    frame_thickness: number;
  };
  exhibition_hall: {
    ambient_light: number;
    background_color: string;
    fog_density: number;
    fog_color: string;
  };
  camera_start: { x: number; y: number; z: number };
}

interface VRSceneProps {
  imageUrl: string;
  annotations: Annotation[];
  vrConfig: VRSceneConfig | null;
  onAnnotationClick?: (annotationId: string, annotation: Annotation) => void;
}

type RenderMode = '3d' | '2d-fallback';

export default function VRScene({
  imageUrl,
  annotations,
  vrConfig,
  onAnnotationClick,
}: VRSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animIdRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const mouseRef = useRef({ x: 0, y: 0, down: false });
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const [mode, setMode] = useState<RenderMode>('3d');
  const [info, setInfo] = useState('正在初始化 3D 展厅...');

  const init3DScene = useCallback(() => {
    if (!containerRef.current || !vrConfig) return;
    const container = containerRef.current;

    try {
      // 渲染器
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // 场景
      const scene = new THREE.Scene();
      const bgColor = new THREE.Color(vrConfig.exhibition_hall.background_color);
      scene.background = bgColor;
      scene.fog = new THREE.FogExp2(
        vrConfig.exhibition_hall.fog_color,
        vrConfig.exhibition_hall.fog_density
      );
      sceneRef.current = scene;

      // 相机
      const camera = new THREE.PerspectiveCamera(
        60,
        container.clientWidth / container.clientHeight,
        0.1,
        100
      );
      camera.position.set(
        vrConfig.camera_start.x,
        vrConfig.camera_start.y,
        vrConfig.camera_start.z
      );
      cameraRef.current = camera;

      // ─────── 灯光 ───────
      const ambient = new THREE.AmbientLight(0xfff5e0, vrConfig.exhibition_hall.ambient_light);
      scene.add(ambient);

      // 画作聚光灯
      const spotlight = new THREE.SpotLight(0xfff8e7, 2.0, 15, Math.PI / 6, 0.5, 1.5);
      spotlight.position.set(0, 4, -1);
      spotlight.target.position.set(
        vrConfig.painting_panel.center.x,
        vrConfig.painting_panel.center.y,
        vrConfig.painting_panel.center.z
      );
      spotlight.castShadow = true;
      scene.add(spotlight);
      scene.add(spotlight.target);

      // 补光
      const fillLight = new THREE.PointLight(0xffe4c4, 0.3, 20);
      fillLight.position.set(3, 3, 2);
      scene.add(fillLight);

      // ─────── 地板 ───────
      const floorGeom = new THREE.PlaneGeometry(20, 20);
      const floorMat = new THREE.MeshStandardMaterial({
        color: 0x2a1f10,
        roughness: 0.8,
        metalness: 0.1,
      });
      const floor = new THREE.Mesh(floorGeom, floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      // ─────── 墙壁 ───────
      const wallMat = new THREE.MeshStandardMaterial({
        color: 0x3a2a15,
        roughness: 0.9,
        metalness: 0.05,
      });
      // 后墙
      const backWall = new THREE.Mesh(new THREE.PlaneGeometry(20, 6), wallMat);
      backWall.position.set(0, 3, -5);
      scene.add(backWall);
      // 左墙
      const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), wallMat);
      leftWall.position.set(-10, 3, 0);
      leftWall.rotation.y = Math.PI / 2;
      scene.add(leftWall);
      // 右墙
      const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), wallMat);
      rightWall.position.set(10, 3, 0);
      rightWall.rotation.y = -Math.PI / 2;
      scene.add(rightWall);

      // ─────── 画作展板 ───────
      const panel = vrConfig.painting_panel;
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(
        imageUrl,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          const paintMat = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.4,
            metalness: 0.0,
          });
          const paintGeom = new THREE.PlaneGeometry(panel.width, panel.height);
          const paintMesh = new THREE.Mesh(paintGeom, paintMat);
          paintMesh.position.set(panel.center.x, panel.center.y, panel.center.z + 0.01);
          paintMesh.castShadow = true;
          scene.add(paintMesh);

          // 画框
          const frameColor = new THREE.Color(panel.frame_color);
          const frameMat = new THREE.MeshStandardMaterial({
            color: frameColor,
            roughness: 0.5,
            metalness: 0.6,
          });
          const t = panel.frame_thickness;
          const addFrame = (w: number, h: number, x: number, y: number) => {
            const g = new THREE.BoxGeometry(w, h, t);
            const m = new THREE.Mesh(g, frameMat);
            m.position.set(x + panel.center.x, y + panel.center.y, panel.center.z + 0.02);
            scene.add(m);
          };
          addFrame(panel.width + t * 2, t, 0, panel.height / 2 + t / 2);
          addFrame(panel.width + t * 2, t, 0, -panel.height / 2 - t / 2);
          addFrame(t, panel.height, -panel.width / 2 - t / 2, 0);
          addFrame(t, panel.height, panel.width / 2 + t / 2, 0);

          // ─────── 3D 热点 ───────
          annotations.forEach((ann) => {
            const cx = ann.coordinates.x + ann.coordinates.width / 2;
            const cy = ann.coordinates.y + ann.coordinates.height / 2;
            const x3d = panel.center.x + (cx - 0.5) * panel.width;
            const y3d = panel.center.y + (0.5 - cy) * panel.height;
            const z3d = panel.center.z + 0.08;

            const color = ANNOTATION_COLORS[ann.type as AnnotationType] || '#ffffff';
            const sphereGeom = new THREE.SphereGeometry(0.06, 16, 16);
            const sphereMat = new THREE.MeshBasicMaterial({
              color: new THREE.Color(color),
              transparent: true,
              opacity: 0.8,
            });
            const sphere = new THREE.Mesh(sphereGeom, sphereMat);
            sphere.position.set(x3d, y3d, z3d);
            sphere.userData = { annotationId: ann.annotation_id, annotation: ann };
            scene.add(sphere);

            // 光晕
            const glowGeom = new THREE.SphereGeometry(0.1, 16, 16);
            const glowMat = new THREE.MeshBasicMaterial({
              color: new THREE.Color(color),
              transparent: true,
              opacity: 0.2,
            });
            const glow = new THREE.Mesh(glowGeom, glowMat);
            glow.position.copy(sphere.position);
            scene.add(glow);
          });

          setInfo('');
        },
        undefined,
        () => {
          setMode('2d-fallback');
          setInfo('3D 纹理加载失败，已切换为 2D 预览');
        }
      );

      // ─────── 交互控制 ───────
      // 鼠标控制视角
      const onMouseDown = (e: MouseEvent) => {
        mouseRef.current.down = true;
        mouseRef.current.x = e.clientX;
        mouseRef.current.y = e.clientY;
      };
      const onMouseUp = () => { mouseRef.current.down = false; };
      const onMouseMove = (e: MouseEvent) => {
        if (!mouseRef.current.down) return;
        const dx = e.clientX - mouseRef.current.x;
        const dy = e.clientY - mouseRef.current.y;
        yawRef.current -= dx * 0.003;
        pitchRef.current -= dy * 0.003;
        pitchRef.current = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitchRef.current));
        mouseRef.current.x = e.clientX;
        mouseRef.current.y = e.clientY;
      };

      // 键盘 WASD 移动
      const onKeyDown = (e: KeyboardEvent) => keysRef.current.add(e.key.toLowerCase());
      const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());

      // 点击选中热点
      const raycaster = new THREE.Raycaster();
      const mouse2d = new THREE.Vector2();
      const onClick = (e: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse2d.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse2d.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse2d, camera);
        const intersects = raycaster.intersectObjects(scene.children, false);
        for (const hit of intersects) {
          if (hit.object.userData?.annotationId) {
            onAnnotationClick?.(
              hit.object.userData.annotationId,
              hit.object.userData.annotation
            );
            break;
          }
        }
      };

      renderer.domElement.addEventListener('mousedown', onMouseDown);
      renderer.domElement.addEventListener('mouseup', onMouseUp);
      renderer.domElement.addEventListener('mousemove', onMouseMove);
      renderer.domElement.addEventListener('click', onClick);
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);

      // ─────── 动画循环 ───────
      const clock = new THREE.Clock();
      const animate = () => {
        animIdRef.current = requestAnimationFrame(animate);
        const dt = clock.getDelta();
        const speed = 3.0 * dt;

        // WASD 移动
        const keys = keysRef.current;
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        const right = new THREE.Vector3().crossVectors(dir, camera.up).normalize();

        if (keys.has('w')) camera.position.addScaledVector(dir, speed);
        if (keys.has('s')) camera.position.addScaledVector(dir, -speed);
        if (keys.has('a')) camera.position.addScaledVector(right, -speed);
        if (keys.has('d')) camera.position.addScaledVector(right, speed);

        // 应用视角旋转
        const euler = new THREE.Euler(pitchRef.current, yawRef.current, 0, 'YXZ');
        camera.quaternion.setFromEuler(euler);

        // 限制高度
        camera.position.y = Math.max(0.5, Math.min(4, camera.position.y));

        renderer.render(scene, camera);
      };
      animate();

      // 窗口缩放
      const onResize = () => {
        if (!container) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      };
      window.addEventListener('resize', onResize);

      setInfo('3D 展厅已就绪 — 按 WASD 移动，鼠标拖拽旋转视角');

      return () => {
        cancelAnimationFrame(animIdRef.current);
        renderer.domElement.removeEventListener('mousedown', onMouseDown);
        renderer.domElement.removeEventListener('mouseup', onMouseUp);
        renderer.domElement.removeEventListener('mousemove', onMouseMove);
        renderer.domElement.removeEventListener('click', onClick);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('resize', onResize);
        renderer.dispose();
        container.removeChild(renderer.domElement);
      };
    } catch (err) {
      console.error('3D 场景初始化失败:', err);
      setMode('2d-fallback');
      setInfo('3D 渲染不可用，已切换为 2D 预览');
    }
  }, [vrConfig, imageUrl, annotations, onAnnotationClick]);

  useEffect(() => {
    if (mode === '3d') {
      const cleanup = init3DScene();
      return cleanup;
    }
  }, [mode, init3DScene]);

  return (
    <div className="vr-scene-container">
      {info && (
        <div className="vr-info-bar">
          {info}
        </div>
      )}
      {mode === '3d' ? (
        <div ref={containerRef} className="vr-canvas" />
      ) : (
        <div className="vr-fallback">
          <div className="fallback-title">2D 静态预览</div>
          <img src={imageUrl} alt="画作预览" className="fallback-image" />
          <p className="fallback-hint">您的浏览器不支持 3D 渲染，当前为 2D 预览模式</p>
        </div>
      )}
      <div className="vr-controls-hint">
        <span>🎮 WASD 移动</span>
        <span>🖱️ 拖拽旋转</span>
        <span>🔵 点击热点查看详情</span>
      </div>
    </div>
  );
}
