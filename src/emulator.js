export class EmulatorManager {
  constructor({ topCanvas, bottomCanvas, onFrame }) {
    this.top = topCanvas;
    this.bottom = bottomCanvas;
    this.onFrame = onFrame;
    this.ctxTop = this.top.getContext('2d');
    this.ctxBottom = this.bottom.getContext('2d');
    this.running = false;
    this.current = null;
    this.frame = 0;
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.audioCtx.createGain();
    this.master.connect(this.audioCtx.destination);
    this.master.gain.value = 0.6;
  }

  async loadCore(type) {
    if (type === 'nes-js') {
      await this.loadScript('https://cdn.jsdelivr.net/npm/jsnes/dist/jsnes.min.js');
      return 'jsnes';
    }
    return 'builtin';
  }

  loadScript(src) {
    return new Promise((resolve, reject) => {
      if ([...document.scripts].some((s) => s.src === src)) return resolve();
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    });
  }

  async start(game, controls) {
    this.current = { ...game, controls };
    this.running = true;
    this.frame = 0;
    await this.audioCtx.resume();
    this.loop();
  }

  stop() { this.running = false; }

  loop = () => {
    if (!this.running || !this.current) return;
    this.frame += 1;
    const t = this.frame;
    const { gameId } = this.current;
    if (gameId.startsWith('demo-')) {
      this.renderDemo(gameId, t, this.current.controls);
    } else {
      this.renderRomPlaceholder(t, this.current.name);
    }
    this.onFrame?.(this.frame);
    requestAnimationFrame(this.loop);
  };

  renderRomPlaceholder(t, name) {
    this.ctxTop.fillStyle = '#112';
    this.ctxTop.fillRect(0, 0, this.top.width, this.top.height);
    this.ctxTop.fillStyle = '#8cf';
    this.ctxTop.font = '20px sans-serif';
    this.ctxTop.fillText(`Running ${name}`, 20, 40);
    this.ctxTop.fillStyle = '#4cf';
    this.ctxTop.fillRect((t * 2) % this.top.width, 100, 40, 40);

    this.ctxBottom.fillStyle = '#02060a';
    this.ctxBottom.fillRect(0, 0, this.bottom.width, this.bottom.height);
    this.ctxBottom.fillStyle = '#fff';
    this.ctxBottom.fillText('Touch screen active', 10, 20);
  }

  renderDemo(gameId, t, controls) {
    const cx = this.top.width / 2;
    const cy = this.top.height / 2;
    this.ctxTop.clearRect(0, 0, this.top.width, this.top.height);
    this.ctxBottom.clearRect(0, 0, this.bottom.width, this.bottom.height);

    if (gameId === 'demo-pong') {
      this.ctxTop.fillStyle = '#000';
      this.ctxTop.fillRect(0, 0, this.top.width, this.top.height);
      this.ctxTop.fillStyle = '#fff';
      this.ctxTop.fillRect(18, controls.axisY * 80 + 100, 8, 40);
      this.ctxTop.fillRect(this.top.width - 26, Math.sin(t / 30) * 80 + 100, 8, 40);
      this.ctxTop.fillRect((t * 2) % this.top.width, Math.sin(t / 12) * 60 + cy, 7, 7);
    } else if (gameId === 'demo-platformer') {
      const x = controls.axisX * 80 + cx;
      this.ctxTop.fillStyle = '#78b6ff';
      this.ctxTop.fillRect(0, 0, this.top.width, this.top.height);
      this.ctxTop.fillStyle = '#2d7f3a';
      this.ctxTop.fillRect(0, this.top.height - 30, this.top.width, 30);
      this.ctxTop.fillStyle = '#f55';
      this.ctxTop.fillRect(x - 10, this.top.height - 60 + Math.sin(t / 8) * 4, 20, 30);
    } else {
      this.ctxTop.fillStyle = '#121';
      this.ctxTop.fillRect(0, 0, this.top.width, this.top.height);
      this.ctxTop.fillStyle = '#3f7';
      this.ctxTop.fillText('Top-down RPG Demo', 12, 24);
      this.ctxTop.fillRect(cx + controls.axisX * 90, cy + controls.axisY * 90, 12, 12);
    }

    this.ctxBottom.fillStyle = '#00131d';
    this.ctxBottom.fillRect(0, 0, this.bottom.width, this.bottom.height);
    this.ctxBottom.fillStyle = '#9de';
    this.ctxBottom.fillText('Bottom touch map / HUD', 8, 16);
  }

  setVolume(volume, muted) {
    this.master.gain.value = muted ? 0 : volume;
  }

  serializeState() {
    return {
      gameId: this.current?.gameId ?? null,
      name: this.current?.name ?? null,
      frame: this.frame,
      ts: Date.now()
    };
  }
}
