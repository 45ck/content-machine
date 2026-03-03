import React, { useMemo } from 'react';
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from 'remotion';

type Obstacle = {
  id: string;
  lane: number; // -1,0,1
  z0: number; // starting distance (arbitrary units)
  width: number;
  height: number;
  hue: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * A simple, copyright-safe "endless runner" style background.
 * No text, high motion, designed to sit under captions without confusing OCR.
 */
export const RunnerGameplay: React.FC<{
  seed?: number;
}> = ({ seed = 7 }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const t = frame / fps;
  const speed = 1.35; // units per second

  const lanes = [-1, 0, 1];
  const laneW = Math.floor(width * 0.22);
  const roadW = laneW * 3;

  const roadLeft = Math.floor((width - roadW) / 2);
  const horizonY = Math.floor(height * 0.18);
  const roadBottomY = height;

  const obstacles = useMemo<Obstacle[]>(() => {
    const list: Obstacle[] = [];
    for (let i = 0; i < 22; i++) {
      const r = random(`${seed}:${i}`);
      const lane = lanes[Math.floor(r * lanes.length)];
      const z0 = 4 + i * 1.55 + random(`${seed}:z:${i}`) * 0.6;
      const hue = Math.floor(180 + random(`${seed}:h:${i}`) * 110);
      list.push({
        id: `obs-${i}`,
        lane,
        z0,
        width: 0.55 + random(`${seed}:w:${i}`) * 0.45,
        height: 0.55 + random(`${seed}:h2:${i}`) * 0.75,
        hue,
      });
    }
    return list;
  }, [seed]);

  const stripes = useMemo(() => Array.from({ length: 26 }, (_, i) => i), []);

  return (
    <AbsoluteFill style={{ backgroundColor: '#070912' }}>
      {/* Sky */}
      <AbsoluteFill
        style={{
          height: horizonY,
          background:
            'radial-gradient(1200px 600px at 50% 120%, rgba(34,211,238,0.18) 0%, rgba(2,6,23,0.0) 60%), linear-gradient(180deg, #0a1026 0%, #070912 100%)',
        }}
      />

      {/* Mountains / parallax blobs */}
      <AbsoluteFill style={{ top: Math.floor(horizonY * 0.15), height: Math.floor(horizonY * 1.1) }}>
        {Array.from({ length: 7 }, (_, i) => {
          const r = random(`${seed}:m:${i}`);
          const w = Math.floor(width * (0.35 + r * 0.35));
          const h = Math.floor(horizonY * (0.35 + random(`${seed}:mh:${i}`) * 0.55));
          const x = Math.floor((i / 7) * width - w * 0.2 + Math.sin(t * 0.1 + i) * 18);
          const y = Math.floor(horizonY * (0.18 + random(`${seed}:my:${i}`) * 0.35));
          const a = 0.12 + random(`${seed}:ma:${i}`) * 0.1;
          return (
            <div
              key={`m-${i}`}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: w,
                height: h,
                borderRadius: 999,
                background: `linear-gradient(180deg, rgba(148,163,184,${a}) 0%, rgba(2,6,23,0) 100%)`,
                filter: 'blur(2px)',
              }}
            />
          );
        })}
      </AbsoluteFill>

      {/* Road */}
      <AbsoluteFill>
        <div
          style={{
            position: 'absolute',
            left: roadLeft,
            top: horizonY,
            width: roadW,
            height: roadBottomY - horizonY,
            background:
              'linear-gradient(180deg, rgba(15,23,42,0.9) 0%, rgba(2,6,23,0.98) 100%)',
            borderLeft: '2px solid rgba(148,163,184,0.18)',
            borderRight: '2px solid rgba(148,163,184,0.18)',
            overflow: 'hidden',
          }}
        >
          {/* Lane separators */}
          {[-0.5, 0.5].map((p, idx) => (
            <div
              key={`sep-${idx}`}
              style={{
                position: 'absolute',
                left: Math.floor(roadW * (0.5 + p / 3)),
                top: 0,
                width: 2,
                height: '100%',
                background: 'rgba(148,163,184,0.16)',
              }}
            />
          ))}

          {/* Speed stripes */}
          {stripes.map((i) => {
            const z = (i * 0.6 + (t * speed) % 0.6) + 0.2;
            const k = 1 / z;
            const y = interpolate(k, [0.12, 1.2], [horizonY + 20, roadBottomY + 60], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const stripeH = clamp(Math.floor(10 * k), 2, 22);
            const alpha = clamp(0.05 + k * 0.25, 0.05, 0.22);
            const w = clamp(Math.floor(roadW * (0.08 * k)), 6, 60);
            return (
              <div
                key={`s-${i}`}
                style={{
                  position: 'absolute',
                  left: Math.floor(roadW / 2 - w / 2),
                  top: Math.floor(y),
                  width: w,
                  height: stripeH,
                  background: `rgba(226,232,240,${alpha})`,
                  borderRadius: 6,
                  filter: 'blur(0.2px)',
                }}
              />
            );
          })}

          {/* Obstacles */}
          {obstacles.map((o) => {
            const z = o.z0 - t * speed;
            // Wrap forward so obstacles keep coming.
            const zz = z < 0.5 ? z + 22 : z;
            const k = 1 / zz;
            const laneX =
              roadW / 2 + (o.lane * laneW) / 1 - (o.lane === 0 ? 0 : 0); // explicit
            const x = laneX;
            const y = interpolate(k, [0.12, 1.2], [horizonY + 10, roadBottomY + 40], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const size = clamp(220 * k, 18, 180);
            const w = size * o.width;
            const h = size * o.height;
            const alpha = clamp(0.12 + k * 0.75, 0.0, 0.95);
            return (
              <div
                key={o.id}
                style={{
                  position: 'absolute',
                  left: Math.floor(x - w / 2),
                  top: Math.floor(y - h),
                  width: Math.floor(w),
                  height: Math.floor(h),
                  borderRadius: 14,
                  background: `linear-gradient(180deg, hsla(${o.hue}, 90%, 60%, ${alpha}) 0%, hsla(${o.hue}, 90%, 45%, ${alpha}) 100%)`,
                  boxShadow: `0 ${Math.floor(10 * k)}px ${Math.floor(30 * k)}px rgba(0,0,0,0.55)`,
                  border: `1px solid rgba(226,232,240,${clamp(0.06 + k * 0.2, 0.06, 0.22)})`,
                  filter: 'blur(0.15px)',
                  transform: `skewX(${o.lane * 1.3}deg)`,
                }}
              />
            );
          })}
        </div>
      </AbsoluteFill>

      {/* Subtle vignette to anchor focus (kept light to avoid "dark edges" complaint) */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(1200px 1200px at 50% 60%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.22) 100%)',
          opacity: 0.9,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

