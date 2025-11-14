import './style.css';
import { BrickScene } from './three/BrickScene';

const appRoot = document.querySelector<HTMLDivElement>('#app');
if (!appRoot) {
  throw new Error('App root not found');
}

const canvasStack = document.createElement('div');
canvasStack.className = 'canvas-stack';
appRoot.appendChild(canvasStack);

const curvePanel = document.createElement('div');
curvePanel.className = 'curve-panel';
const panelTitle = document.createElement('p');
panelTitle.className = 'curve-panel__title';
panelTitle.textContent = 'Path Designer';
const curveCanvas = document.createElement('canvas');
curveCanvas.className = 'curve-panel__canvas';
const panelHint = document.createElement('p');
panelHint.className = 'curve-panel__hint';
panelHint.textContent = 'Drag handles to sculpt the route.';
curvePanel.appendChild(panelTitle);
curvePanel.appendChild(curveCanvas);
curvePanel.appendChild(panelHint);
canvasStack.appendChild(curvePanel);

const instructions = document.createElement('div');
instructions.className = 'overlay-instructions';
instructions.textContent =
  'Scroll to orbit • Right click to pan • Drag handles to edit the curve';
canvasStack.appendChild(instructions);

const brickScene = new BrickScene(canvasStack, curveCanvas);

window.addEventListener('beforeunload', () => brickScene.dispose());
