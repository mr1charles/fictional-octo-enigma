# Web 3DS-Style Emulator UI (Upgraded)

This project is now a modular browser emulator shell with:

- Dual-screen canvas renderer (top + touch bottom)
- Swappable emulator core manager (`src/emulator.js`)
- ROM upload (picker + drag/drop)
- Game library folders (Installed / Favorites / Recent)
- IndexedDB persistence for ROMs, save states, settings, and metadata
- Quick save/load + auto-save on unload
- Built-in demo games (platformer, pong, RPG)
- Keyboard/gamepad/on-screen controls
- Settings app (theme, scale, shader, smoothing, audio)
- CRT/scanline visual effect
- Boot animation + resume last game

## Run locally

Because this uses ES modules and IndexedDB, run with a static server:

```bash
python3 -m http.server 8080
# then open http://localhost:8080/3ds-emu.html
```

## Emulation cores

Current implementation includes:

- Built-in demo renderer for instant games
- Modular `EmulatorManager.loadCore()` with optional `jsnes` CDN loader

To add a heavier WASM core later (e.g. Citra/WebAssembly, SNES9x WASM):

1. Add core loader in `src/emulator.js`
2. Implement `start()` branch for the specific core
3. Pipe audio/video frames into top/bottom canvases
4. Serialize core save state bytes into `Storage.saveState()`

## File structure

- `3ds-emu.html` – main app shell and settings app UI
- `styles.css` – optimized styling, themes, shaders, layout
- `src/main.js` – startup wiring
- `src/emulator.js` – core abstraction and rendering loop
- `src/ui.js` – HOME menu, library, settings, ROM import, save/load UX
- `src/storage.js` – IndexedDB persistence layer
- `src/controls.js` – keyboard, gamepad, and touch controls
