import type { Camera } from "@packet/document-model";
export type Point = { x: number; y: number };
export type Matrix = [number, number, number, number, number, number];
export function cameraMatrix(c: Camera): Matrix {
  const r = (-c.rotation * Math.PI) / 180,
    a = Math.cos(r) * c.zoom,
    b = Math.sin(r) * c.zoom;
  return [
    a,
    b,
    -b,
    a,
    960 - a * (960 + c.x) + b * (540 + c.y),
    540 - b * (960 + c.x) - a * (540 + c.y),
  ];
}
export const transformPoint = (m: Matrix, p: Point): Point => ({
  x: m[0] * p.x + m[2] * p.y + m[4],
  y: m[1] * p.x + m[3] * p.y + m[5],
});
export function invert(m: Matrix): Matrix {
  const d = m[0] * m[3] - m[1] * m[2];
  if (Math.abs(d) < 1e-10) throw new Error("Singular coordinate matrix");
  return [
    m[3] / d,
    -m[1] / d,
    -m[2] / d,
    m[0] / d,
    (m[2] * m[5] - m[3] * m[4]) / d,
    (m[1] * m[4] - m[0] * m[5]) / d,
  ];
}
export function viewportToWorld(
  p: Point,
  rect: { left: number; top: number; width: number },
  camera: Camera,
): Point {
  const scale = rect.width / 1920;
  return transformPoint(invert(cameraMatrix(camera)), {
    x: (p.x - rect.left) / scale,
    y: (p.y - rect.top) / scale,
  });
}
export function focus(
  element: { x: number; y: number; width: number; height: number },
  zoom = 1.5,
): Camera {
  return {
    x: element.x + element.width / 2 - 960,
    y: element.y + element.height / 2 - 540,
    zoom,
    rotation: 0,
  };
}
