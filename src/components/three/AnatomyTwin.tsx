'use client';

import { useEffect, useMemo, useState } from 'react';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { regionAt } from './regions';

// Medical reference anatomy for the Digital Twin:
//  - Male: BodyParts3D 4.0 © The Database Center for Life Science (CC BY 4.0)
//  - Female: HuBMAP 3D Reference Organ Set for Female, K. Browne & H. Schlehlein (CC BY 4.0), Visible Human data
// Both simplified and packaged by the open-source Human-Atlas viewer (MIT), streamed from jsDelivr at a pinned commit.
const ATLAS_BASE = 'https://cdn.jsdelivr.net/gh/slorksmo/Human-Atlas@5bb5713aab18d7fe9380c3339eb09f173491ea06/public';
const MANIFEST = { male: '/models/atlas.json', female: '/models/atlas-female.json' } as const;
export type AnatomySex = keyof typeof MANIFEST;

type Part = { name: string; system: string; chunk: number; positions: number; normals: number; indices: number; vertexCount: number; indexCount: number; bounds: [number[], number[]] };
type Atlas = { parts: Part[]; chunks: { url: string; bytes: number; gzip?: string }[] };

export const SEVERITY_COLOR: Record<string, string> = { mild: '#D97706', moderate: '#EA580C', severe: '#DC2626' };
export const BODY_REGIONS = ['Head', 'Neck', 'Chest', 'Abdomen', 'Back', 'Hips', 'Left Shoulder', 'Right Shoulder', 'Left Arm', 'Right Arm', 'Left Leg', 'Right Leg'];

// Systems shown in the twin (muscles and the ~1,000 individual vessels are left out to keep it light)
const ORGAN_COLOR: Record<string, string> = {
    cardiac: '#B83A3A', respiratory: '#E2A3A0', digestive: '#D49A62', urinary: '#A85C3C', reproductive: '#D58AA0',
    nervous: '#E6C2B4', brain: '#E6C2B4', endocrine: '#C9A227', lymphatic: '#7FB77E', sensory: '#9DB4C0',
};
const SKIN_SYSTEMS = new Set(['integumentary']);
const SHOWN = new Set([...Object.keys(ORGAN_COLOR), 'integumentary', 'skeletal']);

const skinMat = new THREE.MeshStandardMaterial({ color: '#E8C6AE', roughness: 0.6, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
const boneMat = new THREE.MeshStandardMaterial({ color: '#EDE5D3', roughness: 0.7 });
const organMats = Object.fromEntries(Object.entries(ORGAN_COLOR).map(([s, c]) => [s, new THREE.MeshStandardMaterial({ color: c, roughness: 0.45 })]));
const severityMats = Object.fromEntries(Object.entries(SEVERITY_COLOR).map(([s, c]) => [s, new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.55, roughness: 0.4 })]));

// Where to draw each region's symptom marker (x, y as fractions of body height; z in metres from the midline)
const ANCHORS: Record<string, [number, number, number]> = {
    Head: [0, 0.93, 0.08], Neck: [0, 0.845, 0.06], Chest: [0, 0.75, 0.12], Abdomen: [0, 0.6, 0.12], Back: [0, 0.68, -0.13], Hips: [0, 0.5, 0.1],
    'Left Shoulder': [0.11, 0.81, 0], 'Right Shoulder': [-0.11, 0.81, 0], 'Left Arm': [0.15, 0.6, 0], 'Right Arm': [-0.15, 0.6, 0],
    'Left Leg': [0.06, 0.26, 0.05], 'Right Leg': [-0.06, 0.26, 0.05],
};

async function loadChunk(chunk: Atlas['chunks'][number]): Promise<ArrayBuffer> {
    const gz = !!chunk.gzip && typeof DecompressionStream !== 'undefined';
    const res = await fetch(ATLAS_BASE + (gz ? chunk.gzip! : chunk.url));
    if (!res.ok) throw new Error('Anatomy file failed to load');
    const payload = await res.arrayBuffer();
    const sig = new Uint8Array(payload, 0, 2);
    // jsDelivr serves .gz as a plain file; decode only if it is still gzip
    if (gz && sig[0] === 0x1f && sig[1] === 0x8b) {
        return new Response(new Blob([payload]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    }
    return payload;
}

type Built = { group: THREE.Group; organs: THREE.Mesh[]; bones: THREE.Group; height: number; zMid: number };

// Finished bodies stay in memory so switching female ↔ male is instant
const builtCache: Partial<Record<AnatomySex, Built>> = {};

function useAnatomy(sex: AnatomySex) {
    const [built, setBuilt] = useState<Built | null>(null);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        const cached = builtCache[sex];
        if (cached) {
            setBuilt(cached);
            setProgress(100);
            setError('');
            return;
        }
        const group = new THREE.Group();
        const bones = new THREE.Group();
        group.add(bones);
        const organs: THREE.Mesh[] = [];
        setBuilt(null);
        setProgress(0);
        setError('');

        (async () => {
            const atlas: Atlas = await (await fetch(ATLAS_BASE + MANIFEST[sex])).json();
            const parts = atlas.parts.filter(p => SHOWN.has(p.system));
            const height = Math.max(...parts.map(p => p.bounds[1][1]));
            const skinPart = parts.find(p => p.name === 'Skin');
            const zMid = skinPart ? (skinPart.bounds[0][2] + skinPart.bounds[1][2]) / 2 : 0;
            const built: Built = { group, organs, bones, height, zMid };
            // Skin chunk first so the body silhouette appears immediately
            const skinChunk = skinPart?.chunk ?? 0;
            const order = [...new Set([skinChunk, ...parts.map(p => p.chunk)])];
            let done = 0;

            await Promise.all(Array.from({ length: 3 }, async () => {
                while (order.length) {
                    const ci = order.shift()!;
                    const buffer = await loadChunk(atlas.chunks[ci]);
                    if (cancelled) return;
                    for (const p of parts) {
                        if (p.chunk !== ci) continue;
                        const g = new THREE.BufferGeometry();
                        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buffer, p.positions, p.vertexCount * 3), 3));
                        g.setAttribute('normal', new THREE.BufferAttribute(new Int16Array(buffer, p.normals, p.vertexCount * 3), 3, true));
                        g.setIndex(new THREE.BufferAttribute(new Uint32Array(buffer, p.indices, p.indexCount), 1));
                        const skin = SKIN_SYSTEMS.has(p.system);
                        const mesh = new THREE.Mesh(g, skin ? skinMat : p.system === 'skeletal' ? boneMat : organMats[p.system]);
                        mesh.name = p.name;
                        if (skin) {
                            mesh.renderOrder = 2; // draw the translucent skin over the organs
                            group.add(mesh);
                        } else {
                            mesh.raycast = () => { }; // only the skin is clickable: cheap picking on ~50k triangles
                            if (p.system === 'skeletal') bones.add(mesh);
                            else {
                                const c = new THREE.Vector3().fromArray(p.bounds[0]).add(new THREE.Vector3().fromArray(p.bounds[1])).multiplyScalar(0.5);
                                mesh.userData = { region: regionAt(new THREE.Vector3(c.x, c.y, zMid + 1), height, zMid), system: p.system };
                                organs.push(mesh);
                                group.add(mesh);
                            }
                        }
                    }
                    done++;
                    setProgress(Math.round((done / new Set(parts.map(p => p.chunk)).size) * 100));
                    setBuilt({ ...built });
                }
            }));
            if (!cancelled) builtCache[sex] = built;
        })().catch(() => { if (!cancelled) setError('The 3D anatomy couldn’t load. Check your connection, or switch to the classic body.'); });

        return () => {
            cancelled = true;
            if (builtCache[sex] !== undefined) return; // keep the cached body's GPU buffers
            group.traverse(o => (o as THREE.Mesh).geometry?.dispose());
        };
    }, [sex]);

    return { built, progress, error };
}

function Marker({ position, color }: { position: [number, number, number]; color: string }) {
    return (
        <mesh position={position} renderOrder={10}>
            <sphereGeometry args={[0.028, 20, 20]} />
            <meshBasicMaterial color={color} depthTest={false} />
        </mesh>
    );
}

export default function AnatomyTwin({ sex, symptoms, onPick, height = 500 }: {
    sex: AnatomySex; symptoms: Record<string, string>; onPick: (region: string) => void; height?: number;
}) {
    const { built, progress, error } = useAnatomy(sex);
    const [hovered, setHovered] = useState<string | null>(null);
    const [showBones, setShowBones] = useState(false);
    const [skinOpacity, setSkinOpacity] = useState(0.22);

    // Tint organs in regions where the patient reported symptoms
    useEffect(() => {
        built?.organs.forEach(m => {
            const sev = symptoms[m.userData.region];
            m.material = sev && severityMats[sev] ? severityMats[sev] : organMats[m.userData.system];
        });
    }, [built, symptoms]);
    useEffect(() => { if (built) built.bones.visible = showBones; }, [built, showBones]);
    useEffect(() => { skinMat.opacity = skinOpacity; }, [skinOpacity]);

    const organsIn = useMemo(() => {
        const map: Record<string, string[]> = {};
        built?.organs.forEach(m => {
            const name = m.name.replace(/^(Left|Right) /, '').replace(/ \((left|right)\)$/, '');
            if (/heart|lung|liver|stomach|kidney|spleen|pancreas|bladder|uterus|ovary|brain|colon|intestine|esophagus|thyroid|prostate|gallbladder/i.test(name)) {
                const list = (map[m.userData.region] ||= []);
                if (!list.includes(name)) list.push(name);
            }
        });
        return map;
    }, [built]);

    const H = built?.height ?? 1.7;
    const zMid = built?.zMid ?? 0;
    const pick = (e: ThreeEvent<PointerEvent | MouseEvent>) => regionAt(e.point, H, zMid);

    return (
        <div style={{ position: 'relative', height }}>
            {error ? (
                <div role="alert" style={{ height: '100%', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>{error}</div>
            ) : (
                <Canvas camera={{ position: [0, 1.0, 3.1], fov: 34 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
                    <hemisphereLight args={['#ffffff', '#c7cfd6', 1.15]} />
                    <directionalLight position={[2, 3.5, 3]} intensity={1.6} />
                    <directionalLight position={[-2.5, 2, -2.5]} intensity={0.6} />
                    {built && (
                        <primitive
                            object={built.group}
                            onPointerMove={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(pick(e)); document.body.style.cursor = 'pointer'; }}
                            onPointerOut={() => { setHovered(null); document.body.style.cursor = 'default'; }}
                            onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onPick(pick(e)); }}
                        />
                    )}
                    {Object.entries(symptoms).map(([region, sev]) => {
                        const a = ANCHORS[region];
                        return a && <Marker key={region} position={[a[0] * H, a[1] * H, zMid + a[2]]} color={SEVERITY_COLOR[sev] || '#64748B'} />;
                    })}
                    <ContactShadows position={[0, 0, 0]} opacity={0.3} scale={3} blur={2.4} far={1.8} />
                    <OrbitControls target={[0, 0.88, 0]} enablePan={false} minDistance={1.2} maxDistance={4.2} minPolarAngle={Math.PI / 6} maxPolarAngle={Math.PI / 1.9} enableDamping />
                </Canvas>
            )}

            {!error && progress < 100 && (
                <div role="status" style={{ position: 'absolute', left: 16, right: 16, bottom: 44, display: 'grid', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                    Loading {sex} anatomy… {progress}%
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
                </div>
            )}

            <div aria-live="polite" style={{ position: 'absolute', bottom: 44, left: '50%', transform: 'translateX(-50%)', maxWidth: '90%', padding: '6px 12px', borderRadius: 999, background: 'var(--bg-card)', border: '1px solid var(--border-color)', fontSize: 13.5, fontWeight: 600, textAlign: 'center', opacity: hovered && progress >= 100 ? 1 : 0, transition: 'opacity 0.15s', pointerEvents: 'none' }}>
                {hovered}{hovered && organsIn[hovered]?.length ? ` — ${organsIn[hovered].slice(0, 4).join(', ')}` : ''}
            </div>

            <div style={{ position: 'absolute', top: 56, left: 12, display: 'grid', gap: 6, padding: 10, borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-color)', fontSize: 12.5 }}>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    Skin
                    <input type="range" min={0.04} max={0.9} step={0.02} value={skinOpacity} onChange={e => setSkinOpacity(Number(e.target.value))} aria-label="Skin opacity" style={{ width: 80, accentColor: 'var(--color-primary)' }} />
                </label>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input type="checkbox" checked={showBones} onChange={e => setShowBones(e.target.checked)} style={{ accentColor: 'var(--color-primary)' }} /> Skeleton
                </label>
            </div>

            {/* One line on the bottom edge so it never overlaps the twin's severity legend */}
            <p style={{ position: 'absolute', bottom: 1, left: 12, right: 12, fontSize: 10, color: 'var(--text-muted)', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {sex === 'male' ? 'BodyParts3D © DBCLS' : 'HuBMAP Human Reference Atlas'} · CC BY 4.0 · via Human-Atlas
            </p>
        </div>
    );
}
