'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ambulance, Building2, Users, BedDouble, Phone, CheckCircle2, AlertTriangle, X, Droplet } from 'lucide-react';
import { getDoctorAccounts, getFamilyMembers, getCurrentUser, addEmergencyRequest, generateId } from '@/lib/store';

export default function EmergencyPage() {
    const user = getCurrentUser();
    const [actionState, setActionState] = useState<{ type: string; message: string; subText?: string } | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [showBloodModal, setShowBloodModal] = useState(false);
    const [showHospitalModal, setShowHospitalModal] = useState(false);
    const [showBedModal, setShowBedModal] = useState(false);
    const [showMachineModal, setShowMachineModal] = useState(false);
    
    const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const wards = ['ICU', 'Normal Ward', 'General Ward'];
    const machines = ['MRI Scanner', 'CT Scanner', 'X-Ray (Digital)', 'Ultrasound'];

    const handleBookAmbulance = () => {
        setShowHospitalModal(false);
        setActionState({
            type: 'ambulance',
            message: 'Ambulance Dispatched!',
            subText: `An ambulance is on its way to your location: ${user?.location || 'Unknown location'}. ETA: 5 mins.`
        });
        setShowModal(true);
    };

    const handleCallHospital = () => {
        setShowHospitalModal(false);
        setActionState({
            type: 'hospital',
            message: `Calling Nearest Hospital...`,
            subText: `Connecting you to the nearest emergency room. They have been alerted of your location.`
        });
        setShowModal(true);
    };

    const handleCallFamily = () => {
        const family = getFamilyMembers();
        if (family.length === 0) {
            setActionState({
                type: 'family',
                message: 'No Family Members Found',
                subText: 'Please add family members in the Family section to use this feature.'
            });
        } else {
            setActionState({
                type: 'family',
                message: 'Alerting Family Members!',
                subText: `Emergency alerts sent to ${family.map(f => f.name).join(', ')}.`
            });
        }
        setShowModal(true);
    };

    const [reqWard, setReqWard] = useState('ICU');
    const [reqMachine, setReqMachine] = useState('MRI Scanner');

    const handleBookBed = () => {
        addEmergencyRequest({
            id: generateId(),
            type: 'bed',
            status: 'Processing',
            time: 'Just now',
            ward: reqWard,
            patientName: user?.name || 'Unknown Patient'
        });
        setShowBedModal(false);
        setActionState({
            type: 'bed',
            message: `${reqWard} Bed Booked`,
            subText: `An urgent bed has been reserved for you at the nearest available hospital in the ${reqWard}. Please proceed immediately.`
        });
        setShowModal(true);
    };

    const handleRequestMachine = () => {
        addEmergencyRequest({
            id: generateId(),
            type: 'machine',
            status: 'Pending',
            time: 'Just now',
            machine: reqMachine,
            patientName: user?.name || 'Unknown Patient'
        });
        setShowMachineModal(false);
        setActionState({
            type: 'machine',
            message: `${reqMachine} Requested`,
            subText: `Your request for a ${reqMachine} scan has been sent to the diagnostic center. They will contact you shortly with a slot.`
        });
        setShowModal(true);
    };

    const handleRequestBlood = (bloodType: string) => {
        addEmergencyRequest({
            id: generateId(),
            type: 'blood',
            status: 'Pending',
            time: 'Just now',
            bloodType,
            location: 'Emergency Request from ' + (user?.name || 'User')
        });
        setShowBloodModal(false);
        setActionState({
            type: 'blood',
            message: 'Blood Request Sent',
            subText: `Urgent request for ${bloodType} blood has been broadcasted to the nearest blood banks. You will be contacted shortly.`
        });
        setShowModal(true);
    };

    const containerVariants: any = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants: any = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
    };

    return (
        <div style={{ maxWidth: 800, margin: '0 auto', paddingTop: 20 }}>
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32, textAlign: 'center' }}>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 64, height: 64, borderRadius: 20, background: 'rgba(220, 38, 38, 0.1)',
                    color: '#DC2626', marginBottom: 16
                }}>
                    <AlertTriangle size={32} />
                </div>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: '#DC2626' }}>Emergency Services</h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
                    If this is a life-threatening medical emergency, call 112 immediately.
                </p>
            </motion.div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20
                }}
            >
                {/* Call Hospital */}
                <motion.button variants={itemVariants} onClick={() => setShowHospitalModal(true)} style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16,
                    padding: 24, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 20,
                    transition: 'all 0.2s', boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                }} className="hover-lift">
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: 16, borderRadius: 16, color: '#3B82F6' }}>
                        <Building2 size={28} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Call Nearest Hospital</h3>
                        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>Connect instantly to emergency room</p>
                    </div>
                </motion.button>

                {/* Call Family */}
                <motion.button variants={itemVariants} onClick={handleCallFamily} style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16,
                    padding: 24, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 20,
                    transition: 'all 0.2s', boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                }} className="hover-lift">
                    <div style={{ background: 'rgba(5, 150, 105, 0.1)', padding: 16, borderRadius: 16, color: '#059669' }}>
                        <Users size={28} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Notify Family</h3>
                        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>Alert your emergency contacts</p>
                    </div>
                </motion.button>

                {/* Book Bed */}
                <motion.button variants={itemVariants} onClick={() => setShowBedModal(true)} style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16,
                    padding: 24, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 20,
                    transition: 'all 0.2s', boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                }} className="hover-lift">
                    <div style={{ background: 'rgba(79, 107, 138, 0.1)', padding: 16, borderRadius: 16, color: '#4F6B8A' }}>
                        <BedDouble size={28} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Book Urgent Bed</h3>
                        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>Reserve an ICU or General ward bed</p>
                    </div>
                </motion.button>

                {/* Request Blood */}
                <motion.button variants={itemVariants} onClick={() => setShowBloodModal(true)} style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16,
                    padding: 24, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 20,
                    transition: 'all 0.2s', boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                }} className="hover-lift">
                    <div style={{ background: 'rgba(220, 38, 38, 0.1)', padding: 16, borderRadius: 16, color: '#DC2626' }}>
                        <Droplet size={28} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Request Blood</h3>
                        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>Order from nearest blood bank</p>
                    </div>
                </motion.button>

                {/* Request Diagnostic Machine */}
                <motion.button variants={itemVariants} onClick={() => setShowMachineModal(true)} style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16,
                    padding: 24, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 20,
                    transition: 'all 0.2s', boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                }} className="hover-lift">
                    <div style={{ background: 'rgba(5, 150, 105, 0.1)', padding: 16, borderRadius: 16, color: '#059669' }}>
                        <Building2 size={28} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Request Scan</h3>
                        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>Book MRI, CT, X-Ray urgently</p>
                    </div>
                </motion.button>

                {/* Direct Dial 112 */}
                <motion.a variants={itemVariants} href="tel:112" style={{
                    gridColumn: '1 / -1',
                    background: '#DC2626', color: 'white', border: 'none', borderRadius: 16,
                    padding: 20, textAlign: 'center', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                    textDecoration: 'none', fontWeight: 700, fontSize: 18,
                    boxShadow: '0 8px 30px rgba(220, 38, 38, 0.3)'
                }} className="hover-lift">
                    <Phone size={24} /> Dial 112 (National Emergency)
                </motion.a>
            </motion.div>

            {/* Modal */}
            <AnimatePresence>
                {showModal && actionState && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 20
                    }}>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowModal(false)}
                            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            style={{
                                background: 'var(--bg-card)', borderRadius: 24, padding: 32, width: '100%', maxWidth: 400,
                                position: 'relative', zIndex: 10000, textAlign: 'center', border: '1px solid var(--border-color)',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                            }}
                        >
                            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={18} />
                            </button>

                            <div style={{
                                width: 80, height: 80, borderRadius: '50%', background: 'rgba(5, 150, 105, 0.1)',
                                color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 24px'
                            }}>
                                <CheckCircle2 size={40} />
                            </div>

                            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                                {actionState.message}
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.5, marginBottom: 24 }}>
                                {actionState.subText}
                            </p>

                            <button onClick={() => setShowModal(false)} className="btn-primary" style={{ width: '100%', padding: '14px 24px' }}>
                                Acknowledge
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Blood Type Selection Modal */}
            <AnimatePresence>
                {showBloodModal && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 20
                    }}>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowBloodModal(false)}
                            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            style={{
                                background: 'var(--bg-card)', borderRadius: 24, padding: 32, width: '100%', maxWidth: 450,
                                position: 'relative', zIndex: 10000, textAlign: 'center', border: '1px solid var(--border-color)',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                            }}
                        >
                            <button onClick={() => setShowBloodModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={18} />
                            </button>

                            <div style={{
                                width: 80, height: 80, borderRadius: '50%', background: 'rgba(220, 38, 38, 0.1)',
                                color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 24px'
                            }}>
                                <Droplet size={40} />
                            </div>

                            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                                Request Blood
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.5, marginBottom: 24 }}>
                                Please select the required blood type to order from the nearest blood bank.
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                                {bloodTypes.map(bt => (
                                    <button 
                                        key={bt} 
                                        onClick={() => handleRequestBlood(bt)}
                                        style={{
                                            padding: '12px', borderRadius: '12px', background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)', color: 'var(--text-primary)',
                                            fontWeight: 700, fontSize: 16, cursor: 'pointer', transition: 'all 0.2s'
                                        }}
                                        className="hover-lift"
                                    >
                                        {bt}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Hospital Options Modal */}
            <AnimatePresence>
                {showHospitalModal && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 20
                    }}>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowHospitalModal(false)}
                            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            style={{
                                background: 'var(--bg-card)', borderRadius: 24, padding: 32, width: '100%', maxWidth: 400,
                                position: 'relative', zIndex: 10000, textAlign: 'center', border: '1px solid var(--border-color)',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                            }}
                        >
                            <button onClick={() => setShowHospitalModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={18} />
                            </button>

                            <div style={{
                                width: 80, height: 80, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)',
                                color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 24px'
                            }}>
                                <Building2 size={40} />
                            </div>

                            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                                Hospital Emergency
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.5, marginBottom: 24 }}>
                                Do you want to call the emergency room or dispatch an ambulance to your location?
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <button onClick={handleCallHospital} className="btn-primary" style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    <Phone size={20} /> Call Emergency Room
                                </button>
                                <button onClick={handleBookAmbulance} style={{ 
                                    padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    background: '#DC2626', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer'
                                }}>
                                    <Ambulance size={20} /> Dispatch Ambulance
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Bed Request Modal */}
            <AnimatePresence>
                {showBedModal && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 20
                    }}>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowBedModal(false)}
                            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            style={{
                                background: 'var(--bg-card)', borderRadius: 24, padding: 32, width: '100%', maxWidth: 450,
                                position: 'relative', zIndex: 10000, textAlign: 'center', border: '1px solid var(--border-color)',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                            }}
                        >
                            <button onClick={() => setShowBedModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={18} />
                            </button>

                            <div style={{
                                width: 80, height: 80, borderRadius: '50%', background: 'rgba(79, 107, 138, 0.1)',
                                color: '#4F6B8A', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 24px'
                            }}>
                                <BedDouble size={40} />
                            </div>

                            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                                Request Urgent Bed
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.5, marginBottom: 24 }}>
                                Select the required ward. We will immediately broadcast this request to the hospital network.
                            </p>

                            <div style={{ marginBottom: 24, textAlign: 'left' }}>
                                <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Ward Type</label>
                                <select className="input-field" value={reqWard} onChange={e => setReqWard(e.target.value)} style={{ width: '100%', padding: 12 }}>
                                    {wards.map(w => <option key={w} value={w}>{w}</option>)}
                                </select>
                            </div>

                            <button onClick={handleBookBed} className="btn-primary" style={{ width: '100%', padding: 14, background: '#4F6B8A', color: 'white' }}>
                                Submit Bed Request
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Machine Request Modal */}
            <AnimatePresence>
                {showMachineModal && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 20
                    }}>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowMachineModal(false)}
                            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            style={{
                                background: 'var(--bg-card)', borderRadius: 24, padding: 32, width: '100%', maxWidth: 450,
                                position: 'relative', zIndex: 10000, textAlign: 'center', border: '1px solid var(--border-color)',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                            }}
                        >
                            <button onClick={() => setShowMachineModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={18} />
                            </button>

                            <div style={{
                                width: 80, height: 80, borderRadius: '50%', background: 'rgba(5, 150, 105, 0.1)',
                                color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 24px'
                            }}>
                                <Building2 size={40} />
                            </div>

                            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                                Urgent Diagnostic Scan
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.5, marginBottom: 24 }}>
                                Request an emergency diagnostic machine scan. We will find an available slot immediately.
                            </p>

                            <div style={{ marginBottom: 24, textAlign: 'left' }}>
                                <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Machine Type</label>
                                <select className="input-field" value={reqMachine} onChange={e => setReqMachine(e.target.value)} style={{ width: '100%', padding: 12 }}>
                                    {machines.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>

                            <button onClick={handleRequestMachine} className="btn-primary" style={{ width: '100%', padding: 14, background: '#059669', color: 'white' }}>
                                Request Machine
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
