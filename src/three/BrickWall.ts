import * as THREE from 'three';
import type { CurvePoint } from '../types/curve';
import type { BrickParameters } from '../types/bricks';

interface BrickPlacement {
  distance: number;
  row: number;
}

export class BrickWall {
  private readonly scene: THREE.Scene;
  private mesh: THREE.InstancedMesh<
    THREE.BoxGeometry,
    THREE.MeshStandardMaterial
  > | null = null;
  private readonly baseWorldWidth = 30;
  private readonly baseWorldDepth = 14;
  private readonly axisReference = new THREE.Vector3(1, 0, 0);
  private readonly tempObject = new THREE.Object3D();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public update(
    points: CurvePoint[],
    params: BrickParameters,
    targetLength?: number,
  ) {
    if (points.length < 2) {
      return;
    }
    const baseCurve = this.createCurve(
      points,
      this.baseWorldWidth,
      this.baseWorldDepth,
    );
    let curve = baseCurve;
    if (targetLength && targetLength > 0) {
      const baseLength = baseCurve.getLength();
      if (Number.isFinite(baseLength) && baseLength > 0) {
        const scale = targetLength / baseLength;
        const worldWidth = this.baseWorldWidth * scale;
        const worldDepth = this.baseWorldDepth * scale;
        curve = this.createCurve(points, worldWidth, worldDepth);
      }
    }
    const placements = this.computePlacements(curve, params);
    this.applyPlacements(curve, placements, params);
  }

  public dispose() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh = null;
    }
  }

  private createCurve(
    points: CurvePoint[],
    worldWidth: number,
    worldDepth: number,
  ) {
    let sumX = 0;
    let sumY = 0;
    for (const point of points) {
      sumX += point.x;
      sumY += point.y;
    }
    const centerX = sumX / points.length;
    const centerY = sumY / points.length;

    const vectors = points.map(
      (point) =>
        new THREE.Vector3(
          (point.x - centerX) * worldWidth,
          0,
          (point.y - centerY) * worldDepth,
        ),
    );
    return new THREE.CatmullRomCurve3(vectors, false, 'catmullrom', 0.5);
  }

  private computePlacements(
    curve: THREE.CatmullRomCurve3,
    params: BrickParameters,
  ) {
    const totalLength = curve.getLength();
    if (!Number.isFinite(totalLength) || totalLength <= 0) {
      return [];
    }
    const placements: BrickPlacement[] = [];
    const { brickLength, rows } = params;
    for (let row = 0; row < rows; row += 1) {
      const rowOffset = row % 2 ? brickLength / 2 : 0;
      const usableLength = Math.max(totalLength - rowOffset, brickLength);
      const bricksInRow = Math.max(
        1,
        Math.floor(usableLength / brickLength),
      );
      for (let i = 0; i < bricksInRow; i += 1) {
        const centerDistance = rowOffset + (i + 0.5) * brickLength;
        if (centerDistance > totalLength) {
          continue;
        }
        placements.push({ distance: centerDistance, row });
      }
    }
    return placements;
  }

  private applyPlacements(
    curve: THREE.CatmullRomCurve3,
    placements: BrickPlacement[],
    params: BrickParameters,
  ) {
    const { brickHeight, brickLength, brickWidth } = params;
    this.dispose();
    if (placements.length === 0) {
      return;
    }
    const geometry = new THREE.BoxGeometry(
      brickLength,
      brickHeight,
      brickWidth,
    );
    const material = new THREE.MeshStandardMaterial({
      color: 0xd46a35,
      roughness: 0.65,
      metalness: 0.05,
    });
    this.mesh = new THREE.InstancedMesh(geometry, material, placements.length);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);

    const totalLength = curve.getLength();
    placements.forEach((placement, index) => {
      const u = Math.min(placement.distance / totalLength, 1);
      const point = curve.getPointAt(u);
      const tangent = curve.getTangentAt(u).setY(0).normalize();
      if (tangent.lengthSq() === 0) {
        tangent.copy(this.axisReference);
      }
      const quaternion = new THREE.Quaternion().setFromUnitVectors(
        this.axisReference,
        tangent,
      );
      this.tempObject.position.copy(point);
      this.tempObject.position.y =
        placement.row * brickHeight + brickHeight * 0.5;
      this.tempObject.quaternion.copy(quaternion);
      this.tempObject.scale.set(1, 1, 1);
      this.tempObject.updateMatrix();
      this.mesh!.setMatrixAt(index, this.tempObject.matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
