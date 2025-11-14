export interface BrickParameters {
  brickLength: number;
  brickWidth: number;
  brickHeight: number;
  rows: number;
}

export const DEFAULT_BRICK_PARAMETERS: BrickParameters = {
  brickLength: 1.2,
  brickWidth: 0.45,
  brickHeight: 0.32,
  rows: 6,
};
