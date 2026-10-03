import type {  MapMarker } from '../types/index.type';



// Approximate Bhopal city boundary polygon (simplified for demo)
// Coordinates in [longitude, latitude] (EPSG:4326)
export const bhopalBoundaryCoordinates: [number, number][] = [
  [77.32, 23.30],
  [77.38, 23.32],
  [77.45, 23.31],
  [77.52, 23.28],
  [77.55, 23.22],
  [77.54, 23.15],
  [77.50, 23.10],
  [77.44, 23.07],
  [77.37, 23.08],
  [77.32, 23.11],
  [77.28, 23.16],
  [77.27, 23.22],
  [77.29, 23.27],
  [77.32, 23.30], // Close the polygon
];

// Center of Bhopal for initial map view
export const BHOPAL_CENTER: [number, number] = [77.4126, 23.2599];