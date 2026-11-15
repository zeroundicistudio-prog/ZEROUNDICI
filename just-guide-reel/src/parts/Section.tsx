import React from 'react';
import {C, G} from '../theme';
import {clamp} from '../util';

/** Stato completo della vista in sezione in un istante. */
export type SectionState = {
  cam: {cx: number; cy: number; s: number};
  shake: number;            // ampiezza tremolio camera (px)
  fabricX: number;          // spostamento del tessuto (negativo = verso sinistra)
  fabricOpacity: number;
  tipY: number;             // quota della punta (ago dritto)
  bend: number;             // deviazione laterale della punta (px, negativo = sinistra)
  tipStop?: number;         // quota massima raggiungibile dalla punta (placca)
  needleOpacity: number;
  broken: null | {t: number; s: number}; // secondi dalla rottura, punto di rottura (0..1 lungo la lama)
  stubOnly?: boolean;       // mostra solo il moncone (senza pezzo che vola)
  hand: null | {kind: 'pinch' | 'flat'; dx: number; opacity: number};
  pull: number;             // opacità della freccia PULL
  dogLift: number;          // 0..1 sollevamento griffe
  dogX: number;
  spot: null | {x: number; y: number; w: number; h: number; dim: number};
  impact: number;           // 0..1 lampo d'impatto
  rough: number;            // 0..1 evidenzia la bava sulla placca
  thread: null | {snag: number; broken: number}; // filo che si impiglia / si rompe (0..1)
};

export const baseState = (): SectionState => ({
  cam: {cx: 540, cy: 960, s: 1}, shake: 0, fabricX: 0, fabricOpacity: 1,
  tipY: G.TIP_UP, bend: 0, needleOpacity: 1, broken: null,
  hand: null, pull: 0, dogLift: 0, dogX: 0, spot: null, impact: 0, rough: 0, thread: null,
});

const SW = 4; // spessore contorni

// ---------- geometria dell'ago ----------
type P = [number, number];
const bladePoint = (top: number, tipY: number, bend: number, s: number): P => [G.NX + bend * s * s, top + (tipY - top) * s];
const bladeHalfW = (s: number) => (s < 0.8 ? 7 : 7 * (1 - (s - 0.8) / 0.2) + 0.4);

function bladePolygon(top: number, tipY: number, bend: number, s0: number, s1: number) {
  const L: P[] = [], R: P[] = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const s = s0 + (s1 - s0) * (i / N);
    const [x, y] = bladePoint(top, tipY, bend, s);
    const dx = 2 * bend * s, dy = tipY - top;
    const len = Math.hypot(dx, dy);
    const nx = dy / len, ny = -dx / len;
    const w = bladeHalfW(s);
    L.push([x - nx * w, y - ny * w]);
    R.push([x + nx * w, y + ny * w]);
  }
  const pts = [...L, ...R.reverse()];
  return 'M' + pts.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join(' L') + ' Z';
}

/** Volo del pezzo d'ago spezzato: parabola fino a posarsi sulla soletta. */
function flight(t: number, x0: number, y0: number) {
  const vx = 420, vy = -720, g = 3000, landY = 1066;
  const tL = (-vy + Math.sqrt(vy * vy + 2 * g * (landY - y0))) / g;
  if (t < tL) {
    const k = t / tL;
    return {x: x0 + vx * t, y: y0 + vy * t + 0.5 * g * t * t, a: -450 * (1 - Math.pow(1 - k, 1.6))};
  }
  const u = t - tL;
  return {x: x0 + vx * tL + 60 * (1 - Math.exp(-u * 7)), y: landY, a: -450};
}

const Needle: React.FC<{st: SectionState}> = ({st}) => {
  const {tipY, bend, broken} = st;
  const barBottom = tipY - G.SHANK - G.BLADE;
  const top = barBottom + G.SHANK;
  const sB = broken ? broken.s : 1;
  const eye = bladePoint(top, tipY, bend, 0.9);
  const inFab = tipY > G.FAB_TOP;
  // filo: dalla cima, lungo la barra, fino alla cruna
  const thr = `M ${G.NX + 70} -300 L ${G.NX + 58} ${barBottom - 40} L ${G.NX + 16} ${barBottom + 30} ` +
    (broken ? `L ${bladePoint(top, tipY, bend, sB * 0.9)[0] + 10} ${bladePoint(top, tipY, bend, sB * 0.9)[1]}` :
      `Q ${G.NX + 12 + bend * 0.5} ${(barBottom + eye[1]) / 2} ${eye[0] + 2} ${eye[1]}` +
      (inFab && !st.thread ? ` L ${G.NX - 6} ${G.FAB_TOP + 2}` : ''));
  let piece: React.ReactNode = null;
  if (broken && !st.stubOnly) {
    const [bx, by] = bladePoint(top, tipY, bend, sB);
    const f = flight(broken.t, bx, by);
    piece = (
      <g transform={`translate(${f.x - bx} ${f.y - by}) rotate(${f.a} ${bx} ${by})`}>
        <path d={bladePolygon(top, tipY, bend, sB, 1)} fill={C.white} stroke={C.line} strokeWidth={3.5} strokeLinejoin="round" />
      </g>
    );
  }
  return (
    <g opacity={st.needleOpacity}>
      {/* barra ago */}
      <rect x={G.NX - 38} y={-400} width={76} height={barBottom + 400 - 40} fill={C.metal} stroke={C.line} strokeWidth={SW} />
      <rect x={G.NX - 44} y={barBottom - 46} width={88} height={46} rx={6} fill={C.metalDark} stroke={C.line} strokeWidth={SW} />
      {/* gambo */}
      <rect x={G.NX - 17} y={barBottom} width={34} height={G.SHANK} rx={4} fill={C.white} stroke={C.line} strokeWidth={SW} />
      <line x1={G.NX - 17} y1={barBottom + G.SHANK - 18} x2={G.NX + 17} y2={barBottom + G.SHANK - 18} stroke={C.line} strokeWidth={2.5} />
      {/* lama */}
      <path d={bladePolygon(top, tipY, bend, 0, sB)} fill={C.white} stroke={C.line} strokeWidth={3.5} strokeLinejoin="round" />
      {!broken && <ellipse cx={eye[0]} cy={eye[1]} rx={2.6} ry={6} fill={C.line} />}
      <path d={thr} fill="none" stroke={C.red} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
      {piece}
    </g>
  );
};

// ---------- mani ----------
const HandPinch: React.FC = () => (
  <g>
    <path d="M 84 610 L 250 610 C 262 700 266 790 256 870 C 248 930 232 990 222 1040 C 214 1080 209 1104 205 1119
      C 200 1135 181 1135 180 1120 C 179 1092 186 1060 182 1032 C 177 1004 160 988 148 992
      C 138 1012 148 1068 165 1110 C 171 1127 156 1137 145 1127 C 119 1096 96 1040 86 980 C 74 900 70 760 84 610 Z"
      fill={C.skin} stroke={C.line} strokeWidth={SW} strokeLinejoin="round" />
    {/* dita piegate dietro la presa */}
    <path d="M 252 880 C 262 925 248 968 216 978" fill="none" stroke={C.line} strokeWidth={3} strokeLinecap="round" />
    <path d="M 238 958 C 240 990 226 1010 204 1012" fill="none" stroke={C.line} strokeWidth={3} strokeLinecap="round" />
    <path d="M 150 870 C 168 880 176 900 172 925" fill="none" stroke={C.skinShade} strokeWidth={5} strokeLinecap="round" />
    {/* unghie */}
    <path d="M 188 1104 C 194 1108 197 1114 197 1121" fill="none" stroke={C.line} strokeWidth={2.5} strokeLinecap="round" />
    <path d="M 152 1104 C 150 1110 151 1117 155 1122" fill="none" stroke={C.line} strokeWidth={2.5} strokeLinecap="round" />
    <rect x={70} y={576} width={194} height={40} rx={5} fill={C.sleeve} stroke={C.line} strokeWidth={SW} />
  </g>
);

const HandFlat: React.FC = () => (
  <g transform="translate(175 0)">
    <path d="M 1120 978 L 1400 860 L 1400 1000 L 1168 1068 Z" fill={C.sleeve} stroke={C.line} strokeWidth={SW} strokeLinejoin="round" />
    <path d="M 790 1124 C 776 1124 772 1106 788 1101 L 900 1093 C 930 1091 950 1083 968 1069 C 990 1051 1012 1034 1042 1021
      L 1126 988 L 1164 1062 C 1112 1092 1062 1112 1012 1119 L 1000 1124 Z"
      fill={C.skin} stroke={C.line} strokeWidth={SW} strokeLinejoin="round" />
    <path d="M 800 1112 L 905 1108 M 806 1124 L 900 1121" fill="none" stroke={C.line} strokeWidth={2.5} strokeLinecap="round" />
    <path d="M 962 1104 C 942 1090 914 1092 902 1104 C 914 1114 946 1116 962 1110" fill={C.skin} stroke={C.line} strokeWidth={3} strokeLinejoin="round" />
    <path d="M 1040 1060 C 1060 1056 1080 1046 1094 1030" fill="none" stroke={C.skinShade} strokeWidth={5} strokeLinecap="round" />
    <rect x={1110} y={985} width={60} height={86} rx={6} transform="rotate(-22 1140 1028)" fill={C.sleeve} stroke={C.line} strokeWidth={SW} />
  </g>
);

// ---------- vista completa ----------
export const Section: React.FC<{st: SectionState; id: string; t: number}> = ({st, id, t}) => {
  const {cam} = st;
  const shx = st.shake ? Math.sin(t * 97) * st.shake : 0;
  const shy = st.shake ? Math.cos(t * 83) * st.shake * 0.6 : 0;
  const lift = clamp(st.dogLift) * 30;
  const dogTop = 1192 - lift;
  const fx = st.fabricX;
  const stitchPhase = ((fx % G.STITCH) + G.STITCH) % G.STITCH;
  const stitches: number[] = [];
  for (let x = G.NX - 30 + stitchPhase - G.STITCH; x > -1400; x -= G.STITCH) stitches.push(x);
  const teeth: string[] = [];
  for (let x = 286; x < 452; x += 20) teeth.push(`${x},${dogTop + 16} ${x + 5},${dogTop} ${x + 20},${dogTop + 16}`);
  const dogPath = `M 284 ${dogTop + 16} L ` + teeth.join(' L ') + ` L 456 ${dogTop + 16} L 456 1330 L 284 1330 Z`;
  const tipX = G.NX + st.bend;
  const sp = st.spot;
  return (
    <g transform={`translate(${540 + shx} ${960 + shy}) scale(${cam.s}) translate(${-cam.cx} ${-cam.cy})`}>
      <defs>
        <pattern id={`${id}-grid`} width={100} height={100} patternUnits="userSpaceOnUse">
          <rect width={100} height={100} fill={C.bg} />
          {[20, 40, 60, 80].map((v) => (
            <g key={v}><line x1={v} y1={0} x2={v} y2={100} stroke={C.gridMinor} strokeWidth={1.5} /><line x1={0} y1={v} x2={100} y2={v} stroke={C.gridMinor} strokeWidth={1.5} /></g>
          ))}
          <path d="M 0 0 L 100 0 M 0 0 L 0 100" stroke={C.gridMajor} strokeWidth={2.5} />
        </pattern>
        <pattern id={`${id}-hatch`} width={26} height={48} patternUnits="userSpaceOnUse" patternTransform={`translate(${fx} 0)`}>
          <rect width={26} height={48} fill={C.fabric} />
          <line x1={4} y1={40} x2={20} y2={8} stroke={C.fabricDark} strokeWidth={2.5} />
        </pattern>
        <filter id={`${id}-blur`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={34} /></filter>
        {sp && (
          <mask id={`${id}-mask`} maskUnits="userSpaceOnUse" x={-3000} y={-3000} width={8000} height={8000}>
            <rect x={-3000} y={-3000} width={8000} height={8000} fill="white" />
            <rect x={sp.x} y={sp.y} width={sp.w} height={sp.h} rx={40} fill="black" filter={`url(#${id}-blur)`} />
          </mask>
        )}
      </defs>
      <rect x={-2000} y={-2000} width={6000} height={6000} fill={`url(#${id}-grid)`} />

      {/* barra premistoffa */}
      <rect x={270} y={-400} width={110} height={1000} fill={C.metal} stroke={C.line} strokeWidth={SW} />

      {/* piano macchina sotto la placca */}
      <rect x={-2000} y={G.PLATE_BOT} width={6000} height={2000} fill={C.bed} />
      <rect x={210} y={G.PLATE_BOT} width={480} height={160} fill={C.block} stroke={C.metalDark} strokeWidth={3} />
      <rect x={G.HOLE_L - 26} y={G.PLATE_BOT} width={88} height={40} fill={C.metalDark} />

      {/* griffe (trasportatore) */}
      <g transform={`translate(${st.dogX} 0)`}>
        <path d={dogPath} fill={C.plate} stroke={C.line} strokeWidth={SW} strokeLinejoin="round" />
      </g>

      {/* placca ago, interrotta da asola griffe e foro ago */}
      {([[-2000, G.SLOT_L], [G.SLOT_R, G.HOLE_L], [G.HOLE_R, 4000]] as [number, number][]).map(([a, b]) => (
        <rect key={a} x={a} y={G.PLATE_TOP} width={b - a} height={G.PLATE_BOT - G.PLATE_TOP} fill={C.plate} stroke={C.metalDark} strokeWidth={3} />
      ))}
      <rect x={G.HOLE_L - 1} y={G.PLATE_TOP} width={G.HOLE_R - G.HOLE_L + 2} height={G.PLATE_BOT - G.PLATE_TOP} fill="#b3b3bb" />
      <line x1={-2000} y1={G.PLATE_TOP} x2={4000} y2={G.PLATE_TOP} stroke={C.line} strokeWidth={SW} />
      {/* bava sul bordo del foro */}
      <path d={`M ${G.HOLE_L - 2} ${G.PLATE_TOP + 4} l -10 6 l 7 4 l -9 6 l 10 3 l -5 7 l 9 2`} fill="none" stroke={C.line} strokeWidth={3} opacity={0.35 + 0.65 * st.rough} />
      {st.rough > 0 && (
        <circle cx={G.HOLE_L - 6} cy={G.PLATE_TOP + 16} r={26 + 10 * Math.sin(t * 9)} fill="none" stroke={C.red} strokeWidth={4} opacity={st.rough * 0.8} />
      )}

      {/* tessuto + punti */}
      <g opacity={st.fabricOpacity}>
        <rect x={-2000} y={G.FAB_TOP} width={6000} height={G.FAB_H} fill={`url(#${id}-hatch)`} stroke={C.fabricDark} strokeWidth={3} />
        {stitches.map((x) => (
          <rect key={x} x={x} y={G.FAB_TOP - 3} width={24} height={6} rx={3} fill={C.red} />
        ))}
      </g>

      {/* piedino premistoffa */}
      <path d="M 255 540 L 300 540 L 312 520 L 352 520 L 362 540 L 450 540 L 450 600 L 430 640 L 430 780 L 470 830 L 470 900 L 300 900 L 300 700 L 255 660 Z"
        fill={C.white} stroke={C.line} strokeWidth={SW} strokeLinejoin="round" />
      <circle cx={330} cy={590} r={26} fill={C.white} stroke={C.line} strokeWidth={SW} />
      <line x1={314} y1={598} x2={346} y2={582} stroke={C.line} strokeWidth={4} />
      <path d="M 318 880 L 482 880 L 524 940 L 562 1010 L 562 1084 L 338 1084 L 326 990 Z" fill={C.metal} stroke={C.line} strokeWidth={SW} strokeLinejoin="round" />
      <circle cx={502} cy={1044} r={11} fill={C.white} stroke={C.line} strokeWidth={3.5} />
      <path d="M 240 1100 C 240 1086 250 1078 266 1078 L 760 1078 C 822 1076 872 1048 906 984 L 922 990 C 902 1062 862 1112 792 1124 L 262 1124 C 248 1124 240 1114 240 1100 Z"
        fill={C.white} stroke={C.line} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M 600 1098 L 820 1092" stroke={C.metal} strokeWidth={6} strokeLinecap="round" />

      {/* ago */}
      <Needle st={st} />

      {/* filo che si impiglia nella bava e si rompe */}
      {st.thread && (() => {
        const ey = st.tipY - 0.1 * G.BLADE;
        const br = st.thread.broken;
        const bx = G.HOLE_L - 4, by = G.PLATE_TOP + 14;
        const pull = st.thread.snag;
        if (br <= 0) return <path d={`M ${G.NX + 2} ${ey} Q ${G.NX - 4 - 20 * pull} ${by - 20} ${bx + 4 - 6 * pull} ${by} L ${G.NX - 10} ${1420}`} fill="none" stroke={C.red} strokeWidth={4} strokeLinecap="round" />;
        return (
          <g>
            <path d={`M ${G.NX + 2} ${ey} Q ${G.NX - 18} ${ey + 40} ${G.NX - 26 + 10 * Math.sin(br * 6)} ${ey + 70 - 20 * br}`} fill="none" stroke={C.red} strokeWidth={4} strokeLinecap="round" />
            <path d={`M ${bx} ${by + 6 + 160 * br} q 18 30 -4 60 q -20 30 4 70`} fill="none" stroke={C.red} strokeWidth={4} strokeLinecap="round" opacity={1 - br * 0.8} />
            {[0, 1, 2].map((k) => <path key={k} d={`M ${G.NX - 26 + 10 * Math.sin(br * 6)} ${ey + 70 - 20 * br} l ${-8 + 8 * k} ${10 + 3 * k}`} stroke={C.red} strokeWidth={2.5} strokeLinecap="round" />)}
          </g>
        );
      })()}

      {/* mano */}
      {st.hand && (
        <g opacity={st.hand.opacity} transform={`translate(${st.hand.dx} 0)`}>
          {st.hand.kind === 'pinch' ? <g transform="translate(180 0) scale(1.25 1) translate(-180 0)"><HandPinch /></g> : <HandFlat />}
        </g>
      )}

      {/* lampo d'impatto sulla placca */}
      {st.impact > 0 && (
        <g opacity={1 - st.impact} stroke={C.black} strokeWidth={4} strokeLinecap="round">
          {[-150, -115, -65, -30].map((a) => {
            const r0 = 16 + 30 * st.impact, r1 = r0 + 22;
            const ra = (a * Math.PI) / 180;
            return <line key={a} x1={tipX + Math.cos(ra) * r0} y1={G.PLATE_TOP + Math.sin(ra) * r0} x2={tipX + Math.cos(ra) * r1} y2={G.PLATE_TOP + Math.sin(ra) * r1} />;
          })}
        </g>
      )}

      {/* velatura con faretto */}
      {sp && sp.dim > 0 && (
        <rect x={-3000} y={-3000} width={8000} height={8000} fill="#f2f2f5" opacity={sp.dim} mask={`url(#${id}-mask)`} />
      )}

      {/* freccia PULL disegnata nella scena */}
      {st.pull > 0 && (
        <g opacity={st.pull}>
          <path d="M 236 1230 L 112 1230" stroke={C.red} strokeWidth={14} />
          <path d="M 70 1230 L 118 1200 L 118 1260 Z" fill={C.red} />
        </g>
      )}
    </g>
  );
};
