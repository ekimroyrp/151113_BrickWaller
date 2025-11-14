export interface BrickParameters {
  brickLength: number;
  brickWidth: number;
  brickHeight: number;
  gap: number;
  falloff: number;
  rows: number;
  flipFalloff: boolean;
}

export const DEFAULT_BRICK_PARAMETERS: BrickParameters = {
  brickLength: 2,
  brickWidth: 1,
  brickHeight: 0.5,
  gap: 0.05,
  falloff: 0,
  rows: 8,
  flipFalloff: false,
};
