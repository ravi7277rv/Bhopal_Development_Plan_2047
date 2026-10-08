export const SCALE_OPTIONS = [
  { value: 4000, label: '1:4000' },
  { value: 8000, label: '1:8000' },
];

/**
 * Converts a map scale (1:N) into an OpenLayers resolution value
 * (map units per CSS pixel). Assumes meters as the map unit (EPSG:3857)
 * and 96 DPI as the CSS pixel density.
 */
export const scaleToResolution = (scaleDenominator: number): number => {
  const INCHES_PER_METER = 39.3701;
  const DPI = 96;
  return scaleDenominator / (INCHES_PER_METER * DPI);
};

/**
 * Inverse — useful for display or verification.
 */
export const resolutionToScale = (resolution: number): number => {
  const INCHES_PER_METER = 39.3701;
  const DPI = 96;
  return resolution * INCHES_PER_METER * DPI;
};

/**
 * Predefined scale options for the dropdown.
 */
export interface ScaleOption {
  label: string;
  value: number;         // scale denominator
  resolution: number;    // OL resolution (meters per CSS pixel)
}

