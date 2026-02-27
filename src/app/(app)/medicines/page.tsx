'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Pill, ShoppingCart, X, Check, Package, Clock, Truck, MapPin, CreditCard, History } from 'lucide-react';
import { getCurrentUser, getOrders, addOrder, addNotification, generateId, generateTransactionId, type MedicineOrder } from '@/lib/store';
import { useLanguage } from '@/lib/LanguageProvider';

const medicines = [
    { name: 'Amoxicillin', generic: 'Amoxicillin', category: 'Antibiotic', use: 'Bacterial infections', sideEffects: ['Nausea', 'Diarrhea', 'Rash'], janAushadhi: 35, market: 180, rx: true },
    { name: 'Paracetamol', generic: 'Acetaminophen', category: 'Pain Relief', use: 'Fever, pain, headache', sideEffects: ['Liver damage at high doses'], janAushadhi: 8, market: 30, rx: false },
    { name: 'Metformin', generic: 'Metformin HCl', category: 'Diabetes', use: 'Type 2 diabetes', sideEffects: ['Nausea', 'Stomach upset', 'Lactic acidosis'], janAushadhi: 12, market: 80, rx: true },
    { name: 'Atorvastatin', generic: 'Atorvastatin Calcium', category: 'Cholesterol', use: 'High cholesterol', sideEffects: ['Muscle pain', 'Joint pain'], janAushadhi: 20, market: 110, rx: true },
    { name: 'Amlodipine', generic: 'Amlodipine Besylate', category: 'Blood Pressure', use: 'Hypertension', sideEffects: ['Swelling', 'Dizziness', 'Flushing'], janAushadhi: 15, market: 70, rx: true },
    { name: 'Omeprazole', generic: 'Omeprazole', category: 'Gastric', use: 'Acid reflux, ulcers', sideEffects: ['Headache', 'Stomach pain'], janAushadhi: 18, market: 95, rx: false },
    { name: 'Cetirizine', generic: 'Cetirizine HCl', category: 'Allergy', use: 'Allergies, hay fever', sideEffects: ['Drowsiness', 'Dry mouth'], janAushadhi: 10, market: 45, rx: false },
    { name: 'Azithromycin', generic: 'Azithromycin', category: 'Antibiotic', use: 'Respiratory infections', sideEffects: ['Nausea', 'Diarrhea', 'Stomach cramps'], janAushadhi: 25, market: 120, rx: true },
    { name: 'Ibuprofen', generic: 'Ibuprofen', category: 'Pain Relief', use: 'Pain, inflammation', sideEffects: ['Stomach ulcers', 'Kidney issues'], janAushadhi: 10, market: 40, rx: false },
    { name: 'Vitamin D3', generic: 'Cholecalciferol', category: 'Supplement', use: 'Vitamin D deficiency', sideEffects: ['Nausea at high doses'], janAushadhi: 40, market: 150, rx: false },
    { name: 'Losartan', generic: 'Losartan Potassium', category: 'Blood Pressure', use: 'Hypertension, kidney protection', sideEffects: ['Dizziness', 'Hyperkalemia'], janAushadhi: 22, market: 90, rx: true },
    { name: 'Montelukast', generic: 'Montelukast Sodium', category: 'Respiratory', use: 'Asthma, allergic rhinitis', sideEffects: ['Headache', 'Mood changes'], janAushadhi: 18, market: 85, rx: true },
    { name: 'Pantoprazole', generic: 'Pantoprazole', category: 'Gastric', use: 'GERD, ulcers', sideEffects: ['Headache', 'Diarrhea'], janAushadhi: 14, market: 75, rx: false },
    { name: 'Doxycycline', generic: 'Doxycycline', category: 'Antibiotic', use: 'Acne, UTI, malaria prevention', sideEffects: ['Sun sensitivity', 'Nausea'], janAushadhi: 20, market: 100, rx: true },
    { name: 'Levothyroxine', generic: 'Levothyroxine Sodium', category: 'Thyroid', use: 'Hypothyroidism', sideEffects: ['Palpitations', 'Weight loss'], janAushadhi: 15, market: 65, rx: true },
    { name: 'Calcium + D3', generic: 'Calcium Carbonate + D3', category: 'Supplement', use: 'Bone health', sideEffects: ['Constipation'], janAushadhi: 30, market: 120, rx: false },
    { name: 'Aspirin', generic: 'Acetylsalicylic Acid', category: 'Blood Thinner', use: 'Heart attack prevention', sideEffects: ['Stomach bleeding', 'Bruising'], janAushadhi: 5, market: 25, rx: false },
    { name: 'Clopidogrel', generic: 'Clopidogrel Bisulfate', category: 'Blood Thinner', use: 'Stroke/heart attack prevention', sideEffects: ['Bleeding', 'Bruising'], janAushadhi: 28, market: 130, rx: true },
    { name: 'Ranitidine', generic: 'Ranitidine HCl', category: 'Gastric', use: 'Heartburn, acid reflux', sideEffects: ['Headache', 'Constipation'], janAushadhi: 8, market: 35, rx: false },
    { name: 'Multivitamin', generic: 'Multivitamin Complex', category: 'Supplement', use: 'General health', sideEffects: ['Nausea if taken without food'], janAushadhi: 25, market: 180, rx: false },
    { name: 'Iron + Folic Acid', generic: 'Ferrous Sulfate + Folic Acid', category: 'Supplement', use: 'Anemia', sideEffects: ['Constipation', 'Dark stools'], janAushadhi: 12, market: 60, rx: false },
    { name: 'Gabapentin', generic: 'Gabapentin', category: 'Nerve Pain', use: 'Nerve pain, seizures', sideEffects: ['Drowsiness', 'Dizziness'], janAushadhi: 30, market: 140, rx: true },
    { name: 'Metoprolol', generic: 'Metoprolol Tartrate', category: 'Blood Pressure', use: 'Hypertension, angina', sideEffects: ['Fatigue', 'Cold hands'], janAushadhi: 18, market: 75, rx: true },
    { name: 'Fluconazole', generic: 'Fluconazole', category: 'Antifungal', use: 'Fungal infections', sideEffects: ['Nausea', 'Headache'], janAushadhi: 15, market: 80, rx: true },
    { name: 'ORS Powder', generic: 'Oral Rehydration Salts', category: 'Rehydration', use: 'Dehydration, diarrhea', sideEffects: ['Rare'], janAushadhi: 5, market: 20, rx: false },
];

const categories = ['All', ...new Set(medicines.map(m => m.category))].sort();

export default function MedicinesPage() {
    const { t } = useLanguage();
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [cart, setCart] = useState<{ name: string; quantity: number; price: number }[]>([]);
    const [showCart, setShowCart] = useState(false);
    const [showOrders, setShowOrders] = useState(false);
    const [orders, setOrders] = useState<MedicineOrder[]>([]);
    const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
    const [expandedMed, setExpandedMed] = useState<string | null>(null);

    useEffect(() => {
        setOrders(getOrders().slice().reverse());
    }, []);

    const filtered = medicines.filter(m => {
        const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.generic.toLowerCase().includes(search.toLowerCase()) || m.use.toLowerCase().includes(search.toLowerCase());
        const matchCat = category === 'All' || m.category === category;
        return matchSearch && matchCat;
    });

    const addToCart = (med: typeof medicines[0]) => {
        setCart(prev => {
            const existing = prev.find(c => c.name === med.name);
            if (existing) return prev.map(c => c.name === med.name ? { ...c, quantity: c.quantity + 1 } : c);
            return [...prev, { name: med.name, quantity: 1, price: med.janAushadhi }];
        });
    };

    const removeFromCart = (name: string) => setCart(prev => prev.filter(c => c.name !== name));
    const updateQty = (name: string, qty: number) => {
        if (qty <= 0) return removeFromCart(name);
        setCart(prev => prev.map(c => c.name === name ? { ...c, quantity: qty } : c));
    };

    const totalAmount = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

    const placeOrder = () => {
        const user = getCurrentUser();
        if (!user || cart.length === 0) return;
        const txnId = generateTransactionId();
        const deliveryDate = new Date(); deliveryDate.setDate(deliveryDate.getDate() + 3);
        const order: MedicineOrder = {
            id: generateId(), userId: user.id, transactionId: txnId,
            items: [...cart], totalAmount,
            status: 'confirmed', orderDate: new Date().toISOString(),
            estimatedDelivery: deliveryDate.toISOString(),
            deliveryAddress: 'Home Address',
        };
        addOrder(order);
        addNotification({
            id: generateId(), userId: user.id, type: 'order',
            title: 'Order Confirmed',
            message: `Your order (${txnId}) for ${cart.length} item(s) worth ₹${totalAmount} has been confirmed. Estimated delivery: ${deliveryDate.toLocaleDateString()}.`,
            timestamp: new Date().toISOString(), read: false,
            link: '/notifications', metadata: { transactionId: txnId },
        });
        // Simulate processing after 5 seconds
        setTimeout(() => {
            addNotification({
                id: generateId(), userId: user.id, type: 'order',
                title: 'Order Processing',
                message: `Your order (${txnId}) is being processed and will be shipped soon.`,
                timestamp: new Date().toISOString(), read: false,
            });
        }, 5000);
        setOrderSuccess(txnId);
        setCart([]);
        setOrders(getOrders().slice().reverse());
        setTimeout(() => setOrderSuccess(null), 6000);
    };

    const savings = (market: number, jan: number) => Math.round(((market - jan) / market) * 100);

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800 }}>Medicines</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Jan Aushadhi affordable medicines</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowOrders(!showOrders)} className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13 }}>
                        <History size={14} /> Orders
                    </button>
                    <button onClick={() => setShowCart(!showCart)} className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13, position: 'relative' }}>
                        <ShoppingCart size={14} /> Cart
                        {cart.length > 0 && (
                            <span style={{
                                position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%',
                                background: '#EF4444', color: 'white', fontSize: 11, fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>{cart.length}</span>
                        )}
                    </button>
                </div>
            </div>

            {/* Order Success Toast */}
            <AnimatePresence>
                {orderSuccess && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        style={{
                            padding: 20, borderRadius: 14, marginBottom: 20,
                            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                            display: 'flex', alignItems: 'center', gap: 12,
                        }}>
                        <Check size={22} style={{ color: '#10B981' }} />
                        <div>
                            <div style={{ fontWeight: 700, color: '#10B981' }}>Order Placed Successfully!</div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                                Transaction ID: <strong>{orderSuccess}</strong> — Check notifications for updates
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Orders Panel */}
            <AnimatePresence>
                {showOrders && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="glass-card-static" style={{ padding: 20, marginBottom: 20, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                            <h3 style={{ fontWeight: 700 }}>Order History</h3>
                            <button onClick={() => setShowOrders(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
                        </div>
                        {orders.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No orders yet</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {orders.map(o => (
                                    <div key={o.id} style={{ padding: 14, borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <span style={{ fontWeight: 600, fontSize: 13 }}>{o.transactionId}</span>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                                background: o.status === 'delivered' ? 'rgba(16,185,129,0.1)' : 'rgba(14,165,233,0.1)',
                                                color: o.status === 'delivered' ? '#10B981' : '#0EA5E9',
                                            }}>{o.status}</span>
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {o.items.length} items • ₹{o.totalAmount} • {new Date(o.orderDate).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cart Panel */}
            <AnimatePresence>
                {showCart && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="glass-card-static" style={{ padding: 20, marginBottom: 20, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                            <h3 style={{ fontWeight: 700 }}>Shopping Cart ({cart.length})</h3>
                            <button onClick={() => setShowCart(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
                        </div>
                        {cart.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>Cart is empty</p>
                        ) : (
                            <>
                                {cart.map(item => (
                                    <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>₹{item.price} each</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <button onClick={() => updateQty(item.name, item.quantity - 1)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-card)', cursor: 'pointer', color: 'var(--text-primary)' }}>-</button>
                                            <span style={{ fontWeight: 600, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                                            <button onClick={() => updateQty(item.name, item.quantity + 1)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-card)', cursor: 'pointer', color: 'var(--text-primary)' }}>+</button>
                                            <span style={{ fontWeight: 600, minWidth: 50, textAlign: 'right' }}>₹{item.price * item.quantity}</span>
                                        </div>
                                    </div>
                                ))}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, alignItems: 'center' }}>
                                    <div style={{ fontWeight: 700, fontSize: 16 }}>Total: ₹{totalAmount}</div>
                                    <button onClick={placeOrder} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px' }}>
                                        <CreditCard size={14} /> Place Order
                                    </button>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search & Filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input className="input-field" placeholder="Search medicines..." value={search} onChange={e => setSearch(e.target.value)}
                        style={{ paddingLeft: 36, width: '100%' }} />
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {categories.map(c => (
                        <button key={c} onClick={() => setCategory(c)} style={{
                            padding: '6px 14px', borderRadius: 20, border: `1px solid ${category === c ? 'var(--color-primary)' : 'var(--border-color)'}`,
                            background: category === c ? 'rgba(14,165,233,0.08)' : 'var(--bg-card)',
                            color: category === c ? 'var(--color-primary)' : 'var(--text-secondary)',
                            cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                        }}>{c}</button>
                    ))}
                </div>
            </div>

            {/* Medicine Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                {filtered.map((med, i) => (
                    <motion.div key={med.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                        className="glass-card-static" style={{ padding: 18 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{med.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{med.generic}</div>
                            </div>
                            <span style={{
                                padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                                background: med.rx ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                color: med.rx ? '#EF4444' : '#10B981',
                            }}>{med.rx ? 'Rx' : 'OTC'}</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>{med.use}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <div>
                                <span style={{ fontSize: 18, fontWeight: 800, color: '#10B981' }}>₹{med.janAushadhi}</span>
                                <span style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'line-through', marginLeft: 8 }}>₹{med.market}</span>
                                <span style={{
                                    marginLeft: 8, padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                                    background: 'rgba(16,185,129,0.08)', color: '#10B981',
                                }}>Save {savings(med.market, med.janAushadhi)}%</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => addToCart(med)} className="btn-primary"
                                style={{ flex: 1, padding: '8px 0', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                <ShoppingCart size={14} /> Add to Cart
                            </button>
                            <button onClick={() => setExpandedMed(expandedMed === med.name ? null : med.name)} className="btn-secondary"
                                style={{ padding: '8px 12px', fontSize: 13 }}>Info</button>
                        </div>
                        <AnimatePresence>
                            {expandedMed === med.name && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                    style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-secondary)' }}>Side Effects</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{med.sideEffects.join(' • ')}</div>
                                    <div style={{ fontSize: 12, fontWeight: 600, marginTop: 8, marginBottom: 4, color: 'var(--text-secondary)' }}>Category</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{med.category}</div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
