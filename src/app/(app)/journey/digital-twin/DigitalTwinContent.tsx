'use client';

import { useState, useRef, useEffect, useMemo, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { Brain, X, Send, Mic, MicOff, ImagePlus, Volume2, VolumeX, AudioLines, RotateCcw, MessageSquarePlus } from 'lucide-react';
import {
    getCurrentUser, getVitals, getReports, getDigitalTwinChat, setDigitalTwinChat, generateId, saveVisionAnalysis, type ChatMessage,
    getSymptomLog, setSymptomLog, getActiveJourney, saveJourney, saveIntakeSummary, sexOf, JourneyStep,
} from '@/lib/store';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { matchDoctors } from '@/lib/data';
import type { AnatomySex } from '@/components/three/AnatomyTwin';

// Medical reference anatomy (female / male: skin, organs, skeleton); the original classic body stays available
const AnatomyTwin = dynamic(() => import('@/components/three/AnatomyTwin'), { ssr: false });

type Recommendation = { chiefComplaint: string; hpi?: string; explanation?: string; recommendedSpecialty?: string; specialtyReason?: string; redFlags?: string[] };
import { buildAIContext, formatContextForAI } from '@/lib/ai-context';

// ── Body Part Definitions ──
interface BodyPart {
    name: string;
    position: [number, number, number];
    geometry: 'sphere' | 'capsule';
    args: number[];
    color: string;
    rotation?: [number, number, number];
}

const bodyParts: BodyPart[] = [
    { name: 'Head', position: [0, 2.35, 0], geometry: 'sphere', args: [0.32], color: '#78A0B8' },
    { name: 'Neck', position: [0, 1.95, 0], geometry: 'capsule', args: [0.12, 0.15], color: '#A8C4A0' },
    { name: 'Chest', position: [-0.2, 1.55, 0.08], geometry: 'capsule', args: [0.22, 0.2], color: '#6B9E6B', rotation: [0, 0, 0.2] },
    { name: 'Chest', position: [0.2, 1.55, 0.08], geometry: 'capsule', args: [0.22, 0.2], color: '#6B9E6B', rotation: [0, 0, -0.2] },
    { name: 'Abdomen', position: [0, 1.05, 0.05], geometry: 'capsule', args: [0.22, 0.4], color: '#5B8E8E' },
    { name: 'Abdomen', position: [-0.28, 1.1, 0], geometry: 'capsule', args: [0.1, 0.35], color: '#7EA87E', rotation: [0, 0, 0.1] },
    { name: 'Abdomen', position: [0.28, 1.1, 0], geometry: 'capsule', args: [0.1, 0.35], color: '#7EA87E', rotation: [0, 0, -0.1] },
    { name: 'Left Shoulder', position: [-0.52, 1.65, 0], geometry: 'sphere', args: [0.16], color: '#D4837A' },
    { name: 'Right Shoulder', position: [0.52, 1.65, 0], geometry: 'sphere', args: [0.16], color: '#D4837A' },
    { name: 'Left Arm', position: [-0.58, 1.32, 0], geometry: 'capsule', args: [0.1, 0.35], color: '#B8D4A0' },
    { name: 'Right Arm', position: [0.58, 1.32, 0], geometry: 'capsule', args: [0.1, 0.35], color: '#B8D4A0' },
    { name: 'Left Arm', position: [-0.62, 0.88, 0], geometry: 'capsule', args: [0.08, 0.35], color: '#C4A084' },
    { name: 'Right Arm', position: [0.62, 0.88, 0], geometry: 'capsule', args: [0.08, 0.35], color: '#C4A084' },
    { name: 'Hips', position: [0, 0.6, 0], geometry: 'capsule', args: [0.3, 0.15], color: '#9E7EA8' },
    { name: 'Left Leg', position: [-0.22, 0.08, 0], geometry: 'capsule', args: [0.14, 0.55], color: '#8B6898' },
    { name: 'Right Leg', position: [0.22, 0.08, 0], geometry: 'capsule', args: [0.14, 0.55], color: '#8B6898' },
    { name: 'Left Leg', position: [-0.22, -0.65, 0], geometry: 'capsule', args: [0.1, 0.55], color: '#6B8E5B' },
    { name: 'Right Leg', position: [0.22, -0.65, 0], geometry: 'capsule', args: [0.1, 0.55], color: '#6B8E5B' },
    { name: 'Back', position: [0, 1.55, -0.12], geometry: 'capsule', args: [0.3, 0.25], color: '#7898B8' },
    { name: 'Back', position: [0, 1.1, -0.1], geometry: 'capsule', args: [0.25, 0.25], color: '#8EA878' },
];

// ── Holographic Shader Material ── Lightweight, GPU-friendly
const HolographicMaterial = ({
    color,
    hasSymptom,
    isHovered,
}: {
    color: string;
    hasSymptom: boolean;
    isHovered: boolean;
}) => {
    const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);

    useFrame((state) => {
        if (!materialRef.current) return;
        // Subtle pulse for symptomatic parts
        if (hasSymptom) {
            const pulse = Math.sin(state.clock.getElapsedTime() * 2.5) * 0.15 + 0.85;
            materialRef.current.emissiveIntensity = pulse * 0.6;
        }
    });

    return (
        <meshPhysicalMaterial
            ref={materialRef}
            color={color}
            transparent
            opacity={isHovered ? 0.95 : hasSymptom ? 0.85 : 0.7}
            roughness={0.2}
            metalness={0.1}
            clearcoat={1}
            clearcoatRoughness={0.1}
            emissive={color}
            emissiveIntensity={hasSymptom ? 0.5 : isHovered ? 0.3 : 0.15}
            envMapIntensity={0.8}
            side={THREE.DoubleSide}
        />
    );
};

// ── Single Body Part Mesh ──
const BodyPartMesh = ({
    part,
    idx,
    symptomSeverity,
    onPartClick,
}: {
    part: BodyPart;
    idx: number;
    symptomSeverity: string | null;
    onPartClick: (name: string) => void;
}) => {
    const [hovered, setHovered] = useState(false);
    const meshRef = useRef<THREE.Mesh>(null);

    const color = useMemo(() => {
        if (!symptomSeverity) return part.color;
        if (symptomSeverity === 'mild') return '#D97706';
        if (symptomSeverity === 'moderate') return '#F97316';
        return '#DC2626';
    }, [symptomSeverity, part.color]);

    const hasSymptom = !!symptomSeverity;

    // Smooth scale transition — reuse vector to avoid per-frame allocation
    const targetVec = useMemo(() => new THREE.Vector3(), []);
    useFrame(() => {
        if (!meshRef.current) return;
        const targetScale = hovered ? 1.08 : 1;
        targetVec.set(targetScale, targetScale, targetScale);
        meshRef.current.scale.lerp(targetVec, 0.15);
    });

    const geometry = useMemo(() => {
        if (part.geometry === 'sphere') {
            return <sphereGeometry args={[part.args[0], 16, 16]} />;
        }
        return <capsuleGeometry args={[part.args[0], part.args[1], 8, 16]} />;
    }, [part.geometry, part.args]);

    return (
        <mesh
            ref={meshRef}
            position={part.position}
            rotation={part.rotation || [0, 0, 0]}
            onClick={(e) => {
                e.stopPropagation();
                onPartClick(part.name);
            }}
            onPointerOver={(e) => {
                e.stopPropagation();
                setHovered(true);
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={(e) => {
                e.stopPropagation();
                setHovered(false);
                document.body.style.cursor = 'default';
            }}
        >
            {geometry}
            <HolographicMaterial color={color} hasSymptom={hasSymptom} isHovered={hovered} />
        </mesh>
    );
};

// ── Scan Ring ── Lightweight animated ring
function ScanRing() {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (!meshRef.current) return;
        const t = state.clock.getElapsedTime();
        meshRef.current.position.y = 1.0 + Math.sin(t * 0.5) * 0.8;
        meshRef.current.rotation.x = Math.PI / 2;
        (meshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(t * 1.5) * 0.05;
    });

    return (
        <mesh ref={meshRef} position={[0, 1.0, 0]}>
            <torusGeometry args={[0.6, 0.008, 8, 48]} />
            <meshBasicMaterial
                color="#0E7490"
                transparent
                opacity={0.2}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

// ── Grid Floor ── Subtle holographic floor effect
function GridFloor() {
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.3, 0]}>
            <circleGeometry args={[2, 32]} />
            <meshBasicMaterial
                color="#0E7490"
                transparent
                opacity={0.03}
            />
        </mesh>
    );
}

// ── Main Body Group ──
function InteractiveBody({
    symptoms,
    onPartClick,
}: {
    symptoms: Record<string, string>;
    onPartClick: (name: string) => void;
}) {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (!groupRef.current) return;
        groupRef.current.rotation.y =
            Math.sin(state.clock.getElapsedTime() * 0.15) * 0.15;
        // Subtle floating
        groupRef.current.position.y =
            -0.3 + Math.sin(state.clock.getElapsedTime() * 0.4) * 0.03;
    });

    return (
        <group ref={groupRef} position={[0, -0.3, 0]} scale={[1.1, 1.1, 1.1]}>
            {bodyParts.map((part, idx) => (
                <BodyPartMesh
                    key={`${part.name}-${idx}`}
                    part={part}
                    idx={idx}
                    symptomSeverity={symptoms[part.name] || null}
                    onPartClick={onPartClick}
                />
            ))}
            <ScanRing />
            <GridFloor />
        </group>
    );
}

// ── Performance-tuned Scene Setup ──
function SceneSetup() {
    const { gl } = useThree();
    useEffect(() => {
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    }, [gl]);
    return null;
}

// ── Symptom Labels Overlay (DOM-based, outside Canvas) ──
function SymptomLabels({ symptoms, onRemove, onClearAll }: { symptoms: Record<string, string>; onRemove: (part: string) => void; onClearAll: () => void }) {
    const entries = Object.entries(symptoms);
    if (entries.length === 0) return null;

    const severityColors: Record<string, string> = {
        mild: '#D97706',
        moderate: '#F97316',
        severe: '#DC2626',
    };

    return (
        <div style={{
            position: 'absolute', top: 16, right: 16,
            display: 'flex', flexDirection: 'column', gap: 6,
            zIndex: 5, alignItems: 'flex-end',
        }}>
            {entries.map(([part, severity]) => {
                const clr = severityColors[severity] || '#94A3B8';
                return (
                    <motion.div
                        key={part}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        style={{
                            background: `${clr}15`,
                            border: `1px solid ${clr}40`,
                            borderRadius: 10,
                            padding: '5px 12px',
                            fontSize: 12,
                            color: clr,
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                            backdropFilter: 'blur(12px)',
                        }}
                    >
                        {part}: {severity}
                        <button onClick={() => onRemove(part)} aria-label={`Remove ${part}`} title={`Remove ${part}`}
                            style={{ marginLeft: 6, border: 0, background: 'none', color: clr, cursor: 'pointer', padding: 0, lineHeight: 1, verticalAlign: -2 }}>
                            <X size={13} />
                        </button>
                    </motion.div>
                );
            })}
            <button onClick={onClearAll}
                style={{ border: 0, background: 'var(--bg-card)', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
                Clear all marks
            </button>
        </div>
    );
}

// ── Main Page Component ──
export default function DigitalTwinPage() {
    const [symptoms, setSymptoms] = useState<Record<string, string>>(() => {
        if (typeof window !== 'undefined') {
            const saved = getSymptomLog();
            if (Object.keys(saved).length) return saved;
            const user = getCurrentUser();
            const legacy = user ? localStorage.getItem(`hs_dt_symptoms_${user.id}`) : null;
            if (legacy) {
                try { return JSON.parse(legacy); } catch (e) {}
            }
        }
        return {};
    });
    useEffect(() => { setSymptomLog(symptoms); }, [symptoms]);
    const router = useRouter();
    // Anatomy matches the patient's sex; 'other' / 'prefer not to say' start on the gender-neutral classic body
    const [bodyView, setBodyView] = useState<AnatomySex | 'classic'>(() => sexOf(getCurrentUser()?.gender) || 'classic');
    const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
    const [finding, setFinding] = useState(false);
    const [findError, setFindError] = useState('');
    const [selectedPart, setSelectedPart] = useState<string | null>(null);
    const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [chatImage, setChatImage] = useState<string | null>(null);
    const [voiceMode, setVoiceMode] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [ttsEnabled, setTtsEnabled] = useState(true);
    const [voiceLang, setVoiceLang] = useState<'en-IN' | 'hi-IN'>('en-IN');
    const [voiceTranscript, setVoiceTranscript] = useState('');
    const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
    const recognitionRef = useRef<any>(null);
    const synthRef = useRef<SpeechSynthesis | null>(null);

    // Initialize speech synthesis
    useEffect(() => {
        if (typeof window !== 'undefined') {
            synthRef.current = window.speechSynthesis;
        }
        return () => {
            synthRef.current?.cancel();
        };
    }, []);

    // Text-to-speech helper
    const speakText = useCallback((text: string) => {
        if (!synthRef.current || !ttsEnabled) return;
        synthRef.current.cancel();
        // Strip markdown formatting for cleaner speech
        const cleanText = text
            .replace(/#{1,6}\s?/g, '')
            .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/`{1,3}[^`]*`{1,3}/g, '')
            .replace(/\n{2,}/g, '. ')
            .replace(/\n/g, '. ')
            .replace(/- /g, '')
            .trim();
        // Limit length for TTS
        const spokenText = cleanText.length > 800 ? cleanText.slice(0, 800) + '... For more details, please read the full response on screen.' : cleanText;
        const utterance = new SpeechSynthesisUtterance(spokenText);
        utterance.lang = voiceLang;
        utterance.rate = 0.95;
        utterance.pitch = 1;
        utterance.onstart = () => { setIsSpeaking(true); setVoiceStatus('speaking'); };
        utterance.onend = () => { setIsSpeaking(false); setVoiceStatus('idle'); };
        utterance.onerror = () => { setIsSpeaking(false); setVoiceStatus('idle'); };
        synthRef.current.speak(utterance);
    }, [ttsEnabled, voiceLang]);

    const stopSpeaking = useCallback(() => {
        synthRef.current?.cancel();
        setIsSpeaking(false);
        setVoiceStatus('idle');
    }, []);

    // Load saved chat
    useEffect(() => {
        const saved = getDigitalTwinChat();
        if (saved.length > 0) {
            setChatMessages(saved.map(m => ({ role: m.role, content: m.content })));
        }
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const handlePartClick = useCallback((name: string) => {
        setSelectedPart(name);
    }, []);

    const setSeverity = useCallback((severity: string) => {
        if (selectedPart) {
            if (severity === 'none') {
                setSymptoms(prev => {
                    const n = { ...prev };
                    delete n[selectedPart];
                    return n;
                });
            } else {
                setSymptoms(prev => ({ ...prev, [selectedPart]: severity }));
            }
            setSelectedPart(null);
        }
    }, [selectedPart]);

    const sendMessage = useCallback(async (messageText?: string) => {
        const text = messageText || inputText.trim();
        const hasImage = !!chatImage;
        if (!text && Object.keys(symptoms).length === 0 && !hasImage) return;

        setLoading(true);
        let userMsg = text;

        if (Object.keys(symptoms).length > 0 && !messageText) {
            const symptomList = Object.entries(symptoms)
                .map(([part, severity]) => `${part}: ${severity}`)
                .join(', ');
            userMsg = `${text ? text + '. ' : ''}I'm experiencing symptoms in these areas: ${symptomList}`;
        }

        if (!userMsg && !hasImage) {
            setLoading(false);
            return;
        }

        const displayMsg = hasImage
            ? `${userMsg || 'Analyzing attached image...'} [Image attached]`
            : userMsg;
        const newMessages = [...chatMessages, { role: 'user', content: displayMsg }];
        setChatMessages(newMessages);
        setInputText('');
        const imageToSend = chatImage;
        setChatImage(null);

        try {
            let aiResponse = '';

            if (hasImage && imageToSend) {
                const visionRes = await fetch('/api/ai/vision', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        imageData: imageToSend,
                        prompt: userMsg || 'Please analyze this medical image.',
                        userContext: formatContextForAI(buildAIContext()),
                    }),
                });
                const visionData = await visionRes.json();
                aiResponse =
                    visionData.response || visionData.error || 'Could not analyze the image.';

                const user = getCurrentUser();
                if (user) {
                    saveVisionAnalysis({
                        id: generateId(),
                        userId: user.id,
                        imageDescription: userMsg || 'Medical image analysis',
                        analysis: aiResponse,
                        timestamp: new Date().toISOString(),
                    });
                }
            } else {
                const res = await fetch('/api/ai/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: newMessages.slice(-20),
                        systemPrompt: `You are HealthSync AI in the Digital Twin section — analyzing symptoms from a 3D body model and general health queries. 
                    
You can:
1. Analyze marked body symptoms and provide assessments (NOT diagnoses)
2. Answer any health questions freely
3. Recommend appropriate specialists and doctors from the HealthSync platform
4. Provide urgency levels (Green/Amber/Red)
5. Give immediate care tips
6. Reference the user's medical reports, vitals, and active prescriptions when relevant

Be empathetic and clear. Return your response as a single, concise paragraph of plain text. DO NOT use markdown, headers, tables, bullet points, asterisks, or any special characters.
If the user describes severe symptoms (chest pain, difficulty breathing, etc.), immediately recommend emergency care.`,
                        userContext: formatContextForAI(buildAIContext()),
                    }),
                });
                const data = await res.json();
                aiResponse = data.response || data.error || 'Sorry, I could not process that.';
            }

            const aiMsg = { role: 'ai', content: aiResponse };
            const updated = [...newMessages, aiMsg];
            setChatMessages(updated);

            const chatToSave: ChatMessage[] = updated.map(m => ({
                id: generateId(),
                role: m.role as 'user' | 'ai',
                content: m.content,
                timestamp: new Date().toISOString(),
            }));
            setDigitalTwinChat(chatToSave);
        } catch {
            setChatMessages(prev => [
                ...prev,
                {
                    role: 'ai',
                    content:
                        "I apologize, I couldn't process your request. Please try again.",
                },
            ]);
        }
        setLoading(false);
    }, [inputText, chatImage, symptoms, chatMessages]);

    // Voice input (inline mic button — fills text field)
    const toggleVoice = useCallback(() => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SpeechRecognition =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Speech recognition is not supported in this browser.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = voiceLang;

        setIsListening(true);

        recognition.onresult = (event: { results: { transcript: string }[][] }) => {
            const transcript = event.results[0][0].transcript;
            setInputText(transcript);
            setIsListening(false);
        };

        recognition.onerror = () => {
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    }, [isListening, voiceLang]);

    // Voice assistant mode — full hands-free conversation
    const startVoiceAssistant = useCallback(() => {
        stopSpeaking();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SpeechRecognition =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Speech recognition is not supported in this browser. Please use Chrome.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = voiceLang;

        setVoiceStatus('listening');
        setVoiceTranscript('');

        recognition.onresult = (event: any) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            setVoiceTranscript(transcript);
            if (event.results[event.results.length - 1].isFinal) {
                // Auto-send the message
                setVoiceStatus('processing');
                setVoiceTranscript(transcript);
                sendMessage(transcript).then(() => {
                    // After AI responds, speak it
                    // The speakText is called in a useEffect watching chatMessages
                });
            }
        };

        recognition.onerror = () => {
            setVoiceStatus('idle');
        };

        recognition.onend = () => {
            if (voiceStatus === 'listening') {
                setVoiceStatus('idle');
            }
        };

        recognition.start();
    }, [voiceLang, stopSpeaking, sendMessage, voiceStatus]);

    // Auto-speak AI responses in voice mode
    useEffect(() => {
        if (voiceMode && chatMessages.length > 0) {
            const lastMsg = chatMessages[chatMessages.length - 1];
            if (lastMsg.role === 'ai' && !loading) {
                speakText(lastMsg.content);
            }
        }
    }, [chatMessages, voiceMode, loading, speakText]);

    const findDoctor = async () => {
        const user = getCurrentUser();
        const journey = user ? getActiveJourney(user.id) : null;
        const consultationType = journey?.pathway === 'AYUSH' ? 'AYUSH' : 'Allopathic';
        const areas = Object.entries(symptoms).map(([part, sev]) => `${part} (${sev})`).join(', ');
        const transcript = [
            areas && `PATIENT marked on body map: ${areas}`,
            ...chatMessages.map(m => `${m.role === 'user' ? 'PATIENT' : 'AI'}: ${m.content}`),
        ].filter(Boolean).join('\n');
        setFinding(true);
        setFindError('');
        try {
            const res = await fetch('/api/ai/summarize-intake', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcript, documents: [], consultationType }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            if (user) saveIntakeSummary({ id: generateId(), userId: user.id, patientName: user.name, date: new Date().toISOString(), consultationType, transcript, ...data });
            if (journey) saveJourney({
                ...journey, recommendedSpecialty: data.recommendedSpecialty, physicianSummary: `${data.chiefComplaint}. ${data.hpi || ''}`.trim(),
                redFlagDetected: journey.redFlagDetected || data.redFlags?.length > 0, currentStep: JourneyStep.BOOKING, updatedAt: new Date().toISOString(),
            });
            setRecommendation(data);
        } catch {
            setFindError('Couldn\u2019t get a recommendation. Please try again.');
        }
        setFinding(false);
    };

    const clearChat = useCallback(() => {
        setChatMessages([]);
        setDigitalTwinChat([]);
    }, []);

    const removeSymptom = useCallback((part: string) => {
        setSymptoms(prev => {
            const next = { ...prev };
            delete next[part];
            return next;
        });
    }, []);

    // Fresh twin for a new problem: marked areas, conversation and doctor suggestion all cleared
    const startOver = useCallback(() => {
        if (!confirm('Start over? This clears the marked body areas and the conversation.')) return;
        stopSpeaking();
        setSymptoms({});
        setSelectedPart(null);
        setRecommendation(null);
        setInputText('');
        setChatImage(null);
        clearChat();
    }, [stopSpeaking, clearChat]);

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800 }}>3D Digital Twin</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
                        Chat with AI about your health, or click body areas to log symptoms.
                    </p>
                </div>
                {(Object.keys(symptoms).length > 0 || chatMessages.length > 0) && (
                    <button onClick={startOver} className="btn-secondary" title="Clear marked areas and the conversation">
                        <RotateCcw size={16} /> Start over
                    </button>
                )}
            </div>

            <style>{`@media (max-width: 900px) { .twin-grid { grid-template-columns: 1fr !important; } }`}</style>
            <div
                className="twin-grid"
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 20,
                    minHeight: 600,
                }}
            >
                {/* 3D Model */}
                <div
                    className="glass-card-static"
                    style={{
                        position: 'relative',
                        height: 500,
                        overflow: 'hidden',
                        maxHeight: 500,
                    }}
                >
                    {bodyView === 'classic' ? (
                    <Canvas
                        camera={{ position: [0, 1, 4.5], fov: 45 }}
                        style={{ height: '100%' }}
                        dpr={[1, 1.5]}
                        gl={{
                            antialias: true,
                            alpha: true,
                            powerPreference: 'high-performance',
                            stencil: false,
                            depth: true,
                        }}
                        frameloop="always"
                        performance={{ min: 0.5 }}
                    >
                        <SceneSetup />
                        <ambientLight intensity={0.6} />
                        <directionalLight position={[5, 5, 5]} intensity={0.8} color="#E0F2FE" />
                        <pointLight position={[3, 4, 3]} intensity={0.6} color="#0EA5E9" distance={15} />
                        <pointLight position={[-3, 2, -3]} intensity={0.3} color="#8B5CF6" distance={12} />
                        <hemisphereLight
                            color="#87CEEB"
                            groundColor="#4A3B6B"
                            intensity={0.4}
                        />
                        <Suspense fallback={null}>
                            <InteractiveBody
                                symptoms={symptoms}
                                onPartClick={handlePartClick}
                            />
                        </Suspense>
                        <OrbitControls
                            enablePan={false}
                            enableZoom={true}
                            minDistance={3}
                            maxDistance={6}
                            maxPolarAngle={Math.PI / 1.5}
                            minPolarAngle={Math.PI / 4}
                            enableDamping={true}
                            dampingFactor={0.08}
                        />
                    </Canvas>
                    ) : (
                        <AnatomyTwin sex={bodyView} symptoms={symptoms} onPick={handlePartClick} height={500} />
                    )}

                    {/* Body model switch: female / male reference anatomy, or the classic body */}
                    <div role="group" aria-label="Body model" style={{ position: 'absolute', top: 12, left: 12, zIndex: 6, display: 'flex', gap: 2, padding: 3, borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                        {(['female', 'male', 'classic'] as const).map(v => (
                            <button key={v} type="button" aria-pressed={bodyView === v} onClick={() => setBodyView(v)}
                                style={{ border: 0, borderRadius: 7, padding: '5px 10px', minHeight: 32, font: 'inherit', fontSize: 12.5, fontWeight: 600, textTransform: 'capitalize', cursor: 'pointer', background: bodyView === v ? 'var(--color-primary)' : 'transparent', color: bodyView === v ? '#fff' : 'var(--text-secondary)' }}>
                                {v}
                            </button>
                        ))}
                    </div>

                    {/* Symptom labels — rendered in DOM, outside Canvas */}
                    <AnimatePresence>
                        <SymptomLabels symptoms={symptoms} onRemove={removeSymptom} onClearAll={() => setSymptoms({})} />
                    </AnimatePresence>

                    {/* Legend */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 16,
                            left: 16,
                            display: 'flex',
                            gap: 12,
                        }}
                    >
                        {[
                            { color: '#0891B2', label: 'Healthy' },
                            { color: '#D97706', label: 'Mild' },
                            { color: '#F97316', label: 'Moderate' },
                            { color: '#DC2626', label: 'Severe' },
                        ].map(item => (
                            <div
                                key={item.label}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    fontSize: 11,
                                    color: 'var(--text-muted)',
                                }}
                            >
                                <div
                                    style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: item.color,
                                    }}
                                />
                                {item.label}
                            </div>
                        ))}
                    </div>

                    {/* Part Selection Modal */}
                    <AnimatePresence>
                        {selectedPart && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    background: 'var(--glass-bg)',
                                    backdropFilter: 'blur(20px)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: 20,
                                    padding: 24,
                                    zIndex: 10,
                                    minWidth: 240,
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 16,
                                    }}
                                >
                                    <h3 style={{ fontWeight: 700 }}>{selectedPart}</h3>
                                    <button
                                        onClick={() => setSelectedPart(null)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--text-muted)',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                                <p
                                    style={{
                                        fontSize: 13,
                                        color: 'var(--text-secondary)',
                                        marginBottom: 14,
                                    }}
                                >
                                    How severe is the discomfort?
                                </p>
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 8,
                                    }}
                                >
                                    {[
                                        { value: 'mild', label: 'Mild', color: '#D97706' },
                                        { value: 'moderate', label: 'Moderate', color: '#F97316' },
                                        { value: 'severe', label: 'Severe', color: '#DC2626' },
                                        { value: 'none', label: 'No Pain', color: '#059669' },
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setSeverity(opt.value)}
                                            style={{
                                                padding: '10px 16px',
                                                borderRadius: 10,
                                                border: `1px solid ${opt.color}30`,
                                                background: `${opt.color}10`,
                                                color: opt.color,
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                fontSize: 14,
                                                textAlign: 'left',
                                                transition: 'all 0.2s ease',
                                            }}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* AI Chat Panel */}
                <div
                    className="glass-card-static"
                    style={{ display: 'flex', flexDirection: 'column' }}
                >
                    <div
                        style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Brain size={20} style={{ color: 'var(--color-primary)' }} />
                            <span style={{ fontWeight: 700 }}>HealthSync AI</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {/* TTS toggle */}
                            <button
                                onClick={() => { setTtsEnabled(!ttsEnabled); if (isSpeaking) stopSpeaking(); }}
                                title={ttsEnabled ? 'Mute AI voice' : 'Enable AI voice'}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: ttsEnabled ? 'var(--color-primary)' : 'var(--text-muted)',
                                    display: 'flex', alignItems: 'center', padding: 4,
                                }}
                            >
                                {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                            </button>
                            {/* Voice Mode toggle */}
                            <button
                                onClick={() => {
                                    setVoiceMode(!voiceMode);
                                    if (voiceMode) { stopSpeaking(); setVoiceStatus('idle'); recognitionRef.current?.stop(); }
                                }}
                                title={voiceMode ? 'Exit voice mode' : 'Voice Assistant Mode'}
                                style={{
                                    padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                    fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                                    background: voiceMode ? '#4F6B8A' : 'var(--bg-card)',
                                    color: voiceMode ? 'white' : 'var(--text-secondary)',
                                    transition: 'all 0.3s ease',
                                }}
                            >
                                <AudioLines size={14} />
                                {voiceMode ? 'Voice On' : 'Voice'}
                            </button>
                            {/* Language toggle */}
                            <button
                                onClick={() => setVoiceLang(voiceLang === 'en-IN' ? 'hi-IN' : 'en-IN')}
                                title={`Switch to ${voiceLang === 'en-IN' ? 'Hindi' : 'English'}`}
                                style={{
                                    padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                                    border: '1px solid var(--border-color)', background: 'var(--bg-card)',
                                    color: 'var(--text-secondary)', cursor: 'pointer',
                                }}
                            >
                                {voiceLang === 'en-IN' ? 'EN' : 'हिं'}
                            </button>
                            {chatMessages.length > 0 && (
                                <button
                                    onClick={clearChat}
                                    title="Start a new conversation (keeps marked body areas)"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 4,
                                        padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                                        border: '1px solid var(--border-color)', background: 'var(--bg-card)',
                                        color: 'var(--text-secondary)', cursor: 'pointer',
                                    }}
                                >
                                    <MessageSquarePlus size={14} /> New chat
                                </button>
                            )}
                        </div>
                    </div>

                    <div
                        style={{
                            flex: 1,
                            padding: 16,
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                        }}
                    >
                        {chatMessages.length === 0 && (
                            <div
                                style={{
                                    padding: 20,
                                    textAlign: 'center',
                                    margin: 'auto 0',
                                }}
                            >
                                <Brain
                                    size={40}
                                    style={{
                                        color: 'var(--color-primary)',
                                        marginBottom: 12,
                                        opacity: 0.5,
                                    }}
                                />
                                <p
                                    style={{
                                        color: 'var(--text-secondary)',
                                        fontSize: 14,
                                        marginBottom: 8,
                                    }}
                                >
                                    Ask me anything about your health!
                                </p>
                                <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                    You can type, use voice, or click body parts to mark symptoms.
                                </p>
                                <div
                                    style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: 6,
                                        marginTop: 16,
                                        justifyContent: 'center',
                                    }}
                                >
                                    {[
                                        'I have a headache',
                                        'My stomach hurts',
                                        'I feel dizzy',
                                        'Recommend a doctor',
                                    ].map(q => (
                                        <button
                                            key={q}
                                            onClick={() => {
                                                setInputText(q);
                                            }}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: 8,
                                                fontSize: 12,
                                                background: 'var(--bg-card)',
                                                border: '1px solid var(--border-color)',
                                                color: 'var(--text-secondary)',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {chatMessages.map((msg, i) => (
                            <div
                                key={i}
                                className={
                                    msg.role === 'ai' ? 'chat-bubble-ai' : 'chat-bubble-user'
                                }
                            >
                                <p
                                    style={{
                                        fontSize: 14,
                                        lineHeight: 1.7,
                                        whiteSpace: 'pre-wrap',
                                    }}
                                >
                                    {msg.content}
                                </p>
                            </div>
                        ))}

                        {loading && (
                            <div
                                className="chat-bubble-ai"
                                style={{
                                    display: 'flex',
                                    gap: 4,
                                    padding: '14px 20px',
                                }}
                            >
                                {[0, 1, 2].map(i => (
                                    <motion.div
                                        key={i}
                                        animate={{ y: [0, -6, 0] }}
                                        transition={{
                                            repeat: Infinity,
                                            duration: 0.6,
                                            delay: i * 0.15,
                                        }}
                                        style={{
                                            width: 7,
                                            height: 7,
                                            borderRadius: '50%',
                                            background: 'var(--text-muted)',
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input */}
                    <div style={{ padding: 16, borderTop: '1px solid var(--border-color)' }}>
                        {chatImage && (
                            <div
                                style={{
                                    marginBottom: 8,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '6px 10px',
                                    borderRadius: 8,
                                    background: 'rgba(14, 116, 144,0.05)',
                                    border: '1px solid rgba(14, 116, 144,0.1)',
                                }}
                            >
                                <ImagePlus
                                    size={14}
                                    style={{ color: 'var(--color-primary)' }}
                                />
                                <span
                                    style={{
                                        fontSize: 12,
                                        color: 'var(--text-secondary)',
                                        flex: 1,
                                    }}
                                >
                                    Image attached
                                </span>
                                <button
                                    onClick={() => setChatImage(null)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--text-muted)',
                                    }}
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: 10 }}>
                            <input
                                type="file"
                                accept="image/*"
                                ref={imageInputRef}
                                style={{ display: 'none' }}
                                onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onload = () =>
                                            setChatImage(reader.result as string);
                                        reader.readAsDataURL(file);
                                    }
                                }}
                            />
                            <button
                                onClick={() => imageInputRef.current?.click()}
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 12,
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: chatImage
                                        ? 'rgba(14, 116, 144,0.1)'
                                        : 'var(--bg-card)',
                                    color: chatImage
                                        ? 'var(--color-primary)'
                                        : 'var(--text-muted)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                <ImagePlus size={18} />
                            </button>
                            <button
                                onClick={toggleVoice}
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 12,
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: isListening
                                        ? '#DC2626'
                                        : 'var(--bg-card)',
                                    color: isListening ? 'white' : 'var(--text-muted)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    transition: 'all 0.3s ease',
                                }}
                            >
                                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                            </button>
                            <input
                                className="input-field"
                                placeholder={
                                    isListening ? 'Listening...' : 'Ask about your health...'
                                }
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                                disabled={isListening}
                            />
                            <button
                                onClick={() => {
                                    if (chatImage) {
                                        sendMessage(
                                            (inputText.trim() ||
                                                'I have attached a medical image for analysis.') +
                                            ' [User attached an image — please provide general guidance based on the described symptoms]'
                                        );
                                        setChatImage(null);
                                    } else {
                                        sendMessage();
                                    }
                                }}
                                disabled={
                                    loading ||
                                    (!inputText.trim() &&
                                        Object.keys(symptoms).length === 0 &&
                                        !chatImage)
                                }
                                className="btn-primary"
                                style={{
                                    padding: '12px 20px',
                                    opacity:
                                        loading ||
                                            (!inputText.trim() &&
                                                Object.keys(symptoms).length === 0 &&
                                                !chatImage)
                                            ? 0.5
                                            : 1,
                                }}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Workflow: explanation → recommended specialist → book */}
            <section className="card" style={{ padding: 22, marginTop: 20 }} aria-live="polite">
                {!recommendation ? (
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 240 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Ready to see a doctor?</h2>
                            <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>We’ll summarise the areas you marked and your questions, explain what may be causing it, and suggest the right specialist.</p>
                            {findError && <p role="alert" style={{ color: 'var(--color-danger)', marginTop: 6 }}>{findError}</p>}
                        </div>
                        <button onClick={findDoctor} className="btn-primary" disabled={finding}>
                            {finding ? 'Finding your doctor…' : 'Find the right doctor'}
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: 14 }}>
                        <div>
                            <span className="eyebrow">What may be going on</span>
                            <h2 style={{ fontSize: 19, fontWeight: 700, marginTop: 4 }}>{recommendation.chiefComplaint}</h2>
                            {recommendation.explanation && <p style={{ color: 'var(--text-secondary)', marginTop: 6 }}>{recommendation.explanation}</p>}
                            <p className="field-hint">Not a diagnosis — your doctor will confirm.</p>
                        </div>
                        {recommendation.redFlags && recommendation.redFlags.length > 0 && (
                            <div className="triage-red" role="alert" style={{ padding: 12, borderRadius: 10 }}>
                                <strong>Warning signs:</strong> {recommendation.redFlags.join(', ')}. If it gets worse, call <a href="tel:108">108</a>.
                            </div>
                        )}
                        <div>
                            <span className="eyebrow">Recommended: {recommendation.recommendedSpecialty || 'General Physician'}</span>
                            {recommendation.specialtyReason && <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{recommendation.specialtyReason}</p>}
                            <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                                {matchDoctors(recommendation.recommendedSpecialty, getActiveJourney(getCurrentUser()?.id || '')?.pathway).map(d => (
                                    <div key={d.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12, border: '1px solid var(--border-color)', borderRadius: 10, flexWrap: 'wrap' }}>
                                        <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-soft)', color: 'var(--color-primary)', display: 'grid', placeItems: 'center', fontWeight: 700 }}>{d.initials}</span>
                                        <span style={{ flex: 1, minWidth: 180 }}><strong>{d.name}</strong><span style={{ display: 'block', fontSize: 14, color: 'var(--text-secondary)' }}>{d.specialty} · {d.hospital} · {d.fee}</span></span>
                                        <button onClick={() => router.push(`/journey/booking?doctor=${d.id}`)} className="btn-primary" style={{ minHeight: 40, padding: '8px 16px' }}>Book</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* Voice Assistant Overlay */}
            <AnimatePresence>
                {voiceMode && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 9999,
                            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => { setVoiceMode(false); stopSpeaking(); setVoiceStatus('idle'); recognitionRef.current?.stop(); }}
                            style={{
                                position: 'absolute', top: 24, right: 24,
                                background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
                                width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: 'white',
                            }}
                        >
                            <X size={22} />
                        </button>

                        {/* Voice assistant branding */}
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            style={{ textAlign: 'center', marginBottom: 40 }}
                        >
                            <h2 style={{ color: 'white', fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
                                🩺 Voice Assistant
                            </h2>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
                                {voiceStatus === 'idle' && 'Tap the mic to start talking'}
                                {voiceStatus === 'listening' && 'Listening... speak now'}
                                {voiceStatus === 'processing' && 'Processing your message...'}
                                {voiceStatus === 'speaking' && 'AI is responding...'}
                            </p>
                        </motion.div>

                        {/* Animated mic orb */}
                        <div style={{ position: 'relative', width: 160, height: 160, marginBottom: 32 }}>
                            {/* Pulse rings */}
                            {voiceStatus === 'listening' && (
                                <>
                                    <motion.div
                                        animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
                                        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeOut' }}
                                        style={{
                                            position: 'absolute', inset: 0, borderRadius: '50%',
                                            border: '2px solid #4F6B8A',
                                        }}
                                    />
                                    <motion.div
                                        animate={{ scale: [1, 2.2], opacity: [0.3, 0] }}
                                        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                                        style={{
                                            position: 'absolute', inset: 0, borderRadius: '50%',
                                            border: '2px solid #3E5872',
                                        }}
                                    />
                                    <motion.div
                                        animate={{ scale: [1, 2.6], opacity: [0.2, 0] }}
                                        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeOut', delay: 0.6 }}
                                        style={{
                                            position: 'absolute', inset: 0, borderRadius: '50%',
                                            border: '2px solid #A78BFA',
                                        }}
                                    />
                                </>
                            )}
                            {voiceStatus === 'speaking' && (
                                <>
                                    <motion.div
                                        animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
                                        transition={{ repeat: Infinity, duration: 0.8, ease: 'easeOut' }}
                                        style={{
                                            position: 'absolute', inset: 0, borderRadius: '50%',
                                            border: '2px solid #0E7490',
                                        }}
                                    />
                                    <motion.div
                                        animate={{ scale: [1, 1.8], opacity: [0.2, 0] }}
                                        transition={{ repeat: Infinity, duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                                        style={{
                                            position: 'absolute', inset: 0, borderRadius: '50%',
                                            border: '2px solid #0891B2',
                                        }}
                                    />
                                </>
                            )}
                            {/* Main mic button */}
                            <motion.button
                                whileTap={{ scale: 0.92 }}
                                onClick={() => {
                                    if (voiceStatus === 'listening') {
                                        recognitionRef.current?.stop();
                                        setVoiceStatus('idle');
                                    } else if (voiceStatus === 'speaking') {
                                        stopSpeaking();
                                    } else if (voiceStatus === 'idle') {
                                        startVoiceAssistant();
                                    }
                                }}
                                disabled={voiceStatus === 'processing'}
                                style={{
                                    width: '100%', height: '100%', borderRadius: '50%', border: 'none',
                                    cursor: voiceStatus === 'processing' ? 'wait' : 'pointer',
                                    background: voiceStatus === 'listening'
                                        ? '#4F6B8A'
                                        : voiceStatus === 'speaking'
                                        ? '#0E7490'
                                        : voiceStatus === 'processing'
                                        ? '#D97706'
                                        : '#3B6EA8',
                                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: voiceStatus === 'listening'
                                        ? '0 0 60px rgba(79, 107, 138, 0.5)'
                                        : voiceStatus === 'speaking'
                                        ? '0 0 60px rgba(14, 116, 144, 0.5)'
                                        : '0 0 40px rgba(59, 110, 168, 0.3)',
                                    transition: 'all 0.3s ease',
                                }}
                            >
                                {voiceStatus === 'listening' ? (
                                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                                        <Mic size={48} />
                                    </motion.div>
                                ) : voiceStatus === 'speaking' ? (
                                    <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 0.6 }}>
                                        <Volume2 size={48} />
                                    </motion.div>
                                ) : voiceStatus === 'processing' ? (
                                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                                        <Brain size={48} />
                                    </motion.div>
                                ) : (
                                    <Mic size={48} />
                                )}
                            </motion.button>
                        </div>

                        {/* Live transcript */}
                        {voiceTranscript && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    maxWidth: 500, padding: '16px 24px', borderRadius: 16,
                                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'white', fontSize: 16, textAlign: 'center', lineHeight: 1.6,
                                    marginBottom: 20,
                                }}
                            >
                                &ldquo;{voiceTranscript}&rdquo;
                            </motion.div>
                        )}

                        {/* Last AI response in voice mode */}
                        {chatMessages.length > 0 && chatMessages[chatMessages.length - 1].role === 'ai' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    maxWidth: 500, maxHeight: 200, overflowY: 'auto',
                                    padding: '16px 24px', borderRadius: 16,
                                    background: 'rgba(14, 116, 144, 0.08)', border: '1px solid rgba(14, 116, 144, 0.15)',
                                    color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 1.7,
                                }}
                            >
                                <p style={{ whiteSpace: 'pre-wrap' }}>
                                    {chatMessages[chatMessages.length - 1].content.slice(0, 500)}
                                    {chatMessages[chatMessages.length - 1].content.length > 500 ? '...' : ''}
                                </p>
                            </motion.div>
                        )}

                        {/* Quick actions in voice mode */}
                        <div style={{ position: 'absolute', bottom: 40, display: 'flex', gap: 12 }}>
                            <button
                                onClick={() => setVoiceLang(voiceLang === 'en-IN' ? 'hi-IN' : 'en-IN')}
                                style={{
                                    padding: '10px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)',
                                    background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: 13,
                                    fontWeight: 600, cursor: 'pointer',
                                }}
                            >
                                {voiceLang === 'en-IN' ? '🇮🇳 Switch to Hindi' : '🇬🇧 English में बदलें'}
                            </button>
                            {isSpeaking && (
                                <button
                                    onClick={stopSpeaking}
                                    style={{
                                        padding: '10px 20px', borderRadius: 12, border: '1px solid rgba(220, 38, 38,0.3)',
                                        background: 'rgba(220, 38, 38,0.1)', color: '#DC2626', fontSize: 13,
                                        fontWeight: 600, cursor: 'pointer',
                                    }}
                                >
                                    Stop Speaking
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
