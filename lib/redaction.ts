export type RedactionPoint = { x: number; y: number };
export type RedactionStroke = { points: RedactionPoint[]; size: number };

export function isValidRedactions(data: unknown): data is RedactionStroke[] {
  if (!Array.isArray(data)) return false;
  return data.every(
    (s) =>
      s &&
      typeof s === "object" &&
      typeof (s as any).size === "number" &&
      Array.isArray((s as any).points) &&
      (s as any).points.every(
        (p: any) => p && typeof p.x === "number" && typeof p.y === "number"
      )
  );
}
