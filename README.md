# Framekit

A local screenshot stager: paste or drop a raw capture, get a padded, shadowed, gradient-backed PNG ready to post. No account, no watermark, no API keys.

Framekit is an original tool and is not affiliated with Xnapper or any commercial screenshot app.

## Run locally

Open `index.html` in a browser, or from this folder:

```
python3 -m http.server 8765
```

Then visit http://127.0.0.1:8765/

## Use

1. Paste (Cmd/Ctrl-V), drop, or open a PNG, JPEG, WebP, or GIF.
2. Tune padding, corner radius, and shadow. Pick a background or enter a hex color.
3. Optionally show window chrome and set a title.
4. Download PNG or copy the composed image to the clipboard.

Export is the full composed frame (background + chrome + padded image + shadow), not the raw upload. Filename is `framekit.png`, or `framekit-<title>.png` when a chrome title is set.

## License

MIT. Copyright 2026 Asher Weisberger.
