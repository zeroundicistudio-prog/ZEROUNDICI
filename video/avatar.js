/* =========================================================
   AVATAR ZEROUNDICI – omino "clay" a tubi morbidi (rubber hose)
   Natura del personaggio:
   - testa = sfera grande con sfumatura radiale (luce in alto a sx)
   - busto = capsula sottile, poco più spessa degli arti
   - arti = tubi di spessore costante che si piegano a curva
     (nessun gomito/ginocchio spigoloso), estremità arrotondate
   - piedi = piccolo "L" arrotondato, mani = pallina
   - ombra di contatto morbida a terra
   - volto minimo: sopracciglia, occhi ovali, bocca a linea
   - toni: protagonista chiaro, secondari grigi, sfondo scuri
   ========================================================= */
(function (global) {
  const TONES = {
    light: {base: '#e9e9ec', hi: '#ffffff', lo: '#a7a7ae', line: '#2a2a30'},
    grey: {base: '#a3a3a9', hi: '#cfcfd4', lo: '#6b6b72', line: '#25252a'},
    dark: {base: '#2c2c31', hi: '#4a4a52', lo: '#151518', line: '#000'}
  };
  const lerp = (a, b, k) => a + (b - a) * k;
  function mixHex(a, b, k) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = sh => Math.round(lerp((pa >> sh) & 255, (pb >> sh) & 255, k));
    return '#' + ((1 << 24) + (ch(16) << 16) + (ch(8) << 8) + ch(0)).toString(16).slice(1);
  }
  function mixTone(A, B, k) { const o = {}; for (const key in A) o[key] = mixHex(A[key], B[key], k); return o; }
  // geometria condivisa: dove stanno anca e spalla per una data posa
  function skeleton(o) {
    const s = o.s || 1, dir = o.dir || 1, U = 360 * s;
    const P = Object.assign({hipY: 0, lean: 0}, o.pose || {});
    const hip = [o.x, o.y - 0.52 * U * 0.985 + P.hipY * U];
    const sh = [hip[0] + Math.sin(P.lean) * 0.25 * U * dir, hip[1] - Math.cos(P.lean) * 0.25 * U];
    return {U, dir, hip, sh};
  }
  // posa del braccio per portare la mano in un punto del mondo
  function reach(o, wx, wy) { const k = skeleton(o); return [(wx - k.sh[0]) / k.U * k.dir, (wy - k.sh[1]) / k.U]; }
  function reachLeg(o, wx, wy) { const k = skeleton(o); return [(wx - k.hip[0]) / k.U * k.dir, (wy - k.hip[1]) / k.U]; }

  // curva "rubber hose": dati radice, estremità e lunghezza dell'arto,
  // calcola il punto di controllo così che il tubo si pieghi in modo morbido
  function hose(root, end, len, bendDir) {
    const dx = end[0] - root[0], dy = end[1] - root[1];
    let c = Math.hypot(dx, dy);
    if (c > len) { const k = len / c; end = [root[0] + dx * k, root[1] + dy * k]; c = len; }
    const h = Math.sqrt(Math.max(0, len * len - c * c)) * 0.45 * bendDir;
    const mx = (root[0] + end[0]) / 2, my = (root[1] + end[1]) / 2;
    const nx = c ? -dy / c : 1, ny = c ? dx / c : 0;
    return {p0: root, cp: [mx + nx * h, my + ny * h], p1: end};
  }
  function strokeHose(ctx, H, w, col) {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(H.p0[0], H.p0[1]); ctx.quadraticCurveTo(H.cp[0], H.cp[1], H.p1[0], H.p1[1]); ctx.stroke();
  }
  // tubo con volume: ombra, base, luce (luce da sinistra-alto)
  function tube(ctx, H, w, T, far) {
    const sh = far ? 0.75 : 1;
    strokeHose(ctx, H, w, T.lo);
    ctx.save(); ctx.translate(-w * 0.1, -w * 0.05); ctx.filter = `blur(${Math.max(0.6, w * 0.08)}px)`; strokeHose(ctx, H, w * 0.74, far ? T.lo : T.base); ctx.restore();
    if (!far) { ctx.save(); ctx.translate(-w * 0.2, -w * 0.1); ctx.globalAlpha *= 0.5 * sh; ctx.filter = `blur(${Math.max(0.8, w * 0.12)}px)`; strokeHose(ctx, H, w * 0.3, T.hi); ctx.restore(); }
  }
  function ball(ctx, x, y, r, T, far) {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, far ? T.base : T.hi); g.addColorStop(0.55, far ? T.lo : T.base); g.addColorStop(1, T.lo);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  function foot(ctx, ankle, dir, w, T, far) {
    const toe = [ankle[0] + dir * w * 1.25, ankle[1] + w * 0.15];
    tube(ctx, {p0: [ankle[0] - dir * w * 0.15, ankle[1]], cp: [ankle[0] + dir * w * 0.5, ankle[1] + w * 0.2], p1: toe}, w * 1.05, T, far);
  }

  /* opts:
     x, y (piedi a terra) | s scala | dir 1/-1 | tone 'light'|'grey'|'dark'
     pose: {hipY (offset), lean, armF:[dx,dy], armB:[dx,dy], legF:[dx,dy], legB:[dx,dy], sit}
           arm/leg = posizione mano/caviglia relativa a spalla/anca (in unità di altezza 1)
     face: 'neutral'|'focus'|'happy'|'surprised'|'proud'|'none'
     label: testo sopra la testa
     extras: {tape, hair, outfit, bag}
  */
  function drawAvatar(ctx, o) {
    const s = o.s || 1, dir = o.dir || 1;
    const T = o.toneK != null ? mixTone(TONES.grey, TONES.light, o.toneK) : TONES[o.tone || 'light'];
    const U = 360 * s;                         // altezza di riferimento
    const W = 15 * s;                          // spessore arti
    const P = Object.assign({hipY: 0, lean: 0, armF: [0.07, 0.36], armB: [-0.05, 0.36], legF: [0.03, 0.512], legB: [-0.03, 0.512]}, o.pose || {});
    const legLen = 0.52 * U, armLen = 0.38 * U, torso = 0.25 * U, headR = 0.105 * U;
    const hip = [o.x, o.y - legLen * 0.985 + P.hipY * U];
    const sh = [hip[0] + Math.sin(P.lean) * torso * dir, hip[1] - Math.cos(P.lean) * torso];
    const head = [sh[0] + Math.sin(P.lean) * headR * 1.25 * dir, sh[1] - headR * 1.12];
    const rel = (base, v) => [base[0] + v[0] * U * dir, base[1] + v[1] * U];
    const bendLeg = -dir, bendArm = dir;      // ginocchia avanti, gomiti indietro

    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    // ombra di contatto
    if (!o.noShadow) {
      const g = ctx.createRadialGradient(o.x, o.y + 2, 1, o.x, o.y + 2, 0.16 * U);
      g.addColorStop(0, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save(); ctx.translate(o.x, o.y + 2); ctx.scale(1, 0.18); ctx.translate(-o.x, -(o.y + 2));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o.x, o.y + 2, 0.16 * U, 0, 7); ctx.fill(); ctx.restore();
    }
    const ex = o.extras || {};
    const legB = hose(hip, rel(hip, P.legB), legLen, bendLeg);
    const legF = hose(hip, rel(hip, P.legF), legLen, bendLeg);
    const armB = hose(sh, rel(sh, P.armB), armLen, bendArm);
    const armF = hose(sh, rel(sh, P.armF), armLen, bendArm);
    const pants = ex.outfit ? {base: '#cdbb98', hi: '#e6d7b8', lo: '#9a8a6a'} : null;
    const tee = ex.outfit ? {base: '#f4f4f1', hi: '#ffffff', lo: '#c4c4bf'} : null;

    // lato lontano
    tube(ctx, armB, W, T, true); ball(ctx, armB.p1[0], armB.p1[1], W * 0.62, T, true);
    if (pants) tube(ctx, legB, W * 1.9, pants, true); else tube(ctx, legB, W, T, true);
    foot(ctx, legB.p1, dir, W, T, true);
    // busto
    const body = {p0: hip, cp: [lerp(hip[0], sh[0], 0.5) - dir * W * 0.3, lerp(hip[1], sh[1], 0.5)], p1: sh};
    if (tee) {
      tube(ctx, {p0: [hip[0], hip[1] + W * 0.6], cp: body.cp, p1: [sh[0], sh[1] + W * 0.4]}, W * 3.6, tee);
    } else tube(ctx, body, W * 1.55, T);
    if (pants) { // bacino coperto
      ctx.fillStyle = pants.base; ctx.beginPath(); ctx.ellipse(hip[0], hip[1] + W * 0.4, W * 1.5, W * 1.2, 0, 0, 7); ctx.fill();
    }
    // gamba vicina
    if (pants) tube(ctx, legF, W * 1.9, pants); else tube(ctx, legF, W, T);
    foot(ctx, legF.p1, dir, W, T);
    // collo
    tube(ctx, {p0: sh, cp: [sh[0], sh[1] - headR * 0.3], p1: [head[0], head[1] + headR * 0.6]}, W * 0.95, T);
    // metro da sarto rosso (accento brand)
    if (ex.tape) {
      ctx.strokeStyle = '#D3161E'; ctx.lineWidth = W * 0.55; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(sh[0] - W * 0.9, sh[1] - W * 0.3); ctx.quadraticCurveTo(sh[0] - W * 1.1, sh[1] + U * 0.08, sh[0] - W * 0.9, sh[1] + U * 0.15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sh[0] + W * 0.9, sh[1] - W * 0.3); ctx.quadraticCurveTo(sh[0] + W * 1.2, sh[1] + U * 0.06, sh[0] + W * 1.0, sh[1] + U * 0.12); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.2 * s;
      for (let i = 0; i < 6; i++) { const yy = sh[1] + i * U * 0.022; ctx.beginPath(); ctx.moveTo(sh[0] - W * 1.15, yy); ctx.lineTo(sh[0] - W * 0.75, yy); ctx.stroke(); }
    }
    // braccio vicino + mano
    if (tee) { const sl = {p0: armF.p0, cp: [lerp(armF.p0[0], armF.cp[0], 0.5), lerp(armF.p0[1], armF.cp[1], 0.5)], p1: [lerp(armF.p0[0], armF.cp[0], 0.85), lerp(armF.p0[1], armF.cp[1], 0.85)]}; tube(ctx, armF, W, T); tube(ctx, sl, W * 2.2, tee); }
    else tube(ctx, armF, W, T);
    ball(ctx, armF.p1[0], armF.p1[1], W * 0.62, T);
    // busta in mano
    if (ex.bag) {
      const hx = armF.p1[0], hy = armF.p1[1];
      ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.arc(hx, hy + 14 * s, 13 * s, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = '#111'; ctx.fillRect(hx - 32 * s, hy + 14 * s, 64 * s, 66 * s);
      ctx.fillStyle = '#D3161E'; ctx.fillRect(hx - 32 * s, hy + 74 * s, 64 * s, 6 * s);
    }
    // testa
    ball(ctx, head[0], head[1], headR, T);
    if (ex.hair) { // capelli scolpiti nello stesso materiale, tirati indietro e lucidi
      ctx.save();
      ctx.beginPath(); ctx.arc(head[0], head[1], headR + 0.6, 0, 7); ctx.clip();
      const hg = ctx.createLinearGradient(head[0], head[1] - headR, head[0], head[1] - headR * 0.2);
      hg.addColorStop(0, T.lo); hg.addColorStop(1, T.base);
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.moveTo(head[0] - dir * headR * 1.1, head[1] - headR * 0.1);
      ctx.quadraticCurveTo(head[0] - dir * headR * 0.2, head[1] - headR * 1.5, head[0] + dir * headR * 1.05, head[1] - headR * 0.55);
      ctx.quadraticCurveTo(head[0] + dir * headR * 0.2, head[1] - headR * 0.62, head[0] - dir * headR * 0.4, head[1] - headR * 0.25);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2.2 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(head[0] - dir * headR * 0.1, head[1] - headR * 0.05, headR * 0.82, dir > 0 ? -2.6 : -0.9, dir > 0 ? -2.0 : -0.3); ctx.stroke();
    }
    face(ctx, head, headR, dir, o.face || 'neutral', T, s);
    if (o.label) {
      ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = `600 ${Math.round(17 * s)}px "DejaVu Sans Mono", monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      const txt = o.label.split('').join(String.fromCharCode(8202) + ' ');
      ctx.fillText(txt, head[0], head[1] - headR - 22 * s);
    }
    ctx.restore();
    return {head, sh, hip, handF: armF.p1, handB: armB.p1, headR};
  }

  function face(ctx, head, r, dir, mood, T, s) {
    if (mood === 'none') return;
    const cx = head[0] + dir * r * 0.42, cy = head[1] + r * 0.02;
    const e1 = [cx - dir * r * 0.2, cy], e2 = [cx + dir * r * 0.22, cy - r * 0.02];
    const ink = T.line;
    ctx.lineCap = 'round';
    // occhi
    const closedHappy = mood === 'proud';
    [e1, e2].forEach(e => {
      if (closedHappy) { // occhi chiusi sorridenti
        ctx.strokeStyle = ink; ctx.lineWidth = Math.max(1.6, r * 0.06);
        ctx.beginPath(); ctx.arc(e[0], e[1] + r * 0.04, r * 0.08, Math.PI + 0.3, -0.3); ctx.stroke(); return;
      }
      const sq = mood === 'focus' ? 0.72 : mood === 'surprised' ? 1.25 : 1;
      const lookDown = mood === 'focus' ? r * 0.05 : 0;
      ctx.fillStyle = ink; ctx.beginPath(); ctx.ellipse(e[0], e[1] + lookDown, r * 0.085, r * 0.12 * sq, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(e[0] - r * 0.03, e[1] + lookDown - r * 0.05 * sq, r * 0.03, 0, 7); ctx.fill();
    });
    // sopracciglia morbide, leggermente arcuate verso l'alto (mai aggrottate)
    ctx.strokeStyle = ink; ctx.lineWidth = Math.max(1.4, r * 0.05);
    const lift = mood === 'surprised' ? 0.38 : mood === 'happy' || mood === 'proud' ? 0.3 : 0.27;
    [e1, e2].forEach(e => {
      ctx.beginPath(); ctx.arc(e[0], e[1] - r * lift + r * 0.12, r * 0.13, Math.PI + 0.75, -0.75); ctx.stroke();
    });
    // bocca
    const my = cy + r * 0.36, mx = cx + dir * r * 0.02;
    ctx.lineWidth = Math.max(1.6, r * 0.06);
    ctx.beginPath();
    if (mood === 'happy' || mood === 'proud') ctx.arc(mx, my - r * 0.12, r * 0.18, 0.3, Math.PI - 0.3);
    else if (mood === 'surprised') ctx.ellipse(mx, my, r * 0.06, r * 0.085, 0, 0, 7);
    else if (mood === 'focus' || mood === 'calm') ctx.arc(mx, my - r * 0.14, r * 0.13, 0.55, Math.PI - 0.55);
    else { ctx.moveTo(mx - r * 0.09, my); ctx.quadraticCurveTo(mx, my + r * 0.04, mx + r * 0.09, my); }
    ctx.stroke();
  }

  // ciclo di camminata (fase p in radianti)
  function walk(p, k = 1) {
    const a = Math.sin(p), b = Math.cos(p);
    return {
      hipY: -Math.abs(b) * 0.012 * k,
      lean: 0.03 * k,
      legF: [0.17 * a * k, 0.5 - Math.max(0, -b) * 0.06 * k],
      legB: [-0.17 * a * k, 0.5 - Math.max(0, b) * 0.06 * k],
      armF: [-0.1 * a * k + 0.02, 0.35],
      armB: [0.1 * a * k + 0.02, 0.35]
    };
  }
  global.ZAvatar = {drawAvatar, walk, TONES, reach, reachLeg, skeleton};
})(window);
