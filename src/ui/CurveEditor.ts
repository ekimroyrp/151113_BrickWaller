import type { CurvePoint } from '../types/curve';

type ChangeHandler = (points: CurvePoint[]) => void;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export class CurveEditor {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private points: CurvePoint[];
  private draggingIndex: number | null = null;
  private readonly handlers = new Set<ChangeHandler>();
  private rectWidth = 0;
  private rectHeight = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to acquire 2D context for curve editor');
    }
    this.ctx = ctx;
    this.points = this.createDefaultPoints();
    this.attachPointerEvents();
  }

  public refreshSize() {
    const rect = this.canvas.getBoundingClientRect();
    this.rectWidth = rect.width;
    this.rectHeight = rect.height;
    const ratio = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    this.canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.draw();
  }

  public onChange(handler: ChangeHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  public getPoints(): CurvePoint[] {
    return this.points.map((p) => ({ ...p }));
  }

  private attachPointerEvents() {
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointerleave', this.handlePointerUp);
  }

  public destroy() {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointerleave', this.handlePointerUp);
  }

  private handlePointerDown = (event: PointerEvent) => {
    const index = this.pickHandle(event);
    if (index === null) {
      return;
    }
    this.draggingIndex = index;
    this.canvas.setPointerCapture(event.pointerId);
    this.canvas.classList.add('dragging');
    this.updatePointFromEvent(index, event);
  };

  private handlePointerMove = (event: PointerEvent) => {
    if (this.draggingIndex === null) {
      return;
    }
    this.updatePointFromEvent(this.draggingIndex, event);
  };

  private handlePointerUp = (event: PointerEvent) => {
    if (this.draggingIndex === null) {
      return;
    }
    this.canvas.classList.remove('dragging');
    try {
      this.canvas.releasePointerCapture(event.pointerId);
    } catch {
      /* noop */
    }
    this.draggingIndex = null;
  };

  private pickHandle(event: PointerEvent): number | null {
    const { clientX, clientY } = event;
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const radius = 14;
    for (let i = 0; i < this.points.length; i += 1) {
      const canvasPoint = this.toCanvasCoords(this.points[i]);
      const dx = canvasPoint.x - x;
      const dy = canvasPoint.y - y;
      if (dx * dx + dy * dy <= radius * radius) {
        return i;
      }
    }
    return null;
  }

  private updatePointFromEvent(index: number, event: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const normX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const normY = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    this.points[index] = { x: normX, y: normY };
    this.draw();
    this.emitChange();
  }

  private emitChange() {
    const snapshot = this.getPoints();
    this.handlers.forEach((handler) => handler(snapshot));
  }

  private toCanvasCoords(point: CurvePoint) {
    return {
      x: point.x * this.rectWidth,
      y: point.y * this.rectHeight,
    };
  }

  private draw() {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#070c14';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawGrid();
    this.drawCurve();
    this.drawHandles();
    ctx.restore();
  }

  private drawGrid() {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    const spacing = Math.max(20, Math.min(40, this.rectWidth / 10));
    for (let x = 0; x <= this.rectWidth; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.rectHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= this.rectHeight; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.rectWidth, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawCurve() {
    if (this.points.length < 2) {
      return;
    }
    const ctx = this.ctx;
    const samples = this.sampleCurve(180);
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ff9b50';
    ctx.beginPath();
    samples.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x * this.rectWidth, point.y * this.rectHeight);
      } else {
        ctx.lineTo(point.x * this.rectWidth, point.y * this.rectHeight);
      }
    });
    ctx.stroke();
    ctx.restore();
  }

  private drawHandles() {
    const ctx = this.ctx;
    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#6d84a5';
    ctx.fillStyle = '#162437';
    for (const point of this.points) {
      const { x, y } = this.toCanvasCoords(point);
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  private sampleCurve(segments: number): CurvePoint[] {
    if (this.points.length < 2) {
      return this.points;
    }
    const extended = [
      this.points[0],
      ...this.points,
      this.points[this.points.length - 1],
    ];
    const output: CurvePoint[] = [];
    for (let i = 0; i < this.points.length - 1; i += 1) {
      const p0 = extended[i];
      const p1 = extended[i + 1];
      const p2 = extended[i + 2];
      const p3 = extended[i + 3];
      for (let j = 0; j <= segments; j += 1) {
        const t = j / segments;
        output.push({
          x: this.catmull(p0.x, p1.x, p2.x, p3.x, t),
          y: this.catmull(p0.y, p1.y, p2.y, p3.y, t),
        });
      }
    }
    return output;
  }

  private catmull(p0: number, p1: number, p2: number, p3: number, t: number) {
    const v0 = (p2 - p0) * 0.5;
    const v1 = (p3 - p1) * 0.5;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * p1 - 2 * p2 + v0 + v1) * t3 +
      (-3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 +
      v0 * t +
      p1
    );
  }

  private createDefaultPoints(): CurvePoint[] {
    return [
      { x: 0.1, y: 0.55 },
      { x: 0.3, y: 0.55 },
      { x: 0.6, y: 0.55 },
      { x: 0.9, y: 0.55 },
    ];
  }
}
