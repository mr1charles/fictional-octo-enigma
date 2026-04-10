const DEFAULT_MAP = {
  up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
  a: 'KeyK', b: 'KeyJ', x: 'KeyI', y: 'KeyU', l: 'KeyQ', r: 'KeyE'
};

export class Controls {
  constructor(storage) {
    this.storage = storage;
    this.mapping = { ...DEFAULT_MAP };
    this.state = { axisX: 0, axisY: 0, buttons: new Set() };
    this.remapTarget = null;
  }

  async init() {
    this.mapping = await this.storage.getSetting('controlMap', DEFAULT_MAP);
    window.addEventListener('keydown', this.handleKey);
    window.addEventListener('keyup', this.handleKey);
    window.addEventListener('gamepadconnected', () => console.log('Gamepad connected'));
  }

  handleKey = (e) => {
    if (this.remapTarget && e.type === 'keydown') {
      this.mapping[this.remapTarget] = e.code;
      this.storage.setSetting('controlMap', this.mapping);
      this.remapTarget = null;
      return;
    }
    const action = Object.keys(this.mapping).find((k) => this.mapping[k] === e.code);
    if (!action) return;
    e.preventDefault();
    const isDown = e.type === 'keydown';
    if (['up', 'down', 'left', 'right'].includes(action)) {
      this.updateAxis(action, isDown);
    } else if (isDown) this.state.buttons.add(action);
    else this.state.buttons.delete(action);
  };

  updateAxis(action, isDown) {
    const v = isDown ? 1 : 0;
    if (action === 'left') this.state.axisX = -v;
    if (action === 'right') this.state.axisX = v;
    if (action === 'up') this.state.axisY = -v;
    if (action === 'down') this.state.axisY = v;
  }

  pollGamepad() {
    const pad = navigator.getGamepads?.()[0];
    if (!pad) return;
    this.state.axisX = Math.round((pad.axes[0] || 0) * 100) / 100;
    this.state.axisY = Math.round((pad.axes[1] || 0) * 100) / 100;
  }

  bindTouchButtons(root) {
    root.querySelectorAll('[data-input]').forEach((el) => {
      const key = el.dataset.input;
      const on = () => {
        if (['up', 'down', 'left', 'right'].includes(key)) this.updateAxis(key, true);
        else this.state.buttons.add(key);
      };
      const off = () => {
        if (['up', 'down', 'left', 'right'].includes(key)) this.updateAxis(key, false);
        else this.state.buttons.delete(key);
      };
      el.addEventListener('pointerdown', on);
      el.addEventListener('pointerup', off);
      el.addEventListener('pointerleave', off);
    });
  }

  startRemap(action) { this.remapTarget = action; }
}
