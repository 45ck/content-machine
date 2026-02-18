import React, { useMemo } from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

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

function niceTickStep(maxAbs: number): number {
  if (maxAbs <= 3) return 1;
  if (maxAbs <= 6) return 1;
  if (maxAbs <= 10) return 2;
  return 5;
}

export const ComplexPlane: React.FC<{
  params: ComplexPlaneParams;
}> = ({ params }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const startF = Math.round(params.rotationStartSec * fps);
  const endF = Math.max(startF + 1, Math.round(params.rotationEndSec * fps));

  const theta = interpolate(frame, [startF, endF], [0, Math.PI / 2], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const x = params.x;
  const y = params.y;
  const rotatedX = -y;
  const rotatedY = x;
  const r = Math.sqrt(x * x + y * y);

  const vec = useMemo(() => {
    // Rotate (x,y) continuously from its original to 90 degrees CCW.
    const base = Math.atan2(y, x);
    const a = base + theta;
    return { x: r * Math.cos(a), y: r * Math.sin(a) };
  }, [x, y, theta, r]);

  // IMPORTANT: during rotation, components can reach +/-r even if max(|x|,|y|) is smaller.
  // If we don't include r, the endpoint circle can clip at the SVG bounds.
  const maxAbs = clamp(
    Math.max(Math.abs(x), Math.abs(y), Math.abs(rotatedX), Math.abs(rotatedY), Math.abs(r), 2),
    2,
    6
  );
  const view = 120; // half-size of viewBox units
  // Leave a safety margin so endpoint circles/labels never clip against the SVG bounds.
  const margin = 14;
  const scale = (view - margin) / maxAbs;

  const cx = 0;
  const cy = 0;

  const toSvgX = (vx: number) => cx + vx * scale;
  const toSvgY = (vy: number) => cy - vy * scale;

  const tickStep = niceTickStep(maxAbs);
  const tickMax = Math.max(2, Math.ceil(maxAbs / tickStep) * tickStep);
  const ticks: number[] = [];
  for (let t = -tickMax; t <= tickMax; t += tickStep) ticks.push(t);

  const baseAngle = Math.atan2(y, x);
  const arcRadiusUnits = clamp(Math.sqrt(x * x + y * y) * 0.75, 0.9, maxAbs);
  const arcRadius = arcRadiusUnits * scale;
  const arcStart = { x: arcRadiusUnits * Math.cos(baseAngle), y: arcRadiusUnits * Math.sin(baseAngle) };
  const arcEnd = { x: arcRadiusUnits * Math.cos(baseAngle + theta), y: arcRadiusUnits * Math.sin(baseAngle + theta) };
  const arcSweep = theta > 0 ? 1 : 0;
  const arcLarge = theta > Math.PI ? 1 : 0;
  const arcPath = `M ${toSvgX(arcStart.x)} ${toSvgY(arcStart.y)} A ${arcRadius} ${arcRadius} 0 ${arcLarge} ${arcSweep} ${toSvgX(arcEnd.x)} ${toSvgY(arcEnd.y)}`;

  const phase = frame < startF ? 0 : frame <= endF ? 1 : 2;
  const progress = clamp((frame - startF) / Math.max(1, endF - startF), 0, 1);
  const headerOpacity = interpolate(frame, [0, Math.max(1, startF - fps * 0.5)], [1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const explainOpacity = interpolate(frame, [startF - fps * 0.5, startF, endF, endF + fps * 0.75], [0, 1, 1, 0.9], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const mappingOpacity = interpolate(frame, [endF - fps * 0.5, endF, endF + fps * 1.5], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 26,
        backgroundColor: '#05070b',
      }}
    >
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <svg
          viewBox={`${-view} ${-view} ${view * 2} ${view * 2}`}
          width="100%"
          height="100%"
          style={{
            background: 'linear-gradient(180deg, rgba(15,23,42,0.92) 0%, rgba(2,6,23,0.94) 100%)',
            borderRadius: 0,
            border: 'none',
            display: 'block',
          }}
        >
          {/* Grid */}
          {ticks.map((t, i) => (
            <g key={`grid-${i}`} opacity={t === 0 ? 0.2 : 0.14}>
              <line x1={toSvgX(t)} y1={-view} x2={toSvgX(t)} y2={view} stroke="#94a3b8" strokeWidth={1} />
              <line x1={-view} y1={toSvgY(t)} x2={view} y2={toSvgY(t)} stroke="#94a3b8" strokeWidth={1} />
            </g>
          ))}

          {/* Axes */}
          <line x1={-view} y1={0} x2={view} y2={0} stroke="#e2e8f0" strokeWidth={2} opacity={0.65} />
          <line x1={0} y1={-view} x2={0} y2={view} stroke="#e2e8f0" strokeWidth={2} opacity={0.65} />

          {/* Tick labels */}
          {ticks
            .filter((t) => t !== 0)
            .map((t) => (
              <g key={`tick-${t}`} opacity={0.72}>
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

          {/* Original vector (faint) */}
          <line
            x1={0}
            y1={0}
            x2={toSvgX(x)}
            y2={toSvgY(y)}
            stroke="#a78bfa"
            strokeWidth={6}
            opacity={0.25}
            strokeLinecap="round"
          />

          {/* Rotation arc */}
          {phase >= 1 ? (
            <path
              d={arcPath}
              stroke="#22d3ee"
              strokeWidth={4}
              fill="none"
              opacity={0.65}
              strokeLinecap="round"
              strokeDasharray={`${Math.max(8, Math.floor(44 * (0.35 + progress * 0.65)))} 999`}
            />
          ) : null}

          {/* Rotating vector */}
          <line x1={0} y1={0} x2={toSvgX(vec.x)} y2={toSvgY(vec.y)} stroke="#22d3ee" strokeWidth={8} strokeLinecap="round" />
          <circle cx={toSvgX(vec.x)} cy={toSvgY(vec.y)} r={7} fill="#22d3ee" />

          {/* Final point marker (faint) */}
          <circle cx={toSvgX(rotatedX)} cy={toSvgY(rotatedY)} r={7} fill="#34d399" opacity={0.35} />

          {/* Labels */}
          <text x={view - 12} y={-10} textAnchor="end" fill="#e2e8f0" fontSize="12" opacity="0.8">
            Re (x)
          </text>
          <text x={10} y={-view + 16} textAnchor="start" fill="#e2e8f0" fontSize="12" opacity="0.8">
            Im (y)
          </text>

          {/* Point labels */}
          <g opacity={0.95}>
            {/* z label */}
            <g transform={`translate(${toSvgX(x) + 10}, ${toSvgY(y) - 14})`}>
              <rect x={0} y={0} rx={10} ry={10} width={96} height={28} fill="rgba(2,6,23,0.75)" stroke="rgba(167,139,250,0.55)" />
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

            {/* iz label */}
            {phase >= 2 ? (
              <g transform={`translate(${toSvgX(rotatedX) + 10}, ${toSvgY(rotatedY) - 14})`} opacity={mappingOpacity}>
                <rect x={0} y={0} rx={10} ry={10} width={110} height={28} fill="rgba(2,6,23,0.75)" stroke="rgba(52,211,153,0.55)" />
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
                  iz ({fmt(rotatedX)},{fmt(rotatedY)})
                </text>
              </g>
            ) : null}
          </g>
        </svg>

        {/* Avoid a full-width "HUD" that reads like debug UI. Use smaller callouts. */}
        <div
          style={{
            position: 'absolute',
            left: 18,
            top: 18,
            padding: '10px 12px',
            borderRadius: 14,
            background: 'rgba(2,6,23,0.62)',
            border: '1px solid rgba(148,163,184,0.18)',
            color: '#e2e8f0',
            fontFamily:
              'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
            lineHeight: 1.1,
            opacity: headerOpacity,
            backdropFilter: 'blur(6px)',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.2 }}>Multiply by i</div>
          <div style={{ marginTop: 4, fontSize: 13, opacity: 0.88 }}>rotates 90 deg (CCW)</div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 18,
            bottom: 18,
            maxWidth: '86%',
            padding: '12px 14px',
            borderRadius: 16,
            background: 'rgba(2,6,23,0.68)',
            border: '1px solid rgba(148,163,184,0.18)',
            color: '#e2e8f0',
            opacity: explainOpacity,
            backdropFilter: 'blur(6px)',
          }}
        >
          <div
            style={{
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            z = x + y i
          </div>

          <div
            style={{
              marginTop: 6,
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: 14,
              opacity: 0.95,
            }}
          >
            i * z = i(x + y i) = i x + i^2 y = -y + x i
          </div>

          <div style={{ marginTop: 8, opacity: mappingOpacity }}>
            <div
              style={{
                display: 'inline-block',
                padding: '6px 10px',
                borderRadius: 999,
                background: 'rgba(34,211,238,0.14)',
                border: '1px solid rgba(34,211,238,0.35)',
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                fontSize: 15,
                fontWeight: 800,
              }}
            >
              (x, y) -&gt; (-y, x)
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

