export class UI {
  constructor({ storage, emulator, controls }) {
    this.storage = storage;
    this.emulator = emulator;
    this.controls = controls;
    this.folder = 'installed';
    this.games = [];
    this.cacheEls();
  }

  cacheEls() {
    this.els = {
      clock: document.querySelector('#clock'),
      status: document.querySelector('#status'),
      romInput: document.querySelector('#rom-input'),
      library: document.querySelector('#library-grid'),
      tabs: [...document.querySelectorAll('.folder-tab')],
      quickSave: document.querySelector('#quick-save'),
      quickLoad: document.querySelector('#quick-load'),
      resume: document.querySelector('#resume-last'),
      settings: document.querySelector('#settings-modal'),
      openSettings: document.querySelector('#open-settings'),
      closeSettings: document.querySelector('#close-settings'),
      dropZone: document.querySelector('#drop-zone')
    };
  }

  async init() {
    this.renderClock();
    setInterval(() => this.renderClock(), 1000);

    const roms = await this.storage.getRoms();
    const builtins = [
      { gameId: 'demo-platformer', name: 'Pixel Platformer', cover: this.paintCover('#3a78ff', 'PLT'), type: 'demo', folder: 'installed' },
      { gameId: 'demo-pong', name: 'Neon Pong', cover: this.paintCover('#009688', 'PNG'), type: 'demo', folder: 'installed' },
      { gameId: 'demo-rpg', name: 'Tiny RPG', cover: this.paintCover('#673ab7', 'RPG'), type: 'demo', folder: 'favorites' }
    ];
    this.games = [...builtins, ...roms.map((r) => ({ ...r, folder: r.favorite ? 'favorites' : 'installed' }))];

    const recent = await this.storage.getMeta('recent', []);
    this.games.push(...recent.filter((g) => !this.games.find((i) => i.gameId === g.gameId)).map((g) => ({ ...g, folder: 'recent' })));

    this.bindEvents();
    this.renderLibrary();
    this.applySettings();
  }

  bindEvents() {
    this.els.romInput.addEventListener('change', (e) => this.handleRomFiles(e.target.files));
    this.els.tabs.forEach((t) => t.addEventListener('click', () => {
      this.folder = t.dataset.folder;
      this.els.tabs.forEach((x) => x.classList.toggle('active', x === t));
      this.renderLibrary();
    }));

    this.els.quickSave.addEventListener('click', () => this.quickSave());
    this.els.quickLoad.addEventListener('click', () => this.quickLoad());
    this.els.resume.addEventListener('click', () => this.resumeLast());

    this.els.openSettings.addEventListener('click', () => this.els.settings.classList.remove('hidden'));
    this.els.closeSettings.addEventListener('click', () => this.els.settings.classList.add('hidden'));

    const prevent = (e) => { e.preventDefault(); this.els.dropZone.classList.remove('hidden'); };
    window.addEventListener('dragenter', prevent);
    window.addEventListener('dragover', prevent);
    window.addEventListener('dragleave', () => this.els.dropZone.classList.add('hidden'));
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      this.els.dropZone.classList.add('hidden');
      this.handleRomFiles(e.dataTransfer.files);
    });
  }

  async handleRomFiles(fileList) {
    const files = [...fileList];
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const id = `rom-${crypto.randomUUID()}`;
      const game = {
        id,
        gameId: id,
        name: file.name.replace(/\.[^/.]+$/, ''),
        fileName: file.name,
        data: buffer,
        type: 'rom',
        cover: this.paintCover('#1f2937', file.name.slice(0, 3).toUpperCase()),
        folder: 'installed'
      };
      await this.storage.saveRom(game);
      this.games.push(game);
    }
    this.renderLibrary();
  }

  renderLibrary() {
    const view = this.games.filter((g) => g.folder === this.folder);
    this.els.library.innerHTML = '';
    view.forEach((game) => {
      const card = document.createElement('article');
      card.className = 'game-card';
      card.innerHTML = `<img src="${game.cover}" alt="${game.name}"/><div class="meta">${game.name}</div>`;
      card.addEventListener('click', () => this.launchGame(game));
      this.els.library.append(card);
    });
  }

  async launchGame(game) {
    document.body.classList.add('emulating');
    this.els.status.textContent = `Running: ${game.name}`;
    await this.emulator.start(game, this.controls.state);
    await this.storage.setMeta('lastGame', game);
    const recent = await this.storage.getMeta('recent', []);
    await this.storage.setMeta('recent', [game, ...recent.filter((r) => r.gameId !== game.gameId)].slice(0, 10));
  }

  async resumeLast() {
    const game = await this.storage.getMeta('lastGame', null);
    if (game) this.launchGame(game);
  }

  async quickSave() {
    const snapshot = this.emulator.serializeState();
    if (!snapshot.gameId) return;
    await this.storage.saveState({ id: snapshot.gameId, snapshot });
    this.els.status.textContent = `Saved ${snapshot.name}`;
  }

  async quickLoad() {
    const game = await this.storage.getMeta('lastGame', null);
    if (!game) return;
    const state = await this.storage.getState(game.gameId);
    this.els.status.textContent = state ? `Loaded state (${state.snapshot.frame} frames)` : 'No state found';
  }

  renderClock() {
    this.els.clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  paintCover(color, text) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = color; x.fillRect(0, 0, 128, 128);
    x.fillStyle = '#fff'; x.font = '700 30px sans-serif';
    x.fillText(text.slice(0, 3), 30, 72);
    return c.toDataURL();
  }

  applyScale(scale) {
    const app = document.querySelector('#app');
    if (scale === 'fullscreen') {
      app.style.maxWidth = '100vw';
      app.style.transform = 'scale(1)';
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      return;
    }
    if (document.fullscreenElement) document.exitFullscreen?.();
    app.style.maxWidth = '960px';
    app.style.transformOrigin = 'top center';
    app.style.transform = `scale(${Number(scale) || 1})`;
  }

  async applySettings() {
    const theme = await this.storage.getSetting('theme', 'th-blue');
    document.body.className = theme;
    document.querySelector('#theme-select').value = theme;

    const scale = await this.storage.getSetting('scale', '1');
    document.querySelector('#scale-select').value = scale;
    this.applyScale(scale);

    const shader = await this.storage.getSetting('shader', 'none');
    document.querySelector('#shader-select').value = shader;
    document.body.classList.toggle('shader-crt', shader === 'crt');

    const scanline = await this.storage.getSetting('scanline', 0.2);
    document.querySelector('#scanline-slider').value = scanline;
    document.documentElement.style.setProperty('--scanline', scanline);

    const smooth = await this.storage.getSetting('smooth', false);
    document.querySelector('#smooth-toggle').checked = smooth;
    document.querySelectorAll('canvas').forEach((c) => c.style.imageRendering = smooth ? 'auto' : 'pixelated');

    const volume = await this.storage.getSetting('volume', 0.6);
    const muted = await this.storage.getSetting('muted', false);
    document.querySelector('#volume-slider').value = volume;
    document.querySelector('#mute-toggle').checked = muted;
    this.emulator.setVolume(volume, muted);

    this.bindSettingsInputs();
  }

  bindSettingsInputs() {
    document.querySelector('#theme-select').addEventListener('change', async (e) => {
      document.body.className = e.target.value;
      await this.storage.setSetting('theme', e.target.value);
    });
    document.querySelector('#scale-select').addEventListener('change', async (e) => {
      this.applyScale(e.target.value);
      await this.storage.setSetting('scale', e.target.value);
    });
    document.querySelector('#shader-select').addEventListener('change', async (e) => {
      document.body.classList.toggle('shader-crt', e.target.value === 'crt');
      await this.storage.setSetting('shader', e.target.value);
    });
    document.querySelector('#scanline-slider').addEventListener('input', async (e) => {
      document.documentElement.style.setProperty('--scanline', e.target.value);
      await this.storage.setSetting('scanline', Number(e.target.value));
    });
    document.querySelector('#smooth-toggle').addEventListener('change', async (e) => {
      document.querySelectorAll('canvas').forEach((c) => c.style.imageRendering = e.target.checked ? 'auto' : 'pixelated');
      await this.storage.setSetting('smooth', e.target.checked);
    });
    document.querySelector('#volume-slider').addEventListener('input', async (e) => {
      const muted = document.querySelector('#mute-toggle').checked;
      this.emulator.setVolume(Number(e.target.value), muted);
      await this.storage.setSetting('volume', Number(e.target.value));
    });
    document.querySelector('#mute-toggle').addEventListener('change', async (e) => {
      const volume = Number(document.querySelector('#volume-slider').value);
      this.emulator.setVolume(volume, e.target.checked);
      await this.storage.setSetting('muted', e.target.checked);
    });
    document.querySelector('#remap-controls').addEventListener('click', () => {
      this.controls.startRemap('a');
      this.els.status.textContent = 'Press a key to map A';
    });
  }

  hookAutosave() {
    window.addEventListener('beforeunload', async () => {
      const snapshot = this.emulator.serializeState();
      if (snapshot.gameId) await this.storage.saveState({ id: snapshot.gameId, snapshot });
    });
  }
}
