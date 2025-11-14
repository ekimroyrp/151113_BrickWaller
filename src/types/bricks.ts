export interface BrickParameters {
  brickLength: number;
  brickWidth: number;
  brickHeight: number;
  rows: number;
}

export const DEFAULT_BRICK_PARAMETERS: BrickParameters = {
  brickLength: 2,
  brickWidth: 1,
  brickHeight: 0.5,
  rows: 8,
};
