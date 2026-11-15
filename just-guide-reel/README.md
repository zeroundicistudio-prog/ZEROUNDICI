# Just Guide: reel animato (Remotion)

Video verticale 1080×1920, 30 fps, 32 s. Illustrazione vettoriale in sezione di una macchina da cucire,
con etichette sincronizzate alla voce narrante. Copione e struttura seguono il reel di riferimento;
grafica, voce, effetti sonori e marchio sono originali.

## Comandi
```bash
npm install
# solo in questo ambiente cloud: usa il Chromium già installato
export REMOTION_CHROME=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
npm run studio     # anteprima interattiva
npm run render     # -> out/just-guide.mp4
```

## Dove cambiare le cose
| Cosa | File |
|---|---|
| Testo della voce | `voice/lines.txt`, poi `python3 voice/build_voice.py <voce-piper.onnx>` |
| Tempi delle frasi | `target` in `voice/build_voice.py` |
| Etichette (testo, posizione, tempi, colore) | `LABELS` in `src/Video.tsx` |
| Regia delle scene (ago, tessuto, mano, camera) | `stateAt()` in `src/Video.tsx` |
| Disegno della sezione | `src/parts/Section.tsx` |
| Titolo, macchina intera, schermata finale | `src/parts/Overlays.tsx` |
| Marchio finale | `defaultProps` in `src/Root.tsx` (`brand`, `mark`, `tagline`) |
| Colori | `src/theme.ts` |

Voce: Piper TTS, voce `en_US-ryan-high` (https://huggingface.co/rhasspy/piper-voices).
Effetti sonori: generati via codice con `voice/build_sfx.py`.
Font: Inter Display e JetBrains Mono (licenza OFL), inclusi in `public/fonts`.
