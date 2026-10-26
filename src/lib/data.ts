export const PLATFORM_DOCTORS = [
    { id: 'doc1', name: 'Dr. Priya Sharma', specialty: 'Nephrologist', type: 'Allopathic', modes: ['Physical', 'Online'], hospital: 'AIIMS Delhi', rating: 4.9, experience: '15 yrs', fee: '₹800', initials: 'PS', available: ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM'] },
    { id: 'doc2', name: 'Dr. Rajesh Kumar', specialty: 'Cardiologist', type: 'Allopathic', modes: ['Physical'], hospital: 'Max Hospital', rating: 4.8, experience: '20 yrs', fee: '₹1200', initials: 'RK', available: ['9:30 AM', '10:30 AM', '11:30 AM', '1:00 PM', '3:30 PM'] },
    { id: 'doc3', name: 'Dr. Ananya Patel', specialty: 'General Physician', type: 'Allopathic', modes: ['Physical', 'Online'], hospital: 'Apollo Clinic', rating: 4.7, experience: '12 yrs', fee: '₹500', initials: 'AP', available: ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '4:00 PM', '5:00 PM'] },
    { id: 'doc4', name: 'Dr. Suresh Reddy', specialty: 'Orthopedic', type: 'Allopathic', modes: ['Physical'], hospital: 'Fortis Hospital', rating: 4.8, experience: '18 yrs', fee: '₹1000', initials: 'SR', available: ['10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM'] },
    { id: 'doc5', name: 'Dr. Meera Iyer', specialty: 'Dermatologist', type: 'Allopathic', modes: ['Physical', 'Online'], hospital: 'Manipal Hospital', rating: 4.6, experience: '10 yrs', fee: '₹700', initials: 'MI', available: ['9:00 AM', '10:00 AM', '3:00 PM', '4:00 PM', '5:00 PM'] },
    { id: 'doc6', name: 'Dr. Vikram Singh', specialty: 'Neurologist', type: 'Allopathic', modes: ['Physical'], hospital: 'Medanta Hospital', rating: 4.9, experience: '22 yrs', fee: '₹1500', initials: 'VS', available: ['10:00 AM', '11:00 AM', '1:00 PM'] },
    { id: 'doc7', name: 'Dr. Kavita Desai', specialty: 'Gynecologist', type: 'Allopathic', modes: ['Physical', 'Online'], hospital: 'Kokilaben Hospital', rating: 4.7, experience: '16 yrs', fee: '₹900', initials: 'KD', available: ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM'] },
    { id: 'doc8', name: 'Dr. Arjun Nair', specialty: 'Pulmonologist', type: 'Allopathic', modes: ['Physical', 'Online'], hospital: 'Narayana Health', rating: 4.5, experience: '14 yrs', fee: '₹800', initials: 'AN', available: ['9:30 AM', '10:30 AM', '2:30 PM', '3:30 PM'] },
    { id: 'doc9', name: 'Dr. Sunita Agarwal', specialty: 'Endocrinologist', type: 'Allopathic', modes: ['Physical'], hospital: 'BLK Hospital', rating: 4.8, experience: '19 yrs', fee: '₹1100', initials: 'SA', available: ['10:00 AM', '11:00 AM', '2:00 PM'] },
    { id: 'doc10', name: 'Dr. Rahul Gupta', specialty: 'Gastroenterologist', type: 'Allopathic', modes: ['Physical', 'Online'], hospital: 'Sir Ganga Ram', rating: 4.6, experience: '13 yrs', fee: '₹900', initials: 'RG', available: ['9:00 AM', '10:00 AM', '11:00 AM', '3:00 PM', '4:00 PM'] },
    { id: 'doc11', name: 'Dr. Pooja Malhotra', specialty: 'Ophthalmologist', type: 'Allopathic', modes: ['Physical', 'Online'], hospital: 'Eye Care Centre', rating: 4.7, experience: '11 yrs', fee: '₹600', initials: 'PM', available: ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM'] },
    { id: 'doc12', name: 'Dr. Anil Sharma', specialty: 'Urologist', type: 'Allopathic', modes: ['Physical'], hospital: 'Safdarjung Hospital', rating: 4.5, experience: '17 yrs', fee: '₹1000', initials: 'AS', available: ['10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM'] },
    { id: 'doc13', name: 'Dr. Ritu Verma', specialty: 'Psychiatrist', type: 'Allopathic', modes: ['Physical', 'Online'], hospital: 'VIMHANS', rating: 4.9, experience: '20 yrs', fee: '₹1200', initials: 'RV', available: ['10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM'] },
    { id: 'doc14', name: 'Dr. Manish Kapoor', specialty: 'ENT Specialist', type: 'Allopathic', modes: ['Physical'], hospital: 'Max Healthcare', rating: 4.6, experience: '15 yrs', fee: '₹700', initials: 'MK', available: ['9:00 AM', '10:00 AM', '11:00 AM', '3:00 PM'] },
    { id: 'doc15', name: 'Dr. Lakshmi Nair', specialty: 'Oncologist', type: 'Allopathic', modes: ['Physical'], hospital: 'Tata Memorial', rating: 4.9, experience: '25 yrs', fee: '₹2000', initials: 'LN', available: ['10:00 AM', '11:00 AM'] },
    { id: 'doc16', name: 'Dr. Sanjay Joshi', specialty: 'Rheumatologist', type: 'Allopathic', modes: ['Physical', 'Online'], hospital: 'AIIMS Delhi', rating: 4.7, experience: '14 yrs', fee: '₹900', initials: 'SJ', available: ['9:00 AM', '10:00 AM', '2:00 PM', '3:00 PM', '4:00 PM'] },
    { id: 'doc17', name: 'Dr. Deepa Chauhan', specialty: 'Pediatrician', type: 'Allopathic', modes: ['Physical', 'Online'], hospital: 'Rainbow Hospital', rating: 4.8, experience: '16 yrs', fee: '₹600', initials: 'DC', available: ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '4:00 PM', '5:00 PM'] },
    { id: 'doc18', name: 'Dr. Abhishek Tiwari', specialty: 'Dentist', type: 'Allopathic', modes: ['Physical'], hospital: 'Clove Dental', rating: 4.5, experience: '8 yrs', fee: '₹400', initials: 'AT', available: ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'] },
    { id: 'doc19', name: 'Dr. Vasant Lad', specialty: 'Ayurvedic Physician', type: 'Ayurvedic', modes: ['Physical', 'Online'], hospital: 'AyurCare Center', rating: 4.9, experience: '25 yrs', fee: '₹500', initials: 'VL', available: ['10:00 AM', '11:00 AM', '12:00 PM', '4:00 PM'] },
    { id: 'doc20', name: 'Dr. Smita Naram', specialty: 'Panchakarma Specialist', type: 'Ayurvedic', modes: ['Physical'], hospital: 'Vedic Healing', rating: 4.7, experience: '18 yrs', fee: '₹700', initials: 'SN', available: ['9:00 AM', '10:00 AM', '3:00 PM', '5:00 PM'] },
    { id: 'doc21', name: 'Dr. Batra', specialty: 'Homeopath', type: 'Homeopathic', modes: ['Physical', 'Online'], hospital: 'Batra Clinic', rating: 4.6, experience: '30 yrs', fee: '₹600', initials: 'DB', available: ['11:00 AM', '1:00 PM', '4:00 PM'] },
    { id: 'doc22', name: 'Dr. Ratan Kumar', specialty: 'Homeopath', type: 'Homeopathic', modes: ['Online'], hospital: 'Online Homeo', rating: 4.5, experience: '12 yrs', fee: '₹400', initials: 'RK', available: ['8:00 AM', '9:00 AM', '6:00 PM', '7:00 PM'] },
    { id: 'doc23', name: 'Dr. Aditi Sharma', specialty: 'Ayurvedic Physician', type: 'Ayurvedic', modes: ['Physical', 'Online'], hospital: 'Patanjali Wellness', rating: 4.8, experience: '15 yrs', fee: '₹550', initials: 'AS', available: ['9:30 AM', '10:30 AM', '2:30 PM', '4:30 PM'] },
    { id: 'doc24', name: 'Dr. Rohan Nambiar', specialty: 'Ayurvedic Orthopedic', type: 'Ayurvedic', modes: ['Physical'], hospital: 'Kerala Ayurveda', rating: 4.9, experience: '22 yrs', fee: '₹800', initials: 'RN', available: ['10:00 AM', '11:30 AM', '3:00 PM', '5:00 PM'] },
    { id: 'doc25', name: 'Dr. Neha Gupta', specialty: 'Ayurvedic Dermatologist', type: 'Ayurvedic', modes: ['Physical', 'Online'], hospital: 'Jiva Ayurveda', rating: 4.6, experience: '10 yrs', fee: '₹450', initials: 'NG', available: ['11:00 AM', '12:00 PM', '4:00 PM', '6:00 PM'] }
];

// Medicine catalog with Jan Aushadhi vs market price (₹), shared by the medicines page and care-plan cart
export const MEDICINE_CATALOG = [
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
    { name: 'Ashwagandha', generic: 'Withania Somnifera', category: 'Ayurvedic', use: 'Stress relief, immunity', sideEffects: ['Drowsiness at high doses'], janAushadhi: 80, market: 150, rx: false },
    { name: 'Triphala Churna', generic: 'Amalaki, Bibhitaki, Haritaki', category: 'Ayurvedic', use: 'Digestion, detox', sideEffects: ['Mild diarrhea initially'], janAushadhi: 60, market: 120, rx: false },
    { name: 'Giloy Ghanvati', generic: 'Tinospora Cordifolia', category: 'Ayurvedic', use: 'Immunity booster, fever', sideEffects: ['Constipation (rare)'], janAushadhi: 70, market: 140, rx: false },
    { name: 'Brahmi Vati', generic: 'Bacopa Monnieri', category: 'Ayurvedic', use: 'Memory, focus, stress', sideEffects: ['Stomach upset (rare)'], janAushadhi: 90, market: 180, rx: false },
    { name: 'Chyawanprash', generic: 'Amla & Ayurvedic Herbs', category: 'Ayurvedic', use: 'Overall immunity and vitality', sideEffects: ['Heartburn if eaten empty stomach'], janAushadhi: 150, market: 250, rx: false },
];

// Doctors matching a recommended specialty within the patient's pathway (AYUSH vs allopathic), best rated first
export function matchDoctors(specialty: string | undefined, pathway?: string) {
    const ayush = pathway === 'AYUSH';
    const pool = PLATFORM_DOCTORS.filter(d => (d.type === 'Allopathic') !== ayush);
    const exact = pool.filter(d => d.specialty === specialty);
    return (exact.length ? exact : pool).slice().sort((a, b) => b.rating - a.rating).slice(0, 3);
}
