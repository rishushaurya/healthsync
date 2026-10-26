// Self-check for the Digital Twin click → body-region mapping, run against both real reference bodies.
// Usage: node scripts/check-regions.mts   (Node 23.6+ runs TypeScript directly)
// @ts-expect-error TS5097: Node runs this file directly and needs the .ts extension
import { regionAt } from '../src/components/three/regions.ts';

const BASE = 'https://cdn.jsdelivr.net/gh/slorksmo/Human-Atlas@5bb5713aab18d7fe9380c3339eb09f173491ea06/public/models/';
type Part = { name: string; bounds: [number[], number[]] };

// Structure name pattern → region its centre must fall in
const EXPECT: [RegExp, string][] = [
    [/^(Heart|Wall of heart)$/i, 'Chest'], [/^(Left lung|Lung \(left\)|Upper lobe of left lung)$/i, 'Chest'],
    [/^Stomach$/i, 'Abdomen'], [/^(Left kidney|Kidney \(left\))$/i, 'Abdomen'], [/^Liver$/i, 'Abdomen'],
    [/^(Left patella|Patella \(left\))$/i, 'Left Leg'], [/^(Right patella|Patella \(right\))$/i, 'Right Leg'],
    [/^(Left humerus)$/i, 'Left Arm'], [/^(Right humerus)$/i, 'Right Arm'],
    [/^(Midbrain|Pons)$/i, 'Head'], [/^(Urinary bladder|Bladder)$/i, 'Hips'],
];

let failures = 0;
for (const file of ['atlas.json', 'atlas-female.json']) {
    const { parts } = await (await fetch(BASE + file)).json() as { parts: Part[] };
    const height = Math.max(...parts.map(p => p.bounds[1][1]));
    const skin = parts.find(p => p.name === 'Skin')!;
    const zMid = (skin.bounds[0][2] + skin.bounds[1][2]) / 2;
    const centre = (p: Part) => ({ x: (p.bounds[0][0] + p.bounds[1][0]) / 2, y: (p.bounds[0][1] + p.bounds[1][1]) / 2 });
    for (const [re, want] of EXPECT) {
        const part = parts.find(p => re.test(p.name));
        if (!part) continue; // not every structure exists in both reference bodies
        const c = centre(part);
        const got = regionAt({ ...c, z: zMid + 1 }, height, zMid);
        if (got !== want) { failures++; console.log(`FAIL ${file}: ${part.name} → ${got}, expected ${want}`); }
        else console.log(`ok   ${file}: ${part.name} → ${got}`);
    }
    // A point just behind the midline at chest height is the back
    const back = regionAt({ x: 0, y: 0.75 * height, z: zMid - 0.05 }, height, zMid);
    if (back !== 'Back') { failures++; console.log(`FAIL ${file}: behind chest → ${back}`); } else console.log(`ok   ${file}: behind chest → Back`);
}
if (failures) { console.error(`${failures} region check(s) failed`); process.exit(1); }
console.log('All region checks passed');
