# Content Security Policy Configuration

The CSP (Content Security Policy) is now **dynamically generated** based on environment variables.

## How It Works

The CSP is injected during build/dev by a Vite plugin in `vite.config.js`. It reads the `VITE_API_URL` from `.env` and generates appropriate CSP directives.

## Configuration

Edit `.env` to change the API URL:

```env
VITE_API_URL=http://10.0.140.30:3001
```

The Vite plugin will automatically:
1. Parse the URL to extract origin
2. Generate CSP with allowed connections to that origin
3. Include WebSocket URLs for hot reload
4. Add ComfyUI API URL (127.0.0.1:8188)

## Generated CSP Includes

- **connect-src**: API origin, WebSocket URLs, ComfyUI
- **img-src**: API origin (for thumbnails), ComfyUI (for generated images)
- **script-src**: Self + inline scripts (for Vite dev)
- **style-src**: Self + inline styles + Google Fonts

## Restart Required

After changing `.env`, restart the dev server:

```bash
./stop.sh
./start.sh
```

## Production Build

The CSP will be baked into the built HTML using the environment variables at build time.
