(() => {
  "use strict";

  const CHROME_H = 38;
  const DOTS = ["#D96B5C", "#E0A84A", "#6FA876"];

  const PRESETS = [
    { id: "ink", type: "gradient", colors: ["#2A3358", "#121526"], angle: 158, hex: "#1B1F3A" },
    { id: "ember", type: "gradient", colors: ["#5A2A14", "#1A0C08"], angle: 162, hex: "#3D1F0F" },
    { id: "pine", type: "gradient", colors: ["#1A3D32", "#081410"], angle: 170, hex: "#0F2A22" },
    { id: "slate", type: "solid", color: "#3A3D42", hex: "#3A3D42" },
    { id: "wine", type: "gradient", colors: ["#5A2034", "#16080E"], angle: 154, hex: "#3A1524" },
    { id: "paper", type: "solid", color: "#E8E2D6", hex: "#E8E2D6" },
    { id: "tide", type: "gradient", colors: ["#164250", "#0A1520"], angle: 180, hex: "#0E2A33" },
    { id: "void", type: "solid", color: "#141414", hex: "#141414" },
  ];

  const els = {
    stage: document.getElementById("stage"),
    empty: document.getElementById("empty"),
    canvas: document.getElementById("canvas"),
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
  };

  const ctx = els.canvas.getContext("2d");

  const state = {
    image: null,
    presetId: "ink",
    custom: null,
    raf: 0,
    statusTimer: 0,
  };

  if (!/Mac|iPhone|iPad/.test(navigator.platform || "")) {
    els.pasteHint.textContent = "Ctrl+V";
  }

  function pad() { return Number(els.pad.value); }
  function rad() { return Number(els.rad.value); }
  function shad() { return Number(els.shad.value); }
  function chromeOn() { return els.chromeToggle.checked; }
  function title() { return els.titleInput.value.trim(); }

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
    return PRESETS.find((p) => p.id === state.presetId) || PRESETS[0];
  }

  function fillBackground(c, w, h, fill) {
    if (fill.type === "solid") {
      c.fillStyle = fill.color;
      c.fillRect(0, 0, w, h);
      return;
    }
    const angle = ((fill.angle || 160) * Math.PI) / 180;
    const cx = w / 2;
    const cy = h / 2;
    const len = Math.hypot(w, h) / 2;
    const g = c.createLinearGradient(
      cx - Math.cos(angle) * len,
      cy - Math.sin(angle) * len,
      cx + Math.cos(angle) * len,
      cy + Math.sin(angle) * len
    );
    const colors = fill.colors;
    colors.forEach((col, i) => g.addColorStop(i / (colors.length - 1), col));
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  }

  function roundRectPath(c, x, y, w, h, r) {
    const rr = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath();
    if (rr <= 0) {
      c.rect(x, y, w, h);
      return;
    }
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  }

  function draw() {
    const img = state.image;
    if (!img) return;

    const p = pad();
    const r = rad();
    const s = shad();
    const useChrome = chromeOn();
    const bar = useChrome ? CHROME_H : 0;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const cardW = iw;
    const cardH = ih + bar;
    const W = cardW + p * 2;
    const H = cardH + p * 2;

    els.canvas.width = W;
    els.canvas.height = H;

    fillBackground(ctx, W, H, currentFill());

    const x = p;
    const y = p;

    if (s > 0) {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = s;
      ctx.shadowOffsetY = Math.round(s * 0.32);
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
    ctx.restore();
  }

  function scheduleDraw() {
    if (state.raf) return;
    state.raf = requestAnimationFrame(() => {
      state.raf = 0;
      draw();
    });
  }

  function setHasImage(on) {
    els.empty.hidden = on;
    els.canvas.hidden = !on;
    els.stage.classList.toggle("has-image", on);
    els.downloadBtn.disabled = !on;
    els.copyBtn.disabled = !on;
  }

  function loadFile(file) {
    if (!file || !String(file.type || "").startsWith("image/")) return Promise.resolve(false);
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        state.image = img;
        setHasImage(true);
        scheduleDraw();
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
    const slug = t
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
    return slug ? `framekit-${slug}.png` : "framekit.png";
  }

  function canvasBlob() {
    return new Promise((resolve) => {
      if (!state.image) {
        resolve(null);
        return;
      }
      if (state.raf) {
        cancelAnimationFrame(state.raf);
        state.raf = 0;
        draw();
      } else {
        draw();
      }
      els.canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }

  function showStatus(msg, isErr) {
    els.status.hidden = !msg;
    els.status.textContent = msg || "";
    els.status.classList.toggle("is-err", !!isErr);
    clearTimeout(state.statusTimer);
    if (msg) {
      state.statusTimer = setTimeout(() => {
        els.status.hidden = true;
      }, 2200);
    }
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
      setTimeout(() => {
        els.copyBtn.textContent = prev;
      }, 1600);
    } catch (err) {
      showStatus("Copy failed — use Download", true);
    }
  }

  function renderSwatches() {
    els.swatches.innerHTML = "";
    PRESETS.forEach((p) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "swatch" + (p.id === state.presetId && !state.custom ? " is-on" : "");
      b.title = p.id;
      b.setAttribute("role", "listitem");
      if (p.type === "solid") {
        b.style.background = p.color;
      } else {
        b.style.background = `linear-gradient(${p.angle}deg, ${p.colors[0]}, ${p.colors[1]})`;
      }
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

  els.chromeToggle.addEventListener("change", scheduleDraw);
  els.titleInput.addEventListener("input", scheduleDraw);

  els.hexInput.addEventListener("input", () => {
    const hex = parseHex(els.hexInput.value);
    if (!hex) return;
    state.custom = hex;
    state.presetId = null;
    renderSwatches();
    scheduleDraw();
  });

  els.openBtn.addEventListener("click", () => els.fileInput.click());
  els.stage.addEventListener("click", (e) => {
    if (e.target.closest("canvas")) return;
    if (!state.image) els.fileInput.click();
  });
  els.fileInput.addEventListener("change", () => {
    const f = els.fileInput.files && els.fileInput.files[0];
    if (f) loadFile(f);
    els.fileInput.value = "";
  });

  let dragDepth = 0;
  els.stage.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dragDepth += 1;
    els.stage.classList.add("is-drag");
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
    e.preventDefault();
    dragDepth = 0;
    els.stage.classList.remove("is-drag");
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) loadFile(f);
  });

  window.addEventListener("paste", (e) => {
    const cd = e.clipboardData;
    if (!cd) return;
    const items = cd.items ? Array.from(cd.items) : [];
    const imgItem = items.find((it) => it.type && it.type.startsWith("image/"));
    if (imgItem) {
      e.preventDefault();
      loadFile(imgItem.getAsFile());
      return;
    }
    const files = cd.files ? Array.from(cd.files) : [];
    const imgFile = files.find((f) => f.type && f.type.startsWith("image/"));
    if (imgFile) {
      e.preventDefault();
      loadFile(imgFile);
    }
  });

  els.downloadBtn.addEventListener("click", downloadPng);
  els.copyBtn.addEventListener("click", copyPng);

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

  window.Framekit = {
    loadFile,
    loadUrl,
    draw,
    exportFilename,
    async exportBlob() {
      return canvasBlob();
    },
    exportDataURL() {
      if (!state.image) return null;
      draw();
      return els.canvas.toDataURL("image/png");
    },
    hasImage() {
      return !!state.image;
    },
    canvas: els.canvas,
    getSize() {
      return { width: els.canvas.width, height: els.canvas.height };
    },
  };

  const params = new URLSearchParams(location.search);
  const demo = params.get("demo");
  const proof = params.get("proof");
  if (params.get("title")) {
    els.titleInput.value = params.get("title");
  }
  if (demo) {
    loadUrl(demo)
      .then(async (ok) => {
        if (ok && proof === "1") {
          const blob = await canvasBlob();
          if (blob) {
            await fetch("/__proof_save", { method: "POST", body: blob });
          }
        }
      })
      .catch(() => showStatus("Could not load demo image", true));
  }
})();
