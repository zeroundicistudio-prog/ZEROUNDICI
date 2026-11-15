"""Genera la voce narrante (Piper TTS) riga per riga e la posiziona sui tempi del reel di riferimento.
Uso: python3 voice/build_voice.py <percorso_modello_piper.onnx>
Output: public/voiceover.wav, src/timeline.json"""
import json, subprocess, sys, wave, pathlib, numpy as np
ROOT = pathlib.Path(__file__).resolve().parent.parent
model = sys.argv[1]
lines = [l.strip() for l in (ROOT/'voice/lines.txt').read_text().splitlines() if l.strip()]
# tempi di inizio di ogni frase nel reel originale (secondi)
target = [0.15, 3.6, 7.6, 9.8, 12.68, 13.6, 15.7, 17.8, 19.4, 22.5, 24.7, 26.6, 28.2]
SR = 22050
tmp = ROOT/'voice/.tmp'; tmp.mkdir(exist_ok=True)
# Le parole isolate suonano innaturali: le sintetizziamo dentro una frase e teniamo solo l'ultima occorrenza.
LAST_OF = {'Snap.': ('Snap, snap.', 1.15)}

def last_word(a):
    env = np.convolve(np.abs(a), np.ones(441) / 441, 'same') > 400
    edges = np.flatnonzero(np.diff(env.astype(int)))
    starts = edges[::2] + 1
    return a[max(starts[-1] - 600, 0):]

clips, t, out = [], 0.0, []
for i, (txt, st) in enumerate(zip(lines, target)):
    f = tmp/f'{i:02d}.wav'
    src, ls = LAST_OF.get(txt, (txt, 1.0))
    subprocess.run([sys.executable, '-m', 'piper', '-m', model, '--length-scale', str(ls), '-f', str(f)], input=src.encode(), check=True, capture_output=True)
    w = wave.open(str(f)); a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32)
    if txt in LAST_OF: a = last_word(a)
    # rimuove silenzio iniziale/finale
    nz = np.where(np.abs(a) > 300)[0]; a = a[max(nz[0]-200, 0): nz[-1]+400]
    start = max(st, t + 0.15); dur = len(a)/SR; t = start + dur
    clips.append((start, a)); out.append({'text': txt, 'start': round(start, 3), 'end': round(t, 3)})
total = 32.0
mix = np.zeros(int(total*SR), np.float32)
for st, a in clips:
    s = int(st*SR); mix[s:s+len(a)] += a
mix = mix / np.abs(mix).max() * 0.89 * 32767
with wave.open(str(ROOT/'public/voiceover.wav'), 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(mix.astype(np.int16).tobytes())
(ROOT/'src/timeline.json').write_text(json.dumps(out, indent=1))
for o in out: print(o)
