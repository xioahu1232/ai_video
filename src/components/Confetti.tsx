'use client';

import { useEffect, useCallback, useRef } from 'react';

/**
 * 精美礼花动效组件
 * 
 * 使用 Canvas 绘制高质量的礼花效果
 * 支持多种形状：圆形、方形、星形、心形
 * 包含物理效果：重力、阻力、旋转
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  shape: 'circle' | 'square' | 'star' | 'heart' | 'ribbon';
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  gravity: number;
  drag: number;
  wobble: number;
  wobbleSpeed: number;
}

interface ConfettiProps {
  isActive: boolean;
  duration?: number;
  particleCount?: number;
  colors?: string[];
  onComplete?: () => void;
}

// 品牌配色方案
const BRAND_COLORS = [
  '#1a3a6b', // 深蓝
  '#4fa3d1', // 天蓝
  '#2563eb', // 蓝色
  '#60a5fa', // 浅蓝
  '#f59e0b', // 琥珀
  '#fbbf24', // 黄色
  '#ec4899', // 粉色
  '#10b981', // 绿色
  '#8b5cf6', // 紫色
  '#ef4444', // 红色
];

export default function Confetti({
  isActive,
  duration = 4000,
  particleCount = 150,
  colors = BRAND_COLORS,
  onComplete,
}: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);

  // 创建单个粒子
  const createParticle = useCallback((canvasWidth: number, canvasHeight: number): Particle => {
    const shapes: Particle['shape'][] = ['circle', 'square', 'star', 'heart', 'ribbon'];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    
    // 从底部发射
    const x = Math.random() * canvasWidth;
    const y = canvasHeight + 10;
    
    // 向上的速度，带有随机偏移
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
    const velocity = 12 + Math.random() * 8;
    
    return {
      x,
      y,
      vx: Math.cos(angle) * velocity + (Math.random() - 0.5) * 4,
      vy: Math.sin(angle) * velocity,
      size: 6 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      opacity: 1,
      gravity: 0.15 + Math.random() * 0.1,
      drag: 0.98,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.05 + Math.random() * 0.05,
    };
  }, [colors]);

  // 绘制星形
  const drawStar = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const px = Math.cos(angle) * size;
      const py = Math.sin(angle) * size;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // 绘制心形
  const drawHeart = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    ctx.moveTo(0, size * 0.3);
    ctx.bezierCurveTo(-size, -size * 0.3, -size * 0.5, -size, 0, -size * 0.5);
    ctx.bezierCurveTo(size * 0.5, -size, size, -size * 0.3, 0, size * 0.3);
    ctx.fill();
    ctx.restore();
  };

  // 绘制彩带
  const drawRibbon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number, wobble: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    ctx.moveTo(-size, 0);
    ctx.quadraticCurveTo(0, Math.sin(wobble) * size * 0.5, size, 0);
    ctx.quadraticCurveTo(0, Math.sin(wobble + 1) * size * 0.5, -size, 0);
    ctx.fill();
    ctx.restore();
  };

  // 绘制粒子
  const drawParticle = (ctx: CanvasRenderingContext2D, particle: Particle) => {
    ctx.save();
    ctx.globalAlpha = particle.opacity;
    ctx.fillStyle = particle.color;

    switch (particle.shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'square':
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
        ctx.restore();
        break;
      case 'star':
        drawStar(ctx, particle.x, particle.y, particle.size / 2, particle.rotation);
        break;
      case 'heart':
        drawHeart(ctx, particle.x, particle.y, particle.size / 2, particle.rotation);
        break;
      case 'ribbon':
        drawRibbon(ctx, particle.x, particle.y, particle.size * 1.5, particle.rotation, particle.wobble);
        break;
    }

    // 添加光泽效果
    if (particle.shape === 'circle' || particle.shape === 'square') {
      ctx.globalAlpha = particle.opacity * 0.3;
      ctx.fillStyle = '#ffffff';
      if (particle.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(particle.x - particle.size * 0.15, particle.y - particle.size * 0.15, particle.size * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  };

  // 更新粒子
  const updateParticle = (particle: Particle): boolean => {
    particle.vy += particle.gravity;
    particle.vx *= particle.drag;
    particle.vy *= particle.drag;
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.rotation += particle.rotationSpeed;
    particle.wobble += particle.wobbleSpeed;
    
    // 缓慢降低透明度
    particle.opacity *= 0.995;
    
    return particle.opacity > 0.01;
  };

  // 动画循环
  const animate = useCallback((canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const elapsed = Date.now() - startTimeRef.current;
    
    // 持续发射新粒子
    if (elapsed < duration * 0.6) {
      const newParticles = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < newParticles; i++) {
        particlesRef.current.push(createParticle(canvas.width, canvas.height));
      }
    }

    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 更新和绘制粒子
    particlesRef.current = particlesRef.current.filter(particle => {
      const alive = updateParticle(particle);
      if (alive) {
        drawParticle(ctx, particle);
      }
      return alive;
    });

    // 继续动画或结束
    if (elapsed < duration || particlesRef.current.length > 0) {
      animationRef.current = requestAnimationFrame(() => animate(canvas, ctx));
    } else {
      onComplete?.();
    }
  }, [duration, createParticle, onComplete]);

  // 启动动画
  useEffect(() => {
    if (!isActive || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布大小
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // 重置状态
    particlesRef.current = [];
    startTimeRef.current = Date.now();

    // 开始动画
    animate(canvas, ctx);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, animate]);

  // 窗口大小变化时更新画布
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}

// 简化的触发函数，用于外部调用
export function triggerConfetti() {
  const event = new CustomEvent('confetti-trigger');
  window.dispatchEvent(event);
}

// 用于监听礼花事件的 Hook
export function useConfettiTrigger(callback: () => void) {
  useEffect(() => {
    const handleTrigger = () => callback();
    window.addEventListener('confetti-trigger', handleTrigger);
    return () => window.removeEventListener('confetti-trigger', handleTrigger);
  }, [callback]);
}
