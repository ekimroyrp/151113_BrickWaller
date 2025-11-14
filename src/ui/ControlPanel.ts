import type { BrickParameters } from '../types/bricks';
import { DEFAULT_BRICK_PARAMETERS } from '../types/bricks';
import type { CurvePoint } from '../types/curve';
import { CurveEditor } from './CurveEditor';

interface ControlPanelCallbacks {
  onParamsChange: (params: BrickParameters) => void;
  onCurveChange: (points: CurvePoint[]) => void;
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
  { key: 'brickLength', label: 'Length', min: 0.4, max: 4, step: 0.05, unit: 'm' },
  { key: 'brickWidth', label: 'Width', min: 0.2, max: 2, step: 0.05, unit: 'm' },
  { key: 'brickHeight', label: 'Height', min: 0.1, max: 1, step: 0.02, unit: 'm' },
  { key: 'rows', label: 'Rows', min: 1, max: 20, step: 1, unit: '' },
];

export class ControlPanel {
  private readonly container: HTMLDivElement;
  private readonly curveCanvas: HTMLCanvasElement;
  private readonly curveEditor: CurveEditor;
  private readonly callbacks: ControlPanelCallbacks;
  private readonly sliderValueEls = new Map<keyof BrickParameters, HTMLElement>();
  private params: BrickParameters = { ...DEFAULT_BRICK_PARAMETERS };

  constructor(host: HTMLElement, callbacks: ControlPanelCallbacks) {
    this.callbacks = callbacks;
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

  public destroy() {
    this.curveEditor.destroy();
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
}
