import {useEffect, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';
const faces: [string, string, string][] = [
  ['InterDisplay', 'fonts/InterDisplay-ExtraBold.otf', '800'],
  ['InterDisplay', 'fonts/InterDisplay-SemiBold.otf', '600'],
  ['JetBrainsMono', 'fonts/JetBrainsMono-Bold.ttf', '700'],
  ['JetBrainsMono', 'fonts/JetBrainsMono-ExtraBold.ttf', '800'],
];
let loading: Promise<unknown> | null = null;
/** Carica i font inclusi in public/fonts prima di renderizzare il fotogramma. */
export const useFonts = () => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    loading ??= Promise.all(faces.map(([fam, file, weight]) => {
      const f = new FontFace(fam, `url(${staticFile(file)})`, {weight});
      document.fonts.add(f);
      return f.load();
    }));
    loading.then(() => continueRender(handle)).catch((e) => { console.error(e); continueRender(handle); });
  }, [handle]);
};
