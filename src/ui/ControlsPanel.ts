import GUI from 'lil-gui';

export interface BrickParameters {
  brickLength: number;
  brickWidth: number;
  brickHeight: number;
  rows: number;
}

type ControlsChangeHandler = (params: BrickParameters) => void;

const DEFAULT_PARAMS: BrickParameters = {
  brickLength: 1.2,
  brickWidth: 0.45,
  brickHeight: 0.32,
  rows: 6,
};

export class ControlsPanel {
  private readonly gui: GUI;
  private readonly params: BrickParameters;

  constructor(
    onChange: ControlsChangeHandler,
    initialOverrides: Partial<BrickParameters> = {},
  ) {
    this.params = { ...DEFAULT_PARAMS, ...initialOverrides };
    this.gui = new GUI({ title: 'Brick Controls' });
    this.gui.domElement.style.setProperty('z-index', '5');

    const wallFolder = this.gui.addFolder('Brick Size');
    wallFolder
      .add(this.params, 'brickLength', 0.4, 4, 0.05)
      .name('Length (m)')
      .onChange(() => onChange(this.getValues()));
    wallFolder
      .add(this.params, 'brickWidth', 0.2, 2, 0.05)
      .name('Width (m)')
      .onChange(() => onChange(this.getValues()));
    wallFolder
      .add(this.params, 'brickHeight', 0.1, 1, 0.02)
      .name('Height (m)')
      .onChange(() => onChange(this.getValues()));
    wallFolder.open();

    this.gui
      .add(this.params, 'rows', 1, 20, 1)
      .name('Rows')
      .onChange(() => onChange(this.getValues()));
  }

  public getValues(): BrickParameters {
    return { ...this.params };
  }

  public destroy() {
    this.gui.destroy();
  }
}
