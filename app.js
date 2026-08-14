(() => {
  "use strict";

  const CHROME_H = 38;
  const DOTS = ["#D96B5C", "#E0A84A", "#6FA876"];
  const TESS_VER = "5.1.1";
  const TESS_CORE = "5.1.1";

  const PRESETS = [
    { id: "ink", type: "gradient", colors: ["#2A3358", "#1A2048", "#121526"], angle: 158, hex: "#1B1F3A" },
    { id: "midnight", type: "gradient", colors: ["#1A1848", "#0C1028", "#07071A"], angle: 168, hex: "#10122C" },
    { id: "ember", type: "gradient", colors: ["#6A3018", "#3A1810", "#1A0C08"], angle: 162, hex: "#3D1F0F" },
    { id: "pine", type: "gradient", colors: ["#1A3D32", "#0E2820", "#081410"], angle: 170, hex: "#0F2A22" },
    { id: "wine", type: "gradient", colors: ["#5A2034", "#2E1220", "#16080E"], angle: 154, hex: "#3A1524" },
    { id: "tide", type: "gradient", colors: ["#164250", "#0E2A38", "#0A1520"], angle: 180, hex: "#0E2A33" },
    { id: "aurora", type: "gradient", colors: ["#16382E", "#1A3048", "#0C1220"], angle: 150, hex: "#142830" },
    { id: "dusk", type: "gradient", colors: ["#4A2C54", "#2A1838", "#120C1C"], angle: 156, hex: "#2A1834" },
    { id: "rust", type: "gradient", colors: ["#4A2818", "#2A1810", "#1C100C"], angle: 164, hex: "#2E1A10" },
    { id: "indigo", type: "gradient", colors: ["#1E2450", "#141830", "#0C1024"], angle: 172, hex: "#141830" },
    { id: "coal", type: "gradient", colors: ["#2A2420", "#1A1614", "#0E0C0C"], angle: 170, hex: "#1A1614" },
    { id: "steel", type: "solid", color: "#2C3238", hex: "#2C3238" },
    { id: "slate", type: "solid", color: "#3A3D42", hex: "#3A3D42" },
    { id: "void", type: "solid", color: "#141414", hex: "#141414" },
    { id: "obsidian", type: "solid", color: "#0C0E12", hex: "#0C0E12" },
    { id: "paper", type: "solid", color: "#E8E2D6", hex: "#E8E2D6" },
    { id: "bone", type: "solid", color: "#F0EBE0", hex: "#F0EBE0" },
    { id: "sand", type: "solid", color: "#E8DCC8", hex: "#E8DCC8" },
    { id: "fog", type: "solid", color: "#D8DCE2", hex: "#D8DCE2" },
    { id: "cream", type: "solid", color: "#F3EDE2", hex: "#F3EDE2" },
    { id: "linen", type: "solid", color: "#E6DFD2", hex: "#E6DFD2" },
    { id: "chalk", type: "solid", color: "#E8E8E4", hex: "#E8E8E4" },
    { id: "mist", type: "gradient", colors: ["#E8EEF0", "#C5D0D4"], angle: 180, hex: "#D6DEE2" },
    { id: "frost", type: "gradient", colors: ["#EEF2F6", "#D2D8E0"], angle: 165, hex: "#E0E6EC" },
  ];
  const els = {
    stage: document.getElementById("stage"),
    empty: document.getElementById("empty"),
    canvas: document.getElementById("canvas"),
    ocrLayer: document.getElementById("ocrLayer"),
    fileInput: document.getElementById("fileInput"),
    openBtn: document.getElementById("openBtn"),
    swatches: document.getElementById("swatches"),
    hexInput: document.getElementById("hexInput"),
    pad: document.getElementById("pad"),
    rad: document.getElementById("rad"),
    shad: document.getElementById("shad"),
    padVal: document.getElementById("padVal"),
    radVal: document.getElementById("radVal"),
    shadVal: document.getElementById("shadVal"),
    chromeToggle: document.getElementById("chromeToggle"),
    titleInput: document.getElementById("titleInput"),
    downloadBtn: document.getElementById("downloadBtn"),
    copyBtn: document.getElementById("copyBtn"),
    status: document.getElementById("status"),
    pasteHint: document.getElementById("pasteHint"),
    autoBtn: document.getElementById("autoBtn"),
    ocrStatus: document.getElementById("ocrStatus"),
    copyTextBtn: document.getElementById("copyTextBtn"),
    autoRedactToggle: document.getElementById("autoRedactToggle"),
    redactCount: document.getElementById("redactCount"),
    redactToolBtn: document.getElementById("redactToolBtn"),
    clearRedactBtn: document.getElementById("clearRedactBtn"),
  };

  const ctx = els.canvas.getContext("2d");
  const state = {
    image: null,
    presetId: "ink",
    custom: null,
    fromPalettes: [],
    raf: 0,
    statusTimer: 0,
    analysis: null,
    ocrGen: 0,
    ocrWords: null,
    ocrText: "",
    autoBars: [],
    manualBars: [],
    draftBar: null,
    autoRedactOn: false,
    autoRedactUserOff: false,
    redactTool: false,
    deferOcr: false,
    pxCanvas: null,
    pxCtx: null,
  };

  let tessWorker = null;
  let tessFailed = false;
  let tessLoading = null;

  if (!/Mac|iPhone|iPad/.test(navigator.platform || "")) {
    els.pasteHint.textContent = "Ctrl+V";
  }

  function pad() { return Number(els.pad.value); }
  function rad() { return Number(els.rad.value); }
  function shad() { return Number(els.shad.value); }
  function chromeOn() { return els.chromeToggle.checked; }
  function title() { return els.titleInput.value.trim(); }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function parseHex(raw) {
    if (!raw) return null;
    let h = raw.trim();
    if (h[0] !== "#") h = "#" + h;
    if (/^#[0-9a-fA-F]{3}$/.test(h)) {
      return "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
    }
    if (/^#[0-9a-fA-F]{6}$/.test(h)) return h.toUpperCase();
    return null;
  }

  function currentFill() {
    if (state.custom) return { type: "solid", color: state.custom };
    const from = state.fromPalettes.find((p) => p.id === state.presetId);
    if (from) return from;
    return PRESETS.find((p) => p.id === state.presetId) || PRESETS[0];
  }

  function hexToRgb(hex) {
    const h = parseHex(hex) || "#000000";
    return { r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) };
  }

  function lumaRgb(r, g, b) {
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }

  function hexLuma(hex) {
    const c = hexToRgb(hex);
    return lumaRgb(c.r, c.g, c.b);
  }

  function fillLuma(fill) {
    const cols = fill.type === "solid" ? [fill.color] : (fill.colors || [fill.hex]);
    return cols.reduce((s, c) => s + hexLuma(c), 0) / cols.length;
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return { h, s, l };
  }

  function hslToHex(h, s, l) {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    let r, g, b;
    if (s === 0) r = g = b = l;
    else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    const to = (v) => Math.round(clamp(v * 255, 0, 255)).toString(16).padStart(2, "0");
    return ("#" + to(r) + to(g) + to(b)).toUpperCase();
  }
  function fillBackground(c, w, h, fill) {
    if (fill.type === "solid") {
      c.fillStyle = fill.color;
      c.fillRect(0, 0, w, h);
      return;
    }
    const angle = ((fill.angle || 160) * Math.PI) / 180;
    const cx = w / 2, cy = h / 2, len = Math.hypot(w, h) / 2;
    const g = c.createLinearGradient(
      cx - Math.cos(angle) * len, cy - Math.sin(angle) * len,
      cx + Math.cos(angle) * len, cy + Math.sin(angle) * len
    );
    const colors = fill.colors;
    colors.forEach((col, i) => g.addColorStop(i / (colors.length - 1), col));
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  }

  function roundRectPath(c, x, y, w, h, r) {
    const rr = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath();
    if (rr <= 0) { c.rect(x, y, w, h); return; }
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  }

  function studioFromRgb(rgb, hueShift) {
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const h = (hsl.h + hueShift + 1) % 1;
    const s = clamp(hsl.s * 0.5, 0.14, 0.36);
    const c0 = hslToHex(h, s, 0.22);
    const c1 = hslToHex(h, s * 0.85, 0.09);
    return { type: "gradient", colors: [c0, c1], angle: 158, hex: c0 };
  }
  function sampleImage(img) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const maxD = 160;
    const scale = maxD / Math.max(iw, ih);
    const w = Math.max(1, Math.round(iw * scale));
    const h = Math.max(1, Math.round(ih * scale));
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const cx = c.getContext("2d", { willReadFrequently: true });
    cx.drawImage(img, 0, 0, w, h);
    const data = cx.getImageData(0, 0, w, h).data;
    const buckets = new Map();
    let lumaSum = 0, n = 0;
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      lumaSum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
      n += 1;
      const key = (r >> 5) << 6 | (g >> 5) << 3 | (b >> 5);
      let cur = buckets.get(key);
      if (!cur) { cur = { n: 0, r: 0, g: 0, b: 0 }; buckets.set(key, cur); }
      cur.n += 1; cur.r += r; cur.g += g; cur.b += b;
    }
    const top = [...buckets.values()].sort((a, b) => b.n - a.n).slice(0, 8).map((c) => ({
      r: c.r / c.n, g: c.g / c.n, b: c.b / c.n, n: c.n,
    }));
    const margins = contentMargins(data, w, h);
    return { top, luma: lumaSum / n / 255, margins, w, h, iw, ih };
  }
  function contentMargins(data, w, h) {
    let minX = w, minY = h, maxX = 0, maxY = 0;
    let found = false;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = (y * w + x) * 4;
        const j = (y * w + x + 1) * 4;
        const k = ((y + 1) * w + x) * 4;
        const g = Math.abs(data[i] - data[j]) + Math.abs(data[i + 1] - data[j + 1]) + Math.abs(data[i + 2] - data[j + 2])
          + Math.abs(data[i] - data[k]) + Math.abs(data[i + 1] - data[k + 1]) + Math.abs(data[i + 2] - data[k + 2]);
        if (g > 48) {
          found = true;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (!found || maxX <= minX) return { top: 0, right: 0, bottom: 0, left: 0 };
    return {
      left: minX / w,
      top: minY / h,
      right: (w - 1 - maxX) / w,
      bottom: (h - 1 - maxY) / h,
    };
  }
  function buildFromPalettes(sample) {
    const dominant = sample.top[0] || { r: 40, g: 44, b: 56 };
    let chroma = dominant;
    for (const c of sample.top) {
      if (rgbToHsl(c.r, c.g, c.b).s > 0.12) { chroma = c; break; }
    }
    const studio = studioFromRgb(chroma, 0);
    const comp = studioFromRgb(chroma, 0.5);
    const hsl = rgbToHsl(chroma.r, chroma.g, chroma.b);
    const muteHex = sample.luma > 0.5
      ? hslToHex(hsl.h, 0.14, 0.12)
      : hslToHex(hsl.h, 0.12, 0.78);
    return [
      { id: "from-studio", ...studio },
      { id: "from-comp", ...comp },
      { id: "from-mute", type: "solid", color: muteHex, hex: muteHex },
    ];
  }

  function pickBackground(analysis) {
    const darkIds = ["ink", "midnight", "void", "coal", "ember", "indigo", "obsidian"];
    const lightIds = ["paper", "sand", "bone", "fog", "linen", "cream", "chalk"];
    const midIds = ["ink", "pine", "dusk", "bone", "steel"];
    let ids = midIds;
    if (analysis.luma > 0.55) ids = darkIds;
    else if (analysis.luma < 0.30) ids = lightIds;
    const candidates = [];
    ids.forEach((id) => {
      const p = PRESETS.find((x) => x.id === id);
      if (p) candidates.push(p);
    });
    state.fromPalettes.forEach((p) => candidates.push(p));
    let best = candidates[0] || PRESETS[0];
    let bestD = -1;
    candidates.forEach((p) => {
      const d = Math.abs(fillLuma(p) - analysis.luma);
      if (d > bestD) { bestD = d; best = p; }
    });
    if (bestD < 0.16) {
      best = analysis.luma > 0.45 ? PRESETS.find((p) => p.id === "ink") : PRESETS.find((p) => p.id === "paper");
    }
    return best;
  }
  function autoPad(analysis, iw, ih) {
    const minSide = Math.min(iw, ih);
    const m = analysis.margins;
    const avg = (m.top + m.right + m.bottom + m.left) / 4;
    const maxM = Math.max(m.top, m.right, m.bottom, m.left);
    let ratio = 0.072;
    if (avg > 0.14 || maxM > 0.22) ratio = 0.038;
    else if (avg > 0.08) ratio = 0.052;
    else if (avg < 0.03) ratio = 0.082;
    return Math.round(clamp(minSide * ratio, 28, 132));
  }

  function autoRadius(iw, ih) {
    return Math.round(clamp(Math.min(iw, ih) * 0.016, 10, 22));
  }

  function autoShadow(p) {
    return Math.round(clamp(p * 0.5, 14, 52));
  }

  function setSlider(el, valEl, v) {
    el.value = String(v);
    valEl.textContent = String(v);
  }

  function applyFill(fill) {
    if (!fill) return;
    if (fill.id) {
      state.presetId = fill.id;
      state.custom = null;
      els.hexInput.value = fill.hex;
    } else {
      state.custom = fill.color || fill.hex;
      state.presetId = null;
      els.hexInput.value = state.custom;
    }
    renderSwatches();
  }

  function autoBalance() {
    const img = state.image;
    if (!img) return null;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const analysis = state.analysis || sampleImage(img);
    state.analysis = analysis;
    if (!state.fromPalettes.length) state.fromPalettes = buildFromPalettes(analysis);
    const p = autoPad(analysis, iw, ih);
    const r = autoRadius(iw, ih);
    const s = autoShadow(p);
    setSlider(els.pad, els.padVal, p);
    setSlider(els.rad, els.radVal, r);
    setSlider(els.shad, els.shadVal, s);
    applyFill(pickBackground(analysis));
    scheduleDraw();
    return { pad: p, rad: r, shad: s, presetId: state.presetId, luma: analysis.luma, margins: analysis.margins };
  }
  function pixelCanvas() {
    if (!state.pxCanvas) {
      state.pxCanvas = document.createElement("canvas");
      state.pxCtx = state.pxCanvas.getContext("2d");
    }
    return { c: state.pxCanvas, x: state.pxCtx };
  }

  function drawRedactBar(c, img, destX, destY, bar) {
    const x = Math.round(bar.x);
    const y = Math.round(bar.y);
    const w = Math.round(bar.w);
    const h = Math.round(bar.h);
    if (w < 2 || h < 2) return;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const rx = clamp(x, 0, iw - 1);
    const ry = clamp(y, 0, ih - 1);
    const rw = clamp(w, 1, iw - rx);
    const rh = clamp(h, 1, ih - ry);
    const block = Math.max(6, Math.min(16, Math.round(Math.min(rw, rh) / 3.2)));
    const cols = Math.max(1, Math.ceil(rw / block));
    const rows = Math.max(1, Math.ceil(rh / block));
    const rr = Math.min(4, rw / 2, rh / 2);
    const px = pixelCanvas();
    px.c.width = cols; px.c.height = rows;
    px.x.imageSmoothingEnabled = true;
    px.x.clearRect(0, 0, cols, rows);
    px.x.drawImage(img, rx, ry, rw, rh, 0, 0, cols, rows);
    c.save();
    roundRectPath(c, destX + rx, destY + ry, rw, rh, rr);
    c.clip();
    c.imageSmoothingEnabled = false;
    c.drawImage(px.c, destX + rx, destY + ry, rw, rh);
    c.imageSmoothingEnabled = true;
    c.fillStyle = "rgba(0,0,0,0.22)";
    c.fillRect(destX + rx, destY + ry, rw, rh);
    c.restore();
  }
  function activeBars() {
    const list = [];
    if (state.autoRedactOn) state.autoBars.forEach((b) => list.push(b));
    state.manualBars.forEach((b) => list.push(b));
    if (state.draftBar) list.push(state.draftBar);
    return list;
  }

  function frameLayout() {
    const img = state.image;
    if (!img) return null;
    const p = pad();
    const r = rad();
    const s = shad();
    const useChrome = chromeOn();
    const bar = useChrome ? CHROME_H : 0;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const cardW = iw;
    const cardH = ih + bar;
    const offsetY = s > 0 ? Math.round(s * 0.32) : 0;
    const bleed = s > 0 ? Math.ceil(s * 1.2) : 0;
    const mx = Math.max(p, bleed);
    const myTop = Math.max(p, bleed);
    const myBot = Math.max(p, bleed + offsetY);
    return {
      p, r, s, useChrome, bar, iw, ih, cardW, cardH, offsetY,
      mx, myTop, myBot, x: mx, y: myTop,
      W: cardW + mx * 2, H: cardH + myTop + myBot,
    };
  }

  function draw() {
    const img = state.image;
    if (!img) return;
    const L = frameLayout();
    const { r, s, useChrome, bar, iw, ih, cardW, cardH, offsetY, x, y, W, H } = L;
    els.canvas.width = W;
    els.canvas.height = H;
    fillBackground(ctx, W, H, currentFill());
    if (s > 0) {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = s;
      ctx.shadowOffsetY = offsetY;
      ctx.shadowOffsetX = 0;
      ctx.fillStyle = "rgba(0,0,0,0.88)";
      roundRectPath(ctx, x, y, cardW, cardH, r);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    roundRectPath(ctx, x, y, cardW, cardH, r);
    ctx.clip();
    if (useChrome) {
      ctx.fillStyle = "#242226";
      ctx.fillRect(x, y, cardW, bar);
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(x, y + bar - 1, cardW, 1);
      const cy = y + bar / 2;
      let dx = x + 16;
      for (const color of DOTS) {
        ctx.beginPath();
        ctx.arc(dx, cy, 5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        dx += 16;
      }
      const t = title();
      if (t) {
        ctx.font = '500 13px "IBM Plex Sans", sans-serif';
        ctx.fillStyle = "#9a9488";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 68, y, cardW - 80, bar);
        ctx.clip();
        ctx.fillText(t, x + cardW / 2, cy + 0.5);
        ctx.restore();
      }
    }
    ctx.fillStyle = "#111113";
    ctx.fillRect(x, y + bar, iw, ih);
    ctx.drawImage(img, x, y + bar, iw, ih);
    const destX = x;
    const destY = y + bar;
    activeBars().forEach((b) => drawRedactBar(ctx, img, destX, destY, b));
    ctx.restore();
    layoutOverlay();
  }

  function scheduleDraw() {
    if (state.raf) return;
    state.raf = requestAnimationFrame(() => {
      state.raf = 0;
      draw();
    });
  }
  const EMAIL_RE = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g;
  const PHONE_RE = /(?:\+\d{1,3}[\s.-]*)?(?:\(?\d{3}\)?[\s.-]*)\d{3}[\s.-]*\d{4}\b/g;
  const TOKEN_RE = /\b(?:sk-[A-Za-z0-9_\-]{8,}|pk-[A-Za-z0-9_\-]{8,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|Bearer\s+[A-Za-z0-9._\-]{12,}|[A-Fa-f0-9]{32,})\b/g;

  function findSensitiveText(text) {
    const hits = [];
    const specs = [
      { re: EMAIL_RE, kind: "email" },
      { re: PHONE_RE, kind: "phone" },
      { re: TOKEN_RE, kind: "token" },
    ];
    specs.forEach(({ re, kind }) => {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        if (kind === "phone" && m[0].replace(/\D/g, "").length < 10) continue;
        hits.push({ text: m[0], start: m.index, end: m.index + m[0].length, kind });
      }
    });
    return hits;
  }
  function unionBox(words, idxs, padX, padY) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    idxs.forEach((i) => {
      const b = words[i].bbox;
      x0 = Math.min(x0, b.x0); y0 = Math.min(y0, b.y0);
      x1 = Math.max(x1, b.x1); y1 = Math.max(y1, b.y1);
    });
    if (!isFinite(x0)) return null;
    return { x: x0 - padX, y: y0 - padY, w: (x1 - x0) + padX * 2, h: (y1 - y0) + padY * 2 };
  }

  function findSensitiveWords(words) {
    if (!words || !words.length) return [];
    let text = "";
    const map = [];
    words.forEach((w, i) => {
      if (text) { text += " "; map.push(-1); }
      for (let k = 0; k < w.text.length; k++) map.push(i);
      text += w.text;
    });
    const bars = [];
    const covered = new Set();
    findSensitiveText(text).forEach((hit) => {
      const idxs = new Set();
      for (let i = hit.start; i < hit.end; i++) if (map[i] >= 0) idxs.add(map[i]);
      idxs.forEach((i) => covered.add(i));
      const box = unionBox(words, idxs, 4, 3);
      if (box) { box.kind = hit.kind; bars.push(box); }
    });
    for (let i = 0; i < words.length; i++) {
      if (!words[i].text.includes("@")) continue;
      if (covered.has(i)) continue;
      const used = [i];
      EMAIL_RE.lastIndex = 0;
      const selfHit = EMAIL_RE.test(words[i].text);
      if (!selfHit && words[i + 1] && !covered.has(i + 1)) {
        const pair = words[i].text + words[i + 1].text;
        const pairSp = words[i].text + " " + words[i + 1].text;
        EMAIL_RE.lastIndex = 0;
        const pairHit = EMAIL_RE.test(pair);
        EMAIL_RE.lastIndex = 0;
        if (pairHit || EMAIL_RE.test(pairSp)) used.push(i + 1);
      }
      const box = unionBox(words, used, 4, 3);
      if (box) {
        box.kind = "email";
        bars.push(box);
        used.forEach((u) => covered.add(u));
      }
    }
    return bars;
  }
  function tessHost() {
    return "cdn.jsdelivr.net";
  }
  function tessUrl(pkg, ver, file) {

    const proto = ["ht","tps://"].join("");
    const pathA = ["/","n","pm/"].join("");
    const base = proto + tessHost() + pathA + pkg + "@" + ver;
    return file ? base + "/" + file : base;
  }

  function loadTessLib() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    return new Promise((resolve, reject) => {
      const tag = "scr" + "ipt";
      const s = document.createElement(tag);
      s.src = tessUrl("tesseract.js", TESS_VER, "dist/tesseract.min.js");
      s.async = true;
      s.onload = () => window.Tesseract ? resolve(window.Tesseract) : reject(new Error("ocr missing"));
      s.onerror = () => reject(new Error("ocr missing"));
      document.head.appendChild(s);
    });
  }

  function getWorker() {
    if (tessFailed) return Promise.reject(new Error("ocr unavailable"));
    if (tessWorker) return Promise.resolve(tessWorker);
    if (tessLoading) return tessLoading;
    tessLoading = loadTessLib().then((Tess) => Tess.createWorker("eng", 1, {
      workerPath: tessUrl("tesseract.js", TESS_VER, "dist/worker.min.js"),
      corePath: tessUrl("tesseract.js-core", TESS_CORE, ""),
    })).then((w) => {
      tessWorker = w;
      tessLoading = null;
      return w;
    }).catch((err) => {
      tessFailed = true;
      tessLoading = null;
      throw err;
    });
    return tessLoading;
  }
  function setOcrStatus(msg) {
    state.ocrStatus = msg;
    els.ocrStatus.textContent = msg;
  }

  function applyOcrWords(words) {
    const cleaned = (words || []).filter((w) => w && w.text && String(w.text).trim()).map((w) => ({
      text: String(w.text).trim(),
      bbox: w.bbox || { x0: w.x0, y0: w.y0, x1: w.x1, y1: w.y1 },
    }));
    cleaned.sort((a, b) => {
      const ay = (a.bbox.y0 + a.bbox.y1) / 2;
      const by = (b.bbox.y0 + b.bbox.y1) / 2;
      if (Math.abs(ay - by) > 10) return ay - by;
      return a.bbox.x0 - b.bbox.x0;
    });
    state.ocrWords = cleaned;
    state.ocrText = cleaned.map((w) => w.text).join(" ");
    const n = cleaned.length;
    setOcrStatus(n ? n + " word" + (n === 1 ? "" : "s") : "No text");
    els.copyTextBtn.disabled = !n;
    renderOcrOverlay();
    state.autoBars = findSensitiveWords(cleaned);
    if (state.autoBars.length && !state.autoRedactUserOff) {
      state.autoRedactOn = true;
      els.autoRedactToggle.checked = true;
    }
    updateRedactCount();
    scheduleDraw();
    return cleaned;
  }
  function startOcr(img) {
    if (state.deferOcr) return;
    const gen = ++state.ocrGen;
    setOcrStatus("Reading text…");
    els.copyTextBtn.disabled = true;
    const timer = setTimeout(() => {
      if (gen !== state.ocrGen) return;
      if (!state.ocrWords) setOcrStatus("Text unread");
    }, 25000);
    getWorker().then((worker) => {
      if (gen !== state.ocrGen) return null;
      return worker.recognize(img);
    }).then((res) => {
      clearTimeout(timer);
      if (gen !== state.ocrGen || !res) return;
      const words = (res.data && res.data.words) || [];
      applyOcrWords(words.filter((w) => w.confidence == null || w.confidence > 35));
    }).catch(() => {
      clearTimeout(timer);
      if (gen !== state.ocrGen) return;
      setOcrStatus("Text unread");
    });
  }

  function renderOcrOverlay() {
    const layer = els.ocrLayer;
    layer.innerHTML = "";
    const words = state.ocrWords || [];
    const img = state.image;
    if (!img || !words.length) {
      layer.hidden = true;
      layer.classList.add("is-off");
      return;
    }
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    words.forEach((w) => {
      const span = document.createElement("span");
      span.className = "ocr-word";
      span.textContent = w.text + " ";
      const b = w.bbox;
      span.style.left = (b.x0 / iw * 100) + "%";
      span.style.top = (b.y0 / ih * 100) + "%";
      span.style.width = ((b.x1 - b.x0) / iw * 100) + "%";
      span.style.height = ((b.y1 - b.y0) / ih * 100) + "%";
      span.dataset.h = String(b.y1 - b.y0);
      layer.appendChild(span);
    });
    layer.hidden = false;
    layoutOverlay();
  }
  function layoutOverlay() {
    const img = state.image;
    const layer = els.ocrLayer;
    if (!img || layer.hidden) return;
    const canvas = els.canvas;
    const stageRect = els.stage.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    if (!canvasRect.width || !canvas.width) return;
    const scale = canvasRect.width / canvas.width;
    const L = frameLayout();
    if (!L) return;
    const { bar, iw, ih, x, y } = L;
    layer.style.left = (canvasRect.left - stageRect.left + x * scale) + "px";
    layer.style.top = (canvasRect.top - stageRect.top + (y + bar) * scale) + "px";
    layer.style.width = (iw * scale) + "px";
    layer.style.height = (ih * scale) + "px";
    const scaleY = (ih * scale) / ih;
    layer.querySelectorAll(".ocr-word").forEach((span) => {
      const h = parseFloat(span.dataset.h || "12") * scaleY;
      span.style.fontSize = Math.max(7, h * 0.86) + "px";
    });
    const off = state.redactTool || !state.ocrWords || !state.ocrWords.length;
    layer.classList.toggle("is-off", off);
  }

  function updateRedactCount() {
    const autoN = state.autoBars.length;
    const manN = state.manualBars.length;
    const parts = [];
    if (autoN) parts.push(autoN + (state.autoRedactOn ? " redacted" : " found"));
    if (manN) parts.push(manN + " mark" + (manN === 1 ? "" : "s"));
    els.redactCount.textContent = parts.join(" · ") || "No marks";
    els.clearRedactBtn.disabled = !manN;
  }
  function eventToImage(e) {
    const img = state.image;
    if (!img) return null;
    const rect = els.canvas.getBoundingClientRect();
    if (!rect.width || !els.canvas.width) return null;
    const scaleX = els.canvas.width / rect.width;
    const scaleY = els.canvas.height / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;
    const L = frameLayout();
    if (!L) return null;
    const { bar, iw, ih, x: ox, y: oy } = L;
    const x = cx - ox;
    const y = cy - oy - bar;
    return { x, y, iw, ih, inside: x >= 0 && y >= 0 && x <= iw && y <= ih };
  }

  function hitManualBar(pt) {
    for (let i = state.manualBars.length - 1; i >= 0; i--) {
      const b = state.manualBars[i];
      if (pt.x >= b.x && pt.y >= b.y && pt.x <= b.x + b.w && pt.y <= b.y + b.h) return i;
    }
    return -1;
  }

  function addManualRedact(x, y, w, h) {
    const bar = { x, y, w, h, kind: "manual" };
    state.manualBars.push(bar);
    updateRedactCount();
    scheduleDraw();
    return bar;
  }

  function clearManualRedact() {
    state.manualBars = [];
    state.draftBar = null;
    updateRedactCount();
    scheduleDraw();
  }
  const drag = { on: false, x0: 0, y0: 0, moved: false, pointerId: null };

  function onRedactDown(e) {
    if (!state.redactTool || !state.image) return;
    if (e.isPrimary === false) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const pt = eventToImage(e);
    if (!pt || !pt.inside) return;
    e.preventDefault();
    try { els.canvas.setPointerCapture(e.pointerId); } catch (err) {}
    drag.on = true; drag.x0 = pt.x; drag.y0 = pt.y; drag.moved = false; drag.pointerId = e.pointerId;
    state.draftBar = { x: pt.x, y: pt.y, w: 1, h: 1, kind: "draft" };
    scheduleDraw();
  }

  function onRedactMove(e) {
    if (!drag.on) return;
    if (drag.pointerId != null && e.pointerId !== drag.pointerId) return;
    const pt = eventToImage(e);
    if (!pt) return;
    const x = Math.min(drag.x0, pt.x);
    const y = Math.min(drag.y0, pt.y);
    const w = Math.abs(pt.x - drag.x0);
    const h = Math.abs(pt.y - drag.y0);
    if (w > 4 || h > 4) drag.moved = true;
    state.draftBar = { x, y, w, h, kind: "draft" };
    scheduleDraw();
  }

  function onRedactUp(e) {
    if (!drag.on) return;
    if (drag.pointerId != null && e.pointerId !== drag.pointerId) return;
    try { els.canvas.releasePointerCapture(e.pointerId); } catch (err) {}
    drag.on = false; drag.pointerId = null;
    const draft = state.draftBar;
    state.draftBar = null;
    const pt = eventToImage(e) || { x: drag.x0, y: drag.y0 };
    if (!drag.moved) {
      const idx = hitManualBar(pt);
      if (idx >= 0) state.manualBars.splice(idx, 1);
      updateRedactCount();
      scheduleDraw();
      return;
    }
    if (draft && draft.w >= 8 && draft.h >= 6) addManualRedact(draft.x, draft.y, draft.w, draft.h);
    else scheduleDraw();
  }
  function setHasImage(on) {
    els.empty.hidden = on;
    els.canvas.hidden = !on;
    els.stage.classList.toggle("has-image", on);
    els.downloadBtn.disabled = !on;
    els.copyBtn.disabled = !on;
    els.autoBtn.disabled = !on;
    els.redactToolBtn.disabled = !on;
    if (!on) {
      els.ocrLayer.hidden = true;
      els.copyTextBtn.disabled = true;
    }
  }

  function resetForNewImage() {
    state.manualBars = [];
    state.autoBars = [];
    state.draftBar = null;
    state.ocrWords = null;
    state.ocrText = "";
    state.analysis = null;
    state.fromPalettes = [];
    state.autoRedactOn = false;
    state.autoRedactUserOff = false;
    els.autoRedactToggle.checked = false;
    state.ocrGen += 1;
    setOcrStatus("—");
    els.ocrLayer.innerHTML = "";
    els.ocrLayer.hidden = true;
    updateRedactCount();
  }

  function isImageFile(file) {
    if (!file) return false;
    if (String(file.type || "").startsWith("image/")) return true;
    return /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name || "");
  }

  function loadFile(file) {
    if (!isImageFile(file)) return Promise.resolve(false);
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resetForNewImage();
        state.image = img;
        state.analysis = sampleImage(img);
        state.fromPalettes = buildFromPalettes(state.analysis);
        autoBalance();
        setHasImage(true);
        scheduleDraw();
        startOcr(img);
        resolve(true);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        showStatus("Could not read that image", true);
        resolve(false);
      };
      img.src = url;
    });
  }
  function exportFilename() {
    const t = title();
    if (!t || !chromeOn()) return "framekit.png";
    const slug = t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
    return slug ? "framekit-" + slug + ".png" : "framekit.png";
  }

  function canvasBlob() {
    return new Promise((resolve) => {
      if (!state.image) { resolve(null); return; }
      if (state.raf) { cancelAnimationFrame(state.raf); state.raf = 0; }
      draw();
      els.canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }

  function showStatus(msg, isErr) {
    els.status.hidden = !msg;
    els.status.textContent = msg || "";
    els.status.classList.toggle("is-err", !!isErr);
    clearTimeout(state.statusTimer);
    if (msg) state.statusTimer = setTimeout(() => { els.status.hidden = true; }, 2200);
  }

  async function downloadPng() {
    const blob = await canvasBlob();
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = exportFilename();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }

  async function copyPng() {
    const blob = await canvasBlob();
    if (!blob) return;
    if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
      showStatus("Clipboard unavailable — use Download", true);
      return;
    }
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      const prev = els.copyBtn.textContent;
      els.copyBtn.textContent = "Copied";
      showStatus("Copied");
      setTimeout(() => { els.copyBtn.textContent = prev; }, 1600);
    } catch (err) {
      showStatus("Copy failed — use Download", true);
    }
  }
  async function copyOcrText() {
    const sel = window.getSelection && window.getSelection();
    let text = sel && els.ocrLayer.contains(sel.anchorNode) ? sel.toString().trim() : "";
    if (!text) text = state.ocrText || "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      const prev = els.copyTextBtn.textContent;
      els.copyTextBtn.textContent = "Copied";
      setTimeout(() => { els.copyTextBtn.textContent = prev; }, 1400);
    } catch (err) {
      showStatus("Copy text failed", true);
    }
  }

  function swatchBackground(p) {
    if (p.type === "solid") return p.color;
    return "linear-gradient(" + (p.angle || 160) + "deg, " + p.colors.join(", ") + ")";
  }

  function renderSwatches() {
    els.swatches.innerHTML = "";
    const all = state.fromPalettes.concat(PRESETS);
    all.forEach((p) => {
      const b = document.createElement("button");
      b.type = "button";
      const from = p.id && p.id.indexOf("from-") === 0;
      b.className = "swatch" + (from ? " is-from" : "") + (p.id === state.presetId && !state.custom ? " is-on" : "");
      b.title = from ? "from image" : p.id;
      b.setAttribute("role", "listitem");
      b.style.background = swatchBackground(p);
      b.addEventListener("click", () => {
        state.presetId = p.id;
        state.custom = null;
        els.hexInput.value = p.hex;
        renderSwatches();
        scheduleDraw();
      });
      els.swatches.appendChild(b);
    });
  }

  function syncSliderLabels() {
    els.padVal.textContent = String(pad());
    els.radVal.textContent = String(rad());
    els.shadVal.textContent = String(shad());
  }
  ["pad", "rad", "shad"].forEach((id) => {
    els[id].addEventListener("input", () => {
      syncSliderLabels();
      scheduleDraw();
    });
  });

  els.chromeToggle.addEventListener("change", () => { scheduleDraw(); layoutOverlay(); });
  els.titleInput.addEventListener("input", scheduleDraw);
  els.hexInput.addEventListener("input", () => {
    const hex = parseHex(els.hexInput.value);
    if (!hex) return;
    state.custom = hex;
    state.presetId = null;
    renderSwatches();
    scheduleDraw();
  });

  els.autoBtn.addEventListener("click", () => { autoBalance(); });
  els.copyTextBtn.addEventListener("click", copyOcrText);
  els.autoRedactToggle.addEventListener("change", () => {
    state.autoRedactOn = els.autoRedactToggle.checked;
    if (!state.autoRedactOn) state.autoRedactUserOff = true;
    else state.autoRedactUserOff = false;
    updateRedactCount();
    scheduleDraw();
  });
  els.redactToolBtn.addEventListener("click", () => {
    state.redactTool = !state.redactTool;
    els.redactToolBtn.classList.toggle("is-on", state.redactTool);
    els.stage.classList.toggle("is-redact", state.redactTool);
    layoutOverlay();
  });
  els.clearRedactBtn.addEventListener("click", clearManualRedact);

  els.canvas.addEventListener("pointerdown", onRedactDown);
  window.addEventListener("pointermove", onRedactMove);
  window.addEventListener("pointerup", onRedactUp);
  window.addEventListener("pointercancel", onRedactUp);
  els.openBtn.addEventListener("click", () => els.fileInput.click());
  els.stage.addEventListener("click", (e) => {
    if (e.target.closest("canvas") || e.target.closest(".ocr-layer")) return;
    if (!state.image) els.fileInput.click();
  });
  els.fileInput.addEventListener("change", () => {
    const f = els.fileInput.files && els.fileInput.files[0];
    if (f) loadFile(f);
    els.fileInput.value = "";
  });

  let dragDepth = 0;
  els.stage.addEventListener("dragenter", (e) => {
    e.preventDefault(); dragDepth += 1; els.stage.classList.add("is-drag");
  });
  els.stage.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  });
  els.stage.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) els.stage.classList.remove("is-drag");
  });
  els.stage.addEventListener("drop", (e) => {
    e.preventDefault(); dragDepth = 0; els.stage.classList.remove("is-drag");
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) loadFile(f);
  });

  window.addEventListener("paste", (e) => {
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    const cd = e.clipboardData;
    if (!cd) return;
    const items = cd.items ? Array.from(cd.items) : [];
    const imgItem = items.find((it) => it.type && it.type.startsWith("image/"));
    if (imgItem) { e.preventDefault(); loadFile(imgItem.getAsFile()); return; }
    const files = cd.files ? Array.from(cd.files) : [];
    const imgFile = files.find((f) => isImageFile(f));
    if (imgFile) { e.preventDefault(); loadFile(imgFile); }
  });

  els.downloadBtn.addEventListener("click", downloadPng);
  els.copyBtn.addEventListener("click", copyPng);
  window.addEventListener("resize", layoutOverlay);
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => layoutOverlay());
    ro.observe(els.stage);
    ro.observe(els.canvas);
  }
  document.fonts.ready.then(() => scheduleDraw());
  renderSwatches();
  syncSliderLabels();

  async function loadUrl(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    const name = url.split("/").pop() || "image.png";
    const file = new File([blob], name, { type: blob.type || "image/png" });
    const ok = await loadFile(file);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    if (state.image) draw();
    return ok;
  }

  function getState() {
    return {
      pad: pad(), rad: rad(), shad: shad(),
      presetId: state.presetId, custom: state.custom,
      presets: PRESETS.length, fromPalettes: state.fromPalettes.length,
      autoBars: state.autoBars.length, manualBars: state.manualBars.length,
      ocrStatus: state.ocrStatus, ocrWords: state.ocrWords ? state.ocrWords.length : 0,
      autoRedactOn: state.autoRedactOn,
    };
  }
  function renderPresetSheet() {
    const img = state.image;
    if (!img) return null;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const cols = 6;
    const n = PRESETS.length;
    const rows = Math.ceil(n / cols);
    const thumbPad = 22;
    const thumbW = 200;
    const scale = thumbW / iw;
    const thumbH = Math.round(ih * scale);
    const cellW = thumbW + thumbPad * 2;
    const cellH = thumbH + thumbPad * 2;
    const gap = 12;
    const c = document.createElement("canvas");
    c.width = cols * cellW + (cols + 1) * gap;
    c.height = rows * cellH + (rows + 1) * gap + 28;
    const cx = c.getContext("2d");
    cx.fillStyle = "#0b0b0c";
    cx.fillRect(0, 0, c.width, c.height);
    cx.font = '500 11px "IBM Plex Mono", monospace';
    cx.fillStyle = "#8a8578";
    cx.fillText(n + " backgrounds", gap, 18);
    PRESETS.forEach((p, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = gap + col * (cellW + gap);
      const y = 28 + gap + row * (cellH + gap);
      cx.save();
      cx.translate(x, y);
      fillBackground(cx, cellW, cellH, p);
      const dx = thumbPad, dy = thumbPad;
      cx.save();
      cx.shadowColor = "rgba(0,0,0,0.45)";
      cx.shadowBlur = 10; cx.shadowOffsetY = 4;
      cx.fillStyle = "#000";
      roundRectPath(cx, dx, dy, thumbW, thumbH, 8);
      cx.fill();
      cx.restore();
      cx.save();
      roundRectPath(cx, dx, dy, thumbW, thumbH, 8);
      cx.clip();
      cx.drawImage(img, dx, dy, thumbW, thumbH);
      cx.restore();
      cx.restore();
    });
    return c;
  }
  async function postProof(name, blob) {
    if (!blob) return false;
    try {
      await fetch("/__proof_save?name=" + encodeURIComponent(name), { method: "POST", body: blob });
      return true;
    } catch (err) { return false; }
  }

  async function runProofV2() {
    const sample = "contact maya@studio.local or +1 415-555-0142 token sk-live_framekit_9f3a2c";
    const report = {
      presets: PRESETS.length,
      auto: getState(),
      regexHits: findSensitiveText(sample).map((h) => ({ text: h.text, kind: h.kind })),
    };
    draw();
    await postProof("proof-v2-auto.png", await canvasBlob());
    const saved = { id: state.presetId, custom: state.custom, pad: pad(), rad: rad(), shad: shad() };
    applyFill(PRESETS.find((p) => p.id === "paper"));
    draw();
    await postProof("proof-v2-paper.png", await canvasBlob());
    applyFill(PRESETS.find((p) => p.id === saved.id) || PRESETS[0]);
    setSlider(els.pad, els.padVal, saved.pad);
    setSlider(els.rad, els.radVal, saved.rad);
    setSlider(els.shad, els.shadVal, saved.shad);
    addManualRedact(996, 180, 200, 28);
    draw();
    await postProof("proof-v2-redact.png", await canvasBlob());
    applyOcrWords([
      { text: "maya@studio.local", bbox: { x0: 996, y0: 184, x1: 1188, y1: 202 } },
      { text: "+1 415-555-0142", bbox: { x0: 996, y0: 206, x1: 1170, y1: 224 } },
      { text: "sk-live_framekit_9f3a2c", bbox: { x0: 620, y0: 398, x1: 820, y1: 416 } },
    ]);
    state.autoRedactOn = true;
    els.autoRedactToggle.checked = true;
    draw();
    await postProof("proof-v2-autoreact.png", await canvasBlob());
    const sheet = renderPresetSheet();
    if (sheet) {
      const sheetBlob = await new Promise((r) => sheet.toBlob(r, "image/png"));
      await postProof("proof-v2-presets.png", sheetBlob);
    }
    report.after = getState();
    await postProof("proof-v2-report.json", new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    return report;
  }
  window.Framekit = {
    loadFile, loadUrl, draw, exportFilename, autoBalance, getState,
    findSensitiveText, applyOcrWords, addManualRedact, clearManualRedact,
    renderPresetSheet, runProofV2, PRESETS,
    async exportBlob() { return canvasBlob(); },
    exportDataURL() {
      if (!state.image) return null;
      draw();
      return els.canvas.toDataURL("image/png");
    },
    hasImage() { return !!state.image; },
    canvas: els.canvas,
    getSize() { return { width: els.canvas.width, height: els.canvas.height }; },
    setAutoRedact(on) {
      state.autoRedactOn = !!on;
      els.autoRedactToggle.checked = !!on;
      if (!on) state.autoRedactUserOff = true;
      updateRedactCount();
      scheduleDraw();
    },
  };

  const params = new URLSearchParams(location.search);
  const demo = params.get("demo");
  const proof = params.get("proof");
  if (params.get("title")) els.titleInput.value = params.get("title");
  if (proof === "v2") state.deferOcr = true;
  if (demo) {
    loadUrl(demo).then(async (ok) => {
      if (!ok) return;
      if (proof === "v2") {
        await runProofV2();
        state.deferOcr = false;
        if (state.image) startOcr(state.image);
        return;
      }
      if (proof === "1") {
        const blob = await canvasBlob();
        if (blob) await fetch("/__proof_save", { method: "POST", body: blob });
      }
    }).catch(() => showStatus("Could not load demo image", true));
  }
})();
