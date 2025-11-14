import type { BrickParameters } from '../types/bricks';
import { DEFAULT_BRICK_PARAMETERS } from '../types/bricks';
import type { CurvePoint } from '../types/curve';
import { CurveEditor } from './CurveEditor';

interface ControlPanelCallbacks {
  onParamsChange: (params: BrickParameters) => void;
  onCurveChange: (points: CurvePoint[]) => void;
  onPathLengthChange: (length: number) => void;
  onExportMesh: () => void;
  onScreenshot: () => void;
}

type SliderConfig = {
  key: keyof BrickParameters;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
};

const SLIDERS: SliderConfig[] = [
  { key: 'brickLength', label: 'Length', min: 0.4, max: 4, step: 0.05, unit: '' },
  { key: 'brickWidth', label: 'Width', min: 0.2, max: 2, step: 0.05, unit: '' },
  { key: 'brickHeight', label: 'Height', min: 0.1, max: 1, step: 0.02, unit: '' },
  { key: 'gap', label: 'Gap', min: 0, max: 0.2, step: 0.005, unit: '' },
  { key: 'rows', label: 'Rows', min: 1, max: 20, step: 1, unit: '' },
];

export class ControlPanel {
  private readonly container: HTMLDivElement;
  private readonly curveCanvas: HTMLCanvasElement;
  private readonly curveEditor: CurveEditor;
  private readonly callbacks: ControlPanelCallbacks;
  private readonly sliderValueEls = new Map<keyof BrickParameters, HTMLElement>();
  private readonly host: HTMLElement;
  private heading: HTMLDivElement | null = null;
  private params: BrickParameters = { ...DEFAULT_BRICK_PARAMETERS };
  private pathLength = 24;
  private dragPointerId: number | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private hostOffsetX = 0;
  private hostOffsetY = 0;

  constructor(host: HTMLElement, callbacks: ControlPanelCallbacks) {
    this.callbacks = callbacks;
    this.host = host;
    this.container = document.createElement('div');
    this.container.className = 'control-panel';
    host.appendChild(this.container);

    const heading = document.createElement('div');
    heading.className = 'control-panel__heading';
    heading.innerHTML = `
      <div>
        <p class="control-panel__eyebrow">Brick Controls</p>
      </div>
    `;
    this.container.appendChild(heading);
    this.heading = heading;
    this.heading.addEventListener('pointerdown', this.handleDragPointerDown);
    window.addEventListener('pointermove', this.handleDragPointerMove);
    window.addEventListener('pointerup', this.handleDragPointerUp);
    window.addEventListener('pointerleave', this.handleDragPointerUp);

    const sliderSection = document.createElement('div');
    sliderSection.className = 'control-panel__section';
    this.container.appendChild(sliderSection);
    SLIDERS.forEach((config) => this.createSlider(sliderSection, config));

    const divider = document.createElement('hr');
    divider.className = 'control-panel__divider';
    this.container.appendChild(divider);

    const pathHeader = document.createElement('div');
    pathHeader.className = 'control-panel__subheading';
    pathHeader.innerHTML = `
      <div>
        <p class="control-panel__eyebrow">Path Designer</p>
      </div>
    `;
    this.container.appendChild(pathHeader);

    const pathLengthWrapper = document.createElement('label');
    pathLengthWrapper.className = 'control-panel__slider';
    const pathValue = document.createElement('span');
    pathValue.className = 'control-panel__slider-value';

    const pathInput = document.createElement('input');
    pathInput.type = 'range';
    pathInput.min = String(8);
    pathInput.max = String(60);
    pathInput.step = String(0.5);
    pathInput.value = String(this.pathLength);
    pathInput.className = 'control-panel__input';

    const updatePathValue = () => {
      const value = Number(pathInput.value);
      pathValue.textContent = value.toFixed(1);
    };
    updatePathValue();

    pathInput.addEventListener('input', () => {
      this.pathLength = Number(pathInput.value);
      updatePathValue();
      this.callbacks.onPathLengthChange(this.pathLength);
    });

    pathLengthWrapper.innerHTML = `
      <div class="control-panel__slider-head">
        <span class="control-panel__label">Length</span>
      </div>
    `;
    pathLengthWrapper
      .querySelector('.control-panel__slider-head')
      ?.appendChild(pathValue);
    pathLengthWrapper.appendChild(pathInput);
    this.container.appendChild(pathLengthWrapper);

    this.curveCanvas = document.createElement('canvas');
    this.curveCanvas.className = 'control-panel__curve-canvas';
    this.container.appendChild(this.curveCanvas);

    const pathNotes = document.createElement('ul');
    pathNotes.className = 'control-panel__notes';
    pathNotes.innerHTML = `
      <li>Drag the nodes to bend the wall path.</li>
      <li>Left click path to add node.</li>
      <li>Right click node to delete node.</li>
    `;
    this.container.appendChild(pathNotes);

    const exportHeader = document.createElement('div');
    exportHeader.className = 'control-panel__subheading';
    exportHeader.innerHTML = `
      <div>
        <p class="control-panel__eyebrow">Export Options</p>
      </div>
    `;
    this.container.appendChild(exportHeader);

    const exportRow = document.createElement('div');
    exportRow.className = 'control-panel__export-row';

    const meshButton = document.createElement('button');
    meshButton.type = 'button';
    meshButton.className = 'control-panel__button';
    meshButton.textContent = 'Mesh';
    meshButton.addEventListener('click', () => this.callbacks.onExportMesh());
    exportRow.appendChild(meshButton);

    const screenshotButton = document.createElement('button');
    screenshotButton.type = 'button';
    screenshotButton.className = 'control-panel__button';
    screenshotButton.textContent = 'Screenshot';
    screenshotButton.addEventListener('click', () =>
      this.callbacks.onScreenshot(),
    );
    exportRow.appendChild(screenshotButton);

    this.container.appendChild(exportRow);

    this.curveEditor = new CurveEditor(this.curveCanvas);
    this.curveEditor.refreshSize();
    this.curveEditor.onChange((points) => this.callbacks.onCurveChange(points));

    // Initial sync
    this.callbacks.onParamsChange(this.getParams());
    this.callbacks.onCurveChange(this.getCurvePoints());
  }

  public refresh() {
    this.curveEditor.refreshSize();
  }

  public getParams(): BrickParameters {
    return { ...this.params };
  }

  public getCurvePoints(): CurvePoint[] {
    return this.curveEditor.getPoints();
  }

  public getPathLength(): number {
    return this.pathLength;
  }

  public destroy() {
    this.curveEditor.destroy();
    if (this.heading) {
      this.heading.removeEventListener('pointerdown', this.handleDragPointerDown);
    }
    window.removeEventListener('pointermove', this.handleDragPointerMove);
    window.removeEventListener('pointerup', this.handleDragPointerUp);
    window.removeEventListener('pointerleave', this.handleDragPointerUp);
    this.container.remove();
  }

  private createSlider(parent: HTMLElement, config: SliderConfig) {
    const wrapper = document.createElement('label');
    wrapper.className = 'control-panel__slider';
    const value = document.createElement('span');
    value.className = 'control-panel__slider-value';
    this.sliderValueEls.set(config.key, value);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(config.min);
    input.max = String(config.max);
    input.step = String(config.step);
    input.value = String(this.params[config.key]);
    input.className = 'control-panel__input';

    const valueDisplay = () => {
      const current = Number(input.value);
      const formatted =
        config.key === 'rows' ? current.toString() : current.toFixed(2);
      value.textContent = `${formatted}${config.unit}`;
    };
    valueDisplay();

    input.addEventListener('input', () => {
      this.params = { ...this.params, [config.key]: Number(input.value) } as BrickParameters;
      valueDisplay();
      this.callbacks.onParamsChange(this.getParams());
    });

    wrapper.innerHTML = `
      <div class="control-panel__slider-head">
        <span class="control-panel__label">${config.label}</span>
      </div>
    `;
    wrapper.querySelector('.control-panel__slider-head')?.appendChild(value);
    wrapper.appendChild(input);
    parent.appendChild(wrapper);
  }

  private handleDragPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) {
      return;
    }
    this.dragPointerId = event.pointerId;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.heading?.classList.add('dragging');
    this.heading?.setPointerCapture(event.pointerId);
  };

  private handleDragPointerMove = (event: PointerEvent) => {
    if (this.dragPointerId === null || event.pointerId !== this.dragPointerId) {
      return;
    }
    const dx = event.clientX - this.dragStartX;
    const dy = event.clientY - this.dragStartY;
    const x = this.hostOffsetX + dx;
    const y = this.hostOffsetY + dy;
    this.host.style.transform = `translate(${x}px, ${y}px)`;
  };

  private handleDragPointerUp = (event: PointerEvent) => {
    if (this.dragPointerId === null || event.pointerId !== this.dragPointerId) {
      return;
    }
    const dx = event.clientX - this.dragStartX;
    const dy = event.clientY - this.dragStartY;
    this.hostOffsetX += dx;
    this.hostOffsetY += dy;
    if (this.heading) {
      this.heading.classList.remove('dragging');
      try {
        this.heading.releasePointerCapture(this.dragPointerId);
      } catch {
        // ignore
      }
    }
    this.dragPointerId = null;
  };
}
