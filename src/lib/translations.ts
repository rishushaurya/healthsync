// i18n Translation System for HealthSync
// Each user has their own language preference stored in their profile

export type LangCode = 'en' | 'hi' | 'ta' | 'kn' | 'bn' | 'mr';

export const LANGUAGES: { value: LangCode; label: string; nativeLabel: string }[] = [
    { value: 'en', label: 'English', nativeLabel: 'English' },
    { value: 'hi', label: 'Hindi', nativeLabel: 'हिंदी' },
    { value: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
    { value: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
    { value: 'bn', label: 'Bengali', nativeLabel: 'বাংলা' },
    { value: 'mr', label: 'Marathi', nativeLabel: 'मराठी' },
];

// Number formatting per locale
const LOCALE_MAP: Record<LangCode, string> = {
    en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', kn: 'kn-IN', bn: 'bn-IN', mr: 'mr-IN',
};

export function formatNumber(num: number, lang: LangCode): string {
    try {
        return new Intl.NumberFormat(LOCALE_MAP[lang]).format(num);
    } catch {
        return num.toString();
    }
}

export function formatDate(date: string | Date, lang: LangCode): string {
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        return new Intl.DateTimeFormat(LOCALE_MAP[lang], { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
    } catch {
        return String(date);
    }
}

// Translation dictionary
const translations: Record<string, Record<LangCode, string>> = {
    // ---- Navigation / Sidebar ----
    'nav.dashboard': { en: 'Dashboard', hi: 'डैशबोर्ड', ta: 'டாஷ்போர்ட்', kn: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', bn: 'ড্যাশবোর্ড', mr: 'डॅशबोर्ड' },
    'nav.digitalTwin': { en: 'Digital Twin', hi: 'डिजिटल ट्विन', ta: 'டிஜிட்டல் ட்வின்', kn: 'ಡಿಜಿಟಲ್ ಟ್ವಿನ್', bn: 'ডিজিটাল টুইন', mr: 'डिजिटल ट्विन' },
    'nav.vitals': { en: 'Vitals', hi: 'स्वास्थ्य मापदंड', ta: 'உடல்நல அளவீடுகள்', kn: 'ಆರೋಗ್ಯ ಮಾನದಂಡಗಳು', bn: 'স্বাস্থ্য মান', mr: 'आरोग्य मापदंड' },
    'nav.reports': { en: 'Reports', hi: 'रिपोर्ट', ta: 'அறிக்கைகள்', kn: 'ವರದಿಗಳು', bn: 'রিপোর্ট', mr: 'अहवाल' },
    'nav.recovery': { en: 'Recovery', hi: 'रिकवरी', ta: 'மீட்பு', kn: 'ಚೇತರಿಕೆ', bn: 'পুনরুদ্ধার', mr: 'रिकव्हरी' },
    'nav.doctors': { en: 'Doctors', hi: 'डॉक्टर', ta: 'மருத்துவர்கள்', kn: 'ವೈದ್ಯರು', bn: 'ডাক্তার', mr: 'डॉक्टर' },
    'nav.prescriptions': { en: 'Prescriptions', hi: 'नुस्खे', ta: 'மருந்துச் சீட்டுகள்', kn: 'ಔಷಧ ಚೀಟಿಗಳು', bn: 'প্রেসক্রিপশন', mr: 'प्रिस्क्रिप्शन' },
    'nav.calls': { en: 'Calls', hi: 'कॉल', ta: 'அழைப்புகள்', kn: 'ಕರೆಗಳು', bn: 'কল', mr: 'कॉल' },
    'nav.recoveryCircle': { en: 'Recovery Circle', hi: 'रिकवरी सर्कल', ta: 'மீட்பு வட்டம்', kn: 'ಚೇತರಿಕೆ ವಲಯ', bn: 'পুনরুদ্ধার বৃত্ত', mr: 'रिकव्हरी सर्कल' },
    'nav.medicines': { en: 'Medicines', hi: 'दवाइयाँ', ta: 'மருந்துகள்', kn: 'ಔಷಧಿಗಳು', bn: 'ওষুধ', mr: 'औषधे' },
    'nav.notifications': { en: 'Notifications', hi: 'सूचनाएँ', ta: 'அறிவிப்புகள்', kn: 'ಅಧಿಸೂಚನೆಗಳು', bn: 'বিজ্ঞপ্তি', mr: 'सूचना' },
    'nav.settings': { en: 'Settings', hi: 'सेटिंग्स', ta: 'அமைப்புகள்', kn: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು', bn: 'সেটিংস', mr: 'सेटिंग्ज' },
    'nav.signOut': { en: 'Sign Out', hi: 'साइन आउट', ta: 'வெளியேறு', kn: 'ಸೈನ್ ಔಟ್', bn: 'সাইন আউট', mr: 'साइन आउट' },

    // ---- Dashboard ----
    'dash.welcome': { en: 'Welcome back', hi: 'वापसी पर स्वागत', ta: 'மீண்டும் வரவேற்கிறோம்', kn: 'ಮರಳಿ ಸ್ವಾಗತ', bn: 'ফিরে আসার জন্য স্বাগত', mr: 'पुन्हा स्वागत' },
    'dash.healthScore': { en: 'Health Score', hi: 'स्वास्थ्य स्कोर', ta: 'ஆரோக்கிய மதிப்பெண்', kn: 'ಆರೋಗ್ಯ ಅಂಕ', bn: 'স্বাস্থ্য স্কোর', mr: 'आरोग्य गुण' },
    'dash.activeJourneys': { en: 'Active Journeys', hi: 'सक्रिय यात्राएँ', ta: 'செயலில் உள்ள பயணங்கள்', kn: 'ಸಕ್ರಿಯ ಪ್ರಯಾಣಗಳು', bn: 'সক্রিয় যাত্রা', mr: 'सक्रिय प्रवास' },
    'dash.upcoming': { en: 'Upcoming Appointments', hi: 'आगामी अपॉइंटमेंट', ta: 'வரவிருக்கும் சந்திப்புகள்', kn: 'ಮುಂಬರುವ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್‌ಗಳು', bn: 'আসন্ন অ্যাপয়েন্টমেন্ট', mr: 'आगामी भेटी' },
    'dash.recentVitals': { en: 'Recent Vitals', hi: 'हालिया स्वास्थ्य मापदंड', ta: 'சமீபத்திய உடல்நல அளவீடுகள்', kn: 'ಇತ್ತೀಚಿನ ಆರೋಗ್ಯ ಮಾನದಂಡಗಳು', bn: 'সাম্প্রতিক স্বাস্থ্য মান', mr: 'अलीकडील आरोग्य मापदंड' },
    'dash.medications': { en: 'Medications Due', hi: 'दवाइयाँ बाकी', ta: 'உட்கொள்ள வேண்டிய மருந்துகள்', kn: 'ಸೇವಿಸಬೇಕಾದ ಔಷಧಿಗಳು', bn: 'ওষুধ বাকি', mr: 'बाकी औषधे' },
    'dash.quickActions': { en: 'Quick Actions', hi: 'त्वरित कार्य', ta: 'விரைவு செயல்கள்', kn: 'ತ್ವರಿತ ಕ್ರಿಯೆಗಳು', bn: 'দ্রুত কার্যক্রম', mr: 'जलद कृती' },
    'dash.noAppointments': { en: 'No upcoming appointments', hi: 'कोई आगामी अपॉइंटमेंट नहीं', ta: 'வரவிருக்கும் சந்திப்புகள் இல்லை', kn: 'ಮುಂಬರುವ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಇಲ್ಲ', bn: 'কোনো আসন্ন অ্যাপয়েন্টমেন্ট নেই', mr: 'आगामी भेटी नाहीत' },

    // ---- Settings ----
    'settings.title': { en: 'Settings', hi: 'सेटिंग्स', ta: 'அமைப்புகள்', kn: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು', bn: 'সেটিংস', mr: 'सेटिंग्ज' },
    'settings.subtitle': { en: 'Personalize your HealthSync experience', hi: 'अपने HealthSync अनुभव को व्यक्तिगत बनाएँ', ta: 'உங்கள் HealthSync அனுபவத்தைத் தனிப்பயனாக்குங்கள்', kn: 'ನಿಮ್ಮ HealthSync ಅನುಭವವನ್ನು ಕಸ್ಟಮೈಸ್ ಮಾಡಿ', bn: 'আপনার HealthSync অভিজ্ঞতা ব্যক্তিগতকৃত করুন', mr: 'तुमचा HealthSync अनुभव सानुकूलित करा' },
    'settings.profile': { en: 'Profile', hi: 'प्रोफ़ाइल', ta: 'சுயவிவரம்', kn: 'ಪ್ರೊಫೈಲ್', bn: 'প্রোফাইল', mr: 'प्रोफाइल' },
    'settings.theme': { en: 'Theme', hi: 'थीम', ta: 'தீம்', kn: 'ಥೀಮ್', bn: 'থিম', mr: 'थीम' },
    'settings.language': { en: 'Language', hi: 'भाषा', ta: 'மொழி', kn: 'ಭಾಷೆ', bn: 'ভাষা', mr: 'भाषा' },
    'settings.dataPrivacy': { en: 'Data & Privacy', hi: 'डेटा और गोपनीयता', ta: 'தரவு & தனியுரிமை', kn: 'ಡೇಟಾ ಮತ್ತು ಗೌಪ್ಯತೆ', bn: 'ডেটা ও গোপনীয়তা', mr: 'डेटा आणि गोपनीयता' },
    'settings.export': { en: 'Export My Health Data', hi: 'मेरा स्वास्थ्य डेटा निर्यात करें', ta: 'எனது சுகாதார தரவை ஏற்றுமதி செய்', kn: 'ನನ್ನ ಆರೋಗ್ಯ ಡೇಟಾ ರಫ್ತು ಮಾಡಿ', bn: 'আমার স্বাস্থ্য ডেটা রপ্তানি করুন', mr: 'माझा आरोग्य डेटा निर्यात करा' },
    'settings.deleteAccount': { en: 'Delete Account & Data', hi: 'खाता और डेटा हटाएँ', ta: 'கணக்கு மற்றும் தரவை நீக்கு', kn: 'ಖಾತೆ ಮತ್ತು ಡೇಟಾ ಅಳಿಸಿ', bn: 'অ্যাকাউন্ট ও ডেটা মুছুন', mr: 'खाते आणि डेटा हटवा' },
    'settings.edit': { en: 'Edit', hi: 'संपादित करें', ta: 'திருத்து', kn: 'ಸಂಪಾದಿಸಿ', bn: 'সম্পাদনা', mr: 'संपादित करा' },
    'settings.cancel': { en: 'Cancel', hi: 'रद्द करें', ta: 'ரத்துசெய்', kn: 'ರದ್ದುಮಾಡಿ', bn: 'বাতিল', mr: 'रद्द करा' },
    'settings.save': { en: 'Save Changes', hi: 'बदलाव सहेजें', ta: 'மாற்றங்களைச் சேமி', kn: 'ಬದಲಾವಣೆಗಳನ್ನು ಉಳಿಸಿ', bn: 'পরিবর্তন সংরক্ষণ করুন', mr: 'बदल जतन करा' },

    // ---- Common ----
    'common.name': { en: 'Name', hi: 'नाम', ta: 'பெயர்', kn: 'ಹೆಸರು', bn: 'নাম', mr: 'नाव' },
    'common.email': { en: 'Email', hi: 'ईमेल', ta: 'மின்னஞ்சல்', kn: 'ಇಮೇಲ್', bn: 'ইমেইল', mr: 'ईमेल' },
    'common.phone': { en: 'Phone', hi: 'फ़ोन', ta: 'தொலைபேசி', kn: 'ಫೋನ್', bn: 'ফোন', mr: 'फोन' },
    'common.intent': { en: 'Intent', hi: 'उद्देश्य', ta: 'நோக்கம்', kn: 'ಉದ್ದೇಶ', bn: 'উদ্দেশ্য', mr: 'उद्दिष्ट' },
    'common.notSet': { en: 'Not set', hi: 'सेट नहीं', ta: 'அமைக்கவில்லை', kn: 'ಹೊಂದಿಸಲಾಗಿಲ್ಲ', bn: 'সেট করা হয়নি', mr: 'सेट नाही' },
    'common.search': { en: 'Search', hi: 'खोजें', ta: 'தேடு', kn: 'ಹುಡುಕಿ', bn: 'অনুসন্ধান', mr: 'शोधा' },
    'common.bookNow': { en: 'Book Now', hi: 'अभी बुक करें', ta: 'இப்போதே முன்பதிவு செய்', kn: 'ಈಗ ಬುಕ್ ಮಾಡಿ', bn: 'এখনই বুক করুন', mr: 'आता बुक करा' },
    'common.download': { en: 'Download', hi: 'डाउनलोड', ta: 'பதிவிறக்கு', kn: 'ಡೌನ್‌ಲೋಡ್', bn: 'ডাউনলোড', mr: 'डाउनलोड' },
    'common.view': { en: 'View', hi: 'देखें', ta: 'பார்', kn: 'ನೋಡಿ', bn: 'দেখুন', mr: 'पहा' },
    'common.close': { en: 'Close', hi: 'बंद करें', ta: 'மூடு', kn: 'ಮುಚ್ಚಿ', bn: 'বন্ধ করুন', mr: 'बंद करा' },
    'common.noData': { en: 'No data available', hi: 'कोई डेटा उपलब्ध नहीं', ta: 'தரவு எதுவும் இல்லை', kn: 'ಡೇಟಾ ಲಭ್ಯವಿಲ್ಲ', bn: 'কোনো ডেটা নেই', mr: 'डेटा उपलब्ध नाही' },

    // ---- Vitals ----
    'vitals.title': { en: 'Health Vitals', hi: 'स्वास्थ्य मापदंड', ta: 'உடல்நல அளவீடுகள்', kn: 'ಆರೋಗ್ಯ ಮಾನದಂಡಗಳು', bn: 'স্বাস্থ্য মান', mr: 'आरोग्य मापदंड' },
    'vitals.heartRate': { en: 'Heart Rate', hi: 'हृदय गति', ta: 'இதயத் துடிப்பு', kn: 'ಹೃದಯ ಬಡಿತ', bn: 'হৃদস্পন্দন', mr: 'हृदय गती' },
    'vitals.bloodPressure': { en: 'Blood Pressure', hi: 'रक्तचाप', ta: 'இரத்த அழுத்தம்', kn: 'ರಕ್ತದೊತ್ತಡ', bn: 'রক্তচাপ', mr: 'रक्तदाब' },
    'vitals.weight': { en: 'Weight', hi: 'वज़न', ta: 'எடை', kn: 'ತೂಕ', bn: 'ওজন', mr: 'वजन' },
    'vitals.temperature': { en: 'Temperature', hi: 'तापमान', ta: 'வெப்பநிலை', kn: 'ತಾಪಮಾನ', bn: 'তাপমাত্রা', mr: 'तापमान' },
    'vitals.bloodSugar': { en: 'Blood Sugar', hi: 'रक्त शर्करा', ta: 'இரத்தச் சர்க்கரை', kn: 'ರಕ್ತದ ಸಕ್ಕರೆ', bn: 'রক্তে শর্করা', mr: 'रक्तातील साखर' },
    'vitals.oxygenLevel': { en: 'Oxygen Level', hi: 'ऑक्सीजन स्तर', ta: 'ஆக்சிஜன் அளவு', kn: 'ಆಮ್ಲಜನಕ ಮಟ್ಟ', bn: 'অক্সিজেন মাত্রা', mr: 'ऑक्सिजन पातळी' },

    // ---- Reports ----
    'reports.title': { en: 'Medical Report Analyzer', hi: 'चिकित्सा रिपोर्ट विश्लेषक', ta: 'மருத்துவ அறிக்கை பகுப்பாய்வி', kn: 'ವೈದ್ಯಕೀಯ ವರದಿ ವಿಶ್ಲೇಷಕ', bn: 'চিকিৎসা রিপোর্ট বিশ্লেষক', mr: 'वैद्यकीय अहवाल विश्लेषक' },
    'reports.upload': { en: 'Drop your medical report here', hi: 'अपनी मेडिकल रिपोर्ट यहाँ डालें', ta: 'உங்கள் மருத்துவ அறிக்கையை இங்கே விடுங்கள்', kn: 'ನಿಮ್ಮ ವೈದ್ಯಕೀಯ ವರದಿಯನ್ನು ಇಲ್ಲಿ ಹಾಕಿ', bn: 'আপনার মেডিকেল রিপোর্ট এখানে ফেলুন', mr: 'तुमचा वैद्यकीय अहवाल येथे टाका' },
    'reports.analyzing': { en: 'Analyzing Report...', hi: 'रिपोर्ट का विश्लेषण हो रहा है...', ta: 'அறிக்கை பகுப்பாய்வு செய்யப்படுகிறது...', kn: 'ವರದಿ ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...', bn: 'রিপোর্ট বিশ্লেষণ হচ্ছে...', mr: 'अहवालाचे विश्लेषण सुरू आहे...' },
    'reports.yourReports': { en: 'Your Reports', hi: 'आपकी रिपोर्ट', ta: 'உங்கள் அறிக்கைகள்', kn: 'ನಿಮ್ಮ ವರದಿಗಳು', bn: 'আপনার রিপোর্ট', mr: 'तुमचे अहवाल' },
    'reports.noReports': { en: 'No Reports Yet', hi: 'अभी कोई रिपोर्ट नहीं', ta: 'இன்னும் அறிக்கைகள் இல்லை', kn: 'ಇನ್ನೂ ವರದಿಗಳಿಲ್ಲ', bn: 'এখনো কোনো রিপোর্ট নেই', mr: 'अद्याप अहवाल नाहीत' },

    // ---- Prescriptions ----
    'rx.title': { en: 'My Prescriptions', hi: 'मेरे नुस्खे', ta: 'எனது மருந்துச் சீட்டுகள்', kn: 'ನನ್ನ ಔಷಧ ಚೀಟಿಗಳು', bn: 'আমার প্রেসক্রিপশন', mr: 'माझे प्रिस्क्रिप्शन' },
    'rx.subtitle': { en: 'Prescriptions from your doctors', hi: 'आपके डॉक्टरों से नुस्खे', ta: 'உங்கள் மருத்துவர்களிடமிருந்து மருந்துச் சீட்டுகள்', kn: 'ನಿಮ್ಮ ವೈದ್ಯರಿಂದ ಔಷಧ ಚೀಟಿಗಳು', bn: 'আপনার ডাক্তারদের প্রেসক্রিপশন', mr: 'तुमच्या डॉक्टरांचे प्रिस्क्रिप्शन' },
    'rx.noPrescriptions': { en: 'No prescriptions yet', hi: 'अभी कोई नुस्खा नहीं', ta: 'இன்னும் மருந்துச் சீட்டுகள் இல்லை', kn: 'ಇನ್ನೂ ಔಷಧ ಚೀಟಿಗಳಿಲ್ಲ', bn: 'এখনো কোনো প্রেসক্রিপশন নেই', mr: 'अद्याप प्रिस्क्रिप्शन नाहीत' },
    'rx.advice': { en: 'Advice', hi: 'सलाह', ta: 'ஆலோசனை', kn: 'ಸಲಹೆ', bn: 'পরামর্শ', mr: 'सल्ला' },
    'rx.followUp': { en: 'Follow-up', hi: 'फॉलो-अप', ta: 'பின்தொடர்', kn: 'ಫಾಲೋ-ಅಪ್', bn: 'ফলো-আপ', mr: 'फॉलो-अप' },
    'rx.medicines': { en: 'Prescribed Medicines', hi: 'निर्धारित दवाइयाँ', ta: 'பரிந்துரைக்கப்பட்ட மருந்துகள்', kn: 'ಸೂಚಿಸಲಾದ ಔಷಧಿಗಳು', bn: 'নির্ধারিত ওষুধ', mr: 'निर्धारित औषधे' },

    // ---- Calls ----
    'calls.title': { en: 'Calls', hi: 'कॉल', ta: 'அழைப்புகள்', kn: 'ಕರೆಗಳು', bn: 'কল', mr: 'कॉल' },
    'calls.subtitle': { en: 'Audio and video calls from your doctors', hi: 'आपके डॉक्टरों से ऑडियो और वीडियो कॉल', ta: 'உங்கள் மருத்துவர்களிடமிருந்து ஆடியோ மற்றும் வீடியோ அழைப்புகள்', kn: 'ನಿಮ್ಮ ವೈದ್ಯರಿಂದ ಆಡಿಯೋ ಮತ್ತು ವೀಡಿಯೋ ಕರೆಗಳು', bn: 'আপনার ডাক্তারদের অডিও ও ভিডিও কল', mr: 'तुमच्या डॉक्टरांचे ऑडिओ आणि व्हिडिओ कॉल' },
    'calls.noHistory': { en: 'No call history', hi: 'कोई कॉल इतिहास नहीं', ta: 'அழைப்பு வரலாறு இல்லை', kn: 'ಕರೆ ಇತಿಹಾಸ ಇಲ್ಲ', bn: 'কোনো কল ইতিহাস নেই', mr: 'कॉल इतिहास नाही' },
    'calls.incoming': { en: 'Incoming Call', hi: 'आने वाली कॉल', ta: 'உள்வரும் அழைப்பு', kn: 'ಇನ್‌ಕಮಿಂಗ್ ಕರೆ', bn: 'ইনকামিং কল', mr: 'इनकमिंग कॉल' },

    // ---- Doctors ----
    'doctors.title': { en: 'Find a Doctor', hi: 'डॉक्टर खोजें', ta: 'மருத்துவரைக் கண்டறியுங்கள்', kn: 'ವೈದ್ಯರನ್ನು ಹುಡುಕಿ', bn: 'ডাক্তার খুঁজুন', mr: 'डॉक्टर शोधा' },
    'doctors.bookAppointment': { en: 'Book Appointment', hi: 'अपॉइंटमेंट बुक करें', ta: 'சந்திப்பை முன்பதிவு செய்', kn: 'ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕ್ ಮಾಡಿ', bn: 'অ্যাপয়েন্টমেন্ট বুক করুন', mr: 'अपॉइंटमेंट बुक करा' },
    'doctors.booked': { en: 'Appointment Booked!', hi: 'अपॉइंटमेंट बुक हो गई!', ta: 'சந்திப்பு முன்பதிவு செய்யப்பட்டது!', kn: 'ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕ್ ಆಗಿದೆ!', bn: 'অ্যাপয়েন্টমেন্ট বুক হয়েছে!', mr: 'अपॉइंटमेंट बुक झाली!' },

    // ---- Digital Twin ----
    'dt.title': { en: 'Digital Twin', hi: 'डिजिटल ट्विन', ta: 'டிஜிட்டல் ட்வின்', kn: 'ಡಿಜಿಟಲ್ ಟ್ವಿನ್', bn: 'ডিজিটাল টুইন', mr: 'डिजिटल ट्विन' },
    'dt.askAI': { en: 'Ask your AI health assistant...', hi: 'अपने AI स्वास्थ्य सहायक से पूछें...', ta: 'உங்கள் AI சுகாதார உதவியாளரிடம் கேளுங்கள்...', kn: 'ನಿಮ್ಮ AI ಆರೋಗ್ಯ ಸಹಾಯಕನಲ್ಲಿ ಕೇಳಿ...', bn: 'আপনার AI স্বাস্থ্য সহায়ককে জিজ্ঞাসা করুন...', mr: 'तुमच्या AI आरोग्य सहाय्यकाला विचारा...' },
};

export function t(key: string, lang: LangCode = 'en'): string {
    return translations[key]?.[lang] || translations[key]?.['en'] || key;
}

// Convenience hook-style getter
export function getTranslator(lang: LangCode) {
    return (key: string) => t(key, lang);
}
