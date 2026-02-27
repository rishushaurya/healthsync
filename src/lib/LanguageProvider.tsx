'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getCurrentUser, type UserProfile } from '@/lib/store';
import { t as translate, type LangCode } from '@/lib/translations';

interface LanguageContextType {
    lang: LangCode;
    setLang: (lang: LangCode) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
    lang: 'en',
    setLang: () => { },
    t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<LangCode>('en');

    useEffect(() => {
        const user = getCurrentUser();
        if (user?.language) {
            setLangState(user.language as LangCode);
        }
    }, []);

    const setLang = (newLang: LangCode) => {
        setLangState(newLang);
    };

    const tFn = (key: string) => translate(key, lang);

    return (
        <LanguageContext.Provider value={{ lang, setLang, t: tFn }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    return useContext(LanguageContext);
}
