"""Genera la colonna sonora sintetica a partire dai cue esportati dal video.
Uso: python3 build_audio.py zeroundici_v2_cues.json zeroundici_v2.wav DURATA"""
import json, sys, wave
import numpy as np

SR = 48000
rng = np.random.default_rng(11)

def lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc; y[i] = acc
    return y
def hp(x, fc): return x - lp(x, fc)
def env(n, att, dec):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(att, 1e-4)) * np.exp(-t / dec)
def noise(n): return rng.standard_normal(n)
def tone(f, n, ph=0): return np.sin(2 * np.pi * f * np.arange(n) / SR + ph)

def snd_sew(dur):
    n = int(dur * SR); t = np.arange(n) / SR
    ramp = np.minimum(1, t / 0.08) * np.minimum(1, (dur - t) / 0.08)
    f0 = 58 + 6 * np.minimum(1, t / 0.15)
    ph = 2 * np.pi * np.cumsum(f0) / SR
    motor = sum(np.sin(k * ph) / k for k in range(1, 9)) * 0.18
    clicks = np.zeros(n); rate = 19.0
    k = np.arange(int(0.02 * SR))
    clk = (noise(len(k)) * np.exp(-k / (0.004 * SR))) * 0.9 + np.sin(2 * np.pi * 1150 * k / SR) * np.exp(-k / (0.01 * SR)) * 0.5
    clk = hp(clk, 900)
    for c in np.arange(0, dur, 1 / rate):
        i = int(c * SR); j = min(n, i + len(clk)); clicks[i:j] += clk[:j - i] * (0.8 + 0.3 * rng.random())
    whirr = lp(noise(n), 1800) * 0.08 * (1 + 0.5 * np.sin(2 * np.pi * rate * t))
    return (motor + clicks * 0.55 + whirr) * ramp * 0.9
def snd_steam():
    n = int(0.7 * SR); x = hp(noise(n), 2500) * env(n, 0.02, 0.22); return x * 0.22
def snd_glide(dur):
    n = int(dur * SR); t = np.arange(n) / SR
    x = lp(hp(noise(n), 300), 2500) * (0.4 + 0.6 * np.abs(np.cos(t * 4.2)))
    return x * 0.06 * np.minimum(1, t / 0.1) * np.minimum(1, (dur - t) / 0.1)
def snd_rustle():
    n = int(0.35 * SR); x = np.zeros(n)
    for _ in range(40):
        i = rng.integers(0, n - 800); L = rng.integers(150, 700)
        x[i:i + L] += noise(L) * np.exp(-np.arange(L) / (L / 3)) * rng.random()
    return hp(x, 1500) * 0.18
def snd_paper():
    x = snd_rustle(); return np.concatenate([x, snd_rustle() * 0.7]) * 1.2
def snd_clink():
    n = int(0.6 * SR)
    return sum(tone(f, n) * env(n, 0.001, d) * a for f, d, a in [(2150, 0.18, 0.5), (3270, 0.12, 0.35), (4590, 0.08, 0.25)]) * 0.35
def snd_switch():
    n = int(0.08 * SR); x = noise(n) * env(n, 0.0005, 0.004) + tone(1800, n) * env(n, 0.001, 0.012) * 0.5
    return hp(x, 600) * 0.5
def snd_whoosh(dur):
    n = int(dur * SR); t = np.arange(n) / SR
    x = noise(n); y = np.empty(n); acc = 0.0
    for i in range(n):
        fc = 300 + 3500 * np.sin(np.pi * t[i] / dur)
        a = np.exp(-2 * np.pi * fc / SR); acc = (1 - a) * x[i] + a * acc; y[i] = acc
    return y * np.sin(np.pi * t / dur) ** 2 * 0.35
def snd_handle():
    return np.concatenate([snd_switch(), np.zeros(int(0.05 * SR)), snd_switch() * 0.8])
def snd_bell():
    n = int(1.4 * SR)
    one = lambda: sum(tone(f, n) * env(n, 0.001, d) * a for f, d, a in [(1568, 0.5, 0.5), (2093, 0.4, 0.35), (3136, 0.25, 0.2), (4186, 0.15, 0.1)])
    out = np.zeros(n + int(0.13 * SR)); out[:n] += one(); out[int(0.13 * SR):] += one() * 0.7
    return out * 0.32
def snd_close():
    n = int(0.4 * SR); x = tone(70, n) * env(n, 0.002, 0.08) + lp(noise(n), 400) * env(n, 0.001, 0.05)
    return x * 0.5
def snd_step():
    n = int(0.12 * SR); x = tone(110, n) * env(n, 0.002, 0.03) + hp(noise(n), 2000) * env(n, 0.0005, 0.008) * 0.3
    return x * 0.28
def snd_slide():
    n = int(0.35 * SR); t = np.arange(n) / SR
    return lp(noise(n), 900) * np.sin(np.pi * t / 0.35) * 0.25
def snd_chime():
    n = int(1.6 * SR); out = np.zeros(n + int(0.4 * SR))
    for i, f in enumerate([659.3, 830.6, 987.8, 1318.5]):
        s = int(i * 0.08 * SR); out[s:s + n] += (tone(f, n) + 0.3 * tone(f * 2.01, n)) * env(n, 0.003, 0.6) * 0.18
    return out
def snd_beep():
    n = int(0.07 * SR); b = tone(1900, n) * env(n, 0.002, 0.2) * np.minimum(1, (n - np.arange(n)) / 200)
    return np.concatenate([b, np.zeros(int(0.05 * SR)), b, np.zeros(int(0.06 * SR)), tone(2500, int(0.16 * SR)) * env(int(0.16 * SR), 0.002, 0.08)]) * 0.25
def snd_hit():
    n = int(2.0 * SR); t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * (45 + 40 * np.exp(-t * 8)) * t) * env(n, 0.003, 0.6)
    return (boom * 0.55 + lp(noise(n), 1200) * env(n, 0.01, 0.25) * 0.12)
def music(dur):
    # sottofondo morbido: pad minore + pulsazione leggera (90 bpm)
    n = int(dur * SR); t = np.arange(n) / SR
    chords = [[110, 164.8, 261.6, 329.6], [87.3, 130.8, 261.6, 349.2], [98, 146.8, 246.9, 293.7], [110, 164.8, 246.9, 329.6]]
    out = np.zeros(n); bar = 60 / 90 * 4
    for i, ch in enumerate(chords * 4):
        s = int(i * bar * SR)
        if s >= n: break
        L = min(n - s, int((bar + 0.6) * SR)); tt = np.arange(L) / SR
        e = np.minimum(1, tt / 0.6) * np.minimum(1, (bar + 0.6 - tt) / 0.6)
        out[s:s + L] += sum(np.sin(2 * np.pi * f * tt) * (0.5 if j == 0 else 0.25) for j, f in enumerate(ch)) * e * 0.05
    beat = 60 / 90
    for b in np.arange(0, dur, beat):
        s = int(b * SR); L = min(n - s, int(0.25 * SR)); tt = np.arange(L) / SR
        out[s:s + L] += np.sin(2 * np.pi * (55 + 30 * np.exp(-tt * 30)) * tt) * np.exp(-tt / 0.09) * 0.12
    fade = np.minimum(1, t / 1.0) * np.minimum(1, (dur - t) / 1.2)
    return lp(out, 2500) * fade

def main():
    cues = json.load(open(sys.argv[1])); dur = float(sys.argv[3])
    n = int(dur * SR) + SR; mix = np.zeros(n)
    def add(x, t, g=1.0):
        i = int(t * SR); j = min(n, i + len(x)); mix[i:j] += x[:j - i] * g
    for c in cues:
        ty, t = c['type'], c['t']
        if ty == 'room': add(lp(noise(int(dur * SR)), 500) * 0.012, 0)
        elif ty == 'music': add(music(dur), 0, 0.9)
        elif ty == 'sew': add(snd_sew(c['dur']), t)
        elif ty == 'glide': add(snd_glide(c['dur']), t)
        elif ty == 'whoosh': add(snd_whoosh(c['dur']), t)
        else: add(globals()['snd_' + ty](), t)
    mix = mix[:int(dur * SR)]
    mix = np.tanh(mix * 1.2) / np.tanh(1.2)
    mix *= 0.89 / max(1e-6, np.abs(mix).max())
    st = np.stack([mix, mix], 1)
    pcm = (st * 32767).astype('<i2')
    with wave.open(sys.argv[2], 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print('audio:', sys.argv[2], dur, 's')
main()
