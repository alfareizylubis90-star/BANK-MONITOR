import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  color: string;
  glowColor: string;
  alpha: number;
  pulseSpeed: number;
  isHighlight: boolean;
}

const GOLD_PALETTE = [
  { main: '#D4AF37', glow: 'rgba(212, 175, 55, 0.8)' },  // Classic Gold
  { main: '#FFD700', glow: 'rgba(255, 215, 0, 0.9)' },   // Bright Gold
  { main: '#B8962E', glow: 'rgba(184, 150, 46, 0.6)' },  // Soft Gold
  { main: '#FFF4C2', glow: 'rgba(255, 244, 194, 0.9)' }, // White Gold
  { main: '#E6CA65', glow: 'rgba(230, 202, 101, 0.7)' }, // Champagne Gold
];

export const GoldConstellationCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let dpr = window.devicePixelRatio || 1;

    // Determine target particle count based on screen size
    const getParticleCount = (w: number) => {
      if (w < 640) return 45;      // Mobile
      if (w < 1024) return 85;     // Tablet
      return 135;                  // Desktop
    };

    let particles: Particle[] = [];

    const initCanvasSize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);

      // Re-initialize particles to fit screen
      const count = getParticleCount(width);
      particles = [];

      for (let i = 0; i < count; i++) {
        const paletteItem = GOLD_PALETTE[Math.floor(Math.random() * GOLD_PALETTE.length)];
        const isHighlight = Math.random() < 0.18; // ~18% highlight particles
        const baseRadius = isHighlight ? Math.random() * 1.8 + 1.8 : Math.random() * 1.2 + 0.8;

        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          radius: baseRadius,
          baseRadius,
          color: paletteItem.main,
          glowColor: paletteItem.glow,
          alpha: Math.random() * 0.6 + 0.4,
          pulseSpeed: Math.random() * 0.02 + 0.008,
          isHighlight,
        });
      }
    };

    initCanvasSize();

    // Resize Handler
    const handleResize = () => {
      initCanvasSize();
    };

    // Mouse Handler
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = null;
      mouseRef.current.y = null;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // Max distance for connecting network lines
    const maxDistance = width < 640 ? 90 : 125;

    // Animation Loop
    let lastTime = performance.now();

    const render = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      ctx.clearRect(0, 0, width, height);

      // 1. Draw ultra-smooth moving vertical gold-dark gradient
      const timeSec = currentTime * 0.0004;
      const gradY1 = Math.sin(timeSec) * (height * 0.15);
      const gradY2 = height + Math.cos(timeSec * 0.8) * (height * 0.15);

      const verticalGrad = ctx.createLinearGradient(0, gradY1, 0, gradY2);

      // Oscillating color stop positions for continuous vertical fluidity
      const stop1 = 0.15 + Math.sin(timeSec * 0.7) * 0.1;
      const stop2 = 0.50 + Math.cos(timeSec * 0.9) * 0.12;
      const stop3 = 0.82 + Math.sin(timeSec * 0.5) * 0.08;

      verticalGrad.addColorStop(0, '#020202');
      verticalGrad.addColorStop(Math.max(0, Math.min(1, stop1)), 'rgba(25, 20, 8, 0.95)');   // Deep warm gold tone
      verticalGrad.addColorStop(Math.max(0, Math.min(1, stop2)), 'rgba(8, 7, 5, 0.98)');     // Dark charcoal slate
      verticalGrad.addColorStop(Math.max(0, Math.min(1, stop3)), 'rgba(32, 26, 10, 0.92)');  // Soft ambient gold glow
      verticalGrad.addColorStop(1, '#010101');

      ctx.fillStyle = verticalGrad;
      ctx.fillRect(0, 0, width, height);

      // 1b. Ambient radial spotlight following the smooth vertical movement
      const radialY = height * 0.5 + Math.sin(timeSec * 0.6) * (height * 0.3);
      const bgGlow = ctx.createRadialGradient(
        width * 0.5, radialY, 80,
        width * 0.5, radialY, Math.max(width, height) * 0.85
      );
      bgGlow.addColorStop(0, 'rgba(212, 175, 55, 0.12)');
      bgGlow.addColorStop(0.5, 'rgba(15, 12, 5, 0.2)');
      bgGlow.addColorStop(1, 'rgba(0, 0, 0, 0.5)');

      ctx.fillStyle = bgGlow;
      ctx.fillRect(0, 0, width, height);

      // 2. Update and draw network lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];

          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < maxDistance * maxDistance) {
            const dist = Math.sqrt(distSq);
            // Alpha scales inversely with distance (0.05 - 0.32)
            const alpha = (1 - dist / maxDistance) * 0.32;

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(212, 175, 55, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }
      }

      // 3. Update and draw particles
      const mouse = mouseRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move
        p.x += p.vx * (dt * 60);
        p.y += p.vy * (dt * 60);

        // Wrap around boundaries smoothly
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        // Subtle mouse interaction (magnetic attraction/drift)
        if (mouse.x !== null && mouse.y !== null) {
          const mDx = mouse.x - p.x;
          const mDy = mouse.y - p.y;
          const mDistSq = mDx * mDx + mDy * mDy;
          if (mDistSq < 140 * 140 && mDistSq > 1) {
            const mDist = Math.sqrt(mDistSq);
            const force = (1 - mDist / 140) * 0.15;
            p.x += (mDx / mDist) * force;
            p.y += (mDy / mDist) * force;
          }
        }

        // Pulse size and alpha
        p.alpha += Math.sin(currentTime * 0.002 + i) * p.pulseSpeed;
        const currentAlpha = Math.max(0.2, Math.min(0.95, p.alpha));

        ctx.save();
        ctx.globalAlpha = currentAlpha;

        // Particle Glow
        if (p.isHighlight) {
          ctx.shadowBlur = 12;
          ctx.shadowColor = p.glowColor;
        } else {
          ctx.shadowBlur = 4;
          ctx.shadowColor = 'rgba(212, 175, 55, 0.4)';
        }

        // Draw particle node
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 block w-full h-full"
      style={{
        background: '#050505',
      }}
    />
  );
};
