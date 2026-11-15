import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {C, FPS, G, H, W} from './theme';
import {clamp, frac, ip, io} from './util';
import {Section, SectionState, baseState} from './parts/Section';
import {EndCard, FullMachine, Label, LabelSpec, TitleCard} from './parts/Overlays';
import {useFonts} from './fonts';

/** brand: due righe separate da "|"; mark: testo nel quadrato rosso. */
export type VideoProps = {brand: string; mark: string; tagline: string};

// ---------------- ciclo di cucitura ----------------
const MID = (G.TIP_UP + G.TIP_DOWN) / 2, AMP = (G.TIP_DOWN - G.TIP_UP) / 2;
/** Ciclo macchina: ago su/giù, griffe ellittiche, tessuto che avanza a scatti verso sinistra. */
function sew(t: number, t0: number, rate = 1.6, fabric0 = 0) {
  const c = (t - t0) * rate + 0.25;          // fase 0.25 = ago in alto
  const p = frac(c), n = Math.floor(c);
  const tipY = MID - AMP * Math.sin(2 * Math.PI * p);
  const lift = Math.max(0, Math.sin(2 * Math.PI * (p - 0.0)));
  const dogLift = Math.pow(lift, 0.5);
  const dogX = 16 * Math.cos(2 * Math.PI * p);
  const step = p < 0.5 ? io(p * 2) : 1;
  const fabricX = fabric0 - G.STITCH * (n + step - 0.0);
  return {tipY, dogLift, dogX, fabricX};
}

// ---------------- regia: stato della sezione in ogni istante ----------------
function stateAt(t: number): SectionState {
  const s = baseState();

  // S1 0–3.6  Apertura: la mano tira, l'ago si piega e si spezza
  if (t < 3.6) {
    const SNAP = 1.95;
    const tt = Math.min(t, SNAP);
    const rate = 1.282;
    s.tipY = MID - AMP * Math.sin(2 * Math.PI * (tt * rate + 0.25));
    s.fabricX = ip(tt, 0.25, SNAP, 0, -130);
    const inFab = clamp((s.tipY - G.FAB_TOP) / 90);
    s.bend = -inFab * ip(tt, 0.3, SNAP, 18, 62, (x) => x);
    s.hand = {kind: 'pinch', dx: s.fabricX * 0.15, opacity: 1};
    s.pull = clamp((t - 0.25) / 0.2);
    if (t >= SNAP) {
      s.broken = {t: t - SNAP, s: 0.5};
      s.shake = 9 * Math.max(0, 1 - (t - SNAP) / 0.3);
    }
    return s;
  }

  // S2 3.6–7.6  Tirando, il tessuto trascina l'ago che si piega
  if (t < 7.6) {
    s.fabricX = -130 + ip(t, 4.6, 6.6, 0, -110, (x) => x);
    s.tipY = ip(t, 3.85, 5.1, G.TIP_UP, 1240);
    s.bend = -ip(t, 4.7, 6.6, 0, 78);
    s.hand = {kind: 'pinch', dx: s.fabricX * 0.15, opacity: 1};
    s.pull = 1;
    s.spot = {x: 440, y: 720, w: 330, h: 640, dim: ip(t, 3.9, 4.4, 0, 0.62)};
    return s;
  }

  // S3 7.6–12.4  Scende nel posto sbagliato: manca il foro e colpisce la placca
  if (t < 12.4) {
    const HIT = 11.25;
    s.fabricX = -240;
    s.hand = {kind: 'pinch', dx: -36, opacity: 1};
    s.pull = ip(t, 7.6, 7.9, 1, 0);
    const up = ip(t, 7.75, 8.6, 1240, G.TIP_UP);
    const down = ip(t, 9.6, HIT, G.TIP_UP, G.PLATE_TOP + 2, (x) => x * x);
    s.tipY = t < 9.6 ? up : down;
    s.bend = t < 8.6 ? -ip(t, 7.75, 8.6, 78, 52) : -52;
    if (t > HIT) {
      s.bend = -52 - ip(t, HIT, 12.3, 0, 30);
      s.impact = clamp((t - HIT) / 0.35);
      s.shake = 4 * Math.max(0, 1 - (t - HIT) / 0.2);
    }
    s.spot = {x: 410, y: 720, w: 360, h: 640, dim: 0.62};
    return s;
  }

  // S4 12.4–13.6  "Snap."
  if (t < 13.6) {
    const SNAP = 12.5;
    s.fabricX = -240;
    s.hand = {kind: 'pinch', dx: -36, opacity: 1};
    s.tipY = G.PLATE_TOP + 2;
    s.bend = -82;
    s.spot = {x: 410, y: 720, w: 360, h: 640, dim: ip(t, 12.4, 12.6, 0.62, 0)};
    if (t >= SNAP) {
      s.broken = {t: t - SNAP, s: 0.55};
      s.shake = 12 * Math.max(0, 1 - (t - SNAP) / 0.3);
    }
    return s;
  }

  // S5 13.6–17.8  Le griffe muovono il tessuto
  if (t < 17.8) {
    Object.assign(s, sew(t, 13.75, 1.6, -240));
    if (t < 13.75) { s.tipY = G.TIP_UP; }
    s.spot = {x: 230, y: 1060, w: 300, h: 260, dim: ip(t, 13.75, 14.1, 0, 0.62)};
    return s;
  }

  // S6 17.8–19.4  Mani leggere   |  S7a 19.4–21.0  "Just guide"
  if (t < 21.0) {
    Object.assign(s, sew(t, 13.75, 1.6, -240));
    s.cam = {cx: ip(t, 17.8, 18.5, 540, 760), cy: 960, s: 1};
    if (t > 19.4) s.cam.cx = ip(t, 19.4, 20.2, 760, 820);
    s.hand = {kind: 'flat', dx: ip(t, 17.85, 18.3, 120, 0) + Math.sin(t * 2.2) * 5, opacity: clamp((t - 17.85) / 0.25)};
    return s;
  }

  // S8 22.5–24.7  Se l'ago si rompe: ago nuovo
  if (t >= 22.5 && t < 24.7) {
    s.fabricX = -600;
    s.fabricOpacity = 0.55;
    s.tipY = 1060;
    s.broken = {t: 99, s: 0.42};
    s.stubOnly = true;
    s.needleOpacity = 1 - clamp((t - 23.05) / 0.25);
    if (t > 23.3) {
      s.broken = null;
      s.needleOpacity = clamp((t - 23.3) / 0.15);
      s.tipY = ip(t, 23.3, 23.9, 560, G.TIP_UP, (x) => 1 - Math.pow(1 - x, 3));
    }
    s.spot = {x: 380, y: 300, w: 420, h: 1100, dim: 0.5};
    return s;
  }

  // S9 24.7–28.2  Controlla la placca: una bava rompe il filo
  if (t >= 24.7 && t < 28.2) {
    s.fabricX = -600;
    s.fabricOpacity = ip(t, 24.7, 25.05, 0.55, 0);
    s.dogLift = 1; s.dogX = 0;
    s.tipY = G.TIP_UP;
    s.spot = {x: 420, y: 1040, w: 330, h: 320, dim: ip(t, 25.5, 25.9, 0, 0.55)};
    s.rough = clamp((t - 25.85) / 0.3);
    if (t > 26.85) {
      s.tipY = t < 27.75 ? ip(t, 26.85, 27.25, G.TIP_UP, G.TIP_DOWN) : ip(t, 27.75, 28.15, G.TIP_DOWN, G.TIP_UP);
      s.thread = {snag: clamp((t - 27.1) / 0.35), broken: clamp((t - 27.5) / 0.6, 0, 1) * (t > 27.5 ? 1 : 0)};
    }
    return s;
  }
  return s;
}

/** Varianti per lo split screen finale. */
function pullState(t: number): SectionState {
  const s = baseState();
  s.cam = {cx: 700, cy: 1010, s: 0.9};
  s.fabricX = -130 - (t * 60);
  s.tipY = 1240; s.bend = -70;
  s.hand = {kind: 'pinch', dx: s.fabricX * 0.2, opacity: 1};
  s.pull = 1;
  return s;
}
function guideState(t: number): SectionState {
  const s = baseState();
  Object.assign(s, sew(t, 0, 1.6, 0));
  s.cam = {cx: 420, cy: 1010, s: 0.9};
  s.hand = {kind: 'flat', dx: -250 + Math.sin(t * 2.2) * 5, opacity: 1};
  return s;
}

// ---------------- etichette ----------------
const LABELS: LabelSpec[] = [
  {text: 'PULL', x: 366, y: 1230, from: 0.3, to: 7.6, color: 'red', size: 34},
  {text: 'SNAP', x: 750, y: 745, from: 1.95, to: 3.5, color: 'red', size: 58},
  {text: 'THE NEEDLE CAN BEND', x: 340, y: 568, from: 5.55, to: 7.55, color: 'red', size: 30},
  {text: 'HOLE', x: 640, y: 1340, from: 7.95, to: 11.15, color: 'black', size: 28, anchor: [G.NX, G.PLATE_TOP + 40]},
  {text: 'CAN MISS THE HOLE', x: 590, y: 1440, from: 10.05, to: 11.15, color: 'red', size: 32},
  {text: 'METAL PLATE', x: 712, y: 1340, from: 11.2, to: 12.4, color: 'black', size: 28, anchor: [G.NX - 82, G.PLATE_TOP + 8]},
  {text: 'AND HIT THE PLATE', x: 590, y: 1440, from: 11.2, to: 12.4, color: 'red', size: 32},
  {text: 'SNAP', x: 742, y: 693, from: 12.5, to: 13.55, color: 'red', size: 72},
  {text: 'FEED DOGS', x: 300, y: 1400, from: 13.95, to: 15.65, color: 'red', size: 36},
  {text: 'THEY MOVE THE FABRIC', x: 330, y: 1400, from: 15.7, to: 17.75, color: 'green', size: 32},
  {text: 'LIGHT HANDS', x: 480, y: 330, from: 18.3, to: 19.2, color: 'black', size: 40},
  {text: 'JUST GUIDE', x: 480, y: 340, from: 19.45, to: 20.95, color: 'green', size: 62},
  {text: 'THE MACHINE PULLS', x: 480, y: 330, from: 21.1, to: 22.45, color: 'green', size: 44},
  {text: 'BROKEN', x: 230, y: 470, from: 22.6, to: 23.25, color: 'black', size: 36},
  {text: 'NEW NEEDLE', x: 230, y: 470, from: 23.35, to: 24.65, color: 'green', size: 36},
  {text: 'CHECK THE PLATE', x: 480, y: 330, from: 24.9, to: 26.8, color: 'black', size: 44},
  {text: 'ROUGH SPOT', x: 744, y: 1385, from: 25.85, to: 28.15, color: 'black', size: 28, anchor: [G.HOLE_L - 8, G.PLATE_TOP + 16]},
  {text: 'CAN BREAK YOUR THREAD', x: 720, y: 330, from: 26.9, to: 28.15, color: 'red', size: 38},
];
const SPLIT_LABELS: LabelSpec[] = [
  {text: "DON'T PULL", x: 230, y: 450, from: 28.3, to: 32, color: 'red', size: 36},
  {text: 'JUST GUIDE', x: 760, y: 450, from: 29.1, to: 32, color: 'green', size: 36},
];

// confini di scena con dissolvenza "fantasma"
const CUTS = [3.6, 7.6, 13.6, 22.5, 24.7];
const GHOST = 0.4;

// ---------------- effetti sonori ----------------
const SFX: [string, number, number][] = [
  ['pop', 0.3, 0.35], ['snap', 1.95, 0.9], ['pop', 5.55, 0.35], ['pop', 7.95, 0.3], ['pop', 10.05, 0.35],
  ['clink', 11.25, 0.8], ['pop', 11.2, 0.3], ['snap', 12.5, 0.8], ['whoosh', 13.6, 0.35], ['pop', 13.95, 0.35],
  ['pop', 15.7, 0.35], ['whoosh', 17.8, 0.3], ['pop', 18.3, 0.3], ['pop', 19.45, 0.4], ['whoosh', 20.9, 0.45],
  ['pop', 21.1, 0.35], ['whoosh', 22.45, 0.35], ['pop', 22.6, 0.3], ['pop', 23.35, 0.35], ['clink', 23.9, 0.25],
  ['pop', 24.9, 0.35], ['pop', 25.85, 0.3], ['pop', 26.9, 0.35], ['twang', 27.5, 0.7], ['whoosh', 28.2, 0.35],
  ['pop', 28.3, 0.3], ['whoosh', 28.75, 0.35], ['pop', 29.1, 0.35], ['pop', 30.0, 0.45],
];

export const JustGuide: React.FC<VideoProps> = ({brand, mark, tagline}) => {
  useFonts();
  const frame = useCurrentFrame();
  const t = frame / FPS;

  // ghost della scena precedente durante i tagli
  const cut = CUTS.find((c) => t >= c && t < c + GHOST);
  const ghostP = cut !== undefined ? io((t - cut) / GHOST) : 1;

  const showSection = t < 21.0 || (t >= 22.5 && t < 28.2);
  const machineOp = t >= 20.9 && t < 22.6 ? clamp((t - 20.9) / 0.25) * (1 - clamp((t - 22.45) / 0.15)) : 0;
  const split = t >= 28.2;
  const wipe = ip(t, 28.75, 29.15, W, W / 2);

  return (
    <AbsoluteFill style={{backgroundColor: C.bg}}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {showSection && (
          <g>
            {cut !== undefined && <g opacity={1 - ghostP * 0.85}><Section id="ghost" st={stateAt(cut - 1 / FPS)} t={cut} /></g>}
            <g opacity={cut !== undefined ? 0.35 + 0.65 * ghostP : 1}><Section id="main" st={stateAt(t)} t={t} /></g>
          </g>
        )}
        {machineOp > 0 && <g opacity={machineOp}><FullMachine t={t} /></g>}
        {split && (
          <g>
            <defs>
              <clipPath id="clipL"><rect x={0} y={0} width={wipe} height={H} /></clipPath>
              <clipPath id="clipR"><rect x={wipe} y={0} width={W - wipe} height={H} /></clipPath>
            </defs>
            <g clipPath="url(#clipL)"><Section id="pull" st={pullState(t - 28.2)} t={t} /></g>
            <g clipPath="url(#clipR)"><Section id="guide" st={guideState(t - 28.2)} t={t} /></g>
            {t > 28.75 && t < 30.3 && <rect x={wipe - 3} y={0} width={6} height={H} fill={C.white} stroke={C.metalDark} strokeWidth={1.5} />}
            {SPLIT_LABELS.map((l, i) => <Label key={i} {...l} t={t} />)}
          </g>
        )}
        {LABELS.map((l, i) => <Label key={i} {...l} t={t} />)}
        <TitleCard t={t} />
        {t >= 30 && <EndCard t={t - 30} brand={brand} mark={mark} tagline={tagline} />}
      </svg>

      <Audio src={staticFile('voiceover.wav')} />
      {SFX.map(([name, at, vol], i) => (
        <Sequence key={i} from={Math.round(at * FPS)} durationInFrames={FPS}>
          <Audio src={staticFile(`sfx/${name}.wav`)} volume={vol * 0.55} />
        </Sequence>
      ))}
      {/* ronzio della macchina quando cuce regolarmente */}
      {[[13.75, 21.0], [28.2, 30.2]].map(([a, b], i) => (
        <Sequence key={'hum' + i} from={Math.round(a * FPS)} durationInFrames={Math.round((b - a) * FPS)}>
          <Audio src={staticFile('sfx/stitch.wav')} loop volume={(f) => 0.12 * clamp(f / 6) * clamp(((b - a) * FPS - f) / 8)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
