import React, { useMemo } from 'react';
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from 'remotion';

export type ComplexPlaneParams = {
  x: number;
  y: number;
  rotationStartSec: number;
  rotationEndSec: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function fmt(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2);
}

function complexText(re: number, im: number): string {
  const sign = im >= 0 ? '+' : '-';
  return `${fmt(re)} ${sign} ${fmt(Math.abs(im))}i`;
}

function niceTickStep(maxAbs: number): number {
  if (maxAbs <= 3) return 1;
  if (maxAbs <= 10) return 2;
  return 5;
}

type Particle = {
  id: number;
  xOffset: number;
  yOffset: number;
  speed: number;
  radius: number;
  alpha: number;
};

export const ComplexPlane: React.FC<{
  params: ComplexPlaneParams;
}> = ({ params }) => {
  // eslint-disable-line max-lines-per-function
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeSec = frame / fps;

  const x = params.x;
  const y = params.y;
  const targetX = -y;
  const targetY = x;

  const pointRevealEndSec = clamp(params.rotationStartSec - 2.4, 1.5, 7.5);
  const rotateStartSec = Math.max(pointRevealEndSec + 0.6, params.rotationStartSec);
  const rotateEndSec = Math.max(rotateStartSec + 0.35, params.rotationEndSec);
  const settleEndSec = rotateEndSec + 2.4;

  const revealProgress = clamp(timeSec / pointRevealEndSec, 0, 1);
  const ruleProgress = clamp(
    (timeSec - (pointRevealEndSec - 1.2)) /
      Math.max(0.4, rotateStartSec - (pointRevealEndSec - 1.2)),
    0,
    1
  );
  const rotateProgress = clamp(
    (timeSec - rotateStartSec) / Math.max(0.001, rotateEndSec - rotateStartSec),
    0,
    1
  );
  const postProgress = clamp(
    (timeSec - rotateEndSec) / Math.max(0.001, settleEndSec - rotateEndSec),
    0,
    1
  );

  const r = Math.sqrt(x * x + y * y);
  const baseAngle = Math.atan2(y, x);
  const theta = rotateProgress * (Math.PI / 2);

  const current = useMemo(() => {
    if (rotateProgress <= 0) return { x: x * revealProgress, y: y * revealProgress };
    if (rotateProgress >= 1) return { x: targetX, y: targetY };
    const a = baseAngle + theta;
    return { x: r * Math.cos(a), y: r * Math.sin(a) };
  }, [rotateProgress, x, y, revealProgress, targetX, targetY, baseAngle, theta, r]);

  const maxAbs = clamp(
    Math.max(
      Math.abs(x),
      Math.abs(y),
      Math.abs(targetX),
      Math.abs(targetY),
      Math.abs(current.x),
      Math.abs(current.y),
      2
    ),
    2,
    8
  );

  const view = 120;
  const margin = 16;
  const scale = (view - margin) / maxAbs;
  const toSvgX = (vx: number) => vx * scale;
  const toSvgY = (vy: number) => -vy * scale;
  const clampLabelX = (xPos: number, width: number) => clamp(xPos, -view + 4, view - width - 4);
  const clampLabelY = (yPos: number, height: number) => clamp(yPos, -view + 4, view - height - 4);

  const tickStep = niceTickStep(maxAbs);
  const tickMax = Math.max(2, Math.ceil(maxAbs / tickStep) * tickStep);
  const ticks: number[] = [];
  for (let t = -tickMax; t <= tickMax; t += tickStep) ticks.push(t);

  const arcRadiusUnits = clamp(r * 0.68, 1.0, maxAbs);
  const arcRadius = arcRadiusUnits * scale;
  const arcStart = {
    x: arcRadiusUnits * Math.cos(baseAngle),
    y: arcRadiusUnits * Math.sin(baseAngle),
  };
  const arcEnd = {
    x: arcRadiusUnits * Math.cos(baseAngle + theta),
    y: arcRadiusUnits * Math.sin(baseAngle + theta),
  };
  const arcPath = `M ${toSvgX(arcStart.x)} ${toSvgY(arcStart.y)} A ${arcRadius} ${arcRadius} 0 0 1 ${toSvgX(arcEnd.x)} ${toSvgY(arcEnd.y)}`;

  const stageLabel =
    timeSec < pointRevealEndSec
      ? 'Step 1: Plot z'
      : timeSec < rotateStartSec
        ? 'Step 2: Apply rule'
        : timeSec < rotateEndSec
          ? 'Step 3: Rotate +90°'
          : 'Step 4: Read result';

  const stageHint =
    timeSec < pointRevealEndSec
      ? `z = (${fmt(x)}, ${fmt(y)})`
      : timeSec < rotateStartSec
        ? '(x, y) -> (-y, x)'
        : timeSec < rotateEndSec
          ? `Angle: ${Math.round(rotateProgress * 90)}°`
          : `i(${complexText(x, y)}) = ${complexText(targetX, targetY)}`;

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: 22 }, (_, id) => ({
        id,
        xOffset: random(`particle-x:${id}`) * 280,
        yOffset: random(`particle-y:${id}`) * 280,
        speed: 0.45 + random(`particle-speed:${id}`) * 0.75,
        radius: 0.9 + random(`particle-r:${id}`) * 2.6,
        alpha: 0.06 + random(`particle-a:${id}`) * 0.16,
      })),
    []
  );

  const backgroundShiftX = Math.sin(frame / (fps * 1.6)) * 16;
  const backgroundShiftY = Math.cos(frame / (fps * 2.1)) * 12;
  const timelineProgress = clamp(timeSec / Math.max(settleEndSec, 0.1), 0, 1);
  const cameraX = Math.sin(frame / (fps * 1.9)) * 8;
  const cameraY = Math.cos(frame / (fps * 2.4)) * 6;
  const cameraScale = 1 + 0.012 * Math.sin(frame / (fps * 2.8));

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 26,
        backgroundColor: '#040812',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transform: `translate(${cameraX}px, ${cameraY}px) scale(${cameraScale})`,
          transformOrigin: '50% 46%',
        }}
      >
        <svg
          viewBox={`${-view} ${-view} ${view * 2} ${view * 2}`}
          width="100%"
          height="100%"
          style={{
            background: `radial-gradient(900px 640px at ${52 + backgroundShiftX * 0.55}% ${15 + backgroundShiftY * 0.45}%, rgba(56,189,248,0.16), transparent 66%), linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(2,6,23,0.98) 100%)`,
            display: 'block',
          }}
        >
          {particles.map((particle) => {
            const px = ((particle.xOffset + frame * particle.speed * 0.7) % 320) - 160;
            const py = ((particle.yOffset + frame * particle.speed * 0.5) % 320) - 160;
            return (
              <circle
                key={`p-${particle.id}`}
                cx={px}
                cy={py}
                r={particle.radius}
                fill={`rgba(56,189,248,${particle.alpha})`}
              />
            );
          })}

          {ticks.map((t, i) => (
            <g key={`grid-${i}`} opacity={t === 0 ? 0.22 : 0.14}>
              <line
                x1={toSvgX(t)}
                y1={-view}
                x2={toSvgX(t)}
                y2={view}
                stroke="#93a4be"
                strokeWidth={1}
              />
              <line
                x1={-view}
                y1={toSvgY(t)}
                x2={view}
                y2={toSvgY(t)}
                stroke="#93a4be"
                strokeWidth={1}
              />
            </g>
          ))}

          <line
            x1={-view}
            y1={0}
            x2={view}
            y2={0}
            stroke="#e2e8f0"
            strokeWidth={2}
            opacity={0.75}
          />
          <line
            x1={0}
            y1={-view}
            x2={0}
            y2={view}
            stroke="#e2e8f0"
            strokeWidth={2}
            opacity={0.75}
          />

          {ticks
            .filter((t) => t !== 0)
            .map((t) => (
              <g key={`tick-${t}`} opacity={0.78}>
                <text
                  x={toSvgX(t)}
                  y={14}
                  textAnchor="middle"
                  fill="#e2e8f0"
                  fontSize="10"
                  style={{
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  }}
                >
                  {fmt(t)}
                </text>
                <text
                  x={14}
                  y={toSvgY(t) + 3}
                  textAnchor="start"
                  fill="#e2e8f0"
                  fontSize="10"
                  style={{
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  }}
                >
                  {fmt(t)}
                </text>
              </g>
            ))}

          <line
            x1={0}
            y1={0}
            x2={toSvgX(x)}
            y2={toSvgY(y)}
            stroke="#8b5cf6"
            strokeWidth={6}
            opacity={0.28 + revealProgress * 0.22}
            strokeLinecap="round"
          />

          <line
            x1={0}
            y1={0}
            x2={toSvgX(targetX)}
            y2={toSvgY(targetY)}
            stroke="#34d399"
            strokeWidth={5}
            opacity={0.16 + ruleProgress * 0.44}
            strokeDasharray="10 8"
            strokeLinecap="round"
          />

          {rotateProgress > 0.01 ? (
            <path
              d={arcPath}
              stroke="#22d3ee"
              strokeWidth={4}
              fill="none"
              opacity={0.78}
              strokeLinecap="round"
              strokeDasharray={`${Math.max(8, Math.floor(46 * (0.35 + rotateProgress * 0.65)))} 999`}
            />
          ) : null}

          <line
            x1={0}
            y1={0}
            x2={toSvgX(current.x)}
            y2={toSvgY(current.y)}
            stroke="#22d3ee"
            strokeWidth={8}
            strokeLinecap="round"
          />
          <circle cx={toSvgX(current.x)} cy={toSvgY(current.y)} r={7} fill="#22d3ee" />

          <circle cx={toSvgX(x)} cy={toSvgY(y)} r={5.5} fill="#8b5cf6" opacity={0.9} />
          <circle cx={toSvgX(targetX)} cy={toSvgY(targetY)} r={5.5} fill="#34d399" opacity={0.8} />

          <text x={view - 12} y={-10} textAnchor="end" fill="#e2e8f0" fontSize="12" opacity="0.9">
            Re (x)
          </text>
          <text x={10} y={-view + 16} textAnchor="start" fill="#e2e8f0" fontSize="12" opacity="0.9">
            Im (y)
          </text>

          <g opacity={0.96}>
            <g
              transform={`translate(${clampLabelX(toSvgX(x) + 10, 98)}, ${clampLabelY(
                toSvgY(y) - 14,
                28
              )})`}
            >
              <rect
                x={0}
                y={0}
                rx={10}
                ry={10}
                width={98}
                height={28}
                fill="rgba(2,6,23,0.75)"
                stroke="rgba(139,92,246,0.55)"
              />
              <text
                x={10}
                y={19}
                fill="#e2e8f0"
                fontSize="12"
                style={{
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                }}
              >
                z ({fmt(x)},{fmt(y)})
              </text>
            </g>

            {(rotateProgress > 0.08 || postProgress > 0) && (
              <g
                transform={`translate(${clampLabelX(toSvgX(current.x) + 10, 124)}, ${clampLabelY(
                  toSvgY(current.y) - 14,
                  28
                )})`}
              >
                <rect
                  x={0}
                  y={0}
                  rx={10}
                  ry={10}
                  width={124}
                  height={28}
                  fill="rgba(2,6,23,0.78)"
                  stroke="rgba(52,211,153,0.55)"
                />
                <text
                  x={10}
                  y={19}
                  fill="#e2e8f0"
                  fontSize="12"
                  style={{
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  }}
                >
                  i*z ({fmt(current.x)},{fmt(current.y)})
                </text>
              </g>
            )}
          </g>
        </svg>

        <div
          style={{
            position: 'absolute',
            left: 18,
            right: 18,
            top: 14,
            height: 8,
            borderRadius: 999,
            background: 'rgba(148,163,184,0.2)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${(timelineProgress * 100).toFixed(1)}%`,
              background: 'linear-gradient(90deg, #22d3ee 0%, #34d399 100%)',
              borderRadius: 999,
            }}
          />
        </div>

        <div
          style={{
            position: 'absolute',
            left: 18,
            top: 28,
            padding: '10px 12px',
            borderRadius: 14,
            background: 'rgba(2,6,23,0.62)',
            border: '1px solid rgba(148,163,184,0.2)',
            color: '#e2e8f0',
            fontFamily:
              'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
            lineHeight: 1.1,
            backdropFilter: 'blur(6px)',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.2 }}>Multiply by i</div>
          <div style={{ marginTop: 4, fontSize: 13, opacity: 0.95 }}>{stageLabel}</div>
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.82 }}>{stageHint}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
