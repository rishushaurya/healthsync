'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshTransmissionMaterial, Html, OrbitControls } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { Brain, X, AlertCircle, CheckCircle, Send, Mic, MicOff, Stethoscope, ImagePlus } from 'lucide-react';
import { getCurrentUser, getVitals, getReports, getDigitalTwinChat, setDigitalTwinChat, generateId, saveVisionAnalysis, type ChatMessage } from '@/lib/store';
import { buildAIContext, formatContextForAI } from '@/lib/ai-context';

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

function InteractiveBody({ symptoms, onPartClick }: { symptoms: Record<string, string>; onPartClick: (name: string) => void }) {
    const group = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (group.current) {
            group.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.15) * 0.15;
        }
    });

    const getColor = (partName: string, defaultColor: string) => {
        const severity = symptoms[partName];
        if (!severity) return defaultColor;
        if (severity === 'mild') return '#F59E0B';
        if (severity === 'moderate') return '#F97316';
        return '#EF4444';
    };

    const labelledParts = new Set<string>();

    return (
        <Float speed={0.8} rotationIntensity={0.05} floatIntensity={0.2}>
            <group ref={group} position={[0, -0.3, 0]} scale={[1.1, 1.1, 1.1]}>
                {bodyParts.map((part, idx) => {
                    const color = getColor(part.name, part.color);
                    const hasSymptom = !!symptoms[part.name];
                    const showLabel = hasSymptom && !labelledParts.has(part.name);
                    if (showLabel) labelledParts.add(part.name);
                    return (
                        <mesh key={`${part.name}-${idx}`} position={part.position}
                            rotation={part.rotation || [0, 0, 0]}
                            onClick={(e) => { e.stopPropagation(); onPartClick(part.name); }}
                            onPointerOver={(e) => { (e.object as THREE.Mesh).scale.set(1.08, 1.08, 1.08); document.body.style.cursor = 'pointer'; }}
                            onPointerOut={(e) => { (e.object as THREE.Mesh).scale.set(1, 1, 1); document.body.style.cursor = 'default'; }}
                        >
                            {part.geometry === 'sphere' ? (
                                <sphereGeometry args={[part.args[0], 24, 24]} />
                            ) : (
                                <capsuleGeometry args={[part.args[0], part.args[1], 12, 24]} />
                            )}
                            <MeshTransmissionMaterial
                                backside samples={4} resolution={256}
                                transmission={hasSymptom ? 0.5 : 0.85}
                                roughness={0.15} thickness={0.4} ior={1.4}
                                chromaticAberration={0.02}
                                color={color}
                            />
                            {showLabel && (
                                <Html position={[0.4, 0.2, 0]} center distanceFactor={5}>
                                    <div style={{
                                        background: `${color}20`, border: `1px solid ${color}40`,
                                        borderRadius: 8, padding: '4px 10px', fontSize: 11, color: color,
                                        fontWeight: 600, whiteSpace: 'nowrap', backdropFilter: 'blur(10px)',
                                    }}>
                                        {part.name}: {symptoms[part.name]}
                                    </div>
                                </Html>
                            )}
                        </mesh>
                    );
                })}
                <mesh position={[0, 1.0, 0]}>
                    <torusGeometry args={[0.6, 0.01, 12, 48]} />
                    <meshStandardMaterial color="#0EA5E9" emissive="#0EA5E9" emissiveIntensity={3} transparent opacity={0.2} />
                </mesh>
            </group>
        </Float>
    );
}

export default function DigitalTwinPage() {
    const [symptoms, setSymptoms] = useState<Record<string, string>>({});
    const [selectedPart, setSelectedPart] = useState<string | null>(null);
    const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [chatImage, setChatImage] = useState<string | null>(null);

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

    const handlePartClick = (name: string) => {
        setSelectedPart(name);
    };

    const setSeverity = (severity: string) => {
        if (selectedPart) {
            if (severity === 'none') {
                setSymptoms(prev => { const n = { ...prev }; delete n[selectedPart]; return n; });
            } else {
                setSymptoms(prev => ({ ...prev, [selectedPart]: severity }));
            }
            setSelectedPart(null);
        }
    };

    const sendMessage = async (messageText?: string) => {
        const text = messageText || inputText.trim();
        const hasImage = !!chatImage;
        if (!text && Object.keys(symptoms).length === 0 && !hasImage) return;

        setLoading(true);
        let userMsg = text;

        if (Object.keys(symptoms).length > 0 && !messageText) {
            const symptomList = Object.entries(symptoms).map(([part, severity]) => `${part}: ${severity}`).join(', ');
            userMsg = `${text ? text + '. ' : ''}I'm experiencing symptoms in these areas: ${symptomList}`;
        }

        if (!userMsg && !hasImage) { setLoading(false); return; }

        const displayMsg = hasImage ? `${userMsg || 'Analyzing attached image...'} [Image attached]` : userMsg;
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
                aiResponse = visionData.response || visionData.error || 'Could not analyze the image.';

                // Save vision analysis to user data
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

Be empathetic, clear, and structured. Use markdown headers for sections.
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
            setChatMessages(prev => [...prev, { role: 'ai', content: 'I apologize, I couldn\'t process your request. Please try again.' }]);
        }
        setLoading(false);
    };

    // Voice input
    const toggleVoice = () => {
        if (isListening) {
            setIsListening(false);
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Speech recognition is not supported in this browser.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-IN';

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
    };

    const clearChat = () => {
        setChatMessages([]);
        setDigitalTwinChat([]);
    };

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800 }}>3D Digital Twin</h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
                    Chat with AI about your health, or click body areas to log symptoms.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, minHeight: 600 }}>
                {/* 3D Model */}
                <div className="glass-card-static" style={{ position: 'relative', height: 500, overflow: 'hidden', maxHeight: 500 }}>
                    <Canvas camera={{ position: [0, 1, 4.5], fov: 45 }} style={{ height: '100%' }}>
                        <ambientLight intensity={0.4} />
                        <pointLight position={[5, 5, 5]} intensity={1} color="#0EA5E9" />
                        <pointLight position={[-5, 3, -5]} intensity={0.5} color="#8B5CF6" />
                        <Suspense fallback={null}>
                            <InteractiveBody symptoms={symptoms} onPartClick={handlePartClick} />
                        </Suspense>
                        <OrbitControls enablePan={false} enableZoom={true} minDistance={3} maxDistance={6} maxPolarAngle={Math.PI / 1.5} minPolarAngle={Math.PI / 4} />
                    </Canvas>

                    {/* Legend */}
                    <div style={{ position: 'absolute', bottom: 16, left: 16, display: 'flex', gap: 12 }}>
                        {[
                            { color: '#38BDF8', label: 'Healthy' },
                            { color: '#F59E0B', label: 'Mild' },
                            { color: '#F97316', label: 'Moderate' },
                            { color: '#EF4444', label: 'Severe' },
                        ].map(item => (
                            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
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
                                style={{
                                    position: 'absolute', top: '50%', left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    background: 'var(--glass-bg)', backdropFilter: 'blur(20px)',
                                    border: '1px solid var(--glass-border)', borderRadius: 20,
                                    padding: 24, zIndex: 10, minWidth: 240,
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <h3 style={{ fontWeight: 700 }}>{selectedPart}</h3>
                                    <button onClick={() => setSelectedPart(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                        <X size={18} />
                                    </button>
                                </div>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>How severe is the discomfort?</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {[
                                        { value: 'mild', label: 'Mild', color: '#F59E0B' },
                                        { value: 'moderate', label: 'Moderate', color: '#F97316' },
                                        { value: 'severe', label: 'Severe', color: '#EF4444' },
                                        { value: 'none', label: 'No Pain', color: '#10B981' },
                                    ].map(opt => (
                                        <button key={opt.value} onClick={() => setSeverity(opt.value)} style={{
                                            padding: '10px 16px', borderRadius: 10,
                                            border: `1px solid ${opt.color}30`, background: `${opt.color}10`,
                                            color: opt.color, fontWeight: 600, cursor: 'pointer',
                                            fontSize: 14, textAlign: 'left',
                                        }}>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* AI Chat Panel */}
                <div className="glass-card-static" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Brain size={20} style={{ color: 'var(--color-primary)' }} />
                            <span style={{ fontWeight: 700 }}>HealthSync AI</span>
                        </div>
                        {chatMessages.length > 0 && (
                            <button onClick={clearChat} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>
                                Clear Chat
                            </button>
                        )}
                    </div>

                    <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {chatMessages.length === 0 && (
                            <div style={{ padding: 20, textAlign: 'center', margin: 'auto 0' }}>
                                <Brain size={40} style={{ color: 'var(--color-primary)', marginBottom: 12, opacity: 0.5 }} />
                                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 8 }}>
                                    Ask me anything about your health!
                                </p>
                                <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                    You can type, use voice, or click body parts to mark symptoms.
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 16, justifyContent: 'center' }}>
                                    {['I have a headache', 'My stomach hurts', 'I feel dizzy', 'Recommend a doctor'].map(q => (
                                        <button key={q} onClick={() => { setInputText(q); }} style={{
                                            padding: '6px 12px', borderRadius: 8, fontSize: 12,
                                            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                            color: 'var(--text-secondary)', cursor: 'pointer',
                                        }}>
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {chatMessages.map((msg, i) => (
                            <div key={i} className={msg.role === 'ai' ? 'chat-bubble-ai' : 'chat-bubble-user'}>
                                <p style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                            </div>
                        ))}

                        {loading && (
                            <div className="chat-bubble-ai" style={{ display: 'flex', gap: 4, padding: '14px 20px' }}>
                                {[0, 1, 2].map(i => (
                                    <motion.div key={i} animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-muted)' }} />
                                ))}
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input */}
                    <div style={{ padding: 16, borderTop: '1px solid var(--border-color)' }}>
                        {chatImage && (
                            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.1)' }}>
                                <ImagePlus size={14} style={{ color: 'var(--color-primary)' }} />
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>Image attached</span>
                                <button onClick={() => setChatImage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={12} /></button>
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: 10 }}>
                            <input type="file" accept="image/*" ref={imageInputRef} style={{ display: 'none' }} onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = () => setChatImage(reader.result as string);
                                    reader.readAsDataURL(file);
                                }
                            }} />
                            <button
                                onClick={() => imageInputRef.current?.click()}
                                style={{
                                    width: 48, height: 48, borderRadius: 12, border: 'none', cursor: 'pointer',
                                    background: chatImage ? 'rgba(14,165,233,0.1)' : 'var(--bg-card)',
                                    color: chatImage ? 'var(--color-primary)' : 'var(--text-muted)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                }}
                            >
                                <ImagePlus size={18} />
                            </button>
                            <button
                                onClick={toggleVoice}
                                style={{
                                    width: 48, height: 48, borderRadius: 12, border: 'none', cursor: 'pointer',
                                    background: isListening ? 'linear-gradient(135deg, #EF4444, #DC2626)' : 'var(--bg-card)',
                                    color: isListening ? 'white' : 'var(--text-muted)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0, transition: 'all 0.3s ease',
                                }}
                            >
                                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                            </button>
                            <input
                                className="input-field"
                                placeholder={isListening ? 'Listening...' : 'Ask about your health...'}
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                                disabled={isListening}
                            />
                            <button
                                onClick={() => {
                                    if (chatImage) {
                                        sendMessage((inputText.trim() || 'I have attached a medical image for analysis.') + ' [User attached an image — please provide general guidance based on the described symptoms]');
                                        setChatImage(null);
                                    } else {
                                        sendMessage();
                                    }
                                }}
                                disabled={loading || (!inputText.trim() && Object.keys(symptoms).length === 0 && !chatImage)}
                                className="btn-primary"
                                style={{ padding: '12px 20px', opacity: loading || (!inputText.trim() && Object.keys(symptoms).length === 0 && !chatImage) ? 0.5 : 1 }}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
