"""Genera gli effetti sonori sintetici (nessun file esterno). Output: public/sfx/*.wav"""
import numpy as np, wave, pathlib
SR = 44100
OUT = pathlib.Path(__file__).resolve().parent.parent / 'public/sfx'
rng = np.random.default_rng(11)
def save(name, x):
    x = x / (np.abs(x).max() + 1e-9) * 0.9
    with wave.open(str(OUT / f'{name}.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())
def t(d): return np.arange(int(d * SR)) / SR
def hp(x, a=0.95):  # semplice passa-alto
    y = np.zeros_like(x); 
    for i in range(1, len(x)): y[i] = a * (y[i-1] + x[i] - x[i-1])
    return y
# pop: comparsa etichetta
tt = t(0.09); f = 900 + 900 * np.exp(-tt * 60)
save('pop', np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 45))
# snap: ago che si spezza (click metallico + rumore + risonanza acuta)
tt = t(0.45)
click = hp(rng.standard_normal(len(tt)), 0.98) * np.exp(-tt * 70)
ring = sum(np.sin(2 * np.pi * fr * tt) * np.exp(-tt * d) * g for fr, d, g in [(3150, 14, .5), (4720, 18, .35), (6230, 22, .25), (2010, 11, .3)])
save('snap', click * 1.4 + ring * 0.5)
# clink: punta che colpisce la placca
tt = t(0.3)
save('clink', hp(rng.standard_normal(len(tt)), .97) * np.exp(-tt * 120) + sum(np.sin(2*np.pi*fr*tt)*np.exp(-tt*25) for fr in (2600, 3900, 5200)) * .4)
# whoosh: transizioni
tt = t(0.45); n = rng.standard_normal(len(tt)); env = np.sin(np.pi * tt / tt[-1]) ** 2
y = np.zeros_like(n); 
for i in range(1, len(n)):
    a = 0.6 + 0.35 * (i / len(n)); y[i] = a * y[i-1] + (1 - a) * n[i]
save('whoosh', y * env)
# twang: filo che si rompe
tt = t(0.35); f = 520 * np.exp(-tt * 3)
save('twang', (np.sin(2*np.pi*np.cumsum(f)/SR) + .4*np.sin(2*np.pi*np.cumsum(2.01*f)/SR)) * np.exp(-tt * 12) + hp(rng.standard_normal(len(tt)), .9) * np.exp(-tt*90) * .5)
# stitch: ronzio della macchina (loop 1 s, 1.6 colpi/s gestiti in Remotion)
tt = t(1.0)
hum = (np.sin(2*np.pi*95*tt) + .5*np.sin(2*np.pi*190*tt) + .2*np.sin(2*np.pi*285*tt))
tick = np.zeros_like(tt)
for k in range(2): s = int((k*0.5)*SR); tick[s:s+800] += hp(rng.standard_normal(800), .9) * np.exp(-np.arange(800)/120)
save('stitch', hum * 0.25 + tick)
print(sorted(p.name for p in OUT.iterdir()))
