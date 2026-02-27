'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Star, MapPin, Clock, Calendar, X, CheckCircle, Phone, Filter } from 'lucide-react';
import { addAppointment, generateId, getCurrentUser } from '@/lib/store';
import { cloudAddAppointment, cloudAddNotification } from '@/lib/shared-store';
import { useLanguage } from '@/lib/LanguageProvider';

const doctors = [
    { id: 'doc1', name: 'Dr. Priya Sharma', specialty: 'Nephrologist', hospital: 'AIIMS Delhi', rating: 4.9, experience: '15 yrs', fee: '₹800', initials: 'PS', available: ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM'] },
    { id: 'doc2', name: 'Dr. Rajesh Kumar', specialty: 'Cardiologist', hospital: 'Max Hospital', rating: 4.8, experience: '20 yrs', fee: '₹1200', initials: 'RK', available: ['9:30 AM', '10:30 AM', '11:30 AM', '1:00 PM', '3:30 PM'] },
    { id: 'doc3', name: 'Dr. Ananya Patel', specialty: 'General Physician', hospital: 'Apollo Clinic', rating: 4.7, experience: '12 yrs', fee: '₹500', initials: 'AP', available: ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '4:00 PM', '5:00 PM'] },
    { id: 'doc4', name: 'Dr. Suresh Reddy', specialty: 'Orthopedic', hospital: 'Fortis Hospital', rating: 4.8, experience: '18 yrs', fee: '₹1000', initials: 'SR', available: ['10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM'] },
    { id: 'doc5', name: 'Dr. Meera Iyer', specialty: 'Dermatologist', hospital: 'Manipal Hospital', rating: 4.6, experience: '10 yrs', fee: '₹700', initials: 'MI', available: ['9:00 AM', '10:00 AM', '3:00 PM', '4:00 PM', '5:00 PM'] },
    { id: 'doc6', name: 'Dr. Vikram Singh', specialty: 'Neurologist', hospital: 'Medanta Hospital', rating: 4.9, experience: '22 yrs', fee: '₹1500', initials: 'VS', available: ['10:00 AM', '11:00 AM', '1:00 PM'] },
    { id: 'doc7', name: 'Dr. Kavita Desai', specialty: 'Gynecologist', hospital: 'Kokilaben Hospital', rating: 4.7, experience: '16 yrs', fee: '₹900', initials: 'KD', available: ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM'] },
    { id: 'doc8', name: 'Dr. Arjun Nair', specialty: 'Pulmonologist', hospital: 'Narayana Health', rating: 4.5, experience: '14 yrs', fee: '₹800', initials: 'AN', available: ['9:30 AM', '10:30 AM', '2:30 PM', '3:30 PM'] },
    { id: 'doc9', name: 'Dr. Sunita Agarwal', specialty: 'Endocrinologist', hospital: 'BLK Hospital', rating: 4.8, experience: '19 yrs', fee: '₹1100', initials: 'SA', available: ['10:00 AM', '11:00 AM', '2:00 PM'] },
    { id: 'doc10', name: 'Dr. Rahul Gupta', specialty: 'Gastroenterologist', hospital: 'Sir Ganga Ram', rating: 4.6, experience: '13 yrs', fee: '₹900', initials: 'RG', available: ['9:00 AM', '10:00 AM', '11:00 AM', '3:00 PM', '4:00 PM'] },
    { id: 'doc11', name: 'Dr. Pooja Malhotra', specialty: 'Ophthalmologist', hospital: 'Eye Care Centre', rating: 4.7, experience: '11 yrs', fee: '₹600', initials: 'PM', available: ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM'] },
    { id: 'doc12', name: 'Dr. Anil Sharma', specialty: 'Urologist', hospital: 'Safdarjung Hospital', rating: 4.5, experience: '17 yrs', fee: '₹1000', initials: 'AS', available: ['10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM'] },
    { id: 'doc13', name: 'Dr. Ritu Verma', specialty: 'Psychiatrist', hospital: 'VIMHANS', rating: 4.9, experience: '20 yrs', fee: '₹1200', initials: 'RV', available: ['10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM'] },
    { id: 'doc14', name: 'Dr. Manish Kapoor', specialty: 'ENT Specialist', hospital: 'Max Healthcare', rating: 4.6, experience: '15 yrs', fee: '₹700', initials: 'MK', available: ['9:00 AM', '10:00 AM', '11:00 AM', '3:00 PM'] },
    { id: 'doc15', name: 'Dr. Lakshmi Nair', specialty: 'Oncologist', hospital: 'Tata Memorial', rating: 4.9, experience: '25 yrs', fee: '₹2000', initials: 'LN', available: ['10:00 AM', '11:00 AM'] },
    { id: 'doc16', name: 'Dr. Sanjay Joshi', specialty: 'Rheumatologist', hospital: 'AIIMS Delhi', rating: 4.7, experience: '14 yrs', fee: '₹900', initials: 'SJ', available: ['9:00 AM', '10:00 AM', '2:00 PM', '3:00 PM', '4:00 PM'] },
    { id: 'doc17', name: 'Dr. Deepa Chauhan', specialty: 'Pediatrician', hospital: 'Rainbow Hospital', rating: 4.8, experience: '16 yrs', fee: '₹600', initials: 'DC', available: ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '4:00 PM', '5:00 PM'] },
    { id: 'doc18', name: 'Dr. Abhishek Tiwari', specialty: 'Dentist', hospital: 'Clove Dental', rating: 4.5, experience: '8 yrs', fee: '₹400', initials: 'AT', available: ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'] },
];

const specialties = [...new Set(doctors.map(d => d.specialty))].sort();

export default function DoctorsPage() {
    const [search, setSearch] = useState('');
    const [filterSpecialty, setFilterSpecialty] = useState('');
    const [showBooking, setShowBooking] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const filtered = doctors.filter(d => {
        const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.specialty.toLowerCase().includes(search.toLowerCase()) || d.hospital.toLowerCase().includes(search.toLowerCase());
        const matchesSpecialty = !filterSpecialty || d.specialty === filterSpecialty;
        return matchesSearch && matchesSpecialty;
    });

    const getNextDays = () => {
        const days: string[] = [];
        for (let i = 1; i <= 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            days.push(d.toISOString().split('T')[0]);
        }
        return days;
    };

    const handleBook = async () => {
        const doctor = doctors.find(d => d.id === showBooking);
        if (!doctor || !selectedDate || !selectedTime) return;
        const user = getCurrentUser();
        const userId = user?.id || 'unknown';

        const apt = {
            id: generateId(),
            userId,
            doctorId: doctor.id,
            doctorName: doctor.name,
            specialty: doctor.specialty,
            date: selectedDate,
            time: selectedTime,
            status: 'booked' as const,
            location: doctor.hospital,
            notes: '',
        };

        // Save to both local and cloud
        addAppointment(apt);
        await cloudAddAppointment(apt);

        // Send notification to cloud
        await cloudAddNotification({
            id: generateId(),
            userId,
            type: 'appointment',
            title: 'Appointment Booked',
            message: `Appointment with ${doctor.name} on ${selectedDate} at ${selectedTime}`,
            timestamp: new Date().toISOString(),
            read: false,
            link: '/doctors',
        });

        setBookingSuccess(true);
        setTimeout(() => {
            setShowBooking(null);
            setBookingSuccess(false);
            setSelectedDate('');
            setSelectedTime('');
        }, 2000);
    };

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800 }}>Find a Doctor</h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Book appointments with verified specialists</p>
            </div>

            {/* Search & Filter */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, position: 'relative', minWidth: 200 }}>
                    <Search size={18} style={{ position: 'absolute', left: 14, top: 16, color: 'var(--text-muted)' }} />
                    <input className="input-field" style={{ paddingLeft: 42 }} placeholder="Search doctors, specialties, hospitals..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="input-field" style={{ width: 200 }} value={filterSpecialty} onChange={e => setFilterSpecialty(e.target.value)}>
                    <option value="">All Specialties</option>
                    {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {/* Results count */}
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                Showing {filtered.length} doctor{filtered.length !== 1 ? 's' : ''}
            </p>

            {/* Doctor Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {filtered.map((doc, i) => (
                    <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="glass-card"
                        style={{ padding: 22 }}
                    >
                        <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
                            <div style={{
                                width: 56, height: 56, borderRadius: 16,
                                background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0, color: 'white', fontWeight: 700, fontSize: 18,
                            }}>
                                {doc.initials}
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{doc.name}</h3>
                                <div style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 600 }}>{doc.specialty}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <MapPin size={11} /> {doc.hospital}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Star size={12} style={{ color: '#F59E0B', fill: '#F59E0B' }} /> {doc.rating}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Clock size={12} /> {doc.experience}
                                </span>
                            </div>
                            <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: 15 }}>{doc.fee}</span>
                        </div>

                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 14 }}>
                            {doc.available.slice(0, 4).map(t => (
                                <span key={t} style={{
                                    padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                                    background: 'rgba(16, 185, 129, 0.08)', color: '#10B981',
                                    border: '1px solid rgba(16, 185, 129, 0.15)',
                                }}>
                                    {t}
                                </span>
                            ))}
                            {doc.available.length > 4 && (
                                <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                                    +{doc.available.length - 4} more
                                </span>
                            )}
                        </div>

                        <button onClick={() => { setShowBooking(doc.id); setSelectedDate(''); setSelectedTime(''); }} className="btn-primary" style={{ width: '100%', padding: '10px 16px', fontSize: 14 }}>
                            <Calendar size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Book Appointment
                        </button>
                    </motion.div>
                ))}
            </div>

            {/* Booking Modal */}
            <AnimatePresence>
                {showBooking && (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1001, padding: 20, backdropFilter: 'blur(4px)',
                    }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-card-static"
                            style={{ padding: 32, width: '100%', maxWidth: 480 }}
                        >
                            {bookingSuccess ? (
                                <div style={{ textAlign: 'center', padding: 20 }}>
                                    <CheckCircle size={56} style={{ color: '#10B981', marginBottom: 16 }} />
                                    <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Appointment Booked!</h2>
                                    <p style={{ color: 'var(--text-secondary)' }}>
                                        {doctors.find(d => d.id === showBooking)?.name} — {selectedDate} at {selectedTime}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Book Appointment</h2>
                                        <button onClick={() => setShowBooking(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: 14, borderRadius: 12, background: 'var(--bg-card)' }}>
                                        <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--color-primary)' }}>{doctors.find(d => d.id === showBooking)?.initials}</span>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{doctors.find(d => d.id === showBooking)?.name}</div>
                                            <div style={{ fontSize: 13, color: 'var(--color-primary)' }}>{doctors.find(d => d.id === showBooking)?.specialty}</div>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: 20 }}>
                                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Select Date</label>
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                            {getNextDays().map(d => (
                                                <button key={d} onClick={() => setSelectedDate(d)} style={{
                                                    padding: '10px 14px', borderRadius: 10, fontSize: 13,
                                                    border: `1px solid ${selectedDate === d ? 'var(--color-primary)' : 'var(--border-color)'}`,
                                                    background: selectedDate === d ? 'rgba(14, 165, 233, 0.12)' : 'var(--bg-card)',
                                                    color: selectedDate === d ? 'var(--color-primary)' : 'var(--text-secondary)',
                                                    cursor: 'pointer', fontWeight: 500,
                                                }}>
                                                    {new Date(d).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {selectedDate && (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
                                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Select Time Slot</label>
                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                {doctors.find(d => d.id === showBooking)?.available.map(t => (
                                                    <button key={t} onClick={() => setSelectedTime(t)} style={{
                                                        padding: '8px 14px', borderRadius: 8, fontSize: 13,
                                                        border: `1px solid ${selectedTime === t ? '#10B981' : 'var(--border-color)'}`,
                                                        background: selectedTime === t ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-card)',
                                                        color: selectedTime === t ? '#10B981' : 'var(--text-secondary)',
                                                        cursor: 'pointer', fontWeight: 500,
                                                    }}>
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}

                                    <button onClick={handleBook} disabled={!selectedDate || !selectedTime} className="btn-primary" style={{ width: '100%', opacity: !selectedDate || !selectedTime ? 0.5 : 1 }}>
                                        Confirm Booking
                                    </button>
                                </>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
