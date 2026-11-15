import React from 'react';
import {C, F, G} from '../theme';
import {clamp, ip, io, outBack} from '../util';

const COL = {red: C.red, green: C.green, black: C.black};
export type LabelSpec = {
  text: string; x: number; y: number; from: number; to: number;
  color?: keyof typeof COL; size?: number; anchor?: [number, number];
};

/** Etichetta tipo "nastro" con testo monospazio, comparsa a scatto e linea di richiamo opzionale. */
export const Label: React.FC<LabelSpec & {t: number}> = ({t, text, x, y, from, to, color = 'red', size = 40, anchor}) => {
  if (t < from || t > to + 0.2) return null;
  const k = clamp((t - from) / 0.28);
  const sc = 0.55 + 0.45 * outBack(k);
  const op = clamp((t - from) / 0.08) * (1 - clamp((t - to) / 0.14));
  const ls = 0.09;
  const w = text.length * (0.6 + ls) * size - ls * size + size * 1.0;
  const h = size * 1.62;
  const lead = clamp((t - from - 0.12) / 0.2);
  return (
    <g opacity={op}>
      {anchor && (() => {
        const sx = x, sy = anchor[1] < y ? y - h / 2 : y + h / 2;
        const ex = sx + (anchor[0] - sx) * lead, ey = sy + (anchor[1] - sy) * lead;
        return (
          <g>
            <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={C.red} strokeWidth={4} />
            <circle cx={ex} cy={ey} r={9} fill={C.red} stroke={C.white} strokeWidth={3} opacity={lead} />
          </g>
        );
      })()}
      <g transform={`translate(${x} ${y}) scale(${sc})`} style={{filter: 'drop-shadow(0px 5px 6px rgba(20,20,30,0.28))'}}>
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={size * 0.14} fill={COL[color]} />
        <text x={0} y={size * 0.36} textAnchor="middle" fill="#fff" fontFamily={F.mono} fontWeight={800}
          fontSize={size} letterSpacing={`${ls}em`}>{text}</text>
      </g>
    </g>
  );
};

/** Titolo d'apertura con evidenziazione karaoke delle parole. */
export const TitleCard: React.FC<{t: number}> = ({t}) => {
  if (t > 3.75) return null;
  const words: [string, number, string][] = [
    ['STOP', 0, C.black], ['PULLING', 0, C.red], ['YOUR', 0.62, C.black], ['FABRIC', 0.86, C.black],
  ];
  const op = 1 - clamp((t - 3.45) / 0.25);
  const sc = 0.92 + 0.08 * outBack(clamp(t / 0.3));
  const col = (w: [string, number, string]) => (t >= w[1] ? w[2] : '#c3c3c9');
  return (
    <g opacity={op} transform={`translate(480 395) scale(${sc}) translate(-480 -395)`}>
      <rect x={60} y={262} width={842} height={268} rx={16} fill="#f4f4f6" opacity={0.93} style={{filter: 'drop-shadow(0px 6px 10px rgba(20,20,30,0.18))'}} />
      <text fontFamily={F.title} fontWeight={800} fontSize={112} letterSpacing="-0.035em">
        <tspan x={86} y={380} fill={col(words[0])}>STOP </tspan><tspan fill={col(words[1])}>PULLING</tspan>
        <tspan x={86} y={492} fill={col(words[2])}>YOUR </tspan><tspan fill={col(words[3])}>FABRIC</tspan>
      </text>
    </g>
  );
};

/** Illustrazione della macchina intera (generica, senza marchi). */
export const FullMachine: React.FC<{t: number}> = ({t}) => {
  const p = (t * 1.8) % 1;
  const nb = Math.sin(p * Math.PI * 2) * 14;
  const fx = -((t * 1.8 * 30) % 30);
  const stitches: number[] = [];
  for (let x = 160 + fx; x > -60; x -= 30) stitches.push(x);
  const wheelLines = [0, 1, 2, 3].map((k) => ((k / 4 + t * 0.9) % 1));
  return (
    <g>
      <rect width={1080} height={1920} fill={C.bg} />
      <defs>
        <pattern id="fm-grid" width={50} height={50} patternUnits="userSpaceOnUse">
          <path d="M 0 0 L 50 0 M 0 0 L 0 50" stroke={C.gridMinor} strokeWidth={1.5} />
        </pattern>
      </defs>
      <rect width={1080} height={1920} fill="url(#fm-grid)" />
      {/* porta-rocchetti */}
      <rect x={956} y={420} width={14} height={960} fill={C.blue} stroke={C.line} strokeWidth={3} />
      <rect x={560} y={414} width={414} height={16} rx={6} fill={C.blue} stroke={C.line} strokeWidth={3} />
      {[620, 700, 780, 860].map((x) => <circle key={x} cx={x} cy={422} r={6} fill={C.white} stroke={C.line} strokeWidth={2.5} />)}
      <rect x={600} y={700} width={370} height={12} rx={5} fill={C.blue} stroke={C.line} strokeWidth={3} />
      {[680, 840].map((x) => (
        <g key={x}>
          <path d={`M ${x} 700 L ${x - 8} 600 L ${x + 8} 600 Z`} fill={C.white} stroke={C.line} strokeWidth={3} />
          <ellipse cx={x} cy={690} rx={52} ry={10} fill={C.white} stroke={C.line} strokeWidth={3} />
          <path d={`M ${x} 600 L ${x - 60} 430`} stroke={C.red} strokeWidth={3} />
        </g>
      ))}
      <path d="M 620 430 Q 460 520 300 830" fill="none" stroke={C.red} strokeWidth={3} />
      {/* tavolo */}
      <rect x={-20} y={1340} width={1120} height={34} fill={C.white} stroke={C.line} strokeWidth={4} />
      <rect x={60} y={1290} width={820} height={52} rx={8} fill={C.white} stroke={C.line} strokeWidth={4} />
      {/* tessuto che scorre */}
      <rect x={-40} y={1280} width={560} height={12} fill={C.fabric} stroke={C.fabricDark} strokeWidth={2} />
      {stitches.map((x) => <rect key={x} x={x} y={1278} width={18} height={4} rx={2} fill={C.red} />)}
      {/* colonna + braccio */}
      <path d="M 640 1290 L 640 900 Q 640 820 720 820 L 830 820 Q 880 820 880 870 L 880 1290 Z" fill={C.white} stroke={C.line} strokeWidth={4} />
      <rect x={650} y={1190} width={220} height={100} fill={C.blue} stroke={C.line} strokeWidth={4} />
      <rect x={140} y={820} width={740} height={190} rx={50} fill={C.white} stroke={C.line} strokeWidth={4} />
      {/* testa */}
      <rect x={120} y={820} width={200} height={410} rx={36} fill={C.white} stroke={C.line} strokeWidth={4} />
      <circle cx={210} cy={900} r={20} fill={C.metal} stroke={C.line} strokeWidth={3} />
      <circle cx={240} cy={980} r={14} fill={C.metal} stroke={C.line} strokeWidth={3} />
      <rect x={270} y={870 + nb} width={60} height={16} rx={6} fill={C.metal} stroke={C.line} strokeWidth={3} />
      {/* barra ago e piedino */}
      <rect x={196} y={1230} width={20} height={34 + nb} fill={C.metal} stroke={C.line} strokeWidth={3} />
      <line x1={206} y1={1264 + nb} x2={206} y2={1290 + nb} stroke={C.line} strokeWidth={3} />
      <rect x={156} y={1230} width={16} height={46} fill={C.metal} stroke={C.line} strokeWidth={3} />
      <path d="M 140 1276 L 250 1276 Q 262 1276 266 1268" fill="none" stroke={C.line} strokeWidth={5} strokeLinecap="round" />
      {/* pannello comandi */}
      <rect x={420} y={850} width={220} height={120} rx={18} fill={C.blue} stroke={C.line} strokeWidth={4} />
      <rect x={442} y={874} width={90} height={36} rx={5} fill="#1a1d2b" />
      {[[560, 892], [600, 892], [560, 938], [600, 938]].map(([x, y]) => <circle key={x + '' + y} cx={x} cy={y} r={11} fill={C.white} stroke={C.line} strokeWidth={2.5} />)}
      <circle cx={470} cy={942} r={11} fill={C.white} stroke={C.line} strokeWidth={2.5} />
      {/* volantino */}
      <ellipse cx={900} cy={915} rx={42} ry={100} fill={C.blue} stroke={C.line} strokeWidth={4} />
      {wheelLines.map((v, i) => {
        const y = 915 + Math.cos(v * Math.PI * 2) * 86;
        const vis = Math.sin(v * Math.PI * 2) > 0;
        return vis ? <line key={i} x1={872} y1={y} x2={928} y2={y} stroke="#1c2f78" strokeWidth={5} /> : null;
      })}
    </g>
  );
};

/** Schermata finale. */
export const EndCard: React.FC<{t: number; brand: string; mark: string; tagline: string}> = ({t, brand, mark, tagline}) => {
  const k = clamp(t / 0.4);
  const sc = 0.82 + 0.18 * outBack(k);
  const dashes = 4;
  const prog = ip(t, 0.25, 1.6, 0, dashes, (x) => x);
  return (
    <g opacity={clamp(t / 0.15)} transform={`translate(540 834) scale(${sc}) translate(-540 -834)`}>
      <rect x={36} y={324} width={1008} height={1020} rx={20} fill="#efeff2" style={{filter: 'drop-shadow(0px 10px 18px rgba(20,20,30,0.25))'}} />
      <text x={540} y={520} textAnchor="middle" fontFamily={F.title} fontWeight={600} fontSize={92} letterSpacing="-0.04em" fill={C.black}>Don’t pull.</text>
      <text x={540} y={616} textAnchor="middle" fontFamily={F.title} fontWeight={600} fontSize={92} letterSpacing="-0.04em" fill={C.red}>Just guide.</text>
      {Array.from({length: dashes}).map((_, i) => {
        const f = clamp(prog - i);
        return f > 0 ? <rect key={i} x={116 + i * 108} y={694} width={100 * io(f)} height={13} rx={6.5} fill={C.red} stroke="#7d0d13" strokeWidth={2} /> : null;
      })}
      {/* marchio */}
      <g transform="translate(540 952)">
        <rect x={-230} y={-56} width={112} height={112} rx={12} fill={C.red} />
        <text x={-174} y={22} textAnchor="middle" fontFamily={F.mono} fontWeight={800} fontSize={60} fill="#fff">{mark}</text>
        <text x={-98} y={-6} fontFamily={F.title} fontWeight={800} fontSize={58} letterSpacing="-0.02em" fill={C.black}>{brand.split('|')[0]}</text>
        <text x={-98} y={50} fontFamily={F.title} fontWeight={800} fontSize={58} letterSpacing="-0.02em" fill={C.black}>{brand.split('|')[1] ?? ''}<tspan fill={C.red}>.</tspan></text>
      </g>
      <text x={540} y={1172} textAnchor="middle" fontFamily={F.mono} fontWeight={700} fontSize={50} fill={C.black}>{tagline}</text>
    </g>
  );
};

export {G};
