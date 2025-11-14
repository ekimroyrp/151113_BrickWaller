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
  private readonly gridHelper: THREE.GridHelper;
  private readonly shadowPlane: THREE.Mesh<
    THREE.PlaneGeometry,
    THREE.ShadowMaterial
  >;
  private animationId = 0;
  private currentCurve: CurvePoint[];
  private currentParams: BrickParameters;
  private pathLength = 24;
  private readonly falloffAnchor: THREE.Vector3;
  private readonly falloffMarker: THREE.Mesh<
    THREE.SphereGeometry,
    THREE.MeshStandardMaterial
  >;
  private readonly raycaster: THREE.Raycaster;
  private readonly groundPlane: THREE.Plane;
  private isDraggingFalloff = false;
  private readonly handleExportMesh: () => void;
  private readonly handleScreenshot: () => void;

  constructor(host: HTMLElement, controlsHost: HTMLElement) {
    this.host = host;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05090f);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
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

    const gridHelper = new THREE.GridHelper(
      2000,
      400,
      0x4a4f59,
      0xb6bcc8,
    );
    const gridMaterials = Array.isArray(gridHelper.material)
      ? gridHelper.material
      : [gridHelper.material];
    gridMaterials.forEach((material) => {
      material.transparent = true;
      material.opacity = 0.22;
      material.depthWrite = false;
      material.depthTest = true;
    });
    gridHelper.position.y = 0;
    gridHelper.renderOrder = -1;
    this.scene.add(gridHelper);
    this.gridHelper = gridHelper;

    this.shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(2000, 2000),
      new THREE.ShadowMaterial({ opacity: 0.35 }),
    );
    this.shadowPlane.rotation.x = -Math.PI / 2;
    this.shadowPlane.position.y = 0.01;
    this.shadowPlane.receiveShadow = true;
    this.scene.add(this.shadowPlane);

    this.falloffAnchor = new THREE.Vector3(0, 0.01, 4);
    this.falloffMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0xff9b50,
        emissive: 0x40210c,
        emissiveIntensity: 0.85,
      }),
    );
    this.falloffMarker.position.copy(this.falloffAnchor);
    this.falloffMarker.castShadow = false;
    this.falloffMarker.receiveShadow = false;
    this.falloffMarker.renderOrder = 10;
    this.scene.add(this.falloffMarker);

    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.handleExportMesh = () => {
      const obj = this.brickWall.exportOBJ();
      if (!obj) {
        return;
      }
      const blob = new Blob([obj], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.href = url;
      link.download = `brickwall-${timestamp}.obj`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    this.handleScreenshot = () => {
      const canvas = this.renderer.domElement;
      try {
        this.renderer.render(this.scene, this.camera);
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.href = dataUrl;
        link.download = `brickwall-${timestamp}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch {
        // ignore screenshot errors
      }
    };

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
      onPathLengthChange: (length) => {
        this.pathLength = length;
        this.rebuildWall();
      },
      onExportMesh: () => {
        this.handleExportMesh();
      },
      onScreenshot: () => {
        this.handleScreenshot();
      },
    });
    this.currentCurve = this.controlPanel.getCurvePoints();
    this.currentParams = this.controlPanel.getParams();
    this.pathLength = this.controlPanel.getPathLength();

    this.setupEnvironment();
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
    this.renderer.domElement.addEventListener(
      'pointerdown',
      this.handleFalloffPointerDown,
    );
    window.addEventListener('pointermove', this.handleFalloffPointerMove);
    window.addEventListener('pointerup', this.handleFalloffPointerUp);
    window.addEventListener('pointerleave', this.handleFalloffPointerUp);
    this.animate();
  }

  private setupEnvironment() {
    const ambient = new THREE.AmbientLight(0x1a1d25, 0.3);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xf2f6ff, 0x0a0c12, 0.55);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffd6a3, 1.35);
    keyLight.position.set(7, 14, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(4096, 4096);
    const keyCam = keyLight.shadow.camera as THREE.OrthographicCamera;
    keyCam.left = -25;
    keyCam.right = 25;
    keyCam.top = 25;
    keyCam.bottom = -25;
    keyCam.near = 2;
    keyCam.far = 60;
    keyLight.shadow.bias = -0.0006;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x8ec9ff, 0.55);
    rimLight.position.set(-6, 9, -10);
    this.scene.add(rimLight);

    const bounce = new THREE.SpotLight(0xffe3ba, 0.4, 50, Math.PI / 3, 0.5);
    bounce.position.set(0, 12, -8);
    bounce.target.position.set(0, 0, 0);
    bounce.castShadow = false;
    this.scene.add(bounce);
    this.scene.add(bounce.target);
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
    this.brickWall.update(
      this.currentCurve,
      this.currentParams,
      this.pathLength,
      this.falloffAnchor,
    );
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  public dispose() {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener(
      'pointerdown',
      this.handleFalloffPointerDown,
    );
    window.removeEventListener('pointermove', this.handleFalloffPointerMove);
    window.removeEventListener('pointerup', this.handleFalloffPointerUp);
    window.removeEventListener('pointerleave', this.handleFalloffPointerUp);
    this.controls.dispose();
    this.brickWall.dispose();
    this.controlPanel.destroy();
    this.gridHelper.geometry.dispose();
    const gridMaterials = Array.isArray(this.gridHelper.material)
      ? this.gridHelper.material
      : [this.gridHelper.material];
    gridMaterials.forEach((material) => material.dispose());
    this.shadowPlane.geometry.dispose();
    this.shadowPlane.material.dispose();
    this.falloffMarker.geometry.dispose();
    this.falloffMarker.material.dispose();
    this.renderer.dispose();
  }

  private handleFalloffPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) {
      return;
    }
    const hit = this.getGroundIntersection(event);
    if (!hit) {
      return;
    }
    const threshold = 1;
    if (hit.distanceToSquared(this.falloffAnchor) > threshold * threshold) {
      return;
    }
    this.isDraggingFalloff = true;
    this.controls.enabled = false;
    this.updateFalloffAnchor(hit);
    this.rebuildWall();
  };

  private handleFalloffPointerMove = (event: PointerEvent) => {
    if (!this.isDraggingFalloff) {
      return;
    }
    const hit = this.getGroundIntersection(event);
    if (!hit) {
      return;
    }
    this.updateFalloffAnchor(hit);
    this.rebuildWall();
  };

  private handleFalloffPointerUp = () => {
    if (!this.isDraggingFalloff) {
      return;
    }
    this.isDraggingFalloff = false;
    this.controls.enabled = true;
  };

  private getGroundIntersection(event: PointerEvent): THREE.Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
    const target = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, target);
    return hit ?? null;
  }

  private updateFalloffAnchor(position: THREE.Vector3) {
    this.falloffAnchor.set(position.x, 0.01, position.z);
    this.falloffMarker.position.copy(this.falloffAnchor);
  }
}
