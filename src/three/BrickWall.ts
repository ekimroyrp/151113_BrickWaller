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
  private wireframeGroup: THREE.Group | null = null;
  private wireframeGeometry: THREE.EdgesGeometry | null = null;
  private wireframeMaterial: THREE.LineBasicMaterial | null = null;
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
    falloffAnchor?: THREE.Vector3,
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
    let placements = this.computePlacements(curve, params);
    placements = this.applyFalloff(placements, params, curve, falloffAnchor);
    this.applyPlacements(curve, placements, params);
  }

  public dispose() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh = null;
    }
    if (this.wireframeGroup) {
      this.scene.remove(this.wireframeGroup);
      this.wireframeGroup = null;
    }
    if (this.wireframeGeometry) {
      this.wireframeGeometry.dispose();
      this.wireframeGeometry = null;
    }
    if (this.wireframeMaterial) {
      this.wireframeMaterial.dispose();
      this.wireframeMaterial = null;
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

  private applyFalloff(
    placements: BrickPlacement[],
    params: BrickParameters,
    curve: THREE.CatmullRomCurve3,
    falloffAnchor?: THREE.Vector3,
  ): BrickPlacement[] {
    const { falloff, rows } = params;
    const clampedFalloff = Math.max(0, Math.min(falloff ?? 0, 1));
    if (
      clampedFalloff <= 0 ||
      !falloffAnchor ||
      !Number.isFinite(rows) ||
      rows <= 1
    ) {
      return placements;
    }

    const totalLength = curve.getLength();
    if (!Number.isFinite(totalLength) || totalLength <= 0) {
      return placements;
    }

    const sampleCount = 256;
    let bestU = 0;
    let bestDistSq = Number.POSITIVE_INFINITY;
    const samplePoint = new THREE.Vector3();
    for (let i = 0; i <= sampleCount; i += 1) {
      const u = i / sampleCount;
      curve.getPointAt(u, samplePoint);
      const dx = samplePoint.x - falloffAnchor.x;
      const dz = samplePoint.z - falloffAnchor.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestU = u;
      }
    }
    const anchorDistance = bestU * totalLength;

    const byRow = new Map<number, BrickPlacement[]>();
    for (const placement of placements) {
      const list = byRow.get(placement.row) ?? [];
      list.push(placement);
      byRow.set(placement.row, list);
    }

    const result: BrickPlacement[] = [];
    for (const [row, rowPlacements] of byRow.entries()) {
      rowPlacements.sort((a, b) => a.distance - b.distance);
      if (row === 0) {
        result.push(...rowPlacements);
        continue;
      }
      const rowFactor = rows > 1 ? row / (rows - 1) : 0;
      const keepFraction = 1 - clampedFalloff * rowFactor;
      if (keepFraction >= 0.999) {
        result.push(...rowPlacements);
        continue;
      }
      const totalBricks = rowPlacements.length;
      let bricksToKeep = Math.max(1, Math.round(totalBricks * keepFraction));
      bricksToKeep = Math.min(totalBricks, bricksToKeep);

      let closestIndex = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      rowPlacements.forEach((placement, index) => {
        const d = Math.abs(placement.distance - anchorDistance);
        if (d < bestDist) {
          bestDist = d;
          closestIndex = index;
        }
      });

      let start = closestIndex - Math.floor((bricksToKeep - 1) / 2);
      start = Math.max(0, Math.min(start, totalBricks - bricksToKeep));
      const end = start + bricksToKeep;
      for (let i = start; i < end; i += 1) {
        result.push(rowPlacements[i]);
      }
    }

    return result;
  }

  private applyPlacements(
    curve: THREE.CatmullRomCurve3,
    placements: BrickPlacement[],
    params: BrickParameters,
  ) {
    const { brickHeight, brickLength, brickWidth, gap } = params;
    this.dispose();
    if (placements.length === 0) {
      return;
    }

    const maxShrink = Math.max(
      0,
      Math.min(brickLength, brickWidth, brickHeight) - 0.01,
    );
    const clampedGap = Math.max(0, Math.min(gap, maxShrink));
    const effectiveLength = Math.max(brickLength - clampedGap, 0.01);
    const effectiveHeight = Math.max(brickHeight - clampedGap, 0.01);
    const effectiveWidth = Math.max(brickWidth - clampedGap, 0.01);

    const solidGeometry = new THREE.BoxGeometry(
      effectiveLength,
      effectiveHeight,
      effectiveWidth,
    );
    const material = new THREE.MeshStandardMaterial({
      color: 0xd46a35,
      roughness: 0.65,
      metalness: 0.05,
    });
    this.mesh = new THREE.InstancedMesh(
      solidGeometry,
      material,
      placements.length,
    );
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);

    this.wireframeGeometry = new THREE.EdgesGeometry(solidGeometry);
    this.wireframeMaterial = new THREE.LineBasicMaterial({
      color: 0x4a4d55,
      transparent: true,
      opacity: 0.6,
      linewidth: 1,
    });
    this.wireframeMaterial.depthWrite = false;
    const wireGroup = new THREE.Group();
    this.wireframeGroup = wireGroup;
    this.scene.add(wireGroup);

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

      if (this.wireframeGeometry && this.wireframeMaterial && this.wireframeGroup) {
        const outline = new THREE.LineSegments(
          this.wireframeGeometry,
          this.wireframeMaterial,
        );
        outline.matrixAutoUpdate = false;
        outline.matrix.copy(this.tempObject.matrix);
        this.wireframeGroup.add(outline);
      }
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
