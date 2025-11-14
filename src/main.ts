import './style.css';
import { BrickScene } from './three/BrickScene';

const appRoot = document.querySelector<HTMLDivElement>('#app');
if (!appRoot) {
  throw new Error('App root not found');
}

const canvasStack = document.createElement('div');
canvasStack.className = 'canvas-stack';
appRoot.appendChild(canvasStack);

const controlsShell = document.createElement('div');
controlsShell.className = 'controls-shell';
appRoot.appendChild(controlsShell);

const instructions = document.createElement('div');
instructions.className = 'overlay-instructions';
instructions.textContent =
  'Left click to orbit • Right click to pan • Scroll to zoom';
canvasStack.appendChild(instructions);

const brickScene = new BrickScene(canvasStack, controlsShell);

window.addEventListener('beforeunload', () => brickScene.dispose());
