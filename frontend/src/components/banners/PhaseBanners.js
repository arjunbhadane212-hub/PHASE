// =============================================================================
// Phase Banners — 6 banner components + 1 default fallback.
// Pure SVG/CSS, no image files or external assets.
// Blue palette only. No purple. No warm tones.
// All banners: viewBox="0 0 375 160", scale to fill container.
// =============================================================================
import React from 'react';

const svgBaseProps = {
  viewBox: '0 0 375 160',
  width: '100%',
  height: '100%',
  preserveAspectRatio: 'xMidYMid slice',
  xmlns: 'http://www.w3.org/2000/svg',
};

// -----------------------------------------------------------------------------
// 1) BannerCircuit — Starter tier
// -----------------------------------------------------------------------------
const CIRCUIT_H_LINES = [20, 40, 60, 80, 100, 120, 140, 158];
const CIRCUIT_NODES = [
  { x: 60,  y: 40  },
  { x: 140, y: 80  },
  { x: 220, y: 60  },
  { x: 300, y: 100 },
  { x: 80,  y: 120 },
  { x: 180, y: 140 },
];

export function BannerCircuit() {
  return (
    <svg {...svgBaseProps} data-banner="starter_circuit">
      <rect x="0" y="0" width="375" height="160" fill="#080C12" />
      {/* 8 dim horizontal lines */}
      {CIRCUIT_H_LINES.map((y) => (
        <line key={`hl-${y}`} x1="0" y1={y} x2="375" y2={y}
          stroke="#3B82F6" strokeOpacity="0.15" strokeWidth="1" />
      ))}
      {/* Connector nodes + short vertical connectors (12px up to adjacent line) */}
      {CIRCUIT_NODES.map((n, i) => (
        <g key={`node-${i}`}>
          <line x1={n.x} y1={n.y - 12} x2={n.x} y2={n.y}
            stroke="#3B82F6" strokeOpacity="0.3" strokeWidth="1" />
          <circle cx={n.x} cy={n.y} r="3"
            fill="#3B82F6" fillOpacity="0.4" />
        </g>
      ))}
      {/* Brighter signal line */}
      <line x1="0" y1="104" x2="375" y2="104"
        stroke="#3B82F6" strokeOpacity="0.6" strokeWidth="1.5" />
    </svg>
  );
}

// -----------------------------------------------------------------------------
// 2) BannerGrid — Starter tier
// -----------------------------------------------------------------------------
const GRID_VANISHING = { cx: 187, cy: 220 };
const GRID_TOP_XS = Array.from({ length: 10 }, (_, i) => (i * 375) / 9);
const GRID_CROSS_YS = [30, 65, 95, 125, 150];
// For each cross Y, compute the visible x-range from the converging lines
function crossLineXRange(y) {
  const { cx, cy } = GRID_VANISHING;
  // Left line: from (0,0) to (cx, cy). At y, x = cx * y / cy
  const xLeft = (cx * y) / cy;
  // Right line: from (375,0) to (cx, cy). At y, x = 375 + (cx - 375) * y / cy
  const xRight = 375 + ((cx - 375) * y) / cy;
  return { xLeft, xRight };
}

export function BannerGrid() {
  return (
    <svg {...svgBaseProps} data-banner="starter_grid">
      <defs>
        <radialGradient id="grid-glow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" stopColor="rgba(59,130,246,0.22)" />
          <stop offset="100%" stopColor="rgba(59,130,246,0)" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="375" height="160" fill="#080C12" />
      {/* 10 converging perspective lines */}
      {GRID_TOP_XS.map((x, i) => (
        <line key={`v-${i}`}
          x1={x} y1={0} x2={GRID_VANISHING.cx} y2={GRID_VANISHING.cy}
          stroke="#3B82F6" strokeOpacity="0.12" strokeWidth="1" />
      ))}
      {/* 5 horizontal cross lines, clipped to converging spread */}
      {GRID_CROSS_YS.map((y) => {
        const { xLeft, xRight } = crossLineXRange(y);
        return (
          <line key={`h-${y}`} x1={xLeft} y1={y} x2={xRight} y2={y}
            stroke="#3B82F6" strokeOpacity="0.10" strokeWidth="0.8" />
        );
      })}
      {/* Convergence glow */}
      <circle cx="187" cy="160" r="80" fill="url(#grid-glow)" />
    </svg>
  );
}

// -----------------------------------------------------------------------------
// 3) BannerVoidFracture — Delta tier
// -----------------------------------------------------------------------------
const VOID_CRACK_PATHS = [
  'M 0 0 L 95 45 L 155 90 L 195 160',   // main
  'M 95 45 L 145 15',                    // branch 1
  'M 155 90 L 220 70',                   // branch 2
  'M 155 90 L 170 130',                  // branch 3
];
const VOID_DOTS = [
  [210,15],[245,38],[268,12],[310,55],[335,30],[290,75],[225,95],[355,80],
  [240,120],[315,105],[280,145],[360,135],[205,155],[330,150],[250,65],
  [345,45],[285,25],[215,140],[295,160],[265,90],[340,110],[220,50],
  [375,65],[295,30],[315,140],[235,155],[345,95],[260,40],[380,120],
  [225,75],[310,20],[270,155],[350,60],[230,105],[285,130],[315,75],
  [240,30],[360,145],[275,110],[325,85],
];

export function BannerVoidFracture() {
  return (
    <svg {...svgBaseProps} data-banner="delta_void">
      <rect x="0" y="0" width="375" height="160" fill="#060A10" />
      {/* Wide glow layer behind cracks */}
      {VOID_CRACK_PATHS.map((d, i) => (
        <path key={`glow-${i}`} d={d}
          fill="none" stroke="#3B82F6" strokeOpacity="0.12"
          strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {/* Crack lines */}
      {VOID_CRACK_PATHS.map((d, i) => (
        <path key={`crack-${i}`} d={d}
          fill="none" stroke="#3B82F6" strokeOpacity="0.75"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {/* Scattered dots on right half */}
      {VOID_DOTS.map(([x, y], i) => (
        <circle key={`dot-${i}`} cx={x} cy={y} r="1"
          fill="#3B82F6" fillOpacity="0.08" />
      ))}
    </svg>
  );
}

// -----------------------------------------------------------------------------
// 4) BannerPulse — Delta tier
// -----------------------------------------------------------------------------
const PULSE_RINGS = [
  { rx: 28,  ry: 18,  o: 0.50, w: 3   },
  { rx: 55,  ry: 34,  o: 0.40, w: 2   },
  { rx: 88,  ry: 55,  o: 0.30, w: 1.5 },
  { rx: 126, ry: 79,  o: 0.22, w: 1.2 },
  { rx: 170, ry: 106, o: 0.15, w: 1   },
  { rx: 218, ry: 136, o: 0.08, w: 0.8 },
];

export function BannerPulse() {
  return (
    <svg {...svgBaseProps} data-banner="delta_pulse">
      <rect x="0" y="0" width="375" height="160" fill="#060A10" />
      {PULSE_RINGS.map((r, i) => (
        <ellipse key={`ring-${i}`} cx="131" cy="96"
          rx={r.rx} ry={r.ry}
          fill="none" stroke="#3B82F6" strokeOpacity={r.o} strokeWidth={r.w} />
      ))}
    </svg>
  );
}

// -----------------------------------------------------------------------------
// 5) BannerApexSignal — Phase tier
// -----------------------------------------------------------------------------
const APEX_BASE_YS = [30, 50, 70, 90, 110, 130, 148];
const APEX_OPACITIES = [0.80, 0.65, 0.50, 0.38, 0.25, 0.16, 0.10];
const APEX_AMPLITUDES = [
  [0,12,28,18,40,22,35,15,42,20,30,18,25,38,12,20],  // front
  [0, 8,20,30,14,35,10,28,18,38,12,25,20,15,30,10],
  [0,15,10,25,35,12,28,20,15,32,22,18,30,10,25,18],
  [0,20,30, 8,25,38,15,22,35,10,28,20,12,30,18,25],
  [0,10,22,35,12,28,40,15,25,18,32,10,20,35, 8,22],
  [0,18,12,30,22,10,35,25,15,38,20,12,28,18,30,15],
  [0, 8,18,12,25,15,20,30,10,22,18,28,12,20,25, 8],  // back
];
// 16 sample points from x=0 to x=375, step 25 (0,25,...,375)
const APEX_XS = Array.from({ length: 16 }, (_, i) => i * 25);

export function BannerApexSignal() {
  return (
    <svg {...svgBaseProps} data-banner="phase_apex">
      <rect x="0" y="0" width="375" height="160" fill="#040810" />
      {APEX_BASE_YS.map((baseY, wi) => {
        const points = APEX_XS.map((x, i) => `${x},${baseY - APEX_AMPLITUDES[wi][i]}`).join(' ');
        return (
          <polyline key={`wave-${wi}`} points={points}
            fill="none" stroke="#3B82F6" strokeOpacity={APEX_OPACITIES[wi]}
            strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        );
      })}
    </svg>
  );
}

// -----------------------------------------------------------------------------
// 6) BannerFractureLight — Phase tier
// -----------------------------------------------------------------------------
export function BannerFractureLight() {
  return (
    <svg {...svgBaseProps} data-banner="phase_fracture">
      <defs>
        <pattern id="fl-scan" patternUnits="userSpaceOnUse" width="2" height="4">
          <rect x="0" y="0" width="2" height="1" fill="#0A0E14" />
        </pattern>
        <linearGradient id="fl-slash-grad" x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%"   stopColor="rgba(191,217,255,0.7)" />
          <stop offset="40%"  stopColor="rgba(255,255,255,0.95)" />
          <stop offset="100%" stopColor="rgba(191,217,255,0.6)" />
        </linearGradient>
        <filter id="fl-glow-blur" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>
      {/* Base black */}
      <rect x="0" y="0" width="375" height="160" fill="#000000" />
      {/* Scanline overlay */}
      <rect x="0" y="0" width="375" height="160" fill="url(#fl-scan)" opacity="0.4" />
      {/* Wider glow behind slash */}
      <path d="M 138 160 L 172 160 L 237 0 L 203 0 Z"
        fill="#3B82F6" fillOpacity="0.35" filter="url(#fl-glow-blur)" />
      {/* Slash */}
      <path d="M 148 160 L 162 160 L 227 0 L 213 0 Z"
        fill="url(#fl-slash-grad)" />
    </svg>
  );
}

// -----------------------------------------------------------------------------
// 7) BannerDefault — fallback (identical to Circuit at 40% opacity, +"PHASE" text)
// -----------------------------------------------------------------------------
export function BannerDefault() {
  // 40% of original opacities: 0.15 → 0.06, 0.4 → 0.16, 0.3 → 0.12
  return (
    <svg {...svgBaseProps} data-banner="default">
      <rect x="0" y="0" width="375" height="160" fill="#080C12" />
      {CIRCUIT_H_LINES.map((y) => (
        <line key={`hl-${y}`} x1="0" y1={y} x2="375" y2={y}
          stroke="#3B82F6" strokeOpacity="0.06" strokeWidth="1" />
      ))}
      {CIRCUIT_NODES.map((n, i) => (
        <g key={`node-${i}`}>
          <line x1={n.x} y1={n.y - 12} x2={n.x} y2={n.y}
            stroke="#3B82F6" strokeOpacity="0.12" strokeWidth="1" />
          <circle cx={n.x} cy={n.y} r="3"
            fill="#3B82F6" fillOpacity="0.16" />
        </g>
      ))}
      {/* Bright signal line removed */}
      {/* "PHASE" watermark */}
      <text x="340" y="148"
        fill="#3B82F6" fillOpacity="0.06"
        fontSize="11" fontWeight="700"
        letterSpacing="3" textAnchor="end"
        fontFamily="inherit">
        PHASE
      </text>
    </svg>
  );
}

// -----------------------------------------------------------------------------
// Component map + display metadata
// -----------------------------------------------------------------------------
export const bannerComponents = {
  starter_circuit: BannerCircuit,
  starter_grid:    BannerGrid,
  delta_void:      BannerVoidFracture,
  delta_pulse:     BannerPulse,
  phase_apex:      BannerApexSignal,
  phase_fracture:  BannerFractureLight,
  default:         BannerDefault,
};

export const BANNER_META = [
  { key: 'starter_circuit', name: 'Circuit',        tier: 'starter' },
  { key: 'starter_grid',    name: 'Grid',           tier: 'starter' },
  { key: 'delta_void',      name: 'Void Fracture',  tier: 'delta'   },
  { key: 'delta_pulse',     name: 'Pulse',          tier: 'delta'   },
  { key: 'phase_apex',      name: 'Apex Signal',    tier: 'phase'   },
  { key: 'phase_fracture',  name: 'Fracture Light', tier: 'phase'   },
];

// Render helper — pick the right component by key, fallback to default
export function PhaseBanner({ bannerKey }) {
  const Comp = bannerComponents[bannerKey] || bannerComponents.default;
  return <Comp />;
}
