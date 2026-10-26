// Region of a point on a body standing in anatomical position (Y-up metres, facing +z, anatomical left = +x).
// zMid is the body's own front/back midline (the female reference sits further back than the male).
// Boundaries measured on both reference bodies (scripts/check-regions.mts): diaphragm ≈ 0.70 of height,
// ribcage within 0.08 of height from the midline, humerus centre ≈ 0.11, shoulder joint above 0.77.
// seniordev: height-band heuristic; segment by FMA part names if finer regions are needed.
export function regionAt(p: { x: number; y: number; z: number }, height: number, zMid = 0): string {
    const h = p.y / height;
    const side = p.x > 0 ? 'Left' : 'Right';
    const lateral = Math.abs(p.x) > 0.095 * height;
    if (h >= 0.87) return 'Head';
    if (h >= 0.82 && !lateral) return 'Neck';
    if (lateral && h > 0.42) return h > 0.77 ? `${side} Shoulder` : `${side} Arm`;
    if (h >= 0.53) return p.z < zMid ? 'Back' : h >= 0.70 ? 'Chest' : 'Abdomen';
    if (h >= 0.46) return 'Hips';
    return `${side} Leg`;
}
