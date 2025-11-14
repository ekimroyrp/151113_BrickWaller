import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ControlPanel } from '../ui/ControlPanel';
import type { BrickParameters } from '../types/bricks';
import type { CurvePoint } from '../types/curve';
import { BrickWall } from './BrickWall';

export class BrickScene {
  private readonly host: HTMLElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly scene: THREE.Scene;
  private readonly controls: OrbitControls;
  private readonly brickWall: BrickWall;
  private readonly controlPanel: ControlPanel;
  private animationId = 0;
  private currentCurve: CurvePoint[];
  private currentParams: BrickParameters;

  constructor(host: HTMLElement, controlsHost: HTMLElement) {
    this.host = host;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050607);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.domElement.classList.add('webgl-surface');
    this.host.prepend(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      50,
      this.host.clientWidth / Math.max(this.host.clientHeight, 1),
      0.1,
      200,
    );
    this.camera.position.set(0, 8, 18);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    this.brickWall = new BrickWall(this.scene);
    this.controlPanel = new ControlPanel(controlsHost, {
      onParamsChange: (params) => {
        this.currentParams = params;
        this.rebuildWall();
      },
      onCurveChange: (points) => {
        this.currentCurve = points;
        this.rebuildWall();
      },
    });
    this.currentCurve = this.controlPanel.getCurvePoints();
    this.currentParams = this.controlPanel.getParams();

    this.setupEnvironment();
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
    this.animate();
  }

  private setupEnvironment() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x1b1d25, 0.65);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(6, 10, 6);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    this.scene.add(dir);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({
        color: 0x0f141c,
        roughness: 1,
        metalness: 0,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private handleResize = () => {
    const width = this.host.clientWidth || window.innerWidth;
    const height = this.host.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.controlPanel.refresh();
    this.rebuildWall();
  };

  private rebuildWall() {
    if (!this.currentCurve || !this.currentParams) {
      return;
    }
    this.brickWall.update(this.currentCurve, this.currentParams);
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  public dispose() {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.handleResize);
    this.controls.dispose();
    this.brickWall.dispose();
    this.controlPanel.destroy();
    this.renderer.dispose();
  }
}
