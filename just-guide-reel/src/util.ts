import {Easing} from 'remotion';
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const io = Easing.inOut(Easing.cubic);
export const outBack = Easing.out(Easing.back(1.8));
/** interpola t tra [t0,t1] -> [a,b] con easing, bloccato agli estremi */
export const ip = (t: number, t0: number, t1: number, a: number, b: number, e: (x: number) => number = io) =>
  a + (b - a) * e(clamp((t - t0) / (t1 - t0)));
export const frac = (x: number) => x - Math.floor(x);
