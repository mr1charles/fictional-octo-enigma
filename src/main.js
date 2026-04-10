import { Storage } from './storage.js';
import { EmulatorManager } from './emulator.js';
import { Controls } from './controls.js';
import { UI } from './ui.js';

const emulator = new EmulatorManager({
  topCanvas: document.querySelector('#top-canvas'),
  bottomCanvas: document.querySelector('#bottom-canvas'),
  onFrame: () => {}
});

const controls = new Controls(Storage);
await controls.init();
controls.bindTouchButtons(document.querySelector('.controls-strip'));

const ui = new UI({ storage: Storage, emulator, controls });
await ui.init();
ui.hookAutosave();

setInterval(() => controls.pollGamepad(), 16);
