import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

type Language = 'en' | 'de';

interface I18nContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string, options?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
    const [language, setLanguageState] = useState<Language>(() => {
        try {
            const storedLang = localStorage.getItem('language');
            if (storedLang === 'en' || storedLang === 'de') {
                return storedLang;
            }
        } catch (e) {
            console.error("Could not read language from local storage", e);
        }
        return 'en';
    });
    
    const [translations, setTranslations] = useState<Record<string, any> | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadTranslations = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`/data/${language}.json`);
                if (!response.ok) throw new Error(`Failed to load ${language}.json`);
                const data = await response.json();
                setTranslations(data);
            } catch (error) {
                console.error(`Could not load translations for ${language}. Falling back to English.`, error);
                try {
                    const fallbackResponse = await fetch(`/data/en.json`);
                    const fallbackData = await fallbackResponse.json();
                    setTranslations(fallbackData);
                } catch (fallbackError) {
                    console.error("Failed to load fallback English translations.", fallbackError);
                }
            } finally {
                setIsLoading(false);
            }
        };
        loadTranslations();
    }, [language]);

    const setLanguage = useCallback((lang: Language) => {
        try {
            localStorage.setItem('language', lang);
        } catch (e) {
            console.error("Could not save language to local storage", e);
        }
        setLanguageState(lang);
    }, []);

    const t = useCallback((key: string, options?: Record<string, string | number>): string => {
        if (!translations) return key;

        const keys = key.split('.');
        let current: any = translations;
        for (const k of keys) {
            if (current && typeof current === 'object' && k in current) {
                current = current[k];
            } else {
                return key; // Key not found
            }
        }

        if (typeof current !== 'string') {
            return key; // The found value is not a string
        }

        let resultString: string = current;
        
        if (options) {
            resultString = resultString.replace(/\{\{(\w+)\}\}/g, (_, varName: string) => {
                const value = options[varName];
                return value !== undefined ? String(value) : `{{${varName}}}`;
            });
        }

        return resultString;
    }, [translations]);
    
    if (isLoading) {
        return React.createElement('div', { className: "flex h-screen w-screen items-center justify-center bg-slate-900" },
            React.createElement('div', { className: "animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-sky-400" }),
            React.createElement('p', { className: "ml-4 text-lg text-slate-300" }, 'Loading...')
        );
    }

    const value = { language, setLanguage, t };

    return React.createElement(I18nContext.Provider, { value: value }, children);
};

export const useI18n = (): I18nContextType => {
    const context = useContext(I18nContext);
    if (context === undefined) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
};