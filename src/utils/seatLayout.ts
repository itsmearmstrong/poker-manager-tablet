/** Positions seat `index` of `total` evenly around an oval table, starting at top, going counter-clockwise. */
export function getSeatPosition(index: number, total: number, rx = 46, ry = 42) {
  const angle = ((-90 - (360 * index) / total) * Math.PI) / 180;
  const left = 50 + rx * Math.cos(angle);
  const top = 50 + ry * Math.sin(angle);
  return { left: `${left}%`, top: `${top}%` };
}
