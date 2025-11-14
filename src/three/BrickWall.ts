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

  public exportOBJ(): string | null {
    if (!this.mesh) {
      return null;
    }
    const geometry = this.mesh.geometry;
    const position = geometry.getAttribute('position');
    if (!position) {
      return null;
    }
    const normalAttr = geometry.getAttribute('normal');
    const indexAttr = geometry.getIndex();

    const vertex = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const matrix = new THREE.Matrix4();
    const normalMatrix = new THREE.Matrix3();

    let obj = '# BrickWall export\n';
    let vertexOffset = 1;
    let normalOffset = 1;

    const instanceCount = this.mesh.count;
    for (let instance = 0; instance < instanceCount; instance += 1) {
      this.mesh.getMatrixAt(instance, matrix);
      normalMatrix.getNormalMatrix(matrix);

      for (let i = 0; i < position.count; i += 1) {
        vertex.fromBufferAttribute(position, i);
        vertex.applyMatrix4(matrix);
        obj += `v ${vertex.x} ${vertex.y} ${vertex.z}\n`;
      }

      if (normalAttr) {
        for (let i = 0; i < normalAttr.count; i += 1) {
          normal.fromBufferAttribute(normalAttr, i);
          normal.applyMatrix3(normalMatrix).normalize();
          obj += `vn ${normal.x} ${normal.y} ${normal.z}\n`;
        }
      }

      if (indexAttr) {
        const indexArray = indexAttr.array as ArrayLike<number>;
        for (let i = 0; i < indexArray.length; i += 3) {
          const a = indexArray[i] + vertexOffset;
          const b = indexArray[i + 1] + vertexOffset;
          const c = indexArray[i + 2] + vertexOffset;
          if (normalAttr) {
            const na = indexArray[i] + normalOffset;
            const nb = indexArray[i + 1] + normalOffset;
            const nc = indexArray[i + 2] + normalOffset;
            obj += `f ${a}//${na} ${b}//${nb} ${c}//${nc}\n`;
          } else {
            obj += `f ${a} ${b} ${c}\n`;
          }
        }
      } else {
        for (let i = 0; i < position.count; i += 3) {
          const a = vertexOffset + i;
          const b = vertexOffset + i + 1;
          const c = vertexOffset + i + 2;
          if (normalAttr) {
            const na = normalOffset + i;
            const nb = normalOffset + i + 1;
            const nc = normalOffset + i + 2;
            obj += `f ${a}//${na} ${b}//${nb} ${c}//${nc}\n`;
          } else {
            obj += `f ${a} ${b} ${c}\n`;
          }
        }
      }

      vertexOffset += position.count;
      if (normalAttr) {
        normalOffset += normalAttr.count;
      }
    }

    return obj;
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
