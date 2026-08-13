# Framekit

A local screenshot stager: paste or drop a raw capture, get a padded, shadowed, gradient-backed PNG ready to post. No account, no watermark, no API keys.

Auto-balance picks padding, radius, shadow, and a contrasting studio background. Twenty-four backgrounds (plus palettes sampled from the shot). In-browser OCR lets you select and copy text. Redact emails, phones, and tokens automatically, or paint bars by hand. Redact marks export; the text overlay does not.

Framekit is an original tool and is not affiliated with Xnapper or any commercial screenshot app.

## Run locally

Open `index.html` in a browser, or from this folder:

```
python3 -m http.server 8765
```

Then visit http://127.0.0.1:8765/

## Use

1. Paste (Cmd/Ctrl-V), drop, or open a PNG, JPEG, WebP, or GIF. Auto runs once on each new image.
2. Tune padding, radius, and shadow, or hit Auto again. Pick a background, a from-image swatch, or a hex color.
3. Optionally show window chrome and set a title.
4. Select text on the preview or Copy text. Toggle Redact emails, or drag Redact bars on the image.
5. Download PNG or copy the composed image to the clipboard.

Export is the full composed frame (background + chrome + padded image + shadow + redact bars), not the raw upload. Filename is `framekit.png`, or `framekit-<title>.png` when a chrome title is set.

OCR uses Tesseract.js from jsDelivr in the browser. If it fails, framing and export still work.

## License

MIT. Copyright 2026 Asher Weisberger.
