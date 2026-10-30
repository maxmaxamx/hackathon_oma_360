export type RoomGeometry = {
  floorArea: number;
  ceilingArea: number;
  perimeter: number;
  wallArea: number;
};

/**
 * Approximate geometry: room is assumed to be a 4:3 rectangle.
 * Door (1.8 m²) and window (2.0 m²) openings are subtracted from wall area.
 */
export function roomGeometry(area: number, ceiling: number): RoomGeometry {
  const safeArea = Math.max(1, area);
  const width = Math.sqrt((4 * safeArea) / 3);
  const depth = Math.sqrt((3 * safeArea) / 4);
  const perimeter = 2 * (width + depth);
  const wallArea = Math.max(safeArea * 1.2, perimeter * ceiling - 3.8);
  return {
    floorArea: safeArea,
    ceilingArea: safeArea,
    perimeter,
    wallArea,
  };
}

export function roundUpToStep(value: number, step: number): number {
  const safeStep = Math.max(1, Math.floor(step));
  return Math.ceil(value / safeStep) * safeStep;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
